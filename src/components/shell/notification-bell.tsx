"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationsRead } from "@/features/notifications/actions";
import { useNotificationText, type NotificationRow } from "@/features/notifications/use-notification-text";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

/** Portal-only users have no team routes: point links at their portal pages. */
function portalLink(link: string, data: Record<string, unknown>, teamApp: boolean) {
  if (teamApp) return link;
  if (link.startsWith("/approvals")) return "/portal/approvals";
  if (link.startsWith("/boards") && data.card_id) return `/portal/requests/${data.card_id}`;
  if (link.startsWith("/requests")) return "/portal";
  return link;
}

export function NotificationBell({ userId, teamApp }: { userId: string; teamApp: boolean }) {
  const t = useTranslations("shell");
  const text = useNotificationText();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const key = ["notifications", userId];

  const { data = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await createClient()
        .from("notifications")
        .select("id, kind, link, data, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as NotificationRow[];
    },
    staleTime: 60_000,
  });
  useRealtimeRefresh(`notifications:${userId}`, [{ table: "notifications", filter: `user_id=eq.${userId}` }], () =>
    queryClient.invalidateQueries({ queryKey: key }),
  );
  const unread = data.filter((n) => !n.read_at).length;

  function markRead(ids?: string[]) {
    queryClient.setQueryData<NotificationRow[]>(key, (old) =>
      old?.map((n) => (!ids || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
    );
    startTransition(async () => {
      await markNotificationsRead(ids ? { ids } : {});
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label={`${t("notifications")}${unread ? ` (${unread})` : ""}`} className="relative">
          <Bell aria-hidden />
          {unread ? (
            <span className="bg-destructive absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("notifications")}</span>
          {unread ? (
            <Button variant="ghost" size="xs" onClick={() => markRead()}>
              <CheckCheck aria-hidden /> {t("markAllRead")}
            </Button>
          ) : null}
        </div>
        {data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t("noNotifications")}</p>
        ) : (
          <ul className="max-h-[60dvh] divide-y overflow-y-auto">
            {data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn("hover:bg-muted/60 flex w-full gap-2 px-3 py-2.5 text-start text-sm", !n.read_at && "bg-accent/40")}
                  onClick={() => {
                    if (!n.read_at) markRead([n.id]);
                    setOpen(false);
                    if (n.link) router.push(portalLink(n.link, n.data ?? {}, teamApp));
                  }}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{text(n)}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs" dir="ltr">
                      {formatCairo(n.created_at, "d MMM, HH:mm")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
