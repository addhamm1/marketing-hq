import { getLocale, getTranslations } from "next-intl/server";
import { KioskDisplay } from "@/features/checkin/kiosk-display";
import { verifyKiosk } from "@/features/checkin/kiosk";

export const metadata = { robots: { index: false } };

export default async function KioskPage({ params, searchParams }: PageProps<"/[locale]/kiosk/[branchId]">) {
  const { branchId } = await params;
  const { key } = await searchParams;
  const t = await getTranslations("kiosk");
  const locale = await getLocale();
  const kiosk = await verifyKiosk(branchId, typeof key === "string" ? key : null);
  if (!kiosk) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8 text-center">
        <p className="text-muted-foreground max-w-sm">{t("invalid")}</p>
      </main>
    );
  }
  return <KioskDisplay branchId={branchId} kioskKey={key as string} branchName={locale === "ar" ? kiosk.branch.name_ar : kiosk.branch.name_en} />;
}
