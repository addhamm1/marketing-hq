"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { respondToMeeting } from "./actions";

/** Accept or decline, for an invitation still waiting on a reply. */
export function MeetingResponse({ meetingId, title }: { meetingId: string; title: string }) {
  const t = useTranslations("myDay.meeting");
  const root = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reply = (response: "accepted" | "declined") =>
    start(async () => {
      setError(null);
      const result = await respondToMeeting({ meetingId, response });
      if (!result.ok) {
        setError(root(result.error as never));
        return;
      }
      toast.success(t(response));
      router.refresh();
    });

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-9 px-3" disabled={pending} onClick={() => reply("accepted")} aria-label={t("acceptLabel", { title })}>
          <Check aria-hidden /> {t("accept")}
        </Button>
        <Button size="sm" variant="outline" className="h-9 px-3" disabled={pending} onClick={() => reply("declined")} aria-label={t("declineLabel", { title })}>
          <X aria-hidden /> {t("decline")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive mt-1.5 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
