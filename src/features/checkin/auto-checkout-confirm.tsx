"use client";

import { AlarmClockOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { formatCairo, fromCairoInput, toCairoInput } from "@/lib/dates";
import { confirmAutoCheckout } from "./actions";

export function AutoCheckoutConfirm({ session }: { session: { id: string; checked_in_at: string; checked_out_at: string | null } }) {
  const t = useTranslations("checkin");
  const message = useMessage();
  const router = useRouter();
  const [value, setValue] = useState(toCairoInput(session.checked_out_at));
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-center gap-2 font-medium">
        <AlarmClockOff className="size-5" aria-hidden /> {t("autoClosedTitle")}
      </div>
      <p className="text-sm">
        {t("autoClosedBody", {
          date: formatCairo(session.checked_in_at, "d MMM"),
          time: session.checked_out_at ? formatCairo(session.checked_out_at, "HH:mm") : "—",
        })}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="actual-out">{t("actualOut")}</Label>
          <Input id="actual-out" type="datetime-local" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} className="bg-white" />
        </div>
        <Button
          disabled={pending || !value}
          onClick={() =>
            startTransition(async () => {
              const r = await confirmAutoCheckout({ session_id: session.id, actual_out: fromCairoInput(value) });
              if (r.ok) {
                toast.success(t("confirmed"));
                router.refresh();
              } else toast.error(message(r.error));
            })
          }
        >
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}
