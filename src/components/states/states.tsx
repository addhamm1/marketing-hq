import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      <div className="text-muted-foreground mb-1">{icon ?? <Inbox className="size-8" aria-hidden />}</div>
      <p className="font-medium">{title}</p>
      {body ? <p className="text-muted-foreground max-w-sm text-sm">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="border-destructive/30 bg-destructive/5 flex flex-col items-center gap-2 rounded-xl border px-6 py-10 text-center">
      <AlertTriangle className="text-destructive size-7" aria-hidden />
      <p className="font-medium">{title}</p>
      {body ? <p className="text-muted-foreground max-w-sm text-sm">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
