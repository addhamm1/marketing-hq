import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { RequestForm } from "@/features/requests/request-form";
import type { Balance, RequestType } from "@/features/requests/types";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("requests");
  return { title: t("new") };
}

export default async function NewRequestPage() {
  const access = await requireAccess();
  const t = await getTranslations("requests");
  const supabase = await createClient();
  const [{ data: types }, { data: balances }, { data: pending }, { data: assigned }] = await Promise.all([
    supabase.from("request_types").select("key, name_en, name_ar, category, is_leave, counts_working_days, requires_attachment_after_days, form_schema").eq("is_active", true).order("category").order("name_en"),
    supabase.from("leave_balances").select("year, allowance, used, request_types(key)").eq("user_id", access.user_id),
    supabase.from("requests").select("days, starts_on, request_types(key)").eq("requester_id", access.user_id).eq("status", "pending"),
    supabase.from("card_assignees").select("cards(id, title, archived_at)").eq("user_id", access.user_id),
  ]);
  const pendingBy = new Map<string, number>();
  for (const p of pending ?? []) {
    const k = `${(p.request_types as unknown as { key: string }).key}:${p.starts_on?.slice(0, 4)}`;
    pendingBy.set(k, (pendingBy.get(k) ?? 0) + Number(p.days ?? 0));
  }
  const balanceRows: Balance[] = (balances ?? []).map((b) => {
    const key = (b.request_types as unknown as { key: string }).key;
    return { type_key: key, year: b.year, allowance: Number(b.allowance), used: Number(b.used), pending: pendingBy.get(`${key}:${b.year}`) ?? 0 };
  });
  const requestTypes: RequestType[] = (types ?? []).map((x) => ({
    ...x,
    category: x.category as RequestType["category"],
    fields: ((x.form_schema as { fields?: RequestType["fields"] })?.fields ?? []),
  }));
  const cards = (assigned ?? [])
    .map((a) => a.cards as unknown as { id: string; title: string; archived_at: string | null } | null)
    .filter((c): c is NonNullable<typeof c> => !!c && !c.archived_at)
    .map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("new")} />
      <RequestForm types={requestTypes} balances={balanceRows} cards={cards} />
    </div>
  );
}
