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
  check at the phase gate.
- `/sysprompt new <name>` creates `templates/<name>.md` containing all
  three placeholders. Verified by unit test `scaffold: new template carries
all three placeholders`.
- `/sysprompt inspect` writes an immediate best-effort dump at command time
  and a ground-truth dump on the next provider request; the ground-truth
  dump's system prompt is byte-identical to the payload's. Verified by unit
  tests on the payload extractor plus a live eye check diffing the dump
  against a `before_provider_request` console capture.
- `/sysprompt test` sends the pinned analysis prompt with the fixture
  document and writes the assistant's response to a dated results file
  naming the model and active template. Verified by unit tests on prompt
  assembly and filename shape plus one live run.
- Every fail-open branch (missing pointer, pointer to missing file, missing
  default template, custom prompt active, drifted stock shape,
  unrecognized payload shape) leaves the prompt or artifact in the
  documented fallback state. Verified by named unit tests, one per branch.
- `scripts/verify.sh` exits 0.

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
  fuck down" (2026-03-25), captured at
  `fixtures/output-test-document.md`.
- 2026-08-17 — Checkpoint D1: migrate clean, `git mv SYSTEM.template.md
templates/default.md`; a permanent legacy fallback path rejected.
- 2026-08-17 — Checkpoint D2: `new` seeds a copy of the currently active
  template; bare skeleton rejected.
- 2026-08-17 — Checkpoint D3: the output-test prompt is exactly
  `Summarize this article for me.` The owner's rationale: the test measures
  the system prompt's innate steering of style and structure, so the user
  prompt must not enforce output shape. Structured multi-section prompts
  rejected.
- 2026-08-17 — Checkpoint D4: armed inspect capture triggers on the next
  ordinary message; auto-sending a trigger message rejected.
- These decisions are closed during implementation.

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

Green is: `npm ci` clean, `prettier --check` clean, `tsc --noEmit` clean,
`node --experimental-strip-types --test tests/*.test.ts` all pass, 0 fail.
Expected test count at plan completion: 24 pass, 0 fail (6 existing + 18
new; per-packet counts pinned in Acceptance lines). Live checks that need a
real session are phase gate eye checks, named in each phase gate, and are
not part of verify.sh.

## Design surface

### Layout

- `index.ts` — registration only: `before_agent_start` splice hook,
  `before_provider_request` capture hook, `turn_end` test-capture hook,
  `/sysprompt` command. Logic lives in `lib/`.
- `lib/splice.ts` — `splitTail`, `extract`, `renderTemplate`: moved verbatim
  from today's `index.ts` so the splice keeps its tested shape.
- `lib/templates.ts` — template store: directory resolution, list, active
  pointer read/write, scaffold. Owns all filesystem paths under
  `templates/`.
- `lib/inspect.ts` — immediate dump rendering from prompt options, payload
  system-prompt extraction, arm/disarm state.
- `lib/output-test.ts` — pinned test prompt assembly, result filename, and
  result file writing.
- `templates/default.md` — the current `SYSTEM.template.md`, moved by
  `git mv` (checkpoint D1).
- `templates/.active` — gitignored one-line pointer file naming a template
  filename, e.g. `default.md`.
- `fixtures/output-test-document.md` — exists (13,745 bytes).
- `../artifacts/inspect/`, `../artifacts/output-tests/` — container-level
  output directories, created on demand, never read by product code.
- `tests/rewrite.test.ts` (updated), `tests/templates.test.ts`,
  `tests/inspect.test.ts`, `tests/output-test.test.ts`.
- `.gitignore` gains `templates/.active`.

### Interfaces

- Command `/sysprompt` (no args): `ctx.ui.select` menu of four actions:
  `switch`, `new`, `inspect`, `test`.
- `/sysprompt switch|new|inspect|test` jumps straight to the action.
  Unknown arg: notify with usage, no action.
- `switch`: `ctx.ui.select("Active template:", <templates, active-first>)`,
  writes `templates/.active`, notifies "active template: <name> (applies
  next message)".
- `new`: `ctx.ui.input("Template name:")`, validated against
  `^[a-z0-9-]+$`, writes `templates/<name>.md` seeded as a copy of the
  currently active template (checkpoint D2), refuses to overwrite an
  existing file (notify error).
- `inspect`: writes
  `../artifacts/inspect/<YYYY-MM-DD-HHmmss>-immediate.md`, arms one-shot
  capture, notifies both the written path and "send any message to capture
  the ground-truth dump". Armed capture writes
  `<same-stamp>-provider.md` and notifies.
- `test`: reads the fixture, sends the pinned prompt via
  `pi.sendUserMessage`, and on that turn's end writes
  `../artifacts/output-tests/<YYYY-MM-DD-HHmmss>-<provider>-<modelId>.md`
  with a header (date, provider/model, active template name) and the
  assistant's text. Missing fixture: notify error, send nothing.
- File format, pointer: single line, the template filename with extension,
  trailing newline optional.
- File format, provider dump: an H1 header block (timestamp,
  provider/model), then the extracted system prompt verbatim inside a
  fenced block; if the payload shape is unrecognized, the full payload as
  fenced JSON with a note line instead.

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
// null = shape drifted, caller fails open

// lib/templates.ts
export function templatesDir(): string; // <repo>/templates via import.meta.url
export function listTemplates(): string[]; // *.md filenames, active first then alpha
export function readActiveTemplate(): { name: string; content: string } | null;
// pointer missing/invalid -> default.md; default.md missing -> null (fail open)
export function setActiveTemplate(name: string): void;
export function scaffoldTemplate(name: string): string | Error;
// returns created path; Error when name invalid or file exists

// lib/inspect.ts
export function renderImmediateDump(options: SystemPromptOptions): string;
export function extractSystemPromptFromPayload(payload: unknown): string | null;
// recognizes: payload.system as string; payload.system as {text}[] blocks;
// payload.messages[0].role === "system" | "developer" with string or {text}[]
// content. null = unrecognized, caller dumps full payload JSON.
export function armCapture(stamp: string): void;
export function takeArmedCapture(): string | null; // stamp once, then null

// lib/output-test.ts
export const OUTPUT_TEST_PROMPT = "Summarize this article for me.";
export function buildTestMessage(fixtureText: string): string;
export function resultFileName(
  now: Date,
  provider: string,
  modelId: string,
): string;
export function formatResult(
  header: ResultHeader,
  responseText: string,
): string;

interface ResultHeader {
  timestamp: string;
  provider: string;
  modelId: string;
  activeTemplate: string; // "(stock)" when fail-open left the stock prompt
}
```

`buildTestMessage` = `OUTPUT_TEST_PROMPT + "\n\n---\n\n" + fixtureText`.
The prompt is deliberately bare (checkpoint D3): the system prompt under
test supplies all structure and voice.

### Call stack

Splice (every turn):
`before_agent_start` handler → stand-down checks (custom prompt, stock
first line) → `readActiveTemplate()` → null: return (stock stands) →
`splitTail` → `renderTemplate` → null: return → `{ systemPrompt }`.

Switch: command handler → `listTemplates()` → `ctx.ui.select` →
`setActiveTemplate` → `ctx.ui.notify`.

New: command handler → `ctx.ui.input` → `scaffoldTemplate` → notify path
or error.

Inspect: command handler → `ctx.getSystemPromptOptions()` →
`renderImmediateDump` → write immediate file → `armCapture(stamp)` →
notify. Then `before_provider_request` handler → `takeArmedCapture()` →
null: return → `extractSystemPromptFromPayload(event.payload)` → write
provider file (extracted text, or full JSON on null) → notify. The
handler never modifies or returns a payload.

Test: command handler → read fixture (missing: notify, stop) → record
pending flag + stamp + model → `pi.sendUserMessage(buildTestMessage(...))`
→ `turn_end` handler → pending flag set: `formatResult` → write result
file → clear flag → notify path.

### Test plan

`tests/rewrite.test.ts` (updated): the six existing splice/fail-open tests,
re-pointed at `lib/splice.ts` + `readActiveTemplate` composition:

- `rewrite: template renders with live tools, guidelines, docs`
- `rewrite: tail preserved byte-for-byte`
- `fail open: custom prompt active`
- `fail open: stock first line absent`
- `fail open: anchor extraction returns null on drifted shape`
- `fail open: no template resolvable leaves stock prompt`

`tests/templates.test.ts`:

- `pointer resolution: missing pointer falls back to default.md`
- `pointer resolution: pointer naming a missing file falls back to default.md`
- `pointer resolution: default.md missing returns null`
- `pointer resolution: switch changes rendered template`
- `list: active template sorts first`
- `scaffold: new template carries all three placeholders`
- `scaffold: invalid name rejected`
- `scaffold: existing file not overwritten`

`tests/inspect.test.ts`:

- `extract: anthropic string system`
- `extract: anthropic block-array system`
- `extract: openai system message` (and `developer` role variant)
- `extract: unrecognized payload returns null`
- `immediate dump: renders tools, guidelines, context paths, skills sections`
- `arm: capture is one-shot`

`tests/output-test.test.ts`:

- `prompt: fixture embedded verbatim after pinned instructions`
- `result: filename carries stamp, provider, model id`
- `result: header carries active template name`

All tests are stub-API unit tests in the existing style (no Pi process, no
provider). Live behaviors (menu feel, capture notify, real dump diff, one
real test run) are phase gate eye checks.

### Least confident decisions

The four owner-facing forks (migration, scaffold seed, test prompt, inspect
trigger) were ruled at the 2026-08-17 checkpoint and moved to Fixed
decisions. The remaining least-confident technical calls are carried as
risk rows: payload-shape recognizers (K3), test-response attribution on
`turn_end` (K2), and `import.meta.url` resolution through the deployed
symlink (K1).

## Phase 1 — Template store and switching

### P1.1 — Extract splice into lib/splice.ts

Files: index.ts, lib/splice.ts, tests/rewrite.test.ts
Changes: Move `splitTail`, `extract`, and the render logic verbatim from
index.ts into lib/splice.ts as `splitTail`, `extract`,
`renderTemplate(template, core) -> string | null` (null on any
failed anchor extraction). index.ts keeps registration and the
stand-down checks, reads the template from its current
SYSTEM.template.md path, and calls the lib functions. No
behavior change.
Acceptance: `./scripts/verify.sh` green; `node --experimental-strip-types
            --test tests/rewrite.test.ts` reports 6 pass, 0 fail, with
tests importing lib/splice.ts directly. Falsification witness:
deleting the `{{PI_DOCS}}` anchor handling in renderTemplate
turns `fail open: anchor extraction returns null on drifted
            shape` red.

### P1.2 — Template store, pointer resolution, migration

Files: lib/templates.ts, index.ts, templates/default.md (git mv from
SYSTEM.template.md), templates/.active (gitignored, not
committed), .gitignore, tests/templates.test.ts,
tests/rewrite.test.ts
Changes: `git mv SYSTEM.template.md templates/default.md`. Add
lib/templates.ts: `templatesDir()` resolves `../templates`
relative to the module via import.meta.url with the absolute
repo path as catch-fallback (same pattern as today's index.ts);
`readActiveTemplate()` reads `templates/.active` (one line,
filename), falls back to `default.md` when the pointer is
missing or names a file that does not exist, returns null when
no template file is readable; `setActiveTemplate(name)` writes
the pointer; `listTemplates()` returns *.md filenames, active
first then alphabetical. index.ts splice path uses
`readActiveTemplate()`; null means the stock prompt stands.
`.gitignore` gains `templates/.active`.
Acceptance: verify.sh green; tests/templates.test.ts reports 5 pass
(`pointer resolution: missing pointer falls back to default.md`,
`pointer resolution: pointer naming a missing file falls back
            to default.md`, `pointer resolution: default.md missing returns
            null`, `pointer resolution: switch changes rendered template`,
`list: active template sorts first`); rewrite suite still 6
pass with `fail open: no template resolvable leaves stock
            prompt` running against an empty temp templates dir; total 11
pass. Falsification witness: making readActiveTemplate throw on
a missing pointer file turns the first pointer test red.

### P1.3 — /sysprompt command and switch action

Files: index.ts
Changes: Register command `sysprompt` (description: "Manage system
prompt templates"). No args: `ctx.ui.select` over the four
action labels `switch`, `new`, `inspect`, `test` (`inspect` and
`test` notify "not built yet" until their packets land, and
those placeholder notifies are removed by P2.1 and P3.1). Arg
matching an action name jumps straight to it; unknown arg
notifies usage. `switch` shows `listTemplates()` active-first,
writes the pointer via `setActiveTemplate`, notifies
"active template: <name> (applies next message)". Esc at any
picker cancels with no write.
Acceptance: verify.sh green (counts unchanged: 11 pass). Command behavior
is glue over tested store functions; live proof is the Phase 1
gate eye check.

### P1.4 — Scaffold action

Files: index.ts, lib/templates.ts, tests/templates.test.ts
Changes: `scaffoldTemplate(name)`: validate `^[a-z0-9-]+$`, refuse
existing files, write `templates/<name>.md` as a byte copy of
the currently active template's content (checkpoint D2), return
the created path or an Error. Wire the `new` action:
`ctx.ui.input("Template name:")` then scaffold, notify created
path or the error message.
Acceptance: verify.sh green; templates suite reports 8 pass (adds
`scaffold: new template carries all three placeholders`,
`scaffold: invalid name rejected`, `scaffold: existing file not
            overwritten`); total 14 pass. Falsification witness: removing
the existing-file check turns the overwrite test red.

### Phase 1 gate

Runnable: `./scripts/verify.sh` green, 14 unit tests pass, 0 fail.
Eye check (owner or builder in a live session): `/sysprompt` opens the
menu; `switch` to a second template visibly changes the next reply's
voice; `new` creates a template that then appears in the switch list;
`git status` shows `templates/.active` untracked-ignored.
Review: independent fresh-context reviewer, register at
`plans/2026-08-17-template-manager.review-1.md`, severities per the house
register (CRITICAL/MAJOR/MINOR/NOTE). Brief includes the freezability
question and the failure classes unit gates cannot reach here: symlink
path resolution in a deployed session (K1), picker cancellation paths, and
pointer writes racing concurrent sessions.
Commit before Phase 2.

## Phase 2 — Inspection

### P2.1 — Immediate dump

Files: index.ts, lib/inspect.ts, tests/inspect.test.ts
Changes: `renderImmediateDump(options)` renders a markdown report from
`ctx.getSystemPromptOptions()`: header line "best-effort
rebuild at command time; excludes other extensions' per-turn
changes", then sections for custom prompt (present/absent),
selected tools with snippets, prompt guidelines, appended
system prompt text, context file paths with byte sizes (paths
only, never content), and skill names. The `inspect` action
writes it to
`../artifacts/inspect/<YYYY-MM-DD-HHmmss>-immediate.md`
(directory created recursively) and notifies the path.
Acceptance: verify.sh green; inspect suite reports 1 pass (`immediate
            dump: renders tools, guidelines, context paths, skills
            sections`); total 15 pass. Falsification witness: dropping the
skills section from the renderer turns it red.

### P2.2 — Armed ground-truth capture

Files: index.ts, lib/inspect.ts, tests/inspect.test.ts
Changes: `armCapture(stamp)` / `takeArmedCapture()` one-shot in-memory
state. The `inspect` action arms after writing the immediate
dump and notifies "send any message to capture the ground-truth
dump" (checkpoint D4). A `before_provider_request` handler:
when armed, `extractSystemPromptFromPayload(event.payload)`
recognizes payload.system as string, payload.system as
{text}[] blocks (joined with \n\n), and payload.messages[0]
with role "system" or "developer" carrying string or {text}[]
content; writes
`../artifacts/inspect/<stamp>-provider.md` with a header
(timestamp, provider/model) and the extracted prompt in a
fenced block, or on null the full payload as fenced JSON with a
note line; notifies; never returns a payload replacement.
Acceptance: verify.sh green; inspect suite reports 7 pass (adds `extract:
            anthropic string system`, `extract: anthropic block-array
            system`, `extract: openai system message`, `extract: openai
            developer message`, `extract: unrecognized payload returns
            null`, `arm: capture is one-shot`); total 21 pass.
Falsification witness: making takeArmedCapture return the stamp
twice turns the one-shot test red.

### Phase 2 gate

Runnable: verify.sh green, 21 unit tests pass, 0 fail.
Eye check: in a live session with at least one other prompt-touching
extension loaded, `/sysprompt inspect` writes both files; the provider
dump contains the rendered template core plus injections absent from the
immediate dump, which is the observable proof of the ground-truth/
best-effort distinction.
Review: same reviewer protocol, register appended to the Phase 1 register
file. Brief adds: payload shapes from the providers the owner actually
uses (claude-go bridge included), and artifact-write failure handling.
Commit before Phase 3.

## Phase 3 — Standardized output test

### P3.1 — Output test action

Files: index.ts, lib/output-test.ts, tests/output-test.test.ts
Changes: `OUTPUT_TEST_PROMPT = "Summarize this article for me."` (D3,
frozen). `buildTestMessage(fixtureText)` = prompt + "\n\n---\n\n" + fixtureText. The `test` action reads
`fixtures/output-test-document.md` (missing: notify error, send
nothing), records a pending capture (stamp, provider, modelId,
active template name from `readActiveTemplate()` or
"(stock)"), and calls `pi.sendUserMessage(buildTestMessage(...))`.
A `turn_end` handler: when a capture is pending, writes
`../artifacts/output-tests/<YYYY-MM-DD-HHmmss>-<provider>-<modelId>.md`
via `formatResult` (header: timestamp, provider/model, active
template name and sha256 of its content per R1; then the
assistant message text), clears the pending state, notifies the
path. modelId is sanitized for filenames (`/` and `:` to `-`).
Acceptance: verify.sh green; output-test suite reports 3 pass (`prompt:
            fixture embedded verbatim after pinned instructions`, `result:
            filename carries stamp, provider, model id`, `result: header
            carries active template name`); total 24 pass. Falsification
witness: changing OUTPUT_TEST_PROMPT wording turns the verbatim
test red.

### Phase 3 gate

Runnable: verify.sh green, 24 unit tests pass, 0 fail.
Eye check: one live `/sysprompt test` run against the fixture produces a
results file whose header names the active template and current model and
whose body is the model's summary; owner eyeballs it as the first corpus
entry.
Review: same reviewer protocol, register appended. Brief adds: turn_end
attribution race (K2) and behavior when the user types another message
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
  reply. Earliest resolution: P3.1 live gate. Accepted for day one (single
  writer, owner-driven flow); recurring misattribution forces a plan
  amendment keying capture to the sent message.
- K3: provider payload shapes beyond the three recognizers fall to the
  full-JSON dump, which is fail-open by design. A shape seen repeatedly in
  real use becomes a new recognizer via CONTRACT AMENDMENT.
- K4: the 13,745-byte fixture rides every test run's context. Accepted:
  comparability requires the full document.

## Ratification items

- R1 (blocks: P3.1): record the sha256 of the active template's content in
  the output-test result header, so a result attributes to the exact
  template version rather than a name that may have been edited since.
  Keeping: one hash line per result, `node:crypto`, no new dependency.
  Rejecting: results attribute by name only and template edits silently
  break cross-run comparability. Recommendation: adopt.

## Stop rules

- Stop after two failed fixes to one defect; summarize and re-scope.
- Stop on conflict between this plan, DESIGN.md, or an owner ruling; ask.
- Never pass a phase gate with failing proof or an open blocker.
- The tree is live through the deployed symlink: never leave a phase
  boundary with verify.sh red.

## Handoff notes

- Entry point: P1.1. Base commit: a1f70b3 plus the fixture/plan commit
  this plan lands in (see git log for `plans/2026-08-17-template-manager`).
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
  turn when idle.
- Toolchain: node with `--experimental-strip-types`, typescript 7.0.2,
  prettier 3.9.6; verify.sh runs `npm ci` first.
- Freezability: DESIGN.md, this plan, `templates/default.md`, the fixture,
  and the unit suites' synthetic stock prompt are the rebuild set.

## Lint results

(pending)
