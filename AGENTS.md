# pi-sysprompt-editor

Pi extension that rebuilds the core system prompt from the owner-authored
templates in `templates/` and manages them through `/sysprompt` (switch,
new, inspect, test). `DESIGN.md` and `README.md` are the living docs and
describe the product as built.

## Project gates and rules

- `scripts/verify.sh` is the definition of green: install, format check,
  typecheck, unit tests. Run it before any commit.
- Fail open is doctrine: any change to the splice keeps the property that an
  unrecognized condition returns the prompt exactly as Pi built it, and the
  unit suite proves each fail-open branch.
- The extension is loaded straight from this repo (the repo is listed under
  `packages` in Pi's settings), so edits here are live in new sessions;
  verify before leaving the tree broken.
- Artifact formats are golden-pinned under `fixtures/golden/` as
  input/expected pairs. A deliberate format change regenerates the expected
  bytes from the pinned input and the diff is reviewed line by line;
  `fixtures/` and `templates/` are excluded from prettier so those bytes
  stay stable.
- Generated artifacts go to the container's `../artifacts/` directory,
  never into the repo.
- No CI is configured; `scripts/verify.sh` is the whole gate.
