# pi-sysprompt-editor

Pi extension that rebuilds the core system prompt from the owner-authored
`SYSTEM.template.md`. `DESIGN.md` is the design basis (draft until the
design-basis session ratifies it).

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
- CI is deferred until a remote exists; the gate script is the workflow's
  only job when it lands.
