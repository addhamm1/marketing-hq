"use client";

import { CalendarRange, CopyPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { copyLastWeek } from "./actions";
import { PlanDialog } from "./plan-dialog";
import type { WeekBoardData } from "./queries";
import { useCellLabel } from "./week-chip";
import { WeekDayList } from "./week-day-list";
import { WeekGrid, type EditTarget } from "./week-grid";
import { WeekToolbar } from "./week-toolbar";

export function WeekBoard({ data, basePath }: { data: WeekBoardData; basePath: string }) {
  const t = useTranslations("week");
  const message = useMessage();
  const router = useRouter();
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [copying, startCopying] = useTransition();
  const branchNames = useMemo(() => new Map(data.branches.map((b) => [b.id, b.name])), [data.branches]);
  const label = useCellLabel(branchNames);
  const people = data.me ? [data.me, ...data.people] : data.people;
  const openBranches = data.branches.filter((b) => b.active);

  const copy = () =>
    startCopying(async () => {
      const result = await copyLastWeek({ week: data.filters.week });
      if (!result.ok) {
        toast.error(message(result.error, result.params));
      } else if (result.data.copied === 0) {
        toast.info(t("nothingToCopy"));
      } else {
        toast.success(t("copied", { count: result.data.copied }));
        router.refresh();
      }
    });

  return (
    <>
      <WeekToolbar data={data} basePath={basePath} />

      {data.canCopy ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={copy} disabled={copying}>
            {copying ? <Loader2 className="animate-spin" aria-hidden /> : <CopyPlus aria-hidden />}
            {t("copyLastWeek")}
          </Button>
        </div>
      ) : null}

      {people.length === 0 ? (
        <EmptyState icon={<CalendarRange className="size-8" aria-hidden />} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <>
          <WeekGrid people={people} days={data.days} today={data.today} label={label} onEdit={setEditing} />
          <WeekDayList key={data.filters.week} people={people} days={data.days} today={data.today} label={label} onEdit={setEditing} />
        </>
      )}

      <PlanDialog target={editing} branches={openBranches} onClose={() => setEditing(null)} />
    </>
  );
}
