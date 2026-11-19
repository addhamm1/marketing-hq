// Builds a ready-to-upload package for Node.js hosting (cPanel "Setup Node.js App" on Hosting.com).
//
// Usage: put the production public values in .env.production.local, commit your work, then run
//   node scripts/package-hosting.mjs
// Output: dist/marketing-hq-<commit>.zip with server.js at its root.
//
// The build runs in a clean copy of the last commit with a flat node_modules (no symlinks), so
// any unzip tool works. Secrets are never included: server-only values are entered in cPanel.
// --local-test packages against this computer's database, only to try the package here.
import { execSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const run = (cmd, cwd = ".") => execSync(cmd, { stdio: "inherit", cwd });
const read = (cmd) => execSync(cmd).toString().trim();
class PackageError extends Error {}
const fail = (msg) => {
  throw new PackageError(msg);
};
process.on("uncaughtException", (e) => {
  console.error(e instanceof PackageError ? `\n✗ ${e.message}` : e);
  process.exit(1);
});

const localTest = process.argv.includes("--local-test");
const envFile = ".env.production.local";
if (!existsSync(envFile)) fail(`${envFile} is missing. See docs/DEPLOY_HOSTING_COM.md, step 2.`);
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_APP_URL"]) {
  if (!env[key]) fail(`${key} is empty in ${envFile}.`);
}
if (!localTest && /localhost|127\.0\.0\.1/.test(env.NEXT_PUBLIC_SUPABASE_URL + env.NEXT_PUBLIC_APP_URL)) {
  fail(`${envFile} still points at this computer. Use the production addresses.`);
}
for (const key of Object.keys(env)) {
  if (!key.startsWith("NEXT_PUBLIC_")) fail(`${envFile} contains ${key}. Only NEXT_PUBLIC_ values go here; enter secrets in cPanel.`);
}
if (read("git status --porcelain")) fail("Commit your changes first: the package is built from the last commit.");

const commit = read("git rev-parse --short HEAD") + (localTest ? "-localtest" : "");
const work = resolve(".hosting-build");
rmSync(work, { recursive: true, force: true });
run("git worktree prune");
run(`git worktree add --detach "${work}" HEAD`);
try {
  cpSync(envFile, join(work, envFile));
  // A flat node_modules (no symlinks), only in this throwaway copy.
  appendFileSync(join(work, "pnpm-workspace.yaml"), "\nnodeLinker: hoisted\n");
  run("pnpm install --frozen-lockfile --prefer-offline", work);
  run("pnpm build", work);

  const out = join(work, ".next/standalone");
  if (!existsSync(join(out, "server.js"))) fail("The build did not produce .next/standalone/server.js.");
  cpSync(join(work, ".next/static"), join(out, ".next/static"), { recursive: true });
  cpSync(join(work, "public"), join(out, "public"), { recursive: true });
  for (const f of readdirSync(out)) if (f.startsWith(".env")) rmSync(join(out, f));

  const links = read(`find "${out}" -type l | head -5`);
  if (links) fail(`The package still contains symlinks:\n${links}`);
  const natives = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      // sharp only serves image optimisation, which is off (next.config.ts).
      else if (f.endsWith(".node") && !p.includes("sharp")) natives.push(p);
    }
  };
  walk(out);
  if (natives.length) console.warn(`\n! Native modules built for this Mac:\n  ${natives.join("\n  ")}`);

  rmSync("dist", { recursive: true, force: true });
  run("mkdir -p dist");
  run(`zip -qr "${resolve("dist", `marketing-hq-${commit}.zip`)}" . -x "*.DS_Store"`, out);
} finally {
  run(`git worktree remove --force "${work}"`);
}
console.log(`\n✓ dist/marketing-hq-${commit}.zip is ready. Next: docs/DEPLOY_HOSTING_COM.md, step 4.`);
