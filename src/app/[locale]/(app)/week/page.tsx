import { getTranslations } from "next-intl/server";
import type { WeekQuery } from "@/features/week/filters";
import { WeekView } from "@/features/week/week-view";

export async function generateMetadata() {
  const t = await getTranslations("week");
  return { title: t("title") };
}

export default function WeekPage({ searchParams }: { searchParams: Promise<WeekQuery> }) {
  return <WeekView basePath="/week" searchParams={searchParams} />;
}
