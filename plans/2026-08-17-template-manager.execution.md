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

## 2026-08-17 — P1.4 Scaffold action

- `scaffoldTemplate(dir, name, content)`: name must match `^[a-z0-9-]+$`;
  writes `<name>.md` with the `wx` flag so an existing file is never
  overwritten (EEXIST → Error "already exists"). Returns the created path.
- `new` action wired: `ctx.ui.input("Template name:")` → cancel returns
  silently → `readActiveTemplate` null notifies "no active template to
  copy" → scaffold → notify created path or the error message.
- Tests 13–15 (`tests/templates.test.ts`), 33 and 43 (`tests/wiring.test.ts`).
- verify.sh: exit 0, 21 pass, 0 fail.
- Falsification witness: red on dropping the existing-file check (`wx` → `w`;
  tests 15 and 21 fail), green on revert.

## 2026-08-17 — Phase 1 gate

- Runnable: verify.sh exit 0, 21 pass, 0 fail (log in scratchpad,
  `verify-123654.log`).
- Review: fresh-context Sol reviewer opened
  `plans/2026-08-17-template-manager.review-1.md` (0 CRITICAL, 2 MAJOR,
  2 MINOR, 2 NOTE). Fix wave fe683bf closed F1–F4 (list only pointer-valid
  regular files; proof gaps in tests 1, 40, 43 closed; raw name input;
  atomic pointer rename). Re-review: PASS, F5 (live symlink eye check) left
  open as the owner-queued NOTE. K5 confirmed inert (F6).
- K1 simulation: loading `~/.pi/agent/extensions/pi-sysprompt-editor/index.ts`
  through the symlink path with a stub API listed `["default.md"]`, so
  `./templates/` resolves through the deployed link
  (`$PI_SCRATCHPAD/k1-load.mts`). K1 stays open until the owner's live
  eye check.
- OWNER EYE CHECK QUEUED (Phase 1): in a fresh Pi session, `/sysprompt`
  opens the menu; `switch` to a second template changes the next reply's
  voice; `new` creates a template that then appears in the switch list;
  `git status` shows `templates/.active` ignored. Resolves K1 and F5.

## 2026-08-17 — P2.1 Immediate dump

- `lib/inspect.ts`: `modelLabel`, `makeStamp`, `freeBase`, `fenceFor`/`fenced`
  (backtick run + 1, min 3), `renderImmediateDump` per the pinned format,
  `armCapture`/`takeArmedCapture` one-shot module state.
- `inspect` action replaces the K5 placeholder: renders the dump from
  `ctx.getSystemPromptOptions()`, resolves `<stamp>-immediate` via
  `freeBase`, writes under `<artifactsDir>/inspect/`, arms the raw stamp,
  notifies path + "send any message to capture the ground-truth dump".
  Write failure notifies at level error and arms nothing.
- Goldens blessed from pinned inputs: `fixtures/golden/immediate-dump.{input.json,md}`
  (every section populated; appended prompt contains a 4-backtick run so
  the fence renders as 5) and `immediate-dump-empty.{input.json,md}` (cwd
  only). Checked line by line against the plan's format block; utf-8 byte
  counts verified (18, 14).
- Tests 18, 38 (wiring), 21, 27, 39, 44, 45 (inspect). Test 40's K5 loop
  narrowed to `test` only, since `inspect` is now real.
- verify.sh: exit 0, 28 pass, 0 fail.
- Falsification witness: red on dropping the skills section from the
  renderer (tests 21 and 45 fail), green on revert.

## 2026-08-17 — P2.2 Armed ground-truth capture

- `extractSystemPromptFromPayload`: `system` string, `system` text-block
  array (joined `\n\n`, empty array → null), `messages[0]` role
  `system`/`developer` with string or text-block content; else null.
  `renderProviderDump`: header + fenced prompt when recognized; note +
  ```json fence with `JSON.stringify(payload, null, 2)` when not; note +
  `String(payload)` unfenced when stringify throws (or returns non-string).
- `before_provider_request` handler: `takeArmedCapture` (null → return, no
  replacement ever returned), `modelLabel(ctx.model)`, `freeBase(...,
  [".md", ".txt"])`, writes `.md` then `.txt` only when extraction
  succeeded, notifies both paths with `sha256:<12 hex>` of the txt bytes;
  unrecognized shape notifies a warning naming the `.md` only; any write
  failure notifies at level error (state already cleared by the take).
- Golden `fixtures/golden/provider-dump.{input.json,md}` blessed from the
  pinned input (system prompt containing a triple-backtick run so the fence
  is four; trailing `\n` preserved). Checked line by line against the plan.
- Tests 22–26, 31, 41 (inspect); 19, 34 (wiring).
- verify.sh: exit 0, 37 pass, 0 fail.
- Falsification witnesses: red on returning txt for a null extraction
  (tests 26, 41, and 19 fail); red on dropping the `.txt` write (test 19
  fails); green on revert of each.
