// Save still frames of a built reel to check the look without rendering the whole video.
//   node tools/frame.mjs python-tuples 2 10 20     -> out/python-tuples/frames/f-2.png, f-10.png, ...
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { openPage } from "../engine/chrome.mjs";
import { KIT } from "../engine/config.mjs";
const [id, ...times] = process.argv.slice(2);
if (!id || !times.length) { console.log("usage: node tools/frame.mjs <reel-id> <sec> [sec ...]"); process.exit(1); }
const dir = join(KIT, "out", id), page = await openPage({ width: 1080, height: 1920 });
await page.goto(pathToFileURL(join(dir, "index.html")).href, 1500);
await page.ev(`window.__seek = (t) => { document.querySelectorAll('.clip').forEach((el) => { const s = parseFloat(el.dataset.start), d = parseFloat(el.dataset.duration); el.style.display = (t >= s && t < s + d) ? '' : 'none'; }); window.__timelines.main.seek(t, false); }`);
mkdirSync(join(dir, "frames"), { recursive: true });
for (const t of times) { await page.ev(`window.__seek(${t})`); writeFileSync(join(dir, "frames", `f-${t}.png`), await page.shot()); console.log(`out/${id}/frames/f-${t}.png`); }
page.close();
