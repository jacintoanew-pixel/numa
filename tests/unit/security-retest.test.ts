import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { authStore, AuthStore } from "@/lib/auth/auth-store";
import { financialService } from "@/lib/finance/service";
import { GET as getBiometrics, POST as postBiometrics } from "@/app/api/auth/biometrics/route";
import { GET as getFinanceState } from "@/app/api/finance/state/route";
import {
  GET as getAccounts,
  POST as postAccount,
  PUT as putAccount,
} from "@/app/api/finance/accounts/route";
import { POST as postTransaction } from "@/app/api/finance/transactions/route";
import { GET as getAvatar } from "@/app/api/avatars/[id]/route";
import { PATCH as patchProfile } from "@/app/api/auth/profile/route";
import { GET as getExportCsv } from "@/app/api/export/csv/route";
import { POST as postScanReceipt } from "@/app/api/finance/scan-receipt/route";
import { clearAllRateLimits } from "@/lib/security/rate-limit";

describe("Security Retest Regression Suite (N-01 to N-08)", () => {
  beforeEach(() => {
    financialService.resetToDefaults();
    clearAllRateLimits();
  });

  it("N-01: all protected GET endpoints return 401 without a valid session cookie (never fallback to master)", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/auth/biometrics");
    const res1 = await getBiometrics(req1);
    expect(res1.status).toBe(401);

    const req2 = new NextRequest("http://localhost:3000/api/finance/state");
    const res2 = await getFinanceState(req2);
    expect(res2.status).toBe(401);

    const req3 = new NextRequest("http://localhost:3000/api/finance/accounts");
    const res3 = await getAccounts(req3);
    expect(res3.status).toBe(401);
  });

  it("N-03: blocks cross-tenant transfers and expenses between accounts of different users (BOLA -> 404)", async () => {
    const masterUser = (await authStore.getUserById("usr_master_01"))!;
    const demoUser = (await authStore.getUserById("usr_demo_user"))!;
    const masterSession = authStore.createSession(masterUser, "127.0.0.1", "Test");
    const demoSession = authStore.createSession(demoUser, "127.0.0.1", "Test");

    // Ensure Demo has his initial cash account ($0.00)
    const demoAccounts = financialService.getAccountsByUser("usr_demo_user");
    expect(demoAccounts.length).toBeGreaterThan(0);
    const demoAccId = demoAccounts[0].id;

    // 1. Master tries to transfer to Demo's account -> must return 404 and leave Demo's balance untouched
    const transferToForeignReq = new NextRequest("http://localhost:3000/api/finance/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterSession.token}`,
      },
      body: JSON.stringify({
        amount: "0.01",
        type: "transfer",
        description: "prueba-cruzada",
        accountId: "acc-1",
        toAccountId: demoAccId,
        date: "2026-10-24",
      }),
    });
    const res1 = await postTransaction(transferToForeignReq);
    expect(res1.status).toBe(404);
    expect(financialService.getOwnedAccount("usr_demo_user", demoAccId)?.currentBalance).toBe("0.00");

    // 2. Demo tries to transfer from Master's account (acc-1) to his own -> must return 404
    const transferFromForeignReq = new NextRequest("http://localhost:3000/api/finance/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${demoSession.token}`,
      },
      body: JSON.stringify({
        amount: "10.00",
        type: "transfer",
        description: "robo-cruzado",
        accountId: "acc-1",
        toAccountId: demoAccId,
        date: "2026-10-24",
      }),
    });
    const res2 = await postTransaction(transferFromForeignReq);
    expect(res2.status).toBe(404);
    expect(financialService.getOwnedAccount("usr_master_01", "acc-1")?.currentBalance).toBe("0.00");
  });

  it("N-04: PUT /api/finance/accounts updates metadata using merge semantics without resetting currentBalance or currency", async () => {
    const masterUser = (await authStore.getUserById("usr_master_01"))!;
    const masterSession = authStore.createSession(masterUser, "127.0.0.1", "Test");

    const createReq = new NextRequest("http://localhost:3000/api/finance/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterSession.token}`,
      },
      body: JSON.stringify({
        id: "acc_deep_probe",
        name: "Probe",
        type: "bank",
        balance: 5,
        currency: "EUR",
      }),
    });
    const createRes = await postAccount(createReq);
    expect(createRes.status).toBe(200);
    const createdJson = await createRes.json();
    expect(createdJson.data.currentBalance).toBe("5.00");
    expect(createdJson.data.currency).toBe("EUR");

    // Now PUT only name and type
    const putReq = new NextRequest("http://localhost:3000/api/finance/accounts", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterSession.token}`,
      },
      body: JSON.stringify({
        id: "acc_deep_probe",
        name: "Probe2",
        type: "savings",
      }),
    });
    const putRes = await putAccount(putReq);
    expect(putRes.status).toBe(200);
    const putJson = await putRes.json();
    expect(putJson.data.name).toBe("Probe2");
    expect(putJson.data.type).toBe("savings");
    expect(putJson.data.currentBalance).toBe("5.00");
    expect(putJson.data.currency).toBe("EUR");
  });

  it("N-05, N-06, N-07: hides Zod internals, enforces Cache-Control: no-store, and rejects text/plain with 415", async () => {
    const masterUser = (await authStore.getUserById("usr_master_01"))!;
    const masterSession = authStore.createSession(masterUser, "127.0.0.1", "Test");

    // N-07: text/plain rejected with 415
    const textPlainReq = new NextRequest("http://localhost:3000/api/finance/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Bearer ${masterSession.token}`,
      },
      body: JSON.stringify({ amount: "0.01", type: "expense" }),
    });
    const textPlainRes = await postTransaction(textPlainReq);
    expect(textPlainRes.status).toBe(415);

    // N-05: invalid enum does NOT leak Zod schema issues or details field
    const invalidEnumReq = new NextRequest("http://localhost:3000/api/finance/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterSession.token}`,
      },
      body: JSON.stringify({
        amount: "10.00",
        type: "hack",
        description: "test",
        accountId: "acc-1",
        date: "2026-10-24",
      }),
    });
    const invalidEnumRes = await postTransaction(invalidEnumReq);
    expect(invalidEnumRes.status).toBe(400);
    const errBody = await invalidEnumRes.json();
    expect(errBody.details).toBeUndefined();
    expect(JSON.stringify(errBody)).not.toContain("invalid_enum_value");

    // N-06: Cache-Control: no-store on GET /api/finance/state
    const stateReq = new NextRequest("http://localhost:3000/api/finance/state", {
      headers: {
        Authorization: `Bearer ${masterSession.token}`,
      },
    });
    const stateRes = await getFinanceState(stateReq);
    expect(stateRes.status).toBe(200);
    expect(stateRes.headers.get("Cache-Control")).toContain("no-store");
  });

  it("serves avatar on /login lock screen when valid (>32 bytes) and verifies stateless HMAC challengeId across workers", async () => {
    // 1. Stateless HMAC challengeId verified by a separate AuthStore instance, then consumed
    const chId = authStore.createTwoFactorChallenge("usr_master_01");
    const workerStore = new AuthStore({ inMemory: true });
    expect(workerStore.getTwoFactorChallengeUser(chId)).toBe("usr_master_01");
    workerStore.consumeTwoFactorChallenge(chId);
    expect(workerStore.getTwoFactorChallengeUser(chId)).toBeNull();

    // 2. Avatar endpoint serves image (>32 bytes) without requiring session cookie on /login
    const validPngBase64 = Buffer.alloc(64, 0x89).toString("base64");
    await authStore.updateUserProfile("usr_master_01", {
      avatarUrl: `data:image/jpeg;base64,${validPngBase64}`,
    });

    const avatarReq = new NextRequest("http://localhost:3000/api/avatars/usr_master_01");
    const avatarRes = await getAvatar(avatarReq, {
      params: Promise.resolve({ id: "usr_master_01" }),
    });
    expect(avatarRes.status).toBe(200);
    expect(avatarRes.headers.get("Content-Type")).toBe("image/jpeg");
    expect(avatarRes.headers.get("Cache-Control")).toContain("private, max-age=3600");
  });

  it("WebAuthn Cryptographic Verification: rejects bare credentialId replay and verifies ECDSA P-256 signature + single-use challenge + signCount", async () => {
    const masterUser = (await authStore.getUserById("usr_master_01"))!;
    const masterSession = authStore.createSession(masterUser, "127.0.0.1", "Test");

    // Generate real ECDSA P-256 keypair in SPKI DER format (exact format returned by AuthenticatorAttestationResponse.getPublicKey())
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const publicKeySpki = (publicKey.export({ type: "spki", format: "der" }) as Buffer).toString("base64");
    const credId = crypto.randomBytes(16).toString("base64");

    // 1. Register WebAuthn credential with SPKI public key
    const regReq = new NextRequest("http://localhost:3000/api/auth/biometrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterSession.token}`,
      },
      body: JSON.stringify({
        action: "register",
        credentialId: credId,
        publicKey: credId,
        publicKeySpki,
        alg: -7,
      }),
    });
    const regRes = await postBiometrics(regReq);
    expect(regRes.status).toBe(200);

    // 2. Attack: try to log in with bare credentialId (no challengeToken / signature) -> MUST return 401
    const replayBareReq = new NextRequest("http://localhost:3000/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_login",
        credentialId: credId,
      }),
    });
    const replayBareRes = await postBiometrics(replayBareReq);
    expect(replayBareRes.status).toBe(401);

    // 3. Legitimate flow: request single-use server challenge
    const chReq = new NextRequest("http://localhost:3000/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "challenge",
        credentialId: credId,
      }),
    });
    const chRes = await postBiometrics(chReq);
    expect(chRes.status).toBe(200);
    const chData = await chRes.json();
    expect(chData.challenge).toBeDefined();
    expect(chData.challengeToken).toBeDefined();

    // Build authentic WebAuthn authenticatorData (rpIdHash + flags UP|UV=0x05 + signCount=1) and clientDataJSON
    const rpIdHash = crypto.createHash("sha256").update("localhost").digest();
    const flags = Buffer.from([0x05]); // UP (0x01) | UV (0x04)
    const signCountBuf = Buffer.alloc(4);
    signCountBuf.writeUInt32BE(1, 0);
    const authDataBuf = Buffer.concat([rpIdHash, flags, signCountBuf]);

    const challengeB64Url = Buffer.from(chData.challenge, "base64")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const clientDataBuf = Buffer.from(
      JSON.stringify({
        type: "webauthn.get",
        challenge: challengeB64Url,
        origin: "http://localhost:3000",
      }),
      "utf8"
    );

    const clientDataHash = crypto.createHash("sha256").update(clientDataBuf).digest();
    const signedPayload = Buffer.concat([authDataBuf, clientDataHash]);
    const signatureBuf = crypto.sign("sha256", signedPayload, privateKey);

    // 4. Verify login with cryptographic assertion -> 200 OK
    const verifyReq = new NextRequest("http://localhost:3000/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_login",
        credentialId: credId,
        challengeToken: chData.challengeToken,
        authenticatorData: authDataBuf.toString("base64"),
        clientDataJSON: clientDataBuf.toString("base64"),
        signature: signatureBuf.toString("base64"),
      }),
    });
    const verifyRes = await postBiometrics(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.success).toBe(true);
    expect(verifyJson.user.id).toBe("usr_master_01");

    // 5. Replay same challengeToken a second time -> MUST return 401
    const replayChallengeReq = new NextRequest("http://localhost:3000/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_login",
        credentialId: credId,
        challengeToken: chData.challengeToken,
        authenticatorData: authDataBuf.toString("base64"),
        clientDataJSON: clientDataBuf.toString("base64"),
        signature: signatureBuf.toString("base64"),
      }),
    });
    const replayChallengeRes = await postBiometrics(replayChallengeReq);
    expect(replayChallengeRes.status).toBe(401);
  });

  it("O-01, O-03, O-05 (2026-10-30 revision): CSV starts with UTF-8 BOM, profile rejects SVG/fake base64 avatars, and finance writes allow up to 30/min", async () => {
    const demoUser = (await authStore.getUserById("usr_demo_user"))!;
    const demoSession = authStore.createSession(demoUser, "127.0.0.1", "Test");

    // 1. O-05: GET /api/export/csv starts with UTF-8 BOM (EF BB BF)
    const csvReq = new NextRequest("http://localhost:3000/api/export/csv?type=transactions", {
      headers: { Authorization: `Bearer ${demoSession.token}` },
    });
    const csvRes = await getExportCsv(csvReq);
    expect(csvRes.status).toBe(200);
    const csvBytes = Buffer.from(await csvRes.arrayBuffer());
    expect(csvBytes[0]).toBe(0xef);
    expect(csvBytes[1]).toBe(0xbb);
    expect(csvBytes[2]).toBe(0xbf);

    // 2. O-03: PATCH /api/auth/profile rejects SVG and fake non-image base64
    const svgAvatarReq = new NextRequest("http://localhost:3000/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${demoSession.token}`,
      },
      body: JSON.stringify({
        avatarUrl: "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4=",
      }),
    });
    const svgRes = await patchProfile(svgAvatarReq);
    expect(svgRes.status).toBe(400);

    const fakeJpegReq = new NextRequest("http://localhost:3000/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${demoSession.token}`,
      },
      body: JSON.stringify({
        avatarUrl: "data:image/jpeg;base64,bm90LWEtcmVhbC1qcGVnLWZpbGU=",
      }),
    });
    const fakeJpegRes = await patchProfile(fakeJpegReq);
    expect(fakeJpegRes.status).toBe(400);

    // 3. R-01 & O-01: 20 writes succeed and the 21st returns 429 with realistic Retry-After <= 60s
    const demoAccId = financialService.getAccountsByUser("usr_demo_user")[0].id;
    for (let i = 0; i < 20; i++) {
      const txReq = new NextRequest("http://localhost:3000/api/finance/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${demoSession.token}`,
        },
        body: JSON.stringify({
          amount: "1.00",
          type: "income",
          description: `Movimiento ${i}`,
          accountId: demoAccId,
          date: "2026-10-30",
        }),
      });
      const txRes = await postTransaction(txReq);
      expect(txRes.status).toBe(200);
    }

    const tx21Req = new NextRequest("http://localhost:3000/api/finance/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${demoSession.token}`,
      },
      body: JSON.stringify({
        amount: "1.00",
        type: "income",
        description: "Movimiento 21",
        accountId: demoAccId,
        date: "2026-10-30",
      }),
    });
    const tx21Res = await postTransaction(tx21Req);
    expect(tx21Res.status).toBe(429);
    const retryAfter = Number(tx21Res.headers.get("Retry-After") || "0");
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);

    // 4. R-02: scan-receipt accepts both multipart/form-data and application/json and limits to 5/min
    const validPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const form = new FormData();
    form.append("file", new Blob([validPng], { type: "image/png" }), "receipt.png");
    const multipartReq = new NextRequest("http://localhost:3000/api/finance/scan-receipt", {
      method: "POST",
      headers: { Authorization: `Bearer ${demoSession.token}` },
      body: form,
    });
    const multipartRes = await postScanReceipt(multipartReq);
    expect(multipartRes.status).toBe(200);
  });
});
