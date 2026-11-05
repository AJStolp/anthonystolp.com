#!/usr/bin/env bun
/**
 * Replace a symlinked `node_modules` with a real one before Next runs.
 *
 * Every ticket gets its own git worktree. A worktree carries what git tracks,
 * and `node_modules` is gitignored, so the harness links the project's real one
 * in rather than copying it. Turbopack resolves that link, sees it leave the
 * project root, and refuses outright:
 *
 *   Error [TurbopackInternalError]: Symlink [project]/node_modules is invalid,
 *   it points out of the filesystem root
 *
 * `next dev` then exits 1, which takes the e2e suite with it, since Playwright's
 * `webServer` boots `bun run dev`. Nothing about the code under test is
 * involved.
 *
 * So: if `node_modules` is a symlink, unlink it and install into the worktree
 * for real. A warm `bun install` is seconds, which is the whole reason this is
 * cheaper than keeping the link and dropping Turbopack. The numbers are printed
 * on every run rather than asserted once, because the trade only holds while
 * that install stays fast.
 *
 * Every Playwright script runs this itself, not only `dev`. Left to the
 * `webServer`, the swap happens after Playwright has loaded from the linked
 * tree, the specs then load a second copy from the local one, and every test
 * dies with "did not expect test.describe() to be called here".
 *
 * A normal checkout has a real directory here and this is a no-op.
 */
import { lstatSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = resolve(ROOT, "node_modules");

function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    // Absent entirely. Installing is the caller's problem, not this script's:
    // Turbopack has no complaint about a missing node_modules, it complains
    // about one that points somewhere else.
    return false;
  }
}

if (!isSymlink(MODULES)) {
  process.exit(0);
}

console.log("node_modules is a symlink; Turbopack will not resolve it. Installing locally.");
unlinkSync(MODULES);

const started = Date.now();
const proc = Bun.spawn(["bun", "install", "--frozen-lockfile"], {
  cwd: ROOT, stdout: "pipe", stderr: "pipe",
});
const [out, err] = await Promise.all([
  new Response(proc.stdout).text(),
  new Response(proc.stderr).text(),
]);
const elapsedMs = Date.now() - started;
const code = await proc.exited;

if (code !== 0) {
  console.error(out.trim());
  console.error(err.trim());
  console.error(`bun install failed after ${elapsedMs}ms; node_modules is now missing.`);
  process.exit(code || 1);
}

// bun prints "N packages installed" when it wrote them and "Checked N
// installs" when the tree was already good.
const packages = /(\d+)\s+packages?\s+installed/.exec(out + err)
  ?? /Checked\s+(\d+)\s+installs?/.exec(out + err);
console.log(`node_modules installed locally: ${packages ? packages[1] : "?"} packages in ${elapsedMs}ms`);
