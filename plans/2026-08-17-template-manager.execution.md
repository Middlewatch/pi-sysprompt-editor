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

## 2026-08-17 — Phase 2 gate

- Runnable: verify.sh exit 0, 37 pass, 0 fail (`verify-124821.log`).
- Review: Phase 2 register appended to
  `plans/2026-08-17-template-manager.review-1.md` (0 CRITICAL, 1 MAJOR,
  2 MINOR, 2 NOTE). Fix wave 03ccc8f closed F9 (render-throw, md-then-txt
  write failure, stale-arm clearing all proven). F10 confirms all three
  goldens byte-conform. F11 confirms handler containment.
- F7 MAJOR OPEN, needs owner ruling: the claude-go bridge provider is a
  custom `registerProvider` whose `streamSimple` never calls
  `options.onPayload` (`~/projects/claude-go/main/adapters/pi/extension.ts`,
  no `onPayload` reference), so Pi never emits `before_provider_request`
  on bridge turns. Behavior here is fail-open (arm stays set, nothing
  written, nothing thrown) but the "send any message" promise does not
  hold on the owner's primary provider, and a later native-provider turn
  would consume the stale arm. Options put to owner: (a) claude-go adapter
  calls `options.onPayload` with `{ system, messages }` before open (fix
  outside this repo); (b) CONTRACT AMENDMENT here: `turn_end` with a still-
  armed capture disarms and notifies "provider did not expose the payload";
  (c) both.
- F8 (K3 candidates, MINOR, no code change): pi-ai's Responses adapter
  sends messages under `input` (leading system/developer item), Gemini
  sends `config.systemInstruction`; both fall to the JSON dump with no
  `.txt`. Recorded as K3 CONTRACT AMENDMENT candidates if seen in real use.
- OWNER EYE CHECK QUEUED (Phase 2): in a live session on a native provider
  (Anthropic or OpenAI-compatible; not claude-go until F7 is resolved) with
  another prompt-touching extension loaded, `/sysprompt inspect` then one
  message writes `<stamp>-immediate.md`, `<stamp>-provider.md`,
  `<stamp>-provider.txt`; `sha256sum <stamp>-provider.txt` matches the
  notified prefix; the provider dump contains injections absent from the
  immediate dump.

## 2026-08-17 — Owner ruling on F7 and CONTRACT AMENDMENT

- Owner ruled: both remedies. (1) claude-go Pi adapter commit 2cedcb9 calls
  `options.onPayload({ system, messages, model, tools }, model)` before the
  bridge open, observation only; claude-go verify.sh green, pi_smoke red on
  removal / green with it. (2) CONTRACT AMENDMENT (owner ruled 2026-08-17):
  Interfaces gain "a `turn_end` that finds the capture still armed disarms
  it and notifies a warning naming the stamp"; folded into wiring test 19
  so the pinned count stays 37. F7 closed; Phase 2 verdict PASS after fix
  waves. Owner also ruled: continue to P3.1 with the Phase 2 eye check
  running in parallel.
- verify.sh: exit 0, 37 pass, 0 fail (`verify-125342.log`).

## 2026-08-17 — P3.1 Output test action

- `lib/output-test.ts`: `OUTPUT_TEST_PROMPT` (D3), `buildTestMessage`,
  `resultBase` (sanitize `[^A-Za-z0-9._-]` → `-`), `formatResult` per the
  pinned layout (`(stock)` omits the sha line), `assistantText`.
- index.ts: `lastRender` set on every `before_agent_start` (null on every
  stand-down/fail-open branch, `{name, sha256}` on a successful splice);
  `test` action reads the fixture (unreadable → error notify, nothing
  sent), records the pending `{stamp, provider, modelId}`, calls
  `pi.sendUserMessage(buildTestMessage(...))`; `turn_end` consumes the
  pending capture, formats with `lastRender`, resolves collision via
  `freeBase(outputTestsDir, resultBase(...), [".md"])`, writes, notifies;
  write failure notifies error with pending cleared.
- Golden `fixtures/golden/output-test-result.{input.json,md}` blessed from
  the pinned input; checked line by line against the plan's format block.
- Tests 28–30, 35 (`tests/output-test.test.ts`); 20, 36, 37, 42
  (`tests/wiring.test.ts`). Test 40's K5 loop removed (no placeholders
  remain).
- verify.sh: exit 0, 45 pass, 0 fail (`verify-125559.log`).
- Falsification witness: red on changing OUTPUT_TEST_PROMPT wording (tests
  28 and 20 fail), green on revert.
- K5 RESOLVED — all three placeholders replaced (P1.4, P2.1, P3.1).

## 2026-08-17 — Phase 3 review and CONTRACT AMENDMENT (forced by harness semantics)

- Phase 3 register appended (0 CRITICAL, 1 MAJOR, 1 MINOR, 1 NOTE). F14
  confirms the golden, `lastRender` reset logic, and containment.
- 2026-08-17 CONTRACT AMENDMENT (forced by machine state: Pi 0.84.1 fires
  `turn_end` per assistant message, including tool-calling messages, and
  `sendUserMessage` without `deliverAs` rejects while streaming, swallowed
  by the ExtensionAPI wrapper): "turn_end consumes the pending capture" →
  "turn_end consumes the pending capture only when
  `event.message.stopReason !== "toolUse"`, so the file records the loop's
  final reply"; and the `test` action gains two refusals before recording
  pending state: `ctx.isIdle()` false → error "agent is busy; run the
  output test when idle", and a still-pending test → error naming its
  stamp. Evidence: review F12 with pi-coding-agent citations
  (`types.d.ts:548-560`, `agent-session.js:830-840, 1099-1134, 1855-1862`).
  The competing-human-message race remains the K2 day-one acceptance.
- F13 fix: test 20 drives a toolUse turn_end (held) then a stop turn_end
  (written); test 36 moves the pointer between command and render (proves
  render-time attribution), runs render → each stand-down → `(stock)`,
  proves the busy refusal and the pending refusal.
