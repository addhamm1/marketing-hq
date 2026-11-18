"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Award, Cake, Check, Heart, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { sendBirthdayWish } from "./actions";
import { Confetti } from "./confetti";
import { KUDOS_QUERY } from "./kudos-client";
import type { Celebration } from "./types";

function WishButton({ person, alreadySent, onSent }: { person: Celebration; alreadySent: boolean; onSent: () => void }) {
  const t = useTranslations("celebrations.today");
  const message = useMessage();
  const queryClient = useQueryClient();
  const [sent, setSent] = useState(alreadySent);
  const [pending, startTransition] = useTransition();

  function wish() {
    startTransition(async () => {
      const result = await sendBirthdayWish({ to_id: person.user_id });
      if (result.ok || result.error === "celebrations.errors.alreadyWished") setSent(true);
      if (!result.ok) {
        toast.error(message(result.error));
        return;
      }
      toast.success(t("wishSent", { name: person.display_name }));
      onSent();
      await queryClient.invalidateQueries({ queryKey: KUDOS_QUERY });
    });
  }

  if (sent) {
    return (
      <p className="text-primary-ink inline-flex items-center gap-1.5 text-sm font-medium">
        <Check className="size-4" aria-hidden /> {t("wished")}
      </p>
    );
  }
  return (
    <Button onClick={wish} disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Cake aria-hidden />}
      {pending ? t("wishing") : t("wish")}
    </Button>
  );
}

function TodayRow({ item, viewerId, wished, onKudos, onWished }: {
  item: Celebration;
  viewerId: string;
  wished: boolean;
  onKudos: (userId: string) => void;
  onWished: () => void;
}) {
  const t = useTranslations("celebrations");
  const own = item.user_id === viewerId;
  const name = item.display_name;
  const years = item.years ?? 0;
  const birthday = item.kind === "birthday";
  const Icon = birthday ? Cake : Award;
  const title = birthday
    ? t(own ? "today.ownBirthday" : "today.birthday", { name })
    : own ? t("today.ownAnniversary", { name }) : t("today.anniversary", { name, years });
  const body = birthday
    ? t(own ? "today.ownBirthdayBody" : "today.birthdayBody")
    : own ? t("today.ownAnniversaryBody", { years }) : t("today.anniversaryBody");
  return (
    <li className="flex flex-col gap-3 sm:flex-row sm:items-center" data-testid="today-item">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold break-words">{title}</p>
          <p className="text-muted-foreground text-sm">{body}</p>
        </div>
      </div>
      {own ? null : birthday ? (
        <WishButton person={item} alreadySent={wished} onSent={onWished} />
      ) : (
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => onKudos(item.user_id)}>
          <Heart aria-hidden /> {t("sendKudos")}
        </Button>
      )}
    </li>
  );
}

/** A warm note on the day itself, with confetti for those who like it. */
export function TodayBanner({ items, viewerId, wished, onKudos }: {
  items: Celebration[];
  viewerId: string;
  wished: string[];
  onKudos: (userId: string) => void;
}) {
  const t = useTranslations("celebrations.today");
  const [burst, setBurst] = useState(0);
  if (!items.length) return null;
  return (
    <section aria-label={t("label")} className="bg-accent text-accent-foreground relative mb-6 overflow-hidden rounded-xl border p-4 sm:p-5">
      <Confetti key={burst} />
      <ul className="relative space-y-4">
        {items.map((item) => (
          <TodayRow
            key={`${item.kind}-${item.user_id}`}
            item={item}
            viewerId={viewerId}
            wished={wished.includes(item.user_id)}
            onKudos={onKudos}
            onWished={() => setBurst((n) => n + 1)}
          />
        ))}
      </ul>
    </section>
  );
}
