import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const code = currency?.trim().toUpperCase() || "USD";
  let formatter = currencyFormatterCache.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("es-PA", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      formatter = new Intl.NumberFormat("es-PA", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    currencyFormatterCache.set(code, formatter);
  }
  return formatter.format(safeAmount);
}

export function formatPercentage(value: number): string {
  const safeVal = Number.isFinite(value) ? value : 0;
  const prefix = safeVal > 0 ? "+" : "";
  return `${prefix}${safeVal.toFixed(1)}%`;
}

/**
 * Parses a date string ("YYYY-MM-DD" or ISO string) without UTC timezone shift
 * so "2026-10-16" never shifts to Oct 15 in UTC-5 (America/Panama).
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  // Match YYYY-MM-DD exact date strings
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]) - 1;
    const day = Number(ymdMatch[3]);
    return new Date(year, month, day, 12, 0, 0);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const shortDateFormatter = new Intl.DateTimeFormat("es-PA", {
  day: "numeric",
  month: "short",
});

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  // If already a human-readable Spanish string like "28 Oct 2026" or "Próximo mes"
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) {
    return dateStr;
  }
  return shortDateFormatter.format(parseLocalDate(dateStr));
}

/**
 * Computes days remaining from reference date (defaults to current date or Oct 16, 2026 in demo context)
 */
export function getDaysRemainingText(dateStr: string, referenceDate?: Date): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) {
    return "Programado";
  }
  const target = parseLocalDate(dateStr);
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const diffMs = target.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Se cobra hoy";
  if (diffDays === 1) return "Mañana (1 día)";
  if (diffDays > 1) return `Faltan ${diffDays} días`;
  return `Hace ${Math.abs(diffDays)} días`;
}

