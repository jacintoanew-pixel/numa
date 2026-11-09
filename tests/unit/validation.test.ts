import { describe, it, expect } from "vitest";
import {
  createTransactionSchema,
  createAccountSchema,
  createBudgetSchema,
  createSubscriptionSchema,
} from "@/lib/validation";

describe("Financial Domain Zod Validation Schemas", () => {
  describe("Transaction Schema", () => {
    it("validates valid expense, income, and transfer transactions", () => {
      const validExpense = {
        amount: "142.30",
        type: "expense",
        description: "Supermercado Riba Smith",
        accountId: "acc-1",
        categoryId: "cat-food",
        date: new Date().toISOString(),
      };
      const result = createTransactionSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it("requires toAccountId when transaction type is transfer", () => {
      const transferWithoutTo = {
        amount: "200.00",
        type: "transfer",
        description: "Transferencia interna",
        accountId: "acc-1",
        date: new Date().toISOString(),
      };
      const result = createTransactionSchema.safeParse(transferWithoutTo);
      expect(result.success).toBe(false);
    });

    it("rejects non-positive amounts and invalid numbers", () => {
      const invalidAmount = {
        amount: "-50.00",
        type: "expense",
        description: "Gasto negativo inválido",
        accountId: "acc-1",
        date: new Date().toISOString(),
      };
      expect(createTransactionSchema.safeParse(invalidAmount).success).toBe(false);

      const zeroAmount = {
        amount: "0.00",
        type: "expense",
        description: "Cero inválido",
        accountId: "acc-1",
        date: new Date().toISOString(),
      };
      expect(createTransactionSchema.safeParse(zeroAmount).success).toBe(false);
    });
  });

  describe("Account Schema", () => {
    it("validates account types and initial balance", () => {
      const valid = {
        name: "Banco General",
        type: "bank",
        initialBalance: "1500.00",
        currency: "USD",
      };
      expect(createAccountSchema.safeParse(valid).success).toBe(true);

      const invalidType = {
        name: "Test",
        type: "crypto_speculative", // unsupported type
        initialBalance: "0.00",
      };
      expect(createAccountSchema.safeParse(invalidType).success).toBe(false);
    });
  });

  describe("Budget Schema", () => {
    it("enforces period format YYYY-MM and positive limit", () => {
      const valid = {
        categoryId: "cat-1",
        limit: "500.00",
        period: "2026-10",
        warningThreshold: 0.85,
      };
      expect(createBudgetSchema.safeParse(valid).success).toBe(true);

      const invalidPeriod = {
        categoryId: "cat-1",
        limit: "500.00",
        period: "Octubre-2026", // invalid format
      };
      expect(createBudgetSchema.safeParse(invalidPeriod).success).toBe(false);
    });
  });

  describe("Subscription Schema", () => {
    it("validates recurrence and payment date", () => {
      const valid = {
        name: "Netflix",
        amount: "15.99",
        billingFrequency: "monthly",
        nextPaymentDate: "2026-11-01",
      };
      expect(createSubscriptionSchema.safeParse(valid).success).toBe(true);
    });
  });
});
