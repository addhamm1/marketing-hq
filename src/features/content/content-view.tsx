"use client";

import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Brand } from "@/features/boards/types";
import { useMessage } from "@/hooks/use-message";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cairoDateString, cairoInstant, formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { createPost, createPostFromCard, reschedulePost } from "./actions";
import { Counters } from "./counters";
import { ContentFiltersBar, filterPosts, NO_FILTERS, type ContentFilters } from "./filters";
import { FeedPreview } from "./feed-preview";
import { ListView } from "./list-view";
import { MonthGrid } from "./month-grid";
import { PostSheet } from "./post-sheet/post-sheet";
import { fetchPosts, fetchReadyCards } from "./queries";
import { ReadyPanel } from "./ready-panel";
import type { Post, ReadyCard } from "./types";
import { WeekView } from "./week-view";

type Option = { id: string; name_en: string; name_ar: string };
export type ContentPerms = { canEdit: boolean; canApprove: boolean; canPublish: boolean };

export function ContentView(props: {
  month: string; monthLabel: string; prev: string; next: string; today: string;
  grid: { date: string; inMonth: boolean }[]; range: { from: string; to: string };
  initialPosts: Post[]; readyCards: ReadyCard[]; brands: Brand[]; branches: Option[]; target: number; perms: ContentPerms;
}) {
  const t = useTranslations("content");
  const message = useMessage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"month" | "week" | "feed" | "list">("month");
  const [filters, setFilters] = useState<ContentFilters>(NO_FILTERS);
  const [, startTransition] = useTransition();
  const key = useMemo(() => ["posts", props.range.from, props.range.to], [props.range]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }));

  const { data: posts = props.initialPosts } = useQuery({
    queryKey: key,
    queryFn: () => fetchPosts(createClient(), props.range.from, props.range.to),
    initialData: props.initialPosts,
  });
  const { data: ready = props.readyCards } = useQuery({ queryKey: ["ready-cards"], queryFn: () => fetchReadyCards(createClient()), initialData: props.readyCards });
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["ready-cards"] });
  }, [queryClient]);
  useRealtimeRefresh("content-calendar", [{ table: "posts" }], refresh);

  const shown = useMemo(() => filterPosts(posts, filters), [posts, filters]);
  const postsByDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of shown) {
      if (!p.scheduled_at) continue;
      const d = cairoDateString(new Date(p.scheduled_at));
      m.set(d, [...(m.get(d) ?? []), p]);
    }
    for (const list of m.values()) list.sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
    return m;
  }, [shown]);
  const brandColor = useCallback((id: string) => props.brands.find((b) => b.id === id)?.color, [props.brands]);
  const weekStart = props.grid.findIndex((c) => c.date === props.today);
  const weekDays = props.grid.slice(Math.max(0, weekStart - (weekStart % 7)), Math.max(0, weekStart - (weekStart % 7)) + 7).map((c) => c.date);

  const openPost = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("post", id);
    else params.delete("post");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  function onDragEnd(e: DragEndEvent) {
    const date = e.over?.data.current?.date as string | undefined;
    if (!date) return;
    const data = e.active.data.current as { type: "post"; post: Post } | { type: "card"; card: ReadyCard } | undefined;
    if (data?.type === "post") {
      const time = data.post.scheduled_at ? formatCairo(data.post.scheduled_at, "HH:mm") : "12:00";
      const when = cairoInstant(date, time).toISOString();
      if (when === data.post.scheduled_at) return;
      queryClient.setQueryData<Post[]>(key, (old) => old?.map((p) => (p.id === data.post.id ? { ...p, scheduled_at: when } : p)));
      startTransition(async () => {
        const r = await reschedulePost({ id: data.post.id, scheduled_at: when });
        if (r.ok) toast.success(t("rescheduled"));
        else toast.error(message(r.error));
        refresh();
      });
    } else if (data?.type === "card") {
      startTransition(async () => {
        const r = await createPostFromCard({ card_id: data.card.id, scheduled_at: cairoInstant(date, "12:00").toISOString() });
        if (r.ok) {
          toast.success(t("created"));
          openPost(r.data.id);
        } else toast.error(message(r.error, r.params));
        refresh();
      });
    }
  }

  function newPost() {
    const brand = props.brands[0];
    if (!brand) return;
    startTransition(async () => {
      const r = await createPost({ brand_id: brand.id, scheduled_at: cairoInstant(props.today, "12:00").toISOString(), platforms: ["instagram"] });
      if (r.ok) {
        refresh();
        openPost(r.data.id);
      } else toast.error(message(r.error));
    });
  }

  const openId = searchParams.get("post");
  const isCalendar = view === "month" || view === "week";

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label={t("prev")}><Link href={`/content?month=${props.prev}`}><ChevronLeft className="rtl:rotate-180" aria-hidden /></Link></Button>
          <h2 className="min-w-36 text-center font-semibold">{props.monthLabel}</h2>
          <Button asChild variant="outline" size="icon" aria-label={t("next")}><Link href={`/content?month=${props.next}`}><ChevronRight className="rtl:rotate-180" aria-hidden /></Link></Button>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="ms-auto">
            <TabsList>
              <TabsTrigger value="month">{t("month")}</TabsTrigger>
              <TabsTrigger value="week">{t("week")}</TabsTrigger>
              <TabsTrigger value="feed">{t("feed")}</TabsTrigger>
              <TabsTrigger value="list">{t("list")}</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === "list" ? <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print"><Printer aria-hidden /> {t("print")}</Button> : null}
          {props.perms.canEdit ? <Button size="sm" onClick={newPost} className="no-print"><Plus aria-hidden /> {t("newPost")}</Button> : null}
        </div>
        <div className="no-print space-y-3">
          <ContentFiltersBar value={filters} onChange={setFilters} brands={props.brands} branches={props.branches} />
          <Counters posts={posts} brands={props.brands} month={props.month} target={props.target} />
        </div>
        <div className={isCalendar && props.perms.canEdit ? "grid gap-4 xl:grid-cols-[1fr_16rem]" : undefined}>
          {view === "month" ? (
            <MonthGrid grid={props.grid} today={props.today} postsByDay={postsByDay} brandColor={brandColor} canDrag={props.perms.canEdit} onOpen={openPost} />
          ) : view === "week" ? (
            <WeekView days={weekDays.length === 7 ? weekDays : props.grid.slice(0, 7).map((c) => c.date)} today={props.today} postsByDay={postsByDay} brandColor={brandColor} canDrag={props.perms.canEdit} onOpen={openPost} />
          ) : view === "feed" ? (
            <FeedPreview posts={shown} brands={props.brands} onOpen={openPost} />
          ) : (
            <ListView posts={shown} brands={props.brands} onOpen={openPost} />
          )}
          {isCalendar && props.perms.canEdit ? <ReadyPanel cards={ready} brandColor={brandColor} /> : null}
        </div>
      </div>
      {openId ? <PostSheet postId={openId} brands={props.brands} branches={props.branches} perms={props.perms} onClose={() => openPost(null)} onChanged={refresh} /> : null}
    </DndContext>
  );
}
