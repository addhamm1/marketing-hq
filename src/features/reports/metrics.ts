import { addDays, format, startOfWeek } from "date-fns";

export function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function mean(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

export function rate(part: number, whole: number): number | null {
  return whole ? part / whole : null;
}

/** Week buckets (Saturday start) between two dates, counting items by a date field. */
export function weekly<T>(items: T[], pick: (t: T) => string | null, from: string, to: string): { week: string; count: number }[] {
  const weeks: { week: string; count: number }[] = [];
  let d = startOfWeek(new Date(`${from}T12:00:00Z`), { weekStartsOn: 6 });
  const end = new Date(`${to}T12:00:00Z`);
  while (d <= end) {
    weeks.push({ week: format(d, "yyyy-MM-dd"), count: 0 });
    d = addDays(d, 7);
  }
  for (const item of items) {
    const v = pick(item);
    if (!v) continue;
    const day = v.slice(0, 10);
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (day >= weeks[i].week) {
        weeks[i].count++;
        break;
      }
    }
  }
  return weeks;
}

export function countBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = key(i) ?? "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Average of "HH:mm" clock times, as "HH:mm". */
export function averageClock(times: string[]): string | null {
  if (!times.length) return null;
  const mins = times.map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)));
  const avg = Math.round(mins.reduce((s, m) => s + m, 0) / mins.length);
  return `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(avg % 60).padStart(2, "0")}`;
}

export function pct(v: number | null) {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export function fixed(v: number | null, digits = 1) {
  return v === null ? "—" : v.toFixed(digits);
}
