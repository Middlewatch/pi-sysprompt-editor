# Plan lint, round 12 (2026-08-17)

Independent fresh-context adversarial lint (review profile) of the
round-11-revised plan. Verdict: **FAIL with materials** (one Medium, no
Highs). Closed same day. Round-11 closures verified landed; tests 1–45
unique and gapless; totals 6/12/16/21/28/37/45 consistent everywhere;
every packet has a runnable gate and a witness.

## Findings and closures

- Medium — the plan's provider `.txt` twin (raw extracted prompt bytes for
  `sha256sum` byte-identity checks) had no Fixed-decisions row, and
  DESIGN.md's Expected behaviors says the two inspect artifacts are "both
  written as markdown files" without mentioning a twin, so an executor
  reading the stop rule on plan/basis conflict would halt at P2.2. Closed:
  ratification item O3 opened (blocks P2.2) proposing the twin and a
  one-clause DESIGN.md amendment; the Fixed-decisions note and Handoff
  entry point now list O3 with O1 and O2. The owner rules at ratification.

## Verified by the reviewer this round

`freeBase` basename semantics, raw-stamp state, per-family collision
handling, `resultBase`, Types, call stacks, tests 29/44, and packet text
aligned; `resultFileName` survives only in lint history; harness
declarations support the cited hooks and payload/message fields.
