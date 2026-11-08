// Headless Chrome over the DevTools protocol (Node >= 22 built-in WebSocket). No npm packages needed.
// Used for the thumbnail PNGs and for the built-in frame renderer.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sleep } from "./util.mjs";

export function findChrome() {
  const c = [process.env.CHROME_PATH, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.HOME && join(process.env.HOME, ".cache/puppeteer/chrome-headless-shell")].filter(Boolean);
  const hit = c.find((p) => existsSync(p) && !p.endsWith("chrome-headless-shell"));
  if (!hit) throw new Error("Chrome/Chromium not found. Install Chrome or set CHROME_PATH=/path/to/chrome");
  return hit;
}

export async function openPage({ width, height, scale = 1 }) {
  const port = 9300 + Math.floor(Math.random() * 600), dir = mkdtempSync(join(tmpdir(), "reelkit-chrome-"));
  const proc = spawn(findChrome(), ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    "--force-color-profile=srgb", `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, `--user-data-dir=${dir}`, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 80; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some((t) => t.type === "page")) break; } catch {} await sleep(250); }
  const tgt = targets?.find((t) => t.type === "page");
  if (!tgt) { proc.kill(); throw new Error("Chrome did not start"); }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = d.id && pend.get(d.id); if (p) { pend.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
  const ev = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails)); return r.result.value; };
  return {
    send, ev,
    async goto(url, settle = 700) { await send("Page.navigate", { url }); await sleep(settle); await ev("document.fonts.ready.then(() => true)"); },
    async shot({ format = "png", quality = 95 } = {}) {
      const { data } = await send("Page.captureScreenshot", { format, quality, clip: { x: 0, y: 0, width, height, scale: 1 } });
      return Buffer.from(data, "base64");
    },
    close() { try { ws.close(); } catch {} proc.kill(); },
  };
}
