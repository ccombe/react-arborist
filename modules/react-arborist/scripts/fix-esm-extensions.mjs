#!/usr/bin/env node
/*
 * tsc (--module esnext --moduleResolution bundler) emits extensionless
 * relative specifiers (e.g. `from "./components/tree"`). That's fine for
 * bundlers, but Node's native ESM resolver — and TypeScript `nodenext`
 * consumers reading dist/module *.d.ts — require an explicit extension.
 * This rewrites emitted dist/module **\/*.{js,d.ts} in place, and marks the
 * directory as ESM, so the build that ships under the `exports.import`
 * condition resolves under plain `node` / `nodenext`.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  watch,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import ts from "typescript";

const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const distModuleArg = args.find((arg) => !arg.startsWith("--"));

if (!distModuleArg) {
  console.error("Usage: fix-esm-extensions.mjs <dist-module-dir> [--watch]");
  process.exit(1);
}

const distModule = resolve(distModuleArg);

/*
 * Specifiers are located by parsing, not by matching text: a relative import
 * inside a JSDoc example or a string literal survives into the emit, and a
 * text scan would rewrite it (or, if it names something that doesn't exist,
 * fail the build over a comment). tsc is already a prerequisite of this step,
 * so its parser costs nothing extra.
 */
function collectSpecifiers(sourceFile) {
  const specifiers = [];

  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier);
    } else if (
      // `import("...").Foo` in type position — how tsc emits type-only imports
      // into the .d.ts, including the bare `import("..")` of the package root.
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return specifiers;
}

function resolveSpecifier(fileDir, specifier) {
  const target = resolve(fileDir, specifier);
  if (existsSync(`${target}.js`) || existsSync(`${target}.d.ts`)) {
    return `${specifier}.js`;
  }
  if (existsSync(join(target, "index.js")) || existsSync(join(target, "index.d.ts"))) {
    return `${specifier}/index.js`;
  }
  throw new Error(`Could not resolve relative specifier "${specifier}" from ${fileDir}`);
}

function fixFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, false);
  const fileDir = dirname(filePath);

  const edits = [];
  for (const node of collectSpecifiers(sourceFile)) {
    const specifier = node.text;
    if (!specifier.startsWith(".")) continue;
    if (/\.[cm]?js$|\.json$/.test(specifier)) continue;
    const quote = original[node.end - 1];
    edits.push({
      start: node.getStart(sourceFile),
      end: node.end,
      text: `${quote}${resolveSpecifier(fileDir, specifier)}${quote}`,
    });
  }

  if (edits.length === 0) return;

  // Back to front, so earlier offsets stay valid.
  let fixed = original;
  for (const edit of edits.reverse()) {
    fixed = fixed.slice(0, edit.start) + edit.text + fixed.slice(edit.end);
  }
  writeFileSync(filePath, fixed);
}

function run() {
  for (const entry of readdirSync(distModule, { recursive: true })) {
    if (entry.endsWith(".js") || entry.endsWith(".d.ts")) {
      fixFile(join(distModule, entry));
    }
  }

  // Bundlers stop at the nearest package.json, so this one has to restate
  // `sideEffects` or it shadows the root manifest's and kills tree-shaking.
  writeFileSync(
    join(distModule, "package.json"),
    JSON.stringify({ type: "module", sideEffects: false }, null, 2) + "\n",
  );
}

if (watchMode && !existsSync(distModule)) mkdirSync(distModule, { recursive: true });

try {
  run();
} catch (error) {
  // watch:tsc and watch:esm-extensions start in parallel, so this first pass is
  // exposed to the same partial-emit race as the debounced one below — let that
  // pass recover instead of taking the session down. A one-shot build has no
  // next pass, so there the failure stays fatal.
  if (!watchMode) throw error;
  console.error(`fix-esm-extensions: ${error.message}`);
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isRecursiveWatchUnsupported(error) {
  return error?.code === "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM" || error?.code === "ENOSYS";
}

function closeWatcher(watcher) {
  try {
    watcher?.close();
  } catch {
    // already closed
  }
}

function ensureWatchRoot() {
  if (!existsSync(distModule)) mkdirSync(distModule, { recursive: true });
}

// Linux `fs.watch` has no recursive option. Walk existing dirs and attach a
// watcher to each; attach again when tsc creates a nested folder mid-session.
function watchNestedDirs(root, onFileChange, onNewDir) {
  const watched = new Map();

  const attach = (dir) => {
    if (watched.has(dir)) return;
    const watcher = watch(dir, (event, filename) => {
      if (filename) {
        const child = join(dir, filename);
        if (isDir(child)) {
          attach(child);
          onNewDir();
        }
      }
      onFileChange(event, filename);
    });
    watcher.on("error", (error) => {
      console.error(`fix-esm-extensions: ${error.message}`);
      watched.delete(dir);
    });
    watched.set(dir, watcher);
  };

  const walk = (dir) => {
    attach(dir);
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
    }
  };

  walk(root);

  return () => {
    for (const watcher of watched.values()) closeWatcher(watcher);
    watched.clear();
  };
}

if (watchMode) {
  // ponytail: debounced re-run of the whole (idempotent, ~50-file) pass rather
  // than tracking which files tsc just touched. Narrow it if the dist grows.
  let timer;
  const scheduleRun = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        run();
      } catch (error) {
        // A partially emitted tsc batch can fail to resolve; the next pass fixes it.
        console.error(`fix-esm-extensions: ${error.message}`);
      }
    }, 100);
  };
  const onChange = (_event, filename) => {
    if (!filename || !(filename.endsWith(".js") || filename.endsWith(".d.ts"))) return;
    scheduleRun();
  };

  let stopInner = () => {};
  let parentWatcher;

  const startInner = () => {
    stopInner();
    ensureWatchRoot();
    try {
      const watcher = watch(distModule, { recursive: true }, onChange);
      watcher.on("error", (error) => {
        console.error(`fix-esm-extensions: ${error.message}`);
        setTimeout(startInner, 100);
      });
      stopInner = () => closeWatcher(watcher);
    } catch (error) {
      if (!isRecursiveWatchUnsupported(error)) throw error;
      console.warn("fix-esm-extensions: recursive watch unavailable; watching nested directories");
      stopInner = watchNestedDirs(distModule, onChange, scheduleRun);
    }
  };

  // macOS recursive watch goes inert (no error) if the root is rm -rf'd.
  // Watch the parent so a delete/recreate re-attaches and the next tsc emit is fixed.
  const startParent = () => {
    closeWatcher(parentWatcher);
    ensureWatchRoot();
    const rootName = basename(distModule);
    parentWatcher = watch(dirname(distModule), (_event, filename) => {
      if (filename !== rootName) return;
      if (existsSync(distModule)) {
        startInner();
        scheduleRun();
      } else {
        console.error("fix-esm-extensions: watch root disappeared; waiting for it to return");
      }
    });
    parentWatcher.on("error", (error) => {
      console.error(`fix-esm-extensions: ${error.message}`);
      setTimeout(() => {
        startParent();
        startInner();
      }, 100);
    });
  };

  startParent();
  startInner();
}
