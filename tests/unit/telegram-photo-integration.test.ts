import { describe, it, expect, beforeEach } from "vitest";
import { bot } from "@/lib/telegram/bot";
import { financialService } from "@/lib/finance/service";
import { integrationsVault } from "@/lib/security/integrations-vault";

describe("Telegram Bot End-to-End Capabilities (Wallets, Goals & Photo OCR)", () => {
  const userId = "usr_master_01";

  beforeEach(() => {
    integrationsVault.disconnectTelegram();
    financialService.resetToDefaults();

    // Mock outgoing Telegram Bot API calls so tests don't reach api.telegram.org
    bot.api.config.use((prev, method, payload, signal) => {
      if (method === "sendMessage" || method === "editMessageText") {
        return Promise.resolve({ ok: true, result: { message_id: 100 } } as any);
      }
      if (method === "getFile") {
        return Promise.resolve({ ok: true, result: { file_id: "high_res_photo_id", file_path: "photos/mock.jpg" } } as any);
      }
      return prev(method, payload, signal);
    });

    financialService.seedAccount({
      id: "acc-3",
      userId,
      name: "Yappy — Banco General",
      type: "savings",
      currentBalance: "1280.25",
      currency: "USD",
    });

    financialService.seedAccount({
      id: "acc-2",
      userId,
      name: "Banistmo — Cuenta Corriente",
      type: "bank",
      currentBalance: "4120.50",
      currency: "USD",
    });

    financialService.seedAccount({
      id: "acc-6",
      userId,
      name: "Efectivo — Billetera Física",
      type: "cash",
      currentBalance: "340.00",
      currency: "USD",
    });
  });

  it("handles adding money to any wallet: 'Agrega $50 a Yappy'", async () => {
    const update = {
      update_id: 2001,
      message: {
        message_id: 1,
        chat: { id: 12345678, type: "private" },
        from: { id: 12345678, first_name: "Admin", username: "adminsanto" },
        text: "Agrega $50 a Yappy",
        date: Math.floor(Date.now() / 1000),
      },
    };

    await bot.handleUpdate(update as any);

    // Initial 1280.25 + 50.00 = 1330.25
    const yappy = financialService.getAccount("acc-3");
    expect(yappy?.currentBalance).toBe("1330.25");
  });

  it("handles removing money from a specific wallet: 'Quita $20 de Efectivo para compra de pan'", async () => {
    const update = {
      update_id: 2002,
      message: {
        message_id: 2,
        chat: { id: 12345678, type: "private" },
        from: { id: 12345678, first_name: "Admin" },
        text: "Quita $20 de Efectivo para compra de pan",
        date: Math.floor(Date.now() / 1000),
      },
    };

    await bot.handleUpdate(update as any);

    // Initial 340.00 - 20.00 = 320.00
    const efectivo = financialService.getAccount("acc-6");
    expect(efectivo?.currentBalance).toBe("320.00");
  });

  it("handles transfers between wallets: 'Transfiere $50 de Banistmo a Yappy'", async () => {
    const update = {
      update_id: 2003,
      message: {
        message_id: 3,
        chat: { id: 12345678, type: "private" },
        from: { id: 12345678, first_name: "Admin" },
        text: "Transfiere $50 de Banistmo a Yappy",
        date: Math.floor(Date.now() / 1000),
      },
    };

    await bot.handleUpdate(update as any);

    // Banistmo: 4120.50 - 50 = 4070.50
    expect(financialService.getAccount("acc-2")?.currentBalance).toBe("4070.50");
    // Yappy: 1280.25 + 50 = 1330.25
    expect(financialService.getAccount("acc-3")?.currentBalance).toBe("1330.25");
  });

  it("creates a savings goal: 'Crear meta: MacBook M4 $2500 para Diciembre 2027'", async () => {
    const update = {
      update_id: 2004,
      message: {
        message_id: 4,
        chat: { id: 12345678, type: "private" },
        from: { id: 12345678, first_name: "Admin" },
        text: "Crear meta: MacBook M4 $2500 para Diciembre 2027",
        date: Math.floor(Date.now() / 1000),
      },
    };

    await bot.handleUpdate(update as any);

    const goal = financialService.findGoalByQuery(userId, "MacBook M4");
    expect(goal).toBeDefined();
    expect(goal?.name).toBe("MacBook M4");
    expect(goal?.targetAmount).toBe("2500.00");
  });

  it("deposits into savings goal: 'Aportar $100 a meta MacBook M4 desde Banistmo'", async () => {
    financialService.createGoal(userId, { name: "MacBook M4", targetAmount: "2500.00" });

    const update = {
      update_id: 2005,
      message: {
        message_id: 5,
        chat: { id: 12345678, type: "private" },
        from: { id: 12345678, first_name: "Admin" },
        text: "Aportar $100 a meta MacBook M4 desde Banistmo",
        date: Math.floor(Date.now() / 1000),
      },
    };

    await bot.handleUpdate(update as any);

    const goal = financialService.findGoalByQuery(userId, "MacBook M4");
    expect(goal?.currentAmount).toBe("100.00");
    // Banistmo debited 100: 4120.50 - 100 = 4020.50
    expect(financialService.getAccount("acc-2")?.currentBalance).toBe("4020.50");
  });

  it("processes a photo invoice and records an expense 'compra de pan -20$'", async () => {
    const initialTxsCount = financialService.getTransactionsByUser(userId).length;

    const photoUpdate = {
      update_id: 2006,
      message: {
        message_id: 6,
        chat: { id: 12345678, type: "private" },
        from: { id: 12345678, first_name: "Admin" },
        caption: "compra de pan $20 con Efectivo",
        photo: [
          { file_id: "thumb_id", width: 100, height: 100 },
          { file_id: "high_res_photo_id", width: 800, height: 800 },
        ],
        date: Math.floor(Date.now() / 1000),
      },
    };

    await bot.handleUpdate(photoUpdate as any);

    const txs = financialService.getTransactionsByUser(userId);
    expect(txs.length).toBe(initialTxsCount + 1);

    const latest = txs[0];
    expect(latest.type).toBe("expense");
    expect(latest.amount).toBe("20.00");
    expect(latest.description.toLowerCase()).toContain("pan");
    expect(latest.source).toBe("telegram");
  });
});
