"use client";

import { Armchair, CircleCheck, CircleDashed, MapPin, MapPinCheck, MoreVertical, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddBranchDialog } from "@/features/launch/add-branch-dialog";
import { confirmBranchLocation } from "@/features/launch/org-actions";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { formatLatLng } from "@/lib/geo";
import { BranchFormDialog, type BranchRow } from "./branch-form-dialog";
import { DesksDialog } from "./desks-dialog";

type Desk = { branch_id: string; zone_name: string; assigned_user_id: string | null };

export function BranchesList({ branches, desks, zonesByMap }: { branches: BranchRow[]; desks: Desk[]; zonesByMap: Record<string, string[]> }) {
  const t = useTranslations("admin");
  const tm = useTranslations("checkinMethod");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [deskBranch, setDeskBranch] = useState<BranchRow | null>(null);
  const td = useTranslations("desks");
  const tl = useTranslations("launch.branches");
  const message = useMessage();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function confirmPoint(id: string) {
    startTransition(async () => {
      const r = await confirmBranchLocation({ id });
      if (r.ok) toast.success(tl("confirmed"));
      else toast.error(message(r.error));
      router.refresh();
    });
  }

  if (!branches.length) return <EmptyState title={tc("emptyTitle")} action={<AddBranchDialog />} />;

  return (
    <>
      <div className="mb-3 flex justify-end"><AddBranchDialog /></div>
      <ul className="divide-y rounded-xl border bg-card">
        {branches.map((b) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{locale === "ar" ? b.name_ar : b.name_en}</span>
                {!b.is_active ? <Badge variant="outline">{t("statusInactive")}</Badge> : null}
                {b.location_confirmed_at ? (
                  <Badge variant="secondary"><CircleCheck aria-hidden /> {tl("pointConfirmed")}</Badge>
                ) : (
                  <Badge variant="outline"><CircleDashed aria-hidden /> {tl("pointUnconfirmed")}</Badge>
                )}
              </div>
              <div className="text-muted-foreground text-xs">{b.area}</div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {b.latitude !== null && b.longitude !== null ? (
                  <span>
                    <span dir="ltr">{formatLatLng(b.latitude, b.longitude)}</span> · {t("radiusShort", { n: b.geofence_radius_m })}
                  </span>
                ) : (
                  <span>{t("noCoordinates")}</span>
                )}
              </div>
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
                {b.latitude !== null && !b.location_confirmed_at ? (
                  <DropdownMenuItem onSelect={() => confirmPoint(b.id)}>
                    <MapPinCheck aria-hidden /> {tl("confirm")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => setDeskBranch(b)}>
                  <Armchair aria-hidden /> {td("title")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      {editing ? <BranchFormDialog branch={editing} onClose={() => setEditing(null)} /> : null}
      {deskBranch ? (
        <DesksDialog
          branch={{ id: deskBranch.id, name: locale === "ar" ? deskBranch.name_ar : deskBranch.name_en }}
          zones={zonesByMap[deskBranch.map_key] ?? []}
          desks={desks.filter((d) => d.branch_id === deskBranch.id)}
          onClose={() => setDeskBranch(null)}
        />
      ) : null}
    </>
  );
}
