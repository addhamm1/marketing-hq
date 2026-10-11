"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { importTrello } from "./actions";
import { parseTrello, type TrelloImport } from "./parse";

export function TrelloImportForm({ boards }: { boards: { id: string; name: string }[] }) {
  const t = useTranslations("trello");
  const message = useMessage();
  const router = useRouter();
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [raw, setRaw] = useState<unknown>(null);
  const [preview, setPreview] = useState<TrelloImport | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const json: unknown = JSON.parse(await file.text());
      const parsed = parseTrello(json, boardId);
      if (!parsed) throw new Error("invalid");
      setRaw(json);
      setPreview(parsed);
    } catch {
      setPreview(null);
      toast.error(t("invalidFile"));
    }
  }

  return (
    <div className="bg-card max-w-xl space-y-5 rounded-xl border p-5">
      <p className="text-muted-foreground text-sm">{t("intro")}</p>
      <div className="space-y-2">
        <Label htmlFor="trello-board">{t("targetBoard")}</Label>
        <Select value={boardId} onValueChange={(v) => { setBoardId(v); if (raw) setPreview(parseTrello(raw, v)); }}>
          <SelectTrigger id="trello-board" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="trello-file">{t("file")}</Label>
        <input id="trello-file" type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])}
          className="file:bg-secondary block w-full text-sm file:me-3 file:rounded-md file:border-0 file:px-3 file:py-1.5" />
      </div>
      {preview ? (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium">{t("preview")}</p>
          <p className="text-muted-foreground">
            {t("counts", {
              lists: preview.lists.length,
              cards: preview.cards.length,
              checklists: preview.cards.reduce((n, c) => n + c.checklists.length, 0),
              comments: preview.cards.reduce((n, c) => n + c.comments.length, 0),
              labels: preview.labels.length,
            })}
          </p>
        </div>
      ) : null}
      <Button disabled={!preview || !boardId || pending}
        onClick={() => startTransition(async () => {
          const r = await importTrello({ ...preview!, board_id: boardId });
          if (r.ok) {
            toast.success(t("imported", { cards: r.data.cards }));
            router.push(`/boards/${boardId}`);
          } else toast.error(message(r.error));
        })}>
        <Upload aria-hidden /> {t("import")}
      </Button>
    </div>
  );
}
