#!/usr/bin/env bun
/**
 * Gate test for .github/workflows/ci.yml (T-001).
 *
 *   bun tools/test-ci-workflow.mjs
 *
 * The acceptance criterion is "a deliberately broken PR against dev goes red",
 * and only GitHub can literally show that. Everything the workflow claims
 * before GitHub reads it can be shown here: which branches it gates, which
 * commands it runs, and whether those commands actually fail on broken code
 * rather than merely existing in package.json.
 *
 * So the commands are not written out below. They are read out of ci.yml and
 * executed. A workflow that stops running a gate fails this test instead of
 * passing it more quietly, which is the whole point: asserting on the shape of
 * the YAML would stay green against a file that gates nothing.
 *
 * Two passes over a throwaway copy of the repo. Clean tree, every `run:` step in
 * the workflow's own order, expecting green. Then one file dropped into src/
 * carrying a type error and an unused variable, expecting red from all three
 * gates. Green-then-red is the check that matters: the first pass says the gate
 * is not stuck failing, the second says it is not stuck passing.
 *
 * The copy is not a nicety. Injecting a defect into the real tree loses work if
 * this exits early, and an agent worktree symlinks node_modules at the parent
 * checkout, which turbopack refuses to build through ("Symlink
 * [project]/node_modules is invalid, it points out of the filesystem root"). A
 * flat copy plus the workflow's own `bun install` is what a runner has anyway.
 *
 * Runs under bun, not node: it reads the workflow with Bun.YAML, and it really
 * does install, so it wants a warm bun cache or a network.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = path.join(REPO, ".github", "workflows", "ci.yml");

let pass = 0;
let fail = 0;
const is = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`ok   ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}\n       expected ${JSON.stringify(expected)}\n       actual   ${JSON.stringify(actual)}`);
  }
};

// What the workflow says.

const workflow = Bun.YAML.parse(fs.readFileSync(WORKFLOW, "utf8"));
// `on` is a YAML 1.1 boolean, so the trigger block arrives under the key `true`.
// GitHub reads the file as 1.2 and sees the string. Accept whichever the parser
// hands over rather than depending on which spec it follows.
const triggers = workflow.on ?? workflow[true];
is("push gates dev and main", triggers?.push?.branches, ["dev", "main"]);
is("pull_request gates dev and main", triggers?.pull_request?.branches, ["dev", "main"]);

const steps = Object.values(workflow.jobs ?? {}).flatMap((job) => job.steps ?? []);
is(
  "bun is installed before anything runs it",
  steps.some((step) => (step.uses ?? "").startsWith("oven-sh/setup-bun@")),
  true,
);

const runs = steps.map((step) => step.run).filter(Boolean);
const gates = runs.filter((cmd) => /^bun run \S+$/.test(cmd));
is("runs this repo's three gates", gates, ["bun run lint", "bun run type-check", "bun run build"]);

const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8")).scripts ?? {};
for (const cmd of gates) {
  const script = cmd.slice("bun run ".length);
  is(`package.json defines ${script}`, typeof scripts[script], "string");
}
is(
  "the e2e suite stays out of CI",
  runs.some((cmd) => /playwright|test:e2e|test:a11y/.test(cmd)),
  false,
);

// What the workflow does.

const SKIP = new Set([".git", ".next", "out", "playwright-report", "test-results"]);
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-"));
fs.cpSync(REPO, sandbox, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(REPO, src);
    if (!rel) return true;
    const top = rel.split(path.sep)[0];
    // tsconfig.tsbuildinfo would let a copied tree skip work it has not done.
    return !SKIP.has(top) && !top.startsWith("node_modules") && !src.endsWith(".tsbuildinfo");
  },
});

const run = (cmd) => {
  console.log(`     $ ${cmd}`);
  const result = spawnSync(cmd, { cwd: sandbox, shell: true, encoding: "utf8" });
  return { status: result.status, log: `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd() };
};
const lastLines = (log, n = 12) => log.split("\n").slice(-n).map((line) => `       | ${line}`).join("\n");

console.log(`\nclean tree (${sandbox})`);
for (const cmd of runs) {
  const { status, log } = run(cmd);
  is(`green on a clean tree: ${cmd}`, status, 0);
  if (status !== 0) console.log(lastLines(log));
}

// One file, two defects, neither imported by anything: an unused variable for
// eslint and a bad return type for tsc, which `build` type-checks a second time.
console.log("\nbroken tree: src/lib/ci-gate-probe.ts");
fs.writeFileSync(
  path.join(sandbox, "src", "lib", "ci-gate-probe.ts"),
  [
    "const unusedLocal = \"never read, so no-unused-vars errors\";",
    "",
    "export function ciGateProbe(): number {",
    "  return \"not a number\";",
    "}",
    "",
  ].join("\n"),
);
for (const cmd of gates) {
  const { status } = run(cmd);
  is(`red on a broken tree: ${cmd}`, status !== 0, true);
}

fs.rmSync(sandbox, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
