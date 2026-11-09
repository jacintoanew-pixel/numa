/**
 * Decimal-Safe Financial Calculation Engine
 * 
 * Strict integer-cents arithmetic to eliminate IEEE-754 floating-point drift.
 * Never uses raw JS floating operations (+, -, *) for financial totals or balances.
 */

export interface FinancialMovement {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string | number;
  accountId: string;
  toAccountId?: string;
}

export interface CashflowResult {
  totalIncome: string;
  totalExpenses: string;
  netSavings: string;
  savingsRatePct: number;
}

export interface BudgetStatus {
  limit: string;
  spent: string;
  remaining: string;
  percentageConsumed: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export interface SavingsProgress {
  target: string;
  current: string;
  remaining: string;
  percentage: number;
  isCompleted: boolean;
}

export interface PeriodComparison {
  percentage: number;
  direction: "up" | "down" | "flat";
}

/**
 * Converts dollar amounts (string or number) to integer cents.
 */
export function toCents(amount: string | number): number {
  if (typeof amount === "number") {
    return Math.round(amount * 100);
  }
  const str = String(amount).trim();
  if (!str) return 0;
  return Math.round(parseFloat(str) * 100);
}

/**
 * Converts integer cents back to formatted decimal string with 2 decimal digits.
 */
export function fromCents(cents: number): string {
  const isNegative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${isNegative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Exact addition of two monetary amounts.
 */
export function addAmounts(a: string | number, b: string | number): string {
  return fromCents(toCents(a) + toCents(b));
}

/**
 * Exact subtraction of two monetary amounts (a - b).
 */
export function subtractAmounts(a: string | number, b: string | number): string {
  return fromCents(toCents(a) - toCents(b));
}

/**
 * Derives the exact account balance from an opening balance and a series of movements.
 * - income into account: credits (+)
 * - expense from account: debits (-)
 * - outgoing transfer (accountId === account): debits (-)
 * - incoming transfer (toAccountId === account): credits (+)
 */
export function calculateAccountBalance(
  accountId: string,
  openingBalance: string | number,
  movements: FinancialMovement[]
): string {
  let cents = toCents(openingBalance);

  for (const m of movements) {
    const moveCents = toCents(m.amount);
    if (m.type === "income" && m.accountId === accountId) {
      cents += moveCents;
    } else if (m.type === "expense" && m.accountId === accountId) {
      cents -= moveCents;
    } else if (m.type === "transfer") {
      if (m.accountId === accountId) {
        cents -= moveCents; // outgoing debit
      }
      if (m.toAccountId === accountId) {
        cents += moveCents; // incoming credit
      }
    }
  }

  return fromCents(cents);
}

/**
 * Consolidates income, expenses, and net savings.
 * Transfers are strictly excluded from income and expenses to avoid double-counting.
 */
export function calculateConsolidatedCashflow(movements: FinancialMovement[]): CashflowResult {
  let incomeCents = 0;
  let expensesCents = 0;

  for (const m of movements) {
    if (m.type === "income") {
      incomeCents += toCents(m.amount);
    } else if (m.type === "expense") {
      expensesCents += toCents(m.amount);
    }
    // transfers are intentionally skipped
  }

  const savingsCents = incomeCents - expensesCents;
  const savingsRatePct =
    incomeCents > 0
      ? Number(((savingsCents / incomeCents) * 100).toFixed(2))
      : 0;

  return {
    totalIncome: fromCents(incomeCents),
    totalExpenses: fromCents(expensesCents),
    netSavings: fromCents(savingsCents),
    savingsRatePct,
  };
}

/**
 * Computes budget status, remaining funds, and alert thresholds.
 */
export function calculateBudgetStatus(
  limit: string | number,
  spent: string | number,
  warningThreshold: number = 0.85
): BudgetStatus {
  const limitCents = toCents(limit);
  const spentCents = toCents(spent);

  const percentageConsumed =
    limitCents > 0 ? Math.round((spentCents / limitCents) * 100) : 0;
  const remainingCents = Math.max(0, limitCents - spentCents);
  const isWarning =
    limitCents > 0 && spentCents / limitCents >= warningThreshold;
  const isExceeded = spentCents > limitCents;

  return {
    limit: fromCents(limitCents),
    spent: fromCents(spentCents),
    remaining: fromCents(remainingCents),
    percentageConsumed,
    isWarning,
    isExceeded,
  };
}

/**
 * Computes savings goal progress and completion state.
 */
export function calculateSavingsProgress(
  target: string | number,
  current: string | number
): SavingsProgress {
  const targetCents = toCents(target);
  const currentCents = toCents(current);

  const percentage =
    targetCents > 0
      ? Math.min(100, Math.round((currentCents / targetCents) * 100))
      : 0;
  const remainingCents = Math.max(0, targetCents - currentCents);
  const isCompleted = currentCents >= targetCents;

  return {
    target: fromCents(targetCents),
    current: fromCents(currentCents),
    remaining: fromCents(remainingCents),
    percentage,
    isCompleted,
  };
}

/**
 * Compares current vs previous period metric (e.g. expenses this month vs last month).
 */
export function calculatePeriodComparison(
  current: string | number,
  previous: string | number
): PeriodComparison {
  const currCents = toCents(current);
  const prevCents = toCents(previous);

  if (prevCents === 0) {
    return {
      percentage: currCents > 0 ? 100 : 0,
      direction: currCents > 0 ? "up" : "flat",
    };
  }

  const delta = currCents - prevCents;
  const percentage = Number(((delta / prevCents) * 100).toFixed(2));
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return {
    percentage,
    direction,
  };
}
