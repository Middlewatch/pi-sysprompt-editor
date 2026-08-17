# Template manager scope (working doc, 2026-08-17)

Working sibling of `DESIGN.md` for the 2026-08-17 design-basis session that
expands the extension from a single-template splice into a template manager
with inspection and output-test surfaces.

**Ratified 2026-08-17**: the owner adopted R1 through R4 as recommended.
This document is frozen as the dated record.

## Settled rulings (owner, 2026-08-17)

Ruled in-session through structured questions:

1. **Active-template tracking**: templates live in a `templates/` directory
   and a small state file names the active one. The splice reads the pointer
   each turn, so a switch applies on the next message. A symlink swap was
   rejected as harder to test and fragile across renames.
2. **Authoring surface**: template authoring is agent-mediated or direct
   file editing. A scaffold action creates a new template pre-filled with
   the three placeholders so a fresh template is never malformed. An in-TUI
   text input and an `$EDITOR` shell-out were rejected as cramped or
   session-breaking.
3. **Inspection**: both modes. An immediate best-effort dump renders the
   base prompt layers from Pi's structured prompt inputs at command time,
   and an armed one-shot capture dumps the exact system prompt from the next
   provider request, which includes every extension's chained injections.
   The armed capture is the authoritative artifact.
4. **Output test**: in-session single model. The command sends a prebuilt
   analysis prompt plus a fixture document through the normal session
   pipeline and saves the response to a dated results file. The owner
   switches models and reruns to compare. An automated multi-model matrix is
   deferred, not rejected.

## Delta against the prior basis

- The "Deliberately not in scope" placeholder ("to be settled") is replaced
  with a ruled list. Multi-template selection, previously a candidate for
  exclusion, moves into scope as the core of the expansion.
- The thesis broadens from splice correctness alone to the three-part claim
  in R1.
- Hot-reload machinery, floated in the owner's original vision, is rejected
  as unnecessary: the splice already runs per turn on `before_agent_start`,
  so switching templates is a data change, not a lifecycle event.
- No prior ruling is reversed. The three doctrine entries from the scaffold
  basis (fail open, template owns prose / harness owns data, `SYSTEM.md`
  outranks the template) carry forward unchanged.

## Ratification items

R1. **Broadened thesis.** Adopt the three-part falsifiable thesis (switch
renders next turn, inspect dump matches the provider payload, every
fail-open branch unit-proven) or keep the narrower splice-only thesis
and treat the manager as unstated behavior. Recommendation: adopt.
Rationale: the manager is now the product claim; a thesis that omits it
cannot fail when the manager breaks.

R2. **Command surface.** One `/sysprompt` command opening an action menu
(switch, new, inspect, test) versus separate flat commands per action.
Recommendation: single command with menu. Rationale: matches the
owner's "submenu" framing, keeps the command namespace clean, and the
menu is one `ctx.ui.select()` call.

R3. **Storage locations.** Templates in `templates/` inside the repo
(versioned), the active-pointer state file beside them but gitignored
(owner-local state, not project history), inspection dumps and test
results in the container's `artifacts/` directory outside the repo.
Recommendation: adopt. Rationale: prose is worth versioning, pointer
state and generated outputs are not.

R4. **Out-of-scope list.** Ratify the exclusions as written in the revised
basis: appended-layer editing, in-TUI prose editor, hot-reload
machinery, automated multi-model matrix (deferred), per-project
template selection (SYSTEM.md already provides per-project override and
outranks the template by doctrine). Recommendation: adopt as written.

## Open items

- The output-test fixture document is owner-supplied and pending. The test
  command lands with a placeholder fixture path and fails soft (clear
  notify, no turn sent) until the fixture exists.

## Session provenance

- Owner vision message of 2026-08-17 (four numbered goals) and the four
  structured-question rulings recorded above.
- Feasibility grounded against the installed Pi extension docs
  (`docs/extensions.md`): `before_agent_start` fires per prompt and chains
  across extensions; `before_provider_request` exposes the final payload;
  `pi.registerCommand`, `ctx.ui.select`, and `pi.sendUserMessage` cover the
  command, menu, and test surfaces.
- Prior basis: `DESIGN.md` as seeded at scaffold, commit `f7e5d4c` lineage
  from the extensions monorepo build of 2026-08-17.
