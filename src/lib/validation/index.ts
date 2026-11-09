import { z } from "zod";

const decimalStringRegex = /^-?\d+(\.\d{1,2})?$/;
const positiveDecimalStringRegex = /^\d+(\.\d{1,2})?$/;

const amountSchema = z
  .string()
  .regex(positiveDecimalStringRegex, "El monto debe ser un número positivo con hasta 2 decimales")
  .refine((val) => parseFloat(val) > 0, "El monto debe ser mayor a cero");

// Transaction Schema
export const createTransactionSchema = z
  .object({
    amount: amountSchema,
    type: z.enum(["income", "expense", "transfer"]),
    description: z.string().min(1, "La descripción es requerida").max(500),
    accountId: z.string().min(1, "La cuenta es requerida"),
    toAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    paymentMethod: z.string().optional(),
    source: z.enum(["web", "telegram", "system"]).default("web"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "transfer") {
        return !!data.toAccountId && data.toAccountId !== data.accountId;
      }
      return true;
    },
    {
      message: "Las transferencias requieren una cuenta de destino diferente a la de origen",
      path: ["toAccountId"],
    }
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Account Schema
export const createAccountSchema = z.object({
  name: z.string().min(1, "El nombre de cuenta es requerido").max(255),
  type: z.enum(["bank", "cash", "credit", "savings"]),
  initialBalance: z.string().regex(decimalStringRegex).default("0.00"),
  currency: z.string().min(3).max(10).default("USD"),
  maskedNumber: z.string().max(50).optional(),
  color: z.string().max(30).default("#2AB49E"),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// Budget Schema
export const createBudgetSchema = z.object({
  categoryId: z.string().min(1, "La categoría es requerida"),
  limit: amountSchema,
  currency: z.string().min(3).max(10).default("USD"),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El formato del periodo debe ser YYYY-MM"),
  warningThreshold: z.number().min(0.1).max(1.0).default(0.85),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

// Subscription Schema
export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255),
  provider: z.string().max(255).optional(),
  amount: amountSchema,
  currency: z.string().min(3).max(10).default("USD"),
  billingFrequency: z.enum(["monthly", "yearly", "weekly"]).default("monthly"),
  nextPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha YYYY-MM-DD"),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  logoBg: z.string().max(30).default("#1B2636"),
  reminderDaysBefore: z.number().int().min(0).max(30).default(3),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

// Telegram Message Parsing Schemas (for bot & Gemini tool calls)
export const telegramTransactionInputSchema = z.object({
  amount: amountSchema,
  type: z.enum(["income", "expense", "transfer"]),
  description: z.string().min(1).max(255),
  categoryName: z.string().optional(),
  accountName: z.string().optional(),
  date: z.string().optional(),
});

export type TelegramTransactionInput = z.infer<typeof telegramTransactionInputSchema>;
