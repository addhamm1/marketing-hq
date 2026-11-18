"use client";

import { KanbanSquare, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { linkCard, searchCards, unlinkCard } from "./equipment-actions";
import type { ShootPage } from "./queries";
import { useShootAction } from "./use-shoot-action";

type Card = ShootPage["cards"][number];

function CardSearch({ shootId, linked }: { shootId: string; linked: string[] }) {
  const t = useTranslations("shoots.cards");
  const { pending, run } = useShootAction();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const text = q.trim();
    let live = true;
    const timer = setTimeout(async () => {
      const r = text.length >= 2 ? await searchCards({ q: text }) : null;
      if (!live) return;
      setFailed(r ? !r.ok : false);
      setResults(r?.ok ? r.data : []);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const open = results.filter((r) => !linked.includes(r.id));
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
        <Input className="ps-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
      </div>
      {failed ? <p role="alert" className="text-destructive text-sm">{t("searchFailed")}</p> : null}
      {q.trim().length >= 2 && !failed && !open.length ? <p className="text-muted-foreground text-sm">{t("noResults")}</p> : null}
      {open.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {open.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => linkCard({ shoot_id: shootId, card_id: c.id }), { onDone: () => setQ("") })}>
                <Plus aria-hidden /> {t("link")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CardsSection({ shootId, cards, canEdit }: { shootId: string; cards: Card[]; canEdit: boolean }) {
  const t = useTranslations("shoots.cards");
  const ts = useTranslations("stages");
  const { pending, run } = useShootAction();
  return (
    <section className="space-y-3">
      {canEdit ? <CardSearch shootId={shootId} linked={cards.map((c) => c.id)} /> : null}
      {cards.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-4 py-3">
              <Link href={`/cards/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline">{c.title}</Link>
              {c.stage ? <Badge variant="secondary" className="max-sm:hidden">{ts(c.stage)}</Badge> : null}
              {canEdit ? (
                <Button variant="ghost" size="icon-sm" disabled={pending} aria-label={`${t("unlink")}: ${c.title}`}
                  onClick={() => run(() => unlinkCard({ shoot_id: shootId, card_id: c.id }))}><X aria-hidden /></Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("empty")} body={canEdit ? t("emptyHint") : undefined} icon={<KanbanSquare className="size-8" aria-hidden />} />
      )}
    </section>
  );
}
