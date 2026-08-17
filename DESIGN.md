# pi-sysprompt-editor design basis

**Status:** ratified 2026-08-17.

Reading list: `README.md` for the short product description,
`docs/2026-08-17-template-manager-scope.md` for the decision record behind
this revision.

## Thesis

The owner manages Pi's core system prompt as plain markdown templates:
selecting a template changes the next turn's prompt without any restart, an
inspect command produces the exact system prompt sent to the provider
including every extension's injections, and every unrecognized condition
leaves the prompt exactly as the harness built it.

Acceptance test, three parts a build passes or fails: after a template
switch, the next turn's prompt core matches the new template's render
exactly; an armed inspect dump is byte-identical to the system prompt in
that turn's provider request payload; each fail-open branch has a unit test
that feeds the unrecognized condition and asserts the stock prompt survives
unmodified.

## Model and primitives

- **Stock core**: the harness-assembled prompt from the identity line
  through the documentation section, before appended layers.
- **Template**: a markdown file in `templates/`, owner prose with three
  placeholders: `{{AVAILABLE_TOOLS}}`, `{{GUIDELINES}}`, `{{PI_DOCS}}`.
- **Active pointer**: a small state file naming which template the splice
  reads. Switching templates writes the pointer; the next turn renders it.
- **Tail**: everything the harness appends after the core (project context,
  skills, working directory, scratchpad), passed through untouched.
- **Splice**: anchor-based extraction of live data from the stock core,
  rendered into the active template at each turn start.
- **Inspection capture**: two artifacts. The immediate dump renders the base
  prompt layers from the harness's structured prompt inputs at command
  time. The armed capture records the final system prompt from the next
  provider request, after every extension has chained its changes, and is
  the authoritative one.
- **Output test**: a prebuilt analysis prompt plus a fixture document sent
  through the normal session pipeline, with the response saved to a dated
  results file for cross-model comparison.

## Doctrine

- Fail open (2026-08-17): every unrecognized condition leaves the prompt
  exactly as the harness built it. A prompt rewrite that guesses is worse
  than no rewrite.
- The template owns the prose; the harness owns the live data
  (2026-08-17). The extension never hardcodes tool names or guideline
  text.
- A custom `SYSTEM.md` prompt outranks the template (2026-08-17): explicit
  per-project owner intent wins over the global template.
- Switching is data, not machinery (2026-08-17): template selection changes
  which file the per-turn splice reads. No reload or restart path exists.
- Ground truth over reconstruction (2026-08-17): the authoritative
  inspection artifact comes from the actual provider request. The immediate
  dump is labeled best-effort because it cannot see other extensions'
  per-turn changes.
- The output test rides the real pipeline (2026-08-17): the standardized
  test goes through a normal session turn so results reflect the prompt
  assembly real usage sees.

## Expected behaviors

Today: the extension rewrites the stock core from the single template on
each turn start, preserves the tail byte-for-byte, and stands down for
custom prompts, drifted shapes, and a missing template. Unit tests cover
the rewrite and each fail-open branch.

The template manager expansion adds: a single command opening an action menu with
switch (pick the active template from `templates/`), new (seed a fresh
template as a copy of the active one), inspect (immediate dump
plus armed ground-truth capture, both written as markdown files, with a
raw text twin of the captured prompt for byte comparison), and test
(send the standardized analysis prompt with the fixture document, save the
response to a dated results file). Template authoring itself stays in
ordinary file edits.

## Deliberately not in scope

- **Editing the appended layers** (project context, skills): the harness
  owns them, and rewriting them would break the layering contract other
  tools rely on.
- **An in-TUI prose editor**: authoring is file editing, which every agent
  and editor already does better than a widget.
- **Hot-reload or restart machinery**: unnecessary, because the splice runs
  per turn and a pointer change takes effect on the next message.
- **An automated multi-model test matrix**: deferred. The in-session
  single-model test ships first; the matrix adds direct API calls that
  bypass the real prompt assembly and costs per run.
- **Per-project template selection**: `SYSTEM.md` already provides a
  per-project override and outranks the template by doctrine.

## Verification spine

`scripts/verify.sh` is the gate: reproducible install, format check,
typecheck, and unit tests. The unit suite runs against a synthetic stock
prompt and covers the splice, every fail-open branch, pointer resolution
(missing pointer, pointer naming a missing template), and template
scaffolding. The armed inspection capture doubles as the field oracle: its
dump against the provider payload is the acceptance check for splice
correctness in a live session.

Open question carried forward: a model-free conformance harness that drives
the real Pi prompt loader, so shape drift in a harness update is caught by
the gate rather than discovered in session.

Freezability: the template set, the unit-test fixtures (synthetic stock
prompt and expected renders), and this document would rebuild the behavior
if the tree vanished.

## Structure

Today the extension is a single `index.ts` beside `SYSTEM.template.md` and
`tests/`. The target decomposition for the template manager build:

- `index.ts`: event and command registration, kept thin.
- `lib/splice.ts`: core rewrite and fail-open checks.
- `lib/templates.ts`: template store — list, resolve active pointer,
  scaffold new.
- `lib/inspect.ts`: immediate dump and armed capture.
- `lib/output-test.ts`: standardized test send and results file.
- `templates/`: owner-authored template set.
- `tests/`: unit suite.

Build order: template store and switch menu first, inspection second,
output test third.

## Provenance

- Seeded from the working single-template extension built 2026-08-17 and
  moved here for standalone development.
- Revised 2026-08-17 to expand scope to the template manager. The decision
  record, including the delta against the prior basis, is
  `docs/2026-08-17-template-manager-scope.md`. Feasibility was checked
  against the Pi extension documentation shipped with the harness.
