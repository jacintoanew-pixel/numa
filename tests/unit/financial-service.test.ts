import { describe, it, expect, beforeEach } from "vitest";
import { FinancialService } from "@/lib/finance/service";

describe("Financial Domain Service (Shared between Web, Telegram & AI)", () => {
  let service: FinancialService;

  beforeEach(() => {
    // Initialize in-memory mock service instance for isolated business logic testing
    service = new FinancialService();
  });

  it("registers an expense and updates account balance accurately", async () => {
    // Setup initial account with $1000.00
    service.seedAccount({
      id: "acc-bank-1",
      userId: "user-1",
      name: "Banco General",
      type: "bank",
      currentBalance: "1000.00",
      currency: "USD",
    });

    const tx = await service.recordTransaction("user-1", {
      amount: "142.30",
      type: "expense",
      description: "Supermercado Riba Smith",
      accountId: "acc-bank-1",
      date: "2026-10-15T12:00:00Z",
      source: "telegram",
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe("142.30");
    expect(tx.source).toBe("telegram");

    // Balance should be exactly 1000.00 - 142.30 = 857.70
    const account = service.getAccount("acc-bank-1");
    expect(account?.currentBalance).toBe("857.70");
  });

  it("executes an internal transfer debiting source and crediting destination", async () => {
    service.seedAccount({
      id: "acc-checking",
      userId: "user-1",
      name: "Cuenta Corriente",
      type: "bank",
      currentBalance: "500.00",
      currency: "USD",
    });

    service.seedAccount({
      id: "acc-savings",
      userId: "user-1",
      name: "Metas de Ahorro",
      type: "savings",
      currentBalance: "200.00",
      currency: "USD",
    });

    await service.recordTransaction("user-1", {
      amount: "150.00",
      type: "transfer",
      description: "Ahorro programado",
      accountId: "acc-checking",
      toAccountId: "acc-savings",
      date: "2026-10-15T12:00:00Z",
      source: "web",
    });

    // Checking: 500 - 150 = 350.00
    expect(service.getAccount("acc-checking")?.currentBalance).toBe("350.00");
    // Savings: 200 + 150 = 350.00
    expect(service.getAccount("acc-savings")?.currentBalance).toBe("350.00");

    // Transfers do not count as expense or income in consolidated reporting
    const summary = service.getConsolidatedMetrics("user-1");
    expect(summary.totalIncome).toBe("0.00");
    expect(summary.totalExpenses).toBe("0.00");
  });

  it("deletes a transaction, reverses account balance, and removes it from ledger", async () => {
    service.seedAccount({
      id: "acc-wallet-1",
      userId: "user-1",
      name: "Yappy",
      type: "bank",
      currentBalance: "100.00",
      currency: "USD",
    });

    // Record an expense of $25.00 -> balance becomes 75.00
    const tx = await service.recordTransaction("user-1", {
      amount: "25.00",
      type: "expense",
      description: "Supermercado",
      accountId: "acc-wallet-1",
      date: "2026-10-15T12:00:00Z",
      source: "web",
    });

    expect(service.getAccount("acc-wallet-1")?.currentBalance).toBe("75.00");
    expect(service.getTransactionsByUser("user-1").length).toBe(1);

    // Delete the transaction -> balance must revert back to 100.00
    const delResult = await service.deleteTransaction("user-1", tx.id);
    expect(delResult.success).toBe(true);
    expect(delResult.deletedTx?.id).toBe(tx.id);

    expect(service.getAccount("acc-wallet-1")?.currentBalance).toBe("100.00");
    expect(service.getTransactionsByUser("user-1").length).toBe(0);
  });

  it("undoes the last recorded transaction successfully", async () => {
    service.seedAccount({
      id: "acc-banistmo",
      userId: "user-1",
      name: "Banistmo",
      type: "bank",
      currentBalance: "50.00",
      currency: "USD",
    });

    // Income of $100 -> balance becomes 150.00
    await service.recordTransaction("user-1", {
      amount: "100.00",
      type: "income",
      description: "Depósito inicial",
      accountId: "acc-banistmo",
      date: "2026-10-15T12:00:00Z",
      source: "telegram",
    });

    expect(service.getAccount("acc-banistmo")?.currentBalance).toBe("150.00");

    const undoResult = await service.undoLastTransaction("user-1");
    expect(undoResult.success).toBe(true);
    expect(undoResult.undoneTx?.amount).toBe("100.00");
    expect(service.getAccount("acc-banistmo")?.currentBalance).toBe("50.00");
    expect(service.getTransactionsByUser("user-1").length).toBe(0);
  });

  it("adds, updates, and deletes accounts with persistence lifecycle", () => {
    // Add account
    const added = service.addAccount("user-alice", {
      name: "BAC Credomatic",
      type: "bank",
      currentBalance: "300.00",
      currency: "USD",
      subType: "savings",
    });

    expect(added.id).toBeDefined();
    expect(added.name).toBe("BAC Credomatic");
    expect(service.getAccount(added.id)?.currentBalance).toBe("300.00");

    // Update account
    const updated = service.updateAccount("user-alice", added.id, {
      name: "BAC Nómina",
      currentBalance: "450.00",
    });
    expect(updated?.name).toBe("BAC Nómina");
    expect(updated?.currentBalance).toBe("450.00");

    // Delete account
    const del = service.deleteAccount("user-alice", added.id);
    expect(del.success).toBe(true);
    expect(service.getAccount(added.id)).toBeUndefined();
    expect(service.getAccountsByUser("user-alice").length).toBe(0);
  });

  it("resolves Panamanian bank aliases and returns undefined for deleted accounts without silent fallback", () => {
    service.addAccount("user-panama", {
      id: "acc-bg",
      name: "Banco General",
      type: "bank",
      currentBalance: "500.00",
      currency: "USD",
    });
    service.addAccount("user-panama", {
      id: "acc-bac",
      name: "BAC Credomatic",
      type: "bank",
      currentBalance: "250.00",
      currency: "USD",
    });
    service.addAccount("user-panama", {
      id: "acc-cash",
      name: "Efectivo",
      type: "cash",
      currentBalance: "50.00",
      currency: "USD",
    });

    // 1. Alias checks
    expect(service.findAccountByQuery("user-panama", "bg")?.id).toBe("acc-bg");
    expect(service.findAccountByQuery("user-panama", "banco general")?.id).toBe("acc-bg");
    expect(service.findAccountByQuery("user-panama", "bac")?.id).toBe("acc-bac");
    expect(service.findAccountByQuery("user-panama", "credomatic")?.id).toBe("acc-bac");
    expect(service.findAccountByQuery("user-panama", "cash")?.id).toBe("acc-cash");

    // 2. Querying an account that does NOT exist or was deleted MUST return undefined (NO silent fallback)
    expect(service.findAccountByQuery("user-panama", "yappy")).toBeUndefined();
    expect(service.findAccountByQuery("user-panama", "banistmo")).toBeUndefined();
    expect(service.findAccountByQuery("user-panama", "caja de ahorros")).toBeUndefined();
    expect(service.findAccountByQuery("user-panama", "cuenta inexistente xyz")).toBeUndefined();

    // 3. Deleting an account and querying it returns undefined
    service.deleteAccount("user-panama", "acc-bac");
    expect(service.findAccountByQuery("user-panama", "bac")).toBeUndefined();
    expect(service.findAccountByQuery("user-panama", "credomatic")).toBeUndefined();

    // 4. Remaining accounts still resolve correctly
    expect(service.findAccountByQuery("user-panama", "general")?.id).toBe("acc-bg");
  });
});
