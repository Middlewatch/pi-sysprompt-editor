/**
 * pi-sysprompt-editor — owner-authored core system prompt.
 *
 * Rebuilds the core of Pi's system prompt (identity, tool list, guidelines,
 * Pi documentation) from the active template in templates/. The template
 * owns the prose; the harness owns the live data, spliced in through three
 * optional placeholders:
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
 * no template resolves (pointer and default.md both unusable), the prompt is
 * left exactly as Pi built it.
 */
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { renderTemplate, splitTail } from "./lib/splice.ts";
import { readActiveTemplate } from "./lib/templates.ts";

const STOCK_FIRST_LINE =
  "You are an expert coding assistant operating inside pi, a coding agent harness.";

/**
 * Filesystem locations the extension works against. Pi calls the default
 * export with no paths and the URL-resolved defaults apply; tests pass temp
 * directories. This is the only injection mechanism.
 */
export interface ExtensionPaths {
  templatesDir?: string;
  artifactsDir?: string;
  fixturePath?: string;
}

function resolvePath(spelling: string): string | null {
  try {
    return fileURLToPath(new URL(spelling, import.meta.url));
  } catch {
    return null;
  }
}

export default function systemPromptExtension(
  pi: ExtensionAPI,
  paths: ExtensionPaths = {},
): void {
  const templatesDir = paths.templatesDir ?? resolvePath("./templates/");

  pi.on("before_agent_start", async (event: any) => {
    const prompt: string = event.systemPrompt ?? "";
    if (event.systemPromptOptions?.customPrompt) return; // SYSTEM.md wins
    if (!prompt.startsWith(STOCK_FIRST_LINE)) return; // already rewritten or non-stock
    if (templatesDir === null) return; // URL resolution failed: stock stands

    const active = readActiveTemplate(templatesDir);
    if (active === null) return; // no template resolves: stock prompt stands

    const [core, tail] = splitTail(prompt);
    const rendered = renderTemplate(active.content, core);
    if (rendered === null) return; // shape drifted: fail open
    return { systemPrompt: rendered + tail };
  });
}
