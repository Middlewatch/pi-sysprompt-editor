# pi-sysprompt-editor

A Pi extension that rebuilds the core of Pi's system prompt (identity, tool
list, guidelines, documentation routing) from an owner-authored template,
`SYSTEM.template.md`. The template owns the prose; the harness owns the live
data, spliced in through three placeholders. Everything Pi appends after the
core (project context, skills, working directory) is left untouched.

The extension fails open: an active `SYSTEM.md` custom prompt, an
unrecognized stock prompt shape, or a missing template all leave the prompt
exactly as Pi built it.

`DESIGN.md` is the design basis. `scripts/verify.sh` is the definition of
green.
