import { describe, it, expect, beforeEach } from "vitest";
import { executeGeminiTool, GEMINI_TOOL_DECLARATIONS } from "@/lib/gemini/tools";
import { financialService } from "@/lib/finance/service";

describe("Gemini Function Calling Tools Engine", () => {
  const userId = "test-user-gemini";

  beforeEach(() => {
    // Seed test accounts and data
    financialService.seedAccount({
      id: "acc-main",
      userId,
      name: "Banco General",
      type: "bank",
      currentBalance: "1500.00",
      currency: "USD",
    });
  });

  it("declares required financial tools with valid schemas", () => {
    const toolNames = GEMINI_TOOL_DECLARATIONS.map((t) => t.name);
    expect(toolNames).toContain("create_transaction");
    expect(toolNames).toContain("get_spending_summary");
    expect(toolNames).toContain("compare_periods");
    expect(toolNames).toContain("get_budget_status");
    expect(toolNames).toContain("get_savings_progress");
  });

  it("executes get_spending_summary returning deterministic backend aggregates", async () => {
    // Record a test expense
    await financialService.recordTransaction(userId, {
      amount: "250.00",
      type: "expense",
      description: "Supermercado Semanal",
      accountId: "acc-main",
      date: "2026-10-31",
      source: "web",
    });

    const result = await executeGeminiTool(userId, "get_spending_summary", {
      period: "2026-10",
    });

    expect(result.success).toBe(true);
    expect(result.data.totalExpenses).toBe("250.00");
  });

  it("executes create_transaction tool with validated parameters", async () => {
    const result = await executeGeminiTool(userId, "create_transaction", {
      amount: "45.00",
      type: "expense",
      description: "Gasolina Terpel",
      accountId: "acc-main",
    });

    expect(result.success).toBe(true);
    expect(result.data.transaction.amount).toBe("45.00");
    expect(result.data.newBalance).toBe("1205.00"); // 1500 - 250 - 45 = 1205.00
  });

  it("resolves account flexibly by name/query when passed by Gemini", async () => {
    const result = await executeGeminiTool(userId, "create_transaction", {
      amount: "20.00",
      type: "income",
      description: "Abono",
      accountId: "Banco General",
    });

    expect(result.success).toBe(true);
    expect(result.data.accountName).toBe("Banco General");
    expect(result.data.newBalance).toBe("1225.00"); // 1205 + 20 = 1225.00
  });

  it("safely rejects unknown tools without crashing", async () => {
    const result = await executeGeminiTool(userId, "unauthorized_sql_exec", {
      query: "DROP TABLE users;",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Herramienta no autorizada");
  });

  it("lists all active user accounts via get_accounts_list tool", async () => {
    const result = await executeGeminiTool(userId, "get_accounts_list", {});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data.accounts)).toBe(true);
    expect(result.data.accounts.some((a: any) => a.name === "Banco General")).toBe(true);
  });

  it("returns explicit error when trying to create transaction in deleted/non-existent account", async () => {
    const result = await executeGeminiTool(userId, "create_transaction", {
      amount: "15.00",
      type: "expense",
      description: "Almuerzo",
      accountId: "Cuenta Eliminada Yappy",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("no existe o fue eliminada");
    expect(result.error).toContain("Banco General"); // lists available active accounts
  });
});
