"use client";

import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const HINT_MS = 8_000;

/** Shown when someone taps the floor of a branch they aren't checked in at. Goes away by itself. */
export function MapHint({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations("map.interact");
  useEffect(() => {
    const timer = setTimeout(onDismiss, HINT_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div
      role="status"
      data-testid="map-hint"
      className="bg-popover text-popover-foreground absolute inset-x-3 bottom-3 z-10 mx-auto flex max-w-md items-center gap-2 rounded-xl border py-2 ps-3 pe-2 text-sm shadow-lg"
    >
      <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{t("hint")}</span>
      <Link href="/checkin" className="text-primary-ink shrink-0 font-medium underline underline-offset-4">
        {t("hintAction")}
      </Link>
      <Button type="button" variant="ghost" size="icon-xs" onClick={onDismiss} aria-label={t("dismissHint")}>
        <X aria-hidden />
      </Button>
    </div>
  );
}
