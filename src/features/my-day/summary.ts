import type { CelebrationItem, GateItem, MyDay } from "./types";

/** Things that ask something of the person today. Celebrations are good news, not work. */
export function agendaCount(day: MyDay): number {
  return (
    day.meetings.items.length +
    day.cards.items.length +
    day.approvals.items.length +
    day.gates.items.length +
    day.shoots.items.length +
    day.actions.items.length
  );
}

/** Every section loaded and none of them needs attention. */
export function isAllClear(day: MyDay): boolean {
  const loaded = [day.meetings, day.cards, day.approvals, day.gates, day.shoots, day.actions].every((s) => s.ok);
  return loaded && agendaCount(day) === 0;
}

/** The label a gate gets for how far away it is. */
export function gateDue(gate: Pick<GateItem, "daysLeft">) {
  if (gate.daysLeft < 0) return { key: "gateOverdue", days: -gate.daysLeft } as const;
  if (gate.daysLeft === 0) return { key: "gateToday", days: 0 } as const;
  if (gate.daysLeft === 1) return { key: "gateTomorrow", days: 1 } as const;
  return { key: "gateIn", days: gate.daysLeft } as const;
}

export type CelebrationPerson = {
  id: string;
  full_name: string;
  display_name: string | null;
  birth_month: number | null;
  birth_day: number | null;
  joined_on: string | null;
  celebrate: boolean;
};

/**
 * Birthdays and work anniversaries on a date, by the same rules as the
 * upcoming_celebrations database function. That function answers signed-in
 * staff only, so the daily digest, which runs without a user, uses this.
 */
export function celebrationsOn(people: CelebrationPerson[], date: string): CelebrationItem[] {
  const [year, month, day] = date.split("-").map(Number);
  const lastDayOfFebruary = month === 2 && new Date(Date.UTC(year, 2, 0)).getUTCDate() === day;
  const out: CelebrationItem[] = [];
  for (const p of people) {
    if (!p.celebrate) continue;
    const name = p.display_name || p.full_name;
    const leapBirthday = p.birth_month === 2 && p.birth_day === 29 && lastDayOfFebruary;
    if ((p.birth_month === month && p.birth_day === day) || leapBirthday) {
      out.push({ userId: p.id, name, kind: "birthday", years: null });
    }
    if (p.joined_on) {
      const [joinedYear, joinedMonth, joinedDay] = p.joined_on.split("-").map(Number);
      if (joinedMonth === month && joinedDay === day && year > joinedYear) {
        out.push({ userId: p.id, name, kind: "anniversary", years: year - joinedYear });
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
