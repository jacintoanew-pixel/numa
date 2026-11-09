"use client";

import * as React from "react";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { CashflowSummary } from "@/components/dashboard/cashflow-summary";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { UpcomingSubscriptions } from "@/components/dashboard/upcoming-subscriptions";
import { BudgetProgress } from "@/components/dashboard/budget-progress";
import { AiInsightBanner } from "@/components/dashboard/ai-insight-banner";

export default function DashboardPage() {
  const {
    metrics,
    accounts,
    cashflowTrends,
    categoryExpenses,
    transactions,
    subscriptions,
    budgets,
    aiInsight,
    deleteTransaction,
  } = useFinancialStore();

  const recentSlice = React.useMemo(() => transactions.slice(0, 6), [transactions]);

  return (
    <div className="space-y-4 lg:space-y-4.5">
      {/* 1. Gemini AI Insight Banner */}
      <AiInsightBanner
        title={aiInsight.title}
        summary={aiInsight.summary}
        generatedAt={aiInsight.generatedAt}
      />

      {/* 2. Primary Balance and Accounts Card */}
      <BalanceCard
        totalBalance={metrics.totalBalance}
        changePct={metrics.balanceChangePct}
        accounts={accounts}
      />

      {/* 3. Monthly Cashflow KPI Summary (Income, Expenses, Net Savings) */}
      <CashflowSummary
        income={metrics.monthlyIncome}
        incomeChangePct={metrics.incomeChangePct}
        expenses={metrics.monthlyExpenses}
        expensesChangePct={metrics.expensesChangePct}
        netSavings={metrics.netSavings}
        savingsRatePct={metrics.savingsRatePct}
      />

      {/* 4. Balanced 2/3 and 1/3 Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Main Column (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4 lg:space-y-5">
          {/* Cashflow Trends Bar Chart */}
          <SpendingChart data={cashflowTrends} />

          {/* Recent Activity Table */}
          <RecentTransactions transactions={recentSlice} onDelete={deleteTransaction} />
        </div>

        {/* Secondary Sidebar Column (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Spending by Category */}
          <CategoryBreakdown
            categories={categoryExpenses}
            totalSpent={metrics.monthlyExpenses}
          />

          {/* Upcoming Subscriptions */}
          <UpcomingSubscriptions subscriptions={subscriptions} />

          {/* Budget Progress */}
          <BudgetProgress budgets={budgets} />
        </div>
      </div>
    </div>
  );
}
