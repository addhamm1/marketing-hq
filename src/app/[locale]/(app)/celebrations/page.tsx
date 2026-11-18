import { getTranslations } from "next-intl/server";
import { CelebrationsPage } from "@/features/celebrations/celebrations-page";

export async function generateMetadata() {
  const t = await getTranslations("celebrations");
  return { title: t("title") };
}

export default function Page() {
  return <CelebrationsPage />;
}
