import { describe, it, expect, beforeEach } from "vitest";
import { financialService } from "@/lib/finance/service";
import { formatAccountNotFoundError, formatTransferAccountsError } from "@/lib/telegram/bot";
import { executeGeminiTool } from "@/lib/gemini/tools";
import { GeminiFinancialAssistant } from "@/lib/gemini/client";

describe("Account Dynamic Synchronization & Robust Error Handling", () => {
  const userId = "test-user-sync-errors";

  beforeEach(() => {
    // Reset and seed initial active accounts
    const initial = serviceAccounts();
    for (const acc of initial) {
      financialService.seedAccount(acc);
    }
  });

  function serviceAccounts() {
    return [
      {
        id: "acc-bg",
        userId,
        name: "Banco General",
        type: "bank" as const,
        currentBalance: "150.00",
        currency: "USD",
      },
      {
        id: "acc-bac",
        userId,
        name: "BAC Credomatic",
        type: "bank" as const,
        currentBalance: "75.00",
        currency: "USD",
      },
      {
        id: "acc-yappy",
        userId,
        name: "Yappy",
        type: "savings" as const,
        currentBalance: "20.00",
        currency: "USD",
      },
    ];
  }

  it("Telegram Bot generates clear, polite error when querying an account that was deleted", () => {
    // Delete Yappy
    financialService.deleteAccount(userId, "acc-yappy");

    const errorMsg = formatAccountNotFoundError(userId, "yappy");
    expect(errorMsg).toContain("⚠️ *Cuenta no encontrada o eliminada*");
    expect(errorMsg).toContain('No encontramos la cuenta "*yappy*"');
    expect(errorMsg).toContain("Banco General");
    expect(errorMsg).toContain("BAC Credomatic");
    expect(errorMsg).not.toContain("Yappy"); // Yappy must not be in active accounts
    expect(errorMsg).toContain("panel web");
  });

  it("Telegram Bot generates clear error for transfers involving missing accounts", () => {
    financialService.deleteAccount(userId, "acc-yappy");

    const errorMsg = formatTransferAccountsError(userId, "yappy", "banco general", false, true);
    expect(errorMsg).toContain("⚠️ *Error en Transferencia*");
    expect(errorMsg).toContain('cuenta de origen "*yappy*" no existe o fue eliminada');
    expect(errorMsg).toContain("Banco General");
  });

  it("Gemini AI Tool creates transaction in active account and rejects deleted account with full context", async () => {
    // 1. Success on active account
    const okResult = await executeGeminiTool(userId, "create_transaction", {
      amount: "25.00",
      type: "expense",
      description: "Supermercado",
      accountId: "bac",
    });
    expect(okResult.success).toBe(true);
    expect(okResult.data.accountName).toBe("BAC Credomatic");
    expect(okResult.data.newBalance).toBe("50.00");

    // 2. Failure on deleted account (e.g. Yappy removed)
    financialService.deleteAccount(userId, "acc-yappy");
    const failResult = await executeGeminiTool(userId, "create_transaction", {
      amount: "10.00",
      type: "expense",
      description: "Café",
      accountId: "yappy",
    });
    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain('La cuenta o billetera "yappy" no existe o fue eliminada');
    expect(failResult.error).toContain("Banco General");
    expect(failResult.error).toContain("BAC Credomatic");
  });

  it("Gemini Assistant local fallback refuses to deduct money when account is removed", async () => {
    // Delete Yappy
    financialService.deleteAccount(userId, "acc-yappy");

    const assistant = new GeminiFinancialAssistant({ apiKey: "" });
    const response = await assistant.generateResponse({
      userId,
      message: "Gasté 10 con Yappy",
    });

    expect(response.source).toBe("local-fallback");
    expect(response.text).toContain("no existe o fue eliminada");
    expect(response.text).toContain("Banco General");

    // Verify Banco General balance was NOT touched
    const bg = financialService.getAccount("acc-bg");
    expect(bg?.currentBalance).toBe("150.00");
  });

  it("Dynamic Accounts API lifecycle (add, query, delete) keeps server store synchronized", () => {
    const created = financialService.addAccount(userId, {
      name: "Banisi",
      type: "bank",
      currentBalance: "500.00",
      currency: "USD",
    });

    expect(financialService.findAccountByQuery(userId, "banisi")?.id).toBe(created.id);

    financialService.deleteAccount(userId, created.id);
    expect(financialService.findAccountByQuery(userId, "banisi")).toBeUndefined();
  });
});
