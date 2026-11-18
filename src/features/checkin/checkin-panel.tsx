"use client";

import { AlertCircle, Loader2, LocateFixed, MapPinOff, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { checkIn } from "./actions";
import { CheckinAlternatives } from "./alternatives";
import { CheckedInCard, type OpenSession } from "./checked-in-card";
import type { FieldValues } from "./field-form";
import { geolocate, type GeoErrorKind } from "./geolocate";
import type { CheckInInput, Location } from "./schemas";

type Branch = { id: string; name: string; methods: string[] };
type Phase =
  | { k: "idle" }
  | { k: "geoError"; kind: GeoErrorKind; accuracy?: number }
  | { k: "outside"; branch: string; distance: number; location: Location }
  | { k: "error"; message: string };

export function CheckinPanel({ open, branches, homeBranchId, wfhToday, cards, shoots = [], canCheckIn }: {
  open: OpenSession | null;
  branches: Branch[];
  homeBranchId: string | null;
  wfhToday: boolean;
  cards: { id: string; title: string }[];
  shoots?: { id: string; title: string }[];
  canCheckIn: boolean;
}) {
  const t = useTranslations("checkin");
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });

  if (open) return <CheckedInCard open={open} branchName={branches.find((b) => b.id === open.branch_id)?.name ?? ""} />;
  if (!canCheckIn) return <p className="text-muted-foreground text-sm">{tc("notAllowed")}</p>;

  const busy = pending || locating;
  const distanceText = (m: number) => (m >= 1000 ? t("kilometers", { n: (m / 1000).toFixed(1) }) : t("meters", { n: m }));

  async function submit(input: CheckInInput, location?: Location) {
    const r = await checkIn(input);
    if (r.ok) {
      toast.success(r.data.branch ? t("checkedInAtBranch", { branch: r.data.branch }) : t("checkedIn"));
      setPhase({ k: "idle" });
      router.refresh();
    } else if (r.error === "checkin.errors.out_of_range" && location && r.params) {
      setPhase({ k: "outside", branch: String(r.params.branch), distance: Number(r.params.distance), location });
    } else setPhase({ k: "error", message: message(r.error, r.params) });
  }

  async function locate(strict: boolean) {
    setLocating(true);
    try {
      return await geolocate({ strict });
    } finally {
      setLocating(false);
    }
  }

  function gps() {
    startTransition(async () => {
      const geo = await locate(true);
      if (!geo.ok) return setPhase({ k: "geoError", kind: geo.kind, accuracy: geo.accuracy });
      await submit({ method: "gps", location: geo.location }, geo.location);
    });
  }

  /** Home and Wi-Fi check-ins need a reading too, but not a precise one. */
  function withLocation(build: (location: Location) => CheckInInput) {
    startTransition(async () => {
      let location = phase.k === "outside" ? phase.location : null;
      if (!location) {
        const geo = await locate(false);
        if (!geo.ok) return setPhase({ k: "geoError", kind: geo.kind, accuracy: geo.accuracy });
        location = geo.location;
      }
      await submit(build(location));
    });
  }

  function field(v: FieldValues) {
    startTransition(async () => {
      let location = phase.k === "outside" ? phase.location : null;
      if (!location) {
        const geo = await locate(false);
        if (!geo.ok) return setPhase({ k: "geoError", kind: geo.kind, accuracy: geo.accuracy });
        location = geo.location;
      }
      await submit({ method: "field", location, place: v.place || undefined, card_id: v.card_id, note: v.note || undefined, shoot_id: v.shoot_id });
    });
  }

  const status =
    phase.k === "geoError" ? (
      <Notice
        icon={MapPinOff}
        title={t("locationNeededTitle")}
        text={t(`geo.${phase.kind}`, { accuracy: phase.accuracy ?? 0 })}
        help={phase.kind === "denied" ? t("geo.deniedHelp") : undefined}
      />
    ) : phase.k === "outside" ? (
      <Notice icon={MapPinOff} title={t("outsideTitle")} text={t("outside", { distance: distanceText(phase.distance), branch: phase.branch })} />
    ) : phase.k === "error" ? (
      <Notice icon={AlertCircle} text={phase.message} />
    ) : null;

  return (
    <div className="space-y-5">
      <div className="bg-card space-y-4 rounded-2xl border p-5 text-center">
        <p className="font-medium">{t("notCheckedIn")}</p>
        {status}
        <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={gps}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : phase.k === "idle" ? <LocateFixed aria-hidden /> : <RotateCcw aria-hidden />}
          {locating ? t("locating") : phase.k === "idle" ? t("checkIn") : t("tryAgain")}
        </Button>
        <p className="text-muted-foreground text-xs" aria-live="polite">{locating ? t("locating") : t("checkInHint")}</p>
      </div>
      <section className="space-y-2">
        <h2 className="text-muted-foreground px-1 text-sm font-medium">{t("notAtBranch")}</h2>
        <CheckinAlternatives
          key={phase.k}
          branches={branches}
          homeBranchId={homeBranchId}
          wfhToday={wfhToday}
          cards={cards}
          shoots={shoots}
          pending={busy}
          initial={phase.k === "outside" ? "field" : null}
          onField={field}
          onHome={() => withLocation((location) => ({ method: "home", location }))}
          onWifi={(branch_id) => withLocation((location) => ({ method: "wifi", branch_id, location }))}
        />
      </section>
    </div>
  );
}

function Notice({ icon: Icon, title, text, help }: { icon: typeof AlertCircle; title?: string; text: string; help?: string }) {
  return (
    <div role="alert" className="bg-muted/60 flex items-start gap-3 rounded-xl p-3 text-start text-sm">
      <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <p className="text-muted-foreground">{text}</p>
        {help ? <p className="text-muted-foreground mt-1 text-xs">{help}</p> : null}
      </div>
    </div>
  );
}
