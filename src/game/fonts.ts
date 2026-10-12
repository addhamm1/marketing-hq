/**
 * Canvas text cannot use CSS variables, and next/font gives fonts hashed
 * family names. Read the page's font variables once (browser only) and turn
 * them into font stacks for Phaser text. Missing variables are skipped, so
 * this works with whichever brand fonts the layout loads.
 */

const SIGN_VARS = ["--font-montserrat", "--font-arabic", "--font-plex-arabic", "--font-body", "--font-inter"];
const NAME_VARS = ["--font-body", "--font-arabic", "--font-plex-arabic", "--font-inter"];
const FALLBACK = "system-ui, sans-serif";

function stack(vars: string[]): string {
  if (typeof document === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const families = vars.map((v) => style.getPropertyValue(v).trim()).filter(Boolean);
  return [...families, FALLBACK].join(", ");
}

let cache: { sign: string; name: string } | null = null;

export function gameFonts(): { sign: string; name: string } {
  cache ??= { sign: stack(SIGN_VARS), name: stack(NAME_VARS) };
  return cache;
}

/** Ask the browser to load the bold faces canvas text will use (fonts only used on canvas may never load otherwise). */
export function loadGameFonts(): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  const { sign, name } = gameFonts();
  return Promise.all([
    document.fonts.load(`700 9px ${sign}`, "Aa"),
    document.fonts.load(`700 9px ${sign}`, "ابت"),
    document.fonts.load(`700 8px ${name}`, "Aa"),
  ]).catch(() => undefined);
}
