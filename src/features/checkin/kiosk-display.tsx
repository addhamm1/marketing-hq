"use client";

import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Full-screen rotating QR for the reception tablet. Polls the token endpoint each window. */
export function KioskDisplay({ branchId, kioskKey, branchName }: { branchId: string; kioskKey: string; branchName: string }) {
  const t = useTranslations("kiosk");
  const locale = useLocale();
  const [src, setSrc] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/kiosk/${branchId}/token?key=${encodeURIComponent(kioskKey)}&locale=${locale}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const { url, expiresAt } = (await res.json()) as { url: string; expiresAt: number };
        const data = await QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: "M", color: { dark: "#0f2a33", light: "#ffffff" } });
        if (!alive) return;
        setSrc(data);
        setOffline(false);
        timer = setTimeout(tick, Math.max(2_000, expiresAt - Date.now() + 500));
      } catch {
        if (!alive) return;
        setOffline(true);
        timer = setTimeout(tick, 10_000);
      }
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [branchId, kioskKey, locale]);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });
    const update = () => setClock(fmt.format(new Date()));
    update();
    const i = setInterval(update, 15_000);
    return () => clearInterval(i);
  }, [locale]);

  return (
    <main className="bg-primary text-primary-foreground flex min-h-dvh flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <p className="text-primary-foreground/70 text-lg">{branchName}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-primary-foreground/80 mt-2 text-lg">{t("subtitle")}</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-2xl">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={t("title")} className="pixelated size-[min(70vw,60vh)]" />
        ) : (
          <div className="size-[min(70vw,60vh)] animate-pulse rounded-xl bg-slate-100" />
        )}
      </div>
      <p className="text-primary-foreground/70">{offline ? t("offline") : t("refreshes")}</p>
      <p className="text-5xl font-light tabular-nums" dir="ltr">{clock}</p>
    </main>
  );
}
