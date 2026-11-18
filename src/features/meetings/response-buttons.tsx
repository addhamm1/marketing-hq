"use client";

import { Check, CircleHelp, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { respondToMeeting } from "./actions";
import type { AttendeeResponse } from "./types";

const OPTIONS: { value: "accepted" | "tentative" | "declined"; icon: LucideIcon }[] = [
  { value: "accepted", icon: Check },
  { value: "tentative", icon: CircleHelp },
  { value: "declined", icon: X },
];

/** Accept, maybe or decline. */
export function ResponseButtons({ id, current }: { id: string; current: AttendeeResponse }) {
  const t = useTranslations("meetings.respond");
  const message = useMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(current);

  function answer(response: "accepted" | "tentative" | "declined") {
    startTransition(async () => {
      setShown(response);
      const result = await respondToMeeting({ id, response });
      if (!result.ok) toast.error(message(result.error));
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t("label")} className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{t("label")}</span>
      {OPTIONS.map(({ value, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={shown === value ? "default" : "outline"}
          aria-pressed={shown === value}
          disabled={pending}
          onClick={() => answer(value)}
        >
          <Icon aria-hidden />
          {t(value)}
        </Button>
      ))}
    </div>
  );
}
