"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePeople } from "@/components/people-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Brand } from "@/features/boards/types";
import { PILLARS, POST_PLATFORMS, POST_STATUSES, type Post } from "./types";

export type ContentFilters = { brand: string; platform: string; status: string; pillar: string; owner: string; branch: string };
export const NO_FILTERS: ContentFilters = { brand: "all", platform: "all", status: "all", pillar: "all", owner: "all", branch: "all" };

export function filterPosts(posts: Post[], f: ContentFilters) {
  return posts.filter((p) =>
    (f.brand === "all" || p.brand_id === f.brand) &&
    (f.platform === "all" || p.platforms.includes(f.platform)) &&
    (f.status === "all" || p.status === f.status) &&
    (f.pillar === "all" || p.pillar === f.pillar) &&
    (f.owner === "all" || p.owner_id === f.owner) &&
    (f.branch === "all" || p.branch_id === f.branch));
}

export function ContentFiltersBar({ value, onChange, brands, branches }: {
  value: ContentFilters; onChange: (f: ContentFilters) => void; brands: Brand[]; branches: { id: string; name_en: string; name_ar: string }[];
}) {
  const t = useTranslations("content");
  const tp = useTranslations("platform");
  const locale = useLocale();
  const { people } = usePeople();
  const sel = (key: keyof ContentFilters, any: string, items: { value: string; label: string }[], width = "w-36") => (
    <Select value={value[key]} onValueChange={(v) => onChange({ ...value, [key]: v })}>
      <SelectTrigger size="sm" className={width} aria-label={any}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{any}</SelectItem>
        {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {sel("brand", t("anyBrand"), brands.map((b) => ({ value: b.id, label: b.name })))}
      {sel("platform", t("anyPlatform"), POST_PLATFORMS.map((p) => ({ value: p, label: tp(p) })))}
      {sel("status", t("anyStatus"), POST_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })))}
      {sel("pillar", t("anyPillar"), PILLARS.map((p) => ({ value: p, label: t(`pillar.${p}`) })))}
      {sel("owner", t("anyOwner"), people.map((p) => ({ value: p.id, label: p.display_name })))}
      {sel("branch", t("anyBranch"), branches.map((b) => ({ value: b.id, label: locale === "ar" ? b.name_ar : b.name_en })), "w-40")}
    </div>
  );
}
