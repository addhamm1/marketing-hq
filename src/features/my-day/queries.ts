import "server-only";
import { loadCelebrations, loadCheckin, loadMeetings, loadShoots } from "./load-schedule";
import { loadActions, loadApprovals, loadCards, loadGates } from "./load-work";
import type { CelebrationItem, CheckinState, Client, MyDay, Section } from "./types";

/** Runs one part of the briefing so its failure stays inside that part. */
async function section<T>(name: string, load: () => Promise<T[]>): Promise<Section<T>> {
  try {
    return { ok: true, items: await load() };
  } catch (error) {
    console.error(`[my-day] section=${name} ${error instanceof Error ? error.message : "failed"}`);
    return { ok: false, items: [] };
  }
}

type Options = {
  now?: Date;
  /** Supplied by the digest, which has no signed-in user for the database function. */
  celebrations?: CelebrationItem[];
};

/**
 * Everything one person needs to know today. Works with a signed-in client (the
 * page) and with the service role (the digest): each query names the person.
 */
export async function getMyDay(client: Client, userId: string, date: string, options: Options = {}): Promise<MyDay> {
  const now = options.now ?? new Date();
  const { celebrations: given } = options;
  const [meetings, cards, approvals, gates, shoots, actions, celebrations] = await Promise.all([
    section("meetings", () => loadMeetings(client, userId, date, now)),
    section("cards", () => loadCards(client, userId, date, now)),
    section("approvals", () => loadApprovals(client, userId)),
    section("gates", () => loadGates(client, userId, date)),
    section("shoots", () => loadShoots(client, userId, date)),
    section("actions", () => loadActions(client, userId, date)),
    section("celebrations", () => (given ? Promise.resolve(given) : loadCelebrations(client, date))),
  ]);
  return { meetings, cards, approvals, gates, shoots, actions, celebrations };
}

/** The check-in line at the top of the page. Null when it could not be loaded. */
export async function getCheckinState(client: Client, userId: string, date: string): Promise<CheckinState | null> {
  const result = await section("checkin", async () => [await loadCheckin(client, userId, date)]);
  return result.items[0] ?? null;
}
