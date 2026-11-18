import { isWorkingDay } from "@/lib/dates";
import { addDaysTo, daysBetween } from "@/features/week/days";

export const DEFAULT_DEADLINE_DAY = 25;

export type StrategicDeadline = {
  /** The last working day to submit, in the current month. */
  deadline: string;
  /** First day of the month the plan is for. */
  forMonth: string;
  /** Calendar days from today to the deadline; negative once it has passed. */
  daysLeft: number;
};

/**
 * The monthly plan deadline, computed the way cron_strategic_reminders does: the setting's
 * day of this month, rolled back to the closest working day (not a Friday or full holiday).
 */
export function strategicDeadline(today: string, deadlineDay: number, fullHolidays: ReadonlySet<string> = new Set()): StrategicDeadline {
  const [year, month] = today.split("-").map(Number);
  let deadline = addDaysTo(`${today.slice(0, 7)}-01`, deadlineDay - 1);
  while (!isWorkingDay(deadline, fullHolidays)) deadline = addDaysTo(deadline, -1);
  const forMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { deadline, forMonth, daysLeft: daysBetween(today, deadline) };
}

/** The stored setting, or the default when it is missing or out of range. */
export function readDeadlineDay(value: unknown) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : DEFAULT_DEADLINE_DAY;
}
