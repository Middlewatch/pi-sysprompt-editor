/**
 * The template splice: split Pi's assembled prompt into core and tail,
 * extract the live data from the stock core, and render an owner template
 * around it. Pure functions; the caller owns fail-open.
 */

/** Split the assembled prompt into [core, tail] at the first appended layer. */
export function splitTail(prompt: string): [core: string, tail: string] {
  for (const marker of [
    "\n\n<project_context>",
    "\n<available_skills>",
    "\nCurrent working directory:",
  ]) {
    const i = prompt.indexOf(marker);
    if (i !== -1) return [prompt.slice(0, i), prompt.slice(i)];
  }
  return [prompt, ""];
}

/** Return the text between two anchors in the core, or null if absent. */
export function extract(
  core: string,
  start: string,
  end: string,
): string | null {
  const a = core.indexOf(start);
  if (a === -1) return null;
  const from = a + start.length;
  const b = core.indexOf(end, from);
  if (b === -1) return null;
  return core.slice(from, b);
}

/**
 * Render the template with the stock core's live data spliced in. Returns
 * null when any anchor is missing (the stock shape drifted), so the caller
 * can leave the prompt as Pi built it. Placeholders are optional: an absent
 * placeholder means the template omits that section, and replaceAll no-ops.
 */
export function renderTemplate(template: string, core: string): string | null {
  const tools = extract(
    core,
    "Available tools:\n",
    "\n\nIn addition to the tools above",
  );
  const guidelines = extract(core, "Guidelines:\n", "\n\nPi documentation");
  const docsAt = core.indexOf("Pi documentation (");
  if (tools === null || guidelines === null || docsAt === -1) return null;
  const docs = core.slice(docsAt).trimEnd();

  return template
    .replaceAll("{{AVAILABLE_TOOLS}}", tools)
    .replaceAll("{{GUIDELINES}}", guidelines)
    .replaceAll("{{PI_DOCS}}", docs)
    .trimEnd();
}
