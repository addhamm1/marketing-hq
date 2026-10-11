"use client";

import { Building2, Home, LogIn, LogOut, MapPinned, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { checkIn, checkOut } from "./actions";

type Branch = { id: string; name: string; methods: string[] };
type Open = { id: string; branch_id: string | null; method: string; checked_in_at: string; is_late: boolean };

export function CheckinPanel({ open, branches, homeBranchId, wfhToday, cards, qr, canCheckIn }: {
  open: Open | null;
  branches: Branch[];
  homeBranchId: string | null;
  wfhToday: boolean;
  cards: { id: string; title: string }[];
  qr: { branchId: string; token: string } | null;
  canCheckIn: boolean;
}) {
  const t = useTranslations("checkin");
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(homeBranchId ?? branches[0]?.id ?? "");
  const [cardId, setCardId] = useState("none");
  const [note, setNote] = useState("");
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "";

  function run(input: Parameters<typeof checkIn>[0] | "out") {
    startTransition(async () => {
      const r = input === "out" ? await checkOut() : await checkIn(input);
      if (r.ok) {
        toast.success(input === "out" ? t("checkedOut") : t("checkedIn"));
        router.replace("/checkin");
        router.refresh();
      } else toast.error(message(r.error, r.params));
    });
  }

  const big = "h-14 w-full text-base";

  if (open) {
    const time = formatCairo(open.checked_in_at, "HH:mm");
    return (
      <div className="bg-card space-y-5 rounded-2xl border p-6 text-center">
        <div className="bg-emerald-50 text-emerald-700 mx-auto flex size-14 items-center justify-center rounded-full">
          {open.method === "home" ? <Home className="size-7" /> : open.method === "field" ? <MapPinned className="size-7" /> : <Building2 className="size-7" />}
        </div>
        <p className="text-lg font-medium">
          {open.method === "home" ? t("checkedInHome", { time }) : open.method === "field" ? t("checkedInField", { time }) : t("checkedInAt", { branch: branchName(open.branch_id), time })}
        </p>
        {open.is_late ? <p className="text-muted-foreground text-sm">{t("late")}</p> : null}
        <Button size="lg" variant="outline" className={big} disabled={pending} onClick={() => run("out")}>
          <LogOut aria-hidden /> {t("checkOut")}
        </Button>
      </div>
    );
  }

  if (!canCheckIn) return <p className="text-muted-foreground text-sm">{tc("notAllowed")}</p>;

  if (qr) {
    return (
      <div className="bg-card space-y-5 rounded-2xl border p-6 text-center">
        <QrCode className="text-primary mx-auto size-10" aria-hidden />
        <p className="text-muted-foreground text-sm">{t("qrHint")}</p>
        <Button size="lg" className={big} disabled={pending} onClick={() => run({ method: "qr", branch_id: qr.branchId, token: qr.token })}>
          <LogIn aria-hidden /> {t("atBranch", { branch: branchName(qr.branchId) })}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border p-5">
      <p className="mb-4 text-center font-medium">{t("notCheckedIn")}</p>
      <Tabs defaultValue="office">
        <TabsList className="w-full">
          <TabsTrigger value="office" className="flex-1">{t("methodOffice")}</TabsTrigger>
          <TabsTrigger value="field" className="flex-1">{t("methodField")}</TabsTrigger>
          <TabsTrigger value="home" className="flex-1">{t("methodHome")}</TabsTrigger>
        </TabsList>
        <TabsContent value="office" className="mt-4 space-y-4">
          <p className="text-muted-foreground text-sm">{t("officeHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="checkin-branch">{t("branch")}</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger id="checkin-branch" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="lg" className={big} disabled={pending || !branchId} onClick={() => run({ method: "wifi", branch_id: branchId })}>
            <LogIn aria-hidden /> {t("checkIn")}
          </Button>
        </TabsContent>
        <TabsContent value="field" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkin-card">{t("fieldCard")}</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger id="checkin-card" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc("none")}</SelectItem>
                {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkin-note">{t("fieldNote")}</Label>
            <Textarea id="checkin-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button size="lg" className={big} disabled={pending}
            onClick={() => run({ method: "field", card_id: cardId === "none" ? null : cardId, note: note || undefined })}>
            <LogIn aria-hidden /> {t("checkIn")}
          </Button>
        </TabsContent>
        <TabsContent value="home" className="mt-4 space-y-4">
          <p className="text-muted-foreground text-sm">{wfhToday ? t("homeHint") : t("homeUnavailable")}</p>
          <Button size="lg" className={big} disabled={pending || !wfhToday} onClick={() => run({ method: "home" })}>
            <LogIn aria-hidden /> {t("checkIn")}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
