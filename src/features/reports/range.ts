import { addDays } from "date-fns";
import { cairoDateString, cairoInstant } from "@/lib/dates";

export type RangeKey = "30" | "90" | "month";

/** Cairo date range for the report filter, plus instants for querying. */
export function resolveRange(key: string | undefined) {
  const today = cairoDateString();
  const k: RangeKey = key === "90" || key === "month" ? key : "30";
  const from = k === "month" ? `${today.slice(0, 7)}-01` : cairoDateString(addDays(cairoInstant(today, "12:00"), -(Number(k) - 1)));
  return {
    key: k,
    from,
    to: today,
    fromIso: cairoInstant(from, "00:00").toISOString(),
    toIso: new Date(cairoInstant(today, "23:59").getTime() + 60_000).toISOString(),
  };
}

export const inRange = (iso: string | null | undefined, r: { fromIso: string; toIso: string }) => !!iso && iso >= r.fromIso && iso < r.toIso;
