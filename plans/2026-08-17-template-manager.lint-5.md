# Plan lint, round 5 (2026-08-17)

Independent fresh-context lint of the round-4-revised plan. Verdict:
**FAIL with materials** (no Highs). All closed same day. Round-4 closures
verified landed. This register was written at session resume from the
revisions already applied to the plan, so the finding text below is the
closure record rather than the reviewer's verbatim wording.

## Findings and closures

- Medium — path representation was inconsistent: `ExtensionPaths` typed
  every field as `string`, but the pinned default spellings were bare
  `new URL(...)` values (URL objects), and the P1.2 packet text still
  carried today's "absolute repo path as catch-fallback" language, which
  contradicted the paths seam and K1 (fail open, no improvised fallback).
  Closed: Layout and Types pin
  `fileURLToPath(new URL(<spelling>, import.meta.url))` from `node:url` as
  the default for every field, so `lib/` only ever receives decoded path
  strings; P1.2 now deletes the `TEMPLATE_FALLBACK` constant and states
  there is no other fallback (URL resolution failure means the splice fails
  open and command actions notify the error).
- Medium — the immediate dump's write failure had no falsification witness
  (P2.1 wrote the artifact but nothing pinned the notify-and-do-not-arm
  behavior when the artifacts dir is unwritable). Closed: test 38 added to
  `tests/wiring.test.ts` in P2.1; per-packet counts and the Verification
  contract rederived to 38 at completion (P2.1 → 22, P2.2 → 31,
  P3.1 → 38).

## Verified by the reviewer this round

Round-4 closures (P1.4 acceptance at 19, `paths` seam in Layout and Types,
test 10 unit/handler split, test 37 in P3.1) present and consistent.
