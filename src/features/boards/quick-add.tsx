"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";

export function QuickAdd({ onAdd }: { onAdd: (title: string) => Promise<{ ok: boolean; error?: string }> }) {
  const t = useTranslations("boards");
  const tc = useTranslations("common");
  const message = useMessage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const value = title.trim();
    if (!value) return;
    startTransition(async () => {
      const r = await onAdd(value);
      if (r.ok) setTitle("");
      else toast.error(message(r.error));
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground w-full justify-start" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> {t("addCard")}
      </Button>
    );
  }
  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        rows={2}
        value={title}
        maxLength={200}
        placeholder={t("cardTitle")}
        aria-label={t("cardTitle")}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending || !title.trim()}>
          {tc("add")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {tc("cancel")}
        </Button>
      </div>
    </div>
  );
}
