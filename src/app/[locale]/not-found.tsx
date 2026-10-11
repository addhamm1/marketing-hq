import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        className="w-full max-w-md"
        title={t("notFoundTitle")}
        body={t("notFoundBody")}
        action={
          <Button asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
        }
      />
    </div>
  );
}
