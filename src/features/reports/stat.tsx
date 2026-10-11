"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type DrillCard = { id: string; title: string };

/** Headline number; when cards are given, it opens the list of cards behind it. */
export function Stat({ label, value, hint, cards }: { label: string; value: ReactNode; hint?: ReactNode; cards?: DrillCard[] }) {
  const t = useTranslations("reports");
  const [open, setOpen] = useState(false);
  const clickable = !!cards?.length;
  const body = (
    <>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </>
  );
  return (
    <>
      {clickable ? (
        <button type="button" onClick={() => setOpen(true)} className={cn("bg-card rounded-xl border p-4 text-start transition-colors hover:bg-muted/40")} aria-label={`${label}: ${t("viewCards")}`}>
          {body}
        </button>
      ) : (
        <div className="bg-card rounded-xl border p-4">{body}</div>
      )}
      {clickable ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[80dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
            <ul className="divide-y text-sm">
              {cards!.map((c) => <li key={c.id}><Link href={`/cards/${c.id}`} className="block py-2 hover:underline">{c.title}</Link></li>)}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card space-y-3 rounded-xl border p-4", className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
