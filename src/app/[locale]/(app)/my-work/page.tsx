import { ListTodo } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PeopleProvider } from "@/components/people-context";
import { EmptyState, PageHeader } from "@/components/states/states";
import { fetchPeople } from "@/features/boards/queries";
import { DUE_GROUPS, dueGroup, groupByDue } from "@/features/my-work/group";
import { WorkRow, type WorkCard } from "@/features/my-work/work-row";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("myWork");
  return { title: t("title") };
}

const SELECT = "id, board_id, title, stage, due_at, priority, revision_count, brand_id, card_assignees(user_id)";

export default async function MyWorkPage() {
  const access = await requireAccess();
  const t = await getTranslations("myWork");
  const supabase = await createClient();
  const me = access.user_id;

  const [{ data: mine }, { data: steps }, people, { data: brands }] = await Promise.all([
    supabase.from("card_assignees").select("card_id").eq("user_id", me),
    supabase.from("approval_steps").select("subject_id").eq("subject_type", "card").eq("approver_id", me).eq("status", "active"),
    fetchPeople(supabase),
    supabase.from("brands").select("id, color"),
  ]);
  const assignedIds = [...new Set((mine ?? []).map((r) => r.card_id))];
  const reviewIds = [...new Set((steps ?? []).map((s) => s.subject_id))];

  const [{ data: assigned }, { data: reviewing }, { data: asReviewer }] = await Promise.all([
    assignedIds.length
      ? supabase.from("cards").select(SELECT).in("id", assignedIds).is("archived_at", null)
      : Promise.resolve({ data: [] as WorkCard[] }),
    reviewIds.length
      ? supabase.from("cards").select(SELECT).in("id", reviewIds).is("archived_at", null)
      : Promise.resolve({ data: [] as WorkCard[] }),
    supabase.from("cards").select(SELECT).eq("reviewer_id", me).is("archived_at", null).in("stage", ["production", "creative_review"]),
  ]);

  const done = new Set(["published", "reported"]);
  const reviewSet = new Set(reviewIds);
  const open = new Map<string, WorkCard>();
  for (const c of [...((assigned ?? []) as WorkCard[]), ...((asReviewer ?? []) as WorkCard[])]) {
    if (!done.has(c.stage ?? "") && !reviewSet.has(c.id)) open.set(c.id, c);
  }
  const groups = groupByDue([...open.values()]);
  const brandColors = Object.fromEntries((brands ?? []).map((b) => [b.id, b.color]));
  const toReview = (reviewing ?? []) as WorkCard[];

  return (
    <PeopleProvider people={people}>
      <PageHeader title={t("title")} />
      {open.size === 0 && toReview.length === 0 ? (
        <EmptyState icon={<ListTodo className="size-8" aria-hidden />} title={t("empty")} body={t("emptyBody")} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {DUE_GROUPS.filter((g) => groups[g].length).map((g) => (
              <section key={g}>
                <h2 className={`mb-2 text-sm font-semibold ${g === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                  {t(g)} · {groups[g].length}
                </h2>
                <ul className="bg-card divide-y rounded-xl border">
                  {groups[g].map((c) => <WorkRow key={c.id} card={c} overdue={g === "overdue"} brandColor={c.brand_id ? brandColors[c.brand_id] : undefined} />)}
                </ul>
              </section>
            ))}
          </div>
          <section>
            <h2 className="text-muted-foreground mb-2 text-sm font-semibold">{t("toReview")} · {toReview.length}</h2>
            {toReview.length ? (
              <ul className="bg-card divide-y rounded-xl border">
                {toReview.map((c) => <WorkRow key={c.id} card={c} overdue={dueGroup(c.due_at) === "overdue"} brandColor={c.brand_id ? brandColors[c.brand_id] : undefined} />)}
              </ul>
            ) : (
              <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">—</p>
            )}
          </section>
        </div>
      )}
    </PeopleProvider>
  );
}
