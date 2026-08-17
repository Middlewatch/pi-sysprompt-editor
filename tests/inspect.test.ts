/**
 * Unit tests for lib/inspect.ts: golden byte-compares of the immediate dump,
 * the model label fallback, stamp and collision helpers, and the one-shot
 * armed capture state. No Pi process and no provider request.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
  armCapture,
  freeBase,
  makeStamp,
  modelLabel,
  renderImmediateDump,
  takeArmedCapture,
} from "../lib/inspect.ts";

const GOLDEN = new URL("../fixtures/golden/", import.meta.url);

function golden(name: string): { input: unknown; expected: string } {
  const input = JSON.parse(
    fs.readFileSync(new URL(`${name}.input.json`, GOLDEN), "utf8"),
  );
  const expected = fs.readFileSync(new URL(`${name}.md`, GOLDEN), "utf8");
  return { input, expected };
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sysprompt-inspect-"));
}

test("immediate dump: golden byte-compare", () => {
  const { input, expected } = golden("immediate-dump");
  assert.equal(renderImmediateDump(input as never), expected);
});

test("model label: undefined model yields unknown provider and model id", () => {
  assert.deepEqual(modelLabel(undefined), {
    provider: "unknown",
    modelId: "unknown",
  });
  assert.deepEqual(modelLabel({ provider: "anthropic", id: "claude-x" }), {
    provider: "anthropic",
    modelId: "claude-x",
  });
});

test("stamp: makeStamp zero-pads local time and freeBase suffixes on any collision", () => {
  // Month, day, hour, minute, second all single-digit to exercise padding.
  assert.equal(makeStamp(new Date(2026, 0, 5, 3, 7, 9)), "2026-01-05-030709");
  assert.equal(
    makeStamp(new Date(2026, 11, 31, 23, 59, 59)),
    "2026-12-31-235959",
  );
  const dir = tempDir();
  assert.equal(freeBase(dir, "x", [".md", ".txt"]), "x");
  fs.writeFileSync(path.join(dir, "x.txt"), "");
  assert.equal(freeBase(dir, "x", [".md", ".txt"]), "x-2");
  fs.writeFileSync(path.join(dir, "x-2.md"), "");
  assert.equal(freeBase(dir, "x", [".md", ".txt"]), "x-3");
  // A single-extension query ignores the other family's files.
  assert.equal(freeBase(dir, "x", [".md"]), "x");
});

test("immediate dump: empty options golden byte-compare", () => {
  const { input, expected } = golden("immediate-dump-empty");
  assert.deepEqual(Object.keys(input as object), ["cwd"]);
  assert.equal(renderImmediateDump(input as never), expected);
});

test("arm: capture is one-shot", () => {
  assert.equal(takeArmedCapture(), null);
  armCapture("2026-01-01-000000");
  assert.equal(takeArmedCapture(), "2026-01-01-000000");
  assert.equal(takeArmedCapture(), null);
  // Re-arming replaces the pending stamp rather than queueing.
  armCapture("a");
  armCapture("b");
  assert.equal(takeArmedCapture(), "b");
  assert.equal(takeArmedCapture(), null);
});
