# Plan lint, round 11 (2026-08-17)

Independent fresh-context adversarial lint (review profile) of the
round-10-revised plan. Verdict: **FAIL with materials** (one Medium, no
Highs). Closed same day. Round-10 closures verified landed; tests 1–45
unique and gapless; totals 6/12/16/21/28/37/45 consistent everywhere.

## Findings and closures

- Medium — `freeBase` was pinned to return a joined path in Types while
  test 44 expected a basename, and neither the Inspect nor the Test call
  stack said where `makeStamp` and `freeBase` are called or whether
  armed/pending state holds the raw stamp or a resolved base. Closed:
  `freeBase` returns the basename only (caller joins and appends the
  extension); `resultFileName` renamed `resultBase` returning
  `<stamp>-<provider>-<modelId>` without extension (test 29 reworded);
  Interfaces pins that each artifact family resolves its own collision at
  write time from one raw stamp and that armed/pending state stores the
  raw stamp; both call stacks now name `makeStamp` and every `freeBase`
  call site with the directories spelled out.

## Verified by the reviewer this round

Round-10 serialization rules, `immediate-dump-empty` golden and test 45,
test 43, test 44's pinned helpers; every packet has a runnable gate and a
witness; harness declarations support every Handoff claim.
