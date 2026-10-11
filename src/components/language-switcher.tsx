"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveLocale } from "@/features/auth/actions";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={pending}
      lang={next}
      onClick={() =>
        startTransition(async () => {
          await saveLocale(next);
          const query = searchParams.toString();
          router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
          router.refresh();
        })
      }
    >
      <Languages aria-hidden />
      {next === "ar" ? t("arabic") : t("english")}
    </Button>
  );
}
