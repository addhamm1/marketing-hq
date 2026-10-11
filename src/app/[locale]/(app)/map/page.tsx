import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/states/states";

export default async function MapPage() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t("nav.map")} />
      <EmptyState title={t("shell.placeholder")} body={t("placeholderPages.map")} />
    </>
  );
}
