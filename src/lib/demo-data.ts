/**
 * Realistic demonstration dataset for Finlab Financial Dashboard
 * All demo records are explicitly identified with `isDemo: true`.
 */

export interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "credit" | "savings" | "yappy" | "card" | "paypal" | string;
  balance: number;
  currency: string;
  accountNumberMasked: string;
  color: string;
  logo?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  category: string;
  date: string;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  source: "web" | "telegram" | "system";
  status: "completed" | "pending";
}

export interface Subscription {
  id: string;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  billingFrequency: "monthly" | "yearly";
  nextPaymentDate: string;
  category: string;
  status: "active" | "paused" | "cancelled";
  logoBg: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  currency: string;
  period: string;
  warningThreshold: number; // e.g. 0.85
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string;
  color: string;
}

export interface CashflowPoint {
  month: string;
  ingresos: number;
  gastos: number;
  ahorro: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export const CLEAN_DATA = {
  isDemo: false,
  user: {
    name: "Admin User",
    email: "",
    avatarUrl: "",
    preferredCurrency: "USD",
    timeZone: "America/Panama",
  },
  metrics: {
    totalBalance: 0.00,
    balanceChangePct: 0.0,
    monthlyIncome: 0.00,
    incomeChangePct: 0.0,
    monthlyExpenses: 0.00,
    expensesChangePct: 0.0,
    netSavings: 0.00,
    savingsRatePct: 0.0,
  },
  accounts: [
    {
      id: "acc-1",
      name: "Caja de Ahorros",
      type: "savings",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#0055A5",
      logo: "/banks/caja-de-ahorros.webp",
    },
    {
      id: "acc-2",
      name: "Banistmo",
      type: "bank",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#002B49",
      logo: "/banks/banistmo.png",
    },
    {
      id: "acc-3",
      name: "Yappy",
      type: "yappy",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#0072CE",
      logo: "/banks/yappy.png",
    },
    {
      id: "acc-4",
      name: "Punto Pago",
      type: "card",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#1E40AF",
      logo: "/banks/punto-pago.jpg",
    },
    {
      id: "acc-5",
      name: "PayPal",
      type: "paypal",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#003087",
      logo: "/banks/paypal.png",
    },
    {
      id: "acc-6",
      name: "Efectivo",
      type: "cash",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#10B981",
    },
  ] as Account[],
  cashflowTrends: [] as CashflowPoint[],
  categoryExpenses: [] as CategoryExpense[],
  recentTransactions: [] as Transaction[],
  subscriptions: [] as Subscription[],
  budgets: [] as Budget[],
  savingsGoals: [] as SavingsGoal[],
  aiInsight: {
    title: "Sin movimientos registrados",
    summary: "Tu sistema se encuentra limpio y listo. Agrega tus primeros ingresos, gastos o transferencias para activar los balances y métricas en tiempo real.",
    sentiment: "neutral",
    generatedAt: "2026-10-17T00:00:00Z",
  },
};

export const DEMO_DATA = {
  isDemo: false,
  user: {
    name: "Admin User",
    email: "",
    avatarUrl: "",
    preferredCurrency: "USD",
    timeZone: "America/Panama",
  },
  metrics: {
    totalBalance: 0.00,
    balanceChangePct: 0.0,
    monthlyIncome: 0.00,
    incomeChangePct: 0.0,
    monthlyExpenses: 0.00,
    expensesChangePct: 0.0,
    netSavings: 0.00,
    savingsRatePct: 0.0,
  },
  accounts: [
    {
      id: "acc-1",
      name: "Caja de Ahorros",
      type: "bank",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#0055A5",
      logo: "/banks/caja-de-ahorros.webp",
    },
    {
      id: "acc-2",
      name: "Banistmo",
      type: "bank",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#002B49",
      logo: "/banks/banistmo.png",
    },
    {
      id: "acc-3",
      name: "Yappy",
      type: "yappy",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#0072CE",
      logo: "/banks/yappy.png",
    },
    {
      id: "acc-4",
      name: "Punto Pago",
      type: "card",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#1E40AF",
      logo: "/banks/punto-pago.jpg",
    },
    {
      id: "acc-5",
      name: "PayPal",
      type: "paypal",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#003087",
      logo: "/banks/paypal.png",
    },
    {
      id: "acc-6",
      name: "Efectivo",
      type: "cash",
      balance: 0.00,
      currency: "USD",
      accountNumberMasked: "",
      color: "#10B981",
    },
  ] as Account[],
  cashflowTrends: [] as CashflowPoint[],
  categoryExpenses: [] as CategoryExpense[],
  recentTransactions: [] as Transaction[],
  subscriptions: [] as Subscription[],
  budgets: [] as Budget[],
  savingsGoals: [] as SavingsGoal[],
  aiInsight: {
    title: "Sin movimientos registrados",
    summary: "Tu sistema se encuentra limpio y listo. Agrega tus primeros ingresos, gastos o transferencias para activar los balances y métricas en tiempo real.",
    sentiment: "neutral",
    generatedAt: "2026-10-17T00:00:00Z",
  },
};
