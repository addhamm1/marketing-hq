"use client";

import { Clock, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { usePeople } from "@/components/people-context";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import type { Person } from "@/features/boards/types";

type Props = {
  id: string;
  value: string[];
  onChange: (ids: string[]) => void;
  busy: Set<string>;
  marketingDepartments: string[];
  /** The organiser is always in the meeting, so they are not offered. */
  exclude?: string | null;
};

function PersonRow({ person, checked, busy, onToggle }: { person: Person; checked: boolean; busy: boolean; onToggle: () => void }) {
  const t = useTranslations("meetings.attendees");
  return (
    <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <UserAvatar userId={person.id} name={person.display_name} size={24} tooltip={false} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{person.display_name}</span>
        {person.title ? <span className="text-muted-foreground block truncate text-xs">{person.title}</span> : null}
      </span>
      {busy ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-800">
          <Clock className="size-3" aria-hidden />{t("busy")}
        </span>
      ) : null}
    </label>
  );
}

/** Colleagues and people from other departments, searchable, with who is busy at the time. */
export function AttendeePicker({ id, value, onChange, busy, marketingDepartments, exclude }: Props) {
  const t = useTranslations("meetings.attendees");
  const { people, byId } = usePeople();
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = people.filter((p) => p.id !== exclude && (!q || `${p.display_name} ${p.title ?? ""}`.toLowerCase().includes(q)));
    const isMarketing = (p: Person) => !!p.department_id && marketingDepartments.includes(p.department_id);
    return [
      { key: "marketing" as const, people: list.filter(isMarketing) },
      { key: "others" as const, people: list.filter((p) => !isMarketing(p)) },
    ].filter((g) => g.people.length);
  }, [people, search, exclude, marketingDepartments]);

  const toggle = (personId: string) =>
    onChange(value.includes(personId) ? value.filter((v) => v !== personId) : [...value, personId]);

  return (
    <div className="space-y-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("selected")}>
          {value.map((personId) => (
            <li key={personId} className="bg-muted inline-flex max-w-full items-center gap-1 rounded-full py-0.5 ps-2.5 pe-1 text-xs">
              <span className="truncate">{byId.get(personId)?.display_name ?? "—"}</span>
              {busy.has(personId) ? <Clock className="size-3 shrink-0 text-amber-800" aria-label={t("busy")} /> : null}
              <button
                type="button"
                onClick={() => toggle(personId)}
                aria-label={t("remove", { name: byId.get(personId)?.display_name ?? "" })}
                className="hover:bg-background grid size-5 shrink-0 place-items-center rounded-full"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
        <Input id={id} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="ps-8" autoComplete="off" />
      </div>
      <div className="max-h-52 overflow-y-auto rounded-lg border p-1">
        {groups.length ? (
          groups.map((group) => (
            <div key={group.key} role="group" aria-label={t(group.key)}>
              <p className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-semibold">{t(group.key)}</p>
              {group.people.map((p) => (
                <PersonRow key={p.id} person={p} checked={value.includes(p.id)} busy={busy.has(p.id)} onToggle={() => toggle(p.id)} />
              ))}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">{t("noMatch")}</p>
        )}
      </div>
    </div>
  );
}
