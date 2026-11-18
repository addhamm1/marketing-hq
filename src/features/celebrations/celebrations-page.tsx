import { hasRole } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CelebrationsView } from "./celebrations-view";
import { fetchCelebrations } from "./queries";

/** The page behind both /celebrations and /portal/celebrations. */
export async function CelebrationsPage() {
  const access = await requireAccess();
  const supabase = await createClient();
  const data = await fetchCelebrations(supabase, access.user_id);
  return <CelebrationsView data={data} viewerId={access.user_id} canModerate={hasRole(access, "super_admin")} />;
}
