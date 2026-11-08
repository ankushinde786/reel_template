// Sound-effect scheduler: applies the global flags and records every effect on a timeline.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { KIT } from "./config.mjs";

export function createSfx(sound) {
  const cats = sound.sfx.categories, kinds = Object.keys(cats), events = [], fileDur = {};
  for (const [k, c] of Object.entries(cats)) {
    const p = join(KIT, c.file);
    fileDur[k] = existsSync(p) ? (statSync(p).size - 44) / (44100 * 2) : 0;
  }
  function S(kind, t, dur) {
    const c = cats[kind];
    if (!c) throw new Error("unknown sound " + kind);
    if (!c.enabled || !sound.sfx.enabled || !fileDur[kind]) return;
    const vol = +(sound.master * sound.sfx.volume * c.volume).toFixed(4);
    if (vol > 0) events.push({ kind, t: +t.toFixed(3), dur: +Math.min(dur ?? fileDur[kind], fileDur[kind]).toFixed(3), vol });
  }
  return { S, events, kinds, cats };
}
