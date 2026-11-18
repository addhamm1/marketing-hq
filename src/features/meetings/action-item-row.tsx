"use client";

import { ExternalLink, KanbanSquare, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { usePeople, usePersonName } from "@/components/people-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { Link, useRouter } from "@/i18n/navigation";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { deleteActionItem, makeActionCard, updateActionItem } from "./item-actions";
import type { ActionItem } from "./types";

const NONE = "none";

type Props = { item: ActionItem; canContribute: boolean; canMakeCards: boolean; showCardLink: boolean };

export function ActionItemRow({ item, canContribute, canMakeCards, showCardLink }: Props) {
  const t = useTranslations("meetings.items");
  const message = useMessage();
  const router = useRouter();
  const personName = usePersonName();
  const { people } = usePeople();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult<unknown>>, done?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(message(result.error));
        return;
      }
      done?.();
      router.refresh();
    });
  }

  const patch = (values: Record<string, string | boolean>) => run(() => updateActionItem({ id: item.id, patch: values }));

  const makeCard = () =>
    run(() => makeActionCard({ id: item.id }), () => toast.success(t("cardCreated")));

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          checked={item.done}
          disabled={!canContribute || pending}
          onCheckedChange={(v) => patch({ done: v === true })}
          aria-label={t("markDone", { title: item.title })}
        />
        <p dir="auto" className={cn("min-w-0 flex-1 text-sm break-words", item.done && "text-muted-foreground line-through")}>{item.title}</p>
        {item.done ? <Badge variant="secondary" className="font-normal">{t("done")}</Badge> : null}
        {canContribute ? (
          <Button variant="ghost" size="icon-xs" disabled={pending} onClick={() => run(() => deleteActionItem({ id: item.id }))} aria-label={t("delete", { title: item.title })}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 ps-6">
        {canContribute ? (
          <>
            <Select value={item.assignee_id ?? NONE} disabled={pending} onValueChange={(v) => patch({ assignee_id: v === NONE ? "" : v })}>
              <SelectTrigger size="sm" className="w-40 max-w-full" aria-label={t("assignee")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("unassigned")}</SelectItem>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="date"
              dir="ltr"
              className="h-7 w-36 text-xs"
              defaultValue={item.due_on ?? ""}
              disabled={pending}
              onBlur={(e) => { if (e.target.value !== (item.due_on ?? "")) patch({ due_on: e.target.value }); }}
              aria-label={t("due")}
            />
          </>
        ) : (
          <span className="text-muted-foreground text-xs">
            {item.assignee_id ? personName(item.assignee_id) : t("unassigned")}
            {item.due_on ? <> · <span dir="ltr">{item.due_on}</span></> : null}
          </span>
        )}
        {item.card_id ? (
          showCardLink ? (
            <Button variant="link" size="sm" asChild>
              <Link href={`/cards/${item.card_id}`}><ExternalLink aria-hidden />{t("openCard")}</Link>
            </Button>
          ) : (
            <Badge variant="outline" className="font-normal"><KanbanSquare aria-hidden />{t("hasCard")}</Badge>
          )
        ) : canMakeCards ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={makeCard}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <KanbanSquare aria-hidden />}
            {t("makeCard")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
