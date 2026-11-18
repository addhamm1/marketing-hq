"use client";

import { Building2, Home, Loader2, LogOut, MapPinned, MapPinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { checkOut } from "./actions";
import { geolocate, type GeoErrorKind } from "./geolocate";

export type OpenSession = {
  id: string;
  branch_id: string | null;
  method: string;
  checked_in_at: string;
  is_late: boolean;
  checkin_place: string | null;
};

/** The open session, with check-out. Checking out needs location access. */
export function CheckedInCard({ open, branchName }: { open: OpenSession; branchName: string }) {
  const t = useTranslations("checkin");
  const message = useMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [geoError, setGeoError] = useState<GeoErrorKind | null>(null);
  const time = formatCairo(open.checked_in_at, "HH:mm");
  const Icon = open.method === "home" ? Home : open.method === "field" ? MapPinned : Building2;

  const label =
    open.method === "home"
      ? t("checkedInHome", { time })
      : open.method === "field"
        ? open.checkin_place
          ? t("checkedInFieldAt", { place: open.checkin_place, time })
          : t("checkedInField", { time })
        : t("checkedInAt", { branch: branchName, time });

  function out() {
    startTransition(async () => {
      const geo = await geolocate({ strict: false, maximumAge: 60_000 });
      if (!geo.ok) return setGeoError(geo.kind);
      setGeoError(null);
      const r = await checkOut({ location: geo.location });
      if (r.ok) {
        toast.success(t("checkedOut"));
        router.refresh();
      } else toast.error(message(r.error, r.params));
    });
  }

  return (
    <div className="bg-card space-y-5 rounded-2xl border p-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="size-7" aria-hidden />
      </div>
      <p className="text-lg font-medium">{label}</p>
      {open.is_late ? <p className="text-muted-foreground text-sm">{t("late")}</p> : null}
      {geoError ? (
        <div role="alert" className="bg-muted/60 flex items-start gap-3 rounded-xl p-3 text-start text-sm">
          <MapPinOff className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t("locationNeededTitle")}</p>
            <p className="text-muted-foreground">{t(`geo.${geoError}`, { accuracy: 0 })}</p>
            {geoError === "denied" ? <p className="text-muted-foreground mt-1 text-xs">{t("geo.deniedHelp")}</p> : null}
          </div>
        </div>
      ) : null}
      <Button size="lg" variant="outline" className="h-14 w-full text-base" disabled={pending} onClick={out}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
        {pending ? t("checkingOut") : t("checkOut")}
      </Button>
    </div>
  );
}
