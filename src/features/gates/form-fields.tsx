"use client";

import { useTranslations } from "next-intl";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { usePeople } from "@/components/people-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusLabel } from "./status";
import { GATE_STATUSES } from "./types";

/** Status picker: each option shows its icon and name. */
export function StatusSelect<T extends FieldValues>({ control, name, id }: { control: Control<T>; name: Path<T>; id: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {GATE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}><StatusLabel status={s} className="text-sm font-normal" /></SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function OwnerSelect<T extends FieldValues>({ control, name, id }: { control: Control<T>; name: Path<T>; id: string }) {
  const t = useTranslations("gates.fields");
  const { people } = usePeople();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value ?? "none"} onValueChange={field.onChange}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("noOwner")}</SelectItem>
            {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    />
  );
}

/** A plain select over a fixed list of options. */
export function OptionSelect<T extends FieldValues>({ control, name, id, options }: {
  control: Control<T>; name: Path<T>; id: string; options: { value: string; label: string }[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    />
  );
}
