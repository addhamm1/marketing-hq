import { Inbox, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { PortalRequestRow } from "@/features/portal/request-row";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("portal");
  return { title: t("myRequests") };
}

export default async function PortalHome() {
  const access = await requireAccess();
  const t = await getTranslations("portal");
  const supabase = await createClient();
  const { data: cards, error } = await supabase
    .from("cards")
    .select("id, title, stage, returned_reason, due_at, request_kind, created_at, requester_id, is_late_submission")
    .eq("requesting_department_id", access.department_id ?? "00000000-0000-0000-0000-000000000000")
    .not("stage", "is", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("myRequests")}
        actions={
          <Button asChild>
            <Link href="/portal/requests/new">
              <Plus aria-hidden /> {t("newRequest")}
            </Link>
          </Button>
        }
      />
      {!cards?.length ? (
        <EmptyState icon={<Inbox className="size-8" aria-hidden />} title={t("noRequests")} body={t("noRequestsBody")} />
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {cards.map((c) => (
            <PortalRequestRow key={c.id} card={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
