# pi-sysprompt-editor

A Pi extension that rebuilds the core of Pi's system prompt (identity, tool
list, guidelines, documentation routing) from an owner-authored markdown
template. The template owns the prose; the harness owns the live data,
spliced in through four optional placeholders (`{{AVAILABLE_TOOLS}}`,
`{{GUIDELINES}}`, `{{PI_DOCS}}`, `{{PI_SCRATCHPAD}}`; the last renders
from `$PI_SCRATCHPAD` and is empty when the pi-scratchpad extension is not
running). Everything Pi appends after the core
(project context, skills, working directory) is left untouched.

The extension fails open: an active `SYSTEM.md` custom prompt, an
unrecognized stock prompt shape, or no resolvable template all leave the
prompt exactly as Pi built it.

## Templates

Templates live in `templates/*.md`; `templates/default.md` is the shipped
one. A gitignored one-line pointer, `templates/.active`, names the selected
template, and the splice reads it on every turn, so a switch applies to the
next message with no restart. If the pointer is missing, invalid, or names a
missing file, `default.md` is used; if that is missing too, the stock prompt
stands.

## The `/sysprompt` command

`/sysprompt` opens a menu of four actions; `/sysprompt <action>` jumps
straight to one. Cancelling any picker ends the command with no write.

- `switch`: pick the active template from the list.
- `new`: name a template (`[a-z0-9-]+`) and create it as a byte copy of the
  currently active one; existing files are never overwritten.
- `inspect`: writes a best-effort dump of the prompt inputs immediately,
  then on your next message writes the ground truth taken from the provider
  request: a readable `.md` and a raw `.txt` whose bytes are exactly the
  system prompt sent, with the `.txt` sha256 prefix in the notification.
  Files land in `../artifacts/inspect/` beside the repo.
- `test`: sends "Summarize this article for me." with the fixture at
  `fixtures/output-test-document.md` through the normal pipeline and writes
  the reply to `../artifacts/output-tests/<stamp>-<provider>-<model>.md`,
  headed with the template that actually rendered and its content sha256
  (or `(stock)` when the splice stood down). Refused while the agent is
  busy.

Provider capture rides Pi's `before_provider_request` event, which a custom
provider only emits if its `streamSimple` calls `options.onPayload`. If a
turn ends without the event, the capture is cancelled with a warning.

## Layout

- `index.ts`: hook and command registration; logic lives in `lib/`.
- `lib/splice.ts`: tail split, anchor extraction, template render.
- `lib/templates.ts`: template store (list, active pointer, scaffold).
- `lib/inspect.ts`: immediate dump, payload extraction, armed capture,
  artifact naming.
- `lib/output-test.ts`: output-test prompt, result naming and format.
- `fixtures/golden/`: input/expected pairs that pin the artifact formats
  byte for byte.

`DESIGN.md` is the design basis. `scripts/verify.sh` is the definition of
green (node 22, `npm ci`, prettier, tsc, unit tests).
