"use client";

import { Building2, Home, Loader2, LogOut, MapPinned } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { checkOut } from "./actions";
import { geolocate } from "./geolocate";

export type OpenSession = {
  id: string;
  branch_id: string | null;
  method: string;
  checked_in_at: string;
  is_late: boolean;
  checkin_place: string | null;
};

/** The open session, with check-out. Check-out tries for a location but never waits on it for long. */
export function CheckedInCard({ open, branchName }: { open: OpenSession; branchName: string }) {
  const t = useTranslations("checkin");
  const message = useMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
      // Home sessions never record a location.
      const geo = open.method === "home" ? null : await geolocate({ timeout: 8_000, strict: false, maximumAge: 120_000 });
      const location = geo?.ok ? geo.location : null;
      const r = await checkOut({ location });
      if (r.ok) {
        toast.success(location || open.method === "home" ? t("checkedOut") : t("checkedOutNoLocation"));
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
      <Button size="lg" variant="outline" className="h-14 w-full text-base" disabled={pending} onClick={out}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
        {pending ? t("checkingOut") : t("checkOut")}
      </Button>
    </div>
  );
}
