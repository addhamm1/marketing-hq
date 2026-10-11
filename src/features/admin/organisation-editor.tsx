"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePeople } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { setDefaultApprover, updateTeam } from "./org-actions";

type Dept = { id: string; name_en: string; name_ar: string; is_marketing: boolean; default_approver_id: string | null };
type Team = { id: string; name_en: string; name_ar: string; color: string };

function TeamRow({ team }: { team: Team }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const [v, setV] = useState(team);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(v) !== JSON.stringify(team);
  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
      <Input dir="ltr" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} aria-label={t("nameEn")} />
      <Input dir="rtl" value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} aria-label={t("nameAr")} />
      <input type="color" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} aria-label={t("teamColor")} className="h-9 w-14 cursor-pointer rounded border" />
      <Button size="sm" disabled={!dirty || pending}
        onClick={() => startTransition(async () => { const r = await updateTeam(v); if (r.ok) { toast.success(t("teamSaved")); router.refresh(); } else toast.error(message(r.error)); })}>
        {tc("save")}
      </Button>
    </li>
  );
}

export function OrganisationEditor({ departments, teams }: { departments: Dept[]; teams: Team[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const router = useRouter();
  const { people } = usePeople();
  const [, startTransition] = useTransition();
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("departments")}</h2>
        <ul className="bg-card divide-y rounded-xl border">
          {departments.filter((d) => !d.is_marketing).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-32 flex-1 font-medium">{locale === "ar" ? d.name_ar : d.name_en}</span>
              <Select value={d.default_approver_id ?? "none"}
                onValueChange={(v) => startTransition(async () => {
                  const r = await setDefaultApprover({ department_id: d.id, user_id: v === "none" ? null : v });
                  if (r.ok) { toast.success(tc("saved")); router.refresh(); } else toast.error(message(r.error));
                })}>
                <SelectTrigger size="sm" className="w-56" aria-label={t("defaultApprover")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  {people.filter((p) => p.department_id === d.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{t("defaultApprover")}</p>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("teams")}</h2>
        <ul className="bg-card divide-y rounded-xl border">{teams.map((tm) => <TeamRow key={tm.id} team={tm} />)}</ul>
      </section>
    </div>
  );
}
