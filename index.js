"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const connectToDevTools = require("chrome-remote-interface");
const { DEFAULT_THEME, derivePalette, normalizeTheme } = require("./theme-core");

const PORT = 9222;
const HOST = "127.0.0.1";
const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 750;
const THEME_FILE = path.join(__dirname, "theme.json");
const CSS_FILE = path.join(__dirname, "theme.css");
const EDITOR_CSS_FILE = path.join(__dirname, "editor.css");
const EDITOR_JS_FILE = path.join(__dirname, "theme-editor.js");
const THEME_SAVE_BINDING = "__slippiThemeSave";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function compileTheme(config, cssTemplate) {
  const variables = Object.entries(derivePalette(config))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${cssTemplate}\n:root {\n${variables}\n}\n`;
}

function prefixSvgIds(svg) {
  const ids = new Map();
  const prefixed = svg.replace(/\bid="([^"]+)"/g, (_match, id) => {
    const prefixedId = `slt-${id}`;
    ids.set(id, prefixedId);
    return `id="${prefixedId}"`;
  });
  return [...ids.entries()].reduce(
    (result, [id, prefixedId]) =>
      result
        .replaceAll(`url(#${id})`, `url(#${prefixedId})`)
        .replaceAll(`href="#${id}"`, `href="#${prefixedId}"`),
    prefixed,
  );
}

function makeBootstrapSource(theme) {
  return `(() => {
    if (window.location.protocol !== "file:") return;
    window.__SLIPPI_THEME_CSS__ = ${JSON.stringify(theme.css)};
    window.__SLIPPI_THEME_EDITOR_CSS__ = ${JSON.stringify(theme.editorCss)};
    window.__SLIPPI_THEME_CONFIG__ = ${JSON.stringify(theme.config)};
    window.__SLIPPI_THEME_DEFAULT__ = ${JSON.stringify(DEFAULT_THEME)};
    window.__SLIPPI_CHAMELEON_ICON__ = ${JSON.stringify(theme.iconSvg)};
    ${theme.coreJs}
    ${theme.editorJs}
  })();`;
}

async function getTargets() {
  const response = await fetch(`http://${HOST}:${PORT}/json/list`, {
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) {
    throw new Error(`DevTools returned HTTP ${response.status}`);
  }
  return response.json();
}

function findMainWindow(targets) {
  return targets.find((target) => {
    if (target.type !== "page" || !target.webSocketDebuggerUrl) {
      return false;
    }
    try {
      const url = new URL(target.url);
      return url.protocol === "file:" && /(?:^|\/)index\.html$/i.test(url.pathname);
    } catch {
      return false;
    }
  });
}

function getLauncherPath() {
  if (process.platform !== "win32") {
    throw new Error("This launcher helper must be run on Windows.");
  }
  if (!process.env.LOCALAPPDATA) {
    throw new Error("LOCALAPPDATA is not set; cannot locate Slippi Launcher.");
  }

  return path.win32.join(process.env.LOCALAPPDATA, "Programs", "Slippi Launcher", "Slippi Launcher.exe");
}

function launchLauncher(executablePath) {
  const child = spawn(executablePath, [`--remote-debugging-port=${PORT}`], {
    cwd: path.win32.dirname(executablePath),
    detached: true,
    stdio: "ignore",
  });
  child.on("error", (error) => {
    console.error(`Could not start Slippi Launcher: ${error.message}`);
  });
  child.unref();
}

async function waitForMainWindow() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError = "No Slippi Launcher main-window target was listed.";

  while (Date.now() < deadline) {
    try {
      const target = findMainWindow(await getTargets());
      if (target) {
        return target;
      }
    } catch (error) {
      lastError = error.message;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `No main-window target appeared on CDP port ${PORT} within ${STARTUP_TIMEOUT_MS / 1000}s. ` +
      `Close every Slippi Launcher instance and rerun this script. Last check: ${lastError}`,
  );
}

async function readThemeFiles() {
  const [themeText, cssTemplate, editorCss, coreJs, editorJs] = await Promise.all([
    fs.promises.readFile(THEME_FILE, "utf8"),
    fs.promises.readFile(CSS_FILE, "utf8"),
    fs.promises.readFile(EDITOR_CSS_FILE, "utf8"),
    fs.promises.readFile(path.join(__dirname, "theme-core.js"), "utf8"),
    fs.promises.readFile(EDITOR_JS_FILE, "utf8"),
  ]);
  let iconSvg = "";
  try {
    iconSvg = prefixSvgIds(
      await fs.promises.readFile(path.join(__dirname, "assets", "slippi-chameleon.svg"), "utf8"),
    );
  } catch {
    iconSvg = "";
  }
  let config;
  try {
    config = normalizeTheme(JSON.parse(themeText));
  } catch (error) {
    throw new Error(`Invalid JSON in ${THEME_FILE}: ${error.message}`);
  }
  derivePalette(config);
  return {
    config,
    css: compileTheme(config, cssTemplate),
    editorCss,
    coreJs,
    editorJs,
    iconSvg,
    iconStatus: iconSvg ? "ok" : "missing",
  };
}

async function main() {
  const executablePath = getLauncherPath();
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Slippi Launcher was not found at ${executablePath}`);
  }

  launchLauncher(executablePath);
  console.log(`Started Slippi Launcher with remote debugging on port ${PORT}.`);

  let compiledTheme = await readThemeFiles();
  console.log(`Slippi Chameleon icon asset: ${compiledTheme.iconStatus}`);
  let active = null;

  async function applyTheme(client, theme) {
    const source = makeBootstrapSource(theme);
    const { identifier } = await client.Page.addScriptToEvaluateOnNewDocument({
      source,
    });
    const previousIdentifier = active?.scriptIdentifier;
    if (active) {
      active.scriptIdentifier = identifier;
    }
    await client.Runtime.evaluate({ expression: source });
    if (previousIdentifier) {
      await client.Page.removeScriptToEvaluateOnNewDocument({
        identifier: previousIdentifier,
      });
    }
  }

  async function attach(target) {
    const client = await connectToDevTools({
      target: target.id,
      host: HOST,
      port: PORT,
    });
    const state = { id: target.id, client, scriptIdentifier: null };
    active = state;
    client.on("disconnect", () => {
      if (active === state) {
        active = null;
        console.error("The Slippi Launcher DevTools connection was closed; reconnecting.");
      }
    });
    try {
      await Promise.all([client.Page.enable(), client.Runtime.enable()]);
      await client.Runtime.addBinding({ name: THEME_SAVE_BINDING });
      client.Runtime.on("bindingCalled", ({ name, payload }) => {
        if (name !== THEME_SAVE_BINDING) {
          return;
        }
        saveQueue = saveQueue
          .then(async () => {
            const config = normalizeTheme(JSON.parse(payload));
            derivePalette(config);
            await fs.promises.writeFile(THEME_FILE, `${JSON.stringify(config, null, 2)}\n`);
          })
          .catch((error) => {
            console.error(`Theme save failed: ${error.message}`);
          });
      });
      await applyTheme(client, compiledTheme);
      console.log("Theme injected into the Slippi Launcher main window.");
    } catch (error) {
      if (active === state) {
        active = null;
      }
      await client.close();
      throw error;
    }
  }

  let saveQueue = Promise.resolve();

  const initialTarget = await waitForMainWindow();
  await attach(initialTarget);

  const watcher = fs.watch(__dirname, (_eventType, filename) => {
    if (filename && filename.toString() !== path.basename(THEME_FILE)) {
      return;
    }
    clearTimeout(watcher.reloadTimer);
    watcher.reloadTimer = setTimeout(async () => {
      try {
        const nextTheme = await readThemeFiles();
        compiledTheme = nextTheme;
        if (active) {
          await applyTheme(active.client, compiledTheme);
        }
        console.log("Theme reloaded from theme.json.");
      } catch (error) {
        console.error(`Theme reload failed: ${error.message}`);
      }
    }, 150);
  });
  watcher.on("error", (error) => {
    console.error(`Theme file watcher failed: ${error.message}`);
  });

  process.once("SIGINT", async () => {
    watcher.close();
    if (active) {
      await active.client.close();
    }
    process.exit(0);
  });

  for (;;) {
    try {
      const target = findMainWindow(await getTargets());
      if (active && (!target || target.id !== active.id)) {
        const previous = active;
        active = null;
        await previous.client.close();
      }
      if (target && !active) {
        await attach(target);
      }
    } catch (error) {
      console.error(`DevTools connection check failed: ${error.message}`);
    }
    await sleep(1_000);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { ...require("./theme-core"), prefixSvgIds };
