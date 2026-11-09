/**
 * Secure Expiring Account Linking Manager for Telegram
 * 
 * Never assumes Telegram username is proof of ownership.
 * Uses short-lived, single-use cryptographic tokens generated from the web app.
 */

import crypto from "crypto";

interface TokenRecord {
  userId: string;
  expiresAt: number;
}

export class TelegramLinkManager {
  private tokens: Map<string, TokenRecord> = new Map();
  private chatUserMap: Map<string, string> = new Map(); // chatId -> userId
  private userChatMap: Map<string, string> = new Map(); // userId -> chatId

  /**
   * Generates a single-use token valid for `expiresInMinutes` (default 15).
   */
  public createLinkToken(userId: string, expiresInMinutes: number = 15): string {
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    this.tokens.set(token, { userId, expiresAt });
    return token;
  }

  /**
   * Validates a token without consuming it.
   */
  public verifyToken(token: string): { userId: string } | null {
    const record = this.tokens.get(token);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(token);
      return null;
    }
    return { userId: record.userId };
  }

  /**
   * Links a Telegram chat ID to the authenticated user using the one-time token.
   */
  public linkUserWithChat(
    token: string,
    telegramChatId: string,
    telegramUsername?: string
  ): { success: boolean; userId?: string } {
    const info = this.verifyToken(token);
    if (!info) {
      return { success: false };
    }

    // One-time use: consume the token immediately
    this.tokens.delete(token);

    this.chatUserMap.set(telegramChatId, info.userId);
    this.userChatMap.set(info.userId, telegramChatId);

    return {
      success: true,
      userId: info.userId,
    };
  }

  public getUserIdByChatId(telegramChatId: string): string | undefined {
    return this.chatUserMap.get(telegramChatId);
  }

  public getChatIdByUserId(userId: string): string | undefined {
    return this.userChatMap.get(userId);
  }
}

export const telegramLinkManager = new TelegramLinkManager();
