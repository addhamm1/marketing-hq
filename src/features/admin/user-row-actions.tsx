"use client";

import { KeyRound, MoreVertical, Pencil, Power } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMessage } from "@/hooks/use-message";
import type { AdminUser } from "./queries";
import { SecretDialog } from "./secret-dialog";
import { resetPassword, setActive } from "./users-actions";

export function UserRowActions({
  user,
  isAdmin,
  isSelf,
  onEdit,
}: {
  user: AdminUser;
  isAdmin: boolean;
  isSelf: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const message = useMessage();
  const [confirm, setConfirm] = useState<"reset" | "active" | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const name = user.full_name || user.email;
  const active = user.status === "active";

  function run() {
    const which = confirm;
    setConfirm(null);
    startTransition(async () => {
      if (which === "reset") {
        const result = await resetPassword({ user_id: user.id });
        if (result.ok) setSecret(result.data.password);
        else toast.error(message(result.error));
      } else if (which === "active") {
        const result = await setActive({ user_id: user.id, active: !active });
        if (result.ok) toast.success(active ? t("deactivated") : t("reactivated"));
        else toast.error(message(result.error));
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tc("actions")}>
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil aria-hidden /> {t("editUser")}
          </DropdownMenuItem>
          {isAdmin ? (
            <>
              <DropdownMenuItem onSelect={() => setConfirm("reset")} disabled={!active}>
                <KeyRound aria-hidden /> {t("resetPassword")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setConfirm("active")}
                disabled={isSelf}
                variant={active ? "destructive" : "default"}
              >
                <Power aria-hidden /> {active ? t("deactivate") : t("reactivate")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t("resetPassword")}
        body={t("resetPasswordConfirm", { name })}
        onConfirm={run}
      />
      <ConfirmDialog
        open={confirm === "active"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={active ? t("deactivate") : t("reactivate")}
        body={active ? t("deactivateConfirm", { name }) : undefined}
        destructive={active}
        onConfirm={run}
      />
      <SecretDialog
        secret={secret}
        title={t("tempPasswordTitle")}
        body={t("tempPasswordBody")}
        onClose={() => setSecret(null)}
      />
    </>
  );
}
