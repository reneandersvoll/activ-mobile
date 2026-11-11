'use strict';
// =====================================================================================
// VERDANT SIEGE V12  (wird NACH v11.js geladen – ändert keine anderen Dateien)
//  · Neu-Eden deaktiviert (Code bleibt erhalten) → an ihrer Stelle wächst „Der Alte Wald“
//  · WERKSTATT (5 Stufen): Fahrzeuge reparieren → Waffenbank → Kranhalle → Werft → eigenes Raumschiff
//  · Crew: Überlebende tauchen selten auf, sobald du ein Raumschiff hast (max. 5, Nachschub nur bei Verlust)
//  · Schluchten: unter Brücken hindurchlaufen, ohne auf die Brücke zu „buggen“
// =====================================================================================
const CITY_ENABLED = false;      // ← auf true setzen, um Neu-Eden wieder zu aktivieren
const CREW_MAX = 5;

// ------------------------------------------------------------------
// 1) STADT DEAKTIVIEREN → WALD
// ------------------------------------------------------------------
function v12Forestify(W) {
  if (typeof EDEN_RECT === 'undefined') return;
  const N = W.size, T = TILE, inE = (gx, gy) => inRect(gx, gy, EDEN_RECT, 1);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
    if (!inE(gx, gy)) continue; const i = gy * N + gx;
    x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy);
    const t = W.tiles[i]; if (t !== 9 && t !== 11 && t !== 1) W.tiles[i] = 19;
    if (W.roadMark) W.roadMark[i] = 0; if (W.mask) W.mask[i] = 0;
  }
  if (x1 < 0) return;
  const gone = o => o && inE(Math.floor(o.x / T), Math.floor(o.y / T));
  for (const p of W.props) if (gone(p)) { p.solid = false; p.hw = 0; p.hd = 0; p.removed = true; }
  W.props = W.props.filter(p => !p.removed);
  for (const co of W.chunkObjs || []) if (co && co.props) co.props = co.props.filter(p => !p.removed);
  if (W.buckets) for (const b of W.buckets) for (let i = b.length - 1; i >= 0; i--) if (b[i].removed) b.splice(i, 1);
  W.lightsStatic = W.lightsStatic.filter(L => !gone(L));
  W.npcs = (W.npcs || []).filter(n => !gone(n));
  W.zones = W.zones.filter(z => !((z.n && /EDEN/i.test(z.n)) || (z.id && /eden/i.test(z.id))));
  W.zones.push({ id: 'oldforest', n: 'DER ALTE WALD', sub: 'Wo einst Mauern standen, wächst jetzt uralter Wald.', x0: x0 * T, y0: y0 * T, x1: (x1 + 1) * T, y1: (y1 + 1) * T, col: '#8fe36a' });
  const rng = W.rng || Math.random, kinds = ['oak', 'pine', 'oak', 'birch', 'pine'], want = Math.round((x1 - x0 + 1) * (y1 - y0 + 1) * 0.5);
  for (let k = 0, made = 0; k < want * 4 && made < want; k++) {
    const x = (x0 + rng() * (x1 - x0 + 1)) * T, y = (y0 + rng() * (y1 - y0 + 1)) * T, gx = Math.floor(x / T), gy = Math.floor(y / T);
    if (!inE(gx, gy) || W.tiles[gy * N + gx] !== 19 || !freeAt(W, x, y, 16)) continue;
    try { addTree(W, x, y, kinds[Math.floor(rng() * kinds.length)], {}); made++; } catch (e) { break; }
  }
  W.edenRemoved = true;
}
// Brücken über Schluchten erkennen (Straßenfelder mit Abgrund auf zwei gegenüberliegenden Seiten)
function v12Bridges(W) {
  if (!W.depth) return; const N = W.size, pit = (x, y) => x >= 0 && y >= 0 && x < N && y < N && W.tiles[y * N + x] === 11;
  W.bridge = new Set();
  for (let gy = 1; gy < N - 1; gy++) for (let gx = 1; gx < N - 1; gx++) { const i = gy * N + gx; if (W.tiles[i] !== 3) continue; if ((pit(gx, gy - 1) && pit(gx, gy + 1)) || (pit(gx - 1, gy) && pit(gx + 1, gy))) W.bridge.add(i); }
}
{
  const _mmw = makeMainWorld;
  makeMainWorld = function (seed) { const W = _mmw(seed); try { if (!CITY_ENABLED) v12Forestify(W); v12Bridges(W); } catch (e) { console.warn('V12 Welt', e); } return W; };
}
if (!CITY_ENABLED) {
  enterCity = function () { UI.toast('Hier ist nur noch Wald.'); };
  revealEdenHint = function () { };
  const _fi0 = findInteract; findInteract = function () { const it = _fi0(); return it && (it.kind === 'eden') ? null : it; };
  const _dc = dailyCity; dailyCity = function () { const c = S.crew; S.crew = []; try { _dc(); } finally { S.crew = c; } };
  for (let i = TIPS.length - 1; i >= 0; i--) if (/Neu-Eden|Himmelsloft|Behörde|Kaliber|Gassen|Stadt/i.test(TIPS[i])) TIPS.splice(i, 1);
}

// ------------------------------------------------------------------
// 2) UNTER BRÜCKEN HINDURCH
// ------------------------------------------------------------------
const V12_UNDER = new Set(); let V12_UL = [], V12_CUR_UNDER = false;
const v12Key = (x, y) => x + '|' + y;
{
  const _gz = groundZ;
  groundZ = function (x, y) {
    const W = S && S.W; if (!W || !W.bridge || !W.bridge.size) return _gz(x, y);
    const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE), i = gy * W.size + gx;
    if (W.bridge.has(i)) return V12_UNDER.has(v12Key(x, y)) ? -RAVINE_D : 0;
    return _gz(x, y);
  };
  const _bf = blockedFor;
  blockedFor = function (x, y, who) {
    const W = S.W;
    if (W.bridge && W.bridge.size && MOVE_FROM_Z !== null) {
      const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE), i = gy * W.size + gx;
      if (W.bridge.has(i)) { if (MOVE_FROM_Z < -42) return null; const z = MOVE_FROM_Z; MOVE_FROM_Z = null; try { return _bf(x, y, who); } finally { MOVE_FROM_Z = z; } }
    }
    return _bf(x, y, who);
  };
  const _sh = staticHit;
  staticHit = function (x, y, r) { const h = _sh(x, y, r); if (h && V12_CUR_UNDER && h.btype === 'prop' && /bridge/.test(h.kind || '')) return null; return h; };
  const _me = moveEnt;
  moveEnt = function (e, dx, dy, r, who) {
    const W = S.W; if (!W.bridge || !W.bridge.size || !W.depth) return _me(e, dx, dy, r, who);
    const N = W.size, ti = (o) => Math.floor(o.y / TILE) * N + Math.floor(o.x / TILE);
    const i0 = ti(e), was = !!e.under, prevZ = W.bridge.has(i0) ? (was ? -RAVINE_D : 0) : W.depth[i0];
    if (was) V12_UNDER.add(v12Key(e.x, e.y));
    V12_CUR_UNDER = was || prevZ < -42;
    let res; try { res = _me(e, dx, dy, r, who); } finally { V12_CUR_UNDER = false; V12_UNDER.delete(v12Key(e.x, e.y)); }
    const i1 = ti(e);
    e.under = W.bridge.has(i1) ? (W.bridge.has(i0) ? was : prevZ < -42) : W.depth[i1] < -42;
    if (e.under && W.bridge.has(i1)) V12_UNDER.add(v12Key(e.x, e.y));
    return res;
  };
}
function v12RebuildUnder() {
  V12_UNDER.clear(); V12_UL = []; const W = S.W; if (!W || !W.bridge || !W.bridge.size) { if (S.p) S.p.under = false; return; }
  const add = o => { if (o && o.under) { V12_UNDER.add(v12Key(o.x, o.y)); V12_UL.push([o.x, o.y]); } };
  add(S.p); for (const z of S.zombies) add(z); add(S.follower);
}
function v12DrawDecks() {
  const W = S.W; if (!W || !W.bridge || !V12_UL.length) return;
  const T = TILE, N = W.size, set = new Set();
  for (const [x, y] of V12_UL) { const gx = Math.floor(x / T), gy = Math.floor(y / T); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = (gy + j) * N + gx + i; if (W.bridge.has(k)) set.add(k); } }
  for (const k of set) {
    const gx = k % N, gy = (k / N) | 0, horiz = W.tiles[k - N] === 11, c = [P(gx * T, gy * T, 0), P((gx + 1) * T, gy * T, 0), P((gx + 1) * T, (gy + 1) * T, 0), P(gx * T, (gy + 1) * T, 0)];
    G.globalAlpha = 0.8; G.fillStyle = '#7a5a3a'; G.beginPath(); G.moveTo(c[0].x, c[0].y); for (let i = 1; i < 4; i++) G.lineTo(c[i].x, c[i].y); G.closePath(); G.fill();
    G.strokeStyle = 'rgba(40,26,14,0.8)'; G.lineWidth = 1.5;
    for (let s = 1; s < 5; s++) { const f = s / 5, a = horiz ? P((gx + f) * T, gy * T, 0) : P(gx * T, (gy + f) * T, 0), b = horiz ? P((gx + f) * T, (gy + 1) * T, 0) : P((gx + 1) * T, (gy + f) * T, 0); G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(b.x, b.y); G.stroke(); }
    G.globalAlpha = 1; G.strokeStyle = '#3a2614'; G.lineWidth = 3;
    const r1 = horiz ? [c[0], c[1]] : [c[0], c[3]], r2 = horiz ? [c[3], c[2]] : [c[1], c[2]];
    for (const [a, b] of [r1, r2]) { G.beginPath(); G.moveTo(a.x, a.y - 10 * VIEW.zoom); G.lineTo(b.x, b.y - 10 * VIEW.zoom); G.stroke(); }
  }
  G.lineWidth = 1;
}

// ------------------------------------------------------------------
// 3) WERKSTATT (5 Stufen bis zum Raumschiff)
// ------------------------------------------------------------------
Object.assign(BUILD.workbench, { n: 'Werkstatt', icon: '🔧', w: 3, h: 3, cost: { wood: 40, stone: 25, scrap: 15 }, hp: 480, light: 120, desc: 'E: Fahrzeuge reparieren, Munition & Waffen bauen. Ausbauen bis Stufe 5 = eigenes RAUMSCHIFF!' });
const WS_COST = { 1: { wood: 40, stone: 30, scrap: 25 }, 2: { scrap: 55, stone: 40, elec: 3 }, 3: { scrap: 90, elec: 8, mil: 6, fuel: 40 }, 4: { scrap: 160, elec: 16, mil: 14, cells: 6, crystal: 4 } };
const WS_STEPS = [
  { l: 1, n: 'Werkbank', icon: '🛠', d: 'Autos reparieren · Munition & Medikits' },
  { l: 2, n: 'Waffenbank', icon: '🔫', d: 'Schrotflinte & Sturmgewehr bauen · Heli-Reparatur' },
  { l: 3, n: 'Kranhalle', icon: '🏗', d: 'Scharfschützengewehr · Wracks abschleppen · Schiffsreparatur' },
  { l: 4, n: 'Raumschiff-Werft', icon: '🛰', d: 'Der Rumpf wird montiert · Maschinengewehr' },
  { l: 5, n: 'Startrampe', icon: '🚀', d: 'DEIN EIGENES RAUMSCHIFF · Plasmagewehr' },
];
const GUN_CRAFT = { shotgun: { lvl: 2, cost: { scrap: 45, wood: 30, stone: 10 } }, rifle: { lvl: 2, cost: { scrap: 70, mil: 4 } }, sniper: { lvl: 3, cost: { mil: 14, elec: 6, scrap: 40 } }, lmg: { lvl: 4, cost: { mil: 22, cells: 2, scrap: 60 } }, plasma: { lvl: 5, cost: { plasma: 6, xeno: 6, titan: 10 } } };
{
  const _ml = maxLevel; maxLevel = function (type) { return type === 'workbench' ? 5 : _ml(type); };
  const _uc = upgradeCost; upgradeCost = function (type, lvl) { if (type === 'workbench') return Object.assign({}, WS_COST[lvl] || {}); return _uc(type, lvl); };
}
function workshop() { return S.buildings.find(b => b.type === 'workbench'); }
function bestWorkshop() { let best = null; for (const b of S.buildings) if (b.type === 'workbench' && (!best || b.level > best.level)) best = b; return best; }
function mechF() { return 1 - 0.25 * perk('mech'); }
function scaleCost(c, f) { const o = {}; for (const k in c) o[k] = Math.max(1, Math.ceil(c[k] * f)); return o; }

// --- 3D-Modell der Werkstatt ---
workbenchParts = function (b, t) {
  const out = [], push = (...a) => out.push(a), L = b.level, Wd = b.w * TILE, Hd = b.h * TILE, hw = Wd / 2, hd = Hd / 2;
  const steel = L >= 3, hallH = L >= 3 ? 72 : L >= 2 ? 58 : 48, post = steel ? '#4f585e' : L >= 2 ? '#6d7276' : '#6b4a2b', roof = steel ? '#3e4e5a' : L >= 2 ? '#5d666d' : '#8a5a3a';
  push(0, 0, 0, Wd - 4, Hd - 4, 4, steel ? '#5d6266' : '#7d7f7c');
  for (let i = -2; i <= 2; i++) push(i * 22, hd - 12, 4, 10, 2, 0.6, '#e1b12c');
  const hx = -hw / 2 + 4, hy = -hd / 2 + 4, hW = Wd * 0.58, hD = Hd * 0.58;
  for (const [x, y] of [[hx - hW / 2 + 3, hy - hD / 2 + 3], [hx + hW / 2 - 3, hy - hD / 2 + 3], [hx - hW / 2 + 3, hy + hD / 2 - 3], [hx + hW / 2 - 3, hy + hD / 2 - 3]]) push(x, y, 4, 5, 5, hallH, post);
  push(hx, hy, 4 + hallH, hW + 12, hD + 12, 4, roof);
  for (let k = -3; k <= 3; k++) push(hx + k * hW / 7, hy, 8 + hallH, 2, hD + 12, 1.5, hexShade(roof, 0.75));
  if (L >= 2) {
    push(hx - hW / 2, hy, 4, 3, hD, hallH, steel ? '#6a7680' : '#9a8f84'); push(hx, hy - hD / 2, 4, hW, 3, hallH, steel ? '#76828c' : '#a89c90');
    push(hx, hy + hD / 2, hallH - 18, hW - 10, 2, 18, '#b0b6ba'); for (let z = hallH - 16; z < hallH; z += 4) push(hx, hy + hD / 2 + 1.2, z, hW - 12, 0.4, 0.8, '#7a8288');
    push(hx, hy + hD / 2 + 2, hallH + 6, 62, 3, 14, '#14161c'); push(hx, hy + hD / 2 + 3.6, hallH + 9, 54, 0.4, 8, L >= 4 ? '#3ff4ff' : '#ffb020');
  }
  const lift = 12 + Math.max(0, Math.sin(t * 0.7)) * 10;
  push(hx - 14, hy - 4, 4, 4, 4, 30, '#e1b12c'); push(hx + 14, hy - 4, 4, 4, 4, 30, '#e1b12c');
  push(hx, hy - 4, lift, 34, 22, 2, '#3a3f44'); push(hx, hy - 4, lift + 2, 30, 18, 8, '#c0392b'); push(hx - 2, hy - 4, lift + 10, 16, 15, 6, '#8fc8e8'); for (const [x, y] of [[-10, -9], [10, -9], [-10, 9], [10, 9]]) push(hx + x, hy - 4 + y, lift + 1, 6, 3, 6, '#1a1a1a');
  push(hx - hW / 2 + 12, hy + 14, 4, 12, 30, 14, '#8b5e34'); push(hx - hW / 2 + 12, hy + 14, 18, 14, 32, 2, '#6b4423'); push(hx - hW / 2 + 13, hy + 6, 20, 6, 6, 5, '#5d666d');
  push(hx - hW / 2 + 2, hy, 20, 1, 30, 22, '#5b3a22'); for (let i = 0; i < 5; i++) push(hx - hW / 2 + 3, hy - 12 + i * 6, 26 + (i % 2) * 6, 1, 2, 9, i % 2 ? '#9aa6aa' : '#c0392b');
  for (let i = 0; i < 4; i++) push(hw - 14, -hd + 14, 4 + i * 5, 14, 14, 4.5, '#1c1c1c');
  push(hw - 14, -hd + 34, 4, 10, 10, 16, '#c0392b'); push(hw - 26, -hd + 34, 4, 10, 10, 16, '#2e5e8a');
  if (Math.floor(t * 9) % 3 === 0) { push(hx + 10, hy - 4, lift + 4, 2, 2, 2, '#fff6a0'); push(hx + 12, hy - 2, lift + 6, 1.5, 1.5, 1.5, '#ffd84a'); }
  if (L >= 2) { push(hx + hW / 2 - 10, hy + 16, 4, 12, 10, 12, '#3a3f44'); push(hx + hW / 2 - 10, hy + 16, 16, 14, 12, 2, '#d4a017'); }
  if (L >= 3) {
    const cx = hw * 0.38;
    for (const y of [-hd + 8, hd - 8]) { push(cx - 30, y, 4, 5, 5, 92, '#e1b12c'); push(cx + 30, y, 4, 5, 5, 92, '#e1b12c'); push(cx, y, 92, 66, 5, 5, '#e1b12c'); }
    const ty = Math.sin(t * 0.5) * (hd - 20); push(cx - 30, 0, 96, 5, Hd - 16, 5, '#c79a14'); push(cx + 30, 0, 96, 5, Hd - 16, 5, '#c79a14'); push(cx, ty, 98, 64, 10, 6, '#3a3f44'); push(cx, ty, 50, 1, 1, 48, '#1a1a1a'); push(cx, ty, 46, 8, 8, 5, '#e1b12c');
    for (const [x, y] of [[hw - 6, hd - 6], [-hw + 6, hd - 6]]) { push(x, y, 4, 3, 3, 60, '#3a3f44'); push(x, y, 62, 10, 6, 6, '#fffbd0'); }
  }
  if (L >= 4) {
    const px = hw * 0.36, py = hd * 0.22, R0 = 40;
    for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, glow = L >= 5 ? (Math.floor(t * 4 + i) % 4 === 0 ? '#ffffff' : '#3ff4ff') : '#e1b12c'; push(px + Math.cos(a) * R0, py + Math.sin(a) * R0, 4, 7, 3, 1.5, glow, a + Math.PI / 2); }
    push(px, py, 4, 50, 50, 1, L >= 5 ? '#24303a' : '#3a3f44'); push(px, py, 5, 30, 4, 0.5, '#ffffff'); push(px, py, 5, 4, 30, 0.5, '#ffffff');
    for (const s of [-1, 1]) { push(px + s * 46, py, 4, 6, 6, 70, '#5d666d'); for (let z = 14; z < 70; z += 14) push(px + s * 43, py, z, 2, 10, 2, '#e1b12c'); push(px + s * 34, py, 66, 24, 4, 3, '#5d666d'); }
    if (L === 4 && (!S || !S.ship)) {
      let sp = []; try { sp = shipParts({ up: {}, paint: 'white', hp: 100 }, t, { flying: false }); } catch (e) { sp = []; }
      const n = Math.floor(sp.length * (0.45 + 0.1 * Math.sin(t * 0.6)));
      for (let i = 0; i < n; i++) { const q = sp[i].slice(); q[0] += px; q[1] += py; q[2] += 10; if (i % 3 === 0) q[6] = '#8a9aa6'; out.push(q); }
      for (let k = 0; k < 9; k++) { const a = k * 0.7; push(px + Math.cos(a) * 18, py + Math.sin(a) * 10, 14 + (k % 3) * 6, 2, 22, 2, '#5d666d', a); }
      if (Math.floor(t * 10) % 2) { push(px + Math.sin(t * 3) * 14, py + 8, 24, 2, 2, 2, '#ffffff'); push(px - 10, py - 6, 30, 1.5, 1.5, 1.5, '#5ff4ff'); }
    }
    if (L >= 5) { push(-hw + 12, hd - 6, 4, 4, 4, 54, '#2a2f3a'); push(-hw + 12, hd - 6, 58, 44, 3, 14, '#0a0c12'); push(-hw + 12, hd - 4.4, 61, 38, 0.4, 8, Math.floor(t * 2) % 2 ? '#3ff4ff' : '#5fff8a'); }
  }
  return out;
};

// --- Ausbau-Logik, Raumschiff-Endmontage ---
{
  const _ub = upgradeBuilding;
  upgradeBuilding = function (b) {
    const l0 = b.level; _ub(b); if (b.type !== 'workbench' || b.level <= l0) return;
    const st = WS_STEPS[b.level - 1];
    setTimeout(() => { if (!S) return; announce(st.icon + ' WERKSTATT STUFE ' + b.level + ': ' + st.n.toUpperCase(), st.d, b.level >= 4 ? '#5ff4ff' : '#ffd84a'); SFX.play('streak'); }, 450);
    if (b.level === 5) v12BuildShip(b);
  };
  const _pb = placeBuilding;
  placeBuilding = function (info, silentLoad, data) {
    const b = _pb(info, silentLoad, data);
    if (b && !silentLoad && !info.mount) {
      if (S.talents && S.talents.bulwark) { b.max = Math.round(b.max * 1.3); b.hp = b.max; }
      if (b.type === 'workbench') setTimeout(() => S && announce('🔧 WERKSTATT ERRICHTET', 'E: Reparieren & Bauen · Ausbau bis Stufe 5 = eigenes Raumschiff', '#ffd84a'), 500);
    }
    return b;
  };
}
function v12ShipPadFor(b) { return { x: b.x + b.w * TILE * 0.18, y: b.y + b.h * TILE * 0.11 }; }
function v12BuildShip(b) {
  if (S.ship) { setTimeout(() => S && announce('🛰 WERFT BEREIT', 'Dein Raumschiff wird ab jetzt hier gewartet', '#5ff4ff'), 1800); return; }
  const pad = v12ShipPadFor(b);
  setTimeout(() => { if (!S) return; announce('⚙ ENDMONTAGE …', 'Triebwerke · Cockpit · Schilde', '#5ff4ff'); for (let i = 0; i < 6; i++) setTimeout(() => { if (!S) return; burst(pad.x + R(-30, 30), pad.y + R(-30, 30), R(10, 40), i % 2 ? '#ffffff' : '#5ff4ff', 20, 200, { up: 1.5 }); SFX.tone(500 + i * 120, 0.08, 'square', 0.06); shake(3); }, i * 260); }, 1400);
  setTimeout(() => {
    if (!S) return;
    if (S.where === 'main') S.mainW.shipPad = pad;
    S.ship = newShip(); Object.assign(S.ship, { world: S.where === 'planet' ? 'planet' : 'main', x: pad.x, y: pad.y, z: 0, state: 'parked', vx: 0, vy: 0 });
    S.flash = 0.9; S.flashCol = '120,240,255'; shake(18); SFX.play('jackpot');
    for (let i = 0; i < 5; i++) S.rings.push({ x: pad.x, y: pad.y, r: 8 + i * 22, max: 420, col: i % 2 ? '95,244,255' : '255,216,74', life: 1 + i * 0.2 });
    burst(pad.x, pad.y, 20, '#5ff4ff', 60, 320, { up: 2 }); burst(pad.x, pad.y, 30, '#ffd84a', 40, 260, { up: 2 });
    S.particles.push({ x: pad.x, y: pad.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.9, max: 0.9, col: '#fff', s: 1, beam: true, grav: 0, light: 340 });
    announce('🚀 DEIN RAUMSCHIFF IST FERTIG!', 'E = Einsteigen · LEERTASTE steigen · Über Höhe 520 = Orbit', '#5ff4ff'); addXp(500, pad.x, pad.y);
    S.survT = 150; setTimeout(() => S && UI.toast('📡 Für Raumstation & Sprünge brauchst du eine Crew. Halte Ausschau nach Überlebenden!'), 5000);
  }, 3200);
}

// --- Interaktion & Menü der Werkstatt ---
{
  const _fi = findInteract;
  findInteract = function () {
    const p = S.p;
    if (!p.inCar && !p.inHeli && !p.inShip && (S.where === 'main' || S.where === 'planet')) {
      const sv = S.survivor; if (sv && S.where === 'main' && Math.hypot(sv.npc.x - p.x, sv.npc.y - p.y) < 60) return { kind: 'survivor', obj: sv.npc, text: 'E halten · ' + sv.name + ' anheuern (' + CREW_ROLES[sv.role].n + ')', hold: 1.2, can: true };
      for (const b of S.buildings) if (b.type === 'workbench' && Math.hypot(b.x - p.x, b.y - p.y) < b.w * TILE / 2 + 44) return { kind: 'craft', b, text: 'E · WERKSTATT St.' + b.level + ' – ' + WS_STEPS[b.level - 1].n };
    }
    return _fi();
  };
}
function v12Vehicles(b) {
  const out = [], W = S.W, r = 460;
  (W.cars || []).forEach((c, i) => { if (Math.hypot(c.x - b.x, c.y - b.y) < r) out.push({ kind: 'car', o: c, n: (c.n || c.name || 'Fahrzeug') + ' #' + (i + 1) }); });
  if (W.heli && Math.hypot(W.heli.x - b.x, W.heli.y - b.y) < r) out.push({ kind: 'heli', o: W.heli, n: 'Helikopter' });
  if (S.ship && S.ship.world === S.where && Math.hypot(S.ship.x - b.x, S.ship.y - b.y) < r + 100) out.push({ kind: 'ship', o: S.ship, n: 'Raumschiff' });
  return out;
}
function v12RepairCost(v) {
  const o = v.o, f = mechF();
  if (v.kind === 'car') return o.wreck ? scaleCost({ scrap: 12, wood: 6 }, f) : o.hp < o.maxHp ? scaleCost({ scrap: Math.ceil((o.maxHp - o.hp) / 25) }, f) : null;
  if (v.kind === 'heli') return o.wreck ? scaleCost({ scrap: 30, elec: 6, fuel: 15 }, f) : o.hp < o.maxHp ? scaleCost({ scrap: Math.ceil((o.maxHp - o.hp) / 20) }, f) : null;
  const mh = typeof shipMaxHp === 'function' ? shipMaxHp(o) : 200; return o.hp < mh ? scaleCost({ scrap: Math.ceil((mh - o.hp) / 12), elec: 2 }, f) : null;
}
function v12DoRepair(v) {
  const c = v12RepairCost(v); if (!c || !canAfford(c)) return false; pay(c); const o = v.o;
  if (v.kind === 'ship') o.hp = typeof shipMaxHp === 'function' ? shipMaxHp(o) : o.hp; else { o.wreck = false; o.hp = o.maxHp; o.fuel = Math.max(o.fuel || 0, 45); }
  S.stats.repairs = (S.stats.repairs || 0) + 1; SFX.play('upgrade'); shake(5); burst(o.x, o.y, 20, '#7ad7ff', 30, 200, { up: 1.4 }); S.rings.push({ x: o.x, y: o.y, r: 8, max: 140, col: '120,220,255', life: 0.7 }); floater(o.x, o.y, '🔧 ' + v.n.toUpperCase() + ' REPARIERT', '#7ad7ff', true); addXp(25, o.x, o.y);
  return true;
}
renderCraft = function () {
  const wb = S.craftB || bestWorkshop(), L = wb ? wb.level : 1, b = $('cityBody'), tab = S.wsTab || 'repair';
  const tabs = [['repair', '🔧 REPARATUR'], ['craft', '▰ HERSTELLEN'], ['guns', '🔫 WAFFENBANK'], ['ship', '🚀 AUSBAU & WERFT']];
  let h = this.header('🔧 WERKSTATT · STUFE ' + L + ' – ' + WS_STEPS[L - 1].n.toUpperCase(), WS_STEPS[L - 1].d);
  h += '<div class="tabs" style="margin:10px 0">' + tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'act' : ''}" data-wstab="${k}">${n}</button>`).join('') + '</div>';
  if (tab === 'repair') {
    const vs = wb ? v12Vehicles(wb) : [];
    h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
    if (!vs.length) h += '<div class="mcard" style="grid-column:1/4"><b>Keine Fahrzeuge in Reichweite</b><p>Fahr ein Auto, den Heli oder dein Raumschiff neben die Werkstatt.</p></div>';
    vs.forEach((v, i) => {
      const o = v.o, c = v12RepairCost(v), lock = (v.kind === 'heli' && L < 2) || (v.kind === 'ship' && L < 3), mh = v.kind === 'ship' && typeof shipMaxHp === 'function' ? shipMaxHp(o) : o.maxHp;
      h += `<div class="mcard ${c ? '' : 'act'}"><b>${v.kind === 'car' ? '🚗' : v.kind === 'heli' ? '🚁' : '🚀'} ${v.n}</b><p>${o.wreck ? '💥 WRACK' : '🛡 ' + Math.round(o.hp) + '/' + Math.round(mh || 0)}${o.fuel !== undefined && v.kind !== 'ship' ? ' · ⛽ ' + Math.round(o.fuel) + '%' : ''}</p>`;
      h += lock ? `<small>🔒 Ab Werkstatt-Stufe ${v.kind === 'heli' ? 2 : 3}</small>` : c ? `<button class="btn ${canAfford(c) ? 'gold' : ''}" data-rep="${i}" ${canAfford(c) ? '' : 'disabled'}>${o.wreck ? 'INSTANDSETZEN' : 'REPARIEREN'} · ${costStr(c)}</button>` : '<small style="color:#7dff5a">✔ Top in Schuss</small>';
      if (v.kind !== 'ship' && !o.wreck && o.fuel < 100 && S.res.fuel > 0) h += ` <button class="btn sm" data-fuel="${i}">⛽ TANKEN</button>`;
      h += '</div>';
    });
    h += '</div>';
    if (L >= 3) { const far = (S.W.cars || []).filter(c => c.wreck && Math.hypot(c.x - wb.x, c.y - wb.y) >= 460); h += `<div class="mcard" style="margin-top:10px"><b>🪝 Abschleppdienst</b><p>Holt das nächste Wrack der Karte zur Werkstatt. ${far.length} Wrack(s) da draußen.</p><button class="btn ${far.length && S.res.fuel >= 15 ? 'gold' : ''}" data-tow ${far.length && S.res.fuel >= 15 ? '' : 'disabled'}>ABSCHLEPPEN · 15 Sprit</button></div>`; }
    if (perk('mech')) h += `<div class="csub" style="margin-top:6px">🔧 Mechaniker-Skill: −${perk('mech') * 25}% Reparaturkosten</div>`;
  } else if (tab === 'craft') {
    h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
    RECIPES.forEach((r, i) => { const lock = L < r.lvl, ok = !lock && canAfford(r.need); h += `<div class="mcard ${lock ? '' : 'act'}" style="${lock ? 'opacity:.5' : ''}"><b>${r.icon} ${r.n}</b><p>${lock ? '🔒 Ab Stufe ' + r.lvl : 'Kosten: ' + costStr(r.need)}</p><button class="btn ${ok ? 'gold' : ''}" data-craft="${i}" ${ok ? '' : 'disabled'}>${lock ? 'GESPERRT' : 'HERSTELLEN'}</button> <button class="btn sm" data-craft5="${i}" ${!lock && canAfford(scaleCost(r.need, 5)) ? '' : 'disabled'}>×5</button></div>`; });
    h += '</div>';
  } else if (tab === 'guns') {
    h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
    for (const g of Object.keys(GUN_CRAFT)) { const o = GUN_CRAFT[g], st = WEAPONS[g], own = S.unlocked[g], lock = L < o.lvl, ok = !own && !lock && canAfford(o.cost);
      h += `<div class="mcard ${own ? 'act' : ''}" style="${lock ? 'opacity:.55' : ''}"><b>${st.icon} ${st.n}</b><p>Schaden ${st.dmg}${st.pellets > 1 ? '×' + st.pellets : ''} · Magazin ${st.mag}</p><small>${lock ? '🔒 Ab Werkstatt-Stufe ' + o.lvl : 'Bauteile: ' + costStr(o.cost)}</small><br><br><button class="btn ${ok ? 'gold' : ''}" data-gun="${g}" ${ok ? '' : 'disabled'}>${own ? '✔ IM BESITZ' : lock ? 'GESPERRT' : 'BAUEN'}</button></div>`; }
    h += '</div><div class="csub" style="margin-top:8px">💡 Militärteile, Batterien & Kristalle findest du auf Heli-Expeditionen. Plasma-Rohstoffe nur auf fremden Planeten.</div>';
  } else {
    h += '<div class="v12steps">' + WS_STEPS.map(s => `<div class="v12step ${L >= s.l ? 'done' : ''} ${L + 1 === s.l ? 'next' : ''}"><div class="ic">${s.icon}</div><b>${s.l}. ${s.n}</b><small>${s.d}</small></div>`).join('') + '</div>';
    if (L < 5) { const c = upgradeCost('workbench', L), ok = canAfford(c), nx = WS_STEPS[L]; h += `<div class="mcard ${L === 4 ? 'act' : ''}" style="margin-top:12px"><b>NÄCHSTE STUFE: ${nx.icon} ${nx.n.toUpperCase()}</b><p>${nx.d}</p><small>Kosten: ${costStr(c)}</small><br><br><button class="btn ${ok ? 'gold big' : ''}" data-wsup ${ok ? '' : 'disabled'}>${L === 4 ? '🚀 RAUMSCHIFF FERTIGSTELLEN' : '⬆ AUSBAUEN'}</button></div>`; }
    else h += `<div class="mcard act" style="margin-top:12px"><b>🚀 WERFT VOLL AUSGEBAUT</b><p>${S.ship ? 'Rumpf ' + Math.round(S.ship.hp) + ' · Crew ' + S.crew.length + '/' + CREW_MAX + (S.crew.length < 3 ? ' (mind. 3 für Sprünge)' : ' ✔') : 'Raumschiff wird montiert …'}</p>${S.ship ? '<button class="btn gold big" data-hangar>🔧 HANGAR: UPGRADES & LACKIERUNG</button>' : ''}</div>`;
    if (S.crew.length) h += `<div class="mcard" style="margin-top:10px"><b>👥 CREW (${S.crew.length}/${CREW_MAX})</b>${S.crew.map(c => `<div class="hp-row"><span>${CREW_ROLES[c.role].icon} ${c.name} – ${CREW_ROLES[c.role].n}</span><small>${CREW_ROLES[c.role].d}</small></div>`).join('')}</div>`;
  }
  b.innerHTML = h;
  const q = s => b.querySelectorAll(s), again = () => renderCraft.call(CityUI);
  q('[data-wstab]').forEach(e => e.onclick = () => { S.wsTab = e.dataset.wstab; SFX.play('click'); again(); });
  q('[data-rep]').forEach(e => e.onclick = () => { const v = v12Vehicles(wb)[+e.dataset.rep]; if (v && v12DoRepair(v)) again(); });
  q('[data-fuel]').forEach(e => e.onclick = () => { const v = v12Vehicles(wb)[+e.dataset.fuel]; if (!v) return; const take = Math.min(100 - v.o.fuel, S.res.fuel); v.o.fuel += take; S.res.fuel -= take; SFX.play('pickup'); again(); });
  q('[data-tow]').forEach(e => e.onclick = () => { const far = (S.W.cars || []).filter(c => c.wreck && Math.hypot(c.x - wb.x, c.y - wb.y) >= 460).sort((a, c) => Math.hypot(a.x - wb.x, a.y - wb.y) - Math.hypot(c.x - wb.x, c.y - wb.y)); const c = far[0]; if (!c || S.res.fuel < 15) return; S.res.fuel -= 15; c.x = wb.x - wb.w * TILE * 0.9; c.y = wb.y + wb.h * TILE * 0.85; c.v = 0; SFX.play('car'); burst(c.x, c.y, 10, '#b8a27a', 20, 160); UI.toast('🪝 Wrack abgeschleppt – steht jetzt vor der Werkstatt'); again(); });
  const craft = (i, n) => { const r = RECIPES[i]; for (let k = 0; k < n; k++) { if (!canAfford(r.need)) break; pay(r.need); for (const [kk, vv] of Object.entries(r.give)) addRes(kk, vv, S.p.x, S.p.y, true); } SFX.play('upgrade'); if (wb) { burst(wb.x, wb.y, 30, '#ffd84a', 16, 160, { up: 1.5 }); wb.pop = 1; } UI.toast('🛠 Hergestellt: ' + (n > 1 ? n + '× ' : '') + r.n); again(); };
  q('[data-craft]').forEach(e => e.onclick = () => craft(+e.dataset.craft, 1));
  q('[data-craft5]').forEach(e => e.onclick = () => craft(+e.dataset.craft5, 5));
  q('[data-gun]').forEach(e => e.onclick = () => { const g = e.dataset.gun, o = GUN_CRAFT[g]; if (S.unlocked[g] || !canAfford(o.cost)) return; pay(o.cost); UI.closeAll(); giveWeapon(g, S.p.x, S.p.y, true); });
  q('[data-wsup]').forEach(e => e.onclick = () => { if (!wb) return; UI.closeAll(); upgradeBuilding(wb); });
  q('[data-hangar]').forEach(e => e.onclick = () => { UI.hide('citymenu'); ShipUI.open(); });
};
