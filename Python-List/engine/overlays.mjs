// Always-on layers: channel logo (top-right by default) and a "Coding Archives" watermark across the screen.
// Positions use an `anchor` plus x / y offsets in px:
//   anchor: top-left | top-center | top-right | center-left | center | center-right | bottom-left | bottom-center | bottom-right
//   x, y  : distance moved INWARD from the anchored edge (for center anchors: +x = right, +y = down).
import { esc } from "./util.mjs";

export const ANCHORS = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"];

export function place(anchor = "center", x = 0, y = 0, rotate = 0) {
  if (!ANCHORS.includes(anchor)) throw new Error(`Bad anchor "${anchor}". Use one of: ${ANCHORS.join(", ")}`);
  const [v, h] = anchor === "center" ? ["center", "center"] : anchor.split("-");
  let s = "position:absolute;", tx = "0", ty = "0";
  if (h === "left") s += `left:${x}px;`; else if (h === "right") s += `right:${x}px;`; else { s += `left:calc(50% + ${x}px);`; tx = "-50%"; }
  if (v === "top") s += `top:${y}px;`; else if (v === "bottom") s += `bottom:${y}px;`; else { s += `top:calc(50% + ${y}px);`; ty = "-50%"; }
  return s + `transform:translate(${tx},${ty}) rotate(${rotate}deg);transform-origin:center;`;
}

/** returns { logo, watermark } HTML strings ("" when disabled) */
export function overlays(cfg, logoSrc) {
  let logo = "", watermark = "";
  const L = cfg.logo;
  if (L?.enabled && logoSrc) logo = `<img id="logo" src="${esc(logoSrc)}" alt="" style="${place(L.anchor, L.x, L.y)}width:${L.width}px;height:auto;opacity:${L.opacity};z-index:30;pointer-events:none">`;
  const W = cfg.watermark;
  if (W?.enabled && W.text) {
    const style = (extra = "") => `font:700 ${W.fontSize}px Inter,sans-serif;letter-spacing:${W.letterSpacing ?? 0}px;color:${W.color};opacity:${W.opacity};white-space:nowrap;z-index:20;pointer-events:none;user-select:none;${extra}`;
    if (W.tile) {   // repeated diagonal pattern over the whole frame
      const rows = Math.ceil(2600 / W.tileGapY), cols = Math.ceil(2600 / W.tileGapX);
      let items = ""; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) items += `<span style="position:absolute;left:${c * W.tileGapX + (r % 2 ? W.tileGapX / 2 : 0) - 600}px;top:${r * W.tileGapY - 300}px;${style()}">${esc(W.text)}</span>`;
      watermark = `<div id="watermark" style="position:absolute;left:${W.x}px;top:${W.y}px;width:1080px;height:1920px;overflow:visible;transform:rotate(${W.rotate}deg);transform-origin:center;z-index:20;pointer-events:none">${items}</div>`;
    } else watermark = `<div id="watermark" style="${place(W.anchor, W.x, W.y, W.rotate)}${style()}">${esc(W.text)}</div>`;
  }
  return { logo, watermark };
}
