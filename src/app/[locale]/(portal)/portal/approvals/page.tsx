import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { ApprovalsInbox } from "@/features/approvals/inbox";
import { fetchInbox } from "@/features/approvals/queries";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("approvals");
  return { title: t("title") };
}

export default async function PortalApprovalsPage() {
  const access = await requireAccess();
  const t = await getTranslations("approvals");
  const items = await fetchInbox(await createClient(), access.user_id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} />
      <ApprovalsInbox items={items} cardLinkBase="portal" />
    </div>
  );
}
