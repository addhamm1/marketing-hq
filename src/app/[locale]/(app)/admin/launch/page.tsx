import { getTranslations } from "next-intl/server";
import { LaunchChecklist } from "@/features/launch/checklist";
import { computeChecks } from "@/features/launch/checks";
import { loadLaunchData } from "@/features/launch/queries";
import { requireRole } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";

export async function generateMetadata() {
  const t = await getTranslations("launch");
  return { title: t("title") };
}

export default async function LaunchPage() {
  await requireRole("super_admin");
  const rows = computeChecks(await loadLaunchData(cairoDateString()));
  return <LaunchChecklist rows={rows} />;
}
