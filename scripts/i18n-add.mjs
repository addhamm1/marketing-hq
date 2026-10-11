// Deep-merge new strings into src/messages/{en,ar}.json.
// Usage: node scripts/i18n-add.mjs path/to/additions.json   ({ "en": {...}, "ar": {...} })
import { readFileSync, writeFileSync } from "node:fs";

const add = JSON.parse(readFileSync(process.argv[2], "utf8"));
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v;
  }
  return a;
};
for (const locale of ["en", "ar"]) {
  const file = `src/messages/${locale}.json`;
  const current = JSON.parse(readFileSync(file, "utf8"));
  writeFileSync(file, JSON.stringify(merge(current, add[locale]), null, 2) + "\n");
}
console.log("merged", Object.keys(add.en).join(", "));
