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
