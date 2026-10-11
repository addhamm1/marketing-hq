import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/states/states";
import { requireRole } from "@/lib/auth/session";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("admin");
  return { title: t("audit") };
}

export default async function AuditPage() {
  await requireRole("super_admin");
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: rows, error }, { data: people }] = await Promise.all([
    supabase.from("audit_log").select("id, actor_id, table_name, row_id, action, at, new_data, old_data").order("at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, full_name"),
  ]);
  if (error) throw error;
  if (!rows?.length) return <EmptyState title={t("auditEmpty")} />;
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-start text-xs">
          <tr>
            <th className="px-4 py-2 text-start font-medium">{t("when")}</th>
            <th className="px-4 py-2 text-start font-medium">{t("actor")}</th>
            <th className="px-4 py-2 text-start font-medium">{t("table")}</th>
            <th className="px-4 py-2 text-start font-medium">{t("action")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 whitespace-nowrap" dir="ltr">
                {formatCairo(r.at, "yyyy-MM-dd HH:mm")}
              </td>
              <td className="px-4 py-2">{r.actor_id ? (names.get(r.actor_id) ?? r.actor_id) : "system"}</td>
              <td className="px-4 py-2 font-mono text-xs" dir="ltr">
                {r.table_name}
              </td>
              <td className="px-4 py-2">{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
