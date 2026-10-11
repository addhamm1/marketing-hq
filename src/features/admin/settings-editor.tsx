"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";
import { updateSetting } from "./org-actions";

type Setting = { key: string; value: string };

function SettingRow({ setting, editable }: { setting: Setting; editable: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const message = useMessage();
  const [value, setValue] = useState(setting.value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = value !== setting.value;

  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[14rem_1fr_auto] sm:items-start">
      <label htmlFor={`setting-${setting.key}`} className="font-mono text-sm break-all" dir="ltr">
        {setting.key}
      </label>
      <div>
        <Textarea
          id={`setting-${setting.key}`}
          dir="ltr"
          className="font-mono text-xs"
          rows={Math.min(8, value.split("\n").length)}
          value={value}
          disabled={!editable}
          aria-invalid={!!error}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
        />
        {error ? <p className="text-destructive mt-1 text-sm">{message(error)}</p> : null}
      </div>
      {editable ? (
        <Button
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            startTransition(async () => {
              const r = await updateSetting({ key: setting.key, value });
              if (r.ok) toast.success(t("settingSaved"));
              else setError(r.fieldErrors?.value ?? r.error);
            })
          }
        >
          {tc("save")}
        </Button>
      ) : null}
    </li>
  );
}

export function SettingsEditor({ settings, editable }: { settings: Setting[]; editable: "all" | string[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {settings.map((s) => (
        <SettingRow key={s.key} setting={s} editable={editable === "all" || editable.includes(s.key)} />
      ))}
    </ul>
  );
}
