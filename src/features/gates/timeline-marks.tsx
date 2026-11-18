"use client";

import { Clock } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { spanStyle, splitName, type Mark, type Tone } from "./layout";
import { StatusIcon } from "./status";
import { isOverdue } from "./summary";
import type { GateItem } from "./types";
import { localName } from "./use-item-text";

export type MarkProps = {
  mark: Mark<GateItem>;
  today: string;
  label: string;
  onSelect: (id: string) => void;
};

const SURFACE: Partial<Record<Tone, string>> = {
  stone: "bg-brand-stone text-secondary-foreground group-hover:bg-[color-mix(in_oklab,var(--brand-stone),var(--brand-black)_8%)]",
  light: "bg-muted text-muted-foreground ring-1 ring-inset ring-border group-hover:bg-brand-stone",
  emphasis: "bg-brand-black text-white group-hover:bg-[color-mix(in_oklab,var(--brand-black),white_16%)]",
  gate: "bg-primary text-primary-foreground group-hover:bg-[color-mix(in_oklab,var(--brand-yellow),var(--brand-black)_10%)]",
  launch: "bg-brand-black text-white group-hover:bg-[color-mix(in_oklab,var(--brand-black),white_16%)]",
  checkpoint: "bg-card text-foreground ring-2 ring-inset ring-brand-black group-hover:bg-accent",
};

const FOCUS = "group outline-none [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-ring [&:focus-visible>span]:ring-offset-1";

function Hit({ mark, label, onSelect, className, children }: Omit<MarkProps, "today"> & { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      data-testid="gate-mark"
      data-kind={mark.item.kind}
      aria-label={label}
      title={label}
      onClick={() => onSelect(mark.item.id)}
      style={spanStyle(mark.span)}
      className={cn("absolute inset-y-0 cursor-pointer px-px", FOCUS, className)}
    >
      {children}
    </button>
  );
}

/** A small badge on a marker when it has news: overdue first, then its status. */
function Corner({ item, today }: { item: GateItem; today: string }) {
  const overdue = isOverdue(item, today);
  if (!overdue && item.status === "not_started") return null;
  return (
    <span className="bg-card ring-border absolute -end-1 -top-1.5 flex size-4 items-center justify-center rounded-full shadow-sm ring-1">
      {overdue ? <Clock className="text-destructive size-3" aria-hidden /> : <StatusIcon status={item.status} className="size-3" />}
    </span>
  );
}

export function BarMark(props: MarkProps) {
  const locale = useLocale();
  const { mark } = props;
  const { head, tail } = splitName(localName(mark.item, locale));
  return (
    <Hit {...props}>
      <span className={cn("flex h-full items-center gap-1.5 overflow-hidden rounded-[3px] px-2 text-xs transition-colors duration-150", SURFACE[mark.tone])}>
        <span className="truncate font-semibold">{head}</span>
        {tail ? <span className="hidden truncate opacity-75 xl:inline">{tail}</span> : null}
        {mark.item.status !== "not_started" ? <StatusIcon status={mark.item.status} plain className="ms-auto" /> : null}
      </span>
    </Hit>
  );
}

/** Yellow gates, the black launch marker and the outlined checkpoint boxes. */
export function DayMark(props: MarkProps) {
  const { mark, today } = props;
  return (
    <Hit {...props}>
      <span
        className={cn(
          "relative flex h-full items-center justify-center rounded-[3px] text-xs font-bold tabular-nums transition-colors duration-150",
          SURFACE[mark.tone],
          isOverdue(mark.item, today) && "ring-destructive ring-2",
        )}
      >
        {Number(mark.item.due_on.slice(8))}
        <Corner item={mark.item} today={today} />
      </span>
    </Hit>
  );
}

/** The small repeating markers, such as spending gates. */
export function RecurringMark(props: MarkProps) {
  const { mark, today } = props;
  const overdue = isOverdue(mark.item, today);
  return (
    <Hit {...props}>
      <span className="group-hover:bg-accent flex h-full items-center justify-center rounded-[3px] transition-colors duration-150">
        {overdue ? (
          <Clock className="text-destructive size-3.5" aria-hidden />
        ) : mark.item.status !== "not_started" ? (
          <StatusIcon status={mark.item.status} />
        ) : (
          <span className="bg-primary ring-brand-black/70 size-2.5 rotate-45 rounded-[1px] ring-1" />
        )}
      </span>
    </Hit>
  );
}
