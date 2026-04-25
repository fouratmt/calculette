const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { TextEncoder } = require("node:util");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const CORE_SCRIPT_PATHS = [
  "src/lib/date-utils.js",
  "src/data/holidays-fr.js",
  "src/data/storage.js",
  "src/core/calculations.js",
];

function createLocalStorage(initialEntries) {
  const storageEntries = new Map(
    Object.entries(initialEntries || {}).map(function mapEntry([key, value]) {
      return [String(key), String(value)];
    }),
  );

  return {
    clear() {
      storageEntries.clear();
    },
    getItem(key) {
      return storageEntries.has(String(key)) ? storageEntries.get(String(key)) : null;
    },
    key(index) {
      return Array.from(storageEntries.keys())[index] || null;
    },
    removeItem(key) {
      storageEntries.delete(String(key));
    },
    setItem(key, value) {
      storageEntries.set(String(key), String(value));
    },
    get length() {
      return storageEntries.size;
    },
  };
}

function loadScripts(context, scriptPaths) {
  for (const scriptPath of scriptPaths) {
    const absolutePath = path.join(ROOT_DIR, scriptPath);
    const source = fs.readFileSync(absolutePath, "utf8");
    vm.runInContext(source, context, { filename: absolutePath });
  }
}

function createBrowserContext(options) {
  const localStorage = createLocalStorage(options?.localStorage);
  const context = {
    Array,
    Blob,
    Boolean,
    Date: options?.Date || Date,
    Intl,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Set,
    String,
    TextEncoder,
    clearTimeout,
    console,
    localStorage,
    setTimeout,
  };

  context.crypto =
    options?.crypto ||
    {
      randomUUID() {
        return "test-session-id";
      },
    };
  context.window = context;
  context.self = context;
  context.globalThis = context;

  return {
    context: vm.createContext(context),
    localStorage,
  };
}

function loadCoreModules(options) {
  const runtime = createBrowserContext(options);
  loadScripts(runtime.context, CORE_SCRIPT_PATHS);
  return runtime;
}

module.exports = {
  loadCoreModules,
};
