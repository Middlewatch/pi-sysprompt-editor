# pi-sysprompt-editor design basis

**Status:** draft, seeded 2026-08-17 at scaffold. A design-basis session will
develop this document; ratification items live in the session's working doc
until then.

## Thesis

The owner can author Pi's core system prompt as a plain markdown template,
and the extension keeps that prompt correct across harness updates by
splicing in the live tool list, guidelines, and documentation section at
session start. Acceptance test: with the extension loaded, a session's
system prompt core matches the template render exactly, and with the
template removed or the harness shape changed, the session runs on the
stock prompt unmodified.

## Model and primitives

- **Stock core**: the harness-assembled prompt from the identity line
  through the documentation section, before appended layers.
- **Template**: `SYSTEM.template.md`, owner prose with three placeholders:
  `{{AVAILABLE_TOOLS}}`, `{{GUIDELINES}}`, `{{PI_DOCS}}`.
- **Tail**: everything the harness appends after the core (project context,
  skills, working directory, scratchpad), passed through untouched.
- **Splice**: anchor-based extraction of live data from the stock core,
  rendered into the template at session start.

## Doctrine

- Fail open (2026-08-17): every unrecognized condition leaves the prompt
  exactly as the harness built it. A prompt rewrite that guesses is worse
  than no rewrite.
- The template owns the prose; the harness owns the live data
  (2026-08-17). The extension never hardcodes tool names or guideline
  text.
- A custom `SYSTEM.md` prompt outranks the template (2026-08-17): explicit
  per-project owner intent wins over the global template.

## Expected behaviors

Day one: the extension rewrites the stock core from the template on
`before_agent_start`, preserves the tail byte-for-byte, and stands down for
custom prompts, drifted shapes, and a missing template. Unit tests cover the
rewrite and each fail-open branch.

## Deliberately not in scope

To be settled in the design-basis session. Candidates: editing the appended
layers (project context, skills), a TUI editing surface, multi-template or
per-project template selection.

## Verification spine

`scripts/verify.sh` is the gate: reproducible install, format check,
typecheck, and unit tests against a synthetic stock prompt. Open question
for the design-basis session: a model-free conformance harness that drives
the real Pi loader, so shape drift in a harness update is caught by the gate
rather than discovered in session.

## Structure

Single-module extension: `index.ts` (splice logic and event registration),
`SYSTEM.template.md` (owner prose), `tests/` (unit suite). The design-basis
session decides what a fully featured build adds.

## Provenance

Seeded from the working extension built 2026-08-17 in the extensions
monorepo, moved here for standalone development.
