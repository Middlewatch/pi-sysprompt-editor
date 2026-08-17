# Template manager build — execution log

Append-only evidence for `2026-08-17-template-manager.plan.md`. Living
product state belongs in current-state docs; entries here are never
rewritten as status prose. One entry per packet event, gate run, blocker,
CONTRACT AMENDMENT, or K/R resolution, newest last.

## 2026-08-17 — Plan opened for execution

- Status set `ratified` → `executing`. Base commit 57e038e (ratified plan).
  Baseline `./scripts/verify.sh` green: 4 pass, 0 fail.
- Gate runner: `$PI_SCRATCHPAD/gate.sh` writes the full verify.sh log to the
  scratchpad and prints the test summary.

## 2026-08-17 — P1.1 Extract splice into lib/splice.ts

- `splitTail`, `extract`, and the render logic moved verbatim into
  `lib/splice.ts`; `renderTemplate(template, core)` returns null on any
  missing anchor. index.ts keeps stand-down checks and the template read.
- Tests 5–6 added to `tests/rewrite.test.ts` (renderTemplate direct; test 5
  also asserts the O2 optional-placeholder no-op).
- verify.sh: exit 0, 6 pass, 0 fail.
- Falsification witness: red on removing the `{{PI_DOCS}}` replaceAll
  (tests 1 and 5 fail), green on revert.

## 2026-08-17 — P1.2 Template store, pointer resolution, migration

- `git mv SYSTEM.template.md templates/default.md`; `.gitignore` gains
  `templates/.active`. README/DESIGN/AGENTS still name the old path; that
  is prose outside this packet's Files list, left for the as-built pass.
- `lib/templates.ts`: `listTemplates` (resolved active first, then alpha),
  `readActiveTemplate` (valid pointer → default.md → null), `setActiveTemplate`.
  Pointer validity `^[a-z0-9-]+\.md$` after trim.
- index.ts: `ExtensionPaths` seam added, templates dir resolved with
  `fileURLToPath(new URL("./templates/", import.meta.url))`,
  TEMPLATE_FALLBACK deleted; URL resolution failure fails open.
- Tests 7–12 in `tests/templates.test.ts`; test 10 drives the handler
  through the seam and asserts undefined. Test 1 repointed at
  `templates/default.md`.
- verify.sh: exit 0, 12 pass, 0 fail.
- Falsification witness: red on making the pointer read rethrow (tests 1, 4,
  7, 10, 11, 12 fail), green on revert.

## 2026-08-17 — P1.3 /sysprompt command and switch action

- `pi.registerCommand("sysprompt")`: no args opens `ctx.ui.select` over
  switch/new/inspect/test; a matching arg jumps to the action; unknown arg
  notifies `usage: /sysprompt [switch|new|inspect|test]`. `new`, `inspect`,
  `test` notify "not built yet" (K5). `switch` lists, selects, writes the
  pointer, notifies; cancel at either picker writes nothing.
- Files deviation, recorded: the stub ExtensionAPI in `tests/rewrite.test.ts`
  and `tests/templates.test.ts` gained a no-op `registerCommand()` because
  index.ts now registers a command at load. Two-line test-stub change, no
  product code outside the Files list.
- Tests 16, 17, 32, 40 in `tests/wiring.test.ts` (harness with stub
  ExtensionAPI and stub ctx.ui, built through the `paths` seam).
- verify.sh: exit 0, 16 pass, 0 fail.
- Falsification witness: red on writing the pointer before the select
  resolves (test 17 fails), green on revert.
