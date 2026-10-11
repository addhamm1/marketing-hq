import { getTranslations } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/states/states";

export default async function PortalPage() {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t("nav.portalHome")} />
      <EmptyState title={t("shell.placeholder")} body={t("placeholderPages.portal")} />
    </>
  );
}
