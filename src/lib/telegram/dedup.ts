/**
 * Telegram Update Deduplication Service (Idempotency)
 * 
 * Ensures that Telegram webhook retries do not result in duplicate transactions.
 * Backed by in-memory set and PostgreSQL telegram_updates table.
 */

import { db, schema } from "../database";
import { eq } from "drizzle-orm";

export class UpdateDeduplicator {
  private inMemoryCache: Set<string> = new Set();

  public async isProcessed(updateId: string | number): Promise<boolean> {
    const id = String(updateId);

    // Fast in-memory check
    if (this.inMemoryCache.has(id)) {
      return true;
    }

    // Database check if DB is configured
    if (db) {
      try {
        const found = await db
          .select({ id: schema.telegramUpdates.id })
          .from(schema.telegramUpdates)
          .where(eq(schema.telegramUpdates.id, id))
          .limit(1);
        if (found.length > 0) {
          this.inMemoryCache.add(id);
          return true;
        }
      } catch {
        // Fallback to cache if DB offline
      }
    }

    return false;
  }

  public async markProcessed(updateId: string | number): Promise<void> {
    const id = String(updateId);
    this.inMemoryCache.add(id);

    // Keep cache bounded to 10,000 items
    if (this.inMemoryCache.size > 10000) {
      const first = this.inMemoryCache.values().next().value;
      if (first) this.inMemoryCache.delete(first);
    }

    // Persist in DB if DB available
    if (db) {
      try {
        await db
          .insert(schema.telegramUpdates)
          .values({ id })
          .onConflictDoNothing();
      } catch {
        // Silent catch for resilience
      }
    }
  }
}

export const updateDeduplicator = new UpdateDeduplicator();
