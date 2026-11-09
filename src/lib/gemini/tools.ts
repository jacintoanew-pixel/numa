/**
 * Google Gemini AI Function Calling Tools Engine
 * 
 * Defines schemas and execution logic for financial actions:
 * - create_transaction
 * - get_spending_summary
 * - compare_periods
 * - get_budget_status
 * - get_savings_progress
 * 
 * Strict authorization and sandboxing: rejects unknown tool names.
 */

import { financialService } from "../finance/service";
import {
  toCents,
  fromCents,
  calculateBudgetStatus,
  calculateSavingsProgress,
  calculatePeriodComparison,
} from "../finance/calculator";

export interface GeminiToolDeclaration {
  name: string;
  description: string;
  type: "function";
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const GEMINI_TOOL_DECLARATIONS: GeminiToolDeclaration[] = [
  {
    name: "create_transaction",
    type: "function",
    description: "Registra una nueva transacción financiera (gasto, ingreso o transferencia) y actualiza los saldos de las cuentas de forma atómica y decimal-safe.",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "string",
          description: "Monto decimal positivo en USD, e.g. '45.00'",
        },
        type: {
          type: "string",
          enum: ["income", "expense", "transfer"],
          description: "Tipo de movimiento financiero",
        },
        description: {
          type: "string",
          description: "Concepto o descripción del gasto o ingreso",
        },
        accountId: {
          type: "string",
          description: "ID o nombre de la cuenta o billetera activa (e.g. Banco General, BAC Credomatic, Banco Nacional, Banisi, Global Bank, Banistmo, Caja de Ahorros, Yappy, Punto Pago, PayPal, Efectivo)",
        },
        toAccountId: {
          type: "string",
          description: "ID o nombre de la cuenta de destino (requerido para transferencias)",
        },
        categoryId: {
          type: "string",
          description: "ID opcional de la categoría del gasto",
        },
        date: {
          type: "string",
          description: "Fecha ISO del movimiento (opcional, por defecto fecha actual)",
        },
      },
      required: ["amount", "type", "description", "accountId"],
    },
  },
  {
    name: "get_spending_summary",
    type: "function",
    description: "Calcula los totales consolidados de ingresos, gastos y ahorro para un mes determinado (formato YYYY-MM).",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Periodo en formato YYYY-MM, e.g. '2026-10'",
        },
      },
      required: [],
    },
  },
  {
    name: "compare_periods",
    type: "function",
    description: "Compara el volumen de gastos entre dos periodos mensuales para análisis de variaciones.",
    parameters: {
      type: "object",
      properties: {
        periodA: {
          type: "string",
          description: "Primer periodo a comparar (YYYY-MM)",
        },
        periodB: {
          type: "string",
          description: "Segundo periodo a comparar (YYYY-MM)",
        },
      },
      required: ["periodA", "periodB"],
    },
  },
  {
    name: "get_budget_status",
    type: "function",
    description: "Obtiene el estado de ejecución presupuestaria para el periodo (límite, gastado, remanente y advertencias de consumo).",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Periodo YYYY-MM opcional",
        },
      },
      required: [],
    },
  },
  {
    name: "get_savings_progress",
    type: "function",
    description: "Obtiene el progreso, saldo actual y porcentaje de cumplimiento de las metas de ahorro activas.",
    parameters: {
      type: "object",
      properties: {
        goalId: {
          type: "string",
          description: "ID opcional de una meta de ahorro específica",
        },
      },
      required: [],
    },
  },
  {
    name: "get_accounts_list",
    type: "function",
    description: "Obtiene la lista en tiempo real de todas las cuentas y billeteras financieras activas del usuario con sus tipos y saldos actuales.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

function getPanamaDateIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Panama",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function executeGeminiTool(
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: any; error?: string }> {
  switch (name) {
    case "get_accounts_list": {
      const accounts = financialService.getAccountsByUser(userId);
      return {
        success: true,
        data: {
          accounts: accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            subType: a.subType,
            balance: a.currentBalance,
            currency: a.currency,
          })),
          count: accounts.length,
        },
      };
    }

    case "create_transaction": {
      try {
        const rawAccount = String(
          args.accountId || args.accountName || args.account || args.wallet || ""
        );
        const targetAccount = financialService.findAccountByQuery(userId, rawAccount, { strict: true });
        if (!targetAccount) {
          const userAccounts = financialService.getAccountsByUser(userId);
          const listStr = userAccounts.map((a) => `${a.name} ($${a.currentBalance} ${a.currency})`).join(", ");
          return {
            success: false,
            error: `La cuenta o billetera "${rawAccount}" no existe o fue eliminada. Cuentas activas disponibles: [${listStr || "Sin cuentas"}]. Por favor informa al usuario que esa cuenta no existe o fue eliminada y ofrécele usar una de sus cuentas disponibles o agregarla desde la app.`,
          };
        }

        let destAccountId: string | undefined;
        if (args.type === "transfer") {
          const rawDest = String(
            args.toAccountId || args.toAccountName || args.toAccount || ""
          );
          const destAccount = financialService.findAccountByQuery(userId, rawDest, { strict: true });
          if (!destAccount) {
            const userAccounts = financialService.getAccountsByUser(userId);
            const listStr = userAccounts.map((a) => `${a.name} ($${a.currentBalance} ${a.currency})`).join(", ");
            return {
              success: false,
              error: `La cuenta de destino "${rawDest}" no existe o fue eliminada. Cuentas activas disponibles: [${listStr || "Sin cuentas"}].`,
            };
          }
          if (targetAccount.id === destAccount.id) {
            return {
              success: false,
              error: `La cuenta de origen y de destino no pueden ser la misma (${targetAccount.name}).`,
            };
          }
          destAccountId = destAccount.id;
        }

        const tx = await financialService.recordTransaction(userId, {
          amount: String(args.amount),
          type: args.type,
          description: String(args.description || `Movimiento en ${targetAccount.name}`),
          accountId: targetAccount.id,
          toAccountId: destAccountId,
          categoryId: args.categoryId ? String(args.categoryId) : undefined,
          date: args.date ? String(args.date) : getPanamaDateIso(),
          source: "system",
        });

        const updatedAccount = financialService.getAccount(tx.accountId);
        return {
          success: true,
          data: {
            transaction: tx,
            accountName: targetAccount.name,
            newBalance: updatedAccount?.currentBalance ?? "0.00",
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || "Error al registrar la transacción",
        };
      }
    }

    case "get_spending_summary": {
      const period =
        typeof args.period === "string" && args.period.trim()
          ? args.period.trim()
          : getPanamaDateIso().slice(0, 7);

      const userTxs = financialService.getTransactionsByUser(userId);
      const filtered = userTxs.filter((t) => t.date.startsWith(period));

      let incomeCents = 0;
      let expensesCents = 0;

      for (const t of filtered) {
        if (t.type === "income") incomeCents += toCents(t.amount);
        else if (t.type === "expense") expensesCents += toCents(t.amount);
      }

      return {
        success: true,
        data: {
          period,
          totalIncome: fromCents(incomeCents),
          totalExpenses: fromCents(expensesCents),
          netSavings: fromCents(incomeCents - expensesCents),
          transactionCount: filtered.length,
        },
      };
    }

    case "compare_periods": {
      const periodA = String(args.periodA || "");
      const periodB = String(args.periodB || "");

      const userTxs = financialService.getTransactionsByUser(userId);
      const getPeriodExpenses = (p: string) => {
        const txs = userTxs.filter(
          (t) => t.date.startsWith(p) && t.type === "expense"
        );
        let sum = 0;
        for (const t of txs) sum += toCents(t.amount);
        return fromCents(sum);
      };

      const expA = getPeriodExpenses(periodA);
      const expB = getPeriodExpenses(periodB);
      const comparison = calculatePeriodComparison(expB, expA);

      return {
        success: true,
        data: {
          periodA: { period: periodA, expenses: expA },
          periodB: { period: periodB, expenses: expB },
          comparison,
        },
      };
    }

    case "get_budget_status": {
      const period =
        typeof args.period === "string" && args.period.trim()
          ? args.period.trim()
          : getPanamaDateIso().slice(0, 7);

      const budgets = financialService.getBudgetsByUser(userId, period);
      const userTxs = financialService.getTransactionsByUser(userId);

      const results = budgets.map((b) => {
        const catTxs = userTxs.filter(
          (t) =>
            t.date.startsWith(period) &&
            t.type === "expense" &&
            t.categoryId === b.categoryId
        );
        let spentCents = 0;
        for (const t of catTxs) spentCents += toCents(t.amount);
        const spent = fromCents(spentCents);
        const status = calculateBudgetStatus(b.limit, spent, b.warningThreshold);
        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          categoryName: b.categoryName,
          ...status,
        };
      });

      return {
        success: true,
        data: {
          period,
          budgets: results,
        },
      };
    }

    case "get_savings_progress": {
      const goals = financialService.getGoalsByUser(userId);
      const filtered = args.goalId
        ? goals.filter((g) => g.id === args.goalId)
        : goals;

      const results = filtered.map((g) => {
        const progress = calculateSavingsProgress(
          g.targetAmount,
          g.currentAmount
        );
        return {
          goalId: g.id,
          name: g.name,
          ...progress,
        };
      });

      return {
        success: true,
        data: {
          goals: results,
        },
      };
    }

    default:
      return {
        success: false,
        error: `Herramienta no autorizada o desconocida: ${name}`,
      };
  }
}
