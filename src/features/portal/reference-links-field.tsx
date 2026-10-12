"use client";

import { Link2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useController, type Control } from "react-hook-form";
import { LinkField } from "@/components/file-dropzone/link-field";
import { Button } from "@/components/ui/button";

/** Reference links as a list of chips; the form value stays the newline-separated string the RPC expects. */
export function ReferenceLinksField({ control, name, id }: { control: Control<never>; name: string; id?: string }) {
  const t = useTranslations("media");
  const { field } = useController({ control, name: name as never });
  const links = String(field.value ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const set = (next: string[]) => field.onChange(next.join("\n") as never);

  return (
    <div className="space-y-2">
      <LinkField id={id} addOnBlur onAdd={({ url }) => (links.includes(url) ? true : (set([...links, url]), true))} />
      {links.length ? (
        <ul className="space-y-1" aria-label={t("links")}>
          {links.map((url) => (
            <li key={url} className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1 text-sm">
              <Link2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate" dir="ltr">{url}</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={t("removeLink", { url })} onClick={() => set(links.filter((l) => l !== url))}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
