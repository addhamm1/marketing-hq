"use client";

import { Link2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseLink } from "@/lib/uploads/rules";

/** Paste a Drive / WeTransfer / any URL and press Enter. No integrations: it is just a link. */
export function LinkField({ onAdd, disabled, id: given, addOnBlur }: {
  onAdd: (link: { url: string; name: string }) => Promise<boolean> | boolean;
  disabled?: boolean;
  id?: string;
  /** Keep a valid link typed but not added (e.g. before submitting a form). */
  addOnBlur?: boolean;
}) {
  const t = useTranslations("media");
  const auto = useId();
  const id = given ?? auto;
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    const link = parseLink(value);
    if (!link) return setError(true);
    setBusy(true);
    const added = await onAdd(link);
    setBusy(false);
    if (added) setValue("");
  }

  return (
    <div className="space-y-1">
      {given ? null : <label htmlFor={id} className="sr-only">{t("linkLabel")}</label>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" aria-hidden />
          <Input
            id={id}
            inputMode="url"
            className="ps-8"
            placeholder={t("linkPlaceholder")}
            value={value}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            onBlur={() => {
              if (addOnBlur && parseLink(value)) add();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" disabled={disabled || busy || !value.trim()} onClick={add}>
          <Plus aria-hidden /> {t("addLink")}
        </Button>
      </div>
      {error ? <p id={`${id}-error`} className="text-destructive text-sm">{t("linkInvalid")}</p> : null}
    </div>
  );
}
