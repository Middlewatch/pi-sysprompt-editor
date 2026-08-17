/**
 * Template store: the templates directory holds `*.md` templates and a
 * gitignored one-line `.active` pointer naming the selected file. Every
 * function takes the templates directory as its first argument; the caller
 * supplies the real path or a temp dir.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_TEMPLATE = "default.md";
const POINTER_FILE = ".active";
const VALID_POINTER = /^[a-z0-9-]+\.md$/;

/**
 * Templates in the directory: the resolved active template first (the one
 * the splice would actually use), then the rest alphabetically.
 */
export function listTemplates(dir: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const names = entries.filter((n) => n.endsWith(".md")).sort();
  const active = readActiveTemplate(dir)?.name;
  if (active !== undefined) {
    const i = names.indexOf(active);
    if (i > 0) {
      names.splice(i, 1);
      names.unshift(active);
    }
  }
  return names;
}

/** The pointer file's content when it is a valid template filename, else null. */
function readPointer(dir: string): string | null {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(dir, POINTER_FILE), "utf8");
  } catch {
    return null;
  }
  const name = raw.trim();
  return VALID_POINTER.test(name) ? name : null;
}

/**
 * Resolve the active template: a valid pointer naming an existing file, else
 * default.md, else null (the caller fails open to the stock prompt).
 */
export function readActiveTemplate(
  dir: string,
): { name: string; content: string } | null {
  const candidates = [readPointer(dir), DEFAULT_TEMPLATE].filter(
    (n): n is string => n !== null,
  );
  for (const name of candidates) {
    try {
      return { name, content: fs.readFileSync(path.join(dir, name), "utf8") };
    } catch {
      // fall through to the next candidate
    }
  }
  return null;
}

/** Write the pointer file naming `name`. */
export function setActiveTemplate(dir: string, name: string): void {
  fs.writeFileSync(path.join(dir, POINTER_FILE), name + "\n", "utf8");
}
