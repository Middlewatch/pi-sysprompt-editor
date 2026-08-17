# Plan lint, round 8 (2026-08-17)

Independent fresh-context adversarial lint (review profile) of the
round-7-revised plan. Verdict: **FAIL with materials** (one Medium, no
Highs). Closed same day. Round-7 closure verified landed.

## Findings and closures

- Medium — Interfaces pinned the assistant-text extraction rule and test 35
  named it, but `lib/output-test.ts` exposed no function that takes an
  assistant message, so a fresh executor would have to invent the helper
  or bury the logic in `index.ts` where test 35 could not reach it.
  Closed: `assistantText(message: unknown): string` added to the
  `lib/output-test.ts` signatures (text blocks joined with `"\n\n"`,
  non-text ignored, empty string when no text blocks), the Test call stack
  now names `formatResult(header, assistantText(event.message))`, and
  test 35's description states its synthetic input and both expected
  outputs.

## Verified by the reviewer this round

Count reconciliation reads 4 + 35 = 39; every count agrees on
6/12/15/19/23/32/39; tests 1–39 present once; every packet has a runnable
gate and a falsification witness; named files exist or are packet-created;
DESIGN.md supports every relied-on claim; Handoff harness API claims match
the 0.84.1 declarations (cancellation, model optionality, command-only
prompt options, payload, turn_end message, chaining, sendUserMessage,
BuildSystemPromptOptions export).
