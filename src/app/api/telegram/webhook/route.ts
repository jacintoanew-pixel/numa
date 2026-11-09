import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { bot, syncBotToken } from "@/lib/telegram/bot";
import { updateDeduplicator } from "@/lib/telegram/dedup";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "numa Telegram Webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    // 0. Ensure bot in-memory token is dynamically synced with vault
    syncBotToken();

    // 1. Secret token header validation
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
      const bufA = Buffer.from(headerSecret);
      const bufB = Buffer.from(webhookSecret);
      if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 2. Parse body
    const update = await req.json();
    const updateId = update?.update_id;

    if (!updateId) {
      return NextResponse.json({ error: "Missing update_id" }, { status: 400 });
    }

    // 3. Deduplication / Idempotency check
    const isDuplicate = await updateDeduplicator.isProcessed(updateId);
    if (isDuplicate) {
      // Return 200 OK immediately so Telegram knows it was handled and does not retry
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // 4. Mark processed before execution
    await updateDeduplicator.markProcessed(updateId);

    // 5. Handle update with grammY bot
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error processing Telegram webhook update:", error?.message || error);
    // Return 200 OK to prevent Telegram retry spam on application edge cases
    return NextResponse.json({ ok: true, error: "Handled error" });
  }
}
