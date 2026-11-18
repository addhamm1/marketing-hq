import { AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { RetryButton } from "./retry-button";

type Props = {
  id: string;
  icon: LucideIcon;
  title: string;
  count: number;
  failed: boolean;
  empty: string;
  /** Where to go next, shown beside the empty message and above long lists. */
  more?: { href: string; label: string };
  children: ReactNode;
};

/** One part of the briefing: its heading, then its rows, empty line or inline error. */
export async function BriefingSection({ id, icon: Icon, title, count, failed, empty, more, children }: Props) {
  const t = await getTranslations("myDay");
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20" data-testid={`section-${id}`}>
      <div className="mb-2 flex min-h-6 items-center gap-2">
        <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <h2 id={`${id}-title`} className="min-w-0 text-sm font-semibold">
          {title}
        </h2>
        {count > 0 ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2 text-xs leading-5 font-medium tabular-nums">{count}</span>
        ) : null}
        {more && count > 0 ? (
          <Link href={more.href} className="text-primary-ink ms-auto shrink-0 text-xs font-medium hover:underline">
            {more.label}
          </Link>
        ) : null}
      </div>
      {failed ? (
        <div role="alert" className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="text-destructive size-4 shrink-0" aria-hidden />
            {t("failed")}
          </span>
          <RetryButton label={t("retry")} />
        </div>
      ) : count === 0 ? (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed px-4 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {empty}
          </span>
          {more ? (
            <Link href={more.href} className="text-primary-ink text-xs font-medium hover:underline">
              {more.label}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">{children}</ul>
      )}
    </section>
  );
}

/** A tappable briefing row. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:bg-muted/40 flex min-h-12 min-w-0 items-center gap-3 px-4 py-3">
        {children}
      </Link>
    </li>
  );
}

/** How urgent a row is, always in words and with an icon as well as colour. */
export function Tag({ tone = "calm", icon: Icon, children }: { tone?: "late" | "soon" | "calm"; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        tone === "late" && "text-destructive font-semibold",
        tone === "soon" && "text-primary-ink font-medium",
        tone === "calm" && "text-muted-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}
