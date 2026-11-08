// Small shared helpers: HTML escaping, Python syntax highlighting, WAV I/O, hashing.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 16);

// ---- tiny Python highlighter (v variable, n number, s string, f call, o operator) ----
export function hl(line) {
  const out = []; const re = /("[^"]*"|'[^']*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g; let m;
  while ((m = re.exec(line))) {
    if (m[1]) out.push(["s", m[1]]);
    else if (m[2]) out.push(["n", m[2]]);
    else if (m[3]) out.push([/^\s*\(/.test(line.slice(re.lastIndex)) ? "f" : "v", m[3]]);
    else out.push(["o", m[0]]);
  }
  return out.map(([c, x]) => `<span class="${c}">${esc(x)}</span>`).join("");
}

// ---- WAV (PCM16 / float32, any rate, mono or stereo -> mono Float32Array) ----
export function readWav(path) {
  const b = readFileSync(path);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${path}: not a WAV file`);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4); let size = b.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { tag: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === "data") { size = Math.min(size, b.length - p - 8); data = b.subarray(p + 8, p + 8 + size); break; }
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${path}: missing fmt/data chunk`);
  const bps = fmt.bits / 8, frames = Math.floor(data.length / (bps * fmt.ch)), out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let acc = 0;
    for (let c = 0; c < fmt.ch; c++) {
      const o = (i * fmt.ch + c) * bps;
      acc += fmt.tag === 3 ? data.readFloatLE(o) : fmt.bits === 16 ? data.readInt16LE(o) / 32768 : fmt.bits === 8 ? (data[o] - 128) / 128 : NaN;
    }
    out[i] = acc / fmt.ch;
  }
  if (Number.isNaN(out[0])) throw new Error(`${path}: unsupported WAV format (tag ${fmt.tag}, ${fmt.bits} bit)`);
  return { samples: out, rate: fmt.rate };
}
export function wavDuration(path) { const { samples, rate } = readWav(path); return samples.length / rate; }
export function writeWav(path, samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  writeFileSync(path, buf);
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
