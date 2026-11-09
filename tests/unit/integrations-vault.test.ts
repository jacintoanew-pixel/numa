import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptSecret, decryptSecret, maskString, integrationsVault } from "@/lib/security/integrations-vault";
import { GET, POST } from "@/app/api/integrations/route";
import { NextRequest } from "next/server";

describe("Integrations Vault & AES-256-GCM Cryptography", () => {
  it("encrypts and decrypts secrets reversibly using AES-256-GCM authenticated cipher", () => {
    const rawSecret = "7123456789:AAHkL7z9mX1234567890abcdef";
    const encrypted = encryptSecret(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted).toContain(":"); // Contains IV, AuthTag, and CipherData

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("fails gracefully and returns empty string on tampered cipher text", () => {
    const corrupted = "001122:334455:tampered_payload_xyz";
    const result = decryptSecret(corrupted);
    expect(result).toBe("");
  });

  it("masks secrets securely for public display without leaking plain values", () => {
    const token = "7123456789:AAHkL7z9mX1234567890abcdef";
    const maskedToken = maskString(token, 6, 4);

    expect(maskedToken.startsWith("712345")).toBe(true);
    expect(maskedToken.endsWith("cdef")).toBe(true);
    expect(maskedToken).toContain("•");
    expect(maskedToken).not.toContain("AAHkL7z9");

    const userId = "591234567";
    const maskedUser = maskString(userId, 2, 2);
    expect(maskedUser.startsWith("59")).toBe(true);
    expect(maskedUser.endsWith("67")).toBe(true);
    expect(maskedUser).toContain("•");
  });

  it("rejects invalid Telegram configuration without numbers in user ID", async () => {
    await expect(
      integrationsVault.configureTelegram("7123456789:fake_token", "not_a_number_id")
    ).rejects.toThrow("numérico");
  });

  it("rejects empty Gemini API key", async () => {
    await expect(integrationsVault.configureGemini("")).rejects.toThrow("obligatoria");
  });

  it("exposes public status without leaking decrypted secrets", () => {
    const status = integrationsVault.getPublicStatus();
    expect(status).toHaveProperty("telegram");
    expect(status).toHaveProperty("gemini");
    if (status.telegram.maskedToken) {
      expect(status.telegram.maskedToken).toContain("•");
    }
  });

  it("disconnects Telegram and clears status", () => {
    integrationsVault.disconnectTelegram();
    const status = integrationsVault.getPublicStatus();
    expect(status.telegram.isConfigured).toBe(false);
    expect(status.telegram.isSecuredWithUserId).toBe(false);
  });

  it("disconnects Gemini and clears status", () => {
    integrationsVault.disconnectGemini();
    const status = integrationsVault.getPublicStatus();
    expect(status.gemini.isConfigured).toBe(false);
  });
  it("configures and decrypts Google OAuth Client ID with AES-256-GCM", () => {
    const clientId = "123456789-abcdefghij1234567890.apps.googleusercontent.com";
    integrationsVault.configureGoogleOAuth(clientId);

    expect(integrationsVault.getGoogleClientId()).toBe(clientId);

    const status = integrationsVault.getPublicStatus();
    expect(status.google.isConfigured).toBe(true);
    expect(status.google.maskedClientId).toContain("•");
    expect(status.google.maskedClientId?.startsWith("12345678")).toBe(true);

    integrationsVault.disconnectGoogleOAuth();
    expect(integrationsVault.getGoogleClientId()).toBe("");
    expect(integrationsVault.getPublicStatus().google.isConfigured).toBe(false);
  });

  it("configures and decrypts Apple Services ID with AES-256-GCM", () => {
    const serviceId = "com.acme.personal.banking.service";
    integrationsVault.configureAppleOAuth(serviceId);

    expect(integrationsVault.getAppleClientId()).toBe(serviceId);

    const status = integrationsVault.getPublicStatus();
    expect(status.apple.isConfigured).toBe(true);
    expect(status.apple.maskedClientId).toContain("•");

    integrationsVault.disconnectAppleOAuth();
    expect(integrationsVault.getAppleClientId()).toBe("");
    expect(integrationsVault.getPublicStatus().apple.isConfigured).toBe(false);
  });
});

describe("Integrations Route Handler", () => {
  async function getMasterAuthHeaders() {
    const { authStore } = await import("@/lib/auth/auth-store");
    const master = await authStore.getUserById("usr_master_01");
    const session = authStore.createSession(master!);
    return {
      authorization: `Bearer ${session.token}`,
      "content-type": "application/json",
    };
  }

  it("returns public status on GET including google and apple", async () => {
    const headers = await getMasterAuthHeaders();
    const req = new NextRequest("http://localhost:3000/api/integrations", { headers });
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBeDefined();
    expect(data.status.gemini).toBeDefined();
    expect(data.status.telegram).toBeDefined();
    expect(data.status.google).toBeDefined();
    expect(data.status.apple).toBeDefined();
  });

  it("rejects unknown action with 400", async () => {
    const headers = await getMasterAuthHeaders();
    const req = new NextRequest("http://localhost:3000/api/integrations", {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "unknown_service" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("configures and disconnects Google OAuth via API", async () => {
    const headers = await getMasterAuthHeaders();
    const reqPost = new NextRequest("http://localhost:3000/api/integrations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "google_oauth",
        clientId: "9988776655-testclient.apps.googleusercontent.com",
      }),
    });
    const resPost = await POST(reqPost);
    const dataPost = await resPost.json();
    expect(resPost.status).toBe(200);
    expect(dataPost.success).toBe(true);
    expect(dataPost.status.google.isConfigured).toBe(true);

    const reqDelete = new NextRequest("http://localhost:3000/api/integrations?target=google", {
      method: "DELETE",
      headers,
    });
    const { DELETE } = await import("@/app/api/integrations/route");
    const resDelete = await DELETE(reqDelete);
    const dataDelete = await resDelete.json();
    expect(resDelete.status).toBe(200);
    expect(dataDelete.status.google.isConfigured).toBe(false);
  });

  it("configures and disconnects Apple Sign In via API", async () => {
    const headers = await getMasterAuthHeaders();
    const reqPost = new NextRequest("http://localhost:3000/api/integrations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "apple_oauth",
        clientId: "com.acme.personal.test",
      }),
    });
    const resPost = await POST(reqPost);
    const dataPost = await resPost.json();
    expect(resPost.status).toBe(200);
    expect(dataPost.success).toBe(true);
    expect(dataPost.status.apple.isConfigured).toBe(true);

    const reqDelete = new NextRequest("http://localhost:3000/api/integrations?target=apple", {
      method: "DELETE",
      headers,
    });
    const { DELETE } = await import("@/app/api/integrations/route");
    const resDelete = await DELETE(reqDelete);
    const dataDelete = await resDelete.json();
    expect(resDelete.status).toBe(200);
    expect(dataDelete.status.apple.isConfigured).toBe(false);
  });

  it("handles disconnect via POST and DELETE", async () => {
    const headers = await getMasterAuthHeaders();
    const reqPost = new NextRequest("http://localhost:3000/api/integrations", {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "disconnect_telegram" }),
    });
    const resPost = await POST(reqPost);
    const dataPost = await resPost.json();
    expect(resPost.status).toBe(200);
    expect(dataPost.success).toBe(true);
    expect(dataPost.status.telegram.isConfigured).toBe(false);

    const reqDelete = new NextRequest("http://localhost:3000/api/integrations?target=gemini", {
      method: "DELETE",
      headers,
    });
    const { DELETE } = await import("@/app/api/integrations/route");
    const resDelete = await DELETE(reqDelete);
    const dataDelete = await resDelete.json();
    expect(resDelete.status).toBe(200);
    expect(dataDelete.success).toBe(true);
    expect(dataDelete.status.gemini.isConfigured).toBe(false);
  });
});
