"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setPresence } from "@/features/presence/actions";
import { cn } from "@/lib/utils";

export const PRESENCE = ["available", "focus", "meeting", "shoot", "break", "away"] as const;
export type Presence = (typeof PRESENCE)[number];

export const PRESENCE_DOT: Record<Presence, string> = {
  available: "bg-emerald-500",
  focus: "bg-violet-500",
  meeting: "bg-amber-500",
  shoot: "bg-rose-500",
  break: "bg-sky-500",
  away: "bg-slate-400",
};

export function PresencePicker({ value }: { value: Presence }) {
  const t = useTranslations("presence");
  const ts = useTranslations("shell");
  const tc = useTranslations("common");
  const [current, setCurrent] = useOptimistic(value);
  const [, startTransition] = useTransition();

  function choose(next: Presence) {
    startTransition(async () => {
      setCurrent(next);
      const result = await setPresence(next);
      if (!result.ok) toast.error(tc("unknownError"));
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={ts("presence")} className="gap-2">
          <span className={cn("size-2.5 rounded-full", PRESENCE_DOT[current])} aria-hidden />
          <span className="hidden sm:inline">{t(current)}</span>
          <ChevronDown className="opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{ts("presence")}</DropdownMenuLabel>
        {PRESENCE.map((p) => (
          <DropdownMenuItem key={p} onSelect={() => choose(p)} className="gap-2">
            <span className={cn("size-2.5 rounded-full", PRESENCE_DOT[p])} aria-hidden />
            <span className="flex-1">{t(p)}</span>
            {p === current ? <Check aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
