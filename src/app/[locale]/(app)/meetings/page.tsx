import { getTranslations } from "next-intl/server";
import { MeetingsPage } from "@/features/meetings/meetings-page";

export async function generateMetadata() {
  const t = await getTranslations("meetings");
  return { title: t("title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MeetingsPage area="team" search={await searchParams} />;
}
