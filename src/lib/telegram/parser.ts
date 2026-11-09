/**
 * Deterministic Natural Language Parser for Financial Messages in Spanish
 * 
 * Provides immediate regex/pattern based interpretation for Telegram & Assistant input.
 * Supports:
 * - Specific wallet targeting for incomes & expenses ("Agrega $50 a Yappy", "Quita $20 de Efectivo")
 * - Direct minus notation ("Compra de pan -20$")
 * - Transfers between wallets ("Transfiere $50 de Banistmo a Yappy")
 * - Savings goals management ("Crear meta Laptop $2200", "Aportar $50 a meta Laptop")
 * - Specific wallet balance queries ("¿Cuánto tengo en Yappy?")
 */

export interface ParsedTelegramIntent {
  intent:
    | "record_transaction"
    | "create_goal"
    | "deposit_goal"
    | "query_goals"
    | "query_account_balance"
    | "query_category_spending"
    | "query_budget_remaining"
    | "query_period_comparison"
    | "query_balance"
    | "unknown";
  transaction?: {
    type: "income" | "expense" | "transfer";
    amount: string;
    description: string;
    accountQuery?: string;
    destAccountQuery?: string;
  };
  goal?: {
    name: string;
    targetAmount: string;
    targetDate?: string;
  };
  goalDeposit?: {
    goalQuery: string;
    amount: string;
    fromAccountQuery?: string;
  };
  accountQuery?: string;
  queryCategory?: string;
  rawText: string;
}

const WALLET_KEYWORDS = [
  "banco general",
  "banco nacional",
  "bac credomatic",
  "caja de ahorros",
  "global bank",
  "punto pago",
  "puntopago",
  "credomatic",
  "banistmo",
  "general",
  "nacional",
  "banisi",
  "global",
  "paypal",
  "efectivo",
  "billetera",
  "bolsillo",
  "nomina",
  "nómina",
  "ahorro",
  "corriente",
  "yappy",
  "caja",
  "cash",
  "bnp",
  "bac",
  "bg",
];

function extractWalletMention(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const w of WALLET_KEYWORDS) {
    if (new RegExp(`\\b${w}\\b`, "i").test(lower)) {
      return w;
    }
  }
  return undefined;
}

export function parseTelegramMessage(text: string): ParsedTelegramIntent {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check for period comparison query
  if (lower.includes("compara") && (lower.includes("mes") || lower.includes("gastos"))) {
    return {
      intent: "query_period_comparison",
      rawText: trimmed,
    };
  }

  // 2. Goals list query
  if (
    lower === "/metas" ||
    lower === "metas" ||
    lower.includes("mis metas") ||
    lower.includes("cómo van mis metas") ||
    lower.includes("como van mis metas") ||
    lower.includes("ver metas")
  ) {
    return {
      intent: "query_goals",
      rawText: trimmed,
    };
  }

  // 3. Goal Creation: "Nueva meta: Laptop M4 $2200 para Diciembre 2027", "Crear meta Fondo $1500"
  const createGoalMatch = trimmed.match(
    /(?:nueva\s+meta(?::|\s+de)?|crear\s+meta(?::|\s+de)?)\s+([^$]+?)\s+\$?\s*(\d+(?:[.,]\d{1,2})?)(?:\s+(?:para|en)\s+(.+))?/i
  );
  if (createGoalMatch) {
    const name = createGoalMatch[1].trim().replace(/^de\s+/i, "");
    const amount = parseFloat(createGoalMatch[2].replace(",", ".")).toFixed(2);
    const date = createGoalMatch[3]?.trim();
    return {
      intent: "create_goal",
      goal: {
        name,
        targetAmount: amount,
        targetDate: date,
      },
      rawText: trimmed,
    };
  }

  // 4. Goal Deposit: "Aportar $50 a meta Laptop M4 [desde Banistmo]", "Abona $100 a meta Viaje"
  const depositGoalMatch = trimmed.match(
    /(?:aportar?|abonar?|depositar?)\s+\$?\s*(\d+(?:[.,]\d{1,2})?)\s+(?:a(?:\s+la)?\s+meta|para(?:\s+la)?\s+meta)\s+([^desde]+?)(?:\s+desde\s+([\w\s]+))?$/i
  );
  if (depositGoalMatch) {
    const amount = parseFloat(depositGoalMatch[1].replace(",", ".")).toFixed(2);
    const goalQuery = depositGoalMatch[2].trim();
    const fromAccountQuery = depositGoalMatch[3]?.trim();
    return {
      intent: "deposit_goal",
      goalDeposit: {
        amount,
        goalQuery,
        fromAccountQuery,
      },
      rawText: trimmed,
    };
  }

  // 5. Transfer between wallets: "Transfiere $50 de Banistmo a Yappy", "Pasa $100 de Caja a Efectivo", "Mueve $25 de Punto Pago a Yappy"
  const transferMatch = trimmed.match(
    /^(?:podr[íi]as\s+|puedes\s+|por\s+favor\s+)?(?:transfi?ere|pasa|mueve)\s+\$?\s*(\d+(?:[.,]\d{1,2})?)\s+de\s+([\w\s]+?)\s+a\s+([\w\s]+)/i
  );
  if (transferMatch) {
    const rawAmount = parseFloat(transferMatch[1].replace(",", ".")).toFixed(2);
    const source = transferMatch[2].trim();
    const dest = transferMatch[3].trim();
    return {
      intent: "record_transaction",
      transaction: {
        type: "transfer",
        amount: rawAmount,
        accountQuery: source,
        destAccountQuery: dest,
        description: `Transferencia de ${source} a ${dest}`,
      },
      rawText: trimmed,
    };
  }

  // 6. Specific Account Balance Query: "¿Cuánto tengo en Yappy?", "Saldo de Banistmo", "¿Cuánto tengo en Banco General?"
  const accountBalanceMatch = lower.match(
    /(?:cu[aá]nto\s+tengo\s+en\s+|saldo\s+(?:de\s+)?)(banco\s+general|banco\s+nacional|bac(?:\s+credomatic)?|global(?:\s+bank)?|banisi|banistmo|caja(?:\s+de\s+ahorros)?|yappy|punto\s+pago|puntopago|paypal|efectivo|general|nacional|credomatic|bnp|bg)\??/i
  );
  if (accountBalanceMatch) {
    return {
      intent: "query_account_balance",
      accountQuery: accountBalanceMatch[1].trim(),
      rawText: trimmed,
    };
  }

  // 7. Check for budget remaining query
  const budgetMatch = lower.match(/(?:cu[aá]nto\s+me\s+queda\s+(?:del\s+presupuesto\s+de|de)\s+)([\wáéíóúñ\s]+)\??/i);
  if (budgetMatch) {
    const category = budgetMatch[1].trim().replace(/\?$/, "");
    return {
      intent: "query_budget_remaining",
      queryCategory: category,
      rawText: trimmed,
    };
  }

  // 8. Check for category spending query
  const categorySpendingMatch = lower.match(/(?:cu[aá]nto\s+gast[eé]\s+en\s+)([\wáéíóúñ]+)/i);
  if (categorySpendingMatch) {
    const category = categorySpendingMatch[1].trim();
    return {
      intent: "query_category_spending",
      queryCategory: category,
      rawText: trimmed,
    };
  }

  // 9. Negative notation expense: e.g. "compra de pan -20$", "supermercado -$45.50"
  const negativeMatch = trimmed.match(/^(.+?)\s*-\s*\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?$/i);
  if (negativeMatch) {
    const description = negativeMatch[1].trim();
    const rawAmount = parseFloat(negativeMatch[2].replace(",", ".")).toFixed(2);
    const accountQuery = extractWalletMention(description) || "Efectivo";
    return {
      intent: "record_transaction",
      transaction: {
        type: "expense",
        amount: rawAmount,
        description,
        accountQuery,
      },
      rawText: trimmed,
    };
  }

  // 10. "Quitar dinero de billetera": e.g. "Quita $20 de Efectivo para compra de pan", "podrías quitar 50 de yappy"
  const removeMoneyMatch = trimmed.match(
    /^(?:podr[íi]as\s+|puedes\s+|por\s+favor\s+)?(?:quita(?:r)?|descuenta|descontar|resta(?:r)?|saca(?:r)?)\s+\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:d[oó]lares|usd)?(?:\s+(?:de\s+)?([\w\s]+?))?(?:\s+(?:para|por|en)\s+(.+))?$/i
  );
  if (removeMoneyMatch) {
    const amount = parseFloat(removeMoneyMatch[1].replace(",", ".")).toFixed(2);
    const rawAccount = removeMoneyMatch[2]?.trim();
    const accountQuery = rawAccount || "Efectivo";
    const description = removeMoneyMatch[3]?.trim() || `Retiro de ${accountQuery}`;
    return {
      intent: "record_transaction",
      transaction: {
        type: "expense",
        amount,
        description,
        accountQuery,
      },
      rawText: trimmed,
    };
  }

  // 11. "Agregar / Registrar dinero a billetera": e.g. "Registra 20 dólares a yappy", "Agrega $50 a Yappy", "podrías agregar 50 yappy"
  const addMoneyMatch = trimmed.match(
    /^(?:podr[íi]as\s+|puedes\s+|por\s+favor\s+)?(?:registra(?:r)?|anota(?:r)?|agrega(?:r)?|a[ñn]ade|a[ñn]adir|mete(?:r)?|ingresa(?:r)?|deposita(?:r)?)\s+\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:d[oó]lares|usd)?(?:\s+(?:(?:a|en)\s+)?([\w\s]+?))?(?:\s+(?:por|de|concepto|en concepto de)\s+(.+))?$/i
  );
  if (addMoneyMatch) {
    const amount = parseFloat(addMoneyMatch[1].replace(",", ".")).toFixed(2);
    const rawAccount = addMoneyMatch[2]?.trim();
    const accountQuery = rawAccount || "Yappy";
    const description = addMoneyMatch[3]?.trim() || `Depósito en ${accountQuery}`;
    return {
      intent: "record_transaction",
      transaction: {
        type: "income",
        amount,
        description,
        accountQuery,
      },
      rawText: trimmed,
    };
  }

  // 12. Standard expense parsing with optional wallet:
  // "Gasté $7.50 en almuerzo con Yappy", "Pagué $12.99 por Spotify", "Registra gasto de $15 en panadería", "Gasté 10 con Yappy"
  const expenseRegex = /(?:registra(?:r)?\s+(?:un\s+)?gasto(?:\s+de)?|gast[eé]|pagu[eé]|compr[eé]|gasto(?:\s+de)?)\s*\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:d[oó]lares|usd)?\s*(?:en|por|con|de)?\s*(.+)/i;
  const expenseMatch = trimmed.match(expenseRegex);
  if (expenseMatch) {
    const normalizedNum = expenseMatch[1].replace(",", ".");
    const rawAmount = parseFloat(normalizedNum).toFixed(2);
    let description = expenseMatch[2].trim().replace(/[.,;]$/, "");

    // Check if wallet is mentioned (e.g. "almuerzo con Yappy", "gasolina desde Banistmo", "con Yappy")
    let accountQuery = extractWalletMention(description);
    if (accountQuery) {
      // Clean description
      const cleaned = description.replace(new RegExp(`(?:con|desde|en|de)?\\s*${accountQuery}`, "i"), "").trim();
      description = cleaned || `Gasto con ${accountQuery}`;
    }

    return {
      intent: "record_transaction",
      transaction: {
        type: "expense",
        amount: rawAmount,
        description,
        accountQuery,
      },
      rawText: trimmed,
    };
  }

  // 13. Standard income parsing:
  // "Recibí $120 por una tutoría en Yappy", "Registra ingreso de 500 en Caja de Ahorros"
  const incomeRegex = /(?:registra(?:r)?\s+(?:un\s+)?ingreso(?:\s+de)?|recib[ií]|ingres[eé]|ingreso(?:\s+de)?|cobr[eé]|abon[eé]|deposit[eé])\s*\$?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:d[oó]lares|usd)?\s*(?:por|de|en)?\s*(.+)/i;
  const incomeMatch = trimmed.match(incomeRegex);
  if (incomeMatch) {
    const normalizedNum = incomeMatch[1].replace(",", ".");
    const rawAmount = parseFloat(normalizedNum).toFixed(2);
    let description = incomeMatch[2].trim().replace(/[.,;]$/, "");

    let accountQuery = extractWalletMention(description);
    if (accountQuery) {
      description = description.replace(new RegExp(`\\s+(?:a|en|con|hacia)\\s+${accountQuery}`, "i"), "").trim();
    }

    return {
      intent: "record_transaction",
      transaction: {
        type: "income",
        amount: rawAmount,
        description,
        accountQuery,
      },
      rawText: trimmed,
    };
  }

  return {
    intent: "unknown",
    rawText: trimmed,
  };
}
