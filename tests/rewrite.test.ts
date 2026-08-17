/**
 * Unit tests for the template splice. A stub ExtensionAPI captures the
 * before_agent_start handler; a synthetic stock prompt exercises the rewrite
 * and each fail-open branch. No Pi process and no provider request.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import test from "node:test";
import systemPromptExtension from "../index.ts";

const TOOLS = "- read: Read file contents\n- bash: Execute bash commands";
const GUIDELINES =
  "- Use bash for file operations\n- Be concise in your responses";
const DOCS =
  "Pi documentation (read only when the user asks about pi itself):\n- Main documentation: /tmp/README.md";
const TAIL =
  "\n\n<project_context>\nstub\n</project_context>\n\nCurrent working directory: /tmp";

const STOCK_CORE =
  "You are an expert coding assistant operating inside pi, a coding agent harness. " +
  "You help users by reading files, executing commands, editing code, and writing new files.\n\n" +
  `Available tools:\n${TOOLS}\n\n` +
  "In addition to the tools above, you may have access to other custom tools depending on the project.\n\n" +
  `Guidelines:\n${GUIDELINES}\n\n` +
  DOCS;

function capturedHandler(): (
  event: unknown,
) => Promise<{ systemPrompt: string } | undefined> {
  let handler: unknown;
  const stub = {
    on(name: string, fn: unknown) {
      if (name === "before_agent_start") handler = fn;
    },
  };
  systemPromptExtension(stub as never);
  assert.ok(handler, "extension registered a before_agent_start handler");
  return handler as (
    event: unknown,
  ) => Promise<{ systemPrompt: string } | undefined>;
}

test("stock prompt is rebuilt from the template with the tail preserved", async () => {
  const template = fs.readFileSync(
    new URL("../SYSTEM.template.md", import.meta.url),
    "utf8",
  );
  const result = await capturedHandler()({ systemPrompt: STOCK_CORE + TAIL });
  assert.ok(result, "handler returned a rewritten prompt");
  const expected =
    template
      .replaceAll("{{AVAILABLE_TOOLS}}", TOOLS)
      .replaceAll("{{GUIDELINES}}", GUIDELINES)
      .replaceAll("{{PI_DOCS}}", DOCS)
      .trimEnd() + TAIL;
  assert.equal(result.systemPrompt, expected);
});

test("an active SYSTEM.md custom prompt is left untouched", async () => {
  const result = await capturedHandler()({
    systemPrompt: STOCK_CORE + TAIL,
    systemPromptOptions: { customPrompt: "owner prompt" },
  });
  assert.equal(result, undefined);
});

test("a non-stock prompt is left untouched", async () => {
  const result = await capturedHandler()({
    systemPrompt: "Different first line." + TAIL,
  });
  assert.equal(result, undefined);
});

test("a drifted core shape fails open", async () => {
  const drifted = STOCK_CORE.replace("Guidelines:", "House rules:");
  const result = await capturedHandler()({ systemPrompt: drifted + TAIL });
  assert.equal(result, undefined);
});
