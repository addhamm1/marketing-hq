"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePeople } from "@/components/people-context";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { setAssignees } from "../card-actions";
import type { BoardSettings } from "../queries";
import { ASSIGNEE_ROLES, type AssigneeRole } from "../types";
import type { CardDetail } from "./detail-query";

export function AssigneesEditor({ card, canEdit, onChanged }: { card: CardDetail; canEdit: boolean; settings: BoardSettings; onChanged: () => void }) {
  const t = useTranslations("card");
  const tr = useTranslations("assigneeRole");
  const tc = useTranslations("common");
  const message = useMessage();
  const { people, byId } = usePeople();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AssigneeRole>("design");
  const [, startTransition] = useTransition();

  function save(next: CardDetail["assignees"]) {
    startTransition(async () => {
      const r = await setAssignees({ card_id: card.id, assignees: next });
      if (!r.ok) toast.error(message(r.error));
      onChanged();
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("assignees")}</h3>
        {canEdit ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label={t("addAssignee")}>
                <Plus aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="border-b p-2">
                <Select value={role} onValueChange={(v) => setRole(v as AssigneeRole)}>
                  <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNEE_ROLES.map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Command>
                <CommandInput placeholder={tc("search")} />
                <CommandList>
                  <CommandEmpty>{tc("emptyTitle")}</CommandEmpty>
                  <CommandGroup>
                    {people.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.display_name} ${p.id}`}
                        onSelect={() => {
                          setOpen(false);
                          if (!card.assignees.some((a) => a.user_id === p.id && a.role === role)) {
                            save([...card.assignees, { user_id: p.id, role }]);
                          }
                        }}
                      >
                        <UserAvatar userId={p.id} size={20} tooltip={false} />
                        {p.display_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {card.assignees.length === 0 ? <p className="text-muted-foreground text-xs">{tc("none")}</p> : null}
      <ul className="space-y-1.5">
        {card.assignees.map((a) => (
          <li key={`${a.user_id}-${a.role}`} className="flex items-center gap-2 text-sm">
            <UserAvatar userId={a.user_id} size={22} />
            <span className="min-w-0 flex-1 truncate">{byId.get(a.user_id)?.display_name ?? "—"}</span>
            <span className="text-muted-foreground text-xs">{tr(a.role)}</span>
            {canEdit ? (
              <Button variant="ghost" size="icon-xs" aria-label={tc("remove")}
                onClick={() => save(card.assignees.filter((x) => !(x.user_id === a.user_id && x.role === a.role)))}>
                <X aria-hidden />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
