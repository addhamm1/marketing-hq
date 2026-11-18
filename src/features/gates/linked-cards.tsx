"use client";

import { Link2, Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessage } from "@/hooks/use-message";
import { Link } from "@/i18n/navigation";
import { linkGateCard, searchGateCards, unlinkGateCard, type CardHit } from "./actions";
import type { LinkedCard } from "./types";

type SearchState = { state: "idle" | "loading" | "error" } | { state: "done"; hits: CardHit[] };

function CardSearch({ itemId, linked }: { itemId: string; linked: Set<string> }) {
  const t = useTranslations("gates.cards");
  const message = useMessage();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ state: "idle" });
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  const onChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const words = value.trim();
    latest.current = words;
    if (words.length < 2) return setSearch({ state: "idle" });
    setSearch({ state: "loading" });
    timer.current = setTimeout(async () => {
      const result = await searchGateCards(words).catch(() => null);
      if (latest.current !== words) return;
      setSearch(result?.ok ? { state: "done", hits: result.data } : { state: "error" });
    }, 250);
  };

  const link = (cardId: string) =>
    startTransition(async () => {
      const result = await linkGateCard({ item_id: itemId, card_id: cardId });
      if (result.ok) onChange("");
      else toast.error(message(result.error));
    });

  const hits = search.state === "done" ? search.hits.filter((h) => !linked.has(h.id)) : [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
        <Input value={query} onChange={(e) => onChange(e.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("search")} className="ps-8" />
      </div>
      {search.state === "loading" ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs" role="status"><Loader2 className="size-3.5 animate-spin" aria-hidden />{t("searching")}</p>
      ) : null}
      {search.state === "error" ? <p className="text-destructive text-xs" role="alert">{t("searchError")}</p> : null}
      {search.state === "done" && !hits.length ? <p className="text-muted-foreground text-xs">{t("noResults")}</p> : null}
      {hits.length ? (
        <ul className="divide-y rounded-lg border">
          {hits.map((hit) => (
            <li key={hit.id} className="flex items-center gap-2 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm">{hit.title}</span>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => link(hit.id)}>{t("link")}</Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LinkedCards({ itemId, cards, canManage }: { itemId: string; cards: LinkedCard[]; canManage: boolean }) {
  const t = useTranslations("gates.cards");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const unlink = (cardId: string) =>
    startTransition(async () => {
      const result = await unlinkGateCard({ item_id: itemId, card_id: cardId });
      if (!result.ok) toast.error(message(result.error));
    });

  return (
    <section className="space-y-2" aria-labelledby="gate-cards-title">
      <h3 id="gate-cards-title" className="text-sm font-semibold">{t("title")}</h3>
      {cards.length ? (
        <ul className="divide-y rounded-lg border">
          {cards.map((card) => (
            <li key={card.card_id} className="flex items-center gap-2 px-2 py-1">
              <Link2 className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              <Link href={`/cards/${card.card_id}`} className="min-w-0 flex-1 truncate py-1 text-sm underline-offset-2 hover:underline">{card.title}</Link>
              {canManage ? (
                <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={t("unlink", { title: card.title })} onClick={() => unlink(card.card_id)}>
                  <X aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}
      {canManage ? <CardSearch itemId={itemId} linked={new Set(cards.map((c) => c.card_id))} /> : null}
    </section>
  );
}
