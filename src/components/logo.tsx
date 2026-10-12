import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * Espaces "E." icon plus the product name. `tone="dark"` is for black surfaces
 * (sidebar, sign-in hero): yellow mark, light text.
 */
export async function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const t = await getTranslations("common");
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={tone === "dark" ? "/brand/espaces-e-yellow.png" : "/brand/espaces-e-black.png"}
        alt=""
        width={15}
        height={24}
        className="h-6 w-auto"
        priority
      />
      <span
        dir="ltr"
        className={cn(
          "font-heading text-[15px] leading-none font-extrabold tracking-tight uppercase",
          tone === "dark" ? "text-white" : "text-brand-black",
        )}
      >
        {t("appName")}
      </span>
    </span>
  );
}

/** Full Espaces wordmark, used where the brand stands alone (sign-in, sidebar footer). */
export function EspacesWordmark({ className, tone = "light", tagline = false }: { className?: string; tone?: "light" | "dark"; tagline?: boolean }) {
  const colour = tone === "dark" ? "yellow" : "black";
  const kind = tagline ? "full" : "mark";
  return (
    <Image
      src={`/brand/espaces-${kind}-${colour}.png`}
      alt="Espaces"
      width={1200}
      height={tagline ? 349 : 278}
      className={cn("h-auto", className)}
    />
  );
}
