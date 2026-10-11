"use client";

import { Mail, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { PRESENCE_DOT, type Presence } from "@/components/shell/presence-picker";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

type Labels = Record<"team" | "department" | "branch" | "contact" | "checkedIn" | "notCheckedIn" | "openCards", string>;

export function ProfileCard({ person, team, teamColor, department, branch, email, phone, presence, checkedIn, openCards, labels }: {
  person: { id: string; display_name: string; title: string | null };
  team: string | null; teamColor: string | null; department: string | null; branch: string | null;
  email: string | null; phone: string | null; presence: Presence | null; checkedIn: boolean; openCards: number; labels: Labels;
}) {
  const tp = useTranslations("presence");
  const rows: [string, string | null][] = [[labels.team, team], [labels.department, department], [labels.branch, branch]];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
        <UserAvatar userId={person.id} name={person.display_name} size={112} tooltip={false} />
        <div>
          <h1 className="text-xl font-semibold">{person.display_name}</h1>
          {person.title ? <p className="text-muted-foreground text-sm">{person.title}</p> : null}
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {team ? <span className="rounded-full px-2 py-0.5 text-white" style={{ backgroundColor: teamColor ?? "#64748B" }}>{team}</span> : null}
          <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2 py-0.5">
            <span className={cn("size-2 rounded-full", checkedIn ? "bg-emerald-500" : "bg-slate-300")} />
            {checkedIn ? labels.checkedIn : labels.notCheckedIn}
          </span>
          {presence && checkedIn ? (
            <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2 py-0.5">
              <span className={cn("size-2 rounded-full", PRESENCE_DOT[presence])} /> {tp(presence)}
            </span>
          ) : null}
        </div>
      </div>
      <dl className="bg-card grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 rounded-2xl border p-5 text-sm">
        {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>))}
        <dt className="text-muted-foreground">{labels.openCards}</dt><dd className="tabular-nums">{openCards}</dd>
        {email || phone ? (
          <>
            <dt className="text-muted-foreground">{labels.contact}</dt>
            <dd className="space-y-1">
              {email ? <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:underline" dir="ltr"><Mail className="size-3.5" />{email}</a> : null}
              {phone ? <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:underline" dir="ltr"><Phone className="size-3.5" />{phone}</a> : null}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
