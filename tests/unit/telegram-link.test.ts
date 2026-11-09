import { describe, it, expect, beforeEach } from "vitest";
import { TelegramLinkManager } from "@/lib/telegram/link";

describe("Telegram Account Linking Manager", () => {
  let linkManager: TelegramLinkManager;

  beforeEach(() => {
    linkManager = new TelegramLinkManager();
  });

  it("generates an expiring token for account linking", () => {
    const token = linkManager.createLinkToken("user-1", 15); // 15 mins
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(16);

    const info = linkManager.verifyToken(token);
    expect(info).not.toBeNull();
    expect(info?.userId).toBe("user-1");
  });

  it("links account with telegram chat id and consumes the one-time token", () => {
    const token = linkManager.createLinkToken("user-1", 15);
    const linkResult = linkManager.linkUserWithChat(token, "chat-882190", "tenant_a_tg");

    expect(linkResult.success).toBe(true);
    expect(linkResult.userId).toBe("user-1");

    // Reusing the token should fail
    const reuse = linkManager.linkUserWithChat(token, "chat-attacker", "evil");
    expect(reuse.success).toBe(false);

    // Finding user by chat ID works
    const foundUserId = linkManager.getUserIdByChatId("chat-882190");
    expect(foundUserId).toBe("user-1");
  });

  it("rejects expired tokens", () => {
    const token = linkManager.createLinkToken("user-2", -1); // expired in past
    const info = linkManager.verifyToken(token);
    expect(info).toBeNull();
  });
});
