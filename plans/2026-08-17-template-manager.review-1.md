# Template manager — Phase 1 review register

Reviewer: fresh-context Sol, 2026-08-17

Summary: 0 CRITICAL, 2 MAJOR, 2 MINOR, 2 NOTE.

## F1 — MAJOR — Switch offers filenames that can never become active

**Evidence:** `listTemplates` accepts every directory entry ending in `.md`, without applying the pointer-validity regex or checking that it is a regular file (`lib/templates.ts:18-35`). Pointer reads accept only `^[a-z0-9-]+\.md$` (`lib/templates.ts:10-12`, `lib/templates.ts:37-47`). Switch writes the selected name and unconditionally reports it active (`index.ts:87-100`; `lib/templates.ts:69-72`). Tests list only pointer-valid filenames (`tests/templates.test.ts:113-127`; `tests/wiring.test.ts:101-138`).

**Why it matters:** A manually authored `Voice.md`, `my voice.md`, or directory named `voice.md` appears in the picker. Selecting it writes `.active` and reports success, but the next turn rejects that pointer and silently renders `default.md`. This violates the switch-next-turn claim while passing all Phase 1 tests.

**Suggested fix:** Make switch candidates pointer-valid regular files, or reject an invalid selection before writing and do not report success. Reconcile the pinned “`*.md`” listing contract with the stricter pointer grammar.

## F2 — MAJOR — Phase 1 unit gates do not prove all claims in their names

**Evidence:** The byte-copy test obtains the active content itself and passes it directly to `scaffoldTemplate` (`tests/templates.test.ts:130-143`). The wiring happy path copies only an unpointed `default.md` (`tests/wiring.test.ts:193-218`). Thus an `actionNew` that always copied `default.md` would still pass. Tail preservation is exercised only through the `<project_context>` split (`tests/rewrite.test.ts:19-20`, `tests/rewrite.test.ts:47-60`), not the skills-only or cwd-only branches implemented at `lib/splice.ts:8-17`. No Phase 1 test invokes `inspect` or `test`; the only inertness assertion concerns an unknown argument (`tests/wiring.test.ts:168-180`).

**Why it matters:** The 21-test gate can remain green with broken active-template wiring, a broken skills/cwd tail split, or side effects added to K5 placeholders. The cancellation tests themselves are sound: they exercise both menu and switch-select cancellation (`tests/wiring.test.ts:141-155`) and undefined name input (`tests/wiring.test.ts:193-200`).

**Suggested fix:** Add wiring tests using a non-default active pointer for `new`; add skills-only and cwd-only tail cases; invoke `inspect` and `test` and assert notify-only behavior with no filesystem writes.

## F3 — MINOR — Command input normalization weakens the pinned name regex

**Evidence:** The command trims picker input before validation (`index.ts:108-115`), while `scaffoldTemplate` correctly applies `^[a-z0-9-]+$` to the value it receives (`lib/templates.ts:74-91`). The contract says the entered template name is validated against that regex (`plans/2026-08-17-template-manager.plan.md:181-184`). Tests reject several malformed direct inputs but do not test command-level surrounding whitespace (`tests/templates.test.ts:146-161`; `tests/wiring.test.ts:193-218`).

**Why it matters:** Input such as ` fresh ` is outside the pinned grammar but is accepted as `fresh`. This is a contract deviation hidden by the wiring suite.

**Suggested fix:** Pass the raw input to `scaffoldTemplate`, or amend the contract explicitly to permit trimming before validation and add a test.

## F4 — MINOR — Pointer publication is non-atomic across concurrent sessions

**Evidence:** `setActiveTemplate` uses a plain `writeFileSync` directly on `.active` (`lib/templates.ts:69-72`). Readers catch empty, partial, or unreadable pointer states and fall back to `default.md` (`lib/templates.ts:37-66`). The plan explicitly identifies concurrent pointer writes as a Phase 1 review concern (`plans/2026-08-17-template-manager.plan.md:661-675`).

**Why it matters:** Concurrent switches are last-writer-wins by design, but direct truncation creates an avoidable interval in which another turn may observe an invalid pointer and render the default rather than either selected template. Unit tests are single-session and cannot expose this.

**Suggested fix:** Write a uniquely named temporary file in the same directory and atomically rename it over `.active`. Document last-writer-wins semantics.

## F5 — NOTE — K1 appears structurally safe but the live symlink gate is unverified

**Evidence:** The default uses the pinned spelling through `fileURLToPath(new URL("./templates/", import.meta.url))` (`index.ts:22-22`, `index.ts:53-66`; plan pin at `plans/2026-08-17-template-manager.plan.md:128-137`). The execution log records unit verification but no Phase 1 live eye check (`plans/2026-08-17-template-manager.execution.md:61-72`). The plan requires that eye check to resolve K1 (`plans/2026-08-17-template-manager.plan.md:661-674`).

**Why it matters:** Inference: if Node realpaths the loaded module, the URL points directly into the repository; if it preserves the extension symlink path, filesystem traversal through the symlink still reaches the target’s `templates/`. Either route should work. I could not inspect the external deployed symlink, launch Pi, or run the live switch check with the provided inspection-only tools.

**Suggested fix:** Perform and record the required deployed-session eye check before closing K1.

## F6 — NOTE — Remaining pinned Phase 1 contracts conform; K5 code is inert

**Evidence:** Exported signatures match the plan (`index.ts:47-64`; `lib/splice.ts:8-56`; `lib/templates.ts:18-98`). Pointer validation and pointer→default→null fallback are implemented (`lib/templates.ts:10-12`, `lib/templates.ts:37-67`). Scaffold validation and atomic no-overwrite use `flag: "wx"` (`lib/templates.ts:74-98`). Select and input cancellation return before writes (`index.ts:92-95`, `index.ts:108-115`, `index.ts:144-147`). Custom prompt, non-stock prompt, unresolved path, absent templates, and drifted anchors all leave the stock prompt untouched (`index.ts:53-79`). At Phase 1, `inspect` and `test` only notify and return; `new` is implemented as required (`index.ts:103-136`).

**Why it matters:** No additional Phase 1 fail-open defect is evident in the reviewed code. The execution log reports 21 passing tests (`plans/2026-08-17-template-manager.execution.md:61-72`), but I could not independently execute `verify.sh`.

**Suggested fix:** Keep these behaviors and strengthen the proof gaps identified above.

## Freezability

Not fully freezable from the stated set. Most behavior is pinned by DESIGN.md, the plan, `templates/default.md`, and tests, including the stock first line and extraction anchors. However, the exact skills-only tail marker is present only in implementation (`lib/splice.ts:8-17`) and is not exercised by the suites; deployment correctness also still depends on the unexecuted symlink eye check. A reconstruction could therefore pass the existing suites while mishandling a valid tail shape. Runtime Pi/package and filesystem semantics remain external dependencies, though their intended versions and API assumptions are recorded in the plan (`plans/2026-08-17-template-manager.plan.md:831-847`).

## Verdict

FAIL — MAJOR findings remain open.

## Re-review after fix wave fe683bf

- F1: CLOSED — `listTemplates` now filters for both regular files and pointer-valid names (`lib/templates.ts:20-30`), with invalid-name and directory exclusions tested (`tests/templates.test.ts:113-129`).
- F2: CLOSED — Wiring proves `new` copies a non-default active template (`tests/wiring.test.ts:213-227`), rewrite tests cover skills-only and cwd-only tails (`tests/rewrite.test.ts:61-69`), and `inspect`/`test` are notify-only with template/artifact directories unchanged (`tests/wiring.test.ts:180-191`).
- F3: CLOSED — `actionNew` passes raw input without trimming (`index.ts:108-115`), and padded input is rejected without creating `padded.md` (`tests/wiring.test.ts:228-232`).
- F4: CLOSED — Pointer publication writes a same-directory PID/timestamp temporary file and renames it over `.active`, cleaning up on rename failure (`lib/templates.ts:74-97`).
- F5: OPEN — Owner-queued NOTE remains unchanged: the live deployed-symlink eye check is still required (`plans/2026-08-17-template-manager.review-1.md:39-45`).
- F6: CLOSED — Conformance evidence remains intact; fail-open branches still return without rewriting for custom/non-stock prompts, unresolved paths, absent templates, and drifted shapes (`index.ts:67-79`; `tests/rewrite.test.ts:72-90`; `tests/templates.test.ts:88-97`). No new defect is evident in the current targeted files.
- Inspection limitation: the provided tools exposed current files and a clean worktree, but not `git diff HEAD~1 HEAD` or `git log`; commit-boundary attribution could not be independently checked.

## Verdict

PASS — no CRITICAL or MAJOR finding remains open; F5 is an owner-queued NOTE.

## Phase 2 review

Reviewer: fresh-context Sol, 2026-08-17

Summary: 0 CRITICAL, 1 MAJOR, 2 MINOR, 2 NOTE.

## F7 — MAJOR — Armed inspection is unavailable on the owner’s claude-go bridge

**Evidence:** The inspect action promises that sending any message will capture the ground-truth dump, but only `before_provider_request` consumes the armed state (`index.ts:147-165`, `index.ts:216-219`). The executor-provided environment fact says the custom claude-go bridge never calls `options.onPayload`, so Pi never emits that event for bridge turns. The plan’s Phase 2 gate explicitly required review of the owner’s providers, including claude-go (`plans/2026-08-17-template-manager.plan.md:719-730`).

**Why it matters:** State remaining armed, with no file and no exception, is safe fail-open behavior. However, the advertised “send any message” workflow does not work on the owner’s primary provider. The next native-provider turn can unexpectedly consume the stale arm and produce a dump for a later, unrelated turn under the earlier stamp.

**Suggested fix:** Resolve before freezing through either a bridge change that invokes `onPayload`, or an explicit contract/UI amendment documenting that custom providers without payload callbacks cannot be captured and how an outstanding arm is handled.

## F8 — MINOR — Pinned recognizers omit two built-in Pi payload families

**Evidence:** The implementation recognizes only top-level Anthropic `system` and leading OpenAI-style `messages[0]` (`lib/inspect.ts:130-154`), exactly matching the pinned interface (`plans/2026-08-17-template-manager.plan.md:371-380`). Installed Pi’s Anthropic adapter sends a text-block `system` array (`node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/api/anthropic-messages.js:723-748`), and OpenAI Chat prepends a system/developer string message (`node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/api/openai-completions.js:834-839`), so those are covered.

Installed Pi’s Responses adapter instead sends the converted messages under `input` (`node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/api/openai-responses.js:192-212`); its leading system/developer item is built at `node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/api/openai-responses-shared.js:88-96`. It does not currently use a top-level `instructions` field. Gemini sends `config.systemInstruction` (`node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/api/google-generative-ai.js:275-320`). Both adapters invoke `onPayload` before sending (`openai-responses.js:98-103`; `google-generative-ai.js:39-45`), but extraction falls back to JSON and produces no raw `.txt`.

**Why it matters:** Responses and Gemini captures cannot satisfy byte-comparison acceptance, although the fallback remains non-throwing. A future Responses `instructions` payload would also be unrecognized.

**Suggested fix:** Treat `input`, `instructions`, and Gemini `config.systemInstruction` as K3 CONTRACT AMENDMENT candidates rather than silently expanding the pinned recognizers; K3 explicitly assigns recurring real shapes that process (`plans/2026-08-17-template-manager.plan.md:780-782`).

## F9 — MINOR — Failure-path tests do not establish the full containment claim

**Evidence:** The immediate failure test exercises only a blocking file that makes directory creation fail and starts with no deliberately pre-existing arm (`tests/wiring.test.ts:280-290`). The provider failure test likewise reaches the first artifact’s mkdir/write wrapper only (`tests/wiring.test.ts:351-363`). No wiring test forces a successful `.md` followed by failing `.txt`, or makes `renderProviderDump` throw. Consequently, an implementation that catches only first-file failures but throws on the `.txt` or render path could pass these tests. The positive armed test does adequately assert undefined returns, exact raw text, one-shot consumption, and md-only fallback (`tests/wiring.test.ts:293-348`).

**Why it matters:** The suite does not prove the plan’s “any write failure” claim recorded by the executor (`plans/2026-08-17-template-manager.execution.md:123-128`).

**Suggested fix:** Add independent render-throw, md-write, and txt-write failure tests, each asserting error notification, undefined return/no rejection, and cleared armed state; seed an old arm before the immediate-failure case to pin the intended stale-state semantics.

## F10 — NOTE — All three golden byte layouts conform

**Evidence:** The populated immediate golden has the exact heading and explanatory text, required blank lines, `present`, ordered tool/snippet rules, guidelines, five-backtick widened fence, one blank line before its closing fence for trailing-newline content, UTF-8 lengths 18 and 14, and skill names (`fixtures/golden/immediate-dump.md:1-43`; input at `fixtures/golden/immediate-dump.input.json:1-38`). The empty golden uses `absent` and `(none)` in every required section (`fixtures/golden/immediate-dump-empty.md:1-29`). The provider golden has the exact header, four-backtick widened fence, verbatim body, and one blank line before the closing fence caused by the payload’s trailing newline (`fixtures/golden/provider-dump.input.json:1-13`; `fixtures/golden/provider-dump.md:1-19`). These match the pinned layouts and rules (`plans/2026-08-17-template-manager.plan.md:250-268`, `plans/2026-08-17-template-manager.plan.md:288-335`). No deviating byte was found.

**Why it matters:** The committed serialization oracle is internally consistent with the contract.

**Suggested fix:** None.

## F11 — NOTE — Implemented handler containment is correct for the named failure classes

**Evidence:** Armed state is consumed before any provider work (`index.ts:147-149`). Artifact mkdir and writes are caught by `writeArtifact` (`index.ts:136-145`); render exceptions are caught and notified as errors (`index.ts:156-165`); md and txt failures notify at error level and return (`index.ts:170-185`). The callback has no payload-returning branch (`index.ts:147-191`). Immediate render/write failures also notify as errors and do not newly arm (`index.ts:193-216`).

**Why it matters:** For mkdir, md write, txt write, and render failures, the provider handler clears capture state, contains the error, and never replaces the payload.

**Suggested fix:** Preserve this behavior while strengthening F9’s tests.

## Phase 2 freezability

The Phase 2 implementation is substantially rebuildable from DESIGN.md, the plan’s pinned interfaces/call stack, the three golden pairs, and the suites: DESIGN.md defines immediate versus authoritative capture (`DESIGN.md:36-40`), while the plan fixes signatures and wiring (`plans/2026-08-17-template-manager.plan.md:371-394`, `plans/2026-08-17-template-manager.plan.md:445-454`). Provider callback availability and built-in payload families remain external integration facts, so a fully operational rebuild also needs the F7/F8 contract decisions. I could inspect repository evidence but could not run `verify.sh` or live-provider checks with the provided tools; the execution log reports 37 passing tests (`plans/2026-08-17-template-manager.execution.md:129-136`).

## Phase 2 verdict

FAIL — F7 remains an open MAJOR.

## Re-review after Phase 2 fix waves 03ccc8f and the F7 ruling

- F7: CLOSED by owner ruling 2026-08-17 (both remedies). claude-go adapter
  commit 2cedcb9 (`~/projects/claude-go/main`) calls `options.onPayload`
  once per turn with `{ system, messages, model, tools }`, so
  `before_provider_request` now fires on bridge turns and the `system`
  string matches the Anthropic-string recognizer; pi_smoke asserts the call
  (red when removed). In this repo, a `turn_end` handler disarms a still-
  armed capture and warns "provider did not expose its payload; capture
  cancelled" (proven at the end of wiring test 19). Executor closure; the
  fresh-context reviewer's F7 evidence stands as written.
- F8: OPEN as K3 candidates (no code change by design).
- F9: CLOSED in 03ccc8f (render-throw, md-then-txt failure, stale arm).
- F10, F11: NOTE, no action.

## Phase 2 verdict (after fix waves)

PASS — no CRITICAL or MAJOR open.

## Phase 3 review

Reviewer: fresh-context Sol, 2026-08-17

Summary: 0 CRITICAL, 1 MAJOR, 1 MINOR, 1 NOTE.

## F12 — MAJOR — `pendingTest` captures the first assistant turn, not reliably the test response

**Evidence:** The command records `pendingTest` before calling `pi.sendUserMessage` (`index.ts:287-291`), while `turn_end` unconditionally consumes it on the first event (`index.ts:231-250`). Pi defines `turn_end` as one assistant message plus tool results (`node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:548-560`) and emits it separately from the later `agent_end` (`node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js:439-464`).

Consequently:
- If the owner submits another message after the test send, the result always records whichever assistant message reaches `turn_end` first. Normally that is the test turn, potentially steered by the extra message; if scheduling makes the other reply finish first, that unrelated reply is recorded. This is the exact race accepted for day one under single-writer, owner-driven use (`plans/2026-08-17-template-manager.plan.md:775-779`).
- If the model calls tools, the first tool-calling assistant message triggers `turn_end`; the file contains only that message’s text blocks, possibly an empty body, rather than the final post-tool summary. `agent_end` occurs only after the loop (`types.d.ts:539-543`). This deterministic intermediate-response capture is a defect, not merely the accepted human-message race.
- Extension commands execute immediately even while streaming (`agent-session.js:783-805`). `sendUserMessage` supplies no `deliverAs` (`index.ts:289-290`), although Pi requires one while streaming and otherwise rejects (`agent-session.js:830-840`, `agent-session.js:1099-1134`). The ExtensionAPI wrapper catches that rejection (`agent-session.js:1855-1862`), so the command still reports “sent,” leaves `pendingTest` armed, and the current unrelated turn’s next `turn_end` is written as the test result. This is a defect outside the stated owner-flow acceptance.

**Why it matters:** Tool-using models and commands issued during an active run can produce confidently labeled files containing an intermediate or unrelated response. That defeats the output corpus’s attribution purpose and meets the plan’s trigger for a K2 amendment (`plans/2026-08-17-template-manager.plan.md:775-779`).

**Suggested fix:** Amend K2 to key capture to the sent test message and to define final-response handling across tool turns; alternatively reject testing while non-idle and capture only after the relevant agent loop completes. Add real event-sequence tests for steering/follow-up, tool calls, and command invocation during streaming.

## F13 — MINOR — Wiring tests do not prove render-time attribution or Pi event sequencing

**Evidence:** The stub `sendUserMessage` only appends a string and never models idle state, rejection, agent loops, or event ordering (`tests/wiring.test.ts:36-61`). The stock test runs one failed-open `before_agent_start` immediately before one synthetic `turn_end` (`tests/wiring.test.ts:445-483`); the active-template twin likewise keeps the same active pointer from command through render and end (`tests/wiring.test.ts:485-503`). An implementation that snapshots `readActiveTemplate` at command time instead of reading `lastRender` at `turn_end` would pass both named tests. Likewise, an implementation that failed to reset a previously successful `lastRender` on a later stand-down would pass because no P3 test performs successful render → fail-open render → result capture. No test emits multiple `turn_end` events for a tool-using agent loop.

The write-failure test does substantiate notification, no rejection, and one-shot clearing (`tests/wiring.test.ts:516-532`), and the missing-fixture test substantively proves error notification, no send, no pending write, and no artifact directory (`tests/wiring.test.ts:534-547`).

**Why it matters:** Tests 20 and 36 can remain green with the principal attribution contract broken, and none can expose F12’s runtime failures.

**Suggested fix:** Add transition tests proving successful render followed by every stand-down/fail-open branch yields `(stock)`, mutate the active pointer between command and `before_agent_start`, and drive realistic multi-turn/tool event sequences. Provide a send stub that rejects when non-idle without `deliverAs`.

## F14 — NOTE — Serialization, reset logic, and named failure containment conform

**Evidence:** The golden input fixes the complete header and response (`fixtures/golden/output-test-result.input.json:1-10`); the expected file has the pinned heading, ordered fields, separator, verbatim body, blank lines, and final newline (`fixtures/golden/output-test-result.md:1-21`), matching `formatResult` (`lib/output-test.ts:37-55`) and the plan (`plans/2026-08-17-template-manager.plan.md:269-287`). The `(stock)` twin exactly asserts omission of the sha line and final newline (`tests/output-test.test.ts:47-64`).

`lastRender` is reset before every branch (`index.ts:100-102`); custom prompt, non-stock prompt, unresolved template directory, missing active template, and failed splice all return after that reset (`index.ts:103-112`). Only successful splice sets it (`index.ts:113-117`), and the result reads it at `turn_end`, not command time (`index.ts:242-250`). Assistant extraction follows the pinned text-only join rule (`lib/output-test.ts:57-73`; `tests/output-test.test.ts:67-85`).

Fixture-read failure is caught and sends nothing (`index.ts:277-285`). Pending state is cleared before formatting, path resolution, or writing (`index.ts:231-267`); formatting and artifact writes are caught/notified, so the tested failure paths do not throw. The execution log reports 45 passing tests (`plans/2026-08-17-template-manager.execution.md:183-203`), but I could not independently run `verify.sh` or a live Pi test with the inspection-only tools.

**Why it matters:** Apart from the attribution lifecycle, the pinned bytes, stand-down state, extraction, and named containment behavior are internally consistent.

**Suggested fix:** Preserve these behaviors while fixing F12 and strengthening F13.

## Phase 3 freezability

The serializers, fixture, prompt constant, collision helper contract, result naming, extraction rules, and ordinary success/failure wiring are rebuildable from DESIGN.md, the plan, golden pair, fixture, and suites (`DESIGN.md:41-43`, `DESIGN.md:61-63`, `DESIGN.md:96-112`; `plans/2026-08-17-template-manager.plan.md:396-425`). Phase 3 is not fully freezable operationally because the suites replace Pi with a non-behavioral send stub and do not pin tool-loop, competing-message, or non-idle semantics. The required live corpus eye check is specified at `plans/2026-08-17-template-manager.plan.md:755-764` but is not recorded in the P3.1 execution entry (`plans/2026-08-17-template-manager.execution.md:183-203`).

## Phase 3 verdict

FAIL — F12 remains an open MAJOR.
