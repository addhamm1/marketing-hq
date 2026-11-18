"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePeople } from "@/components/people-context";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Search-as-you-type list of colleagues. Nobody can pick themselves. */
export function PersonPicker({ id, value, excludeId, invalid, onChange }: {
  id: string;
  value: string;
  excludeId: string;
  invalid: boolean;
  onChange: (userId: string) => void;
}) {
  const t = useTranslations("celebrations.dialog");
  const { people, byId } = usePeople();
  const [open, setOpen] = useState(false);
  const selected = value ? byId.get(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full min-w-0 justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar userId={selected.id} name={selected.display_name} size={20} tooltip={false} />
              <span className="truncate">{selected.display_name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{t("personPlaceholder")}</span>
          )}
          <ChevronsUpDown className="opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("noPeople")}</CommandEmpty>
            <CommandGroup>
              {people.filter((p) => p.id !== excludeId).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.display_name} ${p.title ?? ""} ${p.id}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <UserAvatar userId={p.id} name={p.display_name} size={20} tooltip={false} />
                  {/* Several colleagues share a first name: the title tells them apart. */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.display_name}</span>
                    {p.title ? <span className="text-muted-foreground block truncate text-xs">{p.title}</span> : null}
                  </span>
                  <Check className={cn("ms-auto", p.id === value ? "opacity-100" : "opacity-0")} aria-hidden />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
