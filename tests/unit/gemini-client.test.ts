import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiFinancialAssistant } from "@/lib/gemini/client";
import { financialService } from "@/lib/finance/service";

describe("Gemini Financial Assistant Client", () => {
  const userId = "test-user-assistant";

  beforeEach(() => {
    financialService.seedAccount({
      id: "acc-bank",
      userId,
      name: "Banco General",
      type: "bank",
      currentBalance: "2000.00",
      currency: "USD",
    });
  });

  it("handles offline fallback gracefully when GEMINI_API_KEY is unset", async () => {
    const assistant = new GeminiFinancialAssistant({ apiKey: "" });

    const response = await assistant.generateResponse({
      userId,
      message: "¿Cuánto tengo en mi cuenta bancaria?",
    });

    expect(response.text).toBeDefined();
    expect(response.text.length).toBeGreaterThan(10);
    expect(response.source).toBe("local-fallback");
  });

  it("handles local transaction registration via fallback parser", async () => {
    const assistant = new GeminiFinancialAssistant({ apiKey: "" });

    const response = await assistant.generateResponse({
      userId,
      message: "Gasto 50 en farmacia",
    });

    expect(response.text).toBeDefined();
    expect(response.source).toBe("local-fallback");
    // Verify account was debited
    const acc = financialService.getAccount("acc-bank");
    expect(acc?.currentBalance).toBe("1950.00");
  });

  it("handles natural 'Registra 20 dólares a yappy' targeting Yappy in fallback", async () => {
    financialService.seedAccount({
      id: "acc-yappy",
      userId,
      name: "Yappy",
      type: "savings",
      currentBalance: "0.00",
      currency: "USD",
    });

    const assistant = new GeminiFinancialAssistant({ apiKey: "" });
    const response = await assistant.generateResponse({
      userId,
      message: "Registra 20 dólares a yappy",
    });

    expect(response.source).toBe("local-fallback");
    expect(response.text).toContain("Yappy");
    expect(response.text).toContain("$20.00");

    const yappy = financialService.getAccount("acc-yappy");
    expect(yappy?.currentBalance).toBe("20.00");
  });

  it("politely informs user when an account was deleted or not found in fallback mode", async () => {
    // Delete the yappy account
    financialService.deleteAccount(userId, "acc-yappy");

    const assistant = new GeminiFinancialAssistant({ apiKey: "" });
    const response = await assistant.generateResponse({
      userId,
      message: "Registra 20 dólares a yappy",
    });

    expect(response.source).toBe("local-fallback");
    expect(response.text).toContain("no existe o fue eliminada");
    expect(response.text).toContain("Banco General"); // Available account listed
  });
});
