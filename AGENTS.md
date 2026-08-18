# pi-sysprompt-editor

Pi extension that rebuilds the core system prompt from the owner-authored
templates in `templates/` and manages them through `/sysprompt` (switch,
new, inspect, test). `DESIGN.md` and `README.md` are the living docs and
describe the product as built. `docs/` holds dated decision records and
`plans/` holds finished build plans with their execution logs and lint and
review registers; both are append-only history. A new decision or build
adds a dated file there rather than editing an old one, and the living docs
absorb whatever the change settled.

## Workflow charters

House process detail lives in the cross-project charters:
`~/projects/agent-guidance/workflows/freezable-workflow.md` (freezability
invariant, asset types, packet/review loop, budget tiers) and its companion
`~/projects/agent-guidance/workflows/verification-toolbox.md` (tool choices
per verification capability). Read them before planning packets, gates, or
reviews.

## Project gates and rules

- `scripts/verify.sh` is the definition of green: install, format check,
  typecheck, unit tests. Run it before any commit.
- Fail open is doctrine: any change to the splice keeps the property that an
  unrecognized condition returns the prompt exactly as Pi built it, and the
  unit suite proves each fail-open branch.
- The deployed extension is a symlink from Pi's extension directory to this
  repo, so edits here are live in new sessions; verify before leaving the
  tree broken.
- Artifact formats are golden-pinned under `fixtures/golden/` as
  input/expected pairs. A deliberate format change regenerates the expected
  bytes from the pinned input and the diff is reviewed line by line;
  `plans/` and `fixtures/` are excluded from prettier so those bytes stay
  stable.
- Generated artifacts go to the container's `../artifacts/` directory,
  never into the repo.
- CI is deferred until a remote exists; the gate script is the workflow's
  only job when it lands.
