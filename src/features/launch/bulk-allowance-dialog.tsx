"use client";

import { Loader2, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { applyAllowance, previewAllowance } from "./actions";
import { planAllowance } from "./allowance-plan";

const ANNUAL_DEFAULT = 21;

/** Sets one allowance for all staff. Nothing is saved until the admin confirms. */
export function BulkAllowanceDialog({ typeId, typeKey, typeName, year }: { typeId: string; typeKey: string; typeName: string; year: number }) {
  const t = useTranslations("launch.bulk");
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [current, setCurrent] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show() {
    setDays(typeKey === "annual_leave" ? String(ANNUAL_DEFAULT) : "");
    setOverwrite(false);
    setCurrent(null);
    setError(null);
    setOpen(true);
    startTransition(async () => {
      const r = await previewAllowance({ type_id: typeId, year });
      if (r.ok) setCurrent(r.data.current);
      else setError(message(r.error));
    });
  }

  const value = Number(days);
  const valid = days.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 365;
  const plan = current && valid ? planAllowance(current, value, overwrite) : null;

  function confirm() {
    startTransition(async () => {
      const r = await applyAllowance({ type_id: typeId, year, allowance: value, overwrite, confirmed: true });
      if (!r.ok) return setError(message(r.error));
      toast.success(t("applied", { count: r.data.changed }));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={show} disabled={!typeId}><UsersRound aria-hidden /> {t("open")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body", { type: typeName, year })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-days">{t("days")}</Label>
              <Input id="bulk-days" type="number" min={0} max={365} step={0.5} dir="ltr" className="w-28" value={days} aria-invalid={days !== "" && !valid} onChange={(e) => setDays(e.target.value)} />
              {days !== "" && !valid ? <p className="text-destructive text-sm">{t("invalidDays")}</p> : null}
            </div>
            {plan ? (
              <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm" aria-live="polite">
                <p>{t("unset", { count: plan.unset, days: value })}</p>
                {plan.custom ? (
                  <Label className="flex items-start gap-2 font-normal">
                    <Checkbox className="mt-0.5" checked={overwrite} onCheckedChange={(c) => setOverwrite(c === true)} />
                    <span>{t("overwrite", { count: plan.custom })}</span>
                  </Label>
                ) : null}
              </div>
            ) : !error && valid ? <p className="text-muted-foreground flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" aria-hidden /> {tc("loading")}</p> : null}
            {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={confirm} disabled={pending || !plan || plan.changing === 0}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {t("confirm", { count: plan?.changing ?? 0 })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
