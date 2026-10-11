"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { usePersonName } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import { AvatarStack } from "@/components/user-avatar";
import { formatCairo } from "@/lib/dates";
import { PriorityBadge, StageBadge } from "./badges";
import type { BoardCard, BoardList, Brand, Stage } from "./types";

type Option = { id: string; name_en: string; name_ar: string };
type SortKey = "title" | "stage" | "assignees" | "due_at" | "priority" | "department" | "vertical" | "brand";
const PRIORITY_RANK = { low: 0, normal: 1, high: 2, urgent: 3 };

type SortState = { key: SortKey; dir: 1 | -1 };

function Th({ k, sort, setSort, children }: { k: SortKey; sort: SortState; setSort: (fn: (s: SortState) => SortState) => void; children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-start font-medium whitespace-nowrap" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}
      >
        {children}
        {sort.key === k ? (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : null}
      </button>
    </th>
  );
}

export function TableView({
  cards, lists, brands, departments, onOpen, stageLabel,
}: {
  cards: BoardCard[];
  lists: BoardList[];
  brands: Brand[];
  departments: Option[];
  onOpen: (id: string) => void;
  stageLabel: (s: Stage) => string;
}) {
  const t = useTranslations("card.fields");
  const tb = useTranslations("boards");
  const locale = useLocale();
  const name = usePersonName();
  const [sort, setSort] = useState<SortState>({ key: "due_at", dir: 1 });
  const listName = useMemo(() => new Map(lists.map((l) => [l.id, l.stage ? stageLabel(l.stage) : l.name])), [lists, stageLabel]);
  const brandName = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, locale === "ar" ? d.name_ar : d.name_en])), [departments, locale]);
  const listIndex = useMemo(() => new Map(lists.map((l, i) => [l.id, i])), [lists]);

  const rows = useMemo(() => {
    const value = (c: BoardCard): string | number => {
      switch (sort.key) {
        case "title": return c.title.toLowerCase();
        case "stage": return listIndex.get(c.list_id) ?? 0;
        case "assignees": return c.assignees.map((a) => name(a.user_id)).join(", ");
        case "due_at": return c.due_at ? Date.parse(c.due_at) : Number.MAX_SAFE_INTEGER;
        case "priority": return PRIORITY_RANK[c.priority];
        case "department": return deptName.get(c.requesting_department_id ?? "") ?? "";
        case "vertical": return c.vertical ?? "";
        case "brand": return brandName.get(c.brand_id ?? "") ?? "";
      }
    };
    return [...cards].sort((a, b) => (value(a) < value(b) ? -sort.dir : value(a) > value(b) ? sort.dir : 0));
  }, [cards, sort, listIndex, name, deptName, brandName]);

  if (!cards.length) return <EmptyState title={tb("noCards")} />;

  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="text-muted-foreground border-b text-xs">
          <tr>
            <Th sort={sort} setSort={setSort} k="title">{t("title")}</Th>
            <Th sort={sort} setSort={setSort} k="stage">{tb("stage")}</Th>
            <Th sort={sort} setSort={setSort} k="assignees">{t("assignees")}</Th>
            <Th sort={sort} setSort={setSort} k="due_at">{t("due_at")}</Th>
            <Th sort={sort} setSort={setSort} k="priority">{t("priority")}</Th>
            <Th sort={sort} setSort={setSort} k="department">{t("requesting_department")}</Th>
            <Th sort={sort} setSort={setSort} k="vertical">{t("vertical")}</Th>
            <Th sort={sort} setSort={setSort} k="brand">{t("brand_id")}</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => onOpen(c.id)}>
              <td className="max-w-80 px-3 py-2 font-medium">{c.title}</td>
              <td className="px-3 py-2">{c.stage ? <StageBadge stage={c.stage} /> : listName.get(c.list_id)}</td>
              <td className="px-3 py-2"><AvatarStack ids={c.assignees.map((a) => a.user_id)} /></td>
              <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{c.due_at ? formatCairo(c.due_at, "d MMM, HH:mm") : "—"}</td>
              <td className="px-3 py-2"><PriorityBadge priority={c.priority} /></td>
              <td className="px-3 py-2">{deptName.get(c.requesting_department_id ?? "") ?? "—"}</td>
              <td className="px-3 py-2">{c.vertical ?? "—"}</td>
              <td className="px-3 py-2">{brandName.get(c.brand_id ?? "") ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
