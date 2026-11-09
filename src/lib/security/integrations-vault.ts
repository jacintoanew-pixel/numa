/**
 * Integrations Security Vault
 * 
 * AES-256-GCM encryption for external integration credentials:
 * - Telegram Bot Token
 * - Telegram Allowed User ID (strict whitelist authorization)
 * - Google Gemini API Key
 * 
 * Features:
 * - AES-256-GCM encryption with authenticated tags and random IVs for on-disk persistence
 * - Zero plaintext leakage to browser clients (returns only masked strings)
 * - Server-side validation against Telegram and Google APIs before persistence
 * - Runtime synchronization with process.env and dynamic Bot/Gemini rehydration
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VAULT_FILE = path.join(process.cwd(), "data", "integrations_vault.json");

interface VaultData {
  telegramTokenEncrypted?: string;
  telegramAllowedUserIdEncrypted?: string;
  telegramBotUsername?: string;
  telegramBotName?: string;
  telegramVerifiedAt?: string;
  geminiApiKeyEncrypted?: string;
  geminiVerifiedAt?: string;
  googleClientIdEncrypted?: string;
  googleVerifiedAt?: string;
  appleClientIdEncrypted?: string;
  appleVerifiedAt?: string;
}

function getVaultKey(): Buffer {
  const secret = process.env.APP_SECRET || process.env.VAULT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ERROR CRÍTICO DE SEGURIDAD: Debe configurar VAULT_SECRET o APP_SECRET en las variables de entorno de producción."
      );
    }
    return crypto.scryptSync(
      "vx-finlab-dev-vault-secret-do-not-use-in-production",
      "vx-integrations-salt-2026",
      32
    );
  }
  return crypto.scryptSync(secret, "vx-integrations-salt-2026", 32);
}

export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const key = getVaultKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(cipherText?: string): string {
  if (!cipherText || !cipherText.includes(":")) return "";
  try {
    const [ivHex, tagHex, dataHex] = cipherText.split(":");
    if (!ivHex || !tagHex || !dataHex) return "";
    const key = getVaultKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    console.error("Vault decryption error:", err);
    return "";
  }
}

export function maskString(str?: string, visiblePrefix = 4, visibleSuffix = 4): string {
  if (!str) return "";
  const s = str.trim();
  if (s.length <= visiblePrefix + visibleSuffix) {
    return "••••••••";
  }
  const prefix = s.slice(0, visiblePrefix);
  const suffix = s.slice(-visibleSuffix);
  return `${prefix}${"•".repeat(Math.min(18, s.length - visiblePrefix - visibleSuffix))}${suffix}`;
}

export class IntegrationsVault {
  private static instance: IntegrationsVault;
  private vaultData: VaultData = {};
  private inMemory: boolean;

  private constructor() {
    this.inMemory =
      process.env.VITEST === "true" ||
      Boolean(process.env.VITEST) ||
      process.env.NODE_ENV === "test";
    this.loadVault();
  }

  public static getInstance(): IntegrationsVault {
    if (!IntegrationsVault.instance) {
      IntegrationsVault.instance = new IntegrationsVault();
    }
    return IntegrationsVault.instance;
  }

  private loadVault() {
    if (this.inMemory) return;
    try {
      if (fs.existsSync(VAULT_FILE)) {
        const raw = fs.readFileSync(VAULT_FILE, "utf-8");
        this.vaultData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn("Could not load integrations vault file:", err);
      this.vaultData = {};
    }

    // Hydrate process.env if present in vault and not already set
    const tgToken = decryptSecret(this.vaultData.telegramTokenEncrypted);
    if (tgToken && !process.env.TELEGRAM_BOT_TOKEN) {
      process.env.TELEGRAM_BOT_TOKEN = tgToken;
    }

    const tgUserId = decryptSecret(this.vaultData.telegramAllowedUserIdEncrypted);
    if (tgUserId && !process.env.TELEGRAM_ALLOWED_USER_ID) {
      process.env.TELEGRAM_ALLOWED_USER_ID = tgUserId;
    }

    const geminiKey = decryptSecret(this.vaultData.geminiApiKeyEncrypted);
    if (geminiKey && !process.env.GEMINI_API_KEY) {
      process.env.GEMINI_API_KEY = geminiKey;
    }
  }

  private saveVault() {
    if (this.inMemory) return;
    try {
      const dir = path.dirname(VAULT_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(VAULT_FILE, JSON.stringify(this.vaultData, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write integrations vault file:", err);
    }
  }

  public getTelegramToken(): string {
    if (!this.inMemory && !this.vaultData.telegramTokenEncrypted) {
      this.loadVault();
    }
    return (
      decryptSecret(this.vaultData.telegramTokenEncrypted) ||
      process.env.TELEGRAM_BOT_TOKEN ||
      ""
    );
  }

  public getTelegramAllowedUserId(): string {
    if (!this.inMemory && !this.vaultData.telegramAllowedUserIdEncrypted) {
      this.loadVault();
    }
    return (
      decryptSecret(this.vaultData.telegramAllowedUserIdEncrypted) ||
      process.env.TELEGRAM_ALLOWED_USER_ID ||
      ""
    );
  }

  public getGeminiApiKey(): string {
    if (!this.inMemory && !this.vaultData.geminiApiKeyEncrypted) {
      this.loadVault();
    }
    return (
      decryptSecret(this.vaultData.geminiApiKeyEncrypted) ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ""
    );
  }

  public getGoogleClientId(): string {
    return (
      decryptSecret(this.vaultData.googleClientIdEncrypted) ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      ""
    );
  }

  public getAppleClientId(): string {
    return (
      decryptSecret(this.vaultData.appleClientIdEncrypted) ||
      process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ||
      process.env.APPLE_CLIENT_ID ||
      ""
    );
  }

  public getPublicStatus() {
    this.loadVault();
    const tgToken = this.getTelegramToken();
    const tgUserId = this.getTelegramAllowedUserId();
    const geminiKey = this.getGeminiApiKey();
    const googleId = this.getGoogleClientId();
    const appleId = this.getAppleClientId();

    return {
      telegram: {
        isConfigured: Boolean(tgToken && tgToken.length > 10),
        isSecuredWithUserId: Boolean(tgUserId && tgUserId.length > 0),
        maskedToken: maskString(tgToken, 6, 4),
        maskedUserId: maskString(tgUserId, 2, 2),
        allowedUserId: tgUserId ? maskString(tgUserId, 2, 2) : undefined,
        botUsername: this.vaultData.telegramBotUsername,
        botName: this.vaultData.telegramBotName,
        verifiedAt: this.vaultData.telegramVerifiedAt,
      },
      gemini: {
        isConfigured: Boolean(geminiKey && geminiKey.length > 15),
        maskedApiKey: maskString(geminiKey, 6, 4),
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        verifiedAt: this.vaultData.geminiVerifiedAt,
      },
      google: {
        isConfigured: Boolean(googleId && googleId.length > 10),
        clientId: googleId,
        maskedClientId: maskString(googleId, 8, 6),
        verifiedAt: this.vaultData.googleVerifiedAt,
      },
      apple: {
        isConfigured: Boolean(appleId && appleId.length > 5),
        clientId: appleId,
        maskedClientId: maskString(appleId, 4, 4),
        verifiedAt: this.vaultData.appleVerifiedAt,
      },
    };
  }

  /**
   * Validates Telegram bot token by querying the Telegram Bot API (`getMe`),
   * enforces user ID whitelist, encrypts and persists credentials.
   */
  public async configureTelegram(token: string, allowedUserId: string): Promise<{
    botUsername: string;
    botName: string;
    allowedUserId: string;
  }> {
    const cleanToken = token.trim();
    const cleanUserId = allowedUserId.trim();

    if (!cleanToken) {
      throw new Error("El Token del Bot de Telegram es obligatorio.");
    }
    if (!cleanUserId) {
      throw new Error("El ID de Usuario de Telegram es obligatorio para restringir el acceso.");
    }
    if (!/^\d+$/.test(cleanUserId)) {
      throw new Error("El ID de Usuario de Telegram debe ser numérico (ej. 591234567).");
    }

    // Live verification with Telegram Bot API
    let botInfo: { id: number; first_name: string; username?: string };
    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.ok || !data.result) {
        throw new Error(data.description || "Token no reconocido por Telegram.");
      }
      botInfo = data.result;
    } catch (err: any) {
      throw new Error(`Fallo en verificación con Telegram: ${err?.message || err}`);
    }

    // Automatically register webhook with Telegram Bot API
    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://numa.example.com";
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";

    try {
      let setWebhookUrl = `https://api.telegram.org/bot${cleanToken}/setWebhook?url=${encodeURIComponent(
        webhookUrl
      )}&drop_pending_updates=false`;
      if (webhookSecret) {
        setWebhookUrl += `&secret_token=${encodeURIComponent(webhookSecret)}`;
      }
      const hookRes = await fetch(setWebhookUrl);
      const hookData = await hookRes.json();
      if (!hookData.ok) {
        console.warn("Telegram setWebhook warning:", hookData.description);
      }
    } catch (whErr: any) {
      console.warn("Could not register Telegram webhook automatically:", whErr?.message || whErr);
    }

    // Encrypt and persist
    this.vaultData.telegramTokenEncrypted = encryptSecret(cleanToken);
    this.vaultData.telegramAllowedUserIdEncrypted = encryptSecret(cleanUserId);
    this.vaultData.telegramBotUsername = botInfo.username || "TelegramBot";
    this.vaultData.telegramBotName = botInfo.first_name || "Finanzas Bot";
    this.vaultData.telegramVerifiedAt = new Date().toISOString();

    this.saveVault();

    // Sync process.env
    process.env.TELEGRAM_BOT_TOKEN = cleanToken;
    process.env.TELEGRAM_ALLOWED_USER_ID = cleanUserId;

    // Dynamically synchronize in-memory grammY bot instance
    try {
      const { syncBotToken } = require("../telegram/bot");
      syncBotToken();
    } catch {
      // Ignore in mock/test environments
    }

    return {
      botUsername: this.vaultData.telegramBotUsername,
      botName: this.vaultData.telegramBotName,
      allowedUserId: cleanUserId,
    };
  }

  /**
   * Validates Gemini API key with Google Gemini API, encrypts and persists.
   */
  public async configureGemini(apiKey: string): Promise<{ ok: boolean; model: string }> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      throw new Error("La API Key de Google Gemini es obligatoria.");
    }

    // Live test with GoogleGenAI SDK
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "ping",
      });
    } catch (err: any) {
      throw new Error(`La API Key de Gemini es inválida o fue rechazada por Google: ${err?.message || err}`);
    }

    this.vaultData.geminiApiKeyEncrypted = encryptSecret(cleanKey);
    this.vaultData.geminiVerifiedAt = new Date().toISOString();

    this.saveVault();

    // Sync process.env
    process.env.GEMINI_API_KEY = cleanKey;
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

    return {
      ok: true,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    };
  }

  /**
   * Disconnects / removes Telegram bot configuration and security whitelist.
   */
  public disconnectTelegram(): void {
    const token = this.getTelegramToken();
    if (token && !this.inMemory) {
      fetch(`https://api.telegram.org/bot${token}/deleteWebhook`).catch(() => {});
    }

    delete this.vaultData.telegramTokenEncrypted;
    delete this.vaultData.telegramAllowedUserIdEncrypted;
    delete this.vaultData.telegramBotUsername;
    delete this.vaultData.telegramBotName;
    delete this.vaultData.telegramVerifiedAt;
    this.saveVault();

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ALLOWED_USER_ID;

    try {
      const { syncBotToken } = require("../telegram/bot");
      syncBotToken();
    } catch {
      // Ignore
    }
  }

  /**
   * Disconnects / removes Google Gemini API Key.
   */
  public disconnectGemini(): void {
    delete this.vaultData.geminiApiKeyEncrypted;
    delete this.vaultData.geminiVerifiedAt;
    this.saveVault();

    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  }

  /**
   * Configures and encrypts Google OAuth 2.0 Client ID for official Google Sign-In.
   */
  public configureGoogleOAuth(clientId: string): { clientId: string } {
    const cleanId = clientId.trim();
    if (!cleanId) {
      throw new Error("El Google Client ID es obligatorio.");
    }
    this.vaultData.googleClientIdEncrypted = encryptSecret(cleanId);
    this.vaultData.googleVerifiedAt = new Date().toISOString();
    this.saveVault();

    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = cleanId;
    process.env.GOOGLE_CLIENT_ID = cleanId;

    return { clientId: cleanId };
  }

  /**
   * Configures and encrypts Apple Services ID for official Sign in with Apple.
   */
  public configureAppleOAuth(clientId: string): { clientId: string } {
    const cleanId = clientId.trim();
    if (!cleanId) {
      throw new Error("El Apple Client ID / Service ID es obligatorio.");
    }
    this.vaultData.appleClientIdEncrypted = encryptSecret(cleanId);
    this.vaultData.appleVerifiedAt = new Date().toISOString();
    this.saveVault();

    process.env.NEXT_PUBLIC_APPLE_CLIENT_ID = cleanId;
    process.env.APPLE_CLIENT_ID = cleanId;

    return { clientId: cleanId };
  }

  public disconnectGoogleOAuth(): void {
    delete this.vaultData.googleClientIdEncrypted;
    delete this.vaultData.googleVerifiedAt;
    this.saveVault();

    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
  }

  public disconnectAppleOAuth(): void {
    delete this.vaultData.appleClientIdEncrypted;
    delete this.vaultData.appleVerifiedAt;
    this.saveVault();

    delete process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
    delete process.env.APPLE_CLIENT_ID;
  }
}

export const integrationsVault = IntegrationsVault.getInstance();
