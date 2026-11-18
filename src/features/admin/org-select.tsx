"use client";

import { useLocale, useTranslations } from "next-intl";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrgOption } from "./queries";

/** A department, team or branch picker with a "None" choice. */
export function OrgSelect<T extends FieldValues>({ control, name, options, id, disabled }: {
  control: Control<T>;
  name: FieldPath<T>;
  options: OrgOption[];
  id: string;
  disabled?: boolean;
}) {
  const locale = useLocale();
  const tc = useTranslations("common");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value ?? "none"} onValueChange={field.onChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tc("none")}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {locale === "ar" ? o.name_ar : o.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
