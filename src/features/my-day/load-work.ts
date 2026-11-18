import "server-only";
import { cairoInstant } from "@/lib/dates";
import { addDaysTo, daysBetween } from "./format";
import { must } from "./load-schedule";
import type { ActionItem, ApprovalItem, CardItem, Client, GateItem } from "./types";

const FINISHED_STAGES = new Set(["published", "reported"]);

type CardRow = { id: string; board_id: string; title: string; due_at: string; stage: string | null };

/**
 * Cards due by the end of today: assigned to the person, or waiting on them as
 * reviewer, the same set My Work shows. Cards already in their approvals inbox
 * are left to that section so nothing appears twice.
 */
export async function loadCards(client: Client, userId: string, date: string, now: Date): Promise<CardItem[]> {
  const endOfToday = cairoInstant(addDaysTo(date, 1)).toISOString();
  const columns = "id, board_id, title, due_at, stage";
  const [assigned, reviewing, steps] = await Promise.all([
    client
      .from("cards")
      .select(`${columns}, card_assignees!inner(user_id)`)
      .eq("card_assignees.user_id", userId)
      .is("archived_at", null)
      .lt("due_at", endOfToday),
    client
      .from("cards")
      .select(columns)
      .eq("reviewer_id", userId)
      .in("stage", ["production", "creative_review"])
      .is("archived_at", null)
      .lt("due_at", endOfToday),
    client.from("approval_steps").select("subject_id").eq("subject_type", "card").eq("approver_id", userId).eq("status", "active"),
  ]);

  const inInbox = new Set(must(steps).map((s) => s.subject_id));
  const cards = new Map<string, CardRow>();
  for (const c of [...(must(assigned) as unknown as CardRow[]), ...(must(reviewing) as unknown as CardRow[])]) {
    if (!FINISHED_STAGES.has(c.stage ?? "") && !inInbox.has(c.id)) cards.set(c.id, c);
  }
  return [...cards.values()]
    .map((c) => ({ id: c.id, boardId: c.board_id, title: c.title, dueAt: c.due_at, overdue: new Date(c.due_at) < now }))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

type RequestRow = { id: string; status: string; request_types: { name_en: string; name_ar: string } | null };

/** Every approval step currently waiting on the person. */
export async function loadApprovals(client: Client, userId: string): Promise<ApprovalItem[]> {
  const steps = must(
    await client
      .from("approval_steps")
      .select("id, subject_type, subject_id, created_at")
      .eq("approver_id", userId)
      .eq("status", "active")
      .order("created_at"),
  );
  const cardIds = steps.filter((s) => s.subject_type === "card").map((s) => s.subject_id);
  const requestIds = steps.filter((s) => s.subject_type === "request").map((s) => s.subject_id);
  const [cards, requests] = await Promise.all([
    cardIds.length
      ? client.from("cards").select("id, title").in("id", cardIds).is("archived_at", null)
      : Promise.resolve({ data: [], error: null }),
    requestIds.length
      ? client.from("requests").select("id, status, request_types(name_en, name_ar)").in("id", requestIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const cardById = new Map(must<{ id: string; title: string }[]>(cards).map((c) => [c.id, c]));
  const requestById = new Map((must(requests) as unknown as RequestRow[]).map((r) => [r.id, r]));

  const items: ApprovalItem[] = [];
  for (const s of steps) {
    if (s.subject_type === "card") {
      const card = cardById.get(s.subject_id);
      if (card) items.push({ stepId: s.id, kind: "card", title: { en: card.title, ar: card.title }, since: s.created_at });
      continue;
    }
    const request = requestById.get(s.subject_id);
    if (request?.status === "pending" && request.request_types) {
      const { name_en, name_ar } = request.request_types;
      items.push({ stepId: s.id, kind: "request", title: { en: name_en, ar: name_ar }, since: s.created_at });
    }
  }
  return items;
}

/** Open gates the person owns, due within seven days or already late. */
export async function loadGates(client: Client, userId: string, date: string): Promise<GateItem[]> {
  const rows = must(
    await client
      .from("gate_items")
      .select("id, name_en, name_ar, due_on, month, status")
      .eq("owner_id", userId)
      .neq("kind", "phase")
      .not("status", "in", "(done,skipped,missed)")
      .lte("due_on", addDaysTo(date, 7))
      .order("due_on"),
  );
  return rows.map((g) => ({
    id: g.id,
    name: { en: g.name_en, ar: g.name_ar },
    dueOn: g.due_on,
    daysLeft: daysBetween(date, g.due_on),
    month: g.month.slice(0, 7),
    atRisk: g.status === "at_risk",
  }));
}

type ActionRow = {
  id: string;
  title: string;
  due_on: string | null;
  meeting_id: string;
  meetings: { title: string; title_ar: string | null } | null;
};

/** Open actions from meetings assigned to the person, soonest first. */
export async function loadActions(client: Client, userId: string, date: string): Promise<ActionItem[]> {
  const rows = must(
    await client
      .from("meeting_actions")
      .select("id, title, due_on, meeting_id, meetings(title, title_ar)")
      .eq("assignee_id", userId)
      .eq("done", false)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(30),
  ) as unknown as ActionRow[];
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    meetingId: a.meeting_id,
    meetingTitle: a.meetings ? { en: a.meetings.title, ar: a.meetings.title_ar || a.meetings.title } : null,
    dueOn: a.due_on,
    overdue: !!a.due_on && a.due_on < date,
  }));
}
