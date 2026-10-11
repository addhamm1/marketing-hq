"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePeople, usePersonName } from "@/components/people-context";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";
import { formatCairo } from "@/lib/dates";
import { addComment, deleteComment } from "../card-extras-actions";
import type { CardDetail } from "./detail-query";

/** Highlight @mentions in a comment body. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(@[\p{L}\p{N}_.-]+(?:\s[\p{L}\p{N}_.-]+)?)/u);
  return (
    <p className="text-sm break-words whitespace-pre-wrap">
      {parts.map((p, i) => (p.startsWith("@") ? <span key={i} className="text-primary font-medium">{p}</span> : p))}
    </p>
  );
}

export function CommentsSection({ card, me, onChanged }: { card: CardDetail; me: string; onChanged: () => void }) {
  const t = useTranslations("card");
  const tc = useTranslations("common");
  const message = useMessage();
  const name = usePersonName();
  const { people } = usePeople();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<Map<string, string>>(new Map());
  const [query, setQuery] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return people.filter((p) => p.display_name.toLowerCase().includes(q)).slice(0, 6);
  }, [people, query]);

  function onType(value: string) {
    setBody(value);
    const caret = ref.current?.selectionStart ?? value.length;
    const match = value.slice(0, caret).match(/@([\p{L}\p{N}_.-]*)$/u);
    setQuery(match ? match[1] : null);
  }

  function pick(id: string, display: string) {
    const caret = ref.current?.selectionStart ?? body.length;
    const before = body.slice(0, caret).replace(/@([\p{L}\p{N}_.-]*)$/u, `@${display} `);
    setBody(before + body.slice(caret));
    setMentions(new Map(mentions).set(id, display));
    setQuery(null);
    ref.current?.focus();
  }

  function submit() {
    const text = body.trim();
    if (!text) return;
    const ids = [...mentions].filter(([, display]) => text.includes(`@${display}`)).map(([id]) => id);
    startTransition(async () => {
      const r = await addComment({ card_id: card.id, body: text, mentions: ids });
      if (r.ok) {
        setBody("");
        setMentions(new Map());
        onChanged();
      } else toast.error(message(r.error));
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{t("comments")}</h3>
      {card.comments.length === 0 ? <p className="text-muted-foreground text-xs">{t("noComments")}</p> : null}
      <ul className="space-y-3">
        {card.comments.map((c) => (
          <li key={c.id} className="flex gap-2.5">
            <UserAvatar userId={c.author_id} size={28} />
            <div className="min-w-0 flex-1 rounded-lg bg-muted/50 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-2 text-xs">
                <span className="font-medium">{name(c.author_id)}</span>
                <span className="text-muted-foreground" dir="ltr">{formatCairo(c.created_at, "d MMM, HH:mm")}</span>
                {c.edited_at ? <span className="text-muted-foreground">({t("edited")})</span> : null}
                {c.author_id === me ? (
                  <Button variant="ghost" size="icon-xs" className="ms-auto" aria-label={tc("delete")}
                    onClick={() => startTransition(async () => {
                      const r = await deleteComment({ id: c.id });
                      if (!r.ok) toast.error(message(r.error));
                      onChanged();
                    })}>
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
              <Body text={c.body} />
            </div>
          </li>
        ))}
      </ul>
      <div className="relative space-y-2">
        <Textarea
          ref={ref}
          rows={3}
          value={body}
          maxLength={5000}
          placeholder={t("writeComment")}
          aria-label={t("writeComment")}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery(null);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        {suggestions.length ? (
          <ul className="bg-popover absolute inset-x-0 bottom-full z-20 mb-1 max-h-56 overflow-y-auto rounded-lg border p-1 shadow-md" role="listbox">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button type="button" role="option" aria-selected={false} onClick={() => pick(p.id, p.display_name)}
                  className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm">
                  <UserAvatar userId={p.id} size={20} tooltip={false} />
                  {p.display_name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>{t("postComment")}</Button>
      </div>
    </section>
  );
}
