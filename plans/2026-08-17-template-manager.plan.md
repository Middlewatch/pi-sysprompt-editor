# Template manager build

**Status:** draft

## Goal

Implement the template manager ratified in `DESIGN.md` (2026-08-17): a
`/sysprompt` command with switch, new, inspect, and test actions over the
existing per-turn splice. Input documents: `DESIGN.md`,
`docs/2026-08-17-template-manager-scope.md`. End-state: the three-part
thesis acceptance test passes (switch renders next turn, armed inspect dump
matches the provider payload, every fail-open branch unit-proven) and
`scripts/verify.sh` is green.

## Success definition

- Switching templates via `/sysprompt` changes the next turn's rendered
  core to the selected template. Verified by unit test
  `pointer resolution: switch changes rendered template` and by a live eye
  check at the Phase 1 gate.
- `/sysprompt new <name>` creates `templates/<name>.md` as a byte copy of
  the active template. Verified by unit test `scaffold: new template is a
byte copy of the active template`.
- `/sysprompt inspect` writes an immediate best-effort dump at command time
  and, on the next provider request, a ground-truth pair: a human-readable
  `.md` and a raw `.txt` whose bytes are exactly the system prompt
  extracted from the payload. Verified by extractor and wiring unit tests
  plus the Phase 2 gate byte-identity procedure (notified sha256 equals
  `sha256sum` of the `.txt`).
- `/sysprompt test` sends the pinned prompt with the fixture document and
  writes the assistant's response to a dated results file naming the model
  and the active template with its content sha256. Verified by unit tests
  including a golden byte-compare, plus one live run at the Phase 3 gate.
- Every fail-open branch (missing pointer, invalid pointer line, pointer to
  missing file, missing default template, custom prompt active, drifted
  stock shape, unrecognized payload shape) leaves the prompt or artifact in
  the documented fallback state. Verified by named unit tests, one per
  branch.
- `scripts/verify.sh` exits 0 with 30 unit tests passing, 0 failing.

## Fixed decisions

- 2026-08-17 — Basis R1: three-part thesis is the product claim.
- 2026-08-17 — Basis R2: one `/sysprompt` command opening an action menu;
  flat per-action commands rejected.
- 2026-08-17 — Basis R3: templates versioned in `templates/`, active
  pointer gitignored beside them, generated artifacts in the container's
  `artifacts/` directory; versioned pointer and in-repo outputs rejected.
- 2026-08-17 — Basis R4: out-of-scope list as written in `DESIGN.md`
  (no appended-layer editing, no in-TUI editor, no reload machinery,
  multi-model matrix deferred, no per-project template selection).
- 2026-08-17 — Owner: inspection ships both modes, armed capture is
  authoritative.
- 2026-08-17 — Owner: output test is in-session single model through the
  normal pipeline.
- 2026-08-17 — Owner: fixture is Mario Zechner, "Thoughts on slowing the
  fuck down" (2026-03-25), captured at `fixtures/output-test-document.md`.
- 2026-08-17 — Checkpoint D1: migrate clean, `git mv SYSTEM.template.md
templates/default.md`; a permanent legacy fallback path rejected.
- 2026-08-17 — Checkpoint D2: `new` seeds a byte copy of the currently
  active template; bare skeleton rejected.
- 2026-08-17 — Checkpoint D3: the output-test prompt is exactly
  `Summarize this article for me.` The owner's rationale: the test measures
  the system prompt's innate steering of style and structure, so the user
  prompt must not enforce output shape. Structured multi-section prompts
  rejected.
- 2026-08-17 — Checkpoint D4: armed inspect capture triggers on the next
  ordinary message; auto-sending a trigger message rejected.
- 2026-08-17 — Toolchain: node 22.x enforced by verify.sh (v22.23.1
  verified on the home machine), typescript 7.0.2, prettier 3.9.6,
  `@earendil-works/pi-coding-agent` 0.84.1.
- These decisions are closed during implementation. R1 and R2 below are
  open owner items; R1 blocks P3.1, R2 blocks P1.1.

## Non-goals

- Multi-model test matrix (deferred in the basis).
- Editing project context, skills, or any appended layer.
- Any TUI editing surface beyond `ctx.ui.select`/`ctx.ui.input` pickers.
- Reload or restart machinery.
- Template syntax beyond the three existing placeholders.

## Proportionality rule

Enforce an invariant at the closest reliable layer. A new module, artifact
format, or abstraction requires a distinct current requirement. Applies to
every packet. Concretely here: no template registry format, no artifact
index, no config schema; the pointer is one line in one file.

## Verification contract

```bash
cd ~/projects/pi-sysprompt-editor/main && ./scripts/verify.sh
```

Green is: node 22.x asserted, `npm ci` clean, `prettier --check` clean,
`tsc --noEmit` clean, `node --experimental-strip-types --test
tests/*.test.ts` all pass, 0 fail. Test count by packet: baseline 4
(existing `tests/rewrite.test.ts`), P1.1 → 6, P1.2 → 12, P1.3 → 14,
P1.4 → 17, P2.1 → 19, P2.2 → 26, P3.1 → 30. Live checks that need a real
session are phase gate eye checks, named in each phase gate, and are not
part of verify.sh.

## Design surface

### Layout

- `index.ts` — registration only: `before_agent_start` splice hook,
  `before_provider_request` capture hook, `turn_end` test-capture hook,
  `/sysprompt` command. Logic lives in `lib/`. Exports its registration
  function (already the default export) so wiring tests can construct it
  against a stub ExtensionAPI, the pattern `tests/rewrite.test.ts` already
  uses.
- `lib/splice.ts` — `splitTail`, `extract`, `renderTemplate`: moved verbatim
  from today's `index.ts` so the splice keeps its tested shape.
- `lib/templates.ts` — template store: list, active pointer read/write,
  scaffold. Every function takes the templates directory as its first
  argument; `index.ts` supplies the real path (resolved from
  `import.meta.url`, same pattern as today), tests supply temp dirs.
- `lib/inspect.ts` — immediate dump rendering, payload system-prompt
  extraction, arm/disarm state, artifact writing.
- `lib/output-test.ts` — pinned test prompt assembly, result filename,
  result formatting and writing.
- `templates/default.md` — the current `SYSTEM.template.md`, moved by
  `git mv` (checkpoint D1).
- `templates/.active` — gitignored one-line pointer file naming a template
  filename, e.g. `default.md`.
- `fixtures/output-test-document.md` — exists, committed at base.
- `fixtures/golden/immediate-dump.md`, `fixtures/golden/provider-dump.md`,
  `fixtures/golden/output-test-result.md` — golden serializations of the
  three artifact formats, byte-compared by unit tests, part of the
  freezable asset set.
- `../artifacts/inspect/`, `../artifacts/output-tests/` — container-level
  output directories, created recursively on demand, never read by product
  code.
- `tests/rewrite.test.ts` (existing 4 tests, repointed),
  `tests/templates.test.ts`, `tests/wiring.test.ts`,
  `tests/inspect.test.ts`, `tests/output-test.test.ts`.
- `.gitignore` gains `templates/.active` (verified absent today).

### Interfaces

- Command `/sysprompt` (no args): `ctx.ui.select` menu of four actions:
  `switch`, `new`, `inspect`, `test`.
- `/sysprompt switch|new|inspect|test` jumps straight to the action.
  Unknown arg: notify with usage, no action. Esc/cancel in any picker
  (select or input returns `undefined`) ends the command with no write.
- `switch`: `ctx.ui.select("Active template:", <listTemplates()>)`, writes
  `templates/.active`, notifies "active template: <name> (applies next
  message)".
- `new`: `ctx.ui.input("Template name:")`, validated against
  `^[a-z0-9-]+$`, writes `templates/<name>.md` as a byte copy of the
  currently active template (checkpoint D2), refuses to overwrite an
  existing file (notify error).
- `inspect`: writes `<stamp>-immediate.md` under `../artifacts/inspect/`,
  arms one-shot capture, notifies the path plus "send any message to
  capture the ground-truth dump". The armed capture writes
  `<stamp>-provider.md` (human-readable) and `<stamp>-provider.txt` (raw
  extracted bytes, no header, no trailing addition) and notifies both
  paths with `sha256:<first 12 hex>` of the txt bytes.
- `test`: reads the fixture (missing: notify error, send nothing), records
  a pending capture, sends the pinned message. On the captured turn's end,
  writes `<stamp>-<provider>-<modelId>.md` under
  `../artifacts/output-tests/` and notifies the path.
- Stamp format: local time `YYYY-MM-DD-HHmmss`. If a target filename
  already exists, suffix `-2`, `-3`, ... before the extension.
- Filename sanitization: in provider and modelId, every character outside
  `[A-Za-z0-9._-]` becomes `-`.
- Pointer validity: the pointer file's content, trimmed, must match
  `^[a-z0-9-]+\.md$` (single line, no path separators). Anything else is
  invalid and falls back to `default.md`.
- Provider/model metadata source: `ctx.model.provider` and `ctx.model.id`
  (available on both command context and event context).
- Placeholders are optional in a template: an absent placeholder means the
  owner omitted that section deliberately, and `replaceAll` no-ops
  (subject to R2).
- File format, provider dump `.md`: H1 header block (timestamp,
  provider/model), then the extracted system prompt verbatim inside a
  fenced block. Unrecognized payload shape: a note line, then
  `JSON.stringify(payload, null, 2)` in a ```json fence; if stringify
  throws, the note line plus `String(payload)`. The `.txt` twin is written
  only when extraction succeeds.
- File format, output-test result: header lines (timestamp,
  provider/model, active template name, `template-sha256:` of the active
  template's content, or `(stock)` and no sha line when fail-open left the
  stock prompt), a `---` separator, then the assistant message text
  verbatim. Golden-pinned.
- File format, immediate dump: header line naming it a best-effort rebuild
  at command time that excludes other extensions' per-turn changes, then
  sections: custom prompt (present/absent only), selected tools with
  snippets, prompt guidelines, appended system prompt text, context file
  paths with byte sizes (paths only, never content), skill names.
  Golden-pinned.

### Types and signatures

```typescript
// lib/splice.ts
export function splitTail(prompt: string): [core: string, tail: string];
export function extract(
  core: string,
  start: string,
  end: string,
): string | null;
export function renderTemplate(template: string, core: string): string | null;
// null = anchor extraction failed (drifted shape), caller fails open

// lib/templates.ts — dir is always the templates directory
export function listTemplates(dir: string): string[]; // *.md, active first then alpha
export function readActiveTemplate(
  dir: string,
): { name: string; content: string } | null;
// invalid/missing pointer -> default.md; default.md missing -> null (fail open)
export function setActiveTemplate(dir: string, name: string): void;
export function scaffoldTemplate(dir: string, name: string): string | Error;
// returns created path; Error when name invalid or file exists

// lib/inspect.ts
export function renderImmediateDump(options: SystemPromptOptions): string;
export function extractSystemPromptFromPayload(payload: unknown): string | null;
// recognizes: payload.system string; payload.system {text}[] blocks joined
// with "\n\n"; payload.messages[0].role "system"|"developer" with string or
// {text}[] content. null = unrecognized.
export function renderProviderDump(
  header: DumpHeader,
  payload: unknown,
): {
  md: string;
  txt: string | null; // null when extraction failed (no .txt written)
};
export function armCapture(stamp: string): void;
export function takeArmedCapture(): string | null; // stamp once, then null

// lib/output-test.ts
export const OUTPUT_TEST_PROMPT = "Summarize this article for me.";
export function buildTestMessage(fixtureText: string): string;
// OUTPUT_TEST_PROMPT + "\n\n---\n\n" + fixtureText
export function resultFileName(
  stamp: string,
  provider: string,
  modelId: string,
): string;
export function formatResult(
  header: ResultHeader,
  responseText: string,
): string;

interface DumpHeader {
  timestamp: string;
  provider: string;
  modelId: string;
}
interface ResultHeader {
  timestamp: string;
  provider: string;
  modelId: string;
  activeTemplate: string; // "(stock)" when fail-open left the stock prompt
  templateSha256: string | null; // hex sha256 of template content, null for "(stock)" (R1)
}
```

The bare prompt is deliberate (checkpoint D3): the system prompt under test
supplies all structure and voice.

### Call stack

Splice (every turn):
`before_agent_start` handler → stand-down checks (custom prompt, stock
first line) → `readActiveTemplate(dir)` → null: return (stock stands) →
`splitTail` → `renderTemplate` → null: return → `{ systemPrompt }`.

Switch: command handler → `listTemplates` → `ctx.ui.select` →
undefined: return → `setActiveTemplate` → `ctx.ui.notify`.

New: command handler → `ctx.ui.input` → undefined: return →
`scaffoldTemplate` → notify path or error message.

Inspect: command handler → `ctx.getSystemPromptOptions()` →
`renderImmediateDump` → write immediate file → `armCapture(stamp)` →
notify. Then `before_provider_request` handler → `takeArmedCapture()` →
null: return → `renderProviderDump(header, event.payload)` → write `.md`
(+ `.txt` when extraction succeeded) → notify with sha256 prefix. The
handler never returns a payload replacement.

Test: command handler → read fixture (missing: notify, stop) → record
pending {stamp, provider, modelId, activeTemplate, templateSha256} →
`pi.sendUserMessage(buildTestMessage(...))` → `turn_end` handler →
pending set: `formatResult(header, event.message text)` → write result
file → clear pending → notify path.

### Test plan

Canonical list; all totals derive from it. Tests are stub-API unit tests in
the existing `tests/rewrite.test.ts` style (stub ExtensionAPI captures
handlers and the command; temp dirs stand in for templates and artifacts;
no Pi process, no provider).

`tests/rewrite.test.ts` — existing 4, repointed at the lib composition in
P1.1 (1–4), plus 2 new in P1.1 (5–6):

1. `stock prompt is rebuilt from the template with the tail preserved`
2. `an active SYSTEM.md custom prompt is left untouched`
3. `a non-stock prompt is left untouched`
4. `a drifted core shape fails open`
5. `renderTemplate replaces all three placeholders`
6. `renderTemplate returns null on drifted shape`

`tests/templates.test.ts` — 6 in P1.2 (7–12), 3 in P1.4 (13–15):

7. `pointer resolution: missing pointer falls back to default.md`
8. `pointer resolution: invalid pointer line falls back to default.md`
9. `pointer resolution: pointer naming a missing file falls back to default.md`
10. `pointer resolution: default.md missing returns null`
11. `pointer resolution: switch changes rendered template`
12. `list: active template sorts first`
13. `scaffold: new template is a byte copy of the active template`
14. `scaffold: invalid name rejected`
15. `scaffold: existing file not overwritten`

`tests/wiring.test.ts` — command and hook glue through the real `index.ts`
default export against a stub ExtensionAPI; 2 in P1.3 (16–17), 1 in P2.1
(18), 1 in P2.2 (19), 1 in P3.1 (20):

16. `wiring: switch action writes the pointer through the registered command`
17. `wiring: cancelled picker writes nothing`
18. `wiring: inspect action writes the immediate dump file and arms capture`
19. `wiring: armed capture writes provider md and raw txt with payload bytes`
20. `wiring: turn_end with pending capture writes the result file`

`tests/inspect.test.ts` — 1 in P2.1 (21), 6 in P2.2 (22–27):

21. `immediate dump: golden byte-compare` (against
    `fixtures/golden/immediate-dump.md`, covering all sections)
22. `extract: anthropic string system`
23. `extract: anthropic block-array system`
24. `extract: openai system message`
25. `extract: openai developer message`
26. `extract: unrecognized payload returns null and md falls back to JSON`
27. `arm: capture is one-shot`

`tests/output-test.test.ts` — 3 in P3.1 (28–30):

28. `prompt: fixture embedded verbatim after pinned instructions`
29. `result: filename carries stamp, sanitized provider and model id`
30. `result: golden byte-compare` (against
    `fixtures/golden/output-test-result.md`, covering header with template
    name and sha256)

Count reconciliation: 4 existing + 26 new = 30 at completion. Per packet:
P1.1 adds 5–6 (→ 6), P1.2 adds 7–12 (→ 12), P1.3 adds 16–17 (→ 14), P1.4
adds 13–15 (→ 17), P2.1 adds 18 and 21 (→ 19), P2.2 adds 19 and 22–27
(→ 26), P3.1 adds 20 and 28–30 (→ 30). These are the totals the
Verification contract pins.

### Least confident decisions

The four owner-facing forks (migration, scaffold seed, test prompt, inspect
trigger) were ruled at the 2026-08-17 checkpoint and moved to Fixed
decisions. The remaining least-confident technical calls are carried as
risk rows: `import.meta.url` resolution through the deployed symlink (K1),
test-response attribution on `turn_end` (K2), payload-shape recognizers
(K3).

## Phase 1 — Template store and switching

### P1.1 — Extract splice into lib/splice.ts

Files: index.ts, lib/splice.ts, tests/rewrite.test.ts
Changes: Move `splitTail`, `extract`, and the render logic verbatim from
index.ts into lib/splice.ts as `splitTail`, `extract`,
`renderTemplate(template, core) -> string | null` (null on any
failed anchor extraction; absent placeholders no-op per R2).
index.ts keeps registration and the stand-down checks, reads
the template from its current SYSTEM.template.md path, and
calls the lib functions. No behavior change to the splice.
Acceptance: verify.sh green; test files report 6 pass, 0 fail: existing
tests 1–4 repointed, new tests 5–6 exercising renderTemplate
directly. Falsification witness: removing the `{{PI_DOCS}}`
replaceAll turns test 5 red.

### P1.2 — Template store, pointer resolution, migration

Files: lib/templates.ts, index.ts, templates/default.md (git mv from
SYSTEM.template.md), .gitignore, tests/templates.test.ts,
tests/rewrite.test.ts
Changes: `git mv SYSTEM.template.md templates/default.md`. Add
lib/templates.ts per the pinned signatures: pointer file is
`<dir>/.active`, validity rule as pinned in Interfaces,
fallback chain pointer → default.md → null. index.ts resolves
the real templates dir from `import.meta.url` with the
absolute repo path as catch-fallback (today's pattern) and the
splice path uses `readActiveTemplate`; null means the stock
prompt stands. `.gitignore` gains `templates/.active`.
Acceptance: verify.sh green; 12 pass, 0 fail (adds tests 7–12); test 10
runs against an empty temp dir and asserts the handler returns
undefined (stock stands). Falsification witness: making
readActiveTemplate throw on a missing pointer file turns test
7 red.

### P1.3 — /sysprompt command and switch action

Files: index.ts, tests/wiring.test.ts
Changes: Register command `sysprompt` (description: "Manage system
prompt templates"). No args: `ctx.ui.select` over `switch`,
`new`, `inspect`, `test`; `inspect` and `test` notify "not
built yet" until P2.1/P3.1 replace them (carried as K5). Arg
matching an action jumps straight to it; unknown arg notifies
usage. `switch` per the pinned Interfaces flow. Esc at any
picker cancels with no write.
Acceptance: verify.sh green; 14 pass, 0 fail (adds wiring tests 16–17
driving the registered command through a stub ExtensionAPI
with stubbed ctx.ui). Falsification witness: writing the
pointer before the select resolves turns test 17 red.

### P1.4 — Scaffold action

Files: index.ts, lib/templates.ts, tests/templates.test.ts
Changes: `scaffoldTemplate` per the pinned signature and validation.
Wire the `new` action: `ctx.ui.input("Template name:")` then
scaffold, notify created path or the error message.
Acceptance: verify.sh green; 17 pass, 0 fail (adds tests 13–15).
Falsification witness: removing the existing-file check turns
test 15 red.

### Phase 1 gate

Runnable: `./scripts/verify.sh` green, 17 unit tests pass, 0 fail.
Eye check (owner or builder in a live session): `/sysprompt` opens the
menu; `switch` to a second template visibly changes the next reply's
voice; `new` creates a template that then appears in the switch list;
`git status` shows `templates/.active` untracked-ignored. This eye check
resolves K1.
Review: independent fresh-context reviewer, register at
`plans/2026-08-17-template-manager.review-1.md`, severities per the house
register (CRITICAL/MAJOR/MINOR/NOTE). Brief includes the freezability
question and the failure classes unit gates cannot reach here: symlink
path resolution in a deployed session (K1), picker cancellation paths,
pointer writes racing concurrent sessions.
Commit before Phase 2.

## Phase 2 — Inspection

### P2.1 — Immediate dump

Files: index.ts, lib/inspect.ts, tests/inspect.test.ts,
tests/wiring.test.ts, fixtures/golden/immediate-dump.md
Changes: `renderImmediateDump` per the pinned immediate-dump format.
The `inspect` action (replacing the K5 placeholder) writes
`../artifacts/inspect/<stamp>-immediate.md` and notifies the
path. Golden fixture created from a synthetic
SystemPromptOptions value pinned in the test.
Acceptance: verify.sh green; 19 pass, 0 fail (adds tests 18 and 21).
Falsification witness: dropping the skills section from the
renderer turns the golden compare (21) red.

### P2.2 — Armed ground-truth capture

Files: index.ts, lib/inspect.ts, tests/inspect.test.ts,
tests/wiring.test.ts, fixtures/golden/provider-dump.md
Changes: `armCapture`/`takeArmedCapture` one-shot in-memory state; the
inspect action arms after the immediate dump and notifies
"send any message to capture the ground-truth dump"
(checkpoint D4). `before_provider_request` handler per the
pinned call stack: extraction rules, `.md` + `.txt` pair,
JSON fallback, sha256-prefixed notify, no payload replacement.
Acceptance: verify.sh green; 26 pass, 0 fail (adds tests 19 and 22–27);
test 19 asserts the `.txt` bytes equal the synthetic payload's
system string exactly. Falsification witness: making
takeArmedCapture return the stamp twice turns test 27 red.

### Phase 2 gate

Runnable: verify.sh green, 26 unit tests pass, 0 fail.
Eye check: in a live session with at least one other prompt-touching
extension loaded, `/sysprompt inspect` then one message writes all three
files; `sha256sum <stamp>-provider.txt` matches the notified hash prefix
(byte-identity procedure for the thesis acceptance); the provider dump
contains injections absent from the immediate dump, proving the
ground-truth/best-effort distinction.
Review: same reviewer protocol, register appended to the Phase 1 register
file. Brief adds: payload shapes from the providers the owner actually
uses (claude-go bridge included), artifact-write failure handling.
Commit before Phase 3.

## Phase 3 — Standardized output test

### P3.1 — Output test action

Files: index.ts, lib/output-test.ts, tests/output-test.test.ts,
tests/wiring.test.ts, fixtures/golden/output-test-result.md,
fixtures/output-test-document.md (read-only dependency)
Changes: lib/output-test.ts per the pinned signatures and formats
(OUTPUT_TEST_PROMPT frozen per D3; templateSha256 per R1). The
`test` action (replacing the K5 placeholder) per the pinned
call stack; modelId and provider sanitized per Interfaces.
Acceptance: verify.sh green; 30 pass, 0 fail (adds tests 20 and 28–30).
Falsification witness: changing OUTPUT_TEST_PROMPT wording
turns test 28 red.

### Phase 3 gate

Runnable: verify.sh green, 30 unit tests pass, 0 fail.
Eye check: one live `/sysprompt test` run produces a results file whose
header names the active template, its sha256, and the current model, and
whose body is the model's summary; owner eyeballs it as the first corpus
entry. This resolves K2's day-one acceptance.
Review: same reviewer protocol, register appended. Brief adds: turn_end
attribution race (K2), behavior when the user types another message
between the test send and turn end.
Commit; build complete, hand to as-built pass.

## Risks and parked items

- K1: `import.meta.url` must resolve to the repo through Pi's extension
  loader and the deployed symlink. Today's index.ts already relies on this
  and works live, so the risk is confined to the added `../templates` and
  `../../artifacts` traversals. Earliest resolution: Phase 1 gate eye
  check. Failure forces a CONTRACT AMENDMENT pinning absolute fallbacks.
- K2: turn_end attribution. If another message lands between the test send
  and its turn_end, the pending capture may attach to the wrong assistant
  reply. Earliest resolution: Phase 3 gate. Accepted for day one (single
  writer, owner-driven flow); recurring misattribution forces a plan
  amendment keying capture to the sent message.
- K3: provider payload shapes beyond the recognizers fall to the full-JSON
  dump, which is fail-open by design. A shape seen repeatedly in real use
  becomes a new recognizer via CONTRACT AMENDMENT.
- K4: the fixture document rides every test run's context. Accepted:
  comparability requires the full document.
- K5: P1.3 ships `inspect` and `test` menu entries as "not built yet"
  notifies. Owned by P2.1 and P3.1, which replace them; the Phase 1 review
  checks they are inert.

## Ratification items

- R1 (blocks: P3.1): record the sha256 of the active template's content in
  the output-test result header, so a result attributes to the exact
  template version rather than a name that may have been edited since.
  Keeping: one hash line per result, `node:crypto`, no new dependency.
  Rejecting: results attribute by name only, and template edits silently
  break cross-run comparability. Recommendation: adopt.
- R2 (blocks: P1.1): placeholders are optional in a template. An absent
  placeholder no-ops, so the owner can deliberately omit the tools list,
  guidelines, or Pi docs from a template. Keeping: templates are free-form
  and the splice never rejects owner prose. Rejecting: a template missing
  any placeholder fails open to the stock prompt, which protects against
  accidental deletion but forbids deliberate omission and contradicts
  "the template owns the prose". Recommendation: adopt (optional).

## Stop rules

- Stop after two failed fixes to one defect; summarize and re-scope.
- Stop on conflict between this plan, DESIGN.md, or an owner ruling; ask.
- Never pass a phase gate with failing proof or an open blocker.
- The tree is live through the deployed symlink: never leave a phase
  boundary with verify.sh red.

## Handoff notes

- Entry point: P1.1 (after R2 is ruled; R1 before P3.1). Base commit:
  `51a27ef47f90cb5399644e9f8d6c22b11b25197a` (contains DESIGN.md as
  ratified, the fixture, and this plan's draft).
- Home machine: willow. Repo: `~/projects/pi-sysprompt-editor/main`,
  container artifacts at `~/projects/pi-sysprompt-editor/artifacts/`.
- The extension is deployed as a symlink from Pi's extension directory, so
  edits are live in new sessions; keep fail-open intact at every commit.
- Harness API pins verified against installed
  `@earendil-works/pi-coding-agent` 0.84.1 (matches package.json devDep):
  `before_agent_start` fires per prompt and chains; `before_provider_request`
  exposes `event.payload`; `turn_end` carries `event.message`;
  `ctx.getSystemPromptOptions()` is command-context only; `ctx.ui.select/
input` return undefined on cancel; `pi.sendUserMessage` always triggers a
  turn when idle; `ctx.model` carries `.provider` and `.id`.
- Toolchain: node 22.x (v22.23.1 verified), `--experimental-strip-types`,
  typescript 7.0.2, prettier 3.9.6; verify.sh runs `npm ci` first and
  asserts the node major.
- Freezability: DESIGN.md, this plan, `templates/default.md`, the fixture,
  the golden fixtures under `fixtures/golden/`, and the unit suites'
  synthetic stock prompt are the rebuild set; the wiring suite freezes the
  command and hook glue.

## Lint results

- Round 1: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-1.md`. Fixed: test baseline
  corrected 6→4 existing with all per-packet counts rederived (30 final);
  dead falsification witness replaced with a real renderTemplate test;
  wiring test file added so command/hook glue is unit-gated; R1 kept open
  and wired into ResultHeader, new R2 opened for optional placeholders;
  canonical 30-test list added; byte-identity procedure pinned (raw .txt +
  sha256 notify); fixture and goldens added to Files and the freezable
  set; full 40-char base SHA pinned; node version pinned; K5 added for
  menu placeholders; stamp/sanitization/pointer-validity/JSON-fallback
  rules pinned in Interfaces.
