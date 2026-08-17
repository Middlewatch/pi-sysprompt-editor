# Plan lint, round 10 (2026-08-17)

Independent fresh-context adversarial lint (review profile) of the
round-9-revised plan. Verdict: **FAIL with materials** (two Mediums, no
Highs). All closed same day. Round-9 closures verified landed; tests 1–42
were unique and gapless before this round's additions.

## Findings and closures

- Medium — the shared "file ends with exactly one `\n`" rule conflicted
  with "verbatim" content that may itself end in newlines, and the fresh
  executor questions exposed further two-reading ambiguities:
  `customPrompt: ""`, a tool without a snippet, list ordering, and how a
  provider `.md`/`.txt` pair is suffixed when only one member collides.
  Closed: the shared rule now says every rendered line and verbatim block
  is followed by exactly one `\n` and verbatim content is never trimmed;
  `present` means a non-empty `customPrompt`; a tool renders
  `- <tool>: <snippet>` only for a non-empty snippet; lists follow input
  array order; `<provider>`/`<modelId>` are the `modelLabel` values before
  sanitization; `makeStamp(now)` and `freeBase(dir, base, exts)` are
  pinned in Types with the pair passing both extensions so one suffix
  covers both files.
- Medium — pinned branches without a numbered test: cancellation of the
  `new` name input, collision suffixing, and the immediate dump's
  empty/absent renderings. Closed: test 43 (P1.4, wiring), test 44 (P2.1,
  inspect: fixed-Date stamp and pair collision to `-2`/`-3`), test 45
  (P2.1, second golden pair `immediate-dump-empty` with only `cwd`);
  totals rederived to 6/12/16/21/28/37/45 and the Verification contract's
  45.

## Verified by the reviewer this round

Round-9 closures (arm state and test 27 in P2.1; P2.2 owns extraction and
rendering; tests 40–42) landed and consistent; the immediate-dump sections
map onto every `BuildSystemPromptOptions` field except the intentionally
omitted `cwd`.
