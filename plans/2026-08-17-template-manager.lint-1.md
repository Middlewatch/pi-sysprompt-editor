# Plan lint, round 1 (2026-08-17)

Independent fresh-context lint of `2026-08-17-template-manager.plan.md`
against `~/projects/agent-guidance/workflows/plan-lint-rules.md` and the
repo at base `51a27ef`. Verdict: **FAIL with materials.**

## Findings (as reported)

- High — Verification contract / P1.1: plan claimed 6 existing tests;
  the repo has 4 (`tests/rewrite.test.ts`). Counts rederived.
- High — P1.1: falsification witness was dead (the drifted-shape test
  exits before rendering, so mutating `{{PI_DOCS}}` handling could not
  turn it red). Replaced with a direct renderTemplate test.
- High — P1.3/P2.1/P2.2/P3.1: command and hook glue was untested; green
  verify.sh could not detect missing wiring. Added `tests/wiring.test.ts`
  driving the registered command and handlers through the real index.ts
  default export.
- High — R1 unresolved while ResultHeader omitted the sha field. R1 kept
  open with `blocks: P3.1`, field added to the pinned interface and tests.
- Medium — inspect test count ambiguity (6 vs 7). Canonical 30-test list
  added; all totals derive from it.
- Medium — thesis byte-identity not actually checked by the Phase 2 gate.
  Pinned: raw `.txt` artifact plus sha256-prefixed notify; gate procedure
  is `sha256sum` against the notified hash.
- Medium — P3.1 omitted the fixture from Files. Added (read-only).
- Medium — base commit not a full SHA. Pinned
  `51a27ef47f90cb5399644e9f8d6c22b11b25197a`.
- Medium — freezability gap: artifact serializations and wiring not
  frozen. Added `fixtures/golden/` (three goldens) and the wiring suite to
  the rebuild set.
- Low — P1.3 placeholder actions had no risk row. Added K5.
- Low — node version unpinned. Pinned 22.x / v22.23.1 in Fixed decisions
  and Handoff notes.

Fresh-executor questions were answered by pinning in Interfaces: system
and developer roles are separate tests; provider/model metadata comes from
`ctx.model`; stamps are local `YYYY-MM-DD-HHmmss` with `-N` collision
suffixes; sanitization is `[A-Za-z0-9._-]` else `-`; pointer validity is
`^[a-z0-9-]+\.md$` trimmed single line; malformed templates are governed
by new ratification item R2 (optional placeholders); JSON fallback is
`JSON.stringify(payload, null, 2)` with `String(payload)` on throw; P1.1
adds two tests (totals rederived).
