"use client";

import { Home, MapPinned, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FieldForm, type FieldValues } from "./field-form";

type Branch = { id: string; name: string; methods: string[] };
type Open = "field" | "home" | "wifi" | null;

/** Other ways to check in: field day, work from home (approved WFH only) and office Wi-Fi. */
export function CheckinAlternatives({ branches, homeBranchId, wfhToday, cards, pending, initial = null, onField, onHome, onWifi }: {
  branches: Branch[];
  homeBranchId: string | null;
  wfhToday: boolean;
  cards: { id: string; title: string }[];
  pending: boolean;
  initial?: Open;
  onField: (v: FieldValues) => void;
  onHome: () => void;
  onWifi: (branchId: string) => void;
}) {
  const t = useTranslations("checkin");
  const [open, setOpen] = useState<Open>(initial);
  const wifiBranches = branches.filter((b) => b.methods.includes("wifi"));
  const [branchId, setBranchId] = useState(
    wifiBranches.find((b) => b.id === homeBranchId)?.id ?? wifiBranches[0]?.id ?? "",
  );

  const item = (key: Exclude<Open, null>, Icon: typeof Home, title: string, body: React.ReactNode) => (
    <li className={cn("rounded-xl border", open === key && "bg-muted/40")}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium"
        aria-expanded={open === key}
        onClick={() => setOpen(open === key ? null : key)}
      >
        <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden />
        {title}
      </button>
      {open === key ? <div className="px-4 pb-4">{body}</div> : null}
    </li>
  );

  return (
    <ul className="space-y-2">
      {item("field", MapPinned, t("fieldTitle"), <FieldForm cards={cards} pending={pending} onSubmit={onField} />)}
      {item(
        "home",
        Home,
        t("homeTitle"),
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">{wfhToday ? t("homeHint") : t("homeUnavailable")}</p>
          <Button className="h-12 w-full" disabled={pending || !wfhToday} onClick={onHome}>{t("checkIn")}</Button>
        </div>,
      )}
      {wifiBranches.length
        ? item(
            "wifi",
            Wifi,
            t("wifiTitle"),
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">{t("wifiHint")}</p>
              <div className="space-y-2">
                <Label htmlFor="checkin-branch">{t("branch")}</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger id="checkin-branch" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{wifiBranches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="h-12 w-full" disabled={pending || !branchId} onClick={() => onWifi(branchId)}>{t("checkIn")}</Button>
            </div>,
          )
        : null}
    </ul>
  );
}
