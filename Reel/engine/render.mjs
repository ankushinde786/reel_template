// Built-in renderer: headless Chrome seeks the paused GSAP timeline frame by frame, ffmpeg encodes.
// `npm run render:hf` uses the official HyperFrames CLI instead; this one needs only Chrome + ffmpeg.
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { openPage } from "./chrome.mjs";

export async function renderVideo({ indexHtml, out, width, height, fps, t0 = 0, t1, log = console.log }) {
  const page = await openPage({ width, height });
  await page.goto(pathToFileURL(indexHtml).href, 1500);
  await page.ev(`window.__seek = (t) => {
    document.querySelectorAll('.clip').forEach((el) => { const s = parseFloat(el.dataset.start), d = parseFloat(el.dataset.duration); el.style.display = (t >= s && t < s + d) ? '' : 'none'; });
    window.__timelines.main.seek(t, false); return true; }`);
  const dur = parseFloat(await page.ev(`document.getElementById('root').dataset.duration`));
  const end = t1 ?? dur, frames = Math.round((end - t0) * fps);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < frames; i++) {
    await page.ev(`window.__seek(${(t0 + i / fps).toFixed(4)})`);
    if (!ff.stdin.write(await page.shot({ format: "jpeg", quality: 95 }))) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) log(`  frame ${i}/${frames}`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); page.close();
}
