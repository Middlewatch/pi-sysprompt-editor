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
- `scripts/verify.sh` exits 0 with 45 unit tests passing, 0 failing.

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
- These decisions are closed during implementation. O1 and O2 under
  Ratification items are the open owner items; O1 blocks P3.1, O2 blocks
  P1.1. Ratification folds their rulings into this list.

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
(existing `tests/rewrite.test.ts`), P1.1 → 6, P1.2 → 12, P1.3 → 16,
P1.4 → 21, P2.1 → 28, P2.2 → 37, P3.1 → 45. Live checks that need a real
session are phase gate eye checks, named in each phase gate, and are not
part of verify.sh.

## Design surface

### Layout

- `index.ts` — registration only: `before_agent_start` splice hook,
  `before_provider_request` capture hook, `turn_end` test-capture hook,
  `/sysprompt` command. Logic lives in `lib/`. The default export gains an
  optional second parameter,
  `systemPromptExtension(pi, paths?: ExtensionPaths)`, the test seam: Pi
  calls it with one argument and the URL-resolved defaults apply; wiring
  tests pass temp directories. This is the only injection mechanism.
  `tests/rewrite.test.ts` already uses the stub-ExtensionAPI half of this
  pattern.
- `lib/splice.ts` — `splitTail`, `extract`, `renderTemplate`: moved verbatim
  from today's `index.ts` so the splice keeps its tested shape.
- `lib/templates.ts` — template store: list, active pointer read/write,
  scaffold. Every function takes the templates directory as its first
  argument; `index.ts` supplies the real path (resolved from
  `import.meta.url`, same pattern as today), tests supply temp dirs. The
  pinned spellings from `index.ts` at repo root are
  `fileURLToPath(new URL("./templates/", import.meta.url))` and
  `fileURLToPath(new URL("../artifacts/", import.meta.url))`
  (`node:url`), so every path handed to `lib/` is a decoded string. There
  is no other fallback: if URL resolution throws, the splice fails open
  and command actions notify the error.
- `lib/inspect.ts` — immediate dump rendering, payload system-prompt
  extraction, arm/disarm state, artifact writing.
- `lib/output-test.ts` — pinned test prompt assembly, result filename,
  result formatting and writing.
- `templates/default.md` — the current `SYSTEM.template.md`, moved by
  `git mv` (checkpoint D1); the source path `SYSTEM.template.md` ceases to
  exist at P1.2.
- `templates/.active` — gitignored one-line pointer file naming a template
  filename, e.g. `default.md`.
- `fixtures/output-test-document.md` — exists, committed at base.
- `fixtures/golden/immediate-dump.md`,
  `fixtures/golden/immediate-dump-empty.md`,
  `fixtures/golden/provider-dump.md`,
  `fixtures/golden/output-test-result.md` — golden serializations of the
  three artifact formats (two for the immediate dump), byte-compared by
  unit tests, part of the
  freezable asset set. Each golden is a pair: `<name>.input.json` holds
  the exact renderer arguments (immediate-dump: one
  `BuildSystemPromptOptions` value; provider-dump: `{ header, payload }`;
  output-test-result: `{ header, responseText }`) and `<name>.md` holds
  the expected bytes. The golden test reads the input JSON, calls the
  renderer, and byte-compares against the `.md`; no synthetic input lives
  only in a test. Blessing: the packet that lands a golden generates the
  `.md` from the pinned input, and the phase reviewer checks it line by
  line against the pinned format before it is committed.
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
- Stamp format: local time `YYYY-MM-DD-HHmmss`, zero-padded, via
  `makeStamp(new Date())`. Collision rule via `freeBase(dir, base, exts)`:
  if any `<base><ext>` already exists in `dir`, the base becomes
  `<base>-N` for the smallest integer N ≥ 2 such that no `<base>-N<ext>`
  exists for any ext in the list; the provider pair passes
  `[".md", ".txt"]` so both files always share one suffix, single files
  pass one extension. `freeBase` returns the basename only (no directory,
  no extension); the caller joins and appends. Each artifact family
  resolves its own collision at write time from the same raw stamp: the
  immediate file resolves `<stamp>-immediate`, the provider pair resolves
  `<stamp>-provider`, the result resolves `resultBase(...)`. Armed and
  pending state store the raw stamp, never a resolved base.
- Filename sanitization: in provider and modelId, every character outside
  `[A-Za-z0-9._-]` becomes `-`.
- Pointer validity: the pointer file's content, trimmed, must match
  `^[a-z0-9-]+\.md$` (single line, no path separators). Anything else is
  invalid and falls back to `default.md`.
- Provider/model metadata source: `ctx.model.provider` and `ctx.model.id`
  (available on both command context and event context) through
  `modelLabel(ctx.model)`. `ctx.model` is typed `Model | undefined`; when
  it is undefined, both provider and modelId are the literal `unknown`, in
  headers and filenames alike.
- Placeholders are optional in a template: an absent placeholder means the
  owner omitted that section deliberately, and `replaceAll` no-ops
  (subject to O2).
- Empty-store behaviors: `switch` with zero listed templates notifies
  "no templates found" and exits; `new` when `readActiveTemplate` returns
  null notifies "no active template to copy" and exits.
- Artifact-write failure (mkdir or write throws): notify the error message
  at level "error", clear any armed/pending capture state, never throw out
  of a handler.
- Assistant text extraction: the result body is the assistant message's
  text blocks (`content` items with `type === "text"`) joined with
  `"\n\n"`; non-text blocks are ignored.
- Template attribution: index.ts keeps module state
  `lastRender: { name: string; sha256: string } | null`, written by every
  `before_agent_start` (the applied template's name and content sha256, or
  null when any stand-down or fail-open branch left the stock prompt). The
  output-test result header reads `lastRender` at `turn_end`, so it
  records what actually rendered on the test turn rather than what was
  active at command time.
- Serialization rules shared by all three formats: lines are joined with
  `\n`, blocks are separated by exactly one blank line, every rendered
  line and every verbatim block is followed by exactly one `\n`, verbatim
  content is never trimmed or normalized (so content that already ends in
  `\n` yields one blank line before the closing fence or the end of file,
  and that is the intended bytes), lists render one `- ` bullet per item
  in input-array order and the single line `(none)` when the array is
  empty or absent, and a fenced block uses a run of backticks one longer
  than the longest backtick run inside the fenced content (minimum three)
  so any prompt survives fencing. `<stamp>` is the same value used in the
  filename; `<provider>` and `<modelId>` are the `modelLabel` values
  before filename sanitization. Golden-pinned means the committed golden
  pair is the byte-level witness of these rules.
- File format, provider dump `.md` (recognized payload):

  ```text
  # Provider system prompt (ground truth)

  - timestamp: <stamp>
  - provider: <provider>
  - model: <modelId>

  <fence>
  <extracted system prompt verbatim>
  <fence>
  ```

  Unrecognized payload shape: the same header block, then the line
  `Unrecognized payload shape; raw payload follows.`, a blank line, then
  `JSON.stringify(payload, null, 2)` inside a fence whose opening line
  carries the info string `json`; if stringify throws, the note line, a
  blank line, then `String(payload)` unfenced. The `.txt` twin is written
  only when extraction succeeds.
- File format, output-test result:

  ```text
  # Output test

  - timestamp: <stamp>
  - provider: <provider>
  - model: <modelId>
  - template: <active template name>
  - template-sha256: <64 hex>

  ---

  <assistant text verbatim>
  ```

  When fail-open left the stock prompt, the template line reads
  `- template: (stock)` and the `template-sha256` line is omitted.
  Golden-pinned.
- File format, immediate dump (no timestamp or model lines; the stamp is
  in the filename and the renderer takes only the options value):

  ```text
  # System prompt (best-effort rebuild at command time)

  Rebuilt from ctx.getSystemPromptOptions() when the command ran. It
  excludes per-turn changes made by other extensions; the provider
  capture is the ground truth.

  ## Custom prompt

  present | absent

  ## Selected tools

  - <tool>: <snippet>
  - <tool>

  ## Prompt guidelines

  - <guideline>

  ## Appended system prompt

  <fence>
  <appendSystemPrompt verbatim>
  <fence>

  ## Context files

  - <path> (<utf-8 byte length> bytes)

  ## Skills

  - <skill name>
  ```

  Each list section renders `(none)` when empty or absent, and the
  appended-prompt section renders `(none)` in place of the fence when
  absent or empty. `present` when `customPrompt` is a non-empty string,
  otherwise `absent`. A tool renders `- <tool>: <snippet>` when
  `toolSnippets[tool]` is a non-empty string and `- <tool>` otherwise;
  tools follow `selectedTools` order. Context files render paths and
  utf-8 byte lengths of their content only, never content. Golden-pinned
  twice: `immediate-dump` (every section populated) and
  `immediate-dump-empty` (options carrying only `cwd`, so every section
  renders its empty form).

### Types and signatures

```typescript
// index.ts — all fields are plain decoded path strings; defaults are
// computed with fileURLToPath(new URL(<spelling>, import.meta.url))
interface ExtensionPaths {
  templatesDir?: string;   // default spelling: "./templates/"
  artifactsDir?: string;   // default spelling: "../artifacts/"
  fixturePath?: string;    // default spelling: "./fixtures/output-test-document.md"
}
export default function systemPromptExtension(pi: ExtensionAPI, paths?: ExtensionPaths): void;

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
export function scaffoldTemplate(dir: string, name: string, content: string): string | Error;
// content = the active template's content, supplied by the command after
// its own readActiveTemplate check; returns created path; Error when name
// invalid or file exists

// lib/inspect.ts
import type { BuildSystemPromptOptions } from "@earendil-works/pi-coding-agent";
export function modelLabel(
  model: { provider: string; id: string } | undefined,
): { provider: string; modelId: string }; // undefined -> "unknown"/"unknown"
export function renderImmediateDump(options: BuildSystemPromptOptions): string;
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
export function makeStamp(now: Date): string; // local YYYY-MM-DD-HHmmss, zero-padded
export function freeBase(dir: string, base: string, exts: string[]): string;
// returns base, or `${base}-${N}` for the smallest N >= 2, such that no
// join(dir, candidate + ext) exists for any ext; basename only, caller
// joins dir and appends the extension

// lib/output-test.ts
export const OUTPUT_TEST_PROMPT = "Summarize this article for me.";
export function buildTestMessage(fixtureText: string): string;
// OUTPUT_TEST_PROMPT + "\n\n---\n\n" + fixtureText
export function resultBase(
  stamp: string,
  provider: string,
  modelId: string,
): string; // `${stamp}-${sanitize(provider)}-${sanitize(modelId)}`, no extension
export function formatResult(
  header: ResultHeader,
  responseText: string,
): string;
export function assistantText(message: unknown): string;
// message.content items with type === "text" -> their .text joined with
// "\n\n"; non-text items ignored; a message with no content array or
// no text items yields "" (the result file is still written)

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
  templateSha256: string | null; // hex sha256 of template content, null for "(stock)" (O1)
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
`readActiveTemplate` → null: notify "no active template to copy", return
→ `scaffoldTemplate(dir, name, content)` → notify path or error message.

Inspect: command handler → `stamp = makeStamp(new Date())` →
`ctx.getSystemPromptOptions()` → `renderImmediateDump` →
`freeBase(inspectDir, stamp + "-immediate", [".md"])` (inspectDir =
`<artifactsDir>/inspect/`) → write immediate
file → `armCapture(stamp)` → notify. Then `before_provider_request`
handler → `takeArmedCapture()` → null: return →
`renderProviderDump(header, event.payload)` →
`freeBase(inspectDir, stamp + "-provider", [".md", ".txt"])` → write
`.md` (+ `.txt` when extraction succeeded) → notify with sha256 prefix. The
handler never returns a payload replacement.

Test: command handler → read fixture (missing: notify, stop) →
`stamp = makeStamp(new Date())` → record pending {stamp, provider,
modelId} →
`pi.sendUserMessage(buildTestMessage(...))` → (that turn's
`before_agent_start` sets `lastRender` as on every turn) → `turn_end`
handler → pending set: header from pending + `lastRender` (null →
`"(stock)"`, no sha line) → `formatResult(header, assistantText(event.message))`
→ `freeBase(outputTestsDir, resultBase(stamp, provider, modelId), [".md"])`
(outputTestsDir = `<artifactsDir>/output-tests/`)
→ write result file → clear pending → notify path.

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
(scaffold tests drive `scaffoldTemplate(dir, name, content)` directly)

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
default export against a stub ExtensionAPI, always constructed through
the `paths` seam with temp directories; 4 in P1.3 (16, 17, 32, 40), 2 in
P1.4 (33, 43), 2 in P2.1 (18, 38), 2 in P2.2 (19, 34), 4 in P3.1 (20, 36,
37, 42).
Every header written through the wiring uses `modelLabel`, so the
`unknown` fallback reaches files without a separate wiring test:

16. `wiring: switch action writes the pointer through the registered command`
17. `wiring: cancelled picker writes nothing`
18. `wiring: inspect action writes the immediate dump file and arms capture`
19. `wiring: armed capture writes provider md and raw txt with payload bytes`
20. `wiring: turn_end with pending capture writes the result file`
32. `wiring: switch with empty templates dir notifies and writes nothing`
33. `wiring: new with no active template notifies and creates nothing`
34. `wiring: artifact write failure notifies error and clears capture state`
36. `wiring: result header records the rendered template name and sha256`
    (drives a successful stub splice turn, then turn_end, and asserts the
    header carries the rendered template's name and content sha256)
37. `wiring: result write failure notifies error and clears pending state`
    (unwritable artifacts dir; the turn_end handler notifies at level
    "error", clears the pending capture, and does not throw)
38. `wiring: immediate dump write failure notifies error and does not arm`
    (unwritable artifacts dir; the inspect action notifies at level
    "error", arms nothing, and does not throw)
40. `wiring: unknown argument notifies usage and does nothing`
    (`/sysprompt bogus` notifies the usage line, opens no picker, writes
    nothing, arms nothing)
42. `wiring: test with missing fixture notifies error and sends nothing`
    (fixturePath pointing at a non-existent file; the test action
    notifies at level "error", calls `pi.sendUserMessage` zero times, and
    records no pending capture)
43. `wiring: cancelled name input creates nothing` (`ctx.ui.input`
    resolves undefined; the `new` action returns with no file created and
    no notify)

`tests/inspect.test.ts` — 5 in P2.1 (21, 27, 39, 44, 45), 7 in P2.2
(22–26, 31, 41):

21. `immediate dump: golden byte-compare` (input
    `fixtures/golden/immediate-dump.input.json`, expected
    `fixtures/golden/immediate-dump.md`, covering all sections)
39. `model label: undefined model yields unknown provider and model id`
    (and a defined model passes provider and id through unchanged)
44. `stamp: makeStamp zero-pads local time and freeBase suffixes on any
    collision` (a fixed Date renders `YYYY-MM-DD-HHmmss`; in a temp dir
    holding `x.txt` but not `x.md`, `freeBase(dir, "x", [".md", ".txt"])`
    returns `x-2`, and with `x-2.md` also present returns `x-3`)
45. `immediate dump: empty options golden byte-compare` (input
    `fixtures/golden/immediate-dump-empty.input.json` carrying only `cwd`,
    expected `fixtures/golden/immediate-dump-empty.md`; every section
    renders `absent` or `(none)`)
22. `extract: anthropic string system`
23. `extract: anthropic block-array system`
24. `extract: openai system message`
25. `extract: openai developer message`
26. `extract: unrecognized payload returns null and md falls back to JSON`
27. `arm: capture is one-shot`
41. `extract: stringify-throwing payload renders the note plus String(payload)`
    (a payload with a circular reference; `renderProviderDump` returns
    `txt: null` and an `md` whose body is the note line, a blank line, and
    `String(payload)` with no fence)
31. `provider dump: golden byte-compare` (input
    `fixtures/golden/provider-dump.input.json`, expected
    `fixtures/golden/provider-dump.md`, covering the header and fenced
    prompt serialization)

`tests/output-test.test.ts` — 4 in P3.1 (28–30, 35):

28. `prompt: fixture embedded verbatim after pinned instructions`
29. `result: resultBase carries stamp, sanitized provider and model id`
    (no extension; `anthropic/claude` style ids sanitize to `-`)
30. `result: golden byte-compare` (input
    `fixtures/golden/output-test-result.input.json`, expected
    `fixtures/golden/output-test-result.md`, covering header with template
    name and sha256)
35. `result: assistant text blocks joined, non-text blocks ignored`
    (`assistantText` on a synthetic message with text, tool-call, and text
    blocks yields the two texts joined with `"\n\n"`; a message with no
    text blocks yields `""`)

Count reconciliation: 4 existing + 41 new = 45 at completion. Per packet:
P1.1 adds 5–6 (→ 6), P1.2 adds 7–12 (→ 12), P1.3 adds 16, 17, 32, 40
(→ 16), P1.4 adds 13–15, 33, 43 (→ 21), P2.1 adds 18, 21, 27, 38, 39,
44, 45 (→ 28), P2.2 adds 19, 22–26, 31, 34, 41 (→ 37), P3.1 adds 20,
28–30, 35–37, 42 (→ 45). These are the
totals the Verification contract pins.

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
failed anchor extraction; absent placeholders no-op per O2).
index.ts keeps registration and the stand-down checks, reads
the template from its current SYSTEM.template.md path, and
calls the lib functions. No behavior change to the splice.
Acceptance: verify.sh green; test files report 6 pass, 0 fail: existing
tests 1–4 repointed, new tests 5–6 exercising renderTemplate
directly. Falsification witness: removing the `{{PI_DOCS}}`
replaceAll turns test 5 red.

### P1.2 — Template store, pointer resolution, migration

Files: lib/templates.ts, index.ts, SYSTEM.template.md (removed by git mv),
templates/default.md (the moved destination), .gitignore,
tests/templates.test.ts, tests/rewrite.test.ts
Changes: `git mv SYSTEM.template.md templates/default.md`. Add
lib/templates.ts per the pinned signatures: pointer file is
`<dir>/.active`, validity rule as pinned in Interfaces,
fallback chain pointer → default.md → null. index.ts resolves
the real templates dir per the pinned Layout spelling
(`fileURLToPath`, no other fallback; the old TEMPLATE_FALLBACK
constant is deleted) and the
splice path uses `readActiveTemplate`; null means the stock
prompt stands. `.gitignore` gains `templates/.active`.
Acceptance: verify.sh green; 12 pass, 0 fail (adds tests 7–12); test 10
asserts `readActiveTemplate` returns null against an empty temp dir, and
in the same test drives the captured before_agent_start handler (built
through the `paths` seam on that dir) to assert it returns undefined
(stock stands). Falsification witness: making
readActiveTemplate throw on a missing pointer file turns test
7 red.

### P1.3 — /sysprompt command and switch action

Files: index.ts, tests/wiring.test.ts
Changes: Register command `sysprompt` (description: "Manage system
prompt templates"). No args: `ctx.ui.select` over `switch`,
`new`, `inspect`, `test`; `new`, `inspect`, and `test` notify "not
built yet" until P1.4/P2.1/P3.1 replace them (carried as K5). Arg
matching an action jumps straight to it; unknown arg notifies
usage. `switch` per the pinned Interfaces flow. Esc at any
picker cancels with no write.
Acceptance: verify.sh green; 16 pass, 0 fail (adds wiring tests 16, 17,
32, and 40 driving the registered command through a stub ExtensionAPI
with stubbed ctx.ui). Falsification witness: writing the
pointer before the select resolves turns test 17 red.

### P1.4 — Scaffold action

Files: index.ts, lib/templates.ts, tests/templates.test.ts,
tests/wiring.test.ts
Changes: `scaffoldTemplate` per the pinned signature and validation.
Wire the `new` action per the pinned call stack: `ctx.ui.input`, then
readActiveTemplate (null: notify "no active template to copy"), then
scaffold, notify created path or the error message.
Acceptance: verify.sh green; 21 pass, 0 fail (adds tests 13–15, 33, and
43).
Falsification witness: removing the existing-file check turns
test 15 red.

### Phase 1 gate

Runnable: `./scripts/verify.sh` green, 21 unit tests pass, 0 fail.
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
tests/wiring.test.ts, fixtures/golden/immediate-dump.input.json,
fixtures/golden/immediate-dump.md,
fixtures/golden/immediate-dump-empty.input.json,
fixtures/golden/immediate-dump-empty.md
Changes: `modelLabel`, `makeStamp`, `freeBase`, `renderImmediateDump`
per the pinned immediate-dump format, and the
`armCapture`/`takeArmedCapture` one-shot in-memory state. The `inspect` action (replacing the K5 placeholder)
writes `../artifacts/inspect/<stamp>-immediate.md`, arms capture with
that stamp, and notifies the path plus "send any message to capture the
ground-truth dump" (checkpoint D4); nothing consumes the armed state
until P2.2. Golden pairs created per the Layout blessing rule: a
`BuildSystemPromptOptions` value exercising every section, and one
carrying only `cwd`, each committed as input JSON plus rendered bytes.
Acceptance: verify.sh green; 28 pass, 0 fail (adds tests 18, 21, 27, 38,
39, 44, and 45).
Falsification witness: dropping the skills section from the
renderer turns the golden compare (21) red.

### P2.2 — Armed ground-truth capture

Files: index.ts, lib/inspect.ts, tests/inspect.test.ts,
tests/wiring.test.ts, fixtures/golden/provider-dump.input.json,
fixtures/golden/provider-dump.md
Changes: `extractSystemPromptFromPayload` and `renderProviderDump` per
the pinned formats; `before_provider_request` handler per the pinned
call stack: `takeArmedCapture` (state landed in P2.1), extraction rules,
`.md` + `.txt` pair, JSON and String fallbacks, sha256-prefixed notify,
no payload replacement.
Acceptance: verify.sh green; 37 pass, 0 fail (adds tests 19, 22–26, 31,
34, and 41); test 19 asserts the `.txt` bytes equal the synthetic
payload's system string exactly, test 31 byte-compares the `.md`
serialization against its golden, test 34 stubs a throwing write and
asserts the error notify plus cleared capture state, and test 41 covers
the stringify-throws fallback. Falsification witness: writing the `.txt`
twin when extraction returned null turns test 26 red, and dropping the
`.txt` write turns test 19 red.

### Phase 2 gate

Runnable: verify.sh green, 37 unit tests pass, 0 fail.
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
tests/wiring.test.ts, fixtures/golden/output-test-result.input.json,
fixtures/golden/output-test-result.md, fixtures/output-test-document.md
(read-only dependency)
Changes: lib/output-test.ts per the pinned signatures and formats
(OUTPUT_TEST_PROMPT frozen per D3; templateSha256 per O1). The
`test` action (replacing the K5 placeholder) per the pinned
call stack; attribution via `lastRender` per Interfaces; modelId and
provider sanitized per Interfaces.
Acceptance: verify.sh green; 45 pass, 0 fail (adds tests 20, 28–30,
35–37, and 42); test 20 drives a stub turn where before_agent_start
failed open and asserts the header records `(stock)` with no sha line;
test 36 is the positive twin asserting the rendered template's name and
sha256; test 37 proves result-write failure notifies, clears pending
state, and does not throw; test 42 proves the missing-fixture branch
sends nothing. Falsification witness: changing OUTPUT_TEST_PROMPT wording turns
test 28 red.

### Phase 3 gate

Runnable: verify.sh green, 45 unit tests pass, 0 fail.
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
  and works live, so the risk is confined to the added `./templates/` and
  `../artifacts/` traversals (spellings pinned in Layout). Earliest
  resolution: Phase 1 gate eye
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
- K5: P1.3 ships `new`, `inspect`, and `test` menu entries as "not built yet"
  notifies. Owned by P1.4, P2.1, and P3.1, which replace them; the Phase 1
  review checks they are inert.

## Ratification items

- O1 (blocks: P3.1): record the sha256 of the active template's content in
  the output-test result header, so a result attributes to the exact
  template version rather than a name that may have been edited since.
  Keeping: one hash line per result, `node:crypto`, no new dependency.
  Rejecting: results attribute by name only, and template edits silently
  break cross-run comparability. Recommendation: adopt.
- O2 (blocks: P1.1): placeholders are optional in a template. An absent
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

- Entry point: P1.1 (after O2 is ruled; O1 before P3.1). Base commit:
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
  turn when idle; `ctx.model` is `Model | undefined` and carries
  `.provider` and `.id` when defined (`modelLabel` covers undefined);
  `getSystemPromptOptions()` returns `BuildSystemPromptOptions`, the
  package's exported name.
- Toolchain: node 22.x (v22.23.1 verified), `--experimental-strip-types`,
  typescript 7.0.2, prettier 3.9.6; verify.sh runs `npm ci` first and
  asserts the node major.
- Freezability: DESIGN.md, this plan, `templates/default.md`, the fixture,
  the golden pairs under `fixtures/golden/`, and the unit suites'
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
- Round 2: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-2.md`. Fixed: splice-outcome
  attribution pinned (`lastRender` module state set by every
  before_agent_start; result header reads it at turn_end, tested by test
  20's stock case); DESIGN.md scaffold wording amended to match owner
  ruling D2; P1.3's interim `new` pinned as not-built-yet and K5 widened;
  provider-dump golden given its own test 31 (totals rederived, 31 final);
  migration source added to P1.2 Files and Layout; empty-store,
  artifact-write-failure, and assistant-text-extraction behaviors pinned
  in Interfaces; plans/ and fixtures/ exempted from prettier so packet
  fields and fixture bytes stay stable.
- Round 3: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-3.md`. Fixed: inspect suite
  heading corrected to 7 P2.2 tests (22–27, 31); the pinned edge behaviors
  gained named gates (tests 32–35) and successful attribution gained its
  positive test (36), totals rederived to 36; templates/artifacts URL
  spellings pinned (`./templates/`, `../artifacts/` from index.ts) and K1
  aligned; scaffold signature takes content with the command owning the
  readActiveTemplate check.
- Round 4: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-4.md`. Fixed: P1.4 acceptance
  synced to 19 with test 33; the wiring test seam pinned as the default
  export's optional `paths` parameter (ExtensionPaths in Types, temp dirs
  in tests, URL defaults for Pi); test 10's unit/handler split stated
  explicitly; result-write failure gained test 37 (37 final).
- Round 5: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-5.md`. Fixed: path
  representation pinned to decoded strings via `fileURLToPath` in Layout
  and Types, catch-fallback removed from P1.2 (delete TEMPLATE_FALLBACK);
  immediate-dump write failure gained test 38 in P2.1 (38 final).
- Round 6: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-6.md`. Fixed: goldens became
  input/expected pairs with a blessing rule (no synthetic input lives only
  in a test); `SystemPromptOptions` corrected to the package's
  `BuildSystemPromptOptions`; undefined `ctx.model` pinned to `unknown`
  via `modelLabel` with test 39 in P2.1 (39 final); ratification items
  renamed O1/O2 to stop colliding with the Basis R1/R2 rows.
- Round 7: FAIL with one Medium —
  `plans/2026-08-17-template-manager.lint-7.md`. Fixed: the count
  reconciliation line still said 34 new = 38; corrected to 35 new = 39.
  Everything else verified clean.
- Round 8: FAIL with one Medium —
  `plans/2026-08-17-template-manager.lint-8.md`. Fixed: assistant-text
  extraction had a rule and a test (35) but no pinned function; added
  `assistantText(message)` to `lib/output-test.ts` in Types, the Test
  call stack, and test 35's description.
- Round 9: FAIL with materials —
  `plans/2026-08-17-template-manager.lint-9.md`. Fixed: arm state
  (`armCapture`/`takeArmedCapture`, test 27) moved from P2.2 into P2.1 so
  tests 18 and 38 are satisfiable in the packet that owns them, P2.2
  given new falsification witnesses; the three artifact formats pinned
  as exact byte layouts with shared serialization and fence rules; three
  untested Interface branches gained tests 40 (unknown argument, P1.3),
  41 (stringify-throws fallback, P2.2), and 42 (missing fixture, P3.1);
  totals rederived to 16/20/25/34/42 (42 final).
- Round 10: FAIL with two Mediums —
  `plans/2026-08-17-template-manager.lint-10.md`. Fixed: verbatim
  content vs trailing-newline rule made deterministic (never trim, one
  `\n` after every block); `present`/`absent`, no-snippet tool, and
  input-array ordering pinned; `makeStamp`/`freeBase` pinned with the
  pair-shares-one-suffix rule; tests 43 (cancelled name input, P1.4), 44
  (stamp and collision suffix, P2.1), 45 (empty-options golden, P2.1)
  added; totals rederived to 21/28/37/45 (45 final).
- Round 11: FAIL with one Medium —
  `plans/2026-08-17-template-manager.lint-11.md`. Fixed: `freeBase`
  pinned to return a basename (Types and test 44 now agree),
  `resultFileName` renamed `resultBase` (no extension), and the Inspect
  and Test call stacks now name `makeStamp` and every `freeBase` call
  site, with armed/pending state holding the raw stamp and each artifact
  family resolving its own collision at write time.
