'use strict';
// ===================== WELT V10: Wiesen, Wälder, Schluchten · Neu-Eden 2.0 · Bodenmuster =====================
// V11: Schluchten begehbar (W.depth, W.ramp) · 20 = Treppenschacht
const RAVINE_D = 84;
function groundZ(x, y) { const W = S && S.W; if (!W || !W.depth) return 0; const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE); if (gx < 0 || gy < 0 || gx >= W.size || gy >= W.size) return 0; return W.depth[gy * W.size + gx]; }
// Tiles neu: 11 Schlucht, 12 Pflaster, 13 Mosaik, 14 Schnee, 15 Schienen, 16 Gehwegplatten, 17 Nasspflaster, 18 Gitterrost, 19 Waldboden
function buildTerrain(W) {
  const S = W.size, rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, C = 64;
  W.mask = new Uint8Array(S * S); W.depth = new Float32Array(S * S); W.ramp = new Map();
  const avoid = (gx, gy, m) => inRect(gx, gy, RUIN_RECT, m) || inRect(gx, gy, EDEN_RECT, m + 7) || Math.hypot(gx - C, gy - C) < 13 + m || Math.hypot(gx - RADIO.gx, gy - RADIO.gy) < 11 + m || inRect(gx, gy, GRASS_RECT, m);
  // --- Schluchten ---
  let made = 0;
  for (let k = 0; k < 60 && made < 4; k++) {
    let x = rr(10, 118), y = rr(10, 118); if (avoid(x | 0, y | 0, 5)) continue;
    let a = rr(0, 6.28); const len = Math.floor(rr(26, 44)), cells = new Map();
    for (let s = 0; s < len; s++) {
      a += rr(-0.32, 0.32); x += Math.cos(a); y += Math.sin(a); if (x < 5 || y < 5 || x > 122 || y > 122) break;
      const wd = 1.1 + Math.sin(s / len * Math.PI) * 1.6;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { if (Math.hypot(i, j) > wd) continue; const gx = Math.floor(x + i), gy = Math.floor(y + j); if (avoid(gx, gy, 0)) continue; cells.set(gy * S + gx, [gx, gy]); }
    }
    if (cells.size < 45) continue; made++;
    let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0; const roads = [];
    for (const [gx, gy] of cells.values()) { if (wTile(W, gx, gy) === 3) { roads.push([gx, gy]); continue; } setTile(W, gx, gy, 11); x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy); }
    for (const [gx, gy] of roads) for (const [dx, dy, ang] of [[1, 0, 0], [-1, 0, 0], [0, 1, Math.PI / 2], [0, -1, Math.PI / 2]]) if (wTile(W, gx + dx, gy + dy) === 11) addProp(W, 'bridgerail', (gx + 0.5 + dx * 0.45) * T, (gy + 0.5 + dy * 0.45) * T, { hw: 3, hd: 24, ang: dx ? 0 : Math.PI / 2 });
    W.zones.push({ id: 'ravine' + made, n: 'DIE SCHLUCHT', sub: 'Ein tiefer Riss in der Erde. Steig über die Felspfade hinab – unten glühen Kristalle.', x0: x0 * T, y0: y0 * T, x1: (x1 + 1) * T, y1: (y1 + 1) * T, col: '#c9a36b' });
    let rocks = 0; for (const [gx, gy] of cells.values()) { if (rocks > 12 || rng() > 0.15) continue; for (const [dx, dy] of [[1, 1], [-1, -1], [2, 0], [0, 2]]) { const tx = gx + dx, ty = gy + dy, t = wTile(W, tx, ty); if (t === 0 || t === 2) { addNode(W, (tx + 0.5) * T, (ty + 0.5) * T, 'rock'); rocks++; break; } } }
    const pit = [...cells.values()].filter(([gx, gy]) => wTile(W, gx, gy) === 11);
    for (const [gx, gy] of pit) W.depth[gy * S + gx] = -RAVINE_D;
    const rampAt = [], order = pit.slice().sort(() => rng() - 0.5);
    for (const [gx, gy] of order) {
      if (rampAt.length >= 3) break;
      if (rampAt.some(([x, y]) => Math.hypot(x - gx, y - gy) < 10)) continue;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const rt = wTile(W, gx - dx, gy - dy); if (rt !== 0 && rt !== 2 && rt !== 19) continue;
        if (wTile(W, gx + dx, gy + dy) !== 11 || wTile(W, gx + 2 * dx, gy + 2 * dy) !== 11) continue;
        W.depth[gy * S + gx] = -RAVINE_D / 3; W.depth[(gy + dy) * S + gx + dx] = -RAVINE_D * 2 / 3;
        W.ramp.set(gy * S + gx, [dx, dy, 0]); W.ramp.set((gy + dy) * S + gx + dx, [dx, dy, 1]);
        addProp(W, 'pathsign', (gx - dx + 0.5 - dy * 0.42) * T, (gy - dy + 0.5 - dx * 0.42) * T, { hw: 3, hd: 3, solid: false });
        rampAt.push([gx, gy]); break;
      }
    }
    const floor = pit.filter(([gx, gy]) => W.depth[gy * S + gx] === -RAVINE_D && !W.ramp.has(gy * S + gx)).sort(() => rng() - 0.5);
    const rawNode = (gx, gy, kind, sc) => { const x = (gx + 0.3 + rng() * 0.4) * T, y = (gy + 0.3 + rng() * 0.4) * T, n = { x, y, kind, hp: 100, max: 100, respawn: 0, wob: 0, sc: sc || (0.9 + rng() * 0.35), pit: true }; n.parts = rockParts(n); W.nodes.push(n); W.chunkObjs[chunkIdx(W, x, y)].nodes.push(n); addBucket(W, n, 'node'); return n; };
    floor.slice(0, 3).forEach(([gx, gy]) => { const n = rawNode(gx, gy, 'crystal', 1.25); W.lightsStatic.push({ x: n.x, y: n.y, r: 95, col: '200,120,255', safe: false, node: n }); });
    floor.slice(3, 6).forEach(([gx, gy], i) => rawNode(gx, gy, i ? 'scrap' : 'rock'));
    if (floor[6]) { const [gx, gy] = floor[6]; W.crates.push({ x: (gx + 0.5) * T, y: (gy + 0.5) * T, rarity: 2, opening: 0, open: false, hold: 0, pit: true }); }
    W.ravines = (W.ravines || 0) + 1;
  }
  // --- Wiesen ---
  const names = ['WILDBLUMENWIESE', 'SONNENWIESE', 'MOHNFELD', 'KLEEWIESE', 'LICHTUNG', 'HIRTENWIESE', 'GLÜHWÜRMCHENWIESE'];
  for (let k = 0, m = 0; k < 80 && m < 7; k++) {
    const cx = rr(10, 118), cy = rr(10, 118), r = rr(5.5, 9.5); if (avoid(cx | 0, cy | 0, Math.ceil(r)) ) continue;
    let bad = false; for (let j = -r; j <= r && !bad; j++) for (let i = -r; i <= r; i++) if (W.mask[Math.floor(cy + j) * S + Math.floor(cx + i)]) { bad = true; break; } if (bad) continue;
    m++;
    for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) { const gx = Math.floor(cx + i), gy = Math.floor(cy + j); if (gx < 0 || gy < 0 || gx >= S || gy >= S) continue; const d = Math.hypot(i, j) + W.noise(gx * 3, gy * 3) * 2; if (d > r) continue; W.mask[gy * S + gx] = 1; const t = W.tiles[gy * S + gx]; if (t === 2) W.tiles[gy * S + gx] = 0; }
    for (let i = 0; i < r * r * 4; i++) { const a = rr(0, 6.28), d = Math.sqrt(rng()) * r, x = (cx + Math.cos(a) * d) * T, y = (cy + Math.sin(a) * d) * T; const gx = Math.floor(x / T), gy = Math.floor(y / T); if (W.mask[gy * S + gx] === 1 && wTile(W, gx, gy) === 0) addBush(W, x, y, true); }
    W.zones.push({ id: 'meadow' + m, n: names[m - 1], sub: 'Weites offenes Feld. Gute Sicht – keine Deckung.', x0: (cx - r) * T, y0: (cy - r) * T, x1: (cx + r) * T, y1: (cy + r) * T, col: '#d8ff7a' });
  }
  // --- Dunkelwälder ---
  for (let k = 0, m = 0; k < 80 && m < 5; k++) {
    const cx = rr(10, 118), cy = rr(10, 118), r = rr(6, 10); if (avoid(cx | 0, cy | 0, Math.ceil(r))) continue;
    let bad = false; for (let j = -r; j <= r && !bad; j += 2) for (let i = -r; i <= r; i += 2) if (W.mask[Math.floor(cy + j) * S + Math.floor(cx + i)]) { bad = true; break; } if (bad) continue;
    m++;
    for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) { const gx = Math.floor(cx + i), gy = Math.floor(cy + j); if (gx < 0 || gy < 0 || gx >= S || gy >= S) continue; const d = Math.hypot(i, j) + W.noise(gx * 3, gy * 3) * 2; if (d > r) continue; const t = W.tiles[gy * S + gx]; if (t !== 0 && t !== 2) continue; W.mask[gy * S + gx] = 2; W.tiles[gy * S + gx] = 19; }
    W.forests = W.forests || []; W.forests.push({ cx, cy, r });
    W.zones.push({ id: 'forest' + m, n: 'DUNKELWALD', sub: 'Dichtes Unterholz. Hier ist es auch tagsüber finster.', x0: (cx - r) * T, y0: (cy - r) * T, x1: (cx + r) * T, y1: (cy + r) * T, col: '#7aae5a' });
  }
}
function forestFill(W) {
  const rng = W.rng, T = TILE;
  for (const f of W.forests || []) for (let i = 0; i < f.r * f.r * 3.2; i++) { const a = rng() * 6.28, d = Math.sqrt(rng()) * f.r, x = (f.cx + Math.cos(a) * d) * T, y = (f.cy + Math.sin(a) * d) * T; if (wTile(W, Math.floor(x / T), Math.floor(y / T)) !== 19 || !freeAt(W, x, y, 8)) continue; addTree(W, x, y, rng() < 0.55 ? 'pine' : rng() < 0.6 ? 'jungle' : 'dead'); }
}
// ---------- Detaillierte Bodenmuster ----------
function drawTileDetail(g, W, t, gx, gy, rng) {
  const T = TILE, sub = (i, j, n, col, inset) => { inset = inset || 0.08; const a = P((gx + (i + inset) / n) * T, (gy + (j + inset) / n) * T, 0), b = P((gx + (i + 1 - inset) / n) * T, (gy + (j + inset) / n) * T, 0), c = P((gx + (i + 1 - inset) / n) * T, (gy + (j + 1 - inset) / n) * T, 0), d = P((gx + (i + inset) / n) * T, (gy + (j + 1 - inset) / n) * T, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = col; g.fill(); };
  const S = W.size, nb = (dx, dy) => wTile(W, gx + dx, gy + dy);
  switch (t) {
    case 11: case 20: {
      const city = t === 20, dep = (x, y) => { const tt = wTile(W, x, y); if (tt === 9) return 0; return W.depth ? W.depth[y * S + x] : (tt === 11 || tt === 20 ? -RAVINE_D : 0); };
      const d = dep(gx, gy), ramp = W.ramp ? W.ramp.get(gy * S + gx) : null, PZ = (x, y, z) => P(x * T, y * T, z);
      const poly = (pts, col) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); g.fillStyle = col; g.fill(); };
      const quadZ = (x0, y0, x1, y1, z, col) => poly([PZ(x0, y0, z), PZ(x1, y0, z), PZ(x1, y1, z), PZ(x0, y1, z)], col);
      const deepK = clamp(-d / RAVINE_D, 0, 1);
      if (city) {
        quadZ(gx, gy, gx + 1, gy + 1, d, hsl2hex(220, 14, 26 - deepK * 8));
        for (let k = 1; k < 4; k++) { const f = k / 4, a = PZ(gx, gy + f, d), b = PZ(gx + 1, gy + f, d); g.strokeStyle = 'rgba(63,244,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      } else {
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) quadZ(gx + i / 3, gy + j / 3, gx + (i + 1) / 3, gy + (j + 1) / 3, d, hsl2hex(28 + rng() * 10, 12 + rng() * 8, 27 + rng() * 7 - deepK * 4));
        if (ramp) {
          const [dx, dy] = ramp; quadZ(gx + 0.08, gy + 0.08, gx + 0.92, gy + 0.92, d, hsl2hex(34, 14, 46 + rng() * 6));
          for (let k = 1; k < 4; k++) { const f = k / 4, a = dy ? PZ(gx + 0.08, gy + f, d) : PZ(gx + f, gy + 0.08, d), b = dy ? PZ(gx + 0.92, gy + f, d) : PZ(gx + f, gy + 0.92, d); g.strokeStyle = 'rgba(30,22,14,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.strokeStyle = 'rgba(220,200,160,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y - 2); g.lineTo(b.x, b.y - 2); g.stroke(); }
        } else {
          for (let k = 0; k < 7; k++) { const q = PZ(gx + rng(), gy + rng(), d); g.fillStyle = rng() < 0.5 ? 'rgba(160,145,120,0.8)' : 'rgba(70,58,46,0.8)'; g.fillRect(q.x - 2, q.y - 1, 3 + rng() * 3, 2); }
          if (rng() < 0.3) { const q = PZ(gx + 0.3 + rng() * 0.4, gy + 0.3 + rng() * 0.4, d); g.fillStyle = 'rgba(60,120,150,0.55)'; g.beginPath(); g.ellipse(q.x, q.y, 10 + rng() * 10, 4 + rng() * 3, 0, 0, 6.283); g.fill(); }
          if (rng() < 0.45) { const q = PZ(gx + rng(), gy + rng(), d); g.strokeStyle = '#4f7f3a'; g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(q.x + k * 2 - 4, q.y); g.lineTo(q.x + k * 2 - 4 + (rng() - 0.5) * 4, q.y - 4 - rng() * 6); } g.stroke(); }
        }
      }
      const face = (ax, ay, bx, by, zt, zb, nt, west) => {
        if (zt - zb < 2) return;
        const a = PZ(ax, ay, zt), b = PZ(bx, by, zt), b2 = PZ(bx, by, zb), a2 = PZ(ax, ay, zb);
        if (city) { poly([a, b, b2, a2], west ? '#2a2f3a' : '#363c4a'); poly([a, b, PZ(bx, by, zt - 3), PZ(ax, ay, zt - 3)], '#ff3fa4'); return; }
        if (nt === 3) { poly([a, b, b2, a2], '#3a2a1c'); for (let k = 0; k <= 4; k++) { const f = k / 4, p1 = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt), p2 = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zb); g.strokeStyle = '#6a4a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke(); } g.lineWidth = 1; return; }
        const bands = west ? ['#5e4b3a', '#6b5643', '#54432f', '#735c45', '#4a3b2c'] : ['#7a6450', '#8a735a', '#6d5946', '#937a5e', '#625040'];
        let bi = Math.floor(rng() * 3);
        for (let z = zt; z > zb; z -= 8 + rng() * 6) { const z2 = Math.max(zb, z - 8 - rng() * 6); poly([PZ(ax, ay, z), PZ(bx, by, z), PZ(bx, by, z2), PZ(ax, ay, z2)], bands[bi++ % bands.length]); }
        g.strokeStyle = 'rgba(25,18,12,0.55)'; g.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) { const f = 0.15 + rng() * 0.7, zs = zt - rng() * 20; let p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zs); g.beginPath(); g.moveTo(p.x, p.y); for (let z = zs; z > zb + 6; z -= 10) { p = PZ(ax + (bx - ax) * (f + (rng() - 0.5) * 0.08), ay + (by - ay) * (f + (rng() - 0.5) * 0.08), z); g.lineTo(p.x, p.y); } g.stroke(); }
        for (let k = 0; k < 3; k++) { const f = rng(), z = zb + 6 + rng() * (zt - zb - 12), p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, z); g.fillStyle = rng() < 0.5 ? '#9a8468' : '#43352a'; g.fillRect(p.x - 3, p.y - 2, 6, 4); }
        if (nt === 0 || nt === 2 || nt === 19) {
          poly([a, b, PZ(bx, by, zt - 5), PZ(ax, ay, zt - 5)], nt === 2 ? '#5a4630' : '#3f7a35');
          g.strokeStyle = 'rgba(60,110,45,0.9)'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k < 6; k++) { const f = rng(), p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt - 4); g.moveTo(p.x, p.y); g.lineTo(p.x + (rng() - 0.5) * 3, p.y + 6 + rng() * 14); } g.stroke(); g.lineWidth = 1;
        }
      };
      const dn = dep(gx, gy - 1), dw = dep(gx - 1, gy);
      if (dn > d) face(gx, gy, gx + 1, gy, dn, d, nb(0, -1), false);
      if (dw > d) face(gx, gy, gx, gy + 1, dw, d, nb(-1, 0), true);
      if (dn > d + 10) poly([PZ(gx, gy, d), PZ(gx + 1, gy, d), PZ(gx + 1, gy + 0.3, d), PZ(gx, gy + 0.3, d)], 'rgba(0,0,0,0.28)');
      if (dw > d + 10) poly([PZ(gx, gy, d), PZ(gx + 0.3, gy, d), PZ(gx + 0.3, gy + 1, d), PZ(gx, gy + 1, d)], 'rgba(0,0,0,0.22)');
      g.strokeStyle = city ? 'rgba(255,63,164,0.9)' : 'rgba(190,165,120,0.7)'; g.lineWidth = 2;
      for (const [dx, dy, ax, ay, bx, by] of [[1, 0, 1, 0, 1, 1], [0, 1, 0, 1, 1, 1]]) if (dep(gx + dx, gy + dy) > d + 10) { const a = PZ(gx + ax, gy + ay, dep(gx + dx, gy + dy)), b = PZ(gx + bx, gy + by, dep(gx + dx, gy + dy)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      g.lineWidth = 1; return true;
    }
    case 12: case 15: {
      const snow = W.kind === 'city';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const l = 38 + rng() * 14; sub(i + (j % 2) * 0.5 - 0.25, j, 4, hsl2hex(28 + rng() * 14, 10 + rng() * 8, snow ? l + 8 : l), 0.1); }
      if (snow && rng() < 0.5) for (let k = 0; k < 6; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(255,255,255,' + (0.4 + rng() * 0.5) + ')'; g.beginPath(); g.ellipse(p.x, p.y, 3 + rng() * 8, 1.5 + rng() * 3, 0, 0, 6.283); g.fill(); }
      if (t === 15) { for (const o of [0.28, 0.72]) { const a = P(gx * T, (gy + o) * T, 0), b = P((gx + 1) * T, (gy + o) * T, 0); g.strokeStyle = '#2a2a2e'; g.lineWidth = 4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.strokeStyle = '#c8d0d8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a.x, a.y - 1.5); g.lineTo(b.x, b.y - 1.5); g.stroke(); } g.lineWidth = 1; }
      return true;
    }
    case 13: {
      const pc = W.plaza || { x: 0, y: 0 }, pal = ['#d9b35a', '#efe3c8', '#3b6a9a', '#efe3c8', '#a5503a', '#efe3c8', '#3f7f7a'];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const x = gx + (i + 0.5) / 3, y = gy + (j + 0.5) / 3, d = Math.hypot(x - pc.x, y - pc.y), an = Math.atan2(y - pc.y, x - pc.x), ring = Math.floor(d / 0.9), star = Math.floor((an + Math.PI) / (Math.PI / 8)) % 2; sub(i, j, 3, ring % 3 === 1 && star ? '#d9b35a' : pal[ring % pal.length], 0.04); }
      return true;
    }
    case 14: {
      tileDiamond(gx, gy, 1, 1); g.fillStyle = hsl2hex(205, 30, 92 + rng() * 4); g.fill();
      for (let k = 0; k < 3; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(170,200,230,0.35)'; g.beginPath(); g.ellipse(p.x, p.y, 8 + rng() * 14, 3 + rng() * 5, 0, 0, 6.283); g.fill(); }
      for (let k = 0; k < 5; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = '#ffffff'; g.fillRect(p.x, p.y, 1.5, 1.5); }
      return true;
    }
    case 16: {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) sub(i, j, 2, hsl2hex(38, 14 + rng() * 6, 70 + rng() * 8), 0.05);
      const a = P(gx * T, gy * T, 0), b = P((gx + 1) * T, gy * T, 0); g.strokeStyle = 'rgba(201,149,42,0.5)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      if (W.kind === 'city' && rng() < 0.4) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(p.x, p.y, 6 + rng() * 6, 2 + rng() * 2, 0, 0, 6.283); g.fill(); }
      return true;
    }
    case 17: {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) sub(i + (j % 2) * 0.5 - 0.25, j, 3, hsl2hex(150 + rng() * 30, 10 + rng() * 6, 13 + rng() * 6), 0.1);
      if (rng() < 0.3) { const p = P((gx + 0.3 + rng() * 0.4) * T, (gy + 0.3 + rng() * 0.4) * T, 0); g.fillStyle = 'rgba(30,60,50,0.8)'; g.beginPath(); g.ellipse(p.x, p.y, 14 + rng() * 10, 5 + rng() * 3, 0, 0, 6.283); g.fill(); g.fillStyle = rng() < 0.5 ? 'rgba(95,255,138,0.35)' : 'rgba(255,63,164,0.35)'; g.fillRect(p.x - 6, p.y - 1, 12, 2); }
      return true;
    }
    case 18: {
      tileDiamond(gx, gy, 1, 1); g.fillStyle = '#1a2420'; g.fill(); g.strokeStyle = 'rgba(90,110,100,0.6)';
      for (let k = 1; k < 5; k++) { const a = P((gx + k / 5) * T, gy * T, 0), b = P((gx + k / 5) * T, (gy + 1) * T, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      if (rng() < 0.3) { const p = P((gx + 0.5) * T, (gy + 0.5) * T, 0); g.fillStyle = 'rgba(95,255,138,0.25)'; g.beginPath(); g.ellipse(p.x, p.y, 14, 6, 0, 0, 6.283); g.fill(); }
      return true;
    }
    case 19: {
      for (let k = 0; k < 10; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = rng() < 0.5 ? 'rgba(90,60,30,0.5)' : 'rgba(40,70,30,0.6)'; g.fillRect(p.x, p.y, 3, 2); }
      return false;
    }
  }
  return false;
}
// ---------- Neu-Eden 2.0 ----------
function makeCityWorld(level) {
  const S = 44, W = baseWorld(level, S, level === 'city' ? 777 : 666), T = TILE, rng = W.rng, rr = (a, b) => a + rng() * (b - a);
  W.name = level === 'city' ? 'NEU-EDEN · OBERSTADT' : 'NEU-EDEN · UNTERSTADT';
  const occ = new Uint8Array(S * S), mark = (x0, y0, w, h) => { for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if (i >= 0 && j >= 0 && i < S && j < S) occ[j * S + i] = 1; };
  const isFree = (x0, y0, w, h) => { for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if (i < 1 || j < 1 || i >= S - 1 || j >= S - 1 || occ[j * S + i]) return false; return true; };
  const st = (gx, gy, a, look, station, name) => { mark(Math.floor(gx) - 1, Math.floor(gy) - 1, 3, 3); return addNpc(W, gx * T, gy * T, a, look, station, name); };
  const big = (kind, tx, ty, tw, th, o) => { mark(tx, ty, tw, th); return addProp(W, kind, (tx + tw / 2) * T, (ty + th / 2) * T, Object.assign({ hw: tw * T / 2 - 6, hd: th * T / 2 - 6 }, o || {})); };
  const city = level === 'city', base = city ? 17 : 17, side = city ? 18 : 18;
  for (let i = 0; i < S * S; i++) W.tiles[i] = base;
  // Straßen
  if (city) for (let i = 1; i < S - 1; i++) for (let k = 18; k <= 25; k++) { const edge = k === 18 || k === 25; setTile(W, i, k, edge ? side : (city && (k === 21 || k === 22) ? 15 : base)); setTile(W, k, i, edge ? side : base); mark(i, k, 1, 1); mark(k, i, 1, 1); }
  if (city) for (const a of [9, 10, 33, 34]) for (let i = 1; i < S - 1; i++) { if (wTile(W, i, a) === base) { setTile(W, i, a, city ? 12 : 18); } if (wTile(W, a, i) === base) setTile(W, a, i, city ? 12 : 18); mark(i, a, 1, 1); mark(a, i, 1, 1); }
  W.plaza = { x: 22, y: 22 };
  if (city) for (let j = 14; j < 30; j++) for (let i = 14; i < 30; i++) if (Math.hypot(i + 0.5 - 22, j + 0.5 - 22) < 6.5) setTile(W, i, j, 18);
  // Mauern
  if (city) {
  for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2]]) addProp(W, 'citywall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang, H: 120 }); addProp(W, 'citywall', (S - 0.4) * T, 8.5 * T, { len: 17 * T, hw: 8.5 * T, hd: 14, ang: Math.PI / 2, H: 120 }); addProp(W, 'citywall', (S - 0.4) * T, 35.5 * T, { len: 17 * T, hw: 8.5 * T, hd: 14, ang: Math.PI / 2, H: 120 }); addProp(W, 'innergate', (S - 1.2) * T, 22 * T, { hw: 16, hd: 76 }); }
  const BL = { NW1: [2, 2], NW2: [11, 2], NW3: [2, 11], NW4: [11, 11], NE1: [26, 2], NE2: [35, 2], NE3: [26, 11], NE4: [35, 11], SW1: [2, 26], SW2: [11, 26], SW3: [2, 35], SW4: [11, 35], SE1: [26, 26], SE2: [35, 26], SE3: [26, 35], SE4: [35, 35] };
  const fillHouses = (x0, y0, w, h) => {
    for (let pass = 0; pass < 2; pass++) for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) {
      const tw = pass ? 2 : 2 + Math.floor(rng() * 2), th = pass ? 2 : 2 + Math.floor(rng() * 2); if (!isFree(i, j, tw, th) || i + tw > x0 + w || j + th > y0 + h) continue;
      mark(i, j, tw, th);
      if (city) addProp(W, 'cybertower', (i + tw / 2) * T, (j + th / 2) * T, { w: tw * T - 8, d: th * T - 8, H: 130 + Math.floor(rng() * 6) * 34, col: rpick(rng, ['#ff3fa4', '#3ff4ff', '#b05cff', '#5fff8a', '#ffb04a']), seed: Math.floor(rng() * 1e5), snow: false, hw: tw * T / 2 - 4, hd: th * T / 2 - 4 });
      else addProp(W, 'zaunhouse', (i + tw / 2) * T, (j + th / 2) * T, { w: tw * T - 6, d: th * T - 6, H: 70 + Math.floor(rng() * 5) * 16, seed: Math.floor(rng() * 1e5), hw: tw * T / 2 - 3, hd: th * T / 2 - 3, light: rng() < 0.5 ? 90 : 0, lcol: rpick(rng, ['255,176,74', '95,255,138', '255,138,208']), safe: false });
    }
  };
  const park = (x0, y0, w, h) => {
    for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if (!occ[j * S + i]) setTile(W, i, j, 18);
    mark(x0, y0, w, h);
    for (let k = 0; k < (city ? 9 : 4); k++) { const x = (x0 + rr(0.6, w - 0.6)) * T, y = (y0 + rr(0.6, h - 0.6)) * T; if (freeAt(W, x, y, 22)) { if (city) addProp(W, 'holotree', x, y, { hw: 12, hd: 12, light: 90, lcol: rng() < 0.5 ? '255,63,164' : '63,244,255', safe: false, seed: Math.floor(rng() * 999) }); else addProp(W, 'chemvat', x, y, { hw: 25, hd: 25, light: 120, lcol: '95,255,138', safe: false }); } }
    if (city) { addProp(W, 'statue', (x0 + w / 2) * T, (y0 + h / 2) * T, { hw: 20, hd: 20 }); for (let k = 0; k < 4; k++) { const x = (x0 + rr(0.5, w - 0.5)) * T, y = (y0 + rr(0.5, h - 0.5)) * T; if (freeAt(W, x, y, 18)) addProp(W, rpick(rng, ['vent', 'bench', 'planter', 'neonlamp']), x, y, rng() < 0.7 ? { solid: false, snow: false, light: 0 } : { hw: 6, hd: 17, snow: false }); } }
  };
  if (city) {
    // Wahrzeichen & Läden
    big('rathaus', 11, 12, 6, 5); st(14, 17.4, Math.PI / 2, Object.assign(npcLook('rich', rng), { hat: 'Zylinder' }), 'townhall', 'Stadtschreiber Okoro');
    big('glassdome', 2, 2, 4, 3); big('clocktower', 13, 3, 2, 2, { hw: 30, hd: 30 });
    big('royal', 26, 12, 6, 5, { light: 260, lcol: '255,210,90', lx: 150 }); st(29, 17.4, Math.PI / 2, Object.assign(npcLook('rich', rng), { coat: '#1b1b22' }), 'royal', 'ROYAL CASINO');
    big('shop', 36, 13, 3, 3, { col: '#3b4d74' }); st(37.5, 17.4, Math.PI / 2, npcLook('rich', rng), 'market', 'Händlerin Mara');
    big('shop', 3, 27, 3, 3, { col: '#3f7f7a' }); st(4.5, 26.6, -Math.PI / 2, npcLook('spacer', rng), 'agency', 'Raumfahrtbehörde');
    big('skyloft', 12, 27, 3, 3); st(13.5, 26.6, -Math.PI / 2, npcLook('spacer', rng), 'shipyard', 'Werft »Sternenschmiede«');
    big('shop', 27, 27, 3, 3, { col: '#a5503a' }); st(28.5, 26.6, -Math.PI / 2, npcLook('rich', rng), 'broker', 'Makler Vossberg');
    big('shop', 36, 27, 3, 3, { col: '#6a4a7a' }); st(37.5, 26.6, -Math.PI / 2, npcLook('rich', rng), 'jobs', 'Jobvermittlung');
    big('shop', 27, 36, 3, 3, { col: '#34466a' }); st(28.5, 35.4, -Math.PI / 2, npcLook('rich', rng), 'courier', 'Kurier-Zentrale');
    big('villa', 36, 36, 5, 4); big('apartment', 3, 36, 4, 3); st(5, 35.4, -Math.PI / 2, npcLook('rich', rng), 'home', 'Hausmeister');
    W.depth = new Float32Array(S * S); W.ramp = new Map();
    for (let j = 4; j <= 6; j++) for (let i = 21; i <= 22; i++) { setTile(W, i, j, 20); W.depth[j * S + i] = -24 * (7 - j); W.ramp.set(j * S + i, [0, 1, 0]); }
    mark(20, 3, 4, 5);
    addProp(W, 'stairwell', 22 * T, 5.5 * T, { solid: false, light: 130, lcol: '63,244,255' });
    W.stairsDown = { x: 22 * T, y: 7 * T }; W.spawnTop = { x: 22 * T, y: 8.4 * T };
    big('gunshop', 6, 27, 3, 3); st(7.5, 26.6, -Math.PI / 2, Object.assign(npcLook('guard', rng), { coat: '#1b1b22', neon: '#ff3fa4', goggles: '#3ff4ff' }), 'guns', 'Waffenhändler »Kaliber«');
    // Holo-Reklamen über den Straßen
    for (const [x, y, a] of [[5, 18.2, 0], [12, 18.2, 0], [31, 18.2, 0], [39, 18.2, 0], [5, 25.8, 0], [31, 25.8, 0], [18.2, 5, Math.PI / 2], [25.8, 12, Math.PI / 2], [18.2, 31, Math.PI / 2], [25.8, 38, Math.PI / 2]]) addProp(W, 'hoload', x * T, y * T, { hw: 4, hd: 4, ang: a, seed: Math.floor(x * 13 + y), solid: false, light: 110, lcol: rpick(rng, ['255,63,164', '63,244,255', '176,92,255']), safe: false });
    st(41.6, 19.4, Math.PI, npcLook('guard', rng), 'exit', 'Stadttor');
    park(11, 35, 7, 7); park(35, 2, 7, 7); park(2, 11, 7, 7);
    for (const k in BL) fillHouses(BL[k][0], BL[k][1], 7, 7);
    // Plaza
    addProp(W, 'fountain', 22 * T, 22 * T, { hw: 46, hd: 46 });
    for (const [x, y] of [[17.5, 17.5], [26.5, 17.5], [17.5, 26.5], [26.5, 26.5]]) addProp(W, 'statue', x * T, y * T, { hw: 20, hd: 20, snow: false });
    // Straßenmöbel
    for (let i = 2; i < 42; i += 3) { if (i > 15 && i < 29) continue; addProp(W, 'neonlamp', i * T, 18.5 * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); addProp(W, 'neonlamp', i * T, 25.5 * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); addProp(W, 'neonlamp', 18.5 * T, i * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); addProp(W, 'neonlamp', 25.5 * T, i * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); }
    for (const x of [6, 36]) { addProp(W, 'bigpipe', x * T, 22 * T, { len: 9 * T, H: 140, ang: Math.PI / 2, solid: false, snow: false }); for (const y of [17.5, 26.5]) addProp(W, 'pylon', x * T, y * T, { hw: 16, hd: 16 }); }
    addProp(W, 'bigpipe', 22 * T, 12 * T, { len: 9 * T, H: 120, solid: false, snow: false }); for (const x of [17.5, 26.5]) addProp(W, 'pylon', x * T, 12 * T, { hw: 16, hd: 16 });
    for (const x of [10, 14, 30, 33, 39]) addProp(W, 'garland', x * T, 22 * T, { len: 8 * T, ang: Math.PI / 2, solid: false });
    for (const y of [8, 31, 38]) addProp(W, 'garland', 22 * T, y * T, { len: 8 * T, solid: false });
    for (const [x, y, c] of [[8.5, 17.8, '#5fff8a'], [33.5, 17.8, '#ff7ad0'], [16.5, 26.2, '#5fff8a'], [40, 26.2, '#7fd8ff'], [17.8, 7, '#ff7ad0'], [26.2, 30, '#5fff8a']]) addProp(W, 'hexsign', x * T, y * T, { hw: 3, hd: 3, col: c, light: 70, lcol: hexToRgbStr(c), safe: false, H: 64 });
    for (const [x, y] of [[8, 25.3], [36, 18.7]]) addProp(W, 'tramrailstop', x * T, y * T, { hw: 30, hd: 10 });
    for (const [x, y, k] of [[20, 10, 'kiosk'], [24, 33, 'kiosk'], [31, 24.6, 'flowercart'], [12, 19.2, 'flowercart'], [33, 6, 'crates'], [8, 6, 'barrels'], [38, 30, 'crates'], [5, 31, 'barrels']]) addProp(W, k, x * T, y * T, { hw: k === 'kiosk' ? 20 : 16, hd: k === 'kiosk' ? 20 : 12, snow: false });
    for (let k = 0; k < 18; k++) { const x = rr(2, 42) * T, y = rr(2, 42) * T; if (!freeAt(W, x, y, 20)) continue; const tt = tileType(W, x, y); if (tt === 15 || tt === 13) continue; addProp(W, rpick(rng, ['vent', 'planter', 'bench', 'trash']), x, y, { solid: false, flowers: true, snow: false }); }
    W.vents = []; for (let k = 0; k < 10; k++) { const x = rr(3, 41) * T, y = rr(3, 41) * T; if (!freeAt(W, x, y, 14) || tileType(W, x, y) === 15) continue; addProp(W, 'vent', x, y, { solid: false }); W.vents.push({ x, y }); }
    W.trams = [{ x: 8 * T, y: 21.5 * T, ang: 0, dir: 1, col: '#3f7f7a', sp: 70, wait: 0, x0: 3.5, x1: 13.5 }, { x: 36 * T, y: 22.5 * T, ang: Math.PI, dir: -1, col: '#a5503a', sp: 60, wait: 0, x0: 30.5, x1: 40.5 }];
    for (const i of [15, 16, 17, 27, 28, 29]) for (const j of [21, 22]) if (wTile(W, i, j) === 15) setTile(W, i, j, 12);
    for (let i = 0; i < 4; i++) W.airships.push({ x: rr(0, S * T), y: rr(0, S * T), z: 300 + i * 40, a: rr(0, 6.28), sp: rr(20, 40) });
    for (let k = 0; k < 34; k++) { const x = rr(3, 41) * T, y = (rng() < 0.5 ? rr(18.5, 25.5) : rr(3, 41)) * T, x2 = rng() < 0.5 ? x : rr(18.5, 25.5) * T; if (!freeAt(W, x2, y, 12)) continue; addNpc(W, x2, y, rr(0, 6), npcLook('rich', rng), null, null, { wander: true }); }
    W.spawn = { x: 40.5 * T, y: 22 * T }; W.ambient = 'cyber'; W.name = 'NEU-EDEN · NEONSTADT';
    for (let i = 0; i < 40; i++) W.lightsStatic.push({ x: rr(2, 42) * T, y: rr(2, 42) * T, r: 100, col: rpick(rng, ['255,63,164', '63,244,255', '176,92,255']), safe: false });
  } else {
    // ===================== V11: DIE ALTSTADT (Gassen im Stil einer verwinkelten Hafen-/Bergbaustadt) =====================
    W.name = 'NEU-EDEN · ALTSTADT';
    const AL = [7, 14, 21, 28, 35], inAL = v => AL.some(a => v === a || v === a + 1);
    const closed = [['v', 7, 9, 13], ['h', 14, 30, 34], ['v', 35, 23, 27], ['h', 28, 1, 6], ['v', 14, 30, 34], ['h', 7, 37, 42]];
    const passages = [['h', 25, 9, 13], ['v', 31, 2, 6], ['h', 11, 23, 27], ['v', 11, 37, 42], ['h', 32, 37, 42]];
    const inSeg = (segs, i, j, wide) => segs.some(([o, a, f, t]) => o === 'v' ? (i === a || (wide && i === a + 1)) && j >= f && j <= t : (j === a || (wide && j === a + 1)) && i >= f && i <= t);
    const plaza = (i, j) => i >= 16 && i <= 27 && j >= 16 && j <= 27;
    const walk = (i, j) => i >= 1 && j >= 1 && i < S - 1 && j < S - 1 && (plaza(i, j) || inSeg(passages, i, j, false) || ((inAL(i) || inAL(j)) && !inSeg(closed, i, j, true)));
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const w = walk(i, j); setTile(W, i, j, !w ? 7 : plaza(i, j) ? 12 : 16); if (w) mark(i, j, 1, 1); }
    for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2], [(S - 0.4) * T, S * T / 2, Math.PI / 2]]) addProp(W, 'stonewall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang });
    addProp(W, 'stairsup', 22 * T, 3 * T, { solid: false, light: 150, lcol: '255,190,110' });
    addProp(W, 'torii', 22 * T, 6.4 * T, { solid: false });
    W.stairsUp = { x: 22 * T, y: 5.2 * T }; W.spawn = { x: 22 * T, y: 6.9 * T };
    const warm = ['255,190,110', '255,150,70', '255,210,140'];
    big('neoncasino', 16, 9, 5, 5, { light: 240, lcol: '255,160,80', lx: 110 }); st(18.5, 14.5, Math.PI / 2, npcLook('punk', rng), 'neon', 'Spielhalle »DIE GRUBE«');
    big('teahouse', 9, 16, 5, 5, { light: 200, lcol: '255,180,100', seed: 31 }); st(14.5, 18.5, 0, npcLook('punk', rng), 'bar', 'Teehaus »Rostiger Anker«');
    big('teahouse', 30, 23, 5, 5, { light: 200, lcol: '255,180,100', seed: 32 }); st(29.5, 25.5, Math.PI, npcLook('punk', rng), 'bar2', 'Schenke »Letzter Tropfen«');
    big('blackmarket', 16, 30, 5, 3, { light: 120, lcol: '255,170,90' }); st(18.5, 29.5, -Math.PI / 2, Object.assign(npcLook('punk', rng), { hat: 'Bandana' }), 'black', 'Schwarzmarkt');
    big('cityhome', 23, 30, 3, 3); st(24.5, 29.5, -Math.PI / 2, npcLook('punk', rng), 'home', 'Kellerloch-Vermieterin');
    st(26.4, 26.4, Math.PI, Object.assign(npcLook('punk', rng), { hat: 'Zylinder', coat: '#1a1a1a' }), 'fixer', 'Der Fixer');
    // Platz: runde Terrasse mit Brunnen, Laternenmasten, Markt
    addProp(W, 'roundterrace', 21.5 * T, 21.5 * T, { hw: 40, hd: 40, light: 230, lcol: '255,200,120', safe: false });
    for (const [x, y] of [[17, 17], [26, 17], [17, 26], [26, 26], [21.5, 16.8], [16.8, 21.5], [26.2, 21.5], [21.5, 26.2]]) { addProp(W, 'lanternpost', x * T, y * T, { hw: 4, hd: 4, solid: false }); W.lightsStatic.push({ x: x * T, y: y * T, r: 110, col: rpick(rng, warm), safe: false }); }
    for (const [x, y, a, c] of [[18.6, 18.6, 0, '#8a2a2a'], [24.4, 18.6, Math.PI / 2, '#3e6a4a'], [18.6, 24.4, -Math.PI / 2, '#7a5a2a'], [24.4, 24.4, Math.PI, '#8a2a2a']]) addProp(W, 'stall', x * T, y * T, { hw: 22, hd: 16, col: c, light: 80, lcol: '255,200,120', safe: false, ang: a, solid: false });
    // Wahrzeichen: Förderturm, Strommasten
    for (const [i, j] of [[2, 2], [37, 37]]) if (isFree(i, j, 4, 4)) { mark(i, j, 4, 4); addProp(W, 'headframe', (i + 2) * T, (j + 2) * T, { hw: 2 * T - 6, hd: 2 * T - 6, light: 120, lcol: '255,170,90', safe: false }); }
    // Holzhäuser, Mehrstöcker, Pagoden – eng aneinander
    const walls = ['#e8dcc0', '#d9c8a4', '#8a5a3a', '#7a4a30', '#c8b08a', '#a8643a', '#efe3c8'], roofs = ['#6a3a2a', '#4a5a4a', '#5a3a2a', '#3e4a46', '#7a4a2a', '#5a2a22'];
    for (const sizes of [[[3, 3], [3, 2], [2, 3]], [[2, 2]], [[2, 1], [1, 2], [1, 1]]]) for (let j = 1; j < S - 1; j++) for (let i = 1; i < S - 1; i++) for (const [tw, th] of sizes) {
      if (!isFree(i, j, tw, th)) continue; mark(i, j, tw, th);
      const seed = Math.floor(rng() * 1e5), big3 = tw * th >= 6, r = rng();
      const style = big3 && r < 0.25 ? 'pagoda' : big3 && r < 0.6 ? 'block' : 'wood';
      const H = style === 'pagoda' ? 150 + Math.floor(rng() * 3) * 30 : style === 'block' ? 120 + Math.floor(rng() * 4) * 22 : 60 + Math.floor(rng() * 3) * 22;
      addProp(W, 'jhouse', (i + tw / 2) * T, (j + th / 2) * T, { w: tw * T - 4, d: th * T - 4, H, seed, style, col: rpick(rng, walls), roof: rpick(rng, roofs), hw: tw * T / 2 - 2, hd: th * T / 2 - 2 });
      break;
    }
    // Leben über den Gassen: Papierlaternen, Wäsche, Stromleitungen
    let li = 0;
    for (const a of AL) for (let j = 2; j < S - 2; j += 3) { if (!walk(a, j) || !walk(a + 1, j) || plaza(a, j)) continue; const kind = (li++ % 3 === 1) ? 'laundry' : 'lanternline'; addProp(W, kind, (a + 1) * T, (j + 0.5) * T, { len: 2 * T + 26, ang: 0, solid: false, seed: li * 13 }); if (kind === 'lanternline') W.lightsStatic.push({ x: (a + 1) * T, y: (j + 0.5) * T, r: 115, col: rpick(rng, warm), safe: false }); }
    for (const a of AL) for (let i = 2; i < S - 2; i += 3) { if (!walk(i, a) || !walk(i, a + 1) || plaza(i, a) || inAL(i)) continue; const kind = (li++ % 3 === 1) ? 'laundry' : 'lanternline'; addProp(W, kind, (i + 0.5) * T, (a + 1) * T, { len: 2 * T + 26, ang: Math.PI / 2, solid: false, seed: li * 13 }); if (kind === 'lanternline') W.lightsStatic.push({ x: (i + 0.5) * T, y: (a + 1) * T, r: 115, col: rpick(rng, warm), safe: false }); }
    for (const [o, a, f, t] of passages) for (let k = f; k <= t; k += 2) { const x = o === 'v' ? (a + 0.5) * T : (k + 0.5) * T, y = o === 'v' ? (k + 0.5) * T : (a + 0.5) * T; addProp(W, 'lanternline', x, y, { len: T + 20, ang: o === 'v' ? 0 : Math.PI / 2, solid: false, seed: k }); W.lightsStatic.push({ x, y, r: 80, col: '255,170,90', safe: false }); }
    for (const a of AL) for (let k = 3; k < S - 3; k += 6) { const i = a + 1, j = k; if (walk(i, j) && !plaza(i, j)) { addProp(W, 'powerpole', (a + 0.15) * T, (j + 0.5) * T, { solid: false }); } }
    // Kram am Gassenrand
    W.vents = [];
    for (let k = 0; k < 80; k++) {
      const i = 1 + Math.floor(rng() * (S - 2)), j = 1 + Math.floor(rng() * (S - 2)); if (!walk(i, j) || plaza(i, j) || (i >= 20 && i <= 23 && j <= 7)) continue;
      const x = (i + 0.2 + rng() * 0.6) * T, y = (j + 0.2 + rng() * 0.6) * T, r = rng();
      if (r < 0.2) addProp(W, rpick(rng, ['crates', 'barrels', 'planter']), x, y, { solid: false, flowers: true });
      else if (r < 0.32) addProp(W, 'lanternpost', x, y, { solid: false });
      else if (r < 0.42) addProp(W, 'bench', x, y, { solid: false });
      else if (r < 0.5) addProp(W, 'stall', x, y, { hw: 22, hd: 16, col: rpick(rng, ['#8a2a2a', '#3e6a4a', '#7a5a2a']), light: 70, lcol: '255,200,120', safe: false, solid: false, ang: rng() < 0.5 ? 0 : Math.PI / 2 });
      else if (r < 0.62) { const tr = addTree(W, x, y, 'oak', { deco: true }); if (tr) { tr.cols = rpick(rng, [['#c86a2a', '#e08a3a', '#f0b050'], ['#5a7a3a', '#7a9a4a', '#a8b85a'], ['#b84a2a', '#d86a3a', '#e8a04a']]); tr.sc *= 0.7; tr.parts = treeParts(tr); } }
    }
    for (let k = 0, n = 0; k < 400 && n < 46; k++) { const i = 1 + Math.floor(rng() * (S - 2)), j = 1 + Math.floor(rng() * (S - 2)); if (!walk(i, j) || j < 7) continue; const x = (i + 0.5) * T, y = (j + 0.5) * T; if (!freeAt(W, x, y, 10)) continue; addNpc(W, x, y, rr(0, 6), npcLook('survivor', rng), null, null, { wander: true }); n++; }
    W.ambient = 'dusk'; W.alleys = true;
  }
  finishWorld(W); return W;
}
function updateCityLife(dt) {
  const W = S.W;
  if (W.trams) for (const tr of W.trams) {
    if (tr.wait > 0) { tr.wait -= dt; continue; }
    tr.x += tr.dir * tr.sp * dt; tr.ang = tr.dir > 0 ? 0 : Math.PI;
    if (tr.x > tr.x1 * TILE || tr.x < tr.x0 * TILE) { tr.dir *= -1; tr.wait = 3; tr.x = clamp(tr.x, tr.x0 * TILE, tr.x1 * TILE); }

    const p = S.p; if (Math.abs(p.x - tr.x) < 64 && Math.abs(p.y - tr.y) < 22) { p.y = tr.y + (p.y < tr.y ? -24 : 24); }
    for (const n of W.npcs) if (Math.abs(n.x - tr.x) < 64 && Math.abs(n.y - tr.y) < 22) n.y = tr.y + (n.y < tr.y ? -24 : 24);
  }
  if (W.vents) for (const v of W.vents) if (Math.random() < dt * 2.5) S.particles.push({ x: v.x + R(-6, 6), y: v.y + R(-6, 6), z: 4, vx: R(-8, 8), vy: R(-8, 8), vz: R(25, 45), life: R(1.5, 2.5), max: 2.5, col: W.kind === 'under' ? 'rgba(140,220,170,0.35)' : 'rgba(235,240,250,0.45)', s: R(6, 10), smoke: true, grav: 0 });
}
