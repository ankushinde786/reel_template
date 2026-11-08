// Auto-layout for flowcharts and block diagrams (no dependencies).
//   layoutGraph({ nodes:[{id,w,h}], edges:[{from,to,label?}], dir:"down"|"right", gapX, gapY })
//   -> { pos:{id:{x,y,w,h}}, routes:[{from,to,label,pts:[[x,y]..],back,long,lab:[x,y]}], bbox:{w,h} }
// Works in an abstract (u = across the layers, v = along the layers) space, then maps to x/y, so "down" and "right" share one code path.
// Layers come from the longest path over forward edges; loop edges (back edges) are routed round the outside, long jumps through a side lane.

export function layoutGraph({ nodes, edges, dir = "down", gapU = 56, gapV = 74 }) {
  const N = nodes.length, idx = new Map(nodes.map((n, i) => [n.id, i]));
  const E = edges.map((e) => ({ ...e, a: idx.get(e.from), b: idx.get(e.to) }));
  for (const e of E) if (e.a == null || e.b == null) throw new Error(`edge ${e.from} -> ${e.to}: unknown node id`);
  const du = dir === "down" ? (n) => n.w : (n) => n.h, dv = dir === "down" ? (n) => n.h : (n) => n.w;

  // 1. back edges by DFS from the first node (then any node not reached)
  const out = Array.from({ length: N }, () => []); E.forEach((e, i) => out[e.a].push(i));
  const state = new Array(N).fill(0);
  const dfs = (u) => { state[u] = 1; for (const i of out[u]) { const v = E[i].b; if (state[v] === 1) E[i].back = true; else if (state[v] === 0) dfs(v); } state[u] = 2; };
  for (let s = 0; s < N; s++) if (state[s] === 0) dfs(s);
  const fwd = E.filter((e) => !e.back && e.a !== e.b);

  // 2. layers = longest path
  const layer = new Array(N).fill(0), indeg = new Array(N).fill(0); fwd.forEach((e) => indeg[e.b]++);
  const q = []; indeg.forEach((d, i) => d === 0 && q.push(i));
  const deg = [...indeg]; while (q.length) { const u = q.shift(); for (const e of fwd.filter((x) => x.a === u)) { layer[e.b] = Math.max(layer[e.b], layer[u] + 1); if (--deg[e.b] === 0) q.push(e.b); } }
  const L = Math.max(...layer) + 1, rows = Array.from({ length: L }, () => []); nodes.forEach((_, i) => rows[layer[i]].push(i));

  // 3. order inside layers (barycentre sweeps keep branches next to their parents)
  const parents = Array.from({ length: N }, () => []), kids = Array.from({ length: N }, () => []); fwd.forEach((e) => { parents[e.b].push(e.a); kids[e.a].push(e.b); });
  const ord = new Array(N); const setOrd = () => rows.forEach((r) => r.forEach((n, k) => (ord[n] = k))); setOrd();
  for (let pass = 0; pass < 4; pass++) {
    const seq = pass % 2 ? [...rows.keys()].reverse() : [...rows.keys()];
    for (const l of seq) {
      const nb = pass % 2 ? kids : parents, key = (n) => (nb[n].length ? nb[n].reduce((a, p) => a + ord[p], 0) / nb[n].length : ord[n]);
      rows[l].sort((x, y) => key(x) - key(y) || ord[x] - ord[y]); setOrd();
    }
  }

  // 4. positions: v from layer thickness, u from relaxation toward neighbours with no overlaps
  const u = new Array(N).fill(0), v = new Array(N).fill(0);
  let vv = 0; rows.forEach((r) => { const th = Math.max(...r.map((n) => dv(nodes[n]))); r.forEach((n) => (v[n] = vv + th / 2)); vv += th + gapV; });
  rows.forEach((r) => { let x = 0; r.forEach((n) => { u[n] = x + du(nodes[n]) / 2; x += du(nodes[n]) + gapU; }); const w = x - gapU; r.forEach((n) => (u[n] -= w / 2)); });
  const settle = (r) => { // resolve overlaps left to right, then re-centre the row around its mean
    for (let k = 1; k < r.length; k++) { const min = u[r[k - 1]] + du(nodes[r[k - 1]]) / 2 + gapU + du(nodes[r[k]]) / 2; if (u[r[k]] < min) u[r[k]] = min; }
  };
  for (let it = 0; it < 8; it++) {
    for (const l of (it % 2 ? [...rows.keys()].reverse() : [...rows.keys()])) {
      const r = rows[l];
      r.forEach((n) => { const nbs = [...parents[n], ...kids[n]]; if (nbs.length) u[n] = (u[n] + nbs.reduce((a, m) => a + u[m], 0) / nbs.length) / 2; });
      settle(r);
      const mid = (u[r[0]] - du(nodes[r[0]]) / 2 + u[r.at(-1)] + du(nodes[r.at(-1)]) / 2) / 2; r.forEach((n) => (u[n] -= mid * 0.5));
    }
  }

  // 5. bounding box in (u,v) and lanes for loops / long jumps
  let minU = Infinity, maxU = -Infinity, maxV = 0;
  nodes.forEach((n, i) => { minU = Math.min(minU, u[i] - du(n) / 2); maxU = Math.max(maxU, u[i] + du(n) / 2); maxV = Math.max(maxV, v[i] + dv(n) / 2); });
  const longs = fwd.filter((e) => layer[e.b] - layer[e.a] > 1), backs = E.filter((e) => e.back || e.a === e.b);
  const laneGap = 22, leftPad = longs.length ? 40 + longs.length * laneGap : 0, rightPad = backs.length ? 40 + backs.length * laneGap : 0;
  const shiftU = -minU + leftPad; nodes.forEach((_, i) => (u[i] += shiftU));
  const W_u = maxU - minU + leftPad + rightPad, W_v = maxV;

  // 6. routes (in u,v)
  const R = [], pt = (i, du_ = 0, dv_ = 0) => [u[i] + du_, v[i] + dv_];
  const outCount = (i) => fwd.filter((e) => e.a === i).length;
  let li = 0, bi = 0;
  for (const e of E) {
    const a = e.a, b = e.b, A = nodes[a], B = nodes[b]; let pts, lab;
    if (a === b || e.back) {                                       // loop: leave the right side, travel along the outer lane, enter the target's right side
      const lane = maxU - minU + leftPad + 36 + bi++ * laneGap + (minU * 0);
      const ua = u[a] + du(A) / 2, ub = u[b] + du(B) / 2;
      pts = [[ua, v[a]], [lane, v[a]], [lane, v[b]], [ub, v[b]]]; lab = [lane, (v[a] + v[b]) / 2];
    } else if (layer[b] - layer[a] > 1) {                           // long jump: left lane
      const lane = leftPad - 36 - li++ * laneGap;
      pts = [[u[a] - du(A) / 2, v[a]], [lane, v[a]], [lane, v[b]], [u[b] - du(B) / 2, v[b]]]; lab = [lane, v[a] + (v[b] - v[a]) * 0.3];
    } else {
      const sv = v[a] + dv(A) / 2, tv = v[b] - dv(B) / 2, dU = u[b] - u[a];
      if (Math.abs(dU) < 1) pts = [[u[a], sv], [u[b], tv]];
      else if (outCount(a) >= 2 && A.shape === "decision" && Math.abs(dU) > du(A) * 0.25) pts = [[u[a] + Math.sign(dU) * du(A) / 2, v[a]], [u[b], v[a]], [u[b], tv]];   // branch leaves the diamond's side tip
      else { const mid = (sv + tv) / 2; pts = [[u[a], sv], [u[a], mid], [u[b], mid], [u[b], tv]]; }
      lab = pts.length === 3 ? [(pts[0][0] + pts[1][0]) / 2, pts[0][1]] : [pts[0][0], pts[0][1] + (pts[1][1] - pts[0][1]) * (pts.length === 2 ? 0.45 : 0.9)];
    }
    R.push({ from: e.from, to: e.to, label: e.label, back: !!(e.back || a === b), long: layer[b] - layer[a] > 1 && !e.back, pts, lab });
  }

  // 7. map (u,v) -> (x,y)
  const mapP = ([a, b]) => (dir === "down" ? [a, b] : [b, a]);
  const pos = {};
  nodes.forEach((n, i) => { const [cx, cy] = mapP([u[i], v[i]]); pos[n.id] = { x: cx - n.w / 2, y: cy - n.h / 2, w: n.w, h: n.h, cx, cy, layer: layer[i] }; });
  R.forEach((r) => { r.pts = r.pts.map(mapP); r.lab = mapP(r.lab); });
  return { pos, routes: R, bbox: dir === "down" ? { w: W_u, h: W_v } : { w: W_v, h: W_u }, layers: L, widest: Math.max(...rows.map((r) => r.length)) };
}

/** polyline -> SVG path with rounded corners */
export function roundedPath(pts, r = 16) {
  if (pts.length < 3) return `M${pts[0][0]} ${pts[0][1]} L${pts.at(-1)[0]} ${pts.at(-1)[1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy), rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 1) { d += ` L${cx} ${cy}`; continue; }
    const ax = cx - ((cx - px) / l1) * rr, ay = cy - ((cy - py) / l1) * rr, bx = cx + ((nx - cx) / l2) * rr, by = cy + ((ny - cy) / l2) * rr;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  const e = pts.at(-1); return d + ` L${e[0]} ${e[1]}`;
}
