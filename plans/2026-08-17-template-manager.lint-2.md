# Plan lint, round 2 (2026-08-17)

Independent fresh-context lint of the round-1-revised plan. Verdict:
**FAIL with materials.** All findings closed in the same-day revision.

## Findings (as reported) and closures

- High — P3.1 attribution could not satisfy its own contract: the header
  recorded the template active at command time, with no signal of what the
  splice actually did on the test turn. Closed: `lastRender` module state
  (name + content sha256, or null on any fail-open) written by every
  `before_agent_start` and read at `turn_end`; test 20 asserts the
  `(stock)` case.
- High — DESIGN.md still said `new` scaffolds a placeholder-pre-filled
  template, conflicting with owner ruling D2 (byte copy of active).
  Closed: DESIGN.md Expected behaviors amended to match D2; the ruling and
  its rejected alternative are recorded in the plan's Fixed decisions.
- Medium — P1.3's interim `new` action was unspecified. Closed: pinned as
  a "not built yet" notify until P1.4; K5 widened.
- Medium — provider-dump golden was declared but never exercised. Closed:
  test 31 byte-compares it; totals rederived to 31.
- Medium — migration source missing from Files/Layout. Closed: added to
  P1.2 Files and the Layout entry.
- Medium — empty-store and artifact-write-failure behaviors unpinned, and
  assistant-text extraction undefined. Closed: all three pinned in
  Interfaces.

Also fixed this round: `plans/` and `fixtures/` are now prettier-exempt
(`.prettierignore`), because the formatter was reflowing the packet field
layout and would have mutated frozen fixture bytes.
