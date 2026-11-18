"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOOK_NAME_MAX, LOOK_SLOTS } from "@/game/avatar/config";
import type { AvatarConfig, SavedLook, SpriteManifest } from "@/game/avatar/types";
import { useMessage } from "@/hooks/use-message";
import { saveLook } from "./actions";
import { SpriteThumb } from "./sprite-thumb";

function LookSlot({ slot, look, worn, manifest, onApply, onSaved }: {
  slot: number;
  look: SavedLook | undefined;
  worn: AvatarConfig;
  manifest: SpriteManifest;
  onApply: (config: AvatarConfig) => void;
  onSaved: (looks: SavedLook[]) => void;
}) {
  const t = useTranslations("character.looks");
  const message = useMessage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(look?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = `look-name-${slot}`;

  const submit = () => startTransition(async () => {
    const result = await saveLook({ slot, name, config: worn });
    if (!result.ok) {
      const field = result.fieldErrors?.name;
      if (field) setError(message(field));
      else toast.error(message(result.error));
      return;
    }
    setError(null);
    setEditing(false);
    onSaved(result.data);
    toast.success(t("saved"));
  });

  return (
    <li className="bg-card space-y-2 rounded-xl border p-3" data-testid="look-slot">
      <div className="flex items-center gap-3">
        <div className="bg-muted shrink-0 rounded-lg">
          {look ? <SpriteThumb config={look.config} manifest={manifest} view="body" /> : <div className="size-14" />}
        </div>
        <p className="min-w-0 flex-1 truncate font-medium">{look?.name ?? t("emptySlot", { n: slot + 1 })}</p>
      </div>
      {editing ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label htmlFor={inputId} className="text-sm font-medium">{t("nameLabel")}</label>
          <Input
            id={inputId}
            value={name}
            maxLength={LOOK_NAME_MAX}
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(e) => { setName(e.target.value); setError(null); }}
          />
          {error ? <p id={`${inputId}-error`} className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" className="min-h-11 flex-1" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}{t("confirm")}
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => { setEditing(false); setError(null); }}>{t("cancel")}</Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          {look ? <Button type="button" variant="secondary" className="min-h-11 flex-1" onClick={() => onApply(look.config)}>{t("apply")}</Button> : null}
          <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => setEditing(true)}>{look ? t("overwrite") : t("saveHere")}</Button>
        </div>
      )}
    </li>
  );
}

/** Three named outfits a person can come back to. */
export function LooksPanel({ looks, worn, manifest, onApply, onSaved }: {
  looks: SavedLook[];
  worn: AvatarConfig;
  manifest: SpriteManifest;
  onApply: (config: AvatarConfig) => void;
  onSaved: (looks: SavedLook[]) => void;
}) {
  const t = useTranslations("character.looks");
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: LOOK_SLOTS }, (_, slot) => (
          <LookSlot key={slot} slot={slot} look={looks.find((l) => l.slot === slot)} worn={worn} manifest={manifest} onApply={onApply} onSaved={onSaved} />
        ))}
      </ul>
    </div>
  );
}
