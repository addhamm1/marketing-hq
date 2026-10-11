"use client";

import { Archive, MoreHorizontal, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { archiveBoard, updateBoard } from "./board-actions";

export function BoardMenu({
  board,
  afterArchive,
}: {
  board: { id: string; name: string; visibility: "marketing" | "private" };
  afterArchive?: string;
}) {
  const t = useTranslations("boards");
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [name, setName] = useState(board.name);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tc("actions")}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil aria-hidden /> {t("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setArchiving(true)}>
            <Archive aria-hidden /> {t("archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rename")}</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("boardName")} maxLength={120} />
          <DialogFooter>
            <Button
              disabled={pending || !name.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await updateBoard({ id: board.id, name });
                  if (r.ok) {
                    setRenaming(false);
                    router.refresh();
                  } else toast.error(message(r.error));
                })
              }
            >
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title={t("archive")}
        body={t("archiveBoardConfirm")}
        destructive
        onConfirm={() =>
          startTransition(async () => {
            const r = await archiveBoard({ id: board.id });
            if (r.ok) {
              toast.success(t("boardArchived"));
              if (afterArchive) router.push(afterArchive);
              else router.refresh();
            } else toast.error(message(r.error));
          })
        }
      />
    </>
  );
}
