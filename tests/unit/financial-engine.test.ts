import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  addAmounts,
  subtractAmounts,
  calculateAccountBalance,
  calculateConsolidatedCashflow,
  calculateBudgetStatus,
  calculateSavingsProgress,
  calculatePeriodComparison,
  type FinancialMovement,
} from "@/lib/finance/calculator";
import { parseLocalDate, getDaysRemainingText, formatCurrency } from "@/lib/utils";

describe("Financial Calculation Engine (Decimal-Safe)", () => {
  describe("Exact Decimal / Cents Conversion", () => {
    it("converts standard dollar strings and numbers to integer cents without floating point drift", () => {
      expect(toCents("142.30")).toBe(14230);
      expect(toCents("0.10")).toBe(10);
      expect(toCents("0.20")).toBe(20);
      expect(toCents(0.1 + 0.2)).toBe(30); // 0.1 + 0.2 = 0.30000000000000004 in JS float
      expect(toCents("-45.50")).toBe(-4550);
      expect(toCents(0)).toBe(0);
    });

    it("converts integer cents back to formatted 2-decimal string", () => {
      expect(fromCents(14230)).toBe("142.30");
      expect(fromCents(30)).toBe("0.30");
      expect(fromCents(5)).toBe("0.05");
      expect(fromCents(0)).toBe("0.00");
      expect(fromCents(-92900)).toBe("-929.00");
    });

    it("performs exact addition and subtraction without IEEE-754 drift", () => {
      expect(addAmounts("0.10", "0.20")).toBe("0.30");
      expect(addAmounts("1250.00", "400.55")).toBe("1650.55");
      expect(subtractAmounts("100.00", "0.01")).toBe("99.99");
      expect(subtractAmounts("2345.50", "142.30")).toBe("2203.20");
    });
  });

  describe("Account Balance Derivation from Opening Balance and Movements", () => {
    it("accurately derives balance by applying income, expense, and transfer movements", () => {
      const openingBalance = "1000.00";
      const movements: FinancialMovement[] = [
        { id: "1", type: "income", amount: "500.00", accountId: "acc-1" },
        { id: "2", type: "expense", amount: "150.25", accountId: "acc-1" },
        { id: "3", type: "transfer", amount: "200.00", accountId: "acc-1", toAccountId: "acc-2" }, // outgoing transfer
        { id: "4", type: "transfer", amount: "50.00", accountId: "acc-3", toAccountId: "acc-1" }, // incoming transfer
      ];

      // Expected: 1000.00 + 500.00 - 150.25 - 200.00 + 50.00 = 1199.75
      const balance = calculateAccountBalance("acc-1", openingBalance, movements);
      expect(balance).toBe("1199.75");
    });
  });

  describe("Consolidated Cashflow and Savings", () => {
    it("strictly excludes transfers from income and expenses", () => {
      const movements: FinancialMovement[] = [
        { id: "1", type: "income", amount: "4200.00", accountId: "acc-1" },
        { id: "2", type: "expense", amount: "2000.00", accountId: "acc-1" },
        { id: "3", type: "expense", amount: "345.50", accountId: "acc-2" },
        { id: "4", type: "transfer", amount: "1000.00", accountId: "acc-1", toAccountId: "acc-2" }, // INTERNAL TRANSFER
      ];

      const result = calculateConsolidatedCashflow(movements);

      expect(result.totalIncome).toBe("4200.00");
      expect(result.totalExpenses).toBe("2345.50");
      expect(result.netSavings).toBe("1854.50");
      expect(result.savingsRatePct).toBe(44.15); // (1854.50 / 4200.00) * 100
    });

    it("handles zero income gracefully without dividing by zero", () => {
      const movements: FinancialMovement[] = [
        { id: "1", type: "expense", amount: "100.00", accountId: "acc-1" },
      ];

      const result = calculateConsolidatedCashflow(movements);
      expect(result.totalIncome).toBe("0.00");
      expect(result.totalExpenses).toBe("100.00");
      expect(result.netSavings).toBe("-100.00");
      expect(result.savingsRatePct).toBe(0);
    });
  });

  describe("Budget Status and Threshold Warnings", () => {
    it("detects warning thresholds and budget overruns", () => {
      const safe = calculateBudgetStatus("500.00", "250.00", 0.8);
      expect(safe.percentageConsumed).toBe(50);
      expect(safe.remaining).toBe("250.00");
      expect(safe.isWarning).toBe(false);
      expect(safe.isExceeded).toBe(false);

      const warning = calculateBudgetStatus("500.00", "420.00", 0.8); // 84%
      expect(warning.percentageConsumed).toBe(84);
      expect(warning.remaining).toBe("80.00");
      expect(warning.isWarning).toBe(true);
      expect(warning.isExceeded).toBe(false);

      const overrun = calculateBudgetStatus("500.00", "550.00", 0.8);
      expect(overrun.percentageConsumed).toBe(110);
      expect(overrun.remaining).toBe("0.00");
      expect(overrun.isWarning).toBe(true);
      expect(overrun.isExceeded).toBe(true);
    });
  });

  describe("Savings Goal Progress", () => {
    it("computes goal progress and completion state", () => {
      const inProgress = calculateSavingsProgress("10000.00", "4500.00");
      expect(inProgress.percentage).toBe(45);
      expect(inProgress.remaining).toBe("5500.00");
      expect(inProgress.isCompleted).toBe(false);

      const completed = calculateSavingsProgress("5000.00", "5000.00");
      expect(completed.percentage).toBe(100);
      expect(completed.remaining).toBe("0.00");
      expect(completed.isCompleted).toBe(true);
    });
  });

  describe("Period Comparisons", () => {
    it("computes percentage delta between periods correctly", () => {
      // 4200 vs 4000 = +5.0%
      const incomeChange = calculatePeriodComparison("4200.00", "4000.00");
      expect(incomeChange.percentage).toBe(5);
      expect(incomeChange.direction).toBe("up");

      // 2345.50 vs 2500.00 = -6.18%
      const expenseChange = calculatePeriodComparison("2345.50", "2500.00");
      expect(expenseChange.percentage).toBe(-6.18);
      expect(expenseChange.direction).toBe("down");

      // Zero previous period: safe fallback
      const zeroPrevious = calculatePeriodComparison("100.00", "0.00");
      expect(zeroPrevious.percentage).toBe(100);
    });
  });

  describe("Timezone-Safe Date & Currency Utilities", () => {
    it("parses YYYY-MM-DD in local time without shifting back 1 day in UTC-5", () => {
      const d = parseLocalDate("2026-10-16");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(9); // October is 0-indexed month 9
      expect(d.getDate()).toBe(16);
    });

    it("calculates deterministic days remaining relative to reference date", () => {
      const ref = parseLocalDate("2026-10-16");
      expect(getDaysRemainingText("2026-10-16", ref)).toBe("Se cobra hoy");
      expect(getDaysRemainingText("2026-10-17", ref)).toBe("Mañana (1 día)");
      expect(getDaysRemainingText("2026-10-19", ref)).toBe("Faltan 3 días");
    });

    it("formats currency consistently using cached Intl.NumberFormat instances", () => {
      const first = formatCurrency(15420.75, "USD");
      const second = formatCurrency(15420.75, "USD");
      expect(first).toBe(second);
      expect(first).toContain("15");
    });
  });
});
