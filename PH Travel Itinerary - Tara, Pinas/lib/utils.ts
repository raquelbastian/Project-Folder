import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTransportEstimate(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? "—"
      : value.toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  }

  if (typeof value !== "string") return "—";

  const trimmed = value.trim();
  if (!trimmed) return "—";

  if (/^(invalid(?: date)?|tbd|n\/a)$/i.test(trimmed)) {
    return "—";
  }

  if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{1,2}\s*(AM|PM)$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const normalized = trimmed
    .replace(/\s+/g, " ")
    .replace(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/, "$1T$2");

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return trimmed;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
