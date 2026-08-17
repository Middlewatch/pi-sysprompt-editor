/**
 * pi-sysprompt-editor — owner-authored core system prompt.
 *
 * Rebuilds the core of Pi's system prompt (identity, tool list, guidelines,
 * Pi documentation) from SYSTEM.template.md. The template owns the prose;
 * the harness owns the live data, spliced in through three placeholders:
 *
 *   {{AVAILABLE_TOOLS}}  the "- tool: snippet" lines for the active tool set
 *   {{GUIDELINES}}       the per-tool guideline bullets for the active tool set
 *   {{PI_DOCS}}          the Pi documentation section (paths + routing rules)
 *
 * Everything after the core (project_context/AGENTS.md, skills, cwd,
 * scratchpad) is left untouched, so context files and skills keep layering
 * normally and the claude-go bridge forwards the rewritten prompt as-is.
 *
 * Fail-open posture: if a SYSTEM.md/--system-prompt custom prompt is active,
 * if the stock template shape is unrecognized (a pi update changed it), or if
 * the template file is missing, the prompt is left exactly as Pi built it.
 */
import * as fs from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TEMPLATE_FALLBACK =
  "/home/willow/projects/pi-sysprompt-editor/main/SYSTEM.template.md";

const STOCK_FIRST_LINE =
  "You are an expert coding assistant operating inside pi, a coding agent harness.";

function templatePath(): string {
  try {
    return new URL("./SYSTEM.template.md", import.meta.url).pathname;
  } catch {
    return TEMPLATE_FALLBACK;
  }
}

/** Split the assembled prompt into [core, tail] at the first appended layer. */
function splitTail(prompt: string): [string, string] {
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
function extract(core: string, start: string, end: string): string | null {
  const a = core.indexOf(start);
  if (a === -1) return null;
  const from = a + start.length;
  const b = core.indexOf(end, from);
  if (b === -1) return null;
  return core.slice(from, b);
}

export default function systemPromptExtension(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event: any) => {
    const prompt: string = event.systemPrompt ?? "";
    if (event.systemPromptOptions?.customPrompt) return; // SYSTEM.md wins
    if (!prompt.startsWith(STOCK_FIRST_LINE)) return; // already rewritten or non-stock

    let template: string;
    try {
      template = fs.readFileSync(templatePath(), "utf8");
    } catch {
      return; // no template deployed: stock prompt stands
    }

    const [core, tail] = splitTail(prompt);
    const tools = extract(
      core,
      "Available tools:\n",
      "\n\nIn addition to the tools above",
    );
    const guidelines = extract(core, "Guidelines:\n", "\n\nPi documentation");
    const docsAt = core.indexOf("Pi documentation (");
    if (tools === null || guidelines === null || docsAt === -1) return; // shape drifted: fail open
    const docs = core.slice(docsAt).trimEnd();

    const rendered = template
      .replaceAll("{{AVAILABLE_TOOLS}}", tools)
      .replaceAll("{{GUIDELINES}}", guidelines)
      .replaceAll("{{PI_DOCS}}", docs)
      .trimEnd();
    return { systemPrompt: rendered + tail };
  });
}
