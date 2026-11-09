/**
 * Financial Domain Service
 * 
 * Central business logic layer shared by:
 * - Web application Route Handlers & Server Actions
 * - Telegram Bot Webhook
 * - Google Gemini AI Function Calling Tools & Vision OCR
 * 
 * Coordinates decimal-safe calculations, account balancing, audit logging,
 * and file-backed persistence in data/financial_store.json.
 */

import fs from "fs";
import path from "path";
import {
  toCents,
  fromCents,
  calculateAccountBalance,
  calculateConsolidatedCashflow,
  type FinancialMovement,
  type CashflowResult,
} from "./calculator";
import { createTransactionSchema, type CreateTransactionInput } from "../validation";

export interface AccountRecord {
  id: string;
  userId: string;
  name: string;
  type: "bank" | "cash" | "credit" | "savings";
  currentBalance: string;
  currency: string;
  accountNumberMasked?: string;
  color?: string;
  logo?: string;
  subType?: "savings" | "checking";
}

export interface TransactionRecord {
  id: string;
  userId: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  amount: string;
  type: "income" | "expense" | "transfer";
  description: string;
  date: string;
  source: "web" | "telegram" | "system";
  status: "completed" | "pending";
}

export interface BudgetRecord {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  limit: string;
  spent?: string;
  currency: string;
  period: string;
  warningThreshold: number;
}

export interface GoalRecord {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  currency: string;
  targetDate?: string;
  color?: string;
  status: "in_progress" | "completed" | "cancelled";
}

const PERSISTENCE_FILE = path.join(process.cwd(), "data", "financial_store.json");

export class FinancialService {
  private accountsMap: Map<string, AccountRecord> = new Map();
  private transactionsList: TransactionRecord[] = [];
  private budgetsList: BudgetRecord[] = [];
  private goalsList: GoalRecord[] = [];

  constructor() {
    this.initializeData();
  }

  private shouldPersist(): boolean {
    return process.env.NODE_ENV !== "test" && !process.env.VITEST;
  }

  private initializeData() {
    // 1. Attempt to load from persistent JSON file if not running tests
    if (this.shouldPersist() && fs.existsSync(PERSISTENCE_FILE)) {
      try {
        const raw = fs.readFileSync(PERSISTENCE_FILE, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          for (const acc of data.accounts) {
            this.accountsMap.set(acc.id, acc);
          }
          this.transactionsList = Array.isArray(data.transactions) ? data.transactions : [];
          this.budgetsList = Array.isArray(data.budgets) ? data.budgets : [];
          this.goalsList = Array.isArray(data.goals) ? data.goals : [];
          return;
        }
      } catch (err) {
        console.warn("Could not read persistent store, reverting to seed defaults:", err);
      }
    }

    // 2. Default Seed for Admin User (All 6 Accounts/Wallets)
    this.seedDefaultAdminState();
  }

  private seedDefaultAdminState() {
    this.accountsMap.clear();
    this.transactionsList = [];
    this.budgetsList = [];
    this.goalsList = [];

    // Admin's 6 official wallets (fresh empty balances at $0.00)
    this.accountsMap.set("acc-1", {
      id: "acc-1",
      userId: "usr_master_01",
      name: "Caja de Ahorros",
      type: "bank",
      currentBalance: "0.00",
      currency: "USD",
    });
    this.accountsMap.set("acc-2", {
      id: "acc-2",
      userId: "usr_master_01",
      name: "Banistmo",
      type: "bank",
      currentBalance: "0.00",
      currency: "USD",
    });
    this.accountsMap.set("acc-3", {
      id: "acc-3",
      userId: "usr_master_01",
      name: "Yappy",
      type: "savings",
      currentBalance: "0.00",
      currency: "USD",
    });
    this.accountsMap.set("acc-4", {
      id: "acc-4",
      userId: "usr_master_01",
      name: "Punto Pago",
      type: "savings",
      currentBalance: "0.00",
      currency: "USD",
    });
    this.accountsMap.set("acc-5", {
      id: "acc-5",
      userId: "usr_master_01",
      name: "PayPal",
      type: "savings",
      currentBalance: "0.00",
      currency: "USD",
    });
    this.accountsMap.set("acc-6", {
      id: "acc-6",
      userId: "usr_master_01",
      name: "Efectivo",
      type: "cash",
      currentBalance: "0.00",
      currency: "USD",
    });

    this.goalsList = [];
    this.budgetsList = [];
    this.transactionsList = [];

    this.persistToFile();
  }

  /**
   * Seed helper for unit tests and local isolation.
   */
  public seedAccount(account: AccountRecord) {
    const existingMovements = this.transactionsList.filter(
      (t) => t.accountId === account.id || t.toAccountId === account.id
    );
    const adjustedBalance = calculateAccountBalance(
      account.id,
      account.currentBalance,
      existingMovements
    );
    this.accountsMap.set(account.id, { ...account, currentBalance: adjustedBalance });
  }

  public seedBudget(budget: BudgetRecord): void {
    this.budgetsList.push(budget);
  }

  public seedGoal(goal: GoalRecord): void {
    this.goalsList.push(goal);
  }

  private persistToFile() {
    if (!this.shouldPersist()) return;
    try {
      const data = {
        updatedAt: new Date().toISOString(),
        accounts: Array.from(this.accountsMap.values()),
        transactions: this.transactionsList,
        budgets: this.budgetsList,
        goals: this.goalsList,
      };
      fs.mkdirSync(path.dirname(PERSISTENCE_FILE), { recursive: true });
      fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Could not persist financial store to disk:", err);
    }
  }

  /**
   * Adds a new financial account/wallet for the user and persists to disk.
   */
  public addAccount(
    userId: string,
    account: Omit<AccountRecord, "userId" | "id"> & { id?: string }
  ): AccountRecord {
    let id = account.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existing = this.accountsMap.get(id);
    if (existing && existing.userId !== userId) {
      // Never allow overwriting another user's account ID
      id = `acc_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    const cleanName = account.name
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    const newAcc: AccountRecord = {
      id,
      userId,
      name: cleanName || "Cuenta",
      type: account.type || "bank",
      currentBalance: (parseFloat(account.currentBalance) || 0).toFixed(2),
      currency: account.currency || "USD",
      accountNumberMasked: account.accountNumberMasked,
      color: account.color,
      logo: account.logo,
      subType: account.subType,
    };
    this.accountsMap.set(id, newAcc);
    this.persistToFile();
    return newAcc;
  }

  /**
   * Deletes an account/wallet for the user and persists to disk.
   */
  public deleteAccount(userId: string, accountId: string): { success: boolean; error?: string } {
    const acc = this.accountsMap.get(accountId);
    if (!acc || acc.userId !== userId) {
      return { success: false, error: "Cuenta no encontrada" };
    }
    this.accountsMap.delete(accountId);
    this.persistToFile();
    return { success: true };
  }

  /**
   * Updates an existing account/wallet for the user and persists to disk.
   * Uses partial merge semantics so omitted fields (like currentBalance or currency) are never reset.
   */
  public updateAccount(
    userId: string,
    accountId: string,
    updates: Partial<Omit<AccountRecord, "id" | "userId">>
  ): AccountRecord | undefined {
    const acc = this.accountsMap.get(accountId);
    if (!acc || acc.userId !== userId) {
      return undefined;
    }
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    ) as Partial<Omit<AccountRecord, "id" | "userId">>;

    const updated: AccountRecord = {
      ...acc,
      ...definedUpdates,
      id: acc.id,
      userId: acc.userId,
      name: definedUpdates.name ? definedUpdates.name.trim() : acc.name,
      currentBalance:
        definedUpdates.currentBalance !== undefined
          ? (parseFloat(definedUpdates.currentBalance) || 0).toFixed(2)
          : acc.currentBalance,
      currency: definedUpdates.currency !== undefined ? definedUpdates.currency : acc.currency,
    };
    this.accountsMap.set(accountId, updated);
    this.persistToFile();
    return updated;
  }

  /**
   * Bulk sync accounts from client if needed (e.g. initial setup)
   */
  public syncUserAccounts(
    userId: string,
    clientAccounts: Array<Omit<AccountRecord, "userId">>
  ): AccountRecord[] {
    const clientIds = new Set(clientAccounts.map((a) => a.id));
    for (const [id, acc] of this.accountsMap.entries()) {
      if (acc.userId === userId && !clientIds.has(id)) {
        this.accountsMap.delete(id);
      }
    }
    for (const ca of clientAccounts) {
      const existing = this.accountsMap.get(ca.id);
      if (existing && existing.userId === userId) {
        this.accountsMap.set(ca.id, {
          ...existing,
          ...ca,
          userId,
        });
      } else {
        this.addAccount(userId, ca);
      }
    }
    this.persistToFile();
    return this.getAccountsByUser(userId);
  }

  /**
   * Resolves any account/wallet flexibly by alias or name for the given user.
   * e.g. "banco general", "bg", "bac", "credomatic", "banisi", "global bank",
   * "banco nacional", "bnp", "yappy", "efectivo", "banistmo", "caja", "punto pago", "paypal".
   * 
   * CRITICAL SECURITY & ACCURACY RULE:
   * If a specific query is provided, it matches ONLY against the user's active accounts.
   * If the account was deleted or doesn't exist, it returns `undefined` (never falls back
   * to a random account), ensuring clear error handling.
   */
  public findAccountByQuery(
    userId: string,
    query?: string,
    options?: { strict?: boolean }
  ): AccountRecord | undefined {
    const userAccounts = this.getAccountsByUser(userId);
    if (!userAccounts.length) return undefined;

    // If query is empty: return default account only if not strict
    if (!query || !query.trim()) {
      return options?.strict ? undefined : userAccounts[0];
    }

    const clean = query
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Strip accents: nómina -> nomina

    // 1. Direct match on ID
    const byId = userAccounts.find((a) => a.id.toLowerCase() === clean);
    if (byId) return byId;

    // 2. Exact match on normalized account name
    const byExactName = userAccounts.find(
      (a) =>
        a.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") === clean
    );
    if (byExactName) return byExactName;

    // 3. Panamanian Bank and Wallet Aliases
    const aliasGroups: Array<{ keywords: string[]; matchers: string[] }> = [
      {
        keywords: ["banco general", "general", "bg"],
        matchers: ["banco general", "general", "bg"],
      },
      {
        keywords: ["bac credomatic", "credomatic", "bac"],
        matchers: ["bac credomatic", "credomatic", "bac"],
      },
      {
        keywords: ["banco nacional", "nacional", "bnp"],
        matchers: ["banco nacional", "nacional", "bnp"],
      },
      {
        keywords: ["banisi"],
        matchers: ["banisi"],
      },
      {
        keywords: ["global bank", "global"],
        matchers: ["global bank", "global"],
      },
      {
        keywords: ["banistmo"],
        matchers: ["banistmo"],
      },
      {
        keywords: ["caja de ahorros", "caja"],
        matchers: ["caja de ahorros", "caja"],
      },
      {
        keywords: ["yappy"],
        matchers: ["yappy"],
      },
      {
        keywords: ["punto pago", "puntopago", "punto"],
        matchers: ["punto pago", "puntopago", "punto"],
      },
      {
        keywords: ["paypal"],
        matchers: ["paypal"],
      },
      {
        keywords: ["efectivo", "cash", "billetera", "bolsillo"],
        matchers: ["efectivo", "cash", "billetera", "bolsillo"],
      },
    ];

    for (const group of aliasGroups) {
      const queryMatchesGroup = group.keywords.some((kw) => {
        const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return clean === kwNorm || clean.includes(kwNorm) || kwNorm.includes(clean);
      });

      if (queryMatchesGroup) {
        // Find among user's active accounts if any account matches this group
        const matchedAccount = userAccounts.find((a) => {
          const accNorm = a.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return group.matchers.some((m) => {
            const mNorm = m.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return accNorm.includes(mNorm) || mNorm.includes(accNorm);
          });
        });
        // If an active account matches this alias, return it
        if (matchedAccount) return matchedAccount;
        // If user specifically requested this alias group but no active account exists for it,
        // it means that account is NOT present or was deleted! Return undefined immediately.
        return undefined;
      }
    }

    // 4. Substring / Partial name search against user's actual accounts
    const partial = userAccounts.find((a) => {
      const aNorm = a.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return aNorm.includes(clean) || clean.includes(aNorm);
    });
    if (partial) return partial;

    // 5. Token match (if multi-word query, e.g. "cuenta ahorro general")
    const tokens = clean.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0) {
      const tokenMatch = userAccounts.find((a) => {
        const aNorm = a.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return tokens.some((t) => aNorm.includes(t));
      });
      if (tokenMatch) return tokenMatch;
    }

    // Never guess or silently return an unrelated account when a query was provided!
    return undefined;
  }

  public getAccount(accountId: string, userId?: string): AccountRecord | undefined {
    const acc = this.accountsMap.get(accountId);
    if (!acc) return undefined;
    if (userId && acc.userId !== userId) return undefined;
    return acc;
  }

  public getOwnedAccount(userId: string, accountId: string): AccountRecord | undefined {
    const acc = this.accountsMap.get(accountId);
    if (!acc || acc.userId !== userId) return undefined;
    return acc;
  }

  public getAccountsByUser(userId: string): AccountRecord[] {
    // Purge any legacy 'Cuenta Principal' and deduplicate multiple 'Efectivo' accounts
    let changed = false;
    if (userId !== "usr_master_01") {
      for (const [id, acc] of this.accountsMap.entries()) {
        if (acc.userId === userId && acc.name.toLowerCase().includes("cuenta principal")) {
          this.accountsMap.delete(id);
          changed = true;
        }
      }
    }

    const userCashAccounts = Array.from(this.accountsMap.values()).filter(
      (a) => a.userId === userId && a.name.trim().toLowerCase() === "efectivo"
    );
    if (userCashAccounts.length > 1) {
      // Keep the first (or the one with non-zero balance) and remove duplicates
      const primary =
        userCashAccounts.find((a) => parseFloat(a.currentBalance) !== 0) ||
        userCashAccounts.find((a) => a.id === `acc_cash_${userId}`) ||
        userCashAccounts[0];
      for (const dup of userCashAccounts) {
        if (dup.id !== primary.id) {
          this.accountsMap.delete(dup.id);
          changed = true;
        }
      }
    }

    if (changed) {
      this.persistToFile();
    }

    const existing = Array.from(this.accountsMap.values()).filter((a) => a.userId === userId);
    if (existing.length === 0 && userId === "usr_demo_user") {
      const cashAcc: AccountRecord = {
        id: `acc_cash_${userId}`,
        userId: "usr_demo_user",
        name: "Efectivo",
        type: "cash",
        currentBalance: "0.00",
        currency: "USD",
        color: "#10B981",
      };
      this.accountsMap.set(cashAcc.id, cashAcc);
      this.persistToFile();
      return [cashAcc];
    }
    return existing;
  }

  public getTransactionsByUser(userId: string): TransactionRecord[] {
    return this.transactionsList.filter((t) => t.userId === userId);
  }

  public getBudgetsByUser(userId: string, period?: string): BudgetRecord[] {
    return this.budgetsList.filter(
      (b) => b.userId === userId && (!period || b.period === period)
    );
  }

  public getGoalsByUser(userId: string): GoalRecord[] {
    return this.goalsList.filter((g) => g.userId === userId);
  }

  public findGoalByQuery(userId: string, query: string): GoalRecord | undefined {
    const goals = this.getGoalsByUser(userId);
    if (!goals.length) return undefined;
    const clean = query.toLowerCase().trim();
    // 1. Direct or substring match
    const exactOrSub = goals.find((g) => g.name.toLowerCase().includes(clean));
    if (exactOrSub) return exactOrSub;

    // 2. Token match (all search words exist in goal name)
    const tokens = clean.split(/\s+/).filter((t) => t.length > 1);
    if (tokens.length > 0) {
      const tokenMatch = goals.find((g) => {
        const name = g.name.toLowerCase();
        return tokens.every((tok) => name.includes(tok));
      });
      if (tokenMatch) return tokenMatch;
    }

    return goals[0];
  }

  public createGoal(userId: string, data: { name: string; targetAmount: string; targetDate?: string; color?: string }): GoalRecord {
    const targetCents = toCents(data.targetAmount);
    const newGoal: GoalRecord = {
      id: `goal-${Date.now()}`,
      userId,
      name: data.name.trim(),
      targetAmount: fromCents(Math.max(100, targetCents)),
      currentAmount: "0.00",
      currency: "USD",
      targetDate: data.targetDate || "Diciembre 2027",
      color: data.color || "#0071E3",
      status: "in_progress",
    };
    this.goalsList.push(newGoal);
    this.persistToFile();
    return newGoal;
  }

  public depositToGoal(
    userId: string,
    goalId: string,
    amountStr: string,
    fromAccountId?: string
  ): { goal: GoalRecord; debitedAccount?: AccountRecord } {
    const depositCents = toCents(amountStr);
    if (depositCents <= 0) throw new Error("El monto del aporte debe ser mayor a 0");

    const goal = this.goalsList.find((g) => g.id === goalId && g.userId === userId);
    if (!goal) throw new Error("Meta de ahorro no encontrada");

    const nextGoalCents = toCents(goal.currentAmount) + depositCents;
    goal.currentAmount = fromCents(nextGoalCents);
    if (toCents(goal.currentAmount) >= toCents(goal.targetAmount)) {
      goal.status = "completed";
    }

    let debitedAccount: AccountRecord | undefined;
    if (fromAccountId) {
      const acc = this.accountsMap.get(fromAccountId);
      if (acc && acc.userId === userId) {
        const nextBalCents = toCents(acc.currentBalance) - depositCents;
        acc.currentBalance = fromCents(nextBalCents);
        debitedAccount = acc;
      }
    }

    this.persistToFile();
    return { goal, debitedAccount };
  }

  /**
   * Records a validated financial transaction, updates affected accounts with
   * decimal safety, and persists the record.
   * Strictly enforces tenant ownership (BOLA protection N-03) on both source and destination accounts.
   */
  public async recordTransaction(
    userId: string,
    rawInput: unknown
  ): Promise<TransactionRecord> {
    const input: CreateTransactionInput = createTransactionSchema.parse(rawInput);

    // N-03: Strictly verify that sourceAccount exists AND belongs to the authenticated userId
    const sourceAccount = this.getOwnedAccount(userId, input.accountId);
    if (!sourceAccount) {
      const notFoundErr = new Error("Cuenta de origen no encontrada");
      (notFoundErr as any).statusCode = 404;
      throw notFoundErr;
    }

    const amountCents = toCents(input.amount);

    if (input.type === "transfer") {
      if (!input.toAccountId) {
        throw new Error("Las transferencias requieren una cuenta de destino");
      }
      // N-03: Strictly verify that destAccount exists AND belongs to the SAME authenticated userId
      const destAccount = this.getOwnedAccount(userId, input.toAccountId);
      if (!destAccount) {
        const notFoundErr = new Error("Cuenta de destino no encontrada");
        (notFoundErr as any).statusCode = 404;
        throw notFoundErr;
      }

      // Debit source account
      const sourceBalanceCents = toCents(sourceAccount.currentBalance) - amountCents;
      sourceAccount.currentBalance = fromCents(sourceBalanceCents);

      // Credit destination account
      const destBalanceCents = toCents(destAccount.currentBalance) + amountCents;
      destAccount.currentBalance = fromCents(destBalanceCents);
    } else if (input.type === "expense") {
      const sourceBalanceCents = toCents(sourceAccount.currentBalance) - amountCents;
      sourceAccount.currentBalance = fromCents(sourceBalanceCents);
    } else if (input.type === "income") {
      const sourceBalanceCents = toCents(sourceAccount.currentBalance) + amountCents;
      sourceAccount.currentBalance = fromCents(sourceBalanceCents);
    }

    // Sanitize description against stored HTML/XSS
    const cleanDescription = input.description
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();

    const txRecord: TransactionRecord = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      accountId: input.accountId,
      toAccountId: input.type === "transfer" ? input.toAccountId : undefined,
      categoryId: input.categoryId,
      amount: input.amount,
      type: input.type,
      description: cleanDescription || "Movimiento",
      date: typeof input.date === "string" ? input.date : (input.date as Date).toISOString(),
      source: input.source || "web",
      status: "completed",
    };

    this.transactionsList.unshift(txRecord);
    this.persistToFile();
    return txRecord;
  }

  /**
   * Deletes a transaction, reverses its exact financial impact on account balance(s),
   * and persists the updated ledger to disk.
   */
  public async deleteTransaction(
    userId: string,
    transactionId: string
  ): Promise<{ success: boolean; deletedTx?: TransactionRecord }> {
    const idx = this.transactionsList.findIndex(
      (t) => t.id === transactionId && t.userId === userId
    );

    if (idx === -1) {
      return { success: false };
    }

    const tx = this.transactionsList[idx];
    const amountCents = toCents(tx.amount);
    const sourceAccount = this.getOwnedAccount(userId, tx.accountId);

    if (sourceAccount) {
      if (tx.type === "expense") {
        // Revert expense: return money to account
        const nextBalCents = toCents(sourceAccount.currentBalance) + amountCents;
        sourceAccount.currentBalance = fromCents(nextBalCents);
      } else if (tx.type === "income") {
        // Revert income: deduct money from account
        const nextBalCents = toCents(sourceAccount.currentBalance) - amountCents;
        sourceAccount.currentBalance = fromCents(nextBalCents);
      } else if (tx.type === "transfer") {
        // Revert transfer: refund source, debit destination
        const nextSourceCents = toCents(sourceAccount.currentBalance) + amountCents;
        sourceAccount.currentBalance = fromCents(nextSourceCents);

        if (tx.toAccountId) {
          const destAccount = this.getOwnedAccount(userId, tx.toAccountId);
          if (destAccount) {
            const nextDestCents = toCents(destAccount.currentBalance) - amountCents;
            destAccount.currentBalance = fromCents(nextDestCents);
          }
        }
      }
    }

    this.transactionsList.splice(idx, 1);
    this.persistToFile();

    return { success: true, deletedTx: tx };
  }

  /**
   * Reverts and deletes the most recent transaction recorded by the user.
   */
  public async undoLastTransaction(userId: string): Promise<{ success: boolean; undoneTx?: TransactionRecord }> {
    const userTxs = this.transactionsList.filter((t) => t.userId === userId);
    if (userTxs.length === 0) {
      return { success: false };
    }
    const lastTx = userTxs[0];
    const res = await this.deleteTransaction(userId, lastTx.id);
    return { success: res.success, undoneTx: res.deletedTx };
  }


  public getConsolidatedMetrics(userId: string): CashflowResult {
    const userMovements: FinancialMovement[] = this.transactionsList
      .filter((t) => t.userId === userId)
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        accountId: t.accountId,
        toAccountId: t.toAccountId,
      }));

    return calculateConsolidatedCashflow(userMovements);
  }

  public getFullState(userId: string) {
    return {
      accounts: this.getAccountsByUser(userId),
      transactions: this.getTransactionsByUser(userId),
      budgets: this.getBudgetsByUser(userId),
      goals: this.getGoalsByUser(userId),
      metrics: this.getConsolidatedMetrics(userId),
    };
  }

  public resetToDefaults() {
    this.seedDefaultAdminState();
  }
}

export const financialService = new FinancialService();
