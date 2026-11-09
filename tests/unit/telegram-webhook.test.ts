import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/telegram/webhook/route";
import { NextRequest } from "next/server";

describe("Telegram Webhook Route Handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns health check on GET", async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.service).toContain("Telegram Webhook");
  });

  it("rejects unauthorized webhook request when secret is misconfigured", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "super_secret_123";

    const req = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": "wrong_secret",
      },
      body: JSON.stringify({ update_id: 12345 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  it("handles duplicate update_id idempotently without throwing error", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 999111, message: { text: "test" } }),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(200);

    // Immediate second retry of the same update_id
    const req2 = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 999111, message: { text: "test" } }),
    });

    const res2 = await POST(req2);
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.duplicate).toBe(true);
  });
});
