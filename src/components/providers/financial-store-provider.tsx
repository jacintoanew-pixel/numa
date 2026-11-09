"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";
import {
  CLEAN_DATA,
  DEMO_DATA,
  type Account,
  type Transaction,
  type Subscription,
  type Budget,
  type SavingsGoal,
  type CategoryExpense,
  type CashflowPoint,
} from "@/lib/demo-data";
import { toCents, fromCents } from "@/lib/finance/calculator";
import { NewTransactionModal } from "@/components/modals/new-transaction-modal";
import { useSecurity } from "@/components/providers/security-provider";

export interface ExtendedSubscription extends Subscription {
  isActive?: boolean;
}

interface FinancialMetrics {
  totalBalance: number;
  balanceChangePct: number;
  monthlyIncome: number;
  incomeChangePct: number;
  monthlyExpenses: number;
  expensesChangePct: number;
  netSavings: number;
  savingsRatePct: number;
}

interface FinancialStoreContextType {
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: ExtendedSubscription[];
  budgets: Budget[];
  goals: SavingsGoal[];
  metrics: FinancialMetrics;
  categoryExpenses: CategoryExpense[];
  cashflowTrends: CashflowPoint[];
  aiInsight: typeof DEMO_DATA.aiInsight;
  // Account Actions
  addAccount: (account: Omit<Account, "id"> & { id?: string }) => void;
  deleteAccount: (id: string) => void;
  editAccount: (id: string, updates: Partial<Account>) => void;
  // Actions
  addTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addSubscription: (sub: ExtendedSubscription) => void;
  toggleSubscription: (id: string) => void;
  deleteSubscription: (id: string) => void;
  saveBudget: (budget: Budget, isEdit?: boolean) => void;
  deleteBudget: (id: string) => void;
  addGoal: (goal: SavingsGoal) => void;
  depositToGoal: (goalId: string, amount: number, fromAccountId?: string) => void;
  deleteGoal: (id: string) => void;
  resetToDemoData: () => void;
  resetToCleanData: () => void;
  // Synchronization & Server State
  syncServerState: () => Promise<void>;
  // Global Modal & Toast
  openTransactionModal: (defaultType?: "expense" | "income" | "transfer") => void;
  closeTransactionModal: () => void;
  notify: (message: string) => void;
}

const STORAGE_KEY = "vx-financial-store-v5";

const CATEGORY_COLORS: Record<string, string> = {
  "Vivienda y Servicios": "#0071E3",
  "Servicios y Hogar": "#0071E3",
  "Alimentación y Super": "#2AB49E",
  "Restaurantes y Ocio": "#FF9F0A",
  "Entretenimiento y Ocio": "#FF9F0A",
  "Transporte y Auto": "#5E5CE6",
  "Suscripciones y Software": "#BF5AF2",
  "Servicios y Software": "#BF5AF2",
  "Salud y Bienestar": "#EC4899",
  "Otros": "#64D2FF",
};

const FinancialStoreContext = React.createContext<FinancialStoreContextType | undefined>(undefined);

function matchBudgetCategory(budgetCat: string, txCat: string): boolean {
  const b = budgetCat.toLowerCase().trim();
  const t = txCat.toLowerCase().trim();
  if (b === t) return true;
  if (b.includes("alimentación") && t.includes("alimentación")) return true;
  if (b.includes("transporte") && t.includes("transporte")) return true;
  if ((b.includes("entretenimiento") || b.includes("ocio")) && (t.includes("entretenimiento") || t.includes("ocio") || t.includes("restaurantes"))) return true;
  if ((b.includes("software") || b.includes("servicios")) && (t.includes("software") || t.includes("suscripciones") || t.includes("servicios"))) return true;
  return false;
}

function deduplicateUserAccounts(list: Account[], userId: string): Account[] {
  const result: Account[] = [];
  const seenIds = new Set<string>();
  let cashAccount: Account | null = null;

  for (const raw of list) {
    if (!raw || !raw.name) continue;
    const lowerName = raw.name.trim().toLowerCase();
    if (userId !== "usr_master_01" && lowerName.includes("cuenta principal")) {
      continue;
    }

    const cleaned: Account = {
      ...raw,
      accountNumberMasked:
        raw.accountNumberMasked === "•••• 0000" ? "" : raw.accountNumberMasked || "",
    };

    if (lowerName === "efectivo") {
      if (!cashAccount) {
        cashAccount = cleaned;
        result.push(cashAccount);
      } else {
        if (cleaned.balance !== 0 && cashAccount.balance === 0) {
          cashAccount.balance = cleaned.balance;
        }
        if (cleaned.id === `acc_cash_${userId}`) {
          cashAccount.id = cleaned.id;
        }
      }
      continue;
    }

    if (seenIds.has(cleaned.id)) continue;
    seenIds.add(cleaned.id);
    result.push(cleaned);
  }

  return result;
}

export function FinancialStoreProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSecurity();
  const userId = session?.id || "usr_master_01";
  const userStorageKey = `vx-financial-store-v5_${userId}`;

  const [accounts, setAccounts] = React.useState<Account[]>(CLEAN_DATA.accounts);
  const [transactions, setTransactions] = React.useState<Transaction[]>(CLEAN_DATA.recentTransactions);
  const [subscriptions, setSubscriptions] = React.useState<ExtendedSubscription[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>(CLEAN_DATA.budgets);
  const [goals, setGoals] = React.useState<SavingsGoal[]>(CLEAN_DATA.savingsGoals);
  const [hydrated, setHydrated] = React.useState(false);

  // Global Modal & Toast states
  const [isTxModalOpen, setIsTxModalOpen] = React.useState(false);
  const [txModalDefaultType, setTxModalDefaultType] = React.useState<"expense" | "income" | "transfer">("expense");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = React.useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Hydrate from localStorage scoped by user
  React.useEffect(() => {
    try {
      localStorage.removeItem("vx-financial-store-v1");
      localStorage.removeItem("vx-financial-store-v2");
      localStorage.removeItem("vx-financial-store-v3");
      localStorage.removeItem("vx-financial-store-v4");

      let raw = localStorage.getItem(userStorageKey);
      // Migrate legacy master data if user-scoped key does not exist yet
      if (!raw && userId === "usr_master_01") {
        raw = localStorage.getItem(STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.accounts)) {
          const cleanAccounts = deduplicateUserAccounts(parsed.accounts, userId);

          setAccounts(
            cleanAccounts.length > 0
              ? cleanAccounts
              : [
                  {
                    id: `acc_cash_${userId}`,
                    name: "Efectivo",
                    type: "cash",
                    balance: 0,
                    currency: "USD",
                    accountNumberMasked: "",
                    color: "#10B981",
                  },
                ]
          );
        }
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.subscriptions)) setSubscriptions(parsed.subscriptions);
        if (Array.isArray(parsed.budgets)) setBudgets(parsed.budgets);
        if (Array.isArray(parsed.goals)) setGoals(parsed.goals);
      } else {
        // Isolated starting data for other users / friends: ONLY Efectivo as initial account
        if (userId !== "usr_master_01") {
          setAccounts([
            {
              id: `acc_cash_${userId}`,
              name: "Efectivo",
              type: "cash",
              balance: 0,
              currency: "USD",
              accountNumberMasked: "",
              color: "#10B981",
            },
          ]);
          setTransactions([]);
          setSubscriptions([]);
          setBudgets([]);
          setGoals([]);
        } else {
          setAccounts(CLEAN_DATA.accounts);
          setTransactions(CLEAN_DATA.recentTransactions);
          setBudgets(CLEAN_DATA.budgets);
          setGoals(CLEAN_DATA.savingsGoals);
        }
      }
    } catch {
      // Ignore corrupt storage
    } finally {
      setHydrated(true);
    }
  }, [userId, userStorageKey]);

  // Persist changes to localStorage under user-scoped key
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      const payload = JSON.stringify({
        accounts,
        transactions,
        subscriptions,
        budgets,
        goals,
      });
      localStorage.setItem(userStorageKey, payload);
      if (userId === "usr_master_01") {
        localStorage.setItem(STORAGE_KEY, payload);
      }
    } catch {
      // Ignore quota errors
    }
  }, [hydrated, userStorageKey, userId, accounts, transactions, subscriptions, budgets, goals]);

  // Account Management Actions with Real-Time Server Sync
  const addAccount = React.useCallback(
    (newAcc: Omit<Account, "id"> & { id?: string }) => {
      const id = newAcc.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const account: Account = {
        id,
        name: newAcc.name.trim(),
        type: newAcc.type || "bank",
        balance: Number(newAcc.balance) || 0,
        currency: newAcc.currency || "USD",
        accountNumberMasked: newAcc.accountNumberMasked ? newAcc.accountNumberMasked.trim() : "",
        color: newAcc.color || "#0071E3",
        logo: newAcc.logo,
      };
      setAccounts((prev) => [...prev, account]);
      notify(`Cuenta "${account.name}" creada exitosamente.`);

      // Immediate background sync to server so Telegram Bot & Gemini Assistant know immediately
      fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency,
          accountNumberMasked: account.accountNumberMasked,
          color: account.color,
          logo: account.logo,
        }),
      }).catch((err) => console.warn("Could not sync added account to server:", err));
    },
    [notify]
  );

  const deleteAccount = React.useCallback(
    (id: string) => {
      setAccounts((prev) => {
        const target = prev.find((a) => a.id === id);
        const filtered = prev.filter((a) => a.id !== id);
        if (target) {
          notify(`Cuenta "${target.name}" eliminada.`);
        }
        return filtered;
      });

      // Immediate background sync to server so Telegram Bot & Gemini Assistant know it was removed
      fetch(`/api/finance/accounts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch((err) => console.warn("Could not sync deleted account to server:", err));
    },
    [notify]
  );

  const editAccount = React.useCallback(
    (id: string, updates: Partial<Account>) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      notify("Cuenta actualizada correctamente.");

      // Background sync updates to server
      fetch("/api/finance/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      }).catch((err) => console.warn("Could not sync account update to server:", err));
    },
    [notify]
  );

  // Synchronize state with server (so Telegram Bot movements appear in Web App in real time)
  const syncServerState = React.useCallback(async () => {
    try {
      const res = await fetch("/api/finance/state");
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data) {
          if (Array.isArray(data.accounts)) {
            setAccounts((prev) => {
              const serverMap = new Map<string, any>(
                data.accounts.map((a: any) => [a.id, a])
              );
              // Update existing accounts from server
              const updated = prev.map((acc) => {
                const sAcc =
                  serverMap.get(acc.id) ||
                  (acc.name.trim().toLowerCase() === "efectivo"
                    ? data.accounts.find(
                        (a: any) => a.name?.trim().toLowerCase() === "efectivo"
                      )
                    : undefined);
                if (!sAcc) return acc;
                const serverBal = parseFloat(sAcc.currentBalance);
                return {
                  ...acc,
                  id: sAcc.id || acc.id,
                  name: sAcc.name || acc.name,
                  balance: typeof serverBal === "number" && !isNaN(serverBal) ? serverBal : acc.balance,
                };
              });

              // If server has accounts created from Bot or other clients, include them
              for (const sAcc of data.accounts) {
                const isCashDup =
                  sAcc.name?.trim().toLowerCase() === "efectivo" &&
                  updated.some((p) => p.name.trim().toLowerCase() === "efectivo");
                if (!updated.some((p) => p.id === sAcc.id) && !isCashDup) {
                  const sBal = parseFloat(sAcc.currentBalance);
                  updated.push({
                    id: sAcc.id,
                    name: sAcc.name,
                    type: sAcc.type || "bank",
                    balance: !isNaN(sBal) ? sBal : 0,
                    currency: sAcc.currency || "USD",
                    accountNumberMasked:
                      sAcc.accountNumberMasked === "•••• 0000"
                        ? ""
                        : sAcc.accountNumberMasked || "",
                    color: sAcc.color || "#0071E3",
                    logo: sAcc.logo,
                  });
                }
              }

              return deduplicateUserAccounts(updated, userId);
            });
          }
          if (Array.isArray(data.transactions)) {
            const mappedTx: Transaction[] = data.transactions.map((t: any) => ({
              id: t.id,
              description: t.description,
              amount: parseFloat(t.amount) || 0,
              type: t.type,
              category: t.categoryId || "General",
              date: t.date,
              accountId: t.accountId,
              accountName: t.accountId,
              toAccountId: t.toAccountId,
              source: t.source || "web",
              status: t.status || "completed",
            }));
            setTransactions(mappedTx);
          }
          if (Array.isArray(data.budgets)) {
            setBudgets(data.budgets);
          }
          if (Array.isArray(data.goals)) {
            setGoals(data.goals);
          }
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    syncServerState();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncServerState();
    };
    window.addEventListener("focus", syncServerState);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(syncServerState, 12000);
    return () => {
      window.removeEventListener("focus", syncServerState);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [syncServerState]);

  const { metrics, categoryExpenses, cashflowTrends } = React.useMemo(() => {
    // 1. Exact Total Balance across all accounts in integer cents
    let totalBalanceCents = 0;
    for (const acc of accounts) {
      totalBalanceCents += toCents(acc.balance);
    }

    // 2. Direct calculation from transactions
    let monthlyIncomeCents = 0;
    let monthlyExpensesCents = 0;
    const catMap = new Map<string, number>();

    for (const tx of transactions) {
      const c = toCents(tx.amount);
      if (tx.type === "income") {
        monthlyIncomeCents += c;
      } else if (tx.type === "expense") {
        monthlyExpensesCents += c;
        catMap.set(tx.category, (catMap.get(tx.category) || 0) + c);
      }
    }

    const netSavingsCents = monthlyIncomeCents - monthlyExpensesCents;
    const savingsRatePct =
      monthlyIncomeCents > 0
        ? Number(((netSavingsCents / monthlyIncomeCents) * 100).toFixed(2))
        : 0;

    // 3. Dynamic Category Breakdown
    const computedCategories: CategoryExpense[] = Array.from(catMap.entries())
      .filter(([, amountCents]) => amountCents > 0)
      .map(([category, amountCents]) => {
        const amount = Number(fromCents(amountCents));
        const percentage =
          monthlyExpensesCents > 0
            ? Number(((amountCents / monthlyExpensesCents) * 100).toFixed(1))
            : 0;
        return {
          category,
          amount,
          percentage,
          color: CATEGORY_COLORS[category] || "#0071E3",
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // 4. Dynamic Cashflow Trends (6-month series)
    const monthNames = ["May", "Jun", "Jul", "Ago", "Sep", "Oct"];
    const computedTrends: CashflowPoint[] = monthNames.map((month, idx) => {
      if (idx === 5) {
        const ing = Math.round(monthlyIncomeCents / 100);
        const gas = Math.round(monthlyExpensesCents / 100);
        return {
          month,
          ingresos: ing,
          gastos: gas,
          ahorro: ing - gas,
        };
      }
      return {
        month,
        ingresos: 0,
        gastos: 0,
        ahorro: 0,
      };
    });

    const computedMetrics: FinancialMetrics = {
      totalBalance: Number(fromCents(totalBalanceCents)),
      balanceChangePct: 0.0,
      monthlyIncome: Number(fromCents(monthlyIncomeCents)),
      incomeChangePct: 0.0,
      monthlyExpenses: Number(fromCents(monthlyExpensesCents)),
      expensesChangePct: 0.0,
      netSavings: Number(fromCents(netSavingsCents)),
      savingsRatePct,
    };

    return {
      metrics: computedMetrics,
      categoryExpenses: computedCategories,
      cashflowTrends: computedTrends,
    };
  }, [accounts, transactions]);

  // Actions
  const addTransaction = React.useCallback(
    (newTx: Transaction) => {
      const amountCents = toCents(newTx.amount);

      // 1. Prepend transaction
      setTransactions((prev) => [newTx, ...prev]);

      // 2. Update affected account(s) in exact integer cents
      setAccounts((prev) =>
        prev.map((acc) => {
          let balCents = toCents(acc.balance);
          if (newTx.type === "expense" && acc.id === newTx.accountId) {
            balCents -= amountCents;
          } else if (newTx.type === "income" && acc.id === newTx.accountId) {
            balCents += amountCents;
          } else if (newTx.type === "transfer") {
            if (acc.id === newTx.accountId) balCents -= amountCents;
            if (newTx.toAccountId && acc.id === newTx.toAccountId) balCents += amountCents;
          }
          return { ...acc, balance: Number(fromCents(balCents)) };
        })
      );

      // 3. Update matching budget if expense
      if (newTx.type === "expense") {
        setBudgets((prev) =>
          prev.map((b) => {
            if (matchBudgetCategory(b.category, newTx.category)) {
              const nextSpentCents = toCents(b.spent) + amountCents;
              return { ...b, spent: Number(fromCents(nextSpentCents)) };
            }
            return b;
          })
        );
      }

      // 4. Persist to server in background so Telegram bot and server stay in sync
      fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: newTx.amount.toFixed(2),
          type: newTx.type,
          description: newTx.description,
          accountId: newTx.accountId,
          toAccountId: newTx.toAccountId,
          date: newTx.date,
          source: "web",
        }),
      }).catch(() => {});

      notify(`Movimiento "${newTx.description}" registrado correctamente.`);
    },
    [notify]
  );

  const deleteTransaction = React.useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const target = prev.find((t) => t.id === id);
        if (!target) return prev;

        const amountCents = toCents(target.amount);

        // Reverse account balance impact
        setAccounts((accPrev) =>
          accPrev.map((acc) => {
            let balCents = toCents(acc.balance);
            if (target.type === "expense" && acc.id === target.accountId) {
              balCents += amountCents;
            } else if (target.type === "income" && acc.id === target.accountId) {
              balCents -= amountCents;
            } else if (target.type === "transfer") {
              if (acc.id === target.accountId) balCents += amountCents;
              if (target.toAccountId && acc.id === target.toAccountId) balCents -= amountCents;
            }
            return { ...acc, balance: Number(fromCents(balCents)) };
          })
        );

        // Reverse budget impact if expense
        if (target.type === "expense") {
          setBudgets((budPrev) =>
            budPrev.map((b) => {
              if (matchBudgetCategory(b.category, target.category)) {
                const nextSpentCents = Math.max(0, toCents(b.spent) - amountCents);
                return { ...b, spent: Number(fromCents(nextSpentCents)) };
              }
              return b;
            })
          );
        }

        notify(`Movimiento "${target.description}" eliminado y saldo ajustado.`);

        // Persist deletion to server so polling/refresh doesn't revive the transaction
        fetch(`/api/finance/transactions?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        }).catch((err) => {
          console.warn("Error deleting transaction on server:", err);
        });

        return prev.filter((t) => t.id !== id);
      });
    },
    [notify]
  );

  const addSubscription = React.useCallback(
    (sub: ExtendedSubscription) => {
      setSubscriptions((prev) => [sub, ...prev]);
      notify(`Suscripción "${sub.name}" agregada correctamente.`);
    },
    [notify]
  );

  const toggleSubscription = React.useCallback(
    (id: string) => {
      setSubscriptions((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            const nextActive = s.isActive === false;
            notify(
              nextActive
                ? `Suscripción "${s.name}" reactivada.`
                : `Suscripción "${s.name}" pausada (excluida del cálculo mensual).`
            );
            return { ...s, isActive: nextActive, status: nextActive ? "active" : "paused" };
          }
          return s;
        })
      );
    },
    [notify]
  );

  const deleteSubscription = React.useCallback(
    (id: string) => {
      setSubscriptions((prev) => {
        const sub = prev.find((s) => s.id === id);
        if (sub) notify(`Suscripción "${sub.name}" eliminada.`);
        return prev.filter((s) => s.id !== id);
      });
    },
    [notify]
  );

  const saveBudget = React.useCallback(
    (budget: Budget, isEdit: boolean = false) => {
      if (isEdit) {
        setBudgets((prev) => prev.map((b) => (b.id === budget.id ? budget : b)));
        notify(`Límite de "${budget.category}" actualizado a $${budget.limit.toFixed(2)}.`);
      } else {
        setBudgets((prev) => [...prev, budget]);
        notify(`Presupuesto para "${budget.category}" creado con éxito.`);
      }
    },
    [notify]
  );

  const deleteBudget = React.useCallback(
    (id: string) => {
      setBudgets((prev) => {
        const b = prev.find((item) => item.id === id);
        if (b) notify(`Presupuesto "${b.category}" eliminado.`);
        return prev.filter((item) => item.id !== id);
      });
    },
    [notify]
  );

  const addGoal = React.useCallback(
    (goal: SavingsGoal) => {
      setGoals((prev) => [...prev, goal]);
      notify(`Meta "${goal.name}" creada exitosamente.`);
    },
    [notify]
  );

  const depositToGoal = React.useCallback(
    (goalId: string, amount: number, fromAccountId?: string) => {
      const depositCents = toCents(amount);
      if (depositCents <= 0) return;

      let goalName = "";
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === goalId) {
            goalName = g.name;
            const nextCents = toCents(g.currentAmount) + depositCents;
            return { ...g, currentAmount: Number(fromCents(nextCents)) };
          }
          return g;
        })
      );

      if (fromAccountId) {
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === fromAccountId) {
              const nextBalCents = toCents(acc.balance) - depositCents;
              return { ...acc, balance: Number(fromCents(nextBalCents)) };
            }
            return acc;
          })
        );
      }

      notify(`Aporte de $${fromCents(depositCents)} registrado${goalName ? ` en "${goalName}"` : ""}.`);
    },
    [notify]
  );

  const deleteGoal = React.useCallback(
    (id: string) => {
      setGoals((prev) => {
        const g = prev.find((item) => item.id === id);
        if (g) notify(`Meta "${g.name}" eliminada.`);
        return prev.filter((item) => item.id !== id);
      });
    },
    [notify]
  );

  const resetToDemoData = React.useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(userStorageKey);
    } catch {}
    setAccounts(DEMO_DATA.accounts);
    setTransactions(DEMO_DATA.recentTransactions);
    setSubscriptions(DEMO_DATA.subscriptions.map((s) => ({ ...s, isActive: true })));
    setBudgets(DEMO_DATA.budgets);
    setGoals(DEMO_DATA.savingsGoals);
    notify("Datos restaurados al estado original de demostración.");
  }, [notify, userStorageKey]);

  const resetToCleanData = React.useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(userStorageKey);
    } catch {}
    setAccounts(CLEAN_DATA.accounts);
    setTransactions([]);
    setSubscriptions([]);
    setBudgets([]);
    setGoals([]);
    notify("Sistema financiero restablecido a balance inicial limpio ($0.00).");
  }, [notify, userStorageKey]);

  const openTransactionModal = React.useCallback((defaultType: "expense" | "income" | "transfer" = "expense") => {
    setTxModalDefaultType(defaultType);
    setIsTxModalOpen(true);
  }, []);

  const closeTransactionModal = React.useCallback(() => {
    setIsTxModalOpen(false);
  }, []);

  const currentAiInsight = React.useMemo(() => {
    if (transactions.length === 0) {
      return CLEAN_DATA.aiInsight;
    }
    return {
      title: "Análisis Financiero",
      summary: `Registraste ${transactions.length} movimientos en tu panel. Balance neto operativo: $${metrics.netSavings.toFixed(2)}.`,
      sentiment: metrics.netSavings >= 0 ? ("positive" as const) : ("negative" as const),
      generatedAt: "En tiempo real",
    };
  }, [transactions.length, metrics.netSavings]);

  const contextValue = React.useMemo<FinancialStoreContextType>(
    () => ({
      accounts,
      transactions,
      subscriptions,
      budgets,
      goals,
      metrics,
      categoryExpenses,
      cashflowTrends,
      aiInsight: currentAiInsight,
      addAccount,
      deleteAccount,
      editAccount,
      addTransaction,
      deleteTransaction,
      addSubscription,
      toggleSubscription,
      deleteSubscription,
      saveBudget,
      deleteBudget,
      addGoal,
      depositToGoal,
      deleteGoal,
      resetToDemoData,
      resetToCleanData,
      syncServerState,
      openTransactionModal,
      closeTransactionModal,
      notify,
    }),
    [
      accounts,
      transactions,
      subscriptions,
      budgets,
      goals,
      metrics,
      categoryExpenses,
      cashflowTrends,
      currentAiInsight,
      addAccount,
      deleteAccount,
      editAccount,
      addTransaction,
      deleteTransaction,
      addSubscription,
      toggleSubscription,
      deleteSubscription,
      saveBudget,
      deleteBudget,
      addGoal,
      depositToGoal,
      deleteGoal,
      resetToDemoData,
      syncServerState,
      openTransactionModal,
      closeTransactionModal,
      notify,
    ]
  );

  return (
    <FinancialStoreContext.Provider value={contextValue}>
      {children}

      {/* Global Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 xl:bottom-6 right-4 sm:right-6 z-[90] max-w-md px-4 py-3 rounded-2xl bg-white/95 dark:bg-[#272729]/95 backdrop-blur-xl border border-[#28CD41]/40 dark:border-[#30D158]/40 text-[#1D8348] dark:text-[#30D158] shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#28CD41] dark:text-[#30D158]" />
            <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-full text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#86868b] dark:hover:text-white transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Global Instant Transaction Modal */}
      <NewTransactionModal
        isOpen={isTxModalOpen}
        defaultType={txModalDefaultType}
        accounts={accounts}
        onClose={closeTransactionModal}
        onAddTransaction={addTransaction}
      />
    </FinancialStoreContext.Provider>
  );
}

export function useFinancialStore() {
  const ctx = React.useContext(FinancialStoreContext);
  if (!ctx) {
    throw new Error("useFinancialStore must be used within a FinancialStoreProvider");
  }
  return ctx;
}
