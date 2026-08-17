/**
 * Wiring tests: the real index.ts default export driven through a stub
 * ExtensionAPI and a stub command context, always constructed through the
 * `paths` seam with temp directories. These prove the command and hook glue,
 * not the lib functions (which have their own suites).
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import systemPromptExtension, { type ExtensionPaths } from "../index.ts";
import { takeArmedCapture } from "../lib/inspect.ts";

type Handler = (event: any, ctx: any) => Promise<any>;

interface Harness {
  templatesDir: string;
  artifactsDir: string;
  handlers: Map<string, Handler>;
  command: (args: string, ctx: any) => Promise<void>;
  sent: string[];
}

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sysprompt-${prefix}-`));
}

function seed(dir: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, "utf8");
  }
}

/** Build the extension against temp dirs and capture what it registers. */
function harness(paths: Partial<ExtensionPaths> = {}): Harness {
  const templatesDir = paths.templatesDir ?? tempDir("templates");
  const artifactsDir = paths.artifactsDir ?? tempDir("artifacts");
  const handlers = new Map<string, Handler>();
  const sent: string[] = [];
  let command: Harness["command"] | undefined;
  const stub = {
    on(name: string, fn: Handler) {
      handlers.set(name, fn);
    },
    registerCommand(name: string, options: { handler: Harness["command"] }) {
      assert.equal(name, "sysprompt");
      command = options.handler;
    },
    sendUserMessage(content: string) {
      sent.push(content);
    },
  };
  systemPromptExtension(stub as never, {
    templatesDir,
    artifactsDir,
    fixturePath: paths.fixturePath,
  });
  assert.ok(command, "extension registered the sysprompt command");
  return { templatesDir, artifactsDir, handlers, command, sent };
}

interface StubUi {
  ctx: any;
  notices: { message: string; type: string | undefined }[];
  selects: { title: string; options: string[] }[];
  inputs: string[];
}

/** Stub command context whose pickers resolve to scripted answers. */
function stubUi(script: {
  select?: (title: string, options: string[]) => string | undefined;
  input?: (title: string) => string | undefined;
  model?: { provider: string; id: string };
  systemPromptOptions?: unknown;
}): StubUi {
  const notices: StubUi["notices"] = [];
  const selects: StubUi["selects"] = [];
  const inputs: string[] = [];
  const ctx = {
    model: script.model,
    ui: {
      notify(message: string, type?: string) {
        notices.push({ message, type });
      },
      async select(title: string, options: string[]) {
        selects.push({ title, options });
        return script.select?.(title, options);
      },
      async input(title: string) {
        inputs.push(title);
        return script.input?.(title);
      },
    },
    getSystemPromptOptions() {
      return script.systemPromptOptions ?? { cwd: "/tmp" };
    },
  };
  return { ctx, notices, selects, inputs };
}

test("wiring: switch action writes the pointer through the registered command", async () => {
  const h = harness();
  seed(h.templatesDir, { "default.md": "D", "terse.md": "T" });
  const ui = stubUi({ select: (_title, options) => options[1] });
  await h.command("switch", ui.ctx);
  assert.deepEqual(ui.selects, [
    { title: "Active template:", options: ["default.md", "terse.md"] },
  ]);
  assert.equal(
    fs.readFileSync(path.join(h.templatesDir, ".active"), "utf8"),
    "terse.md\n",
  );
  assert.deepEqual(ui.notices, [
    {
      message: "active template: terse.md (applies next message)",
      type: undefined,
    },
  ]);
  // The bare command opens the action menu first, then routes.
  const menu = stubUi({
    select: (title, options) =>
      title === "System prompt:" ? "switch" : options[0],
  });
  await h.command("", menu.ctx);
  assert.deepEqual(
    menu.selects.map((s) => s.title),
    ["System prompt:", "Active template:"],
  );
  assert.deepEqual(menu.selects[0]?.options, [
    "switch",
    "new",
    "inspect",
    "test",
  ]);
  assert.equal(
    fs.readFileSync(path.join(h.templatesDir, ".active"), "utf8"),
    "terse.md\n",
  );
});

test("wiring: cancelled picker writes nothing", async () => {
  const h = harness();
  seed(h.templatesDir, { "default.md": "D", "terse.md": "T" });
  const cancelled = stubUi({ select: () => undefined });
  await h.command("switch", cancelled.ctx);
  assert.equal(cancelled.selects.length, 1);
  assert.equal(fs.existsSync(path.join(h.templatesDir, ".active")), false);
  assert.deepEqual(cancelled.notices, []);
  // Cancelling the action menu itself is equally inert.
  const menuCancel = stubUi({ select: () => undefined });
  await h.command("", menuCancel.ctx);
  assert.equal(menuCancel.selects.length, 1);
  assert.equal(fs.existsSync(path.join(h.templatesDir, ".active")), false);
  assert.deepEqual(menuCancel.notices, []);
});

test("wiring: switch with empty templates dir notifies and writes nothing", async () => {
  const h = harness();
  const ui = stubUi({ select: () => "anything" });
  await h.command("switch", ui.ctx);
  assert.deepEqual(ui.selects, []);
  assert.deepEqual(ui.notices, [
    { message: "no templates found", type: "warning" },
  ]);
  assert.deepEqual(fs.readdirSync(h.templatesDir), []);
});

test("wiring: unknown argument notifies usage and does nothing", async () => {
  const h = harness();
  seed(h.templatesDir, { "default.md": "D" });
  const ui = stubUi({ select: () => "switch" });
  await h.command("bogus", ui.ctx);
  assert.deepEqual(ui.selects, []);
  assert.deepEqual(ui.inputs, []);
  assert.deepEqual(ui.notices, [
    { message: "usage: /sysprompt [switch|new|inspect|test]", type: "warning" },
  ]);
  assert.equal(fs.existsSync(path.join(h.templatesDir, ".active")), false);
  assert.deepEqual(fs.readdirSync(h.artifactsDir), []);
  // K5 placeholder: test is notify-only until P3.1.
  for (const action of ["test"]) {
    const k5 = stubUi({ select: () => "switch", input: () => "x" });
    await h.command(action, k5.ctx);
    assert.deepEqual(k5.selects, []);
    assert.deepEqual(k5.inputs, []);
    assert.deepEqual(k5.notices, [
      { message: `${action}: not built yet`, type: "warning" },
    ]);
    assert.deepEqual(fs.readdirSync(h.artifactsDir), []);
    assert.deepEqual(fs.readdirSync(h.templatesDir), ["default.md"]);
  }
});

test("wiring: new with no active template notifies and creates nothing", async () => {
  const h = harness();
  const ui = stubUi({ input: () => "fresh" });
  await h.command("new", ui.ctx);
  assert.deepEqual(ui.inputs, ["Template name:"]);
  assert.deepEqual(ui.notices, [
    { message: "no active template to copy", type: "warning" },
  ]);
  assert.deepEqual(fs.readdirSync(h.templatesDir), []);
});

test("wiring: cancelled name input creates nothing", async () => {
  const h = harness();
  seed(h.templatesDir, { "default.md": "D" });
  const ui = stubUi({ input: () => undefined });
  await h.command("new", ui.ctx);
  assert.deepEqual(ui.inputs, ["Template name:"]);
  assert.deepEqual(ui.notices, []);
  assert.deepEqual(fs.readdirSync(h.templatesDir), ["default.md"]);
  // The happy path through the same wiring copies the *active* template
  // (a non-default one, so copying default.md would fail this) and notifies.
  seed(h.templatesDir, { "voice.md": "VOICE BYTES\n" });
  fs.writeFileSync(path.join(h.templatesDir, ".active"), "voice.md\n");
  const ok = stubUi({ input: () => "fresh" });
  await h.command("new", ok.ctx);
  assert.equal(
    fs.readFileSync(path.join(h.templatesDir, "fresh.md"), "utf8"),
    "VOICE BYTES\n",
  );
  assert.equal(ok.notices.length, 1);
  assert.match(
    ok.notices[0]!.message,
    /created .*fresh\.md \(copy of voice\.md\)/,
  );
  // Surrounding whitespace is not trimmed: the raw input must match the grammar.
  const padded = stubUi({ input: () => " padded " });
  await h.command("new", padded.ctx);
  assert.equal(padded.notices[0]?.type, "error");
  assert.equal(fs.existsSync(path.join(h.templatesDir, "padded.md")), false);
  // A second attempt with the same name is refused at the wiring level.
  const dup = stubUi({ input: () => "fresh" });
  await h.command("new", dup.ctx);
  assert.deepEqual(dup.notices, [
    { message: "fresh.md already exists", type: "error" },
  ]);
});

test("wiring: inspect action writes the immediate dump file and arms capture", async () => {
  const h = harness();
  takeArmedCapture(); // start disarmed regardless of earlier tests
  const ui = stubUi({
    systemPromptOptions: {
      cwd: "/tmp",
      selectedTools: ["read"],
      toolSnippets: { read: "Read file contents" },
    },
  });
  await h.command("inspect", ui.ctx);
  const inspectDir = path.join(h.artifactsDir, "inspect");
  const files = fs.readdirSync(inspectDir);
  assert.equal(files.length, 1);
  assert.match(files[0]!, /^\d{4}-\d{2}-\d{2}-\d{6}-immediate\.md$/);
  const body = fs.readFileSync(path.join(inspectDir, files[0]!), "utf8");
  assert.match(
    body,
    /^# System prompt \(best-effort rebuild at command time\)\n/,
  );
  assert.match(body, /## Selected tools\n\n- read: Read file contents\n/);
  assert.equal(ui.notices.length, 1);
  assert.equal(ui.notices[0]!.type, undefined);
  assert.ok(ui.notices[0]!.message.includes(path.join(inspectDir, files[0]!)));
  assert.match(
    ui.notices[0]!.message,
    /send any message to capture the ground-truth dump/,
  );
  const stamp = files[0]!.replace(/-immediate\.md$/, "");
  assert.equal(takeArmedCapture(), stamp, "armed with the file's stamp");
  assert.equal(takeArmedCapture(), null);
  // A second inspect within the same second resolves its own collision.
  await h.command("inspect", ui.ctx);
  assert.equal(fs.readdirSync(inspectDir).length, 2);
  takeArmedCapture();
});

test("wiring: immediate dump write failure notifies error and does not arm", async () => {
  // A regular file where the artifacts directory should be makes mkdir fail.
  const blocker = path.join(tempDir("blocker"), "artifacts");
  fs.writeFileSync(blocker, "not a directory");
  const h = harness({ artifactsDir: blocker });
  const ui = stubUi({});
  await h.command("inspect", ui.ctx);
  assert.equal(ui.notices.length, 1);
  assert.equal(ui.notices[0]!.type, "error");
  assert.equal(takeArmedCapture(), null, "nothing armed");
  assert.equal(fs.readFileSync(blocker, "utf8"), "not a directory");
});
