"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EmptyState } from "@/components/states/states";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

type Person = { id: string; display_name: string; title: string | null; team_id: string | null; department_id: string | null };

export function PeopleDirectory({ people, teams, checkedIn }: { people: Person[]; teams: Record<string, { name: string; color: string }>; checkedIn: string[] }) {
  const t = useTranslations("people");
  const [q, setQ] = useState("");
  const shown = people
    .filter((p) => `${p.display_name} ${p.title ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="ps-8" />
      </div>
      {shown.length === 0 ? <EmptyState title={t("empty")} /> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => {
            const team = p.team_id ? teams[p.team_id] : undefined;
            const here = checkedIn.includes(p.id);
            return (
              <li key={p.id}>
                <Link href={`/people/${p.id}`} className="bg-card hover:bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
                  <span className="relative">
                    <UserAvatar userId={p.id} name={p.display_name} size={44} tooltip={false} />
                    {here ? <span className="ring-card absolute end-0 bottom-0 size-3 rounded-full bg-emerald-500 ring-2" aria-label={t("checkedIn")} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.display_name}</span>
                    {p.title ? <span className="text-muted-foreground block truncate text-xs">{p.title}</span> : null}
                    {team ? <span className="mt-0.5 inline-block rounded px-1.5 text-[11px] text-white" style={{ backgroundColor: team.color }}>{team.name}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
