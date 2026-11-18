"use client";

import { Coffee, Hand, type LucideIcon, MessageCircle, Music2, PartyPopper, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { MapInteractionKind } from "@/game";

const WITH_OTHERS: { kind: MapInteractionKind; icon: LucideIcon }[] = [
  { kind: "wave", icon: Hand },
  { kind: "high_five", icon: Sparkles },
  { kind: "coffee", icon: Coffee },
  { kind: "chat", icon: MessageCircle },
];

const ON_MY_OWN: { kind: MapInteractionKind; icon: LucideIcon }[] = [
  { kind: "dance", icon: Music2 },
  { kind: "clap", icon: PartyPopper },
];

/** Things to do on the floor: greet a colleague, or show off on your own character. */
export function CharacterActions({ self, onAct }: { self: boolean; onAct: (kind: MapInteractionKind) => void }) {
  const t = useTranslations("map.interact");
  const actions = self ? ON_MY_OWN : WITH_OTHERS;
  return (
    <div role="group" aria-label={t(self ? "yourMoves" : "sayHello")} className="mt-3 border-t pt-2">
      <p className="text-muted-foreground mb-1.5 text-xs font-medium">{t(self ? "yourMoves" : "sayHello")}</p>
      <div className={self ? "grid grid-cols-2 gap-1" : "grid grid-cols-4 gap-1"}>
        {actions.map(({ kind, icon: Icon }) => (
          <Button
            key={kind}
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto min-h-12 min-w-0 flex-col gap-1 px-1 py-1.5 text-[11px] leading-tight font-medium whitespace-normal"
            onClick={() => onAct(kind)}
          >
            <Icon className="size-4" aria-hidden />
            {t(`actions.${kind}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
