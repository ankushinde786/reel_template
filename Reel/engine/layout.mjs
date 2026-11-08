// Frame geometry. One object `G` describes where everything lives for the chosen layout preset (reel.config.json -> layout.presets).
// Scenes read G instead of hard-coding pixels, so a new preset (or a different frame size) needs no scene changes.
export function geometry(cfg, presetName) {
  const L = cfg.layout, P = L.presets[presetName];
  if (!P) throw new Error(`Unknown layout "${presetName}". Options: ${Object.keys(L.presets).join(", ")}`);
  const W = cfg.video.width, H = cfg.video.height, m = L.margin ?? 108;
  return {
    W, H, preset: presetName, left: m, width: W - 2 * m,
    tabbar: { top: 168, h: 84 },
    header: { chip: 270, title: 318, desc: 398 },
    stage: { top: 456, bottom: P.stageBottom, h: P.stageBottom - 456 },
    term: P.term || null,                                  // fixed terminal panel (classic only)
    caps: { top: P.capsTop, h: Math.max(cfg.captions.lineHeight * 2, 116) },
    deco: L.deco && P.decoHeight > 0 ? { top: P.decoTop, h: P.decoHeight } : null,
    status: { top: H - 84, h: 84 },
  };
}

export const sec = (n) => n.toFixed(3);
export const fitPx = (text, max, em, boxW) => Math.min(max, Math.floor(boxW / (Math.max(1, String(text).length) * em)));
