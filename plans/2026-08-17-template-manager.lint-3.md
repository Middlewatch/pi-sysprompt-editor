# Plan lint, round 3 (2026-08-17)

Independent fresh-context lint of the round-2-revised plan. Verdict:
**FAIL with materials** (four Mediums, no Highs). All closed same day.

## Findings (as reported) and closures

- Medium — inspect suite heading said 6 P2.2 tests while the canonical
  list assigned 7. Closed: heading reads 22–27 and 31.
- Medium — the round-2 pinned edge behaviors (empty store, artifact-write
  failure, assistant-text extraction) had no named gates. Closed: tests
  32–35 added and assigned to P1.3, P1.4, P2.2, and P3.1; totals
  rederived to 36.
- Medium — `lastRender` attribution was only gated on the fail-open
  `(stock)` case; a build recording wrong successful attribution could
  pass. Closed: test 36 drives a successful stub splice turn and asserts
  the rendered name and content sha256.
- Medium — K1 described the new path traversals as `../templates` and
  `../../artifacts`, one level too high relative to index.ts at repo
  root. Closed: URL spellings pinned in Layout
  (`new URL("./templates/", import.meta.url)`,
  `new URL("../artifacts/", import.meta.url)`) and K1 aligned.

Fresh-executor questions answered in the revision: the command owns the
readActiveTemplate check and `scaffoldTemplate` takes the content
argument; R1/R2 remain open by design and go to the owner at
ratification.

## Round-2 closure verification

The reviewer confirmed all six round-2 closures landed (attribution
pinning, DESIGN.md sync, test 31, P1.3/K5 coverage, edge-behavior pins,
.prettierignore).
