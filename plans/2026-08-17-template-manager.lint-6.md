# Plan lint, round 6 (2026-08-17)

Independent fresh-context lint (review profile) of the round-5-revised
plan. Verdict: **FAIL with materials** (two reported High, two Medium).
All closed same day. Round-5 closures verified landed. The reviewer's
delegation ended on a citation-provenance failure (it cited the two
workflow charters outside its scope), so its findings were re-verified by
hand against the machine before closure.

## Findings (as reported) and closures

- High (reported) — R1/R2 open owner items "contradict Fixed decisions",
  and their labels collide with the `Basis R1`/`Basis R2` rows. Downgraded
  on the first half: open ratification items are the workflow's normal
  state for a draft plan; ratification folds them into Fixed decisions.
  The label collision was real. Closed: ratification items renamed O1/O2
  throughout (Fixed decisions note, Interfaces, Types, P1.2, P3.1,
  Ratification items, Handoff notes).
- High — goldens were created by the packets they judge from synthetic
  inputs "pinned in the test", so the input half of each oracle would die
  with the tree. Closed: Layout pins each golden as a pair,
  `fixtures/golden/<name>.input.json` (exact renderer arguments) plus
  `<name>.md` (expected bytes), the golden test reads the input and
  byte-compares, and a blessing rule requires the phase reviewer to check
  the generated `.md` line by line against the pinned format before
  commit. P2.1, P2.2, P3.1 Files lists and tests 21, 30, 31 updated. Exact
  expected bytes are not pre-specified in the plan: the format description
  is the spec and the committed pair is the witness.
- Medium — `renderImmediateDump(options: SystemPromptOptions)` named a
  type that does not exist; the package (0.84.1) exports
  `BuildSystemPromptOptions` and `getSystemPromptOptions()` returns it
  (`node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:256`,
  re-exported from `dist/index.d.ts`). Closed: signature and import pinned
  to `BuildSystemPromptOptions`; Handoff notes corrected.
- Medium — the plan treated `ctx.model` as always present, but the API
  types it `Model<any> | undefined`
  (`dist/core/extensions/types.d.ts:220`). Closed: `modelLabel(model)` in
  `lib/inspect.ts` maps undefined to `unknown`/`unknown` for headers and
  filenames; pinned in Interfaces and Types; test 39 added to P2.1
  (inspect suite); totals rederived to 23/32/39 and the Verification
  contract's 39.

## Fresh-executor questions raised

Answered by the closures above (approval of O1/O2 is the owner's
ratification step; golden inputs are now committed fixtures; the type is
`BuildSystemPromptOptions`; undefined model is `unknown`).

## Verified by the reviewer this round

Round-5 closures landed (fileURLToPath defaults, TEMPLATE_FALLBACK
deletion, test 38, totals 22/31/38 before this round's rederivation).
Tests numbered without gaps or duplicates and packet arithmetic
reconciled. Every packet has a runnable acceptance gate and a
falsification witness. Base files and dependency pins match `index.ts`,
`package.json`, `scripts/verify.sh`. DESIGN.md supports the thesis, menu,
active-copy scaffold, inspection distinction, pipeline test, fail-open
doctrine, and decomposition. Base commit `51a27ef` confirmed by the root
via `git log`.
