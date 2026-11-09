/**
 * Database Seeding Script
 * 
 * Populates system categories and initial demonstration dataset.
 * Idempotent execution.
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/database/schema";
import { DEMO_DATA } from "../src/lib/demo-data";
import { sql } from "drizzle-orm";

const DEFAULT_CATEGORIES = [
  { id: "cat-housing", name: "Vivienda y Servicios", slug: "vivienda-servicios", color: "#1B2636", type: "expense", icon: "Home" },
  { id: "cat-food", name: "Alimentación y Super", slug: "alimentacion-super", color: "#2AB49E", type: "expense", icon: "Utensils" },
  { id: "cat-transport", name: "Transporte y Auto", slug: "transporte-auto", color: "#3B82F6", type: "expense", icon: "Fuel" },
  { id: "cat-software", name: "Suscripciones y Software", slug: "suscripciones-software", color: "#8B5CF6", type: "expense", icon: "Cpu" },
  { id: "cat-health", name: "Salud y Bienestar", slug: "salud-bienestar", color: "#EC4899", type: "expense", icon: "HeartPulse" },
  { id: "cat-leisure", name: "Entretenimiento y Ocio", slug: "entretenimiento-ocio", color: "#F59E0B", type: "expense", icon: "Film" },
  { id: "cat-income-prof", name: "Ingresos Profesionales", slug: "ingresos-profesionales", color: "#10B981", type: "income", icon: "Briefcase" },
  { id: "cat-income-invest", name: "Rendimientos e Inversiones", slug: "inversiones", color: "#06B6D4", type: "income", icon: "TrendingUp" },
];

export async function runSeed(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    console.warn("⚠️ No DATABASE_URL provided. Skipping live database seed execution.");
    return;
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    console.log("🌱 Iniciando siembra de base de datos...");

    // 1. Seed global categories
    for (const cat of DEFAULT_CATEGORIES) {
      await db
        .insert(schema.categories)
        .values({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          type: cat.type,
          icon: cat.icon,
        })
        .onConflictDoNothing();
    }
    console.log("✓ Categorías maestras sembradas");

    // 2. Demo Users & Accounts
    const userIds = ["usr_master_01", "user-demo-1"];
    for (const userId of userIds) {
      await db
        .insert(schema.users)
        .values({
          id: userId,
          name: DEMO_DATA.user.name,
          email: userId === "usr_master_01" ? "master@finlab.local" : "demo@finlab.local",
          passwordHash: "$2a$12$e8Y3QjR0ZzVz9p.fakeDemoHashForSeedingPurposesOnly",
          preferredCurrency: DEMO_DATA.user.preferredCurrency,
          timeZone: DEMO_DATA.user.timeZone,
        })
        .onConflictDoNothing();

      for (const acc of DEMO_DATA.accounts) {
        await db
          .insert(schema.accounts)
          .values({
            id: `${acc.id}-${userId}`,
            userId,
            name: acc.name,
            type: acc.type,
            initialBalance: acc.balance.toFixed(2),
            currentBalance: acc.balance.toFixed(2),
            currency: acc.currency,
            maskedNumber: acc.accountNumberMasked,
            color: acc.color,
          })
          .onConflictDoNothing();
      }
    }
    console.log("✓ Usuarios y cuentas sembradas");

    const primaryUserId = "usr_master_01";

    // 4. Subscriptions
    for (const sub of DEMO_DATA.subscriptions) {
      await db
        .insert(schema.subscriptions)
        .values({
          id: sub.id,
          userId: primaryUserId,
          name: sub.name,
          provider: sub.provider,
          amount: sub.amount.toFixed(2),
          currency: sub.currency,
          billingFrequency: sub.billingFrequency,
          nextPaymentDate: sub.nextPaymentDate,
          status: sub.status,
          logoBg: sub.logoBg,
        })
        .onConflictDoNothing();
    }
    console.log("✓ Suscripciones sembradas");

    // 5. Budgets
    for (const b of DEMO_DATA.budgets) {
      await db
        .insert(schema.budgets)
        .values({
          id: b.id,
          userId: primaryUserId,
          categoryId: "cat-food",
          limit: b.limit.toFixed(2),
          currency: b.currency,
          period: "2026-10",
          warningThreshold: b.warningThreshold.toFixed(2),
        })
        .onConflictDoNothing();
    }
    console.log("✓ Presupuestos sembrados");

    console.log("✅ Siembra de base de datos completada con éxito.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  runSeed().catch((err) => {
    console.error("Error durante la siembra:", err);
    process.exit(1);
  });
}
