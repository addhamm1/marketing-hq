"use client";

import { Check, CloudOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { createClient } from "@/lib/supabase/browser";
import { saveMeetingNotes } from "./actions";

const SAVE_AFTER_MS = 900;

type SaveState = "idle" | "saving" | "saved" | "failed";

/** Notes everyone in the meeting shares. They save as you type; the last save wins. */
export function NotesEditor({ id, initial, canEdit }: { id: string; initial: string; canEdit: boolean }) {
  const t = useTranslations("meetings.notes");
  const [text, setText] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const latest = useRef(initial);
  const dirty = useRef(false);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current || running.current) return;
    running.current = true;
    setState("saving");
    let sent: string;
    // Keep going until what is on screen is what was saved.
    do {
      sent = latest.current;
      const result = await saveMeetingNotes({ id, notes: sent });
      if (!result.ok) {
        running.current = false;
        setState("failed");
        return;
      }
    } while (sent !== latest.current);
    dirty.current = false;
    running.current = false;
    setState("saved");
  }, [id]);

  function change(value: string) {
    setText(value);
    latest.current = value;
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_AFTER_MS);
  }

  // Someone else's notes appear unless this person is mid-edit.
  useRealtimeRefresh(`meeting-notes-${id}`, [{ table: "meetings", filter: `id=eq.${id}` }], async () => {
    if (dirty.current) return;
    const { data } = await createClient().from("meetings").select("notes").eq("id", id).maybeSingle();
    if (data && !dirty.current) {
      latest.current = data.notes;
      setText(data.notes);
    }
  });

  // Leaving the page saves what is pending, and warns if it cannot finish first.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      void flush();
    };
  }, [flush]);

  if (!canEdit) {
    return text ? <p dir="auto" className="text-sm break-words whitespace-pre-wrap">{text}</p> : <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        dir="auto"
        rows={7}
        maxLength={20000}
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={flush}
        placeholder={t("placeholder")}
        aria-label={t("label")}
      />
      <div role="status" aria-live="polite" className="text-muted-foreground flex min-h-6 items-center gap-1.5 text-xs">
        {state === "saving" ? <><Loader2 className="size-3 animate-spin" aria-hidden />{t("saving")}</> : null}
        {state === "saved" ? <><Check className="size-3" aria-hidden />{t("saved")}</> : null}
        {state === "failed" ? (
          <>
            <CloudOff className="text-destructive size-3" aria-hidden />
            <span className="text-destructive">{t("failed")}</span>
            <Button type="button" variant="link" size="xs" onClick={flush}>{t("retry")}</Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
