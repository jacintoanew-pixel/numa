import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  passwordHash?: string;
  provider: "google" | "apple" | "email";
  providerId?: string;
  avatarUrl?: string;
  isVerified: boolean;
  preferredCurrency: string;
  biometricEnabled: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorEnrolled?: boolean;
  twoFactorEnrolledAt?: string;
  pendingTwoFactorSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: string;
  ip?: string;
  userAgent?: string;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

export interface BiometricCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  /** Real WebAuthn public key (SPKI DER, base64). Credentials without it can NOT log in. */
  publicKeySpki?: string;
  /** COSE algorithm id (-7 ES256, -257 RS256). */
  alg?: number;
  /** Last authenticator signature counter seen (clone detection). */
  signCount?: number;
  deviceName: string;
  createdAt: string;
}

export interface AuthStoreData {
  users: StoredUser[];
  sessions: StoredSession[];
  resetTokens: PasswordResetToken[];
  biometricCredentials: BiometricCredential[];
}

const SESSION_SIGNING_SECRET =
  process.env.SESSION_SIGNING_SECRET ||
  process.env.VAULT_MASTER_KEY ||
  "dev-only-insecure-signing-secret-do-not-use-in-production";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 43200s

/**
 * HMAC-SHA256 (hex) of a server-side payload, domain-separated by `label`.
 * Used for stateless signed values such as WebAuthn challenges.
 */
export function signServerPayload(label: string, payload: string): string {
  return crypto
    .createHmac("sha256", SESSION_SIGNING_SECRET)
    .update(`${label}:${payload}`)
    .digest("hex");
}

export function getPublicAvatarUrl(user: { id?: string; avatarUrl?: string } | null | undefined): string {
  if (!user || !user.avatarUrl) return "";
  if (user.avatarUrl.startsWith("data:image/") && user.id) {
    return `/api/avatars/${encodeURIComponent(user.id)}`;
  }
  return user.avatarUrl;
}

export function generateSignedSessionToken(expiresAt: number): string {
  const randomHex = crypto.randomBytes(32).toString("hex");
  const expiresHex = expiresAt.toString(16);
  const sigHex = crypto
    .createHmac("sha256", SESSION_SIGNING_SECRET)
    .update(`${randomHex}.${expiresHex}`)
    .digest("hex");
  return `${randomHex}.${expiresHex}.${sigHex}`;
}

const COMMON_WEAK_PASSWORDS = new Set([
  "123456789012",
  "1234567890123",
  "password1234",
  "password12345",
  "qwerty123456",
  "qwertyuiop12",
  "administrador",
  "contraseña123",
  "contrasena123",
  "aaaaaaaaaaaa",
]);

/**
 * Unified server-side password policy (H-02):
 * Minimum 12 characters, rejects common/breached passwords.
 */
export function validatePasswordPolicy(password: unknown): string {
  if (typeof password !== "string") {
    throw new Error("Formato de contraseña inválido.");
  }
  if (password.length < 12) {
    throw new Error("La contraseña debe tener al menos 12 caracteres por seguridad.");
  }
  if (password.length > 128) {
    throw new Error("La contraseña no puede exceder 128 caracteres.");
  }
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    throw new Error("Esta contraseña aparece en listas de claves filtradas. Elige una más segura.");
  }
  return password;
}

/**
 * Scrypt-based password hashing with random 16-byte salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Constant-time password verification preventing timing attacks
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }
  try {
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, keyBuffer.length);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * RFC 6238 / RFC 4226 Base32 decoding and TOTP verification
 */
function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTOTPCodeSync(
  secret: string,
  timeOffsetSeconds = 0,
  stepSeconds = 30
): string {
  const keyBuffer = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000) + timeOffsetSeconds;
  const counter = Math.floor(epoch / stepSeconds);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac("sha1", keyBuffer).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (codeInt % 1000000).toString().padStart(6, "0");
}

export function verifyTOTPSync(
  inputCode: string,
  secret: string,
  windowSteps = 2
): boolean {
  const clean = inputCode.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  for (let step = -windowSteps; step <= windowSteps; step++) {
    const expected = generateTOTPCodeSync(secret, step * 30, 30);
    if (crypto.timingSafeEqual(Buffer.from(clean), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

// Demo seed credentials. Override via env in any real deployment.
export const DEFAULT_MASTER_PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe-Demo-2026!";

export const DEFAULT_MASTER_USER: StoredUser = {
  id: "usr_master_01",
  name: "Admin User",
  email: "",
  username: "admin",
  passwordHash: hashPassword(DEFAULT_MASTER_PASSWORD),
  provider: "email",
  avatarUrl: "",
  isVerified: true,
  preferredCurrency: "USD",
  biometricEnabled: false,
  twoFactorEnabled: true,
  twoFactorSecret: process.env.SEED_ADMIN_2FA_SECRET ?? "JBSWY3DPEHPK3PXP",
  twoFactorEnrolled: false,
  createdAt: "2026-01-15T08:00:00Z",
  updatedAt: "2026-01-15T08:00:00Z",
};

export const DEFAULT_DEMO_PASSWORD =
  process.env.SEED_DEMO_PASSWORD ?? "ChangeMe-Demo-User-2026!";

export const DEFAULT_DEMO_USER: StoredUser = {
  id: "usr_demo_user",
  name: "Demo User",
  email: "",
  username: "demouser",
  passwordHash: hashPassword(DEFAULT_DEMO_PASSWORD),
  provider: "email",
  avatarUrl: "",
  isVerified: true,
  preferredCurrency: "USD",
  biometricEnabled: false,
  twoFactorEnabled: false,
  twoFactorSecret: "",
  twoFactorEnrolled: false,
  createdAt: "2026-10-23T20:00:00Z",
  updatedAt: "2026-10-23T20:00:00Z",
};

export class AuthStore {
  private inMemory: boolean;
  private filePath: string;
  private data: AuthStoreData;
  private usedTotpCodes: Map<string, number> = new Map();
  private twoFactorChallenges: Map<
    string,
    { userId: string; expiresAt: number; attempts: number }
  > = new Map();

  constructor(options: { inMemory?: boolean; filePath?: string } = {}) {
    this.inMemory =
      options.inMemory ??
      (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
    this.filePath =
      options.filePath ||
      path.join(process.cwd(), "data", "auth_store.json");

    this.data = {
      users: [{ ...DEFAULT_MASTER_USER }, { ...DEFAULT_DEMO_USER }],
      sessions: [],
      resetTokens: [],
      biometricCredentials: [],
    };

    if (!this.inMemory) {
      this.load();
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(content);
        this.data = {
          users: parsed.users || [DEFAULT_MASTER_USER],
          sessions: parsed.sessions || [],
          resetTokens: parsed.resetTokens || [],
          biometricCredentials: parsed.biometricCredentials || [],
        };
        // Ensure default master user always exists with password and 2FA
        const masterIdx = this.data.users.findIndex(
          (u) => u.email === DEFAULT_MASTER_USER.email || u.id === "usr_master_01"
        );
        if (masterIdx === -1) {
          this.data.users.push({ ...DEFAULT_MASTER_USER });
        } else {
          const master = this.data.users[masterIdx];
          if (!master.passwordHash) {
            master.passwordHash = DEFAULT_MASTER_USER.passwordHash;
          }
          if (!master.twoFactorSecret) {
            master.twoFactorSecret = DEFAULT_MASTER_USER.twoFactorSecret;
          }
          master.username = "admin";
          master.twoFactorEnabled = true;
          master.twoFactorEnrolled = true;
        }

        // Ensure Demo User user always exists with password and 2FA
        const demoIdx = this.data.users.findIndex(
          (u) =>
            u.id === "usr_demo_user" ||
            u.username === "demouser"
        );
        if (demoIdx === -1) {
          this.data.users.push({ ...DEFAULT_DEMO_USER });
        } else {
          const demo = this.data.users[demoIdx];
          if (!demo.passwordHash) {
            demo.passwordHash = DEFAULT_DEMO_USER.passwordHash;
          }
          demo.name = "Demo User";
          demo.username = "demouser";
          if (demo.email?.endsWith("@example.com") || demo.email?.endsWith("@numa.local")) {
            demo.email = "";
          }
          // If the demo user has not explicitly enrolled, 2FA remains disabled
          if (!demo.twoFactorEnrolled) {
            demo.twoFactorEnabled = false;
            demo.twoFactorSecret = "";
          }
        }
        this.persist();
      } else {
        this.persist();
      }
    } catch (e) {
      console.warn("Failed to load auth_store.json, using defaults:", e);
    }
  }

  private persist(): void {
    if (this.inMemory) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), "utf-8");
      try {
        fs.renameSync(tmpPath, this.filePath);
      } catch {
        fs.copyFileSync(tmpPath, this.filePath);
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      }
    } catch (e) {
      console.warn("Failed to persist auth_store.json:", e);
    }
  }

  public async registerWithEmail(params: {
    email: string;
    name: string;
    password: string;
    preferredCurrency?: string;
    isVerified?: boolean;
  }): Promise<StoredUser> {
    if (typeof params.name !== "string" || !params.name.trim()) {
      throw new Error("El nombre es obligatorio.");
    }
    validatePasswordPolicy(params.password);

    const normalizedEmail = (typeof params.email === "string" ? params.email : "")
      .trim()
      .toLowerCase();
    if (normalizedEmail) {
      const existing = this.data.users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        throw new Error(`El correo ${normalizedEmail} ya está registrado.`);
      }
    }

    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(8).toString("hex")}`,
      name: params.name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(params.password),
      provider: "email",
      isVerified: params.isVerified ?? true,
      preferredCurrency: params.preferredCurrency || "USD",
      biometricEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.persist();
    return newUser;
  }

  public async validateCredentials(
    identifier: string,
    password: string
  ): Promise<StoredUser> {
    if (typeof identifier !== "string" || typeof password !== "string") {
      throw new Error("Credenciales inválidas.");
    }
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !password) {
      throw new Error("Credenciales inválidas.");
    }
    const user = this.data.users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        (cleanId === "admin" && u.id === "usr_master_01") ||
        ((cleanId === "demo" || cleanId === "demouser" || cleanId === "demo.user") &&
          (u.id === "usr_demo_user" || u.username === "demouser"))
    );

    if (!user || !user.passwordHash) {
      throw new Error("Credenciales inválidas o usuario no registrado con contraseña.");
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Credenciales inválidas.");
    }

    return user;
  }

  /**
   * Issues a short-lived (10 min) HMAC-signed challengeId after Step 1 password verification when 2FA is active (H-01).
   */
  public createTwoFactorChallenge(userId: string): string {
    const now = Date.now();
    for (const [k, v] of this.twoFactorChallenges.entries()) {
      if (v.expiresAt <= now) this.twoFactorChallenges.delete(k);
    }
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes
    const nonceHex = crypto.randomBytes(12).toString("hex");
    const userIdHex = Buffer.from(userId, "utf-8").toString("hex");
    const expiresHex = expiresAt.toString(16);
    const payload = `${nonceHex}.${userIdHex}.${expiresHex}`;
    const sigHex = crypto
      .createHmac("sha256", SESSION_SIGNING_SECRET)
      .update(`2fa_ch:${payload}`)
      .digest("hex");
    const challengeId = `ch_${payload}.${sigHex}`;
    this.twoFactorChallenges.set(challengeId, {
      userId,
      expiresAt,
      attempts: 0,
    });
    return challengeId;
  }

  /**
   * Validates a 2FA challengeId. Deletes/revokes it on success or after 5 failed TOTP attempts.
   */
  public getTwoFactorChallengeUser(challengeId: string): string | null {
    if (!challengeId || typeof challengeId !== "string" || !challengeId.startsWith("ch_")) {
      return null;
    }
    const now = Date.now();
    let entry = this.twoFactorChallenges.get(challengeId);

    if (!entry) {
      // Verify stateless HMAC-SHA256 signature if worker re-instantiated
      const raw = challengeId.slice(3);
      const parts = raw.split(".");
      if (parts.length !== 4) return null;
      const [nonceHex, userIdHex, expiresHex, sigHex] = parts;
      if (!nonceHex || !userIdHex || !expiresHex || !sigHex || sigHex.length !== 64) {
        return null;
      }
      const payload = `${nonceHex}.${userIdHex}.${expiresHex}`;
      const expectedSig = crypto
        .createHmac("sha256", SESSION_SIGNING_SECRET)
        .update(`2fa_ch:${payload}`)
        .digest("hex");
      try {
        if (!crypto.timingSafeEqual(Buffer.from(sigHex, "hex"), Buffer.from(expectedSig, "hex"))) {
          return null;
        }
      } catch {
        return null;
      }
      const expiresAt = parseInt(expiresHex, 16);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        return null;
      }
      const decodedUserId = Buffer.from(userIdHex, "hex").toString("utf-8");
      if (!decodedUserId) return null;
      entry = { userId: decodedUserId, expiresAt, attempts: 0 };
      this.twoFactorChallenges.set(challengeId, entry);
    }

    if (entry.expiresAt <= now || entry.attempts >= 5) {
      entry.attempts = 999; // mark revoked
      return null;
    }
    return entry.userId;
  }

  public recordTwoFactorChallengeFailure(challengeId: string): void {
    const entry = this.twoFactorChallenges.get(challengeId);
    if (!entry) return;
    entry.attempts += 1;
  }

  public consumeTwoFactorChallenge(challengeId: string): void {
    const entry = this.twoFactorChallenges.get(challengeId);
    if (entry) {
      entry.attempts = 999;
      entry.expiresAt = 0;
    } else {
      this.twoFactorChallenges.set(challengeId, { userId: "", expiresAt: 0, attempts: 999 });
    }
  }

  public createSession(user: StoredUser, ip?: string, userAgent?: string): StoredSession {
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_MS;
    const token = generateSignedSessionToken(expiresAt);

    // Prune expired sessions and rotate same-IP/UA session for this user (H-04)
    this.data.sessions = this.data.sessions.filter(
      (s) =>
        s.expiresAt > now &&
        !(s.userId === user.id && ip && s.ip === ip && userAgent && s.userAgent === userAgent)
    );

    const session: StoredSession = {
      id: `ses_${crypto.randomBytes(8).toString("hex")}`,
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      ip,
      userAgent,
    };

    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  public validateSession(token: string): StoredSession | null {
    if (!token || typeof token !== "string") return null;
    const session = this.data.sessions.find(
      (s) => s.token === token && s.expiresAt > Date.now()
    );
    return session || null;
  }

  public getUserBySessionToken(token: string): StoredUser | null {
    const session = this.validateSession(token);
    if (!session) return null;
    return this.data.users.find((u) => u.id === session.userId) || null;
  }

  public verifyTOTP(userId: string, code: string): boolean {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user || !user.twoFactorSecret) return false;

    const cleanCode = code.trim().replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleanCode)) return false;

    // 1. Anti-Replay check (90s window)
    const replayKey = `${userId}:${cleanCode}`;
    const now = Date.now();
    const lastUsed = this.usedTotpCodes.get(replayKey);
    if (lastUsed && now - lastUsed < 90000) {
      // Code was already consumed in the last 90 seconds
      return false;
    }

    // 2. RFC 6238 TOTP verification (step=30s, window=1)
    const isValid = verifyTOTPSync(cleanCode, user.twoFactorSecret);
    if (isValid) {
      this.usedTotpCodes.set(replayKey, now);
      // Clean old entries older than 2 minutes
      for (const [k, time] of this.usedTotpCodes.entries()) {
        if (now - time > 120000) this.usedTotpCodes.delete(k);
      }
      return true;
    }
    return false;
  }

  public async confirm2FAEnrollment(userId: string, code: string): Promise<boolean> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user || !user.twoFactorSecret) return false;

    const isValid = this.verifyTOTP(userId, code);
    if (!isValid) return false;

    user.twoFactorEnrolled = true;
    user.twoFactorEnrolledAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  public async generateNew2FASecret(userId: string): Promise<{ secret: string; qrUri: string }> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) throw new Error("Usuario no encontrado.");

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = crypto.randomBytes(16);
    let secret = "";
    for (let i = 0; i < 16; i++) {
      secret += alphabet[bytes[i] % 32];
    }

    user.pendingTwoFactorSecret = secret;
    user.updatedAt = new Date().toISOString();
    this.persist();

    const accountName = encodeURIComponent(user.name || user.email);
    const qrUri = `otpauth://totp/numa:${accountName}?secret=${secret}&issuer=numa&algorithm=SHA1&digits=6&period=30`;

    return { secret, qrUri };
  }

  public async confirmNew2FASetup(userId: string, code: string): Promise<boolean> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user || !user.pendingTwoFactorSecret) return false;

    const clean = code.trim().replace(/\s+/g, "");
    const isValid = verifyTOTPSync(clean, user.pendingTwoFactorSecret);
    if (!isValid) return false;

    user.twoFactorSecret = user.pendingTwoFactorSecret;
    user.pendingTwoFactorSecret = undefined;
    user.twoFactorEnabled = true;
    user.twoFactorEnrolled = true;
    user.twoFactorEnrolledAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  public async unlink2FA(userId: string): Promise<boolean> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return false;

    user.twoFactorEnrolled = false;
    user.twoFactorEnrolledAt = undefined;
    user.pendingTwoFactorSecret = undefined;
    user.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  public async loginWithEmail(
    identifier: string,
    password: string
  ): Promise<{ user: StoredUser; token: string }> {
    const user = await this.validateCredentials(identifier, password);
    const session = this.createSession(user);
    return { user, token: session.token };
  }

  public async loginOrRegisterWithGoogle(params: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
  }): Promise<{ user: StoredUser; token: string; isNewUser: boolean }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    let user = this.data.users.find((u) => u.email === normalizedEmail);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: `usr_${crypto.randomBytes(8).toString("hex")}`,
        name: params.name.trim(),
        email: normalizedEmail,
        provider: "google",
        providerId: params.googleId,
        avatarUrl: params.avatarUrl,
        isVerified: true,
        preferredCurrency: "USD",
        biometricEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(user);
    } else {
      user.provider = "google";
      user.providerId = params.googleId;
      if (params.name?.trim()) {
        user.name = params.name.trim();
      }
      if (params.avatarUrl) {
        user.avatarUrl = params.avatarUrl;
      }
      user.updatedAt = new Date().toISOString();
    }

    const session = this.createSession(user);
    return { user, token: session.token, isNewUser };
  }

  public async loginOrRegisterWithApple(params: {
    email: string;
    name: string;
    appleId: string;
  }): Promise<{ user: StoredUser; token: string; isNewUser: boolean }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    let user = this.data.users.find((u) => u.email === normalizedEmail);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id: `usr_${crypto.randomBytes(8).toString("hex")}`,
        name: params.name.trim() || "Usuario Apple",
        email: normalizedEmail,
        provider: "apple",
        providerId: params.appleId,
        isVerified: true,
        preferredCurrency: "USD",
        biometricEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(user);
    } else {
      user.provider = "apple";
      user.providerId = params.appleId;
      if (params.name?.trim()) {
        user.name = params.name.trim();
      }
      user.updatedAt = new Date().toISOString();
    }

    const session = this.createSession(user);
    return { user, token: session.token, isNewUser };
  }

  public async createPasswordResetToken(email: string): Promise<PasswordResetToken> {
    if (typeof email !== "string") {
      throw new Error("Formato de correo electrónico inválido.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.data.users.find((u) => u.email === normalizedEmail);
    if (!user) {
      throw new Error("No existe ninguna cuenta registrada con este correo electrónico.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetToken: PasswordResetToken = {
      token,
      email: normalizedEmail,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      used: false,
    };

    // Invalidate existing unused tokens for this email
    this.data.resetTokens = this.data.resetTokens.filter(
      (t) => t.email !== normalizedEmail || t.used
    );
    this.data.resetTokens.push(resetToken);
    this.persist();

    return resetToken;
  }

  public async resetPasswordWithToken(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; email: string }> {
    if (typeof token !== "string" || !token.trim()) {
      throw new Error("El token de restablecimiento es inválido.");
    }
    validatePasswordPolicy(newPassword);

    const resetEntry = this.data.resetTokens.find(
      (t) => t.token === token && !t.used && t.expiresAt > Date.now()
    );

    if (!resetEntry) {
      throw new Error("El token de restablecimiento es inválido o ha expirado (límite 15 minutos).");
    }

    const user = this.data.users.find((u) => u.email === resetEntry.email);
    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    resetEntry.used = true;

    // Revoke all existing sessions for safety
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== user.id);

    this.persist();
    return { success: true, email: user.email };
  }

  public async saveBiometricCredential(params: {
    userId: string;
    credentialId: string;
    publicKey: string;
    publicKeySpki?: string;
    alg?: number;
    deviceName: string;
  }): Promise<BiometricCredential> {
    const normalizeCred = (id: string) =>
      id.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const targetNorm = normalizeCred(params.credentialId);

    const existing = this.data.biometricCredentials.find(
      (c) => c.userId === params.userId && normalizeCred(c.credentialId) === targetNorm
    );
    if (existing) {
      existing.publicKey = params.publicKey || existing.publicKey;
      existing.publicKeySpki = params.publicKeySpki || existing.publicKeySpki;
      existing.alg = params.alg ?? existing.alg;
      existing.deviceName = params.deviceName || existing.deviceName;
      this.persist();
      return existing;
    }

    const cred: BiometricCredential = {
      id: `bio_${crypto.randomBytes(8).toString("hex")}`,
      userId: params.userId,
      credentialId: params.credentialId,
      publicKey: params.publicKey,
      publicKeySpki: params.publicKeySpki,
      alg: params.alg,
      signCount: 0,
      deviceName: params.deviceName,
      createdAt: new Date().toISOString(),
    };

    this.data.biometricCredentials.push(cred);
    this.persist();
    return cred;
  }

  public async updateBiometricSignCount(credentialId: string, signCount: number): Promise<void> {
    const cred = await this.getBiometricCredentialById(credentialId);
    if (!cred) return;
    cred.signCount = signCount;
    this.persist();
  }

  public async getBiometricCredentials(userId: string): Promise<BiometricCredential[]> {
    return this.data.biometricCredentials.filter((c) => c.userId === userId);
  }

  public async getBiometricCredentialById(credentialId: string): Promise<BiometricCredential | null> {
    if (!credentialId || typeof credentialId !== "string") return null;
    const normalizeCred = (id: string) =>
      id.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const targetNorm = normalizeCred(credentialId);
    return (
      this.data.biometricCredentials.find(
        (c) => c.credentialId === credentialId || normalizeCred(c.credentialId) === targetNorm
      ) || null
    );
  }

  public async setBiometricEnabled(userId: string, enabled: boolean): Promise<boolean> {
    const user = this.data.users.find((u) => u.id === userId);
    if (user) {
      user.biometricEnabled = enabled;
      user.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  public async isBiometricEnabled(userId: string): Promise<boolean> {
    const user = this.data.users.find((u) => u.id === userId);
    return user ? user.biometricEnabled : false;
  }

  public async getUserById(id: string): Promise<StoredUser | null> {
    return this.data.users.find((u) => u.id === id) || null;
  }

  public getUserByIdSync(id: string): StoredUser | null {
    return this.data.users.find((u) => u.id === id) || null;
  }

  public async getUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email === normalized) || null;
  }

  public async revokeAllSessions(userId: string): Promise<void> {
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.persist();
  }

  public async revokeOtherSessions(userId: string, keepToken?: string): Promise<number> {
    const before = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter(
      (s) => s.userId !== userId || (keepToken && s.token === keepToken)
    );
    const removed = before - this.data.sessions.length;
    if (removed > 0) {
      this.persist();
    }
    return removed;
  }

  public revokeSession(token: string): boolean {
    const prevLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    if (this.data.sessions.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public async updateUserProfile(
    userId: string,
    updates: { name?: string; preferredCurrency?: string; username?: string; avatarUrl?: string }
  ): Promise<StoredUser | null> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return null;

    if (updates.name && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.username && updates.username.trim()) {
      const cleanUsername = updates.username.trim().toLowerCase();
      // Ensure unique username
      const existing = this.data.users.find(
        (u) => u.id !== userId && u.username?.toLowerCase() === cleanUsername
      );
      if (existing) {
        throw new Error("El nombre de usuario ya está en uso por otra cuenta.");
      }
      user.username = cleanUsername;
    }
    if (updates.preferredCurrency) {
      user.preferredCurrency = updates.preferredCurrency;
    }
    if (updates.avatarUrl !== undefined) {
      user.avatarUrl = updates.avatarUrl;
    }
    user.updatedAt = new Date().toISOString();
    this.persist();
    return user;
  }
}

// Singleton server instance shared across Next.js route bundles
const globalForAuthStore = globalThis as unknown as { __numaAuthStore?: AuthStore };
export const authStore = globalForAuthStore.__numaAuthStore || new AuthStore();
if (process.env.NODE_ENV !== "test") {
  globalForAuthStore.__numaAuthStore = authStore;
}
