import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

// DECISION: D-08 (English default, Arabic one tap away)
export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export function isRtl(locale: string) {
  return locale === "ar";
}
