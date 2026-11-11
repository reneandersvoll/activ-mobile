'use strict';
// =====================================================================================
// VERDANT SIEGE V13  (wird NACH v12b.js geladen)
//  1. Autosave alle 5 Sekunden
//  2. Tore drehbar (R) · ALLES abbaubar (X) & reparierbar (H) im Baumodus
//  3. Skillbaum über Q (K geht weiterhin)
//  4. Talentwahl komplett entfernt
//  5. Mauern verbinden sich mit allen Gebäuden · Gebäude bekommen Verbindungsgänge zueinander
//     · Crew-Mitglieder auf Wachtürme setzen (schießen auf Monster)
//  6. Versorgungsabwürfe (Flugzeug + roter Rauch/Markierung) entfernt
// =====================================================================================

// ------------------------------------------------------------------
// 1) AUTOSAVE
// ------------------------------------------------------------------
const AUTOSAVE_SEC = 5;
setInterval(() => {
  try { if (S && S.phase === 'play' && !S.exp && !S.stairAnim && !UI.overlay) saveGame(true); } catch (e) { console.warn('Autosave', e); }
}, AUTOSAVE_SEC * 1000);
addEventListener('beforeunload', () => { try { if (S && S.phase === 'play' && !S.exp) saveGame(true); } catch (e) { } });

// ------------------------------------------------------------------
// 6) KEINE VERSORGUNGSABWÜRFE MEHR
// ------------------------------------------------------------------
startAirdrop = function () { if (S) S.dropPlane = null; };

// ------------------------------------------------------------------
// 4) TALENTE RAUS
// ------------------------------------------------------------------
showTalents = function () { if (S) S.talentQ = 0; };
{
  const _an = UI.announce;
  UI.announce = function (t, s, c) { if (typeof s === 'string') s = s.replace(' · ✦ Talentwahl!', ''); return _an.call(this, t, s, c); };
}
for (const n of LOBBY_NEWS) if (n.t === 'SKILLBAUM') n.s = 'Q drücken: Kampf, Überleben, Handwerk. 1 Skillpunkt pro Level.';
for (let i = 0; i < TIPS.length; i++) TIPS[i] = TIPS[i].replace('K öffnet den Skillbaum.', 'Q öffnet den Skillbaum.');

// ------------------------------------------------------------------
// 3) SKILLBAUM ÜBER Q
// ------------------------------------------------------------------
(() => {
  const ov = $('v12skills');
  if (ov) {
    const sub = ov.querySelector('.csub'); if (sub) sub.textContent = '1 Skillpunkt pro Level · Höhere Reihen brauchen Punkte im selben Zweig';
    const cl = $('v12close'); if (cl) cl.textContent = '✖ SCHLIESSEN (Q)';
  }
  document.querySelectorAll('.mbtn').forEach(b => { if (b.textContent.includes('SKILLBAUM')) b.textContent = '🌟 SKILLBAUM (Q)'; });
})();
addEventListener('keydown', e => {
  if (e.code !== 'KeyQ' || !S || S.phase !== 'play') return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (S.build && S.build.on) return;                       // im Baumodus bleibt Q wie bisher
  if (UI.overlay === 'skills') { SkillUI.close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (!UI.overlay) { SkillUI.open(); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

// ------------------------------------------------------------------
// 2) TORE DREHEN · ABBAUEN · REPARIEREN
// ------------------------------------------------------------------
BUILD.gate.rot = 1;
try { if (typeof BUILD_SPRITE !== 'undefined' && BUILD_SPRITE.gate) delete BUILD_SPRITE.gate; } catch (e) { }
function v13Hover() {
  if (!S || !S.build || !S.build.on || typeof MOUSE === 'undefined') return null;
  let w; try { w = screenToWorld(MOUSE.x, MOUSE.y); } catch (e) { return null; }
  const b = gridAt(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
  return b || null;
}
function v13RepairCost(b) {
  if (!b || b.hp >= b.max) return null;
  const base = BUILD[b.type].cost || {}, f = (1 - b.hp / b.max) * 0.5 * (1 + 0.6 * (b.level - 1)) * (1 - 0.25 * perk('mech')), c = {};
  for (const k in base) if (base[k] > 0) c[k] = Math.max(1, Math.ceil(base[k] * f));
  if (!Object.keys(c).length) c.scrap = 2;
  return c;
}
function v13Repair(b) {
  const c = v13RepairCost(b);
  if (!c) { floater(b.x, b.y, 'UNBESCHÄDIGT', '#bfff7a'); SFX.play('deny'); return; }
  if (!canAfford(c)) { floater(b.x, b.y, 'FEHLT: ' + costStr(c), '#ff8080'); SFX.play('deny'); return; }
  pay(c); b.hp = b.max; b.pop = 1; S.stats.repairs = (S.stats.repairs || 0) + 1;
  SFX.play('upgrade'); shake(4); burst(b.x, b.y, 20, '#7ad7ff', 22, 170, { up: 1.4 }); S.rings.push({ x: b.x, y: b.y, r: 6, max: 50 + b.w * 30, col: '120,220,255', life: 0.6 });
  floater(b.x, b.y, '🔧 ' + BUILD[b.type].n.toUpperCase() + ' REPARIERT', '#7ad7ff', true);
}
function v13Dismantle(b) {
  if (b.guard) v13Unpost(b, true);
  if (S.ship && b.type === 'workbench' && S.mainW && S.mainW.shipPad && S.where === 'main') { /* Schiff bleibt einfach stehen */ }
  burst(b.x, b.y, 10, '#c8a070', 20, 160); SFX.play('build');
  removeBuilding(b, true);
}
addEventListener('keydown', e => {
  if (!S || S.phase !== 'play' || !S.build || !S.build.on || UI.overlay) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code !== 'KeyX' && e.code !== 'KeyH') return;
  const b = v13Hover();
  e.preventDefault(); e.stopImmediatePropagation();
  if (!b) { SFX.play('deny'); return; }
  if (Math.hypot(b.x - S.p.x, b.y - S.p.y) > 520) { floater(b.x, b.y, 'ZU WEIT WEG', '#ff8080'); SFX.play('deny'); return; }
  if (e.code === 'KeyX') v13Dismantle(b); else v13Repair(b);
}, true);

// ------------------------------------------------------------------
// 5a) MAUERN VERBINDEN SICH MIT ALLEN GEBÄUDEN
// ------------------------------------------------------------------
const V13_FLAT = { pcable: 1, belt: 1, farm: 1, helipad: 1 };
updateNeighbors = function (b) {
  if (b.type !== 'wall' && b.type !== 'gate') return 0;
  const isW = o => !!o && o !== b && !V13_FLAT[o.type];
  const nb = { e: isW(gridAt(b.gx + 1, b.gy)), w: isW(gridAt(b.gx - 1, b.gy)), s: isW(gridAt(b.gx, b.gy + 1)), n: isW(gridAt(b.gx, b.gy - 1)) };
  b.nb = nb; b.skey = null;
  return (nb.e ? 1 : 0) + (nb.w ? 1 : 0) + (nb.s ? 1 : 0) + (nb.n ? 1 : 0);
};

// ------------------------------------------------------------------
// 5b) GEBÄUDE VERBINDEN SICH MIT GEBÄUDEN (überdachte Verbindungsgänge)
// ------------------------------------------------------------------
function v13LinkScan(b) {
  b.lnk = [];
  if (b.type === 'wall' || b.type === 'gate' || V13_FLAT[b.type] || BUILD[b.type].rot) return '';
  const seen = new Set(), add = (dir, o, a0, a1) => { if (!o || o === b || seen.has(o) || o.type === 'wall' || o.type === 'gate' || V13_FLAT[o.type] || BUILD[o.type].rot) return; if (MERGE[b.type] && o.type === b.type) return; seen.add(o); b.lnk.push([dir, (a0 + a1) / 2]); };
  for (let j = b.gy; j < b.gy + b.h; j++) { const e = gridAt(b.gx + b.w, j), w = gridAt(b.gx - 1, j); if (e) add('e', e, Math.max(b.gy, e.gy), Math.min(b.gy + b.h, e.gy + e.h)); if (w) add('w', w, Math.max(b.gy, w.gy), Math.min(b.gy + b.h, w.gy + w.h)); }
  for (let i = b.gx; i < b.gx + b.w; i++) { const s = gridAt(i, b.gy + b.h), n = gridAt(i, b.gy - 1); if (s) add('s', s, Math.max(b.gx, s.gx), Math.min(b.gx + b.w, s.gx + s.w)); if (n) add('n', n, Math.max(b.gx, n.gx), Math.min(b.gx + b.w, n.gx + n.w)); }
  return b.lnk.map(l => l[0] + l[1]).join(',');
}
{
  const _ms = mergeScan;
  mergeScan = function (b) {
    const r = _ms(b), lk = v13LinkScan(b);
    b.mkey = (b.mkey || '') + (lk ? '|L' + lk : '') + (b.guard ? '|G' : '');
    return r;
  };
}
function v13LinkParts(b) {
  const out = [], push = (...a) => out.push(a), Wd = b.w * TILE, Hd = b.h * TILE, L = Math.min(b.level || 1, 4);
  const floor = ['#7a5230', '#7f827e', '#5d666d', '#3d4f63'][L - 1], wall = ['#8b5e34', '#9a9c98', '#6d7276', '#4f585e'][L - 1], roof = ['#6b4423', '#5d666d', '#3e4e5a', '#25303d'][L - 1], glow = L >= 4 ? '#5ff4ff' : '#ffd27a';
  for (const [dir, mid] of b.lnk || []) {
    const horiz = dir === 'e' || dir === 'w', sg = dir === 'e' || dir === 's' ? 1 : -1;
    const off = horiz ? mid * TILE - b.gy * TILE - Hd / 2 : mid * TILE - b.gx * TILE - Wd / 2;
    const cx = horiz ? sg * (Wd / 2 - 7) : off, cy = horiz ? off : sg * (Hd / 2 - 7), lw = horiz ? 14 : 26, ld = horiz ? 26 : 14;
    push(cx, cy, 0, lw, ld, 3, floor);
    push(horiz ? cx : cx - 12, horiz ? cy - 12 : cy, 3, horiz ? 14 : 2, horiz ? 2 : 14, 24, wall);
    push(horiz ? cx : cx + 12, horiz ? cy + 12 : cy, 3, horiz ? 14 : 2, horiz ? 2 : 14, 24, wall);
    push(horiz ? cx : cx + 12.8, horiz ? cy + 12.8 : cy, 12, horiz ? 8 : 0.6, horiz ? 0.6 : 8, 7, glow);
    push(cx, cy, 27, lw + 2, ld + 4, 3, roof); push(cx, cy, 30, horiz ? lw : 6, horiz ? 6 : ld, 2, hexShade(roof, 1.2));
  }
  return out;
}

// ------------------------------------------------------------------
// 5c) CREW AUF WACHTÜRME
// ------------------------------------------------------------------
function v13TowerH(b) { return 54 + b.level * 12; }
function v13FreeCrew() { const used = new Set(S.mainB.filter(b => b.guard).map(b => b.guard)); return S.crew.find(c => !used.has(c.name)); }
function v13Post(b) {
  const c = v13FreeCrew(); if (!c) { UI.toast('Kein freies Crew-Mitglied. Finde Überlebende!'); SFX.play('deny'); return; }
  b.guard = c.name; b.gcd = 0.5; b.gAng = 0; mergeScan(b);
  SFX.play('upgrade'); burst(b.x, b.y, v13TowerH(b), '#5fd4ff', 20, 140, { up: 1.2 });
  floater(b.x, b.y - 20, '🗼 ' + c.name.toUpperCase() + ' HÄLT WACHE', '#5fd4ff', true);
}
function v13Unpost(b, silent) {
  const n = b.guard; b.guard = null; mergeScan(b);
  if (!silent) { SFX.play('click'); floater(b.x, b.y - 20, n + ' kommt runter', '#bff4ff'); }
}
{
  const _fi = findInteract;
  findInteract = function () {
    const p = S.p;
    if (S.where === 'main' && !p.inCar && !p.inHeli && !p.inShip) for (const b of S.buildings) {
      if (b.type !== 'watchtower' || Math.hypot(b.x - p.x, b.y - p.y) > 62) continue;
      if (b.guard) return { kind: 'v13unpost', b, text: 'E · ' + b.guard + ' vom Wachturm holen' };
      const c = v13FreeCrew(); if (c) return { kind: 'v13post', b, text: 'E · ' + c.name + ' (' + CREW_ROLES[c.role].n + ') auf den Wachturm setzen' };
    }
    return _fi();
  };
  const _di = doInteract;
  doInteract = function (it) { if (it.kind === 'v13post') { v13Post(it.b); return; } if (it.kind === 'v13unpost') { v13Unpost(it.b); return; } _di(it); };
}
function v13GuardParts(b) {
  const z = v13TowerH(b) + 4, a = b.gAng || 0, c = Math.cos(a), s = Math.sin(a), out = [];
  const at = (fx, fy) => [fx * c - fy * s, fx * s + fy * c];
  const P2 = (fx, fy, zz, w, d, h, col) => { const [x, y] = at(fx, fy); out.push([x, y, z + zz, w, d, h, col, a]); };
  P2(0, -2.5, 0, 3, 3, 9, '#2d3436'); P2(0, 2.5, 0, 3, 3, 9, '#2d3436');
  P2(0, 0, 9, 5, 9, 10, '#3d5a80'); P2(0, 0, 19, 5, 5, 5, '#e2b48c'); P2(0, 0, 23.5, 6, 6, 2, '#4b5d3a');
  P2(5, 3, 13, 12, 2, 2, '#2a2a2a'); P2(3, 3, 11, 3, 2, 4, '#5b3a22');
  return out;
}
function v13GuardTick(dt) {
  if (S.where !== 'main') return;
  const names = new Set(S.crew.map(c => c.name));
  for (const b of S.buildings) {
    if (b.type !== 'watchtower' || !b.guard) continue;
    if (!names.has(b.guard)) { v13Unpost(b, true); continue; }
    b.gcd = (b.gcd || 0) - dt;
    const R0 = 360 + b.level * 40; let best = null, bd = R0;
    for (const z of S.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - b.x, z.y - b.y); if (d < bd) { bd = d; best = z; } }
    if (!best) continue;
    const ta = Math.atan2(best.y - b.y, best.x - b.x); b.gAng = ta;
    if (b.gcd <= 0) {
      b.gcd = Math.max(0.35, 0.75 - 0.08 * b.level);
      const H = v13TowerH(b) + 16, mx = b.x + Math.cos(ta) * 12, my = b.y + Math.sin(ta) * 12, sp = 950;
      S.bullets.push({ x: mx, y: my, z: H, vx: Math.cos(ta) * sp, vy: Math.sin(ta) * sp, life: 0.55, dmg: 26 + 9 * b.level, src: 'turret', px: mx, py: my });
      burst(mx, my, H, '#ffe066', 3, 60, { nograv: true }); SFX.tone(900 + Math.random() * 200, 0.04, 'square', 0.04, 0.6);
    }
  }
}

// --- Modelle: Verbindungsgänge + Wache ---
{
  const _bp = buildingParts;
  buildingParts = function (b, t) {
    let out = _bp(b, t);
    if (b.lnk && b.lnk.length) out = out.concat(v13LinkParts(b));
    if (b.type === 'watchtower' && b.guard) out = out.concat(v13GuardParts(b));
    return out;
  };
}

// ------------------------------------------------------------------
// SPEICHERN / LADEN (Wachposten)
// ------------------------------------------------------------------
let V13_LOAD = false;
{
  const _sg = saveGame;
  saveGame = function (auto) {
    _sg(auto);
    try { if (S && S.phase === 'play' && !S.exp) localStorage.setItem(Auth.saveKey() + '_v13', JSON.stringify({ seed: S.seed, posts: S.mainB.filter(b => b.guard).map(b => [b.gx, b.gy, b.guard]) })); } catch (e) { }
  };
  const _lg = loadGame; loadGame = function () { V13_LOAD = true; _lg(); };
}
function v13ApplyLoad() {
  V13_LOAD = false;
  let d = null; try { d = JSON.parse(localStorage.getItem(Auth.saveKey() + '_v13') || 'null'); } catch (e) { }
  if (d && d.seed === S.seed) for (const [gx, gy, n] of d.posts || []) { const b = S.mainGrid[gy * 128 + gx]; if (b && b.type === 'watchtower' && S.crew.some(c => c.name === n)) { b.guard = n; mergeScan(b); } }
  for (const b of S.mainB) { mergeScan(b); updateNeighbors(b); }
  S.talents = {}; S.talentQ = 0; recalcCap();
}

// ------------------------------------------------------------------
// TICK + HOVER-ANZEIGE
// ------------------------------------------------------------------
let V13_INIT = false;
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p) return;
    if (S.phase === 'play') {
      if (V13_LOAD) v13ApplyLoad();
      if (!V13_INIT) { V13_INIT = true; S.talents = {}; for (const b of S.mainB) { mergeScan(b); updateNeighbors(b); } }
      S.talentQ = 0; S.dropPlane = null;
      v13GuardTick(dt);
    }
    const sp = $('v12sp'); if (sp) sp.textContent = sp.textContent.replace('· K', '· Q').replace('Skillbaum · K', 'Skillbaum · Q');
  };
}
{
  const _fl = factoryLabels;
  factoryLabels = function (t) {
    _fl(t);
    const b = v13Hover(); if (!b || !onScreen(b.x, b.y)) return;
    const rc = v13RepairCost(b), q = P(b.x, b.y, 74 + b.h * 16);
    const l1 = BUILD[b.type].n.toUpperCase() + ' · St.' + b.level + ' · ❤ ' + Math.round(b.hp) + '/' + Math.round(b.max);
    const l2 = 'X Abbauen (+50%) · ' + (rc ? 'H Reparieren: ' + costStr(rc) : '✔ unbeschädigt') + (BUILD[b.type].rot ? ' · R Drehen' : '') + ' · U Upgrade';
    G.textAlign = 'center'; G.font = '900 12px "Trebuchet MS", Arial';
    const w = Math.max(G.measureText(l1).width, G.measureText(l2).width) + 16;
    G.fillStyle = 'rgba(4,10,16,0.82)'; G.fillRect(q.x - w / 2, q.y - 30, w, 36); G.strokeStyle = rc ? '#ffb020' : '#7dff5a'; G.lineWidth = 2; G.strokeRect(q.x - w / 2, q.y - 30, w, 36);
    G.fillStyle = '#ffffff'; G.fillText(l1, q.x, q.y - 15); G.fillStyle = rc && canAfford(rc) ? '#ffe066' : rc ? '#ff9a80' : '#bfff7a'; G.fillText(l2, q.x, q.y + 1);
    const hb = b.hp / b.max; G.fillStyle = 'rgba(0,0,0,0.6)'; G.fillRect(q.x - w / 2 + 6, q.y + 3, w - 12, 3); G.fillStyle = hb > 0.6 ? '#7dff5a' : hb > 0.3 ? '#ffb020' : '#ff5e3a'; G.fillRect(q.x - w / 2 + 6, q.y + 3, (w - 12) * hb, 3);
    G.lineWidth = 1;
  };
}
TIPS.push('Baumodus: Maus auf ein Gebäude · X = abbauen · H = reparieren.', 'Tore lassen sich jetzt mit R drehen.', 'Setz Crew-Mitglieder auf Wachtürme (E) – sie schießen auf Monster.', 'Dein Spiel speichert automatisch alle paar Sekunden.');
LOBBY_NEWS.unshift({ t: 'V13 · WACHPOSTEN', s: 'Crew auf Wachtürme setzen · Gebäude verbinden sich · Autosave.' });
