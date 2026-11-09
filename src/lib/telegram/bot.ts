/**
 * Telegram Bot Controller (grammY)
 * 
 * Native integration without extra background processes.
 * Handles:
 * - Direct receipt & invoice photo scanning via Google Gemini Vision OCR
 * - Multi-wallet income, expense, and transfer operations ("Agrega $50 a Yappy", "Quita $20 de Efectivo")
 * - Direct minus notation ("Compra de pan -20$")
 * - Savings goals management ("Crear meta Laptop $2200", "Aportar $50 a meta Laptop")
 * - Balance and budget queries
 * - Shared persistence with the web panel via FinancialService
 */

import { Bot, InlineKeyboard } from "grammy";
import { telegramLinkManager } from "./link";
import { parseTelegramMessage } from "./parser";
import { financialService } from "../finance/service";
import { receiptScanner } from "../gemini/receipt-scanner";
import { integrationsVault } from "../security/integrations-vault";

const token =
  integrationsVault.getTelegramToken() ||
  process.env.TELEGRAM_BOT_TOKEN ||
  "PLACEHOLDER_TOKEN_FOR_DEV_INIT";

export const bot = new Bot(token, {
  botInfo: {
    id: 999888777,
    is_bot: true,
    first_name: "numa Finanzas",
    username: "numaFinanzBot",
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
  },
});

export function parseQuickCommandArgs(text: string): {
  amount?: string;
  accountQuery?: string;
  description?: string;
} {
  const clean = text.trim();
  if (!clean) return {};

  const parts = clean.split(/\s+/);
  let amount: string | undefined;
  let accountQuery: string | undefined;
  const descParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].replace(/^\$/, "").replace(/\$$/, "");
    if (!amount && /^(\d+(\.\d{1,2})?)$/.test(p)) {
      amount = parseFloat(p).toFixed(2);
      continue;
    }

    const lower = parts[i].toLowerCase();
    if (
      !accountQuery &&
      (lower.includes("yappy") ||
        lower.includes("banistmo") ||
        lower.includes("caja") ||
        lower.includes("ahorro") ||
        lower.includes("punto") ||
        lower.includes("puntopago") ||
        lower.includes("paypal") ||
        lower.includes("efectivo") ||
        lower.includes("cash"))
    ) {
      accountQuery = parts[i];
      continue;
    }

    descParts.push(parts[i]);
  }

  return {
    amount,
    accountQuery,
    description: descParts.join(" ").trim() || undefined,
  };
}

export function formatAccountNotFoundError(userId: string, queriedAccount: string): string {
  const accounts = financialService.getAccountsByUser(userId);
  if (accounts.length === 0) {
    return (
      `⚠️ *Cuenta no encontrada o eliminada*\n\n` +
      `No encontramos la cuenta "*${queriedAccount}*" y actualmente no tienes ninguna cuenta activa configurada.\n\n` +
      `💡 Puedes agregar una cuenta desde el panel web de numa (Dashboard o Ajustes).`
    );
  }
  const lines = accounts.map((a) => `• *${a.name}*: $${a.currentBalance} ${a.currency}`);
  return (
    `⚠️ *Cuenta no encontrada o eliminada*\n\n` +
    `No encontramos la cuenta "*${queriedAccount}*" entre tus cuentas activas.\n\n` +
    `💳 *Tus cuentas activas disponibles son:*\n` +
    `${lines.join("\n")}\n\n` +
    `💡 Puedes volver a agregar "*${queriedAccount}*" desde el panel web o indicar una de tus cuentas activas.`
  );
}

export function formatTransferAccountsError(
  userId: string,
  fromQuery: string,
  toQuery: string,
  fromFound?: boolean,
  toFound?: boolean
): string {
  const accounts = financialService.getAccountsByUser(userId);
  const lines = accounts.map((a) => `• *${a.name}*: $${a.currentBalance} ${a.currency}`);
  let missingMsg = "";
  if (!fromFound && !toFound) {
    missingMsg = `• La cuenta de origen "*${fromQuery}*" y la de destino "*${toQuery}*" no existen o fueron eliminadas.`;
  } else if (!fromFound) {
    missingMsg = `• La cuenta de origen "*${fromQuery}*" no existe o fue eliminada.`;
  } else {
    missingMsg = `• La cuenta de destino "*${toQuery}*" no existe o fue eliminada.`;
  }
  return (
    `⚠️ *Error en Transferencia*\n\n` +
    `${missingMsg}\n\n` +
    `💳 *Tus cuentas activas disponibles son:*\n` +
    `${lines.join("\n")}\n\n` +
    `💡 Por favor verifica el nombre o agrega la cuenta desde el panel web.`
  );
}

export function syncBotToken(): string {
  const currentToken =
    integrationsVault.getTelegramToken() ||
    process.env.TELEGRAM_BOT_TOKEN ||
    "PLACEHOLDER_TOKEN_FOR_DEV_INIT";

  if (currentToken && (bot.api as any).token !== currentToken) {
    (bot.api as any).token = currentToken;
    (bot as any).token = currentToken;

    if (currentToken !== "PLACEHOLDER_TOKEN_FOR_DEV_INIT") {
      bot.api.setMyCommands([
        { command: "ingreso", description: "Registrar ingreso: /ingreso [monto] [cuenta] [desc]" },
        { command: "gasto", description: "Registrar gasto: /gasto [monto] [cuenta] [desc]" },
        { command: "transferir", description: "Transferir: /transferir [monto] [origen] a [destino]" },
        { command: "saldo", description: "Ver saldos de todas mis cuentas" },
        { command: "ultimos", description: "Ver últimos 5 movimientos" },
        { command: "deshacer", description: "Revertir último movimiento" },
        { command: "resumen", description: "Resumen mensual ingresos vs gastos" },
        { command: "metas", description: "Ver mis metas de ahorro" },
        { command: "comandos", description: "Ver guía completa de comandos" },
      ]).catch(() => {});
    }
  }
  return currentToken;
}

/**
 * Control de acceso: Whitelist Middleware
 * Rejects any incoming message if the sender Telegram User ID does not match
 * the authorized owner ID configured in settings.
 */
bot.use(async (ctx, next) => {
  syncBotToken();
  const allowedUserId =
    integrationsVault.getTelegramAllowedUserId() ||
    process.env.TELEGRAM_ALLOWED_USER_ID;

  const senderId = String(ctx.from?.id || "");
  const chatId = String(ctx.chat?.id || "");

  if (allowedUserId) {
    if (senderId !== String(allowedUserId)) {
      console.warn(`[TELEGRAM AUTH] Acceso no autorizado desde User ID: ${senderId}`);
      if (ctx.chat?.id) {
        await ctx.reply(
          "⛔ *Acceso Denegado*\n\n" +
            "Este bot de finanzas personales es privado y responde únicamente a su titular autorizado.\n" +
            `Tu ID de Telegram (\`${senderId || "Desconocido"}\`) no tiene permisos de acceso.`,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }
  } else if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    // If no allowedUserId is configured yet in production, enforce explicit linking via token
    const linked = telegramLinkManager.getUserIdByChatId(chatId);
    const isStartWithToken =
      ctx.message &&
      "text" in ctx.message &&
      typeof ctx.message.text === "string" &&
      ctx.message.text.trim().startsWith("/start") &&
      ctx.message.text.trim().split(/\s+/).length > 1;

    if (!linked && !isStartWithToken) {
      if (ctx.chat?.id) {
        await ctx.reply(
          "🔒 *Acceso Restringido*\n\n" +
            "Este bot es de uso privado. Para vincular tu cuenta, utiliza el enlace seguro generado desde el panel web de Ajustes o configura `TELEGRAM_ALLOWED_USER_ID` en el servidor.",
          { parse_mode: "Markdown" }
        );
      }
      return;
    }
  }

  await next();
});

/**
 * Resolves the authenticated user ID for this Telegram chat.
 * Maps to linked user ID or primary owner when authorized by whitelist.
 */
function resolveUserId(chatId: string): string {
  const linked = telegramLinkManager.getUserIdByChatId(chatId);
  if (linked) return linked;
  return "usr_master_01";
}

// 1. /start command — handles account linking & interactive menu
bot.command("start", async (ctx) => {
  if (!ctx.chat?.id) return;
  const payload = ctx.match?.trim();
  const chatId = String(ctx.chat.id);
  const username = ctx.from?.username;

  const mainMenuKeyboard = new InlineKeyboard()
    .text("➕ Agregar Dinero", "quick:income")
    .text("➖ Quitar Dinero", "quick:expense")
    .row()
    .text("🔄 Transferir", "quick:transfer")
    .text("💳 Ver Saldos", "quick:balance")
    .row()
    .text("🎯 Metas", "quick:goals")
    .text("📊 Resumen", "quick:summary")
    .row()
    .text("📋 Últimos", "quick:recent")
    .text("↩️ Deshacer", "quick:undo");

  if (payload) {
    const result = telegramLinkManager.linkUserWithChat(payload, chatId, username);
    if (result.success) {
      await ctx.reply(
        `✅ *¡Cuenta vinculada con éxito!*\n\n` +
          `Hola ${ctx.from?.first_name || "Admin"}, tu Telegram está conectado a tu panel numa.\n\n` +
          `Puedes usar los botones directos de abajo, escribir comandos o hablar en lenguaje natural:`,
        {
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard,
        }
      );
      return;
    } else {
      await ctx.reply(
        "❌ *Enlace de vinculación inválido o expirado*\n\n" +
          "Por favor genera un nuevo código o enlace de vinculación desde el panel web (Ajustes -> Integraciones).",
        { parse_mode: "Markdown" }
      );
      return;
    }
  }

  // Ensure linked
  resolveUserId(chatId);
  await ctx.reply(
    `👋 *¡Hola, ${ctx.from?.first_name || "Admin"}!*\n\n` +
      `Tu bot de finanzas personales *numa* está listo.\n\n` +
      `Toca cualquier opción rápida o escríbeme directamente como prefieras:\n` +
      `• *En lenguaje natural:* _"Agrega 50 a Yappy"_, _"Quita 20 de Efectivo"_, _"Pasa 30 de Banistmo a Yappy"_\n` +
      `• *Atajos rápidos:* \`+50 yappy\`, \`-12 efectivo Almuerzo\`\n` +
      `• *Comandos:* \`/ingreso\`, \`/gasto\`, \`/transferir\`, \`/saldo\`, \`/metas\`\n` +
      `• *Fotos:* Envíame una foto de factura y la registraré automáticamente`,
    {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard,
    }
  );
});

// Interactive Menu Callback Queries
bot.callbackQuery(/^quick:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const action = ctx.match[1];
  const chatId = String(ctx.chat?.id || "");
  const userId = resolveUserId(chatId);

  switch (action) {
    case "income":
      await ctx.reply(
        `➕ *Agregar Dinero (Ingreso):*\n\n` +
          `Puedes responder con cualquiera de estas opciones:\n` +
          `1️⃣ *Lenguaje natural:* _"Agrega 50 a Yappy"_ o _"Ingresa 100 en Banistmo"_\n` +
          `2️⃣ *Atajo rápido:* \`+50 yappy Salario\`\n` +
          `3️⃣ *Comando:* \`/ingreso 50 yappy Salario\``,
        { parse_mode: "Markdown" }
      );
      break;

    case "expense":
      await ctx.reply(
        `➖ *Quitar Dinero (Gasto):*\n\n` +
          `Puedes responder con cualquiera de estas opciones:\n` +
          `1️⃣ *Lenguaje natural:* _"Quita 20 de Efectivo para compra de pan"_ o _"Gasté 12 en almuerzo con Yappy"_\n` +
          `2️⃣ *Atajo rápido:* \`-12 efectivo Almuerzo\` o _"Compra de pan -20$"_\n` +
          `3️⃣ *Comando:* \`/gasto 12 efectivo Almuerzo\`\n` +
          `4️⃣ *Foto:* O envíame directamente la foto del recibo o factura 📸`,
        { parse_mode: "Markdown" }
      );
      break;

    case "transfer":
      await ctx.reply(
        `🔄 *Transferir entre Cuentas:*\n\n` +
          `• *Lenguaje natural:* _"Transfiere 50 de Banistmo a Yappy"_ o _"Pasa 20 de Caja a Efectivo"_\n` +
          `• *Comando:* \`/transferir 50 banistmo a yappy\``,
        { parse_mode: "Markdown" }
      );
      break;

    case "balance": {
      const accounts = financialService.getAccountsByUser(userId);
      if (accounts.length === 0) {
        await ctx.reply("ℹ️ No tienes cuentas registradas aún.");
        return;
      }
      let totalCents = 0;
      const lines = accounts.map((a) => {
        totalCents += Math.round(parseFloat(a.currentBalance) * 100);
        return `• *${a.name}*: $${a.currentBalance} ${a.currency}`;
      });
      const totalStr = (totalCents / 100).toFixed(2);
      await ctx.reply(
        `💳 *Tus Billeteras y Cuentas:*\n\n${lines.join("\n")}\n\n` +
          `💰 *Patrimonio Líquido Total:* *$${totalStr} USD*`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "goals": {
      const goals = financialService.getGoalsByUser(userId);
      if (goals.length === 0) {
        await ctx.reply(
          `🎯 *Metas de Ahorro:*\n\nNo tienes metas activas. Puedes crear una escribiendo:\n_"Crear meta: Laptop M4 $2200 para Diciembre 2027"_`,
          { parse_mode: "Markdown" }
        );
        return;
      }
      const lines = goals.map((g) => {
        const cur = parseFloat(g.currentAmount);
        const tar = parseFloat(g.targetAmount);
        const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
        const remaining = Math.max(0, tar - cur).toFixed(2);
        const check = cur >= tar ? "🎉 (¡Completada!)" : `(Faltan $${remaining})`;
        return `🎯 *${g.name}*\n   $${g.currentAmount} / $${g.targetAmount} USD (${pct}%) ${check}`;
      });
      await ctx.reply(`🎯 *Tus Metas de Ahorro:*\n\n${lines.join("\n\n")}\n\n💡 _Para abonar: "Aportar $50 a meta [Nombre]"_`, { parse_mode: "Markdown" });
      break;
    }

    case "summary": {
      const metrics = financialService.getConsolidatedMetrics(userId);
      await ctx.reply(
        `📊 *Resumen Financiero del Mes:*\n\n` +
          `• *Ingresos:* $${metrics.totalIncome} USD\n` +
          `• *Gastos:* $${metrics.totalExpenses} USD\n` +
          `• *Ahorro Neto:* $${metrics.netSavings} USD\n` +
          `• *Tasa de Ahorro:* ${metrics.savingsRatePct}%`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "recent": {
      const txs = financialService.getTransactionsByUser(userId).slice(0, 5);
      if (txs.length === 0) {
        await ctx.reply("ℹ️ No tienes movimientos registrados aún.");
        return;
      }
      const lines = txs.map((t, idx) => {
        const acc = financialService.getAccount(t.accountId);
        const sign = t.type === "income" ? "🟢 +" : t.type === "expense" ? "🔴 -" : "🔄 ";
        const dateStr = t.date.slice(5, 10);
        return `${idx + 1}. *${t.description}*\n   ${sign}$${t.amount} USD • ${acc?.name || t.accountId} • _${dateStr}_`;
      });
      await ctx.reply(
        `📋 *Últimos 5 Movimientos:*\n\n${lines.join("\n\n")}\n\n💡 _Escribe /deshacer para revertir el último_`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "undo": {
      const result = await financialService.undoLastTransaction(userId);
      if (!result.success || !result.undoneTx) {
        await ctx.reply("ℹ️ No hay movimientos registrados para revertir.");
        return;
      }
      const tx = result.undoneTx;
      const acc = financialService.getAccount(tx.accountId);
      const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
      await ctx.reply(
        `🗑️ *Último Movimiento Revertido:*\n\n` +
          `• *Concepto:* ${tx.description}\n` +
          `• *Monto revertido:* ${sign}$${tx.amount} USD\n` +
          `• *Cuenta restaurada:* ${acc?.name || tx.accountId} (Saldo actual: $${acc?.currentBalance ?? "0.00"} USD)\n\n` +
          `✅ Recalculado en tu base de datos y panel web.`,
        { parse_mode: "Markdown" }
      );
      break;
    }
  }
});

// 2. /ingreso, /deposito, /mas
bot.command(["ingreso", "deposito", "mas"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);
  const match = ctx.match?.trim() || "";

  if (!match) {
    await ctx.reply(
      `ℹ️ *Comando Rápido de Ingreso:*\n\n` +
        `*Formato:* \`/ingreso <monto> [cuenta] [concepto]\`\n\n` +
        `*Ejemplos:*\n` +
        `• \`/ingreso 50 yappy Salario\`\n` +
        `• \`/ingreso 100 banistmo Honorarios\`\n` +
        `• \`/ingreso 25 efectivo Venta ropa\`\n` +
        `• O escribe directamente: \`+50 yappy Salario\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const { amount, accountQuery, description } = parseQuickCommandArgs(match);
  if (!amount || parseFloat(amount) <= 0) {
    await ctx.reply("⚠️ Indica un monto numérico válido. Ejemplo: `/ingreso 50 yappy Salario`", { parse_mode: "Markdown" });
    return;
  }

  const targetAccount = financialService.findAccountByQuery(userId, accountQuery, { strict: !!accountQuery });
  if (!targetAccount) {
    await ctx.reply(formatAccountNotFoundError(userId, accountQuery || "principal"), { parse_mode: "Markdown" });
    return;
  }

  const finalDesc = description || `Depósito en ${targetAccount.name}`;

  try {
    const saved = await financialService.recordTransaction(userId, {
      amount,
      type: "income",
      description: finalDesc,
      accountId: targetAccount.id,
      date: new Date().toISOString(),
      source: "telegram",
    });

    await ctx.reply(
      `🟢 *Ingreso Registrado con Éxito:*\n\n` +
        `• *Monto:* +$${saved.amount} USD\n` +
        `• *Cuenta:* ${targetAccount.name}\n` +
        `• *Concepto:* ${saved.description}\n` +
        `• *Nuevo Saldo:* $${targetAccount.currentBalance} USD\n\n` +
        `✅ Actualizado inmediatamente en tu panel web.\n` +
        `💡 _Si te equivocaste, escribe /deshacer para borrarlo._`,
      { parse_mode: "Markdown" }
    );
  } catch (err: any) {
    await ctx.reply(`❌ Error al registrar ingreso: ${err.message}`);
  }
});

// 3. /gasto, /menos, /pago
bot.command(["gasto", "menos", "pago"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);
  const match = ctx.match?.trim() || "";

  if (!match) {
    await ctx.reply(
      `ℹ️ *Comando Rápido de Gasto:*\n\n` +
        `*Formato:* \`/gasto <monto> [cuenta] [concepto]\`\n\n` +
        `*Ejemplos:*\n` +
        `• \`/gasto 12 efectivo Almuerzo\`\n` +
        `• \`/gasto 5.50 yappy Panadería\`\n` +
        `• \`/gasto 40 banistmo Gasolina\`\n` +
        `• O escribe directamente: \`-12 efectivo Almuerzo\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const { amount, accountQuery, description } = parseQuickCommandArgs(match);
  if (!amount || parseFloat(amount) <= 0) {
    await ctx.reply("⚠️ Indica un monto numérico válido. Ejemplo: `/gasto 12 efectivo Almuerzo`", { parse_mode: "Markdown" });
    return;
  }

  const targetAccount = financialService.findAccountByQuery(userId, accountQuery, { strict: !!accountQuery });
  if (!targetAccount) {
    await ctx.reply(formatAccountNotFoundError(userId, accountQuery || "principal"), { parse_mode: "Markdown" });
    return;
  }

  const finalDesc = description || "Gasto manual";

  try {
    const saved = await financialService.recordTransaction(userId, {
      amount,
      type: "expense",
      description: finalDesc,
      accountId: targetAccount.id,
      date: new Date().toISOString(),
      source: "telegram",
    });

    await ctx.reply(
      `🔴 *Gasto Registrado con Éxito:*\n\n` +
        `• *Monto:* -$${saved.amount} USD\n` +
        `• *Cuenta:* ${targetAccount.name}\n` +
        `• *Concepto:* ${saved.description}\n` +
        `• *Nuevo Saldo:* $${targetAccount.currentBalance} USD\n\n` +
        `✅ Actualizado inmediatamente en tu panel web.\n` +
        `💡 _Si te equivocaste, escribe /deshacer para borrarlo._`,
      { parse_mode: "Markdown" }
    );
  } catch (err: any) {
    await ctx.reply(`❌ Error al registrar gasto: ${err.message}`);
  }
});

// 4. /transferir, /transferencia, /pasa
bot.command(["transferir", "transferencia", "pasa"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);
  const match = ctx.match?.trim() || "";

  if (!match) {
    await ctx.reply(
      `ℹ️ *Comando de Transferencia entre Cuentas:*\n\n` +
        `*Formato:* \`/transferir <monto> <origen> a <destino>\`\n\n` +
        `*Ejemplos:*\n` +
        `• \`/transferir 50 banistmo a yappy\`\n` +
        `• \`/transferir 20 caja efectivo\`\n` +
        `• \`/transferir 100 paypal banistmo\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Filter out filler words "de" and "a"
  const tokens = match.split(/\s+/).filter((w) => {
    const l = w.toLowerCase();
    return l !== "de" && l !== "a" && l !== "hacia";
  });

  const amountToken = tokens[0]?.replace(/^\$/, "").replace(/\$$/, "");
  const fromQuery = tokens[1];
  const toQuery = tokens[2];

  if (!amountToken || isNaN(parseFloat(amountToken)) || !fromQuery || !toQuery) {
    await ctx.reply(
      `⚠️ Formato incorrecto. Ejemplo correcto:\n\`/transferir 50 banistmo a yappy\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const sourceAccount = financialService.findAccountByQuery(userId, fromQuery, { strict: true });
  const destAccount = financialService.findAccountByQuery(userId, toQuery, { strict: true });

  if (!sourceAccount || !destAccount) {
    await ctx.reply(
      formatTransferAccountsError(userId, fromQuery, toQuery, !!sourceAccount, !!destAccount),
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (sourceAccount.id === destAccount.id) {
    await ctx.reply("⚠️ La cuenta de origen y de destino no pueden ser la misma.");
    return;
  }

  try {
    const amount = parseFloat(amountToken).toFixed(2);
    await financialService.recordTransaction(userId, {
      amount,
      type: "transfer",
      description: `Transferencia: ${sourceAccount.name} → ${destAccount.name}`,
      accountId: sourceAccount.id,
      toAccountId: destAccount.id,
      date: new Date().toISOString(),
      source: "telegram",
    });

    await ctx.reply(
      `🔄 *Transferencia Realizada:*\n\n` +
        `• *Monto:* $${amount} USD\n` +
        `• *De:* ${sourceAccount.name} (Saldo: $${sourceAccount.currentBalance} USD)\n` +
        `• *A:* ${destAccount.name} (Saldo: $${destAccount.currentBalance} USD)\n\n` +
        `✅ Actualizado inmediatamente en tu panel web.`,
      { parse_mode: "Markdown" }
    );
  } catch (err: any) {
    await ctx.reply(`❌ Error en la transferencia: ${err.message}`);
  }
});

// 5. /deshacer, /borrar, /undo
bot.command(["deshacer", "borrar", "undo"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  const result = await financialService.undoLastTransaction(userId);
  if (!result.success || !result.undoneTx) {
    await ctx.reply("ℹ️ No hay movimientos registrados para revertir.");
    return;
  }

  const tx = result.undoneTx;
  const acc = financialService.getAccount(tx.accountId);
  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";

  await ctx.reply(
    `🗑️ *Último Movimiento Revertido y Eliminado:*\n\n` +
      `• *Concepto:* ${tx.description}\n` +
      `• *Monto revertido:* ${sign}$${tx.amount} USD\n` +
      `• *Cuenta restaurada:* ${acc?.name || tx.accountId} (Saldo actual: $${acc?.currentBalance ?? "0.00"} USD)\n\n` +
      `✅ El saldo ha sido recalculado en la base de datos y panel web.`,
    { parse_mode: "Markdown" }
  );
});

// 6. /ultimos, /movimientos, /historial
bot.command(["ultimos", "movimientos", "historial"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  const txs = financialService.getTransactionsByUser(userId).slice(0, 5);
  if (txs.length === 0) {
    await ctx.reply("ℹ️ No tienes movimientos registrados aún. Puedes agregar uno con `/ingreso 50 yappy` o `/gasto 10 efectivo`.", { parse_mode: "Markdown" });
    return;
  }

  const lines = txs.map((t, idx) => {
    const acc = financialService.getAccount(t.accountId);
    const sign = t.type === "income" ? "🟢 +" : t.type === "expense" ? "🔴 -" : "🔄 ";
    const dateStr = t.date.slice(5, 10);
    return `${idx + 1}. *${t.description}*\n   ${sign}$${t.amount} USD • ${acc?.name || t.accountId} • _${dateStr}_`;
  });

  await ctx.reply(
    `📋 *Últimos 5 Movimientos Registrados:*\n\n${lines.join("\n\n")}\n\n` +
      `💡 _Para revertir el último movimiento escribe /deshacer_`,
    { parse_mode: "Markdown" }
  );
});

// 7. /saldo command
bot.command(["saldo", "cuentas"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  const accounts = financialService.getAccountsByUser(userId);
  if (accounts.length === 0) {
    await ctx.reply("ℹ️ No tienes cuentas registradas aún en el sistema.");
    return;
  }

  let totalCents = 0;
  const lines = accounts.map((a) => {
    totalCents += Math.round(parseFloat(a.currentBalance) * 100);
    return `• *${a.name}*: $${a.currentBalance} ${a.currency}`;
  });

  const totalStr = (totalCents / 100).toFixed(2);
  await ctx.reply(
    `💳 *Tus Billeteras y Cuentas Disponibles:*\n\n${lines.join("\n")}\n\n` +
      `💰 *Patrimonio Líquido Total:* *$${totalStr} USD*`,
    { parse_mode: "Markdown" }
  );
});

// 8. /metas command
bot.command("metas", async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  const goals = financialService.getGoalsByUser(userId);
  if (goals.length === 0) {
    await ctx.reply("🎯 No tienes metas activas. Puedes crear una escribiendo:\n_\"Crear meta: Fondo de Viaje $1500\"_", { parse_mode: "Markdown" });
    return;
  }

  const lines = goals.map((g) => {
    const cur = parseFloat(g.currentAmount);
    const tar = parseFloat(g.targetAmount);
    const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
    const remaining = Math.max(0, tar - cur).toFixed(2);
    const check = cur >= tar ? "🎉 (¡Completada!)" : `(Faltan $${remaining})`;
    return `🎯 *${g.name}*\n   $${g.currentAmount} / $${g.targetAmount} USD (${pct}%) ${check}\n   _Fecha objetivo: ${g.targetDate || "Sin fecha"}_`;
  });

  await ctx.reply(`🎯 *Tus Metas de Ahorro:*\n\n${lines.join("\n\n")}`, { parse_mode: "Markdown" });
});

// 9. /resumen command
bot.command("resumen", async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  const metrics = financialService.getConsolidatedMetrics(userId);
  await ctx.reply(
    `📊 *Resumen Financiero del Mes:*\n\n` +
      `• *Ingresos Totales:* $${metrics.totalIncome} USD\n` +
      `• *Gastos Totales:* $${metrics.totalExpenses} USD\n` +
      `• *Ahorro Neto Real:* $${metrics.netSavings} USD\n` +
      `• *Tasa de Ahorro:* ${metrics.savingsRatePct}%`,
    { parse_mode: "Markdown" }
  );
});

// 10. /ayuda and /comandos command
bot.command(["ayuda", "comandos"], async (ctx) => {
  await ctx.reply(
    `📖 *Guía de Comandos Rápidos — numa Bot:*\n\n` +
      `💰 *Registrar Dinero (Comandos Directos):*\n` +
      `• \`/ingreso 50 yappy Salario\` — Suma $50 a Yappy\n` +
      `• \`/gasto 12 efectivo Almuerzo\` — Resta $12 de Efectivo\n` +
      `• \`/transferir 20 banistmo a yappy\` — Mueve saldo entre cuentas\n` +
      `• \`/deshacer\` — Borra el último movimiento y revierte el saldo\n` +
      `• \`/ultimos\` — Muestra los últimos 5 movimientos registrados\n\n` +
      `⚡ *Atajos Rápidos (Sin escribir /comando):*\n` +
      `• \`+50 yappy Salario\` (agrega ingreso)\n` +
      `• \`-15 efectivo Almuerzo\` (registra gasto)\n\n` +
      `📸 *Fotos de Facturas / Recibos:*\n` +
      `• Envía una foto del ticket con pie opcional: _"pagué con Yappy"_\n\n` +
      `📊 *Consultas Patrimoniales:*\n` +
      `• \`/saldo\` o \`/cuentas\` — Ver saldos\n` +
      `• \`/resumen\` — Balance del mes (ingresos vs gastos)\n` +
      `• \`/metas\` — Ver progreso de metas de ahorro`,
    { parse_mode: "Markdown" }
  );
});

// 6. PHOTO HANDLER: Gemini Multimodal Vision Receipt & Invoice OCR
bot.on(["message:photo", "message:document"], async (ctx) => {
  if (!ctx.chat?.id) return;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  // Send immediate feedback
  const progressMsg = await ctx.reply("🔍 *Procesando factura con Inteligencia Artificial...*", { parse_mode: "Markdown" });

  try {
    let fileId: string | undefined;
    let mimeType = "image/jpeg";

    if (ctx.message.photo && ctx.message.photo.length > 0) {
      const photos = ctx.message.photo;
      fileId = photos[photos.length - 1].file_id;
    } else if (ctx.message.document) {
      const doc = ctx.message.document;
      if (doc.mime_type && (doc.mime_type.startsWith("image/") || doc.mime_type === "application/pdf")) {
        fileId = doc.file_id;
        mimeType = doc.mime_type;
      }
    }

    if (!fileId) {
      await ctx.api.editMessageText(
        chatId,
        progressMsg.message_id,
        "⚠️ No se pudo procesar la imagen enviada. Por favor envía una foto en formato JPG, PNG o PDF."
      );
      return;
    }

    // Download image file from Telegram
    const file = await ctx.api.getFile(fileId);
    let imageBuffer: Buffer;

    const activeToken = syncBotToken();
    if (file.file_path && activeToken !== "PLACEHOLDER_TOKEN_FOR_DEV_INIT") {
      const fileUrl = `https://api.telegram.org/file/bot${activeToken}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const arrayBuf = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuf);
    } else {
      // Mock buffer for development testing if token is mock
      imageBuffer = Buffer.from("mock_receipt_image_bytes");
    }

    const caption = ctx.message.caption || "";
    const scanned = await receiptScanner.scanReceipt(imageBuffer, mimeType, caption);

    // Resolve target wallet: check caption, scanned payment method, or default to Yappy / Efectivo
    const walletHint = caption || scanned.paymentMethod || "";
    const targetAccount =
      financialService.findAccountByQuery(userId, walletHint) ||
      financialService.findAccountByQuery(userId, "yappy") ||
      financialService.getAccountsByUser(userId)[0];

    if (!targetAccount) {
      await ctx.api.editMessageText(chatId, progressMsg.message_id, "⚠️ No se encontró una cuenta activa para imputar el gasto.");
      return;
    }

    // Record the expense in FinancialService
    const savedTx = await financialService.recordTransaction(userId, {
      amount: scanned.amount.toFixed(2),
      type: "expense",
      description: `${scanned.merchant} — ${scanned.description}`,
      accountId: targetAccount.id,
      date: scanned.date ? `${scanned.date}T12:00:00Z` : new Date().toISOString(),
      source: "telegram",
    });

    const itemsSummary =
      scanned.items && scanned.items.length > 0
        ? `\n*Artículos detectados:*\n` + scanned.items.map((it) => `  • ${it.name}: $${it.price.toFixed(2)}`).join("\n")
        : "";

    await ctx.api.editMessageText(
      chatId,
      progressMsg.message_id,
      `🧾 *Factura Procesada con Éxito:*\n\n` +
        `🔴 *Gasto Registrado:* -$${savedTx.amount} USD\n` +
        `• *Comercio:* ${scanned.merchant}\n` +
        `• *Concepto:* ${scanned.description}\n` +
        `• *Categoría:* ${scanned.category}\n` +
        `• *Billetera debitada:* ${targetAccount.name}\n` +
        `• *Nuevo Saldo:* $${targetAccount.currentBalance} USD\n` +
        `• *Fecha:* ${scanned.date}` +
        itemsSummary +
        `\n\n✅ *Actualizado instantáneamente en tu panel web.*`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    console.error("Error processing photo receipt in Telegram bot:", error);
    await ctx.api.editMessageText(
      chatId,
      progressMsg.message_id,
      `❌ Hubo un error al procesar la factura: ${error.message || "Error desconocido"}.`
    );
  }
});

// 7. Natural language text message handler
bot.on("message:text", async (ctx) => {
  if (!ctx.chat?.id) return;
  const text = ctx.message.text;
  const chatId = String(ctx.chat.id);
  const userId = resolveUserId(chatId);

  const trimmed = text.trim();

  // Fast shortcut: "+50 yappy Salario" or "-12 efectivo Almuerzo"
  if (trimmed.startsWith("+") || (trimmed.startsWith("-") && /^-\s*\d/.test(trimmed))) {
    const isIncome = trimmed.startsWith("+");
    const rest = trimmed.slice(1).trim();
    const { amount, accountQuery, description } = parseQuickCommandArgs(rest);

    if (amount && parseFloat(amount) > 0) {
      const targetAccount = financialService.findAccountByQuery(userId, accountQuery, { strict: !!accountQuery });
      if (!targetAccount) {
        await ctx.reply(formatAccountNotFoundError(userId, accountQuery || "principal"), { parse_mode: "Markdown" });
        return;
      }

      const type = isIncome ? "income" : "expense";
      const finalDesc = description || (isIncome ? `Depósito en ${targetAccount.name}` : "Gasto rápido");

      try {
        const saved = await financialService.recordTransaction(userId, {
          amount,
          type,
          description: finalDesc,
          accountId: targetAccount.id,
          date: new Date().toISOString(),
          source: "telegram",
        });

        const icon = isIncome ? "🟢" : "🔴";
        const sign = isIncome ? "+" : "-";
        const label = isIncome ? "Ingreso" : "Gasto";

        await ctx.reply(
          `${icon} *${label} Registrado con Éxito:*\n\n` +
            `• *Monto:* ${sign}$${saved.amount} USD\n` +
            `• *Cuenta:* ${targetAccount.name}\n` +
            `• *Concepto:* ${saved.description}\n` +
            `• *Nuevo Saldo:* $${targetAccount.currentBalance} USD\n\n` +
            `✅ Sincronizado con tu panel web.\n` +
            `💡 _Si te equivocaste, escribe /deshacer para borrarlo._`,
          { parse_mode: "Markdown" }
        );
        return;
      } catch (err: any) {
        await ctx.reply(`❌ Error al registrar movimiento: ${err.message}`);
        return;
      }
    }
  }

  const parsed = parseTelegramMessage(text);

  // A. Goal Creation: "Nueva meta: Laptop M4 $2200 para Diciembre 2027"
  if (parsed.intent === "create_goal" && parsed.goal) {
    try {
      const newGoal = financialService.createGoal(userId, {
        name: parsed.goal.name,
        targetAmount: parsed.goal.targetAmount,
        targetDate: parsed.goal.targetDate,
      });

      await ctx.reply(
        `🎯 *Meta de Ahorro Creada:*\n\n` +
          `• *Objetivo:* ${newGoal.name}\n` +
          `• *Monto Meta:* $${newGoal.targetAmount} USD\n` +
          `• *Fecha Estimada:* ${newGoal.targetDate || "Diciembre 2027"}\n\n` +
          `Puedes abonar a esta meta en cualquier momento diciendo:\n` +
          `_"Aportar $50 a meta ${newGoal.name}"_`,
        { parse_mode: "Markdown" }
      );
      return;
    } catch (err: any) {
      await ctx.reply(`❌ Error al crear meta: ${err.message}`);
      return;
    }
  }

  // B. Goal Deposit: "Aportar $50 a meta Laptop M4 [desde Banistmo]"
  if (parsed.intent === "deposit_goal" && parsed.goalDeposit) {
    try {
      const targetGoal = financialService.findGoalByQuery(userId, parsed.goalDeposit.goalQuery);
      if (!targetGoal) {
        await ctx.reply(`⚠️ No encontré ninguna meta que coincida con "${parsed.goalDeposit.goalQuery}". Escribe /metas para verlas.`);
        return;
      }

      const sourceAccount = parsed.goalDeposit.fromAccountQuery
        ? financialService.findAccountByQuery(userId, parsed.goalDeposit.fromAccountQuery)
        : undefined;

      const { goal, debitedAccount } = financialService.depositToGoal(
        userId,
        targetGoal.id,
        parsed.goalDeposit.amount,
        sourceAccount?.id
      );

      const tar = parseFloat(goal.targetAmount);
      const cur = parseFloat(goal.currentAmount);
      const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;

      await ctx.reply(
        `🎉 *Aporte Registrado en Meta:*\n\n` +
          `• *Meta:* ${goal.name}\n` +
          `• *Aporte:* +$${parsed.goalDeposit.amount} USD\n` +
          `• *Acumulado:* $${goal.currentAmount} / $${goal.targetAmount} USD (${pct}% completado)\n` +
          (debitedAccount ? `• *Debitado de:* ${debitedAccount.name} (Saldo: $${debitedAccount.currentBalance})\n` : "") +
          `\n✅ Sincronizado con tu panel web.`,
        { parse_mode: "Markdown" }
      );
      return;
    } catch (err: any) {
      await ctx.reply(`❌ Error al registrar aporte: ${err.message}`);
      return;
    }
  }

  // C. Specific Account Balance Query: "¿Cuánto tengo en Yappy?", "¿Cuánto tengo en Banco General?"
  if (parsed.intent === "query_account_balance" && parsed.accountQuery) {
    const acc = financialService.findAccountByQuery(userId, parsed.accountQuery, { strict: true });
    if (acc) {
      await ctx.reply(`💳 *${acc.name}:*\nSaldo disponible: *$${acc.currentBalance} ${acc.currency}*`, { parse_mode: "Markdown" });
      return;
    } else {
      await ctx.reply(formatAccountNotFoundError(userId, parsed.accountQuery), { parse_mode: "Markdown" });
      return;
    }
  }

  // D. Financial Transaction: Expense, Income, or Transfer
  if (parsed.intent === "record_transaction" && parsed.transaction) {
    const tx = parsed.transaction;

    // Handle Transfer
    if (tx.type === "transfer") {
      const sourceAccount = financialService.findAccountByQuery(userId, tx.accountQuery, { strict: true });
      const destAccount = financialService.findAccountByQuery(userId, tx.destAccountQuery, { strict: true });

      if (!sourceAccount || !destAccount) {
        await ctx.reply(
          formatTransferAccountsError(
            userId,
            tx.accountQuery || "origen",
            tx.destAccountQuery || "destino",
            !!sourceAccount,
            !!destAccount
          ),
          { parse_mode: "Markdown" }
        );
        return;
      }
      if (sourceAccount.id === destAccount.id) {
        await ctx.reply("⚠️ La cuenta de origen y de destino no pueden ser la misma.");
        return;
      }

      try {
        await financialService.recordTransaction(userId, {
          amount: tx.amount,
          type: "transfer",
          description: tx.description,
          accountId: sourceAccount.id,
          toAccountId: destAccount.id,
          date: new Date().toISOString(),
          source: "telegram",
        });

        await ctx.reply(
          `🔄 *Transferencia Registrada con Éxito:*\n\n` +
            `• *Monto:* $${tx.amount} USD\n` +
            `• *Desde:* ${sourceAccount.name} (Nuevo saldo: $${sourceAccount.currentBalance})\n` +
            `• *Hacia:* ${destAccount.name} (Nuevo saldo: $${destAccount.currentBalance})\n\n` +
            `✅ Actualizado en tu panel web sin afectar el gasto mensual.`,
          { parse_mode: "Markdown" }
        );
        return;
      } catch (err: any) {
        await ctx.reply(`❌ Error en la transferencia: ${err.message}`);
        return;
      }
    }

    // Handle Income or Expense
    const targetAccount = financialService.findAccountByQuery(userId, tx.accountQuery, { strict: !!tx.accountQuery });
    if (!targetAccount) {
      await ctx.reply(formatAccountNotFoundError(userId, tx.accountQuery || "principal"), { parse_mode: "Markdown" });
      return;
    }

    try {
      const saved = await financialService.recordTransaction(userId, {
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        accountId: targetAccount.id,
        date: new Date().toISOString(),
        source: "telegram",
      });

      const icon = saved.type === "income" ? "🟢" : "🔴";
      const sign = saved.type === "income" ? "+" : "-";
      const actionName = saved.type === "income" ? "Ingreso agregado a" : "Gasto debitado de";

      await ctx.reply(
        `✅ *Movimiento Registrado:*\n\n` +
          `${icon} *${actionName} ${targetAccount.name}:*\n` +
          `• *Monto:* ${sign}$${saved.amount} USD\n` +
          `• *Concepto:* ${saved.description}\n` +
          `• *Nuevo Saldo en cuenta:* $${targetAccount.currentBalance} USD\n\n` +
          `✅ Sincronizado automáticamente con tu panel web.`,
        { parse_mode: "Markdown" }
      );
    } catch (err: any) {
      await ctx.reply(`❌ Error al registrar transacción: ${err.message || "Datos inválidos"}`);
    }
    return;
  }

  // E. Goals list query
  if (parsed.intent === "query_goals") {
    const goals = financialService.getGoalsByUser(userId);
    if (goals.length === 0) {
      await ctx.reply("🎯 Aún no tienes metas de ahorro registradas.");
      return;
    }
    const lines = goals.map((g) => {
      const cur = parseFloat(g.currentAmount);
      const tar = parseFloat(g.targetAmount);
      const pct = tar > 0 ? Math.min(100, Math.round((cur / tar) * 100)) : 0;
      return `• *${g.name}*: $${g.currentAmount} / $${g.targetAmount} (${pct}%)`;
    });
    await ctx.reply(`🎯 *Estado de tus Metas:*\n\n${lines.join("\n")}`, { parse_mode: "Markdown" });
    return;
  }

  // F. Budget remaining query
  if (parsed.intent === "query_budget_remaining") {
    await ctx.reply(
      `🥗 *Presupuesto de ${parsed.queryCategory || "Alimentación"}:*\n` +
        `Límite mensual asignado bajo control en tu panel web. Escribe /resumen para ver el balance mensual consolidado.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Default Guidance
  await ctx.reply(
    `🤔 No estoy seguro de haber entendido tu mensaje.\n\n` +
      `Puedes probar enviando:\n` +
      `• 📷 *Una foto de factura o ticket*\n` +
      `• _"Agrega $50 a Yappy"_\n` +
      `• _"Quita $20 de Efectivo para compra de pan"_\n` +
      `• _"Compra de pan -20$"_\n` +
      `• _"Transfiere $50 de Banistmo a Yappy"_\n` +
      `• _"Crear meta Laptop $2200"_\n` +
      `• _/saldo_ o _/metas_`,
    { parse_mode: "Markdown" }
  );
});
