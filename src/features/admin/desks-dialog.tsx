"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { usePeople } from "@/components/people-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { setDesk } from "./org-actions";

export function DesksDialog({ branch, zones, desks, onClose }: {
  branch: { id: string; name: string };
  zones: string[];
  desks: { zone_name: string; assigned_user_id: string | null }[];
  onClose: () => void;
}) {
  const t = useTranslations("desks");
  const message = useMessage();
  const router = useRouter();
  const { people } = usePeople();
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("title")} · {branch.name}</DialogTitle></DialogHeader>
        <ul className="divide-y">
          {zones.map((z) => {
            const current = desks.find((d) => d.zone_name === z)?.assigned_user_id ?? "none";
            return (
              <li key={z} className="flex items-center gap-3 py-2">
                <span className="w-20 text-sm font-medium">{t("desk", { n: z.slice(5) })}</span>
                <Select value={current} disabled={pending}
                  onValueChange={(v) => startTransition(async () => {
                    const r = await setDesk({ branch_id: branch.id, zone_name: z, user_id: v === "none" ? null : v });
                    if (r.ok) { toast.success(t("saved")); router.refresh(); } else toast.error(message(r.error));
                  })}>
                  <SelectTrigger size="sm" className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("free")}</SelectItem>
                    {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
