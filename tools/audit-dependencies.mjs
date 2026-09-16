#!/usr/bin/env bun
/**
 * Fail on any dependency advisory that is not a recorded exception.
 *
 * `bun audit --audit-level=high` as a gate has one setting: every advisory in
 * the tree fails it, whether or not this change caused it, and whether or not
 * anything can be done about it today. That makes the security lane fail on
 * every ticket, which trains people to stop reading it. This wraps it:
 *
 *   an advisory not in security-exceptions.json   -> fail, it is new
 *   an exception with no matching advisory        -> fail, it is stale, delete it
 *   every advisory accounted for                  -> pass
 *
 * The second rule is the one that keeps the list honest. A suppression that
 * outlives the problem is how these files turn into noise nobody reads.
 *
 * Ported from headspace's tools/audit_dependencies.py, which does the same job
 * around pip-audit. Two things differ. It reads `bun audit --json`, and the
 * exceptions file is JSON rather than YAML: parsing YAML would mean adding a
 * dependency to a tool whose whole job is watching dependencies, and the
 * explanation that lived in that file's comments lives in this header instead.
 *
 * An entry does not make a finding go away. It records that a person looked at
 * it, decided it cannot be fixed now, and wrote down which ticket clears it.
 * Nothing may be added without a ticket.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXCEPTIONS = resolve(ROOT, "security-exceptions.json");

// Below this, an advisory is not a gate. `bun audit --audit-level=high` drew
// the line here and this keeps it, so the wrapper changes what is accounted
// for and not what counts.
const GATES = new Set(["high", "critical"]);

function advisoryId(url, id) {
  const match = /\/(GHSA-[a-z0-9-]+)/i.exec(url || "");
  return match ? match[1] : String(id);
}

async function audit() {
  const proc = Bun.spawn(["bun", "audit", "--json"], {
    cwd: ROOT, stdout: "pipe", stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  if (!out.trim()) {
    const err = await new Response(proc.stderr).text();
    console.error("bun audit produced no output:", err.slice(-800));
    process.exit(2);
  }
  const report = JSON.parse(out);
  const found = new Map();
  for (const [pkg, advisories] of Object.entries(report)) {
    for (const a of advisories || []) {
      if (!GATES.has(String(a.severity).toLowerCase())) continue;
      const id = advisoryId(a.url, a.id);
      found.set(pkg + " " + id, {
        package: pkg, id, title: a.title || "", severity: a.severity,
      });
    }
  }
  return found;
}

function loadExceptions() {
  if (!existsSync(EXCEPTIONS)) return new Map();
  const parsed = JSON.parse(readFileSync(EXCEPTIONS, "utf8"));
  const allowed = new Map();
  for (const entry of parsed.exceptions || []) {
    if (!entry.ticket) {
      console.error("  " + entry.id + " has no ticket. Every exception needs one.");
      process.exit(1);
    }
    allowed.set(entry.package + " " + entry.id, entry);
  }
  return allowed;
}

const found = await audit();
const allowed = loadExceptions();

const fresh = [...found.keys()].filter((k) => !allowed.has(k)).sort();
const stale = [...allowed.keys()].filter((k) => !found.has(k)).sort();

for (const key of fresh) {
  const a = found.get(key);
  console.log("  NEW        " + a.package.padEnd(24) + " " + a.id + "  " + a.title.slice(0, 58));
}
for (const key of stale) {
  const e = allowed.get(key);
  console.log("  STALE      " + e.package.padEnd(24) + " " + e.id +
              "  (fixed or gone: remove it from security-exceptions.json)");
}
for (const [key, e] of [...allowed].sort()) {
  if (!stale.includes(key)) {
    console.log("  known      " + e.package.padEnd(24) + " " + e.id + "  " +
                e.ticket + ": " + e.reason);
  }
}

if (fresh.length) {
  console.log("\n" + fresh.length + " advisory(ies) with no recorded exception. " +
              "Fix them, or add one with the ticket that will.");
}
if (stale.length) {
  console.log("\n" + stale.length + " stale exception(s). The problem is gone; the entry is not.");
}
if (fresh.length || stale.length) process.exit(1);
console.log("\n" + allowed.size + " known, 0 new, 0 stale.");
