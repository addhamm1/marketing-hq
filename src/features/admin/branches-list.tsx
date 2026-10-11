"use client";

import { KeyRound, MoreVertical, Pencil, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMessage } from "@/hooks/use-message";
import { BranchFormDialog, type BranchRow } from "./branch-form-dialog";
import { generateKioskKey, rotateQrSecret } from "./org-actions";
import { SecretDialog } from "./secret-dialog";

export function BranchesList({ branches }: { branches: BranchRow[] }) {
  const t = useTranslations("admin");
  const tm = useTranslations("checkinMethod");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [rotating, setRotating] = useState<BranchRow | null>(null);
  const [kioskUrl, setKioskUrl] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!branches.length) return <EmptyState title={tc("emptyTitle")} />;

  return (
    <>
      <ul className="divide-y rounded-xl border bg-card">
        {branches.map((b) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{locale === "ar" ? b.name_ar : b.name_en}</span>
                {!b.is_active ? <Badge variant="outline">{t("statusInactive")}</Badge> : null}
              </div>
              <div className="text-muted-foreground text-xs">{b.area}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {b.checkin_methods.map((m) => (
                  <Badge key={m} variant="secondary">
                    {tm(m)}
                  </Badge>
                ))}
                {b.public_ips.length ? (
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {b.public_ips.join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={tc("actions")}>
                  <MoreVertical aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(b)}>
                  <Pencil aria-hidden /> {tc("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    startTransition(async () => {
                      const r = await generateKioskKey({ branch_id: b.id });
                      if (r.ok) setKioskUrl(r.data.url);
                      else toast.error(message(r.error));
                    })
                  }
                >
                  <KeyRound aria-hidden /> {t("generateKioskKey")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRotating(b)}>
                  <RefreshCw aria-hidden /> {t("rotateQr")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      {editing ? <BranchFormDialog branch={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!rotating}
        onOpenChange={(o) => !o && setRotating(null)}
        title={t("rotateQr")}
        body={t("rotateQrConfirm")}
        onConfirm={() => {
          const b = rotating;
          setRotating(null);
          if (!b) return;
          startTransition(async () => {
            const r = await rotateQrSecret({ branch_id: b.id });
            if (r.ok) toast.success(t("qrRotated"));
            else toast.error(message(r.error));
          });
        }}
      />
      <SecretDialog secret={kioskUrl} title={t("kioskKeyTitle")} body={t("kioskKeyBody")} onClose={() => setKioskUrl(null)} />
    </>
  );
}
