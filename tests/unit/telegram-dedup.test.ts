import { describe, it, expect, beforeEach } from "vitest";
import { UpdateDeduplicator } from "@/lib/telegram/dedup";

describe("Telegram Update Deduplication (Idempotency)", () => {
  let dedup: UpdateDeduplicator;

  beforeEach(() => {
    dedup = new UpdateDeduplicator();
  });

  it("permits an update_id on first arrival and records it", async () => {
    const updateId = "upd-100293";
    const alreadyProcessed = await dedup.isProcessed(updateId);
    expect(alreadyProcessed).toBe(false);

    await dedup.markProcessed(updateId);
    const checkAfter = await dedup.isProcessed(updateId);
    expect(checkAfter).toBe(true);
  });

  it("identifies duplicate updates arriving repeatedly", async () => {
    const updateId = "upd-dup-999";
    await dedup.markProcessed(updateId);

    // Second delivery of same webhook event
    const isDuplicate = await dedup.isProcessed(updateId);
    expect(isDuplicate).toBe(true);
  });
});
