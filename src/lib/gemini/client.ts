/**
 * Google Gemini AI Financial Assistant Client
 * 
 * Powered by `@google/genai` (v2.29.1) with native Function Calling.
 * Default model: `gemini-3.8-flash` (or `process.env.GEMINI_MODEL`).
 * 
 * Features:
 * - Function calling loop with financial domain tools
 * - Local deterministic fallback if GEMINI_API_KEY is not configured
 * - Strict decimal calculation & Spanish (es-PA) financial prompts
 */

import { GoogleGenAI } from "@google/genai";
import { GEMINI_TOOL_DECLARATIONS, executeGeminiTool } from "./tools";
import { financialService } from "../finance/service";
import { parseTelegramMessage } from "../telegram/parser";
import { DEMO_DATA } from "../demo-data";
import { authStore } from "../auth/auth-store";

export interface AssistantRequestOptions {
  userId: string;
  message: string;
  previousInteractionId?: string;
}

export interface AssistantResponse {
  text: string;
  source: "gemini" | "local-fallback";
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  interactionId?: string;
}

export function getDynamicSystemInstruction(userId: string): string {
  const user = authStore.getUserByIdSync(userId);
  const userName = user?.name || (userId === "usr_demo_user" ? "Demo User" : "Usuario");
  const firstName = userName.split(/\s+/)[0] || "Usuario";

  const accounts = financialService.getAccountsByUser(userId);
  const accountsSummary =
    accounts.length > 0
      ? accounts
          .map(
            (a) =>
              `• ${a.name}: $${a.currentBalance} ${a.currency} (${a.type}${a.subType ? ` - ${a.subType}` : ""})`
          )
          .join("\n")
      : "Sin cuentas activas configuradas.";

  const sampleAccountName = accounts[0]?.name || "Efectivo";

  return `Eres el asistente financiero personal de numa (Acme) para ${userName} (llámalo por su nombre: ${firstName}).
- Nunca confundas a ${userName} con ningún otro usuario. Cada usuario es 100% independiente.
- Te diriges de forma cercana, sobria, inteligente y profesional. Moneda oficial USD ($), zona horaria América/Panamá.
- CUENTAS FINANCIERAS ACTIVAS EN TIEMPO REAL DE ${userName.toUpperCase()}:
${accountsSummary}

- REGLAS CRÍTICAS DE GESTIÓN DE CUENTAS Y CONTROL DE ERRORES:
  1. Estas son las ÚNICAS cuentas activas de ${firstName} en este momento.
  2. Si ${firstName} te pide registrar un movimiento (gasto, ingreso o transferencia) o consultar el saldo de una cuenta que NO existe en esta lista (o que fue eliminada), NUNCA inventes la cuenta ni la asignes a otra cuenta al azar.
  3. Informa a ${firstName} con total claridad y educación que dicha cuenta no existe o fue eliminada, muéstrale únicamente sus cuentas activas disponibles y sugiérele agregarla desde el panel web de Ajustes o Dashboard si lo desea.
  4. Si pide registrar dinero claramente en una cuenta activa (ej. "Gasté $15 en comida con ${sampleAccountName}"), DEBES invocar INMEDIATAMENTE la herramienta 'create_transaction'.
  5. Si pregunta qué cuentas tiene o cuánto dinero tiene en total, usa únicamente los saldos en tiempo real de arriba o invoca 'get_accounts_list'.
  6. Si pide resúmenes de gastos del mes, invoca 'get_spending_summary'.
  7. Si pide comparar meses, invoca 'compare_periods'.
  8. Si pregunta por presupuestos o metas, invoca 'get_budget_status' o 'get_savings_progress'.
- ESTILO Y FORMATO DE RESPUESTA:
  - Habla en lenguaje natural, fluido, cercano y conversacional en español.
  - No uses listas robóticas para confirmar movimientos simples.
  - Confirma movimientos en una o dos frases naturales con el saldo resultante (ej. "Listo, ${firstName}. Registré el gasto de $15.00 en ${sampleAccountName}. Tu nuevo saldo es $135.00.").
  - Sé conciso y elegante. Montos siempre claros con el símbolo $ (ej. $20.00).`;
}

import { integrationsVault } from "../security/integrations-vault";

export class GeminiFinancialAssistant {
  private apiKey: string;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey ?? "";
    this.model = options?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }

  public async generateResponse(options: AssistantRequestOptions): Promise<AssistantResponse> {
    const { userId, message } = options;

    const activeApiKey =
      this.apiKey ||
      integrationsVault.getGeminiApiKey() ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";

    // If no valid API key, execute deterministic local fallback
    if (!activeApiKey) {
      return this.handleLocalFallback(userId, message);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: activeApiKey });
      const preferredModel = this.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

      const tools = [
        {
          functionDeclarations: GEMINI_TOOL_DECLARATIONS.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters as any,
          })),
        },
      ];

      const dynamicSystemInstruction = getDynamicSystemInstruction(userId);
      const buildConfig = (mName: string, includeTools: boolean) => {
        const cfg: any = {
          systemInstruction: dynamicSystemInstruction,
        };
        if (includeTools) {
          cfg.tools = tools;
        }
        // Eliminate thinking latency for instant sub-second responses
        if (mName.includes("2.5") || mName.includes("3")) {
          cfg.thinkingConfig = { thinkingBudget: 0 };
        }
        return cfg;
      };

      // Helper to generate with automatic failover if primary model experiences spikes/503
      let usedModel = preferredModel;
      let response: any;

      try {
        response = await ai.models.generateContent({
          model: usedModel,
          contents: message,
          config: buildConfig(usedModel, true),
        });
      } catch (primaryErr: any) {
        console.warn(`[GEMINI] Model ${usedModel} error (${primaryErr?.message}). Retrying with gemini-2.0-flash...`);
        usedModel = "gemini-2.0-flash";
        response = await ai.models.generateContent({
          model: usedModel,
          contents: message,
          config: buildConfig(usedModel, true),
        });
      }

      const toolCallsExecuted: Array<{ name: string; args: any; result: any }> = [];

      // 2. Handle function calling if requested by Gemini
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponses = [];

        for (const call of response.functionCalls) {
          const callName = call.name || "unknown_tool";
          const toolResult = await executeGeminiTool(
            userId,
            callName,
            (call.args as any) || {}
          );
          toolCallsExecuted.push({
            name: callName,
            args: call.args,
            result: toolResult,
          });

          functionResponses.push({
            name: callName,
            response: toolResult,
          });
        }

        // 3. Send tool results back to model for synthesis
        const modelContent =
          response.candidates?.[0]?.content || {
            role: "model",
            parts: response.functionCalls.map((c: any) => ({ functionCall: c })),
          };

        const secondTurn = await ai.models.generateContent({
          model: usedModel,
          contents: [
            { role: "user", parts: [{ text: message }] },
            modelContent as any,
            {
              role: "user",
              parts: functionResponses.map((fr) => ({
                functionResponse: fr,
              })),
            },
          ],
          config: buildConfig(usedModel, false),
        });

        return {
          text: secondTurn.text || "Operación procesada con éxito en tus cuentas.",
          source: "gemini",
          toolCalls: toolCallsExecuted,
        };
      }

      return {
        text: response.text || "Entendido.",
        source: "gemini",
      };
    } catch (error: any) {
      console.warn("Gemini API call failed, reverting to local fallback:", error?.message);
      return this.handleLocalFallback(userId, message);
    }
  }

  /**
   * Deterministic local fallback when Gemini API key is missing or offline.
   */
  private async handleLocalFallback(userId: string, message: string): Promise<AssistantResponse> {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    if (lower === "ping") {
      return {
        text: "pong • Motor financiero VX operativo.",
        source: "local-fallback",
      };
    }

    // 1. Check if user is asking to record a movement
    const parsed = parseTelegramMessage(trimmed);
    if (parsed.intent === "record_transaction" && parsed.transaction) {
      let targetAccount: ReturnType<typeof financialService.findAccountByQuery>;
      if (parsed.transaction.accountQuery) {
        targetAccount = financialService.findAccountByQuery(userId, parsed.transaction.accountQuery, { strict: true });
        if (!targetAccount) {
          const userAccounts = financialService.getAccountsByUser(userId);
          const listStr = userAccounts.map((a) => `• ${a.name} ($${a.currentBalance} ${a.currency})`).join("\n");
          return {
            text: `⚠️ La cuenta "${parsed.transaction.accountQuery}" no existe o fue eliminada.\n\nTus cuentas activas disponibles son:\n${listStr || "Ninguna cuenta registrada"}\n\nPuedes agregarla desde el panel web de numa o indicar una de tus cuentas activas.`,
            source: "local-fallback",
          };
        }
      } else {
        const userAccounts = financialService.getAccountsByUser(userId);
        targetAccount = userAccounts[0];
      }

      if (!targetAccount) {
        return {
          text: `⚠️ No se encontró una billetera o cuenta disponible para registrar la operación. Agrega una cuenta desde el panel web de numa.`,
          source: "local-fallback",
        };
      }

      let toAccountId: string | undefined;
      if (parsed.transaction.type === "transfer" && parsed.transaction.destAccountQuery) {
        const dest = financialService.findAccountByQuery(userId, parsed.transaction.destAccountQuery, { strict: true });
        if (!dest) {
          const userAccounts = financialService.getAccountsByUser(userId);
          const listStr = userAccounts.map((a) => `• ${a.name} ($${a.currentBalance} ${a.currency})`).join("\n");
          return {
            text: `⚠️ La cuenta de destino "${parsed.transaction.destAccountQuery}" no existe o fue eliminada.\n\nTus cuentas activas disponibles son:\n${listStr || "Ninguna cuenta registrada"}`,
            source: "local-fallback",
          };
        }
        if (dest.id === targetAccount.id) {
          return {
            text: `⚠️ La cuenta de origen y destino no pueden ser la misma (${targetAccount.name}).`,
            source: "local-fallback",
          };
        }
        toAccountId = dest.id;
      }

      const tx = await financialService.recordTransaction(userId, {
        amount: parsed.transaction.amount,
        type: parsed.transaction.type,
        description: parsed.transaction.description,
        accountId: targetAccount.id,
        toAccountId,
        date: new Date().toISOString(),
        source: "web",
      });

      const updatedAcc = financialService.getAccount(targetAccount.id);
      const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
      const label = tx.type === "income" ? "Ingreso" : tx.type === "expense" ? "Gasto" : "Transferencia";

      return {
        text: `✅ ${label} registrado con éxito:\n• Concepto: ${tx.description}\n• Monto: ${sign}$${tx.amount} USD\n• Cuenta: ${targetAccount.name}\n• Nuevo Saldo: $${updatedAcc?.currentBalance ?? "0.00"} USD`,
        source: "local-fallback",
        toolCalls: [
          {
            name: "create_transaction",
            args: { amount: tx.amount, type: tx.type, description: tx.description, accountId: targetAccount.name },
            result: { success: true, data: { transaction: tx, newBalance: updatedAcc?.currentBalance } },
          },
        ],
      };
    }

    // 2. Check if user is asking about budgets ("presupuesto")
    if (lower.includes("presupuesto") || parsed.intent === "query_budget_remaining") {
      const userBudgets = financialService.getBudgetsByUser(userId);
      const sourceBudgets =
        userBudgets.length > 0
          ? userBudgets.map((b) => {
              const limit = parseFloat(b.limit) || 0;
              const spent = parseFloat(b.spent || "0") || 0;
              const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
              const rem = Math.max(0, limit - spent);
              return `• ${b.categoryName || b.categoryId}: $${spent.toFixed(2)} / $${limit.toFixed(2)} (${pct}% consumido • Disponible: $${rem.toFixed(2)})`;
            })
          : userId === "usr_master_01"
          ? DEMO_DATA.budgets.map((b) => {
              const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
              const rem = Math.max(0, b.limit - b.spent);
              return `• ${b.category}: $${b.spent.toFixed(2)} / $${b.limit.toFixed(2)} (${pct}% consumido • Disponible: $${rem.toFixed(2)})`;
            })
          : [];

      if (sourceBudgets.length === 0) {
        return {
          text: "No tienes presupuestos configurados todavía en tu cuenta. Puedes crear uno desde la pestaña Presupuestos.",
          source: "local-fallback",
          toolCalls: [{ name: "get_budget_status", args: {}, result: { success: true } }],
        };
      }

      return {
        text: `Estado actual de tus presupuestos mensuales:\n\n${sourceBudgets.join("\n")}`,
        source: "local-fallback",
        toolCalls: [{ name: "get_budget_status", args: {}, result: { success: true } }],
      };
    }

    // 3. Check if user is asking about savings goals ("metas" / "ahorro")
    if (lower.includes("meta") || lower.includes("ahorro")) {
      const userGoals = financialService.getGoalsByUser(userId);
      const sourceGoals =
        userGoals.length > 0
          ? userGoals.map((g) => {
              const target = parseFloat(g.targetAmount) || 0;
              const current = parseFloat(g.currentAmount) || 0;
              const pct = target > 0 ? Math.round((current / target) * 100) : 0;
              return `• ${g.name}: $${current.toFixed(2)} / $${target.toFixed(2)} (${pct}% completado • Meta: ${g.targetDate || "Sin fecha"})`;
            })
          : userId === "usr_master_01"
          ? DEMO_DATA.savingsGoals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              return `• ${g.name}: $${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)} (${pct}% completado • Meta: ${g.targetDate})`;
            })
          : [];

      if (sourceGoals.length === 0) {
        return {
          text: "No tienes metas de ahorro registradas todavía. Puedes crear tu primera meta desde la sección Metas.",
          source: "local-fallback",
          toolCalls: [{ name: "get_savings_progress", args: {}, result: { success: true } }],
        };
      }

      return {
        text: `Así avanzan tus metas de ahorro patrimonial:\n\n${sourceGoals.join("\n")}`,
        source: "local-fallback",
        toolCalls: [{ name: "get_savings_progress", args: {}, result: { success: true } }],
      };
    }

    // 4. Check if user is asking for balance or accounts
    if (lower.includes("saldo") || lower.includes("cuenta") || lower.includes("cuánto tengo")) {
      const userAccounts = financialService.getAccountsByUser(userId);
      const sourceAccounts =
        userAccounts.length > 0
          ? userAccounts.map((a) => `• ${a.name}: $${a.currentBalance} ${a.currency}`)
          : ["• Sin cuentas activas configuradas."];

      return {
        text: `Tus saldos actuales son:\n\n${sourceAccounts.join("\n")}`,
        source: "local-fallback",
      };
    }

    // 5. Check if user is asking about spending or monthly summary
    if (lower.includes("gasto") || lower.includes("gastado") || lower.includes("resumen") || lower.includes("este mes")) {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const txs = financialService.getTransactionsByUser(userId);

      const metrics = financialService.getConsolidatedMetrics(userId);
      return {
        text: `📊 *Resumen Financiero:*\n• Ingresos registrados: $${metrics.totalIncome} USD\n• Gastos acumulados: $${metrics.totalExpenses} USD\n• Ahorro neto: $${metrics.netSavings} USD\n• Movimientos en total: ${txs.length}`,
        source: "local-fallback",
        toolCalls: [{ name: "get_spending_summary", args: { period: currentPeriod }, result: { success: true } }],
      };
    }

    const userObj = authStore.getUserByIdSync(userId);
    const firstName =
      userObj?.name?.split(/\s+/)[0] ||
      (userId === "usr_demo_user" ? "Demo" : userId === "usr_master_01" ? "Admin" : "Usuario");
    const accounts = financialService.getAccountsByUser(userId);
    const primaryAccountName = accounts[0]?.name || "Efectivo";

    // 6. Check if user is asking for recent movements
    if (lower.includes("ultim") || lower.includes("movimiento") || lower.includes("historial") || lower.includes("transaccion")) {
      const txs = financialService.getTransactionsByUser(userId).slice(0, 5);
      if (txs.length === 0) {
        return {
          text: `No tienes movimientos registrados todavía, ${firstName}. Puedes registrar uno diciendo: "Gasté 5 en almuerzo con ${primaryAccountName}".`,
          source: "local-fallback",
        };
      }
      const lines = txs.map((t) => {
        const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "→";
        return `• ${t.date.slice(0, 10)} | ${t.description}: ${sign}$${t.amount} USD (${t.accountId})`;
      });
      return {
        text: `Últimos movimientos registrados:\n\n${lines.join("\n")}`,
        source: "local-fallback",
      };
    }

    // 7. Contextual dynamic response
    let totalCents = 0;
    for (const a of accounts) {
      totalCents += Math.round(parseFloat(a.currentBalance) * 100);
    }
    const totalBalanceStr = (totalCents / 100).toFixed(2);
    const accountsInline = accounts.map((a) => a.name).join(", ") || "Efectivo";

    if (lower.includes("hola") || lower.includes("buenos") || lower.includes("buenas") || lower.includes("hey")) {
      return {
        text: `¡Hola, ${firstName}! Tu saldo total disponible es de $${totalBalanceStr} USD en tus cuentas (${accountsInline}). Puedes decirme qué registrar (ingresos o gastos) o consultar tus cuentas.`,
        source: "local-fallback",
      };
    }

    return {
      text: `Entendido, ${firstName}. Tu saldo patrimonial actual es $${totalBalanceStr} USD. Para registrar un movimiento en tus cuentas (${accountsInline}), escribe por ejemplo: "Gasté 10 en almuerzo con ${primaryAccountName}".`,
      source: "local-fallback",
    };
  }
}

export const geminiAssistant = new GeminiFinancialAssistant();
