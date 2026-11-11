'use strict';
// ===================== WELTEN =====================
const CH = 8, GPAD = 22, GPADB = 96;
function rpick(r, a) { return a[Math.floor(r() * a.length)]; }
const TREE_COLS = {
  oak: [['#2f7a35', '#3f9440', '#5cb04a'], ['#2a6e33', '#3a8a3c', '#4fa548'], ['#357f2e', '#4c9a3a', '#6fbf4f']], pine: [['#1f5a3a', '#2a6e47', '#3b8a57']], snowpine: [['#2a5a4a', '#356b57', '#4a7d68']],
  birch: [['#6dae45', '#86c454', '#a5d867']], jungle: [['#246b2e', '#33853a', '#4aa046'], ['#2b7a3a', '#3f9446', '#5db052']], cactus: [['#4f8a3a', '#5a9a42', '#6aaa52']], dead: [['#4a5a3a', '#3a4a2a', '#5a6a4a']],
  shroom: [['#2fd6b0', '#1fa890', '#a6ffe6'], ['#5f9cff', '#3a6fd8', '#c8dcff'], ['#ff7ad0', '#d84ab0', '#ffd0f0']], shroomtall: [['#2fd6b0', '#1fa890', '#a6ffe6'], ['#9a7cff', '#6a4cd8', '#e0d6ff']],
  lavaspire: [['#2a1e22', '#1e1418', '#ff6a2a']], obelisk: [['#2a2430', '#1e1a24', '#ffd27a']], crystaltree: [['#8a7cff', '#6a5cdf', '#e6ddff']], goldspire: [['#d9b35a', '#e8c86a', '#fff3c0']],
};
// Tiles: 0 Boden, 2 Erde, 3 Straße, 4 Gehweg, 5 Marmor, 6 Platz, 7 Unterstadt, 8 Beton, 9 gesperrt, 10 Metallboden
function baseWorld(kind, size, seed) {
  const NC = Math.ceil(size / CH);
  const W = { kind, size, seed, NC, tiles: new Uint8Array(size * size), roadMark: new Uint8Array(size * size), trees: [], nodes: [], bushes: [], props: [], cars: [], crates: [], npcs: [], lightsStatic: [], zones: [], outposts: [], grassCh: [], chunkObjs: [], chunks: new Map(), BS: 96, heli: null, biome: null, airships: [] };
  for (let i = 0; i < NC * NC; i++) { W.grassCh.push([]); W.chunkObjs.push({ trees: [], bushes: [], nodes: [], props: [] }); }
  W.BN = Math.ceil(size * TILE / W.BS); W.buckets = new Array(W.BN * W.BN); for (let i = 0; i < W.buckets.length; i++) W.buckets[i] = [];
  const rng = mulberry32(seed); W.rng = rng;
  const ph = []; for (let i = 0; i < 8; i++) ph.push([rng() * 6.28, 0.05 + rng() * 0.11, 0.05 + rng() * 0.11]);
  W.noise = (x, y) => { let v = 0; for (const [p, a, b] of ph) v += Math.sin(x * a + p) * Math.cos(y * b - p * 0.7); return v / ph.length; };
  return W;
}
function wTile(W, gx, gy) { if (gx < 0 || gy < 0 || gx >= W.size || gy >= W.size) return 9; return W.tiles[gy * W.size + gx]; }
function setTile(W, gx, gy, t) { if (gx < 0 || gy < 0 || gx >= W.size || gy >= W.size) return; W.tiles[gy * W.size + gx] = t; }
function chunkIdx(W, x, y) { const cx = clamp(Math.floor(x / TILE / CH), 0, W.NC - 1), cy = clamp(Math.floor(y / TILE / CH), 0, W.NC - 1); return cy * W.NC + cx; }
function addBucket(W, o, type, hw, hd) {
  o.btype = type; const BS = W.BS;
  const x0 = clamp(Math.floor((o.x - (hw || 0)) / BS), 0, W.BN - 1), x1 = clamp(Math.floor((o.x + (hw || 0)) / BS), 0, W.BN - 1), y0 = clamp(Math.floor((o.y - (hd || 0)) / BS), 0, W.BN - 1), y1 = clamp(Math.floor((o.y + (hd || 0)) / BS), 0, W.BN - 1);
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) W.buckets[j * W.BN + i].push(o);
}
function staticNear(W, x, y, fn) {
  const bx = Math.floor(x / W.BS), by = Math.floor(y / W.BS);
  for (let j = by - 1; j <= by + 1; j++) for (let i = bx - 1; i <= bx + 1; i++) { if (i < 0 || j < 0 || i >= W.BN || j >= W.BN) continue; const arr = W.buckets[j * W.BN + i]; for (let k = 0; k < arr.length; k++) if (fn(arr[k]) === true) return true; }
  return false;
}
function tileType(W, x, y) { return wTile(W, Math.floor(x / TILE), Math.floor(y / TILE)); }
function isBlockedTile(W, x, y) { const t = tileType(W, x, y); return t === 1 || t === 9 || t === 11 || t === 20; }
function addTree(W, x, y, kind, opts) {
  if (isBlockedTile(W, x, y)) return null;
  const rng = W.rng, cl = TREE_COLS[kind] || TREE_COLS.oak;
  const tr = { x, y, kind, v: rng() * 2 - 1, cols: cl[Math.floor(rng() * cl.length)], sc: 0.85 + rng() * 0.45, hp: 100, max: 100, regrow: 0, wob: 0, flowers: kind === 'oak' && rng() < 0.2, deco: opts && opts.deco };
  tr.parts = treeParts(tr); W.trees.push(tr); W.chunkObjs[chunkIdx(W, x, y)].trees.push(tr); addBucket(W, tr, 'tree'); return tr;
}
function addNode(W, x, y, kind) {
  if (isBlockedTile(W, x, y)) return null;
  const n = { x, y, kind, hp: 100, max: 100, respawn: 0, wob: 0, sc: 0.85 + W.rng() * 0.4 };
  n.parts = rockParts(n); W.nodes.push(n); W.chunkObjs[chunkIdx(W, x, y)].nodes.push(n); addBucket(W, n, 'node'); return n;
}
function addBush(W, x, y, tuft) {
  if (isBlockedTile(W, x, y)) return;
  const rng = W.rng, berry = !tuft && rng() < 0.18;
  let pal = W.biome === 'desert' ? ['#7a8a3a', '#8a9a4a'] : W.biome === 'lab' ? ['#5a7a6a', '#6a8a7a'] : W.biome === 'swamp' ? ['#2a4a2a', '#3a5a2a', '#4a3a5a'] : ['#2f7a35', '#3a8a3c', '#2a6a30', '#4a9a3e'];
  if (W.planet) pal = [W.planet.col[0], hexShade(W.planet.col[0], 0.7), W.planet.col[1]];
  if (tuft) pal = ['#7fae3a', '#8fbe4a', '#a8c45a', '#6a9a34', '#b5c46a'];
  const b = { x, y, col: pal[Math.floor(rng() * pal.length)], berries: berry ? 3 : 0, berry, regrow: 0, sc: 0.7 + rng() * 0.7, tuft: !!tuft, flower: tuft && rng() < 0.2 ? rpick(rng, ['#ffd84a', '#ff7eb6', '#ffffff', '#b58cff']) : null };
  b.parts = bushParts(b); W.bushes.push(b); W.chunkObjs[chunkIdx(W, x, y)].bushes.push(b);
}
function addProp(W, kind, x, y, o) {
  o = o || {};
  const p = Object.assign({ kind, x, y, ang: 0, solid: true }, o);
  if (p.hw !== undefined && p.ang && Math.abs(Math.sin(p.ang)) > 0.5) { const t = p.hw; p.hw = p.hd; p.hd = t; }
  W.props.push(p); W.chunkObjs[chunkIdx(W, x, y)].props.push(p);
  if (p.solid && p.hw) addBucket(W, p, 'prop', p.hw, p.hd); else p.btype = 'prop';
  if (p.light) W.lightsStatic.push({ x: x + (p.lx || 0), y: y + (p.ly || 0), r: p.light, col: p.lcol || '255,220,140', safe: p.safe !== false, night: p.nightOnly, flick: p.flick, blink: p.blink });
  return p;
}
function addCrate(W, x, y, rarity, space) { if (isBlockedTile(W, x, y)) return; W.crates.push({ x, y, rarity, opening: 0, open: false, hold: 0, space: !!space }); }
function addNpc(W, x, y, a, look, station, name, opts) { const n = Object.assign({ x, y, a, look, station, name, walk: 0, t: Math.random() * 9, home: { x, y } }, opts || {}); W.npcs.push(n); return n; }
function road(W, x0, y0, x1, y1) {
  const S = W.size;
  if (y0 === y1) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let k = 0; k < 2; k++) { const gy = y0 + k; if (x < 0 || x >= S || gy >= S) continue; const i = gy * S + x; W.roadMark[i] = (W.tiles[i] === 3 && W.roadMark[i] !== (k ? 8 : 1)) ? 4 : (k ? 8 : 1); W.tiles[i] = 3; } }
  else { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let k = 0; k < 2; k++) { const gx = x0 + k; if (y < 0 || y >= S || gx >= S) continue; const i = y * S + gx; W.roadMark[i] = (W.tiles[i] === 3 && W.roadMark[i] !== (k ? 16 : 2)) ? 4 : (k ? 16 : 2); W.tiles[i] = 3; } }
}
function freeAt(W, x, y, r) { if (isBlockedTile(W, x, y)) return false; return !staticNear(W, x, y, o => { if (o.btype === 'prop' && o.hw) return Math.abs(o.x - x) < o.hw + r && Math.abs(o.y - y) < o.hd + r; return Math.hypot(o.x - x, o.y - y) < r + 14; }); }

// =========================================================
// HAUPTKARTE
// =========================================================
const RUIN_RECT = { x0: 72, y0: 4, x1: 127, y1: 55 };
const EDEN_RECT = { x0: 10, y0: 100, x1: 28, y1: 118 };
const EDEN_GATE = { gx: 28, gy: 109 };
const GRASS_RECT = { x0: 78, y0: 66, x1: 124, y1: 124 };
const RADIO = { gx: 30, gy: 34 };
function inRect(gx, gy, r, m) { m = m || 0; return gx >= r.x0 - m && gx <= r.x1 + m && gy >= r.y0 - m && gy <= r.y1 + m; }

function makeMainWorld(seed) {
  const W = baseWorld('main', 128, seed), S = W.size, rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, C = 64;
  W.name = 'DIE WILDNIS';
  for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) { const n = W.noise(gx, gy); if (n < -0.36 && !inRect(gx, gy, GRASS_RECT)) W.tiles[gy * S + gx] = 2; }
  road(W, 20, 60, 127, 60); road(W, 98, 46, 98, 60); road(W, 60, 60, 60, 112); road(W, 60, 112, 116, 112); road(W, 20, 24, 74, 24); road(W, 20, 24, 20, 84);
  buildRuinCity(W);
  buildEdenExterior(W);
  buildRadioStation(W);
  buildTerrain(W);
  W.zones.push({ id: 'grass', n: 'DAS GRASMEER', sub: 'Endloses hohes Gras. Keine Deckung, kein Holz.', x0: GRASS_RECT.x0 * T, y0: GRASS_RECT.y0 * T, x1: GRASS_RECT.x1 * T, y1: GRASS_RECT.y1 * T, col: '#d8e86a' });
  // Kurier-Abwurfpunkte
  const DROPS = [{ n: 'Abwurfpunkt Kiefernhang', gx: 40, gy: 44 }, { n: 'Abwurfpunkt Ostbrücke', gx: 118, gy: 64 }, { n: 'Abwurfpunkt Grasmeer', gx: 100, gy: 100 }, { n: 'Abwurfpunkt Südwald', gx: 48, gy: 96 }, { n: 'Funkstation', gx: RADIO.gx + 4, gy: RADIO.gy + 5 }];
  for (const d of DROPS) { const x = d.gx * T, y = d.gy * T; if (d.n !== 'Funkstation') addProp(W, 'dropbox', x, y, { hw: 10, hd: 10, light: 70, lcol: '255,176,32', safe: false }); W.outposts.push({ n: d.n, x, y }); }
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) if (Math.hypot(i, j) < 9 && wTile(W, C + i, C + j) === 2) setTile(W, C + i, C + j, 0);
  const nearStart = (x, y, r) => Math.hypot(x - C * T, y - C * T) < r;
  for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) {
    if (W.tiles[gy * S + gx] !== 3 || inRect(gx, gy, RUIN_RECT)) continue;
    if (rng() < 0.004) addProp(W, 'barrier', (gx + 0.5) * T, (gy + 0.5) * T, { hw: 20, hd: 6, ang: rng() < 0.5 ? 0 : Math.PI / 2 });
    else if (rng() < 0.012 && !nearStart(gx * T, gy * T, 300)) addTree(W, (gx + rng()) * T, (gy + rng()) * T, rng() < 0.5 ? 'birch' : 'oak');
  }
  for (let gx = 22; gx < 126; gx += 6) addProp(W, 'streetlamp', (gx + 0.5) * T, 59.6 * T, { hw: 4, hd: 4, broken: rng() < 0.7, ang: Math.PI / 2 });
  // Nur 2 reparierbare Wracks
  [[C + 6, C - 2, '#c0392b'], [104, 30, '#2e86de']].forEach(([gx, gy, col]) => W.cars.push({ id: W.cars.length, x: gx * T, y: gy * T, a: rr(0, 6.28), color: col, wreck: true, hp: 0, maxHp: 220, fuel: 0, up: {}, v: 0, steer: 0, gunAng: 0, nitro: 100 }));
  W.starterCar = W.cars[0];
  for (let i = 0; i < 30; i++) {
    const x = rr(200, S * T - 200), y = rr(200, S * T - 200), gx = Math.floor(x / T), gy = Math.floor(y / T);
    if (W.tiles[gy * S + gx] !== 0 || inRect(gx, gy, RUIN_RECT, 2) || inRect(gx, gy, EDEN_RECT, 8) || inRect(gx, gy, GRASS_RECT) || nearStart(x, y, 340)) continue;
    const len = rr(60, 130); addProp(W, 'ruin', x, y, { len, seed: Math.floor(rng() * 100), hw: 7, hd: len / 2, ang: rng() < 0.5 ? 0 : Math.PI / 2 });
  }
  const forestOK = (gx, gy) => { const t = wTile(W, gx, gy); return (t === 0 || t === 2) && !inRect(gx, gy, RUIN_RECT, 1) && !inRect(gx, gy, EDEN_RECT, 1) && !inRect(gx, gy, GRASS_RECT) && Math.hypot(gx - RADIO.gx - 3, gy - RADIO.gy - 3) > 7 && Math.hypot(gx - EDEN_RECT.x1 - 5, gy - EDEN_GATE.gy + 3) > 4.5 && !(W.mask && W.mask[gy * S + gx] === 1); };
  for (let i = 0; i < 2300; i++) { const x = rr(60, S * T - 60), y = rr(60, S * T - 60), gx = Math.floor(x / T), gy = Math.floor(y / T); if (!forestOK(gx, gy) || nearStart(x, y, 270) || !freeAt(W, x, y, 14)) continue; const n = W.noise(gx, gy); addTree(W, x, y, n < -0.2 ? 'pine' : rng() < 0.15 ? 'birch' : rng() < 0.45 ? 'jungle' : 'oak'); }
  forestFill(W);
  for (let i = 0; i < 900; i++) {
    const gx = rr(EDEN_RECT.x0 - 9, EDEN_RECT.x1 + 13), gy = rr(EDEN_RECT.y0 - 11, EDEN_RECT.y1 + 8);
    if (inRect(Math.floor(gx), Math.floor(gy), EDEN_RECT, 1)) continue;
    if (Math.abs(gy - EDEN_GATE.gy - 0.5) < 2 && gx > EDEN_GATE.gx && gx < EDEN_GATE.gx + 14) continue;
    const x = gx * T, y = gy * T; if (!forestOK(Math.floor(gx), Math.floor(gy)) || !freeAt(W, x, y, 12)) continue;
    addTree(W, x, y, rng() < 0.5 ? 'jungle' : rng() < 0.5 ? 'pine' : 'oak');
  }
  for (let gx = EDEN_GATE.gx + 1; gx < EDEN_GATE.gx + 14; gx++) { setTile(W, gx, EDEN_GATE.gy, 2); setTile(W, gx, EDEN_GATE.gy + 1, 2); }
  for (let i = 0; i < 260; i++) {
    const x = rr(80, S * T - 80), y = rr(80, S * T - 80), gx = Math.floor(x / T), gy = Math.floor(y / T), t = wTile(W, gx, gy);
    if ((t !== 0 && t !== 2) || nearStart(x, y, 200) || inRect(gx, gy, EDEN_RECT, 2) || (inRect(gx, gy, GRASS_RECT) && rng() < 0.8) || !freeAt(W, x, y, 16)) continue;
    addNode(W, x, y, inRect(gx, gy, RUIN_RECT) ? 'rubble' : rng() < 0.68 ? 'rock' : 'scrap');
  }
  for (let i = 0; i < 2200; i++) { const x = rr(30, S * T - 30), y = rr(30, S * T - 30), gx = Math.floor(x / T), gy = Math.floor(y / T), t = wTile(W, gx, gy); if ((t === 0 || t === 2 || (t === 4 && rng() < 0.4)) && !inRect(gx, gy, EDEN_RECT) && !inRect(gx, gy, GRASS_RECT)) addBush(W, x, y); }
  for (let i = 0; i < 2600; i++) { const x = rr(GRASS_RECT.x0, GRASS_RECT.x1) * T, y = rr(GRASS_RECT.y0, GRASS_RECT.y1) * T; if (wTile(W, Math.floor(x / T), Math.floor(y / T)) !== 3) addBush(W, x, y, true); }
  for (let i = 0; i < 14; i++) { const x = rr(150, S * T - 150), y = rr(150, S * T - 150), gx = Math.floor(x / T), gy = Math.floor(y / T); if (inRect(gx, gy, EDEN_RECT, 1) || !freeAt(W, x, y, 14)) continue; const r = rng(); addCrate(W, x, y, r < 0.55 ? 0 : r < 0.83 ? 1 : r < 0.96 ? 2 : 3); }
  finishWorld(W);
  return W;
}
function buildRuinCity(W) {
  const rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, XS = [74, 84, 94, 104, 114, 124], YS = [6, 16, 26, 36, 46];
  for (const x of XS) road(W, x, 6, x, 47); for (const y of YS) road(W, 74, y, 125, y);
  W.zones.push({ id: 'ruin', n: 'RUINENSTADT ROSTHAFEN', sub: 'Hochhäuser plündern (E) · Lärm weckt die Toten', x0: 73 * T, y0: 5 * T, x1: 127 * T, y1: 49 * T, col: '#ff9a3c' });
  const palette = [['#9a958a', false], ['#8a4b3a', false], ['#4f6f7f', true], ['#b8a27a', false], ['#7a7f86', true], ['#6b5a4a', false]];
  for (let bx = 0; bx < XS.length - 1; bx++) for (let by = 0; by < YS.length - 1; by++) {
    const x0 = XS[bx] + 2, y0 = YS[by] + 2;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) setTile(W, x0 + i, y0 + j, (i === 0 || j === 0 || i === 7 || j === 7) ? 4 : (rng() < 0.6 ? 2 : 0));
    for (let i = 1; i < 8; i += 3) addProp(W, 'streetlamp', (x0 + i + 0.5) * T, (y0 + 7.6) * T, { hw: 4, hd: 4, broken: rng() < 0.8, ang: Math.PI / 2 });
    if (rng() < 0.6) addTree(W, (x0 + 7.5) * T, (y0 + rr(1, 6)) * T, rng() < 0.5 ? 'birch' : 'oak');
    const ix = (x0 + 1) * T, iy = (y0 + 1) * T, r = rng();
    if (bx === 2 && by === 2) {
      for (let j = 1; j < 7; j++) for (let i = 1; i < 7; i++) setTile(W, x0 + i, y0 + j, 4);
      const cx = ix + 3 * T, cy = iy + 3 * T; addProp(W, 'hpad', cx, cy, { solid: false });
      W.heli = { x: cx, y: cy, z: 0, a: -0.6, wreck: true, hp: 0, maxHp: 260, fuel: 0, up: {}, rot: 0, rotSpd: 0, vx: 0, vy: 0, state: 'parked' };
      W.zones.push({ id: 'hpad', n: 'DACHLANDEPLATZ', sub: 'Ein Helikopter-Wrack! (Schrott, Elektronik, Sprit)', x0: ix, y0: iy, x1: ix + 6 * T, y1: iy + 6 * T, col: '#7ad7ff', once: true });
    } else if (r < 0.72) {
      const fw = 4 + Math.floor(rng() * 3), fh = 4 + Math.floor(rng() * 3), ox = (6 - fw) / 2, oy = (6 - fh) / 2, pal = palette[Math.floor(rng() * palette.length)], ruined = rng() < 0.35;
      const Tw = { seed: Math.floor(rng() * 1e6), fw, fh, floors: ruined ? 8 + Math.floor(rng() * 8) : 6 + Math.floor(rng() * 13), col: pal[0], glass: pal[1], ruined, looted: 0, restock: 0, name: rpick(rng, ['Hotel Atlas', 'Bürohaus Nord', 'Wohnturm Rost', 'Kaufhaus Klee', 'Bank Varga', 'Klinik St. Ivo', 'Telekom-Turm', 'Lagerhaus 9']) };
      const cx = ix + (ox + fw / 2) * T, cy = iy + (oy + fh / 2) * T; Tw.x = cx; Tw.y = cy;
      for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) setTile(W, x0 + 1 + Math.floor(ox) + i, y0 + 1 + Math.floor(oy) + j, 4);
      addProp(W, 'tower', cx, cy, { hw: fw * T / 2 - 2, hd: fh * T / 2 - 2, tower: Tw });
      for (let k = 0; k < 2; k++) addNode(W, cx + fw * T / 2 + rr(14, 30), cy + rr(-fh * T / 2, fh * T / 2), 'rubble');
    } else { for (let k = 0; k < 7; k++) addTree(W, ix + rr(20, 6 * T - 20), iy + rr(20, 6 * T - 20), rpick(rng, ['oak', 'jungle', 'birch'])); addProp(W, 'ruin', ix + 3 * T, iy + 2 * T, { len: 90, seed: 7, hw: 7, hd: 45 }); addNode(W, ix + 2 * T, iy + 4 * T, 'scrap'); }
  }
  for (const x of XS) for (const y of YS) addProp(W, 'trafficlight', (x - 0.3) * T, (y - 0.3) * T, { hw: 3, hd: 3 });
  for (let k = 0; k < 14; k++) { const vert = rng() < 0.5, line = vert ? rpick(rng, XS) : rpick(rng, YS), along = vert ? rr(7, 46) : rr(75, 124); addProp(W, 'barrier', (vert ? line + 1 : along) * T, (vert ? along : line + 1) * T, { hw: 20, hd: 6, ang: vert ? 0 : Math.PI / 2 }); }
  for (let k = 0; k < 40; k++) { const vert = rng() < 0.5, line = vert ? rpick(rng, XS) : rpick(rng, YS), along = vert ? rr(7, 46) : rr(75, 124); addTree(W, (vert ? line + rr(0.2, 1.8) : along) * T, (vert ? along : line + rr(0.2, 1.8)) * T, rpick(rng, ['oak', 'birch', 'jungle'])); }
}
function buildEdenExterior(W) {
  const T = TILE, R0 = EDEN_RECT;
  for (let gy = R0.y0; gy <= R0.y1; gy++) for (let gx = R0.x0; gx <= R0.x1; gx++) setTile(W, gx, gy, 9);
  const len = (R0.x1 - R0.x0) * T, cx = (R0.x0 + R0.x1) / 2 * T, cy = (R0.y0 + R0.y1) / 2 * T, H = 150;
  addProp(W, 'edenskyline', cx, cy, { w: len - 30, d: len - 30, seed: 4242, solid: false });
  addProp(W, 'citywall', cx, R0.y0 * T, { len, hw: len / 2, hd: 14, H });
  addProp(W, 'citywall', cx, R0.y1 * T, { len, hw: len / 2, hd: 14, H });
  addProp(W, 'citywall', R0.x0 * T, cy, { len, hw: len / 2, hd: 14, H, ang: Math.PI / 2 });
  const gy = EDEN_GATE.gy + 1, l1 = (gy - 3 - R0.y0) * T, l2 = (R0.y1 - gy - 3) * T;
  addProp(W, 'citywall', R0.x1 * T, R0.y0 * T + l1 / 2, { len: l1, hw: l1 / 2, hd: 14, H, ang: Math.PI / 2 });
  addProp(W, 'citywall', R0.x1 * T, R0.y1 * T - l2 / 2, { len: l2, hw: l2 / 2, hd: 14, H, ang: Math.PI / 2 });
  addProp(W, 'citygate', R0.x1 * T, gy * T, { hw: 22, hd: 76, light: 190, lcol: '255,230,170' });
  W.eden = { x: (R0.x1 + 1.4) * T, y: gy * T };
  W.shipPad = { x: (R0.x1 + 5) * T, y: (gy - 4) * T };
  addProp(W, 'hpad', W.shipPad.x, W.shipPad.y, { solid: false, light: 120, lcol: '160,220,255', safe: true });
  W.zones.push({ id: 'eden', n: 'NEU-EDEN', sub: 'Die Festungsstadt. Eintritt nur durchs Tor (E).', x0: (R0.x1 - 2) * T, y0: (gy - 7) * T, x1: (R0.x1 + 9) * T, y1: (gy + 6) * T, col: '#ffd84a', once: true });
}
function buildRadioStation(W) {
  const T = TILE, x = RADIO.gx * T, y = RADIO.gy * T;
  for (let j = -6; j <= 8; j++) for (let i = -6; i <= 8; i++) setTile(W, RADIO.gx + i, RADIO.gy + j, Math.hypot(i - 1, j - 1) < 6 ? 8 : 2);
  W.radioTower = addProp(W, 'radiotower', x - 60, y - 60, { hw: 20, hd: 20 });
  W.radioHut = addProp(W, 'radiohut', x + 80, y + 40, { hw: 48, hd: 35, fixed: false });
  W.lightsStatic.push({ x: x - 60, y: y - 60, r: 60, col: '255,60,40', safe: false, blink: true });
  addProp(W, 'fence', x + 20, y + 200, { len: 240, hw: 120, hd: 3 }); addProp(W, 'fence', x - 140, y + 60, { len: 200, hw: 100, hd: 3, ang: Math.PI / 2 });
  addProp(W, 'container', x - 40, y + 150, { hw: 50, hd: 17, col: '#7a5a3a' }); addCrate(W, x + 30, y + 120, 1); addCrate(W, x - 90, y + 20, 2);
  W.zones.push({ id: 'radio', n: 'VERLASSENE FUNKSTATION', sub: 'Das Funkgerät könnte noch funktionieren …', x0: x - 300, y0: y - 300, x1: x + 400, y1: y + 400, col: '#ff9a3c' });
}

// =========================================================
// EXPEDITION / PLANET
// =========================================================
function genOpenWorld(W, cfg) {
  const S = W.size, rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, lz = { gx: 7, gy: 32 };
  for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) { if (Math.hypot(gx - lz.gx, gy - lz.gy) < 7) continue; if (W.noise(gx * 1.3, gy * 1.3) < -0.3) W.tiles[gy * S + gx] = 2; }
  W.lz = { x: lz.gx * T, y: lz.gy * T };
  for (const pr of cfg.props) { const x = rr(400, S * T - 200), y = rr(200, S * T - 200); if (!freeAt(W, x, y, Math.max(pr.hw, pr.hd) + 10)) continue; addProp(W, pr.kind, x, y, Object.assign({ ang: rng() < 0.5 ? 0 : Math.PI / 2 }, pr)); if (pr.crate) addCrate(W, x + pr.hw + 30, y + 20, rng() < 0.5 ? 2 : 1); }
  for (let i = 0; i < cfg.treeN; i++) { const x = rr(40, S * T - 40), y = rr(40, S * T - 40); if (Math.hypot(x - W.lz.x, y - W.lz.y) < 260 || !freeAt(W, x, y, 14)) continue; addTree(W, x, y, rpick(rng, cfg.trees)); }
  for (let i = 0; i < 30; i++) { const x = rr(300, S * T - 80), y = rr(80, S * T - 80); if (!freeAt(W, x, y, 18)) continue; addNode(W, x, y, cfg.node); }
  for (let i = 0; i < 20; i++) { const x = rr(300, S * T - 80), y = rr(80, S * T - 80); if (!freeAt(W, x, y, 18)) continue; addNode(W, x, y, rng() < 0.5 ? 'rock' : 'scrap'); }
  for (let i = 0; i < 600; i++) addBush(W, rr(30, S * T - 30), rr(30, S * T - 30));
  for (let i = 0; i < cfg.crates; i++) { const x = rr(400, S * T - 100), y = rr(100, S * T - 100); if (!freeAt(W, x, y, 14)) continue; const r = rng(); addCrate(W, x, y, r < 0.3 ? 0 : r < 0.65 ? 1 : r < 0.9 ? 2 : 3); }
}
function makeExpWorld(seed, biomeId, danger) {
  const B = BIOMES[biomeId], W = baseWorld('exp', 64, seed); W.biome = biomeId; W.name = B.n.toUpperCase(); W.danger = danger;
  const dims = { bunker: [48, 38], tank: [42, 26], sandbag: [8, 34], tower: [24, 24], container: [50, 17], pump: [24, 14], hut: [28, 23], skull: [0, 0], labbox: [37, 27], antenna: [8, 8] };
  const props = []; for (let k = 0; k < 34; k++) { const kind = rpick(W.rng, B.props), d = dims[kind]; props.push({ kind: kind === 'tower' ? 'wtower' : kind, hw: d[0], hd: d[1], solid: kind !== 'skull', crate: kind === 'bunker' || kind === 'labbox', col: rpick(W.rng, ['#a0522d', '#2e5e8a', '#4b5d3a']), ph: W.rng() * 6 }); }
  if (biomeId === 'lab' || biomeId === 'military') { road(W, 9, 32, 60, 32); road(W, 34, 6, 34, 60); }
  genOpenWorld(W, { props, treeN: B.treeN, trees: B.trees, node: B.node, crates: 7 + danger * 3 });
  W.exHeli = { x: W.lz.x, y: W.lz.y + 10, z: 0, a: 0, wreck: false, up: {}, rot: 0, rotSpd: 6 };
  addProp(W, 'hpad', W.lz.x, W.lz.y + 10, { solid: false, light: 200, lcol: '255,90,70', safe: true });
  if (B.node === 'crystal') for (const n of W.nodes) if (n.kind === 'crystal') W.lightsStatic.push({ x: n.x, y: n.y, r: 90, col: '200,120,255', safe: false, node: n });
  finishWorld(W); return W;
}
function makePlanetWorld(pid) {
  const P0 = PLANETS.find(p => p.id === pid), W = baseWorld('planet', 72, 9000 + PLANETS.indexOf(P0) * 77 + ((S && S.seed) || 0) % 997);
  W.planet = P0; W.name = P0.n + ' · ' + P0.sub.toUpperCase(); W.danger = P0.danger;
  const props = []; for (let k = 0; k < 24; k++) { const r = W.rng(); props.push(r < 0.35 ? { kind: 'monolith', hw: 20, hd: 20, col: P0.col[2] } : r < 0.7 ? { kind: 'alienpod', hw: 15, hd: 15, col: P0.col[0], solid: true } : { kind: 'wreckship', hw: 60, hd: 30, crate: true }); }
  genOpenWorld(W, { props, treeN: 320, trees: P0.trees, node: P0.node, crates: 6 });
  for (const n of W.nodes) if (n.kind === P0.node) W.lightsStatic.push({ x: n.x, y: n.y, r: 100, col: P0.light, safe: false, node: n });
  for (const p of W.props) if (p.kind === 'monolith' || p.kind === 'alienpod') W.lightsStatic.push({ x: p.x, y: p.y, r: 110, col: P0.light, safe: false });
  W.shipPad = { x: W.lz.x, y: W.lz.y };
  addProp(W, 'shipdock', W.lz.x, W.lz.y, { solid: false, light: 220, lcol: '120,220,255', safe: true });
  finishWorld(W); return W;
}
// =========================================================
// WELTRAUM & STATION
// =========================================================
function makeSpaceWorld(at) {
  const W = baseWorld('space', 80, 5000 + PLANETS.findIndex(p => p.id === at) * 13), rng = W.rng, T = TILE, S = W.size;
  W.name = 'ORBIT · ' + PLANETS.find(p => p.id === at).n; W.at = at; W.planet = PLANETS.find(p => p.id === at);
  W.station = { x: S * T / 2, y: S * T / 2 };
  W.stationProp = addProp(W, 'station', W.station.x, W.station.y, { hw: 130, hd: 130, owned: false });
  for (let i = 0; i < 70; i++) { const x = rng() * S * T, y = rng() * S * T; if (Math.hypot(x - W.station.x, y - W.station.y) < 600) continue; addNode(W, x, y, rng() < 0.3 ? 'titanrock' : 'asteroid'); }
  for (let i = 0; i < 5; i++) { const x = rng() * S * T, y = rng() * S * T; if (Math.hypot(x - W.station.x, y - W.station.y) < 500) continue; addCrate(W, x, y, rng() < 0.5 ? 1 : 2, true); }
  W.stars = []; for (let i = 0; i < 260; i++) W.stars.push({ x: rng(), y: rng(), s: rng() * 2 + 0.5, d: rng() * 0.6 + 0.2, c: rpick(rng, ['#ffffff', '#cfe6ff', '#ffe6c0', '#c8b8ff']) });
  W.ambient = 'space';
  return W;
}
function makeStationWorld(owned) {
  const W = baseWorld('station', 30, 3131), T = TILE, S = 30;
  W.name = owned ? 'STATION »AURORA« (DEINE)' : 'VERLASSENE STATION'; W.ambient = 'station'; W.owned = owned;
  for (let i = 0; i < S * S; i++) W.tiles[i] = 10;
  const wall = (x, y, len, vert) => addProp(W, 'stwall', x * T, y * T, { len: len * T, hw: len * T / 2, hd: 8, ang: vert ? Math.PI / 2 : 0, owned });
  wall(15, 2, 26); wall(15, 28, 26); wall(2, 15, 26, true); wall(28, 15, 26, true);
  wall(8, 10, 10); wall(22, 10, 10); wall(8, 20, 10); wall(22, 20, 10); wall(10, 5.5, 5, true); wall(20, 24.5, 5, true);
  W.core = addProp(W, 'core', 15 * T, 15 * T, { hw: 35, hd: 35, owned, light: 260, lcol: owned ? '95,212,255' : '255,94,58', safe: false });
  W.holo = addProp(W, 'holo', 22 * T, 6 * T, { hw: 45, hd: 45, light: 200, lcol: '95,212,255', safe: false });
  W.shipPad = { x: 6 * T, y: 24 * T }; addProp(W, 'shipdock', W.shipPad.x, W.shipPad.y, { solid: false, light: 200, lcol: '255,200,120', safe: false });
  for (const [x, y] of [[5, 5], [25, 5], [25, 25], [13, 7], [17, 23], [5, 15], [25, 15]]) addProp(W, 'console', x * T, y * T, { hw: 15, hd: 9, owned, light: 90, lcol: owned ? '95,212,255' : '255,120,80', safe: false });
  for (const [x, y] of [[24, 18], [24, 21]]) addProp(W, 'bunk', x * T, y * T, { hw: 25, hd: 11 });
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) W.lightsStatic.push({ x: (4 + i * 3) * T, y: (j ? 26 : 4) * T, r: 130, col: owned ? '180,220,255' : '255,120,90', safe: false });
  if (!owned) for (const [x, y, r] of [[4, 8, 2], [26, 8, 1], [10, 26, 2], [26, 26, 3], [15, 4, 1], [4, 26, 1], [18, 12, 2]]) addCrate(W, x * T, y * T, r, true);
  W.spawn = { x: W.shipPad.x + 80, y: W.shipPad.y - 40 };
  finishWorld(W); return W;
}

// =========================================================
// NEU-EDEN: Oberstadt (Piltover-Stil) & Unterstadt (Zaun-Stil)
// =========================================================
function makeCityWorld(level) {
  const W = baseWorld(level, 40, level === 'city' ? 777 : 666), S = 40, T = TILE, rng = W.rng, rr = (a, b) => a + rng() * (b - a);
  W.name = level === 'city' ? 'NEU-EDEN · OBERSTADT' : 'NEU-EDEN · UNTERSTADT';
  const st = (gx, gy, a, look, station, name) => addNpc(W, gx * T, gy * T, a, look, station, name);
  if (level === 'city') {
    for (let i = 0; i < S * S; i++) W.tiles[i] = 5;
    for (let i = 3; i < 37; i++) for (let k = 0; k < 3; k++) { setTile(W, i, 18 + k, 6); setTile(W, 19 + k, i, 6); }
    for (const [x0, y0, w, h] of [[3, 3, 6, 5], [30, 30, 7, 6], [3, 25, 6, 5]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setTile(W, x0 + i, y0 + j, 0);
    for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2]]) addProp(W, 'citywall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang, H: 110 });
    addProp(W, 'citywall', (S - 0.4) * T, 8 * T, { len: 16 * T, hw: 8 * T, hd: 14, ang: Math.PI / 2, H: 110 }); addProp(W, 'citywall', (S - 0.4) * T, 31 * T, { len: 18 * T, hw: 9 * T, hd: 14, ang: Math.PI / 2, H: 110 });
    addProp(W, 'innergate', (S - 1.2) * T, 19.5 * T, { hw: 16, hd: 76 });
    addProp(W, 'rathaus', 19.5 * T, 6.5 * T, { hw: 140, hd: 110 });
    addProp(W, 'royal', 31 * T, 11 * T, { hw: 125, hd: 105, light: 260, lcol: '255,210,90', lx: 150 });
    addProp(W, 'shop', 9 * T, 13 * T, { hw: 66, hd: 56, col: '#3b4d74' }); addProp(W, 'shop', 9 * T, 21.5 * T, { hw: 66, hd: 56, col: '#3f7f7a' });
    addProp(W, 'shop', 30 * T, 23.5 * T, { hw: 66, hd: 56, col: '#a5503a' }); addProp(W, 'shop', 26 * T, 30.5 * T, { hw: 66, hd: 56, col: '#34466a' });
    addProp(W, 'skyloft', 13 * T, 32 * T, { hw: 72, hd: 62 }); addProp(W, 'villa', 33 * T, 34 * T, { hw: 100, hd: 80 });
    addProp(W, 'clocktower', 27 * T, 4 * T, { hw: 30, hd: 30 }); addProp(W, 'glassdome', 6 * T, 5.5 * T, { hw: 75, hd: 60 });
    addProp(W, 'pilthouse', 6 * T, 28 * T, { w: 100, d: 90, H: 90, col: '#3f7f7a', seed: 3, hw: 52, hd: 47 }); addProp(W, 'pilthouse', 36 * T, 3.5 * T, { w: 80, d: 70, H: 80, col: '#a5503a', seed: 8, hw: 42, hd: 37 });
    addProp(W, 'elevator', 19.5 * T, 30 * T, { hw: 38, hd: 38, light: 120, lcol: '160,255,140', col: '#ffd84a' });
    addProp(W, 'fountain', 20 * T, 19.5 * T, { hw: 46, hd: 46 });
    for (let i = 5; i < 36; i += 4) { if (i > 16 && i < 23) continue; addProp(W, 'lamppost', i * T, 17.6 * T, { hw: 4, hd: 4, light: 150, lcol: '255,230,170', nightOnly: true }); addProp(W, 'lamppost', i * T, 21.4 * T, { hw: 4, hd: 4, light: 150, lcol: '255,230,170', nightOnly: true }); }
    for (let i = 5; i < 36; i += 6) { if (i > 15 && i < 24) continue; addProp(W, 'bench', 22.4 * T, i * T, { hw: 6, hd: 17, ang: Math.PI / 2 }); addProp(W, 'planter', 17.4 * T, i * T, { hw: 15, hd: 15, flowers: true }); }
    for (let k = 0; k < 14; k++) { const r = rpick(rng, [[3, 3, 6, 5], [30, 30, 7, 6], [3, 25, 6, 5]]); const x = (r[0] + rr(0.5, r[2] - 0.5)) * T, y = (r[1] + rr(0.5, r[3] - 0.5)) * T; if (freeAt(W, x, y, 20)) addTree(W, x, y, rpick(rng, ['oak', 'birch']), { deco: true }); }
    for (let i = 0; i < 3; i++) W.airships.push({ x: rr(0, S * T), y: rr(0, S * T), z: 260 + i * 40, a: rr(0, 6.28), sp: rr(20, 40) });
    st(13.8, 13, 0, npcLook('rich', rng), 'market', 'Händlerin Mara');
    st(13.8, 21.5, 0, npcLook('rich', rng), 'broker', 'Makler Vossberg');
    st(34.8, 23.5, Math.PI, npcLook('rich', rng), 'jobs', 'Jobvermittlung');
    st(30.8, 30.5, Math.PI, npcLook('rich', rng), 'courier', 'Kurier-Zentrale');
    st(23, 9.5, Math.PI / 2, Object.assign(npcLook('rich', rng), { hat: 'Zylinder' }), 'townhall', 'Stadtschreiber Okoro');
    st(35.5, 11, Math.PI, Object.assign(npcLook('rich', rng), { coat: '#1b1b22' }), 'royal', 'ROYAL CASINO');
    st(16.5, 34.5, Math.PI / 2, npcLook('spacer', rng), 'shipyard', 'Werft »Sternenschmiede«');
    st(10, 7.5, 0, npcLook('spacer', rng), 'agency', 'Raumfahrtbehörde');
    st(9.5, 30, 0, npcLook('rich', rng), 'home', 'Hausmeister');
    st(22, 30, Math.PI, npcLook('guard', rng), 'elevator', 'Aufzug ↓ Unterstadt');
    st(36, 17, Math.PI, npcLook('guard', rng), 'exit', 'Stadttor');
    for (let k = 0; k < 16; k++) addNpc(W, rr(6, 34) * T, rr(16, 23) * T, rr(0, 6), npcLook('rich', rng), null, null, { wander: true });
    W.spawn = { x: 36 * T, y: 19.5 * T }; W.ambient = 'day';
  } else {
    for (let i = 0; i < S * S; i++) W.tiles[i] = 7;
    for (let i = 2; i < 38; i++) for (let k = 0; k < 2; k++) { setTile(W, i, 19 + k, 4); setTile(W, 19 + k, i, 4); }
    for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2], [(S - 0.4) * T, S * T / 2, Math.PI / 2]]) addProp(W, 'citywall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang });
    const glows = [['255,63,164', '#ff3fa4'], ['95,255,138', '#5fff8a'], ['255,176,74', '#ffb04a']];
    let si = 0;
    for (const gx of [6, 13, 27, 34]) for (const gy of [5, 13, 27, 34]) { if ((gx === 13 || gx === 27) && gy === 5) continue; if (gx === 34 && gy === 34) continue; if (gx === 13 && gy === 34) continue; addProp(W, 'zaunhouse', gx * T, gy * T, { w: 100, d: 90, H: 60 + (si % 3) * 25, seed: 50 + si++, hw: 52, hd: 47, light: 110, lcol: rpick(rng, glows)[0], safe: false }); }
    addProp(W, 'neoncasino', 20 * T, 8 * T, { hw: 110, hd: 92, light: 300, lcol: '255,63,164', lx: 130 });
    addProp(W, 'neonbar', 8 * T, 21 * T, { hw: 80, hd: 66, col: '#ff3fa4', col2: '#5fff8a', light: 210, lcol: '255,63,164', lx: 90, seed: 31 });
    addProp(W, 'neonbar', 31 * T, 23 * T, { hw: 80, hd: 66, col: '#ffb04a', col2: '#5fff8a', light: 210, lcol: '95,255,138', lx: 90, seed: 32 });
    addProp(W, 'blackmarket', 9 * T, 34 * T, { hw: 52, hd: 30, light: 120, lcol: '95,255,138' });
    addProp(W, 'cityhome', 31 * T, 34.5 * T, { hw: 52, hd: 47 });
    addProp(W, 'elevator', 20 * T, 33 * T, { hw: 38, hd: 38, light: 140, lcol: '160,255,140', col: '#5fff8a', cab: 120, zaun: true });
    addProp(W, 'pipebridge', 20 * T, 15 * T, { len: 520, hw: 6, hd: 6, solid: false }); addProp(W, 'pipebridge', 26 * T, 26 * T, { len: 420, hw: 6, hd: 6, ang: Math.PI / 2, solid: false });
    for (const [x, y] of [[15, 25], [25, 15], [4, 30]]) addProp(W, 'chemvat', x * T, y * T, { hw: 25, hd: 25, light: 120, lcol: '95,255,138', safe: false });
    for (let k = 0; k < 12; k++) { const x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 34)) continue; addProp(W, 'stall', x, y, { hw: 24, hd: 18, col: rpick(rng, ['#8a2a2a', '#2a6a5a', '#7a5a2a']), light: 80, lcol: '255,200,120', safe: false }); }
    for (let k = 0; k < 10; k++) { const n = rpick(rng, glows), x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 30)) continue; addProp(W, 'neonsign', x, y, { hw: 4, hd: 26, col: n[1], col2: rpick(rng, glows)[1], light: 100, lcol: n[0], safe: false, ang: rng() < 0.5 ? 0 : Math.PI / 2 }); }
    for (let k = 0; k < 10; k++) { const x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 20)) continue; addProp(W, 'barrelfire', x, y, { hw: 9, hd: 9, light: 120, lcol: '255,140,60', flick: true, safe: false }); }
    for (let k = 0; k < 14; k++) { const x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 20)) continue; addProp(W, 'trash', x, y, { solid: false }); }
    st(20, 13.5, Math.PI / 2, npcLook('punk', rng), 'neon', 'Casino »DIE GRUBE«');
    st(13.5, 21, 0, npcLook('punk', rng), 'bar', 'Bar »Rostiger Anker«');
    st(36, 23, Math.PI, npcLook('punk', rng), 'bar2', 'Bar »Letzter Tropfen«');
    st(12, 37, Math.PI / 2, Object.assign(npcLook('punk', rng), { hat: 'Bandana' }), 'black', 'Schwarzmarkt');
    st(27, 30, Math.PI, Object.assign(npcLook('punk', rng), { hat: 'Zylinder', coat: '#1a1a1a' }), 'fixer', 'Der Fixer');
    st(35, 34.5, Math.PI, npcLook('punk', rng), 'home', 'Kellerloch-Vermieterin');
    st(22.5, 33, Math.PI, npcLook('guard', rng), 'elevator', 'Aufzug ↑ Oberstadt');
    for (let k = 0; k < 20; k++) addNpc(W, rr(4, 36) * T, rr(4, 36) * T, rr(0, 6), npcLook('punk', rng), null, null, { wander: true });
    W.spawn = { x: 22.5 * T, y: 30 * T }; W.ambient = 'under';
  }
  finishWorld(W); return W;
}

function finishWorld(W) {
  const rng = mulberry32(W.seed + 99), S = W.size, T = TILE;
  let cols = W.biome === 'desert' ? ['#a8a050', '#b8b060', '#98904a', '#c0b870'] : W.biome === 'lab' ? ['#8aa8a0', '#9ab8b0', '#7a9890', '#aac8c0'] : W.biome === 'swamp' ? ['#2f5a3a', '#3a6a3a', '#2a4a3a', '#5a4a6a'] : ['#4f9b43', '#62ad4b', '#3e8a3a', '#78bd52'];
  if (W.planet && W.kind === 'planet') cols = [W.planet.col[0], hexShade(W.planet.col[0], 0.75), W.planet.col[2], hexShade(W.planet.col[1], 1.3)];
  W.grassCols = cols;
  if (W.kind === 'space' || W.kind === 'station') return;
  const n = W.kind === 'main' ? S * S * 0.62 : (W.kind === 'exp' || W.kind === 'planet') ? S * S * 0.5 : S * S * 0.12;
  for (let i = 0; i < n; i++) {
    const x = rng() * S * T, y = rng() * S * T, t = tileType(W, x, y);
    if (!(t === 0 || t === 2 || t === 19 || (t === 3 && rng() < 0.3) || (t === 4 && rng() < 0.2))) continue;
    W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 8 + rng() * 12, c: Math.floor(rng() * 4), ph: rng() * 6 });
  }
  if (W.kind === 'main' && W.mask) for (let i = 0; i < 26000; i++) { const x = rng() * S * T, y = rng() * S * T, gx = Math.floor(x / T), gy = Math.floor(y / T); if (W.mask[gy * S + gx] !== 1 || W.tiles[gy * S + gx] !== 0) continue; W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 16 + rng() * 16, c: Math.floor(rng() * 4), ph: rng() * 6 }); }
  if (W.kind === 'main') for (let i = 0; i < 9000; i++) { const x = rng() * (GRASS_RECT.x1 - GRASS_RECT.x0) * T + GRASS_RECT.x0 * T, y = rng() * (GRASS_RECT.y1 - GRASS_RECT.y0) * T + GRASS_RECT.y0 * T; if (tileType(W, x, y) === 3) continue; W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 18 + rng() * 18, c: Math.floor(rng() * 4), ph: rng() * 6 }); }
}

// ---------- Boden-Chunks ----------
function tileColor(W, t, n, r) {
  const B = W.biome ? BIOMES[W.biome] : null, PL = W.kind === 'planet' ? W.planet : null;
  switch (t) {
    case 0: if (PL) return hsl2hex(PL.ground[0] + n * 12, PL.ground[1], PL.ground[2] + n * 5 + r * 2); return B ? hsl2hex(B.grass[0] + n * 10, B.grass[1], B.grass[2] + n * 5 + r * 2) : hsl2hex(102 + n * 18, 46, 30 + n * 6 + r * 2);
    case 2: if (PL) return hsl2hex(PL.dirt[0], PL.dirt[1], PL.dirt[2] + n * 6); return B ? hsl2hex(B.dirt[0], B.dirt[1], B.dirt[2] + n * 6) : hsl2hex(32, 30, 30 + n * 6);
    case 3: return hsl2hex(220, 5, 24 + n * 4 + r * 2);
    case 4: return W.ambient === 'under' ? hsl2hex(150, 8, 22 + n * 3 + r * 2) : hsl2hex(40, 6, 50 + n * 4 + r * 2);
    case 5: return hsl2hex(40, 30, 84 + n * 3);
    case 6: return hsl2hex(32, 34, 70 + n * 4);
    case 7: return hsl2hex(150, 14, 12 + n * 3 + r * 2);
    case 8: return hsl2hex(70, 6, 44 + n * 4);
    case 10: return hsl2hex(210, 10, 26 + n * 3 + r * 2);
    case 11: return '#120e0a';
    case 12: case 15: return hsl2hex(30, 10, (W.kind === 'city' ? 52 : 44) + n * 4);
    case 13: return hsl2hex(40, 40, 80);
    case 14: return hsl2hex(205, 30, 93 + n * 2);
    case 16: return hsl2hex(38, 16, 72 + n * 3);
    case 17: return hsl2hex(150, 12, 15 + n * 3 + r * 2);
    case 18: return hsl2hex(160, 8, 13);
    case 19: return hsl2hex(95, 32, 19 + n * 4 + r * 2);
  }
  return '#16301d';
}
function renderChunk(W, cx, cy) {
  const cw = Math.ceil(2 * CH * TILE * IX), chh = Math.ceil(2 * CH * TILE * IY) + GPAD + GPADB;
  const RS = (W.kind === 'city' || W.kind === 'under') ? 2 : 1;
  const cv = document.createElement('canvas'); cv.width = cw * RS; cv.height = chh * RS;
  const g = cv.getContext('2d'), sG = G, sV = Object.assign({}, VIEW);
  G = g; Object.assign(VIEW, { cx: cx * CH * TILE, cy: cy * CH * TILE, ox: CH * TILE * IX * RS, oy: GPAD * RS, zoom: RS });
  const rng = mulberry32(W.seed * 7 + cx * 1013 + cy * 7919), S = W.size, T = TILE, gx0 = cx * CH, gy0 = cy * CH;
  const HC = W.kind === 'planet' ? [W.planet.col[0], hexShade(W.planet.col[0], 0.7), W.planet.col[2]] : W.biome === 'desert' ? ['#a8a050', '#8a8040'] : W.biome === 'lab' ? ['#7a9890', '#6a8880', '#ffffff'] : W.biome === 'swamp' ? ['#2a5a3a', '#3a6a3a', '#5a4a6a'] : ['#3d7f35', '#4f9b43', '#62ad4b', '#2f6b2e', '#78bd52'];
  const HB = HC.map(() => []);
  for (let gy = gy0; gy < Math.min(S, gy0 + CH); gy++) for (let gx = gx0; gx < Math.min(S, gx0 + CH); gx++) {
    const t = W.tiles[gy * S + gx], n = W.noise(gx * 1.7, gy * 1.7), col = tileColor(W, t, n, rng());
    if (t !== 11 && t !== 20) { tileDiamond(gx, gy, 1, 1); g.fillStyle = col; g.fill(); g.strokeStyle = col; g.lineWidth = 1; g.stroke(); }
    if (t >= 11 && drawTileDetail(g, W, t, gx, gy, rng)) continue;
    if (t === 4 || t === 5 || t === 6 || t === 8 || t === 10) { g.strokeStyle = t === 10 ? 'rgba(120,180,220,0.18)' : 'rgba(0,0,0,0.12)'; tileDiamond(gx, gy, 1, 1); g.stroke(); if (t === 6 || t === 5) { tileDiamond(gx + 0.25, gy + 0.25, 0.5, 0.5); g.fillStyle = t === 5 ? 'rgba(201,149,42,0.12)' : 'rgba(255,255,255,0.1)'; g.fill(); } }
    if (t === 10 && (gx + gy) % 3 === 0) { tileDiamond(gx + 0.1, gy + 0.1, 0.8, 0.8); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.stroke(); }
    if (t === 3) {
      const m = W.roadMark[gy * S + gx]; g.strokeStyle = 'rgba(240,200,60,0.75)'; g.lineWidth = 2;
      const dash = (ax, ay, bx, by) => { const a = P(ax, ay, 0), b = P(bx, by, 0); g.beginPath(); g.moveTo(lerp(a.x, b.x, 0.2), lerp(a.y, b.y, 0.2)); g.lineTo(lerp(a.x, b.x, 0.7), lerp(a.y, b.y, 0.7)); g.stroke(); };
      if (m === 1 && gx % 2 === 0) dash(gx * T, (gy + 1) * T, (gx + 1) * T, (gy + 1) * T); if (m === 2 && gy % 2 === 0) dash((gx + 1) * T, gy * T, (gx + 1) * T, (gy + 1) * T);
      for (let k = 0; k < 2; k++) if (rng() < 0.5) { const a = P((gx + rng()) * T, (gy + rng()) * T, 0); g.strokeStyle = 'rgba(10,10,10,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + (rng() - 0.5) * 20, a.y + (rng() - 0.5) * 10); g.stroke(); }
    }
    if (t === 7 && rng() < 0.22) { const a = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = rng() < 0.6 ? 'rgba(95,255,138,0.12)' : 'rgba(255,63,164,0.12)'; g.beginPath(); g.ellipse(a.x, a.y, 16 + rng() * 10, 6 + rng() * 4, 0, 0, 6.28); g.fill(); }
    const grassy = t === 0 || t === 2 || t === 19, crack = t === 3 || t === 4 || t === 8;
    let halms = grassy ? (W.kind === 'main' || W.kind === 'exp' || W.kind === 'planet' ? 13 : 3) : crack ? (W.kind === 'main' || W.kind === 'exp' ? 3 : 0) : 0;
    if (W.biome === 'desert' && grassy) halms = 2; if (W.kind === 'main' && ((inRect(gx, gy, GRASS_RECT) && grassy) || (W.mask && W.mask[gy * S + gx] === 1))) halms = 30;
    for (let k = 0; k < halms; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0), h = 3 + rng() * 9; HB[Math.floor(rng() * HC.length)].push(p.x, p.y, p.x + (rng() - 0.5) * 4, p.y - h); }
    if (grassy && rng() < 0.6) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = W.biome === 'lab' ? 'rgba(255,255,255,0.35)' : W.biome === 'desert' ? 'rgba(255,240,200,0.18)' : 'rgba(30,70,30,0.25)'; g.beginPath(); g.ellipse(p.x, p.y, 10 + rng() * 22, 5 + rng() * 10, 0, 0, 6.28); g.fill(); }
    if (grassy && (W.kind === 'main' || W.kind === 'planet')) for (let k = 0; k < 2.5; k++) if (rng() < 0.8) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = W.kind === 'planet' ? rpick(rng, [W.planet.col[2], '#ffffff', W.planet.col[0]]) : ['#ffd84a', '#ff7eb6', '#ffffff', '#b58cff', '#ff6b4a', '#7fd8ff'][Math.floor(rng() * 6)]; g.fillRect(p.x - 1.5, p.y - 4, 3, 3); }
    if (rng() < 0.5) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(140,140,120,0.5)'; g.fillRect(p.x, p.y, 2 + rng() * 3, 1.5); }
  }
  g.lineWidth = 1.2;
  for (let c = 0; c < HC.length; c++) { const a = HB[c]; if (!a.length) continue; g.strokeStyle = HC[c]; g.beginPath(); for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); } g.stroke(); }
  G = sG; Object.assign(VIEW, sV);
  return cv;
}
const GCACHE = { cv: null, g: null, W: null, vx: 0, vy: 0, zoom: 1, incomplete: true };
function composeGround(W, g, cw, ch) {
  const k = VIEW.zoom, NC = W.NC, cwc = Math.ceil(2 * CH * TILE * IX), chc = Math.ceil(2 * CH * TILE * IY) + GPAD + GPADB;
  let made = 0, missing = false;
  g.fillStyle = W.ambient === 'under' ? '#060c0a' : '#16301d'; g.fillRect(0, 0, cw, ch);
  for (let cy = 0; cy < NC; cy++) for (let cx = 0; cx < NC; cx++) {
    const p = P(cx * CH * TILE, cy * CH * TILE, 0), x0 = p.x - CH * TILE * IX * k, y0 = p.y - GPAD * k, w = cwc * k, h = chc * k;
    if (x0 > cw || y0 > ch || x0 + w < 0 || y0 + h < 0) continue;
    const key = cy * NC + cx; let c = W.chunks.get(key);
    if (!c && made < 3) { c = renderChunk(W, cx, cy); made++; }
    if (c) { W.chunks.delete(key); W.chunks.set(key, c); g.drawImage(c, x0, y0, w, h); }
    else { missing = true; const a = P(cx * CH * TILE, cy * CH * TILE, 0), b = P((cx + 1) * CH * TILE, cy * CH * TILE, 0), cc = P((cx + 1) * CH * TILE, (cy + 1) * CH * TILE, 0), d = P(cx * CH * TILE, (cy + 1) * CH * TILE, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(cc.x, cc.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = tileColor(W, 0, 0, 0.5); g.fill(); }
  }
  while (W.chunks.size > 170) W.chunks.delete(W.chunks.keys().next().value);
  return missing;
}
function drawSpace(W) {
  const sw = innerWidth, sh = innerHeight, t = performance.now() / 1000;
  const gr = G.createLinearGradient(0, 0, 0, sh); gr.addColorStop(0, '#02030a'); gr.addColorStop(1, '#0a0820'); G.fillStyle = gr; G.fillRect(0, 0, sw, sh);
  const neb = G.createRadialGradient(sw * 0.25, sh * 0.3, 10, sw * 0.25, sh * 0.3, sw * 0.6); neb.addColorStop(0, 'rgba(120,60,200,0.22)'); neb.addColorStop(1, 'rgba(0,0,0,0)'); G.fillStyle = neb; G.fillRect(0, 0, sw, sh);
  for (const s of W.stars) { const x = ((s.x * sw * 2 - (VIEW.cx - VIEW.cy) * 0.05 * s.d) % sw + sw) % sw, y = ((s.y * sh * 2 - (VIEW.cx + VIEW.cy) * 0.03 * s.d) % sh + sh) % sh; G.globalAlpha = 0.5 + Math.sin(t * 2 + s.x * 50) * 0.3; G.fillStyle = s.c; G.fillRect(x, y, s.s, s.s); }
  G.globalAlpha = 1;
  const pl = W.planet, px = sw * 0.78 - (VIEW.cx - VIEW.cy) * 0.02, py = sh * 1.05 - (VIEW.cx + VIEW.cy) * 0.01, pr = Math.min(sw, sh) * 0.62;
  const pg = G.createRadialGradient(px - pr * 0.3, py - pr * 0.4, pr * 0.1, px, py, pr); pg.addColorStop(0, pl.col[2]); pg.addColorStop(0.35, pl.col[0]); pg.addColorStop(1, pl.col[1]);
  G.fillStyle = pg; G.beginPath(); G.arc(px, py, pr, 0, 6.283); G.fill();
  G.save(); G.beginPath(); G.arc(px, py, pr, 0, 6.283); G.clip(); G.globalAlpha = 0.18; for (let i = 0; i < 7; i++) { G.fillStyle = i % 2 ? '#ffffff' : pl.col[1]; G.fillRect(px - pr, py - pr + i * pr * 0.3 + Math.sin(t * 0.1 + i) * 10, pr * 2, pr * 0.08); } G.restore(); G.globalAlpha = 1;
  const atm = G.createRadialGradient(px, py, pr * 0.95, px, py, pr * 1.12); atm.addColorStop(0, 'rgba(' + hexToRgbStr(pl.col[2]) + ',0.5)'); atm.addColorStop(1, 'rgba(0,0,0,0)'); G.fillStyle = atm; G.beginPath(); G.arc(px, py, pr * 1.12, 0, 6.283); G.fill();
}
function drawGround(W) {
  if (W.kind === 'space') { drawSpace(W); return; }
  const sw = innerWidth, sh = innerHeight, C = GCACHE, cw = Math.ceil(sw * 1.5), ch = Math.ceil(sh * 1.5);
  let r = C.cv ? VIEW.zoom / C.zoom : 1, need = !C.cv || C.W !== W || C.incomplete || Math.abs(r - 1) > 0.025 || C.cv.width !== cw || C.cv.height !== ch;
  let dx = 0, dy = 0;
  if (!need) { const s = P(C.vx, C.vy, 0); dx = s.x - cw / 2 * r; dy = s.y - ch / 2 * r; if (dx > 0 || dy > 0 || dx + cw * r < sw || dy + ch * r < sh) need = true; }
  if (need) {
    if (!C.cv) { C.cv = document.createElement('canvas'); C.g = C.cv.getContext('2d'); }
    if (C.cv.width !== cw || C.cv.height !== ch) { C.cv.width = cw; C.cv.height = ch; }
    const sV = Object.assign({}, VIEW), sG = G;
    Object.assign(VIEW, { ox: cw / 2 + (VIEW.ox - sw / 2), oy: ch / 2 + (VIEW.oy - sh / 2) });
    const vx = screenToWorld(cw / 2, ch / 2); Object.assign(VIEW, { cx: vx.x, cy: vx.y, ox: cw / 2, oy: ch / 2 });
    G = C.g; C.incomplete = composeGround(W, C.g, cw, ch); G = sG; Object.assign(VIEW, sV);
    C.vx = vx.x; C.vy = vx.y; C.zoom = VIEW.zoom; C.W = W; r = 1;
    const s = P(C.vx, C.vy, 0); dx = s.x - cw / 2; dy = s.y - ch / 2;
  }
  G.drawImage(C.cv, dx, dy, cw * r, ch * r);
}
function prewarmChunks(W, x, y, r) {
  if (W.kind === 'space') return;
  const cx0 = Math.floor(x / TILE / CH), cy0 = Math.floor(y / TILE / CH);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const cx = cx0 + i, cy = cy0 + j; if (cx < 0 || cy < 0 || cx >= W.NC || cy >= W.NC) continue; const key = cy * W.NC + cx; if (!W.chunks.has(key)) W.chunks.set(key, renderChunk(W, cx, cy)); }
  GCACHE.incomplete = true;
}
function visibleChunks(W, extraBottom) {
  const pts = [screenToWorld(-100, -150), screenToWorld(innerWidth + 100, -150), screenToWorld(-100, innerHeight + (extraBottom || 600)), screenToWorld(innerWidth + 100, innerHeight + (extraBottom || 600))];
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const cx0 = clamp(Math.floor(Math.min(...xs) / TILE / CH), 0, W.NC - 1), cx1 = clamp(Math.floor(Math.max(...xs) / TILE / CH), 0, W.NC - 1), cy0 = clamp(Math.floor(Math.min(...ys) / TILE / CH), 0, W.NC - 1), cy1 = clamp(Math.floor(Math.max(...ys) / TILE / CH), 0, W.NC - 1);
  const out = []; for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.push(cy * W.NC + cx); return out;
}
function buildMinimapBase(W, size, showEden) {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const g = cv.getContext('2d'), img = g.createImageData(size, size), WW = W.size * TILE;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = (i / size - 0.5) * 2 * WW, v = j / size * 2 * WW, x = (u + v) / 2, y = (v - u) / 2, idx = (j * size + i) * 4, gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
    let t = tileType(W, x, y), c;
    if (W.kind === 'space') c = t === 9 ? null : [8, 8, 20];
    else if (W.kind === 'main' && inRect(gx, gy, EDEN_RECT)) c = showEden ? [230, 210, 160] : [40, 90, 44];
    else c = t === 9 ? null : ({ 11: [24, 18, 14], 12: [150, 140, 128], 13: [230, 200, 140], 14: [235, 240, 248], 15: [120, 116, 110], 16: [200, 190, 170], 17: [30, 50, 42], 18: [26, 36, 32], 19: [34, 66, 34], 2: [110, 90, 60], 3: [60, 62, 66], 4: [120, 118, 112], 5: [230, 220, 196], 6: [200, 180, 150], 7: [30, 44, 38], 8: [110, 112, 100], 10: [60, 70, 80] }[t] || (W.kind === 'planet' ? [80, 80, 110] : W.biome === 'desert' ? [200, 180, 110] : W.biome === 'lab' ? [220, 228, 232] : W.biome === 'swamp' ? [40, 70, 50] : (W.kind === 'main' && inRect(gx, gy, GRASS_RECT)) ? [130, 160, 70] : [62, 120, 58]));
    if (!c) { img.data[idx + 3] = 0; continue; }
    img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(25,70,30,0.9)'; for (const t of W.trees) { if (t.hp <= 0) continue; const m = worldToMini(t.x, t.y, size, W); g.fillRect(m.x - 0.7, m.y - 0.7, 1.4, 1.4); }
  for (const p of W.props) if (p.kind === 'tower') { const m = worldToMini(p.x, p.y, size, W); g.fillStyle = '#9a958a'; g.fillRect(m.x - 2, m.y - 2, 4, 4); }
  return cv;
}
function worldToMini(x, y, size, W) { const WW = (W ? W.size : MAP) * TILE; return { x: ((x - y) / (2 * WW) + 0.5) * size, y: (x + y) / (2 * WW) * size }; }
