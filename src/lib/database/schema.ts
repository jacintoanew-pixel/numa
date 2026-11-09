import {
  pgTable,
  text,
  varchar,
  numeric,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 1. Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  preferredCurrency: varchar("preferred_currency", { length: 10 }).notNull().default("USD"),
  timeZone: varchar("time_zone", { length: 100 }).notNull().default("America/Panama"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. Sessions (Better Auth compatible)
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. Accounts
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'bank' | 'cash' | 'credit' | 'savings'
    initialBalance: numeric("initial_balance", { precision: 14, scale: 2 }).notNull().default("0.00"),
    currentBalance: numeric("current_balance", { precision: 14, scale: 2 }).notNull().default("0.00"),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    maskedNumber: varchar("masked_number", { length: 50 }),
    color: varchar("color", { length: 30 }).notNull().default("#2AB49E"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("accounts_user_idx").on(table.userId),
  ]
);

// 4. Categories
export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null = global default
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    icon: varchar("icon", { length: 50 }),
    color: varchar("color", { length: 30 }).notNull().default("#64748B"),
    type: varchar("type", { length: 20 }).notNull(), // 'income' | 'expense'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("categories_user_idx").on(table.userId),
    index("categories_slug_idx").on(table.slug),
  ]
);

// 5. Transactions
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
    toAccountId: text("to_account_id").references(() => accounts.id, { onDelete: "restrict" }), // for transfers
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'income' | 'expense' | 'transfer'
    description: varchar("description", { length: 500 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    source: varchar("source", { length: 30 }).notNull().default("web"), // 'web' | 'telegram' | 'system'
    status: varchar("status", { length: 20 }).notNull().default("completed"), // 'completed' | 'pending' | 'cancelled'
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tx_user_idx").on(table.userId),
    index("tx_account_idx").on(table.accountId),
    index("tx_date_idx").on(table.date),
    index("tx_category_idx").on(table.categoryId),
  ]
);

// 6. Subscriptions
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    billingFrequency: varchar("billing_frequency", { length: 30 }).notNull().default("monthly"), // 'monthly' | 'yearly' | 'weekly'
    nextPaymentDate: date("next_payment_date").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'paused' | 'cancelled'
    logoBg: varchar("logo_bg", { length: 30 }).notNull().default("#1B2636"),
    reminderDaysBefore: integer("reminder_days_before").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_user_idx").on(table.userId),
    index("subscriptions_next_date_idx").on(table.nextPaymentDate),
  ]
);

// 7. Budgets
export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    limit: numeric("limit", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    period: varchar("period", { length: 10 }).notNull(), // 'YYYY-MM'
    warningThreshold: numeric("warning_threshold", { precision: 4, scale: 2 }).notNull().default("0.85"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budget_user_cat_period_idx").on(table.userId, table.categoryId, table.period),
  ]
);

// 8. Savings Goals
export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetAccountId: text("target_account_id").references(() => accounts.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
    currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull().default("0.00"),
    currency: varchar("currency", { length: 10 }).notNull().default("USD"),
    targetDate: date("target_date"),
    color: varchar("color", { length: 30 }).notNull().default("#2AB49E"),
    status: varchar("status", { length: 20 }).notNull().default("in_progress"), // 'in_progress' | 'completed' | 'cancelled'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("goals_user_idx").on(table.userId),
  ]
);

// 9. Telegram Connections
export const telegramConnections = pgTable(
  "telegram_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    telegramChatId: varchar("telegram_chat_id", { length: 100 }).notNull().unique(),
    telegramUsername: varchar("telegram_username", { length: 100 }),
    linkToken: varchar("link_token", { length: 100 }),
    linkTokenExpiresAt: timestamp("link_token_expires_at", { withTimezone: true }),
    isVerified: boolean("is_verified").notNull().default(false),
    linkedAt: timestamp("linked_at", { withTimezone: true }),
  },
  (table) => [
    index("telegram_chat_id_idx").on(table.telegramChatId),
  ]
);

// 10. Telegram Updates Deduplication (Idempotency)
export const telegramUpdates = pgTable("telegram_updates", {
  id: varchar("id", { length: 100 }).primaryKey(), // Telegram update_id
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

// 11. Audit Logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 100 }).notNull(),
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    details: jsonb("details"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_user_idx").on(table.userId),
    index("audit_timestamp_idx").on(table.timestamp),
  ]
);
