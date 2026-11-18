"use client";

import { Archive, Pencil, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import { archiveShoot, setShootStatus } from "./actions";
import { SHOOT_STATUSES, type ShootInput, type ShootStatus } from "./schemas";
import { ShootForm, type BranchOption } from "./shoot-form";
import { useShootAction } from "./use-shoot-action";

/** Header buttons of a shoot: status, edit, call sheet and archive. */
export function ShootActions({ shootId, status, canEdit, canArchive, defaults, branches }: {
  shootId: string;
  status: ShootStatus;
  canEdit: boolean;
  canArchive: boolean;
  defaults: ShootInput;
  branches: BranchOption[];
}) {
  const t = useTranslations("shoots");
  const ts = useTranslations("shoots.status");
  const tc = useTranslations("common");
  const router = useRouter();
  const { pending, run } = useShootAction();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  return (
    <>
      {canEdit ? (
        <Select value={status} disabled={pending} onValueChange={(v) => run(() => setShootStatus({ id: shootId, status: v }), { success: tc("saved") })}>
          <SelectTrigger size="sm" className="w-36" aria-label={tc("status")}><SelectValue /></SelectTrigger>
          <SelectContent>{SHOOT_STATUSES.map((s) => <SelectItem key={s} value={s}>{ts(s)}</SelectItem>)}</SelectContent>
        </Select>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link href={`/shoots/${shootId}/call-sheet`}><Printer aria-hidden /> {t("callSheet")}</Link>
      </Button>
      {canEdit ? (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil aria-hidden /> {tc("edit")}</Button>
      ) : null}
      {canArchive ? (
        <Button variant="ghost" size="sm" onClick={() => setArchiving(true)}><Archive aria-hidden /> {t("archive")}</Button>
      ) : null}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{t("editTitle")}</DialogTitle></DialogHeader>
          <ShootForm shootId={shootId} defaults={defaults} branches={branches} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title={t("archiveTitle")}
        body={t("archiveBody")}
        confirmLabel={t("archive")}
        destructive
        onConfirm={() => run(() => archiveShoot({ id: shootId }), { success: t("archived"), onDone: () => router.push("/shoots") })}
      />
    </>
  );
}
