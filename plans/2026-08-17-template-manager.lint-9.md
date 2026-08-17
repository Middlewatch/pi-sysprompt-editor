# Plan lint, round 9 (2026-08-17)

Independent fresh-context adversarial lint (review profile) of the
round-8-revised plan. Verdict: **FAIL with materials** (two High, one
Medium). All closed same day. Round-8 closure verified landed.

## Findings and closures

- High — P2.1's tests 18 and 38 asserted arming behavior, but the arm
  state (`armCapture`/`takeArmedCapture`) was introduced in P2.2, so P2.1
  could not pass its own acceptance without building ahead. Closed: the
  arm state and test 27 move into P2.1 (the inspect action arms and
  notifies the D4 message there; nothing consumes the armed state until
  P2.2), P2.2 keeps extraction, `renderProviderDump`, and the
  `before_provider_request` handler, and P2.2 gained new falsification
  witnesses (writing `.txt` on null extraction turns 26 red; dropping the
  `.txt` write turns 19 red).
- High — the three golden-pinned formats were described but not
  byte-specifiable, so renderer and expected bytes would both be invented
  in the same packet. Closed: Interfaces now pins shared serialization
  rules (line joins, blank-line separation, single trailing newline,
  `(none)` for empty lists, fence length one longer than the longest
  backtick run in the content) and an exact layout for the provider dump
  `.md` (recognized and unrecognized shapes), the output-test result, and
  the immediate dump section by section. The golden pair remains the
  byte-level witness; the plan text is now sufficient to derive it.
- Medium — three Interface branches had no numbered test: missing fixture
  on `test`, the `String(payload)` fallback when stringify throws, and the
  unknown-argument usage notify. Closed: tests 40 (P1.3, wiring), 41
  (P2.2, inspect), and 42 (P3.1, wiring) added with stated inputs and
  assertions; totals rederived to 6/12/16/20/25/34/42 and the Verification
  contract's 42.

## Verified by the reviewer this round

Round-8 `assistantText` closure landed; tests 1–39 unique and gapless
before this round's additions; every packet had a runnable gate and
witness; harness claims (payload, turn_end message, command-only prompt
options, model optionality, cancellation, sendUserMessage) match the
0.84.1 declarations.
