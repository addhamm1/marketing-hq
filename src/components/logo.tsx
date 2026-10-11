import { getTranslations } from "next-intl/server";

/** Wordmark with a tiny pixel tile. Colours come from theme tokens. */
export async function Logo({ className }: { className?: string }) {
  const t = await getTranslations("common");
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}>
      <svg viewBox="0 0 8 8" className="pixelated size-6" aria-hidden shapeRendering="crispEdges">
        <rect width="8" height="8" rx="1.5" className="fill-primary" />
        <rect x="2" y="2" width="2" height="2" className="fill-primary-foreground" />
        <rect x="4" y="4" width="2" height="2" className="fill-primary-foreground/70" />
      </svg>
      <span dir="ltr">{t("appName")}</span>
    </span>
  );
}
