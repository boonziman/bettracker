import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function formatMoney(n: number, digits = 0) {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatAmerican(odds: number) {
  if (!Number.isFinite(odds) || odds === 0) return "—";
  return odds > 0 ? `+${Math.round(odds)}` : `${Math.round(odds)}`;
}

export function todayKey(tz = "America/Los_Angeles") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
}

export function formatKickoff(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatClock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function fuzzyIncludes(hay: string, needle: string) {
  const h = hay.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const n = needle.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!n) return true;
  if (h.includes(n)) return true;
  const parts = n.split(" ").filter(Boolean);
  return parts.every((p) => h.includes(p));
}
