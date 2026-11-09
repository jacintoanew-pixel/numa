import { describe, it, expect, beforeEach } from "vitest";
import {
  AuthStore,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/auth-store";

describe("Auth Store & Cryptographic Authentication Engine", () => {
  let store: AuthStore;

  beforeEach(() => {
    // In-memory test store
    store = new AuthStore({ inMemory: true });
  });

  describe("Password Hashing & Constant-Time Verification", () => {
    it("hashes password with a random salt and verifies correctly", () => {
      const password = "BankPassword123!";
      const hashed = hashPassword(password);
      expect(hashed).toContain(":");
      const [salt, hash] = hashed.split(":");
      expect(salt.length).toBeGreaterThanOrEqual(16);
      expect(hash.length).toBeGreaterThanOrEqual(32);

      // Verify correct password
      expect(verifyPassword(password, hashed)).toBe(true);
      // Verify incorrect password
      expect(verifyPassword("WrongPassword123!", hashed)).toBe(false);
      // Verify empty or tampered password
      expect(verifyPassword("", hashed)).toBe(false);
    });

    it("generates different salts for identical passwords", () => {
      const password = "IdenticalPassword2026!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("Email Registration & Login", () => {
    it("registers a new user and allows login with valid credentials", async () => {
      const user = await store.registerWithEmail({
        email: "test.user@example.com",
        name: "Test User",
        password: "SecurePassword999!",
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("test.user@example.com");
      expect(user.name).toBe("Test User");
      expect(user.provider).toBe("email");
      expect(user.isVerified).toBe(true);

      // Login success
      const session = await store.loginWithEmail("test.user@example.com", "SecurePassword999!");
      expect(session).toBeDefined();
      expect(session.user.id).toBe(user.id);
      expect(session.token).toBeDefined();

      // Login fail with wrong password
      await expect(store.loginWithEmail("test.user@example.com", "WrongPass")).rejects.toThrow();
    });

    it("rejects duplicate email registration", async () => {
      await store.registerWithEmail({
        email: "duplicate@example.com",
        name: "User One",
        password: "Password123!",
      });

      await expect(
        store.registerWithEmail({
          email: "duplicate@example.com",
          name: "User Two",
          password: "Password456!",
        })
      ).rejects.toThrow(/registrado/i);
    });
  });

  describe("Direct Google Registration & Login", () => {
    it("registers user automatically from Google profile without password", async () => {
      const result = await store.loginOrRegisterWithGoogle({
        email: "admin.google@example.com",
        name: "Admin User Google",
        googleId: "google-sub-12345",
        avatarUrl: "https://lh3.googleusercontent.com/a/photo",
      });

      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe("admin.google@example.com");
      expect(result.user.name).toBe("Admin User Google");
      expect(result.user.provider).toBe("google");
      expect(result.user.avatarUrl).toContain("photo");
      expect(result.isNewUser).toBe(true);

      // Subsequent login with same Google account returns existing user
      const secondLogin = await store.loginOrRegisterWithGoogle({
        email: "admin.google@example.com",
        name: "Admin User Google",
        googleId: "google-sub-12345",
        avatarUrl: "https://lh3.googleusercontent.com/a/photo",
      });

      expect(secondLogin.user.id).toBe(result.user.id);
      expect(secondLogin.isNewUser).toBe(false);
    });
  });

  describe("Direct Apple Registration & Login", () => {
    it("registers or logs in user with Apple ID", async () => {
      const result = await store.loginOrRegisterWithApple({
        email: "admin.apple@privaterelay.appleid.com",
        name: "Admin User Apple",
        appleId: "apple-sub-98765",
      });

      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe("admin.apple@privaterelay.appleid.com");
      expect(result.user.provider).toBe("apple");
      expect(result.isNewUser).toBe(true);
    });
  });

  describe("15-Minute Password Reset Flow", () => {
    it("generates 15-minute token and allows single-use password reset", async () => {
      const user = await store.registerWithEmail({
        email: "forgot.pass@example.com",
        name: "Forgot Pass User",
        password: "OldPassword123!",
      });

      const resetToken = await store.createPasswordResetToken("forgot.pass@example.com");
      expect(resetToken.token).toBeDefined();
      expect(resetToken.token.length).toBeGreaterThanOrEqual(32);
      expect(resetToken.expiresAt).toBeGreaterThan(Date.now());
      // Expiration should be within ~15 minutes
      const diffMinutes = (resetToken.expiresAt - Date.now()) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThanOrEqual(15.1);

      // Reset password
      const resetResult = await store.resetPasswordWithToken(resetToken.token, "BrandNewPassword2026!");
      expect(resetResult.success).toBe(true);

      // Login with new password works
      const loginNew = await store.loginWithEmail("forgot.pass@example.com", "BrandNewPassword2026!");
      expect(loginNew.user.id).toBe(user.id);

      // Login with old password fails
      await expect(
        store.loginWithEmail("forgot.pass@example.com", "OldPassword123!")
      ).rejects.toThrow();

      // Second use of same token fails
      await expect(
        store.resetPasswordWithToken(resetToken.token, "AnotherPassword!")
      ).rejects.toThrow(/inválido|expirado/i);
    });
  });

  describe("Fingerprint WebAuthn Platform Credentials", () => {
    it("saves and lists platform fingerprint credentials for a user", async () => {
      const user = await store.registerWithEmail({
        email: "biometric@example.com",
        name: "Biometric User",
        password: "Password123!",
      });

      await store.saveBiometricCredential({
        userId: user.id,
        credentialId: "cred_touch_id_macbook_01",
        publicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
        deviceName: "MacBook Touch ID / Lector de Huella",
      });

      const creds = await store.getBiometricCredentials(user.id);
      expect(creds.length).toBe(1);
      expect(creds[0].credentialId).toBe("cred_touch_id_macbook_01");
      expect(creds[0].deviceName).toContain("Huella");
    });
  });

  describe("Provisioned Users (Admin User & Demo User)", () => {
    it("authenticates Demo User via multiple identifier aliases and validates 2FA", async () => {
      const { generateTOTPCodeSync } = await import("@/lib/auth/auth-store");
      // Load store from persistent path logic
      const diskStore = new AuthStore({ inMemory: false });

      // Test identifier aliases
      const byUser = await diskStore.validateCredentials("demouser", "ChangeMe-Demo-User-2026!");
      expect(byUser.id).toBe("usr_demo_user");
      expect(byUser.name).toBe("Demo User");

      const byShort = await diskStore.validateCredentials("demo", "ChangeMe-Demo-User-2026!");
      expect(byShort.id).toBe("usr_demo_user");

      const byDot = await diskStore.validateCredentials("demo.user", "ChangeMe-Demo-User-2026!");
      expect(byDot.id).toBe("usr_demo_user");
      expect(byDot.username).toBe("demouser");
      expect(byDot.email).toBe("");

      // Reject incorrect password
      await expect(
        diskStore.validateCredentials("demouser", "WrongPassword!")
      ).rejects.toThrow("Credenciales inválidas.");

      // Verify Demo User does NOT have 2FA forced (he hasn't linked any authenticator yet)
      expect(byUser.twoFactorEnabled).toBe(false);
      expect(byUser.twoFactorEnrolled).toBe(false);
    });
  });
});
