"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePeople } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { addCrew } from "./crew-actions";
import { crewAddSchema } from "./schemas";
import { useShootAction } from "./use-shoot-action";

const EMPTY = { user_id: "", external_name: "", role: "", call_time: "" };

/** Adds a team member or an outside name to the crew. */
export function CrewAddForm({ shootId, taken }: { shootId: string; taken: string[] }) {
  const t = useTranslations("shoots.crew");
  const tc = useTranslations("common");
  const message = useMessage();
  const { people } = usePeople();
  const { pending, run } = useShootAction();
  const [kind, setKind] = useState<"member" | "outside">("member");
  const [v, setV] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const free = people.filter((p) => !taken.includes(p.id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { shoot_id: shootId, kind, ...v };
    const parsed = crewAddSchema.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    run(() => addCrew(input), { success: t("added"), onDone: () => setV(EMPTY) });
  }

  return (
    <form onSubmit={submit} noValidate className="bg-muted/40 grid gap-3 rounded-xl border p-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_7rem_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="crew-kind">{t("kind")}</Label>
        <Select value={kind} onValueChange={(k) => setKind(k as typeof kind)}>
          <SelectTrigger id="crew-kind" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="member">{t("member")}</SelectItem>
            <SelectItem value="outside">{t("outside")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {kind === "member" ? (
        <div className="min-w-0 space-y-1">
          <Label htmlFor="crew-user">{t("person")}</Label>
          <Select value={v.user_id || "none"} onValueChange={(user_id) => setV({ ...v, user_id: user_id === "none" ? "" : user_id })}>
            <SelectTrigger id="crew-user" className="w-full" aria-invalid={!!error}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{tc("none")}</SelectItem>
              {free.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="min-w-0 space-y-1">
          <Label htmlFor="crew-name">{t("outsideName")}</Label>
          <Input id="crew-name" maxLength={120} aria-invalid={!!error} value={v.external_name} onChange={(e) => setV({ ...v, external_name: e.target.value })} />
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <Label htmlFor="crew-role">{t("role")}</Label>
        <Input id="crew-role" maxLength={80} placeholder={t("rolePlaceholder")} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="crew-time">{t("callTime")}</Label>
        <Input id="crew-time" type="time" dir="ltr" value={v.call_time} onChange={(e) => setV({ ...v, call_time: e.target.value })} />
      </div>
      <Button type="submit" disabled={pending}><Plus aria-hidden /> {tc("add")}</Button>
      {error ? <p role="alert" className="text-destructive text-sm sm:col-span-5">{message(error)}</p> : null}
    </form>
  );
}
