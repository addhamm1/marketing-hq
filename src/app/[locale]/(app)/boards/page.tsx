import { KanbanSquare, Lock, Workflow } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { BoardMenu } from "@/features/boards/board-menu";
import { NewBoardButton } from "@/features/boards/new-board-dialog";
import { Link } from "@/i18n/navigation";
import { hasRole, isGuestOnly } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("boards");
  return { title: t("title") };
}

export default async function BoardsPage() {
  const access = await requireAccess();
  const t = await getTranslations("boards");
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: workspaces }, { data: boards, error }, { data: counts }] = await Promise.all([
    supabase.from("workspaces").select("id, name_en, name_ar, position").order("position"),
    supabase
      .from("boards")
      .select("id, name, description, workspace_id, is_pipeline, visibility, created_by")
      .is("archived_at", null)
      .order("is_pipeline", { ascending: false })
      .order("name"),
    supabase.from("cards").select("board_id").is("archived_at", null),
  ]);
  if (error) throw error;
  const countBy = new Map<string, number>();
  for (const c of counts ?? []) countBy.set(c.board_id, (countBy.get(c.board_id) ?? 0) + 1);
  const canCreate = access.is_marketing && !isGuestOnly(access) && hasRole(access, "super_admin", "team_lead", "traffic_manager", "member");
  const canEditAny = hasRole(access, "super_admin", "team_lead", "traffic_manager");
  const groups = (workspaces ?? [])
    .map((w) => ({ ...w, boards: (boards ?? []).filter((b) => b.workspace_id === w.id) }))
    .filter((w) => w.boards.length > 0);

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={canCreate ? <NewBoardButton workspaces={(workspaces ?? []).map((w) => ({ id: w.id, name: locale === "ar" ? w.name_ar : w.name_en }))} /> : null}
      />
      {groups.length === 0 ? (
        <EmptyState icon={<KanbanSquare className="size-8" aria-hidden />} title={t("noBoards")} body={t("noBoardsBody")} />
      ) : (
        <div className="space-y-8">
          {groups.map((w) => (
            <section key={w.id}>
              <h2 className="text-muted-foreground mb-3 text-sm font-medium">{locale === "ar" ? w.name_ar : w.name_en}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {w.boards.map((b) => (
                  <div key={b.id} className="group bg-card relative rounded-xl border p-4 transition-shadow hover:shadow-sm">
                    <Link href={`/boards/${b.id}`} className="absolute inset-0 rounded-xl" aria-label={b.name} />
                    <div className="flex items-start gap-2">
                      {b.is_pipeline ? (
                        <Workflow className="text-primary-ink mt-0.5 size-4 shrink-0" aria-hidden />
                      ) : (
                        <KanbanSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{b.name}</span>
                          {b.is_pipeline ? <Badge variant="secondary">{t("pipelineBadge")}</Badge> : null}
                          {b.visibility === "private" ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="size-3" aria-hidden />
                              {t("privateBadge")}
                            </Badge>
                          ) : null}
                        </div>
                        {b.description ? <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{b.description}</p> : null}
                        <p className="text-muted-foreground mt-2 text-xs">{t("cardCount", { count: countBy.get(b.id) ?? 0 })}</p>
                      </div>
                      {!b.is_pipeline && (canEditAny || b.created_by === access.user_id) ? (
                        <div className="relative z-10">
                          <BoardMenu board={{ id: b.id, name: b.name, visibility: b.visibility as "marketing" | "private" }} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
