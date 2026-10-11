"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPostFromCard } from "@/features/content/actions";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { cairoDateString, fromCairoInput } from "@/lib/dates";

/** Ready card -> content calendar post, without dragging (works well on phones). */
export function SchedulePost({ cardId }: { cardId: string }) {
  const t = useTranslations("content");
  const message = useMessage();
  const router = useRouter();
  const [when, setWhen] = useState(`${cairoDateString()}T12:00`);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input type="datetime-local" dir="ltr" value={when} onChange={(e) => setWhen(e.target.value)} className="w-auto" aria-label={t("fields.scheduled_at")} />
      <Button size="sm" variant="outline" disabled={pending || !when}
        onClick={() => startTransition(async () => {
          const r = await createPostFromCard({ card_id: cardId, scheduled_at: fromCairoInput(when) });
          if (!r.ok) return void toast.error(message(r.error, r.params));
          toast.success(t("created"));
          router.push(`/content?month=${when.slice(0, 7)}&post=${r.data.id}`);
        })}>
        <CalendarPlus aria-hidden /> {t("scheduleCard")}
      </Button>
    </div>
  );
}
