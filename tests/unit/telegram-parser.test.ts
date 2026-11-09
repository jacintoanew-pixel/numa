import { describe, it, expect } from "vitest";
import { parseTelegramMessage } from "@/lib/telegram/parser";

describe("Telegram Financial Message Parser (Deterministic Local Parser)", () => {
  it("parses expense with past tense 'Gasté $7.50 en almuerzo'", () => {
    const result = parseTelegramMessage("Gasté $7.50 en almuerzo");
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("record_transaction");
    expect(result?.transaction?.type).toBe("expense");
    expect(result?.transaction?.amount).toBe("7.50");
    expect(result?.transaction?.description).toBe("almuerzo");
  });

  it("parses income with 'Recibí $120 por una tutoría'", () => {
    const result = parseTelegramMessage("Recibí $120 por una tutoría");
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("record_transaction");
    expect(result?.transaction?.type).toBe("income");
    expect(result?.transaction?.amount).toBe("120.00");
    expect(result?.transaction?.description).toBe("una tutoría");
  });

  it("parses recurring subscription payment 'Pagué $12.99 por suscripción Spotify'", () => {
    const result = parseTelegramMessage("Pagué $12.99 por suscripción Spotify");
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("record_transaction");
    expect(result?.transaction?.type).toBe("expense");
    expect(result?.transaction?.amount).toBe("12.99");
    expect(result?.transaction?.description).toBe("suscripción Spotify");
  });

  it("parses query for spending in a category '¿Cuánto gasté en transporte este mes?'", () => {
    const result = parseTelegramMessage("¿Cuánto gasté en transporte este mes?");
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("query_category_spending");
    expect(result?.queryCategory).toBe("transporte");
  });

  it("parses query for remaining budget '¿Cuánto me queda del presupuesto de comida?'", () => {
    const result = parseTelegramMessage("¿Cuánto me queda del presupuesto de comida?");
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("query_budget_remaining");
    expect(result?.queryCategory).toBe("comida");
  });

  it("parses period comparison 'Compara mis gastos de este mes con el anterior'", () => {
    const result = parseTelegramMessage("Compara mis gastos de este mes con el anterior");
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("query_period_comparison");
  });

  it("parses comma-decimal expense and 'Compré' verb accurately", () => {
    const result = parseTelegramMessage("Compré $15,50 en farmacia");
    expect(result?.intent).toBe("record_transaction");
    expect(result?.transaction?.type).toBe("expense");
    expect(result?.transaction?.amount).toBe("15.50");
    expect(result?.transaction?.description).toBe("farmacia");
  });

  it("parses adding money to a specific wallet 'Agrega $50 a Yappy'", () => {
    const result = parseTelegramMessage("Agrega $50 a Yappy");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("income");
    expect(result.transaction?.amount).toBe("50.00");
    expect(result.transaction?.accountQuery).toBe("Yappy");
  });

  it("parses direct minus notation 'Compra de pan -20$'", () => {
    const result = parseTelegramMessage("Compra de pan -20$");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("expense");
    expect(result.transaction?.amount).toBe("20.00");
    expect(result.transaction?.description).toBe("Compra de pan");
  });

  it("parses removing money from wallet 'Quita $20 de Efectivo para compra de pan'", () => {
    const result = parseTelegramMessage("Quita $20 de Efectivo para compra de pan");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("expense");
    expect(result.transaction?.amount).toBe("20.00");
    expect(result.transaction?.accountQuery).toBe("Efectivo");
    expect(result.transaction?.description).toBe("compra de pan");
  });

  it("parses transfer between wallets 'Transfiere $50 de Banistmo a Yappy'", () => {
    const result = parseTelegramMessage("Transfiere $50 de Banistmo a Yappy");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("transfer");
    expect(result.transaction?.amount).toBe("50.00");
    expect(result.transaction?.accountQuery).toBe("Banistmo");
    expect(result.transaction?.destAccountQuery).toBe("Yappy");
  });

  it("parses savings goal creation 'Crear meta: Laptop M4 $2200 para Diciembre 2027'", () => {
    const result = parseTelegramMessage("Crear meta: Laptop M4 $2200 para Diciembre 2027");
    expect(result.intent).toBe("create_goal");
    expect(result.goal?.name).toBe("Laptop M4");
    expect(result.goal?.targetAmount).toBe("2200.00");
    expect(result.goal?.targetDate).toBe("Diciembre 2027");
  });

  it("parses savings goal deposit 'Aportar $50 a meta Laptop M4 desde Banistmo'", () => {
    const result = parseTelegramMessage("Aportar $50 a meta Laptop M4 desde Banistmo");
    expect(result.intent).toBe("deposit_goal");
    expect(result.goalDeposit?.amount).toBe("50.00");
    expect(result.goalDeposit?.goalQuery).toBe("Laptop M4");
    expect(result.goalDeposit?.fromAccountQuery).toBe("Banistmo");
  });

  it("parses goals list query '¿Cómo van mis metas?'", () => {
    const result = parseTelegramMessage("¿Cómo van mis metas?");
    expect(result.intent).toBe("query_goals");
  });

  it("parses specific wallet balance query '¿Cuánto tengo en Yappy?'", () => {
    const result = parseTelegramMessage("¿Cuánto tengo en Yappy?");
    expect(result.intent).toBe("query_account_balance");
    expect(result.accountQuery).toBe("yappy");
  });

  it("parses natural 'Registra 20 dólares a yappy'", () => {
    const result = parseTelegramMessage("Registra 20 dólares a yappy");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("income");
    expect(result.transaction?.amount).toBe("20.00");
    expect(result.transaction?.accountQuery?.toLowerCase()).toBe("yappy");
  });

  it("parses natural 'Registra gasto de 15 en taxi con efectivo'", () => {
    const result = parseTelegramMessage("Registra gasto de 15 en taxi con efectivo");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("expense");
    expect(result.transaction?.amount).toBe("15.00");
    expect(result.transaction?.accountQuery?.toLowerCase()).toBe("efectivo");
  });

  it("parses natural polite phrasing 'podrías quitar 50 de yappy'", () => {
    const result = parseTelegramMessage("podrías quitar 50 de yappy");
    expect(result.intent).toBe("record_transaction");
    expect(result.transaction?.type).toBe("expense");
    expect(result.transaction?.amount).toBe("50.00");
    expect(result.transaction?.accountQuery?.toLowerCase()).toBe("yappy");
  });

  it("parses informal phrasing 'quita 20 yappy' and 'agrega 50 yappy'", () => {
    const r1 = parseTelegramMessage("quita 20 yappy");
    expect(r1.intent).toBe("record_transaction");
    expect(r1.transaction?.type).toBe("expense");
    expect(r1.transaction?.amount).toBe("20.00");
    expect(r1.transaction?.accountQuery?.toLowerCase()).toBe("yappy");

    const r2 = parseTelegramMessage("agrega 50 yappy");
    expect(r2.intent).toBe("record_transaction");
    expect(r2.transaction?.type).toBe("income");
    expect(r2.transaction?.amount).toBe("50.00");
    expect(r2.transaction?.accountQuery?.toLowerCase()).toBe("yappy");
  });

  it("returns null or ambiguous for unstructured non-financial messages", () => {
    const result = parseTelegramMessage("Hola, ¿cómo estás hoy?");
    expect(result?.intent).toBe("unknown");
  });

  it("parses fast structured slash command arguments correctly", async () => {
    const { parseQuickCommandArgs } = await import("@/lib/telegram/bot");
    
    const r1 = parseQuickCommandArgs("50 yappy Salario quincena");
    expect(r1.amount).toBe("50.00");
    expect(r1.accountQuery?.toLowerCase()).toBe("yappy");
    expect(r1.description).toBe("Salario quincena");

    const r2 = parseQuickCommandArgs("12.50 efectivo Almuerzo ejecutivo");
    expect(r2.amount).toBe("12.50");
    expect(r2.accountQuery?.toLowerCase()).toBe("efectivo");
    expect(r2.description).toBe("Almuerzo ejecutivo");

    const r3 = parseQuickCommandArgs("100");
    expect(r3.amount).toBe("100.00");
    expect(r3.accountQuery).toBeUndefined();
    expect(r3.description).toBeUndefined();
  });

  it("parses new Panamanian banks (Banco General, BAC, Banisi, Global Bank, Banco Nacional)", () => {
    const r1 = parseTelegramMessage("Agrega $150 a Banco General");
    expect(r1.intent).toBe("record_transaction");
    expect(r1.transaction?.type).toBe("income");
    expect(r1.transaction?.amount).toBe("150.00");
    expect(r1.transaction?.accountQuery?.toLowerCase()).toBe("banco general");

    const r2 = parseTelegramMessage("Gasté 45 en gasolina con BAC Credomatic");
    expect(r2.intent).toBe("record_transaction");
    expect(r2.transaction?.type).toBe("expense");
    expect(r2.transaction?.amount).toBe("45.00");
    expect(r2.transaction?.accountQuery?.toLowerCase()).toBe("bac credomatic");

    const r3 = parseTelegramMessage("¿Cuánto tengo en Banco General?");
    expect(r3.intent).toBe("query_account_balance");
    expect(r3.accountQuery?.toLowerCase()).toBe("banco general");

    const r4 = parseTelegramMessage("Transfiere $100 de Banco General a Banisi");
    expect(r4.intent).toBe("record_transaction");
    expect(r4.transaction?.type).toBe("transfer");
    expect(r4.transaction?.amount).toBe("100.00");
    expect(r4.transaction?.accountQuery?.toLowerCase()).toBe("banco general");
    expect(r4.transaction?.destAccountQuery?.toLowerCase()).toBe("banisi");
  });
});
