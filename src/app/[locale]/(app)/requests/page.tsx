import { FileText, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { RequestList, type MyRequest } from "@/features/requests/request-list";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("requests");
  return { title: t("title") };
}

export default async function RequestsPage() {
  const access = await requireAccess();
  const t = await getTranslations("requests");
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, status, starts_on, ends_on, days, data, submitted_at, request_types(key, name_en, name_ar)")
    .eq("requester_id", access.user_id)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const ids = (requests ?? []).map((r) => r.id);
  const { data: steps } = ids.length
    ? await supabase.from("approval_steps").select("subject_id, step_index, approver_id, status, comment").eq("subject_type", "request").in("subject_id", ids).order("step_index")
    : { data: [] };

  const rows: MyRequest[] = (requests ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    starts_on: r.starts_on,
    ends_on: r.ends_on,
    days: r.days === null ? null : Number(r.days),
    submitted_at: r.submitted_at,
    files: ((r.data as { files?: string[] })?.files ?? []),
    type: r.request_types as unknown as MyRequest["type"],
    steps: (steps ?? []).filter((s) => s.subject_id === r.id && s.comment !== "no approver"),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("title")}
        actions={<Button asChild><Link href="/requests/new"><Plus aria-hidden /> {t("new")}</Link></Button>}
      />
      {rows.length ? <RequestList requests={rows} /> : <EmptyState icon={<FileText className="size-8" aria-hidden />} title={t("empty")} body={t("emptyBody")} />}
    </div>
  );
}
