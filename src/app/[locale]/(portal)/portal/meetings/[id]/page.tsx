import { getTranslations } from "next-intl/server";
import { MeetingDetailPage } from "@/features/meetings/meeting-detail-page";

export async function generateMetadata() {
  const t = await getTranslations("meetings");
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDetailPage id={id} area="portal" />;
}
