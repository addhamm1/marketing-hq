"use client";

import { BellRing, Info, Mail, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setDigestEmail } from "./actions";
import type { PushSupport } from "./support";
import { usePushDevice } from "./use-push-device";

function SettingRow({ icon, title, body, control, children }: { icon: ReactNode; title: ReactNode; body: string; control: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        {title}
        <p className="text-muted-foreground mt-0.5 text-sm">{body}</p>
        {children}
      </div>
      <span className="mt-0.5 shrink-0">{control}</span>
    </div>
  );
}

function SupportHint({ support }: { support: Exclude<PushSupport, "ready"> }) {
  const t = useTranslations("pushSettings.hints");
  return (
    <div className="bg-muted/50 mt-2 flex gap-2 rounded-lg p-3 text-sm" data-testid={`push-hint-${support}`}>
      {support === "install-ios" ? <Share className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden />}
      {support === "install-ios" ? (
        <div className="min-w-0">
          <p className="font-medium">{t("iosTitle")}</p>
          <ol className="text-muted-foreground mt-1 list-decimal space-y-0.5 ps-4">
            <li>{t("iosStep1")}</li>
            <li>{t("iosStep2")}</li>
            <li>{t("iosStep3")}</li>
          </ol>
        </div>
      ) : (
        <p className="text-muted-foreground min-w-0">{t(support)}</p>
      )}
    </div>
  );
}

function DeviceRow({ vapidKey }: { vapidKey: string | null }) {
  const t = useTranslations("pushSettings");
  const root = useTranslations();
  const id = useId();
  const { support, on, busy, error, enable, disable } = usePushDevice(vapidKey);
  const usable = support === "ready";
  return (
    <SettingRow
      icon={<BellRing className="size-5" aria-hidden />}
      title={<Label htmlFor={id} className="font-medium">{t("deviceTitle")}</Label>}
      body={on ? t("deviceOn") : t("deviceBody")}
      control={
        <Switch
          id={id}
          checked={on}
          disabled={!usable || busy}
          onCheckedChange={(next) => void (next ? enable() : disable())}
          data-testid="push-switch"
        />
      }
    >
      {support !== "ready" && support !== "checking" ? <SupportHint support={support} /> : null}
      {error ? (
        <p role="alert" className="text-destructive mt-1.5 text-sm">
          {root(error as never)}
        </p>
      ) : null}
    </SettingRow>
  );
}

function DigestRow({ initial }: { initial: boolean }) {
  const t = useTranslations("pushSettings");
  const root = useTranslations();
  const id = useId();
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const change = (next: boolean) => {
    setEnabled(next);
    setError(null);
    start(async () => {
      const result = await setDigestEmail({ enabled: next });
      if (!result.ok) {
        setEnabled(!next);
        setError(result.error);
      }
    });
  };

  return (
    <SettingRow
      icon={<Mail className="size-5" aria-hidden />}
      title={<Label htmlFor={id} className="font-medium">{t("digestTitle")}</Label>}
      body={t("digestBody")}
      control={<Switch id={id} checked={enabled} disabled={pending} onCheckedChange={change} data-testid="digest-switch" />}
    >
      {error ? (
        <p role="alert" className="text-destructive mt-1.5 text-sm">
          {root(error as never)}
        </p>
      ) : null}
    </SettingRow>
  );
}

/** Phone notifications for this device, and the morning email. */
export function NotificationSettings({ vapidKey, digest, showDigest }: { vapidKey: string | null; digest: boolean; showDigest: boolean }) {
  return (
    <div className="grid gap-5">
      <DeviceRow vapidKey={vapidKey} />
      {showDigest ? <DigestRow initial={digest} /> : null}
    </div>
  );
}
