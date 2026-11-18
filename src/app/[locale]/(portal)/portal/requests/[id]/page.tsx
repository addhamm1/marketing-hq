import { notFound } from "next/navigation";
import { fetchBoardSettings, fetchBrands } from "@/features/boards/queries";
import { fetchCardDetail } from "@/features/boards/card-sheet/detail-query";
import { PortalRequestView } from "@/features/portal/request-view";
import { fetchCardTimeline } from "@/features/tracker/queries";
import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PortalRequestPage({ params }: PageProps<"/[locale]/portal/requests/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const access = await requireAccess();
  const supabase = await createClient();
  const [card, timeline, brands, settings] = await Promise.all([
    fetchCardDetail(supabase, id),
    fetchCardTimeline(supabase, id),
    fetchBrands(supabase),
    fetchBoardSettings(supabase),
  ]);
  if (!card || !card.stage) notFound();
  return (
    <PortalRequestView
      initial={card}
      initialTimeline={timeline}
      me={access.user_id}
      viewer={{ departmentId: access.department_id, canResubmit: hasRole(access, "requester", "final_approver") }}
      options={{ brands, verticals: settings.verticals, formats: settings.formats, platforms: settings.platforms }}
    />
  );
}
