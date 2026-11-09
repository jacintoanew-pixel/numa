import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as googleHandler } from "@/app/api/auth/google/route";
import { POST as appleHandler } from "@/app/api/auth/apple/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { GET as logoutGetHandler, POST as logoutPostHandler } from "@/app/api/auth/logout/route";
import { POST as biometricsHandler, GET as getBiometricsHandler } from "@/app/api/auth/biometrics/route";
import { PATCH as profileHandler } from "@/app/api/auth/profile/route";
import { GET as getIntegrationsHandler, POST as postIntegrationsHandler } from "@/app/api/integrations/route";
import { authStore, generateTOTPCodeSync, DEFAULT_MASTER_PASSWORD } from "@/lib/auth/auth-store";
import { clearAllRateLimits } from "@/lib/security/rate-limit";
import { verifySignedSessionTokenEdge } from "@/lib/security/session-signer";

describe("Auth API Endpoints & Two-Step TOTP Flow", () => {
  const uniqueSuffix = Date.now();

  beforeEach(async () => {
    clearAllRateLimits();
    const master = await authStore.getUserById("usr_master_01");
    if (master) {
      master.twoFactorEnrolled = false;
      delete master.twoFactorEnrolledAt;
    }
  });

  it("blocks public registration by default (H-03) and allows when feature flag is enabled without exposing token in JSON (H-04)", async () => {
    delete process.env.ALLOW_PUBLIC_REGISTRATION;
    const blockedReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Carlos Mendoza",
        email: `carlos.${uniqueSuffix}@example.com`,
        password: "StrongPassword123!",
      }),
    });
    const blockedRes = await registerHandler(blockedReq);
    expect(blockedRes.status).toBe(403);

    process.env.ALLOW_PUBLIC_REGISTRATION = "true";
    try {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Carlos Mendoza",
          email: `carlos.${uniqueSuffix}@example.com`,
          password: "StrongPassword123!",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.name).toBe("Carlos Mendoza");
      expect(data.user.isVerified).toBe(false);
      // H-04: Token must NOT be exposed in JSON body
      expect(data.token).toBeUndefined();
      // Cookie must be set and signed
      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain("vx_auth_token=");
      expect(cookieHeader).toContain("HttpOnly");
    } finally {
      delete process.env.ALLOW_PUBLIC_REGISTRATION;
    }
  });

  it("blocks unverified Google and Apple OAuth backdoors with 403", async () => {
    const gRes = await googleHandler();
    expect(gRes.status).toBe(403);
    const gData = await gRes.json();
    expect(gData.code).toBe("FEATURE_UPCOMING");

    const aRes = await appleHandler();
    expect(aRes.status).toBe(403);
    const aData = await aRes.json();
    expect(aData.code).toBe("FEATURE_DISABLED");
  });

  it("executes two-step TOTP login with challengeId and Anti-Replay (H-01, H-04)", async () => {
    // 1. Step 1: Submit credentials with username admin
    const step1Req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin",
        password: DEFAULT_MASTER_PASSWORD,
      }),
    });

    const step1Res = await loginHandler(step1Req);
    expect(step1Res.status).toBe(200);
    const step1Data = await step1Res.json();
    expect(step1Data.success).toBe(true);
    expect(step1Data.requires2FA).toBe(true);
    expect(step1Data.challengeId).toMatch(/^ch_/);
    expect(step1Data.secret).toBeDefined();
    expect(step1Data.userId).toBe("usr_master_01");

    // 2. Generate live TOTP code for the secret
    const validTotp = generateTOTPCodeSync(step1Data.secret);

    // Verify that calling verify_2fa WITHOUT challengeId is rejected (H-01)
    const missingChallengeReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_2fa",
        userId: step1Data.userId,
        totpCode: validTotp,
      }),
    });
    const missingChallengeRes = await loginHandler(missingChallengeReq);
    expect(missingChallengeRes.status).toBe(401);

    // 3. Step 2: Verify TOTP code with valid challengeId
    const step2Req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_2fa",
        userId: step1Data.userId,
        challengeId: step1Data.challengeId,
        totpCode: validTotp,
      }),
    });

    const step2Res = await loginHandler(step2Req);
    expect(step2Res.status).toBe(200);
    const step2Data = await step2Res.json();
    expect(step2Data.success).toBe(true);
    // H-04: Session token is NEVER in JSON body
    expect(step2Data.token).toBeUndefined();
    expect(step2Data.user.id).toBe("usr_master_01");
    expect(step2Data.user.name).toBe("Admin User");

    // Check that HTTP-only cookie was issued and is cryptographically valid (M-02)
    const cookieHeader = step2Res.headers.get("set-cookie") || "";
    expect(cookieHeader).toContain("vx_auth_token=");
    expect(cookieHeader).toContain("HttpOnly");
    const tokenMatch = cookieHeader.match(/vx_auth_token=([^;]+)/);
    expect(tokenMatch).toBeTruthy();
    const isValidSigned = await verifySignedSessionTokenEdge(tokenMatch![1]);
    expect(isValidSigned).toBe(true);
    expect(await verifySignedSessionTokenEdge("AAAA")).toBe(false);

    // 4. Anti-Replay protection: obtain new challengeId and verify same TOTP code is rejected
    const step1Again = await loginHandler(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin",
          password: DEFAULT_MASTER_PASSWORD,
        }),
      })
    );
    const step1AgainData = await step1Again.json();

    const replayReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_2fa",
        userId: step1AgainData.userId,
        challengeId: step1AgainData.challengeId,
        totpCode: validTotp,
      }),
    });

    const replayRes = await loginHandler(replayReq);
    expect(replayRes.status).toBe(401);
    const replayData = await replayRes.json();
    expect(replayData.error).toContain("Anti-Replay");
  });

  it("completes password recovery cycle and prevents user enumeration (M-01)", async () => {
    const resetEmail = `reset.${uniqueSuffix}@example.com`;
    await authStore.registerWithEmail({
      name: "Reset User",
      email: resetEmail,
      password: "OriginalPassword123!",
    });

    // Request reset for non-existent user must also return 200 OK (M-01)
    const nonExistentRes = await forgotPasswordHandler(
      new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "noexiste@example.com" }),
      })
    );
    expect(nonExistentRes.status).toBe(200);
    const nonExistentData = await nonExistentRes.json();
    expect(nonExistentData.success).toBe(true);

    // Request reset for existing user
    const forgotReq = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: resetEmail }),
    });
    const forgotRes = await forgotPasswordHandler(forgotReq);
    expect(forgotRes.status).toBe(200);
    const forgotData = await forgotRes.json();
    expect(forgotData.message).toBe(nonExistentData.message);
    expect(forgotData.token).toBeDefined();

    // Reset password
    const resetReq = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: forgotData.token,
        newPassword: "BrandNewPassword2026!",
      }),
    });
    const resetRes = await resetPasswordHandler(resetReq);
    expect(resetRes.status).toBe(200);
    const resetData = await resetRes.json();
    expect(resetData.success).toBe(true);

    // Verify login with new password
    const loginRes = await loginHandler(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          password: "BrandNewPassword2026!",
        }),
      })
    );
    expect(loginRes.status).toBe(200);
  });

  it("enforces rate limiting (H-02), blocks GET logout (L-01), and sanitizes malformed JSON types (M-04)", async () => {
    // M-04: Malformed non-string types must not leak TypeError ("a.trim is not a function")
    const malformedRes = await loginHandler(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ["a"], password: { $ne: null } }),
      })
    );
    expect(malformedRes.status).toBe(400);
    const malformedData = await malformedRes.json();
    expect(malformedData.error).not.toContain("trim");

    // L-01: GET /api/auth/logout must return 405 Method Not Allowed
    const getLogoutRes = await logoutGetHandler();
    expect(getLogoutRes.status).toBe(405);

    const postLogoutRes = await logoutPostHandler(
      new NextRequest("http://localhost:3000/api/auth/logout", { method: "POST" })
    );
    expect(postLogoutRes.status).toBe(200);

    // H-02: Rate limiting locks out account after 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const failRes = await loginHandler(
        new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": `10.0.0.${i + 1}`,
          },
          body: JSON.stringify({ email: "admin", password: "WrongPassword123!" }),
        })
      );
      expect(failRes.status).toBe(401);
    }
    const sixthRes = await loginHandler(
      new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.99",
        },
        body: JSON.stringify({ email: "admin", password: "WrongPassword123!" }),
      })
    );
    expect(sixthRes.status).toBe(429);
    expect(sixthRes.headers.get("Retry-After")).toBeDefined();
  });

  it("manages fingerprint biometric toggle and status via /api/auth/biometrics", async () => {
    const master = await authStore.getUserById("usr_master_01");
    const session = authStore.createSession(master!);

    const toggleReq = new NextRequest("http://localhost:3000/api/auth/biometrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        userId: "usr_master_01",
        action: "toggle",
        enabled: true,
      }),
    });

    const toggleRes = await biometricsHandler(toggleReq);
    expect(toggleRes.status).toBe(200);
    const toggleData = await toggleRes.json();
    expect(toggleData.success).toBe(true);
    expect(toggleData.biometricEnabled).toBe(true);

    const getReq = new NextRequest("http://localhost:3000/api/auth/biometrics?userId=usr_master_01", {
      headers: {
        authorization: `Bearer ${session.token}`,
      },
    });
    const getRes = await getBiometricsHandler(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.biometricEnabled).toBe(true);
  });

  it("updates user profile avatar via /api/auth/profile", async () => {
    // Generate valid session token for master user
    const master = await authStore.getUserById("usr_master_01");
    expect(master).toBeDefined();
    const session = authStore.createSession(master!);

    const req = new NextRequest("http://localhost:3000/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        avatarUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      }),
    });

    const res = await profileHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.avatarUrl).toBe("/api/avatars/usr_master_01");
  });

  it("isolates integrations for non-master guest accounts", async () => {
    // Register guest
    const guestUser = await authStore.registerWithEmail({
      name: "Amigo Invitado",
      email: `amigo.${uniqueSuffix}@example.com`,
      password: "Password123!",
    });
    const guestSession = authStore.createSession(guestUser);

    // Guest GET /api/integrations returns unconfigured
    const getReq = new NextRequest("http://localhost:3000/api/integrations", {
      headers: { authorization: `Bearer ${guestSession.token}` },
    });
    const getRes = await getIntegrationsHandler(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.success).toBe(true);
    expect(getData.status.telegram.isConfigured).toBe(false);
    expect(getData.status.gemini.isConfigured).toBe(false);

    // Guest POST /api/integrations is rejected with 403 Forbidden
    const postReq = new NextRequest("http://localhost:3000/api/integrations", {
      method: "POST",
      headers: { authorization: `Bearer ${guestSession.token}` },
      body: JSON.stringify({ action: "telegram", token: "123:ABC" }),
    });
    const postRes = await postIntegrationsHandler(postReq);
    expect(postRes.status).toBe(403);
  });
});
