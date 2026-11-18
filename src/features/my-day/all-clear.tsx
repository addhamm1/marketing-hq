import { Sunrise } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** The whole briefing when nothing needs the person today. */
export async function AllClear() {
  const t = await getTranslations("myDay.allClear");
  return (
    <section className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-12 text-center" data-testid="all-clear">
      <Sunrise className="text-primary-ink mb-1 size-8" aria-hidden />
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">{t("body")}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/my-work">{t("myWork")}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/week">{t("week")}</Link>
        </Button>
      </div>
    </section>
  );
}
