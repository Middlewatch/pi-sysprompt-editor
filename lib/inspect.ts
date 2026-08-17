/**
 * Inspection: the immediate best-effort dump rendered from
 * ctx.getSystemPromptOptions() at command time, the one-shot armed capture
 * state, and the shared stamp/collision helpers for artifact filenames.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { BuildSystemPromptOptions } from "@earendil-works/pi-coding-agent";

/** Provider and model id for headers and filenames; `unknown` when absent. */
export function modelLabel(
  model: { provider: string; id: string } | undefined,
): { provider: string; modelId: string } {
  if (model === undefined) return { provider: "unknown", modelId: "unknown" };
  return { provider: model.provider, modelId: model.id };
}

/** Local time `YYYY-MM-DD-HHmmss`, zero-padded. */
export function makeStamp(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${p(now.getFullYear(), 4)}-${p(now.getMonth() + 1)}-${p(now.getDate())}-` +
    `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  );
}

/**
 * Return `base`, or `${base}-${N}` for the smallest N >= 2, such that no
 * `join(dir, candidate + ext)` exists for any ext. Basename only; the caller
 * joins the directory and appends the extension.
 */
export function freeBase(dir: string, base: string, exts: string[]): string {
  const taken = (candidate: string) =>
    exts.some((ext) => fs.existsSync(path.join(dir, candidate + ext)));
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }
}

/**
 * A fence of backticks one longer than the longest backtick run inside
 * `content` (minimum three), so any prompt survives fencing.
 */
export function fenceFor(content: string): string {
  let longest = 0;
  for (const run of content.match(/`+/g) ?? []) {
    if (run.length > longest) longest = run.length;
  }
  return "`".repeat(Math.max(3, longest + 1));
}

/** One `- item` line per entry, or `(none)` for an empty or absent list. */
function bullets(items: string[] | undefined): string {
  if (!items || items.length === 0) return "(none)\n";
  return items.map((item) => `- ${item}\n`).join("");
}

/** A verbatim block inside a fence, each line and block followed by one \n. */
export function fenced(content: string, info = ""): string {
  const fence = fenceFor(content);
  return `${fence}${info}\n${content}\n${fence}\n`;
}

/** The immediate dump: a best-effort rebuild from the command-time options. */
export function renderImmediateDump(options: BuildSystemPromptOptions): string {
  const tools = (options.selectedTools ?? []).map((tool) => {
    const snippet = options.toolSnippets?.[tool];
    return typeof snippet === "string" && snippet !== ""
      ? `${tool}: ${snippet}`
      : tool;
  });
  const contextFiles = (options.contextFiles ?? []).map(
    (file) => `${file.path} (${Buffer.byteLength(file.content, "utf8")} bytes)`,
  );
  const skills = (options.skills ?? []).map((skill) => skill.name);
  const custom =
    typeof options.customPrompt === "string" && options.customPrompt !== ""
      ? "present"
      : "absent";
  const appended =
    typeof options.appendSystemPrompt === "string" &&
    options.appendSystemPrompt !== ""
      ? fenced(options.appendSystemPrompt)
      : "(none)\n";

  return [
    "# System prompt (best-effort rebuild at command time)\n",
    "Rebuilt from ctx.getSystemPromptOptions() when the command ran. It\n" +
      "excludes per-turn changes made by other extensions; the provider\n" +
      "capture is the ground truth.\n",
    "## Custom prompt\n",
    `${custom}\n`,
    "## Selected tools\n",
    bullets(tools),
    "## Prompt guidelines\n",
    bullets(options.promptGuidelines),
    "## Appended system prompt\n",
    appended,
    "## Context files\n",
    bullets(contextFiles),
    "## Skills\n",
    bullets(skills),
  ].join("\n");
}

// One-shot armed capture state: the raw stamp of the pending inspect, taken
// once by the next provider request.
let armed: string | null = null;

export function armCapture(stamp: string): void {
  armed = stamp;
}

export function takeArmedCapture(): string | null {
  const stamp = armed;
  armed = null;
  return stamp;
}
