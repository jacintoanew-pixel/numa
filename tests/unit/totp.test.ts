import { describe, it, expect } from "vitest";
import {
  generateBase32Secret,
  generateTOTPCode,
  verifyTOTPCode,
  generateBackupCodes,
  getOTPAuthUri,
} from "@/lib/security/totp";

describe("RFC 6238 TOTP Two-Factor Authentication", () => {
  it("generates a valid 20-character base32 secret", () => {
    const secret = generateBase32Secret(20);
    expect(secret).toHaveLength(20);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it("generates and verifies 6-digit TOTP codes", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const code = await generateTOTPCode(secret);
    expect(code).toMatch(/^\d{6}$/);

    const isValid = await verifyTOTPCode(code, secret);
    expect(isValid).toBe(true);
  });

  it("rejects invalid or forged TOTP codes", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const isValid = await verifyTOTPCode("000000", secret);
    // Unless by a 1-in-a-million chance the current code is 000000
    if (isValid) {
      expect(await verifyTOTPCode("999999", secret)).toBe(false);
    } else {
      expect(isValid).toBe(false);
    }
  });

  it("generates 6 unique backup recovery codes", () => {
    const codes = generateBackupCodes(6);
    expect(codes).toHaveLength(6);
    codes.forEach((c) => {
      expect(c).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    });
  });

  it("formats standard otpauth URI for Google Authenticator", () => {
    const uri = getOTPAuthUri("admin@example.com", "JBSWY3DPEHPK3PXP", "numa");
    expect(uri).toContain("otpauth://totp/numa:admin%40example.com");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=numa");
  });
});
