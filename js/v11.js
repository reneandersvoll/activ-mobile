'use strict';
// =====================================================================================
// VERDANT SIEGE V11 – Axt-Start, Waffenläden, Industrie überall, Verschmelzen,
// begehbare Schluchten, Treppe, Neonstadt (oben) & Altstadt (unten). Lädt nach main.js.
// =====================================================================================
Object.assign(BUILD, {
  workbench:  { n: 'Werkstatt', icon: '🛠', w: 2, h: 2, cost: { wood: 30, stone: 15, scrap: 10 }, hp: 360, solid: 1, desc: 'E: Munition, Granaten, Medikits & mehr herstellen. Jede Stufe = neue Rezepte.' },
  watchtower: { n: 'Wachturm', icon: '🗼', w: 1, h: 1, cost: { wood: 25, stone: 10 }, hp: 320, light: 190, solid: 1, desc: 'Licht + Späher: Monster im Umkreis auf der Minimap. Mauern verbinden sich. St.3: Suchscheinwerfer.' },
  sawmill:    { n: 'Sägewerk', icon: '🪚', w: 2, h: 2, cost: { wood: 30, scrap: 15, stone: 10 }, hp: 260, planet: 1, use: 5, solid: 1, rot: 1, desc: 'Sägt Holz aus Bäumen in der Nähe (mind. 2) aufs Band (R = Richtung).' },
  ammofab:    { n: 'Munitionsfabrik', icon: '🏭', w: 2, h: 2, cost: { scrap: 40, stone: 20, elec: 3 }, hp: 320, planet: 1, use: 8, solid: 1, rot: 1, desc: 'Schrott per Band rein → je 1 Schrott = 10 Munition raus.' },
  export:     { n: 'Exportrampe', icon: '💰', w: 2, h: 2, cost: { scrap: 30, wood: 20 }, hp: 300, planet: 1, solid: 1, desc: 'Alles, was per Band ankommt, wird sofort verkauft (+10%).' },
});
BUILD.wind.cost = { scrap: 18, stone: 8, elec: 1 }; BUILD.geo.cost = { stone: 30, scrap: 20, elec: 2 }; BUILD.drill.cost = { scrap: 25, stone: 15, elec: 2 };
BUILD.smelter.cost = { scrap: 30, stone: 20, elec: 3 }; BUILD.battery.cost = { scrap: 10, elec: 2 }; BUILD.scanner.cost = { elec: 4, scrap: 15 };
BUILD.drill.desc = 'Fördert Rohstoff aufs Band (R = Richtung). Erde: nächstes Stein/Schrott-Vorkommen. Planeten: Planetenrohstoff.';
const BUILD_CATS = [
  { n: '⚔ VERTEIDIGUNG', list: ['wall', 'gate', 'watchtower', 'turret', 'autogun', 'lamp', 'fire', 'beacon', 'pturret', 'plamp'] },
  { n: '⌂ BASIS', list: ['hq', 'farm', 'storage', 'workbench', 'generator', 'garage', 'helipad'] },
  { n: '⚡ STROM', list: ['pcable', 'solar', 'wind', 'geo', 'reactor', 'battery'] },
  { n: '🏭 INDUSTRIE', list: ['drill', 'belt', 'smelter', 'sawmill', 'ammofab', 'container', 'export', 'scanner', 'sensor', 'analyzer', 'scrubber'] },
];
const BUILD_ONLY = { helipad: 'main', garage: 'main', analyzer: 'planet', scrubber: 'planet' };
function curOrder() { const c = BUILD_CATS[(S && S.buildCat) || 0], where = S ? S.where : 'main'; return c.list.filter(k => BUILD[k] && (!BUILD_ONLY[k] || BUILD_ONLY[k] === where)); }
function setBuildCat(i) { if (!S) return; S.buildCat = (i + BUILD_CATS.length) % BUILD_CATS.length; const o = curOrder(); if (!o.includes(S.build.sel)) S.build.sel = o[0]; SFX.play('click'); UI.buildHotbar(); }
const GUN_SHOP = { rifle: { price: 1800 }, shotgun: { price: 1200 }, sniper: { price: 6500, rank: 2 }, plasma: { price: 32000, rank: 3, station: true } };
const BLACK_GUNS = { shotgun: { price: 950 }, rifle: { price: 1550 }, lmg: { price: 8800 } };
const GUN_DESC = { rifle: 'Der Allrounder. Präzise Dauerfeuer-Waffe.', shotgun: 'Sieben Schrotkugeln. Nahkampf-König.', sniper: 'Durchschlägt bis zu 3 Gegner.', lmg: '100-Schuss-Gurt. Wer braucht Zielen?', plasma: 'Alien-Technologie. Durchschlagende Plasmabolzen.' };
const ITEM_AMT = { ammo: 10 };
const MERGE = { storage: 'LAGERHALLE', farm: 'GROSSFELD', solar: 'SOLARPARK', battery: 'AKKU-BLOCK', container: 'FRACHTTERMINAL', export: 'HANDELSKAI', generator: 'KRAFTWERK', wind: 'WINDPARK', geo: 'THERMALFELD' };
const MERGE_BONUS = { storage: '+25% Lagerplatz je Verbindung', farm: '+20% Wachstum je Verbindung', solar: '+10% Strom je Verbindung', battery: '+10% Kapazität je Verbindung', generator: '+15% Strom je Verbindung', wind: '+10% Strom je Verbindung', geo: '+10% Strom je Verbindung', export: '+5% Erlös je Verbindung', container: 'Ein riesiges Terminal' };
const RECIPES = [
  { n: 'Munition ×30', need: { scrap: 8 }, give: { ammo: 30 }, lvl: 1, icon: '▰' }, { n: 'Granate', need: { scrap: 6, stone: 6 }, give: { grenades: 1 }, lvl: 2, icon: '●' },
  { n: 'Medikit', need: { food: 3, scrap: 4 }, give: { meds: 1 }, lvl: 2, icon: '✚' }, { n: 'Munition ×80', need: { scrap: 14, stone: 4 }, give: { ammo: 80 }, lvl: 3, icon: '▰▰' },
  { n: 'Sprit ×20', need: { wood: 15, food: 1 }, give: { fuel: 20 }, lvl: 3, icon: '⛽' }, { n: 'Elektronik', need: { scrap: 24 }, give: { elec: 1 }, lvl: 4, icon: '🔌' },
];
LOBBY_NEWS.unshift({ t: 'V11 · NUR MIT DER AXT', s: 'Waffen kaufst du in Neu-Eden – oder findest sie ganz selten.' }, { t: 'NEONSTADT & ALTSTADT', s: 'Oben Neon und Regen. Unten Laternen, Holzhäuser und Treppen.' }, { t: 'INDUSTRIE ÜBERALL', s: 'Sägewerk, Munitionsfabrik, Exportrampe – auf Erde & Planeten.' }, { t: 'VERSCHMELZEN', s: 'Gleiche Gebäude nebeneinander werden zu Großanlagen.' });
TIPS.push('Du startest nur mit der Axt. Verkaufe Holz & Stein und kauf dir beim Waffenhändler »Kaliber« eine Knarre.', 'Gleiche Gebäude nebeneinander verschmelzen – und werden stärker!', 'In den Schluchten führen Felspfade hinab. Unten glühen Kristalle.', 'Baumodus: TAB wechselt die Kategorie.');
(() => { const st = document.createElement('style'); st.textContent = `#buildbar{flex-wrap:wrap!important}.bcats{display:flex;gap:6px;flex-basis:100%;width:100%;margin:0 0 6px 0;flex-wrap:wrap;justify-content:center}.bcat{padding:4px 11px;border-radius:7px;background:rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.18);font:900 11px "Trebuchet MS",Arial;color:#d8f0e0;cursor:pointer;user-select:none}.bcat.act{background:linear-gradient(#ffe27a,#e8b923);color:#1a1a1a;border-color:#fff3c0;box-shadow:0 0 12px rgba(255,216,74,.6)}.bcat.hint{opacity:.55;cursor:default}.gunrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.gunrow .mcard{flex:1;min-width:160px}`; document.head.appendChild(st); })();

// ---------- Neonstadt: Umfärben aller Stadt-Modelle + Cyber-Bürger ----------
const _rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function _hsl(h) { let [r, g, b] = _rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s, l]; }
const CYBER_MAP = new Map();
function cyberCol(c) {
  if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return c;
  let v = CYBER_MAP.get(c); if (v) return v;
  const [h, s, l] = _hsl(c), hash = parseInt(c.slice(1), 16) % 3;
  if (s < 0.38 && l > 0.6) v = l > 0.86 ? '#3a4152' : '#2b303c';                       // Creme, Stein, Schnee → Stahl
  else if (h >= 30 && h <= 58 && s > 0.5 && l > 0.72) v = ['#ff3fa4', '#3ff4ff', '#b05cff'][hash]; // warmes Fensterlicht → Neon
  else if (h >= 28 && h <= 58 && s > 0.4 && l > 0.3) v = l > 0.5 ? '#3ff4ff' : '#1fa8c0';  // Gold/Messing → Cyan
  else if (h >= 195 && h <= 250 && l < 0.5) v = '#2a1f45';                              // Schieferdächer → Violett
  else if (s < 0.3 && l < 0.6 && l > 0.2) v = '#1e2229';
  else v = c;
  CYBER_MAP.set(c, v); return v;
}
let CYBER_GEN = false;
{
  const _pp = propParts;
  propParts = function (p) { const out = _pp(p); if (S && (S.where === 'city' || CYBER_GEN) && p.kind !== 'cybertower' && p.kind !== 'hoload' && p.kind !== 'holotree' && p.kind !== 'neonlamp' && p.kind !== 'stairwell' && p.kind !== 'gunshop') for (const q of out) q[6] = cyberCol(q[6]); return out; };
  const _nl = npcLook;
  npcLook = function (kind, rng) { const L = _nl(kind, rng); if (CYBER_GEN && kind === 'rich') { const r = rng || Math.random; Object.assign(L, { coat: ['#14161c', '#1c2029', '#2a1f45'][Math.floor(r() * 3)], trim: '#3ff4ff', shirt: '#22262f', tie: null, neon: ['#ff3fa4', '#3ff4ff', '#b05cff'][Math.floor(r() * 3)], goggles: r() < 0.5 ? '#3ff4ff' : null, hat: r() < 0.2 ? 'Helm' : 'Keine' }); } return L; };
  const _gc = getCityW;
  getCityW = function (level) { CYBER_GEN = level === 'city'; try { return _gc(level); } finally { CYBER_GEN = false; } };
}

// ---------- Start nur mit Axt ----------
{ const _ns = newState; newState = function (seed) { const s = _ns(seed); Object.assign(s.res, { wood: 0, stone: 0, scrap: 0, food: 0, ammo: 0, meds: 0, grenades: 0, fuel: 0, money: 0 }); s.unlocked = { _v11: true }; s.buildCat = 0; s.p.mag = { rifle: 0, shotgun: 0, sniper: 0, lmg: 0, plasma: 0 }; return s; }; }
function hotbarSig() { return GUNS.filter(g => S.unlocked[g]).join(',') + '|' + (S.res.meds > 0 ? 'm' : '') + (S.res.grenades > 0 ? 'g' : ''); }
function refreshHotbar() {
  if (!S.unlocked) S.unlocked = {};
  if (!S.unlocked._v11) { S.unlocked.rifle = true; S.unlocked.shotgun = true; S.unlocked._v11 = true; }
  const cur = HOTBAR[S.p.slot]; HOTBAR = ['axe']; for (const g of GUNS) if (S.unlocked[g]) HOTBAR.push(g);
  if (S.res.meds > 0) HOTBAR.push('medkit'); if (S.res.grenades > 0) HOTBAR.push('grenade');
  const ni = HOTBAR.indexOf(cur); S.p.slot = ni >= 0 ? ni : 0; S.hbSig = hotbarSig(); if (typeof UI !== 'undefined') UI.buildHotbar();
}
function rollWeapon() { const pool = [['rifle', 40], ['shotgun', 34], ['sniper', 12], ['lmg', 10]]; if (S.where === 'planet' || S.where === 'space' || S.where === 'station') pool.push(['plasma', 14]); let r = Math.random() * pool.reduce((a, b) => a + b[1], 0); for (const [g, w] of pool) { r -= w; if (r <= 0) return g; } return 'rifle'; }
function giveWeapon(g, x, y, bought) {
  const p = S.p, W = WEAPONS[g];
  if (S.unlocked[g]) { addRes('ammo', 60, x, y); floater(x, y - 20, 'DOPPELT: ' + W.n.toUpperCase() + ' → +60 MUNI', '#ffe066', true); SFX.play('crate'); return; }
  S.unlocked[g] = true; p.mag[g] = weaponStat(g).mag; if (!bought) S.res.ammo += 30;
  refreshHotbar(); p.slot = Math.max(0, HOTBAR.indexOf(g)); UI.buildHotbar();
  announce('🔫 ' + (bought ? 'GEKAUFT' : 'WAFFE GEFUNDEN') + ': ' + W.n.toUpperCase(), bought ? 'Taste ' + (p.slot + 1) + ' · Voll geladen' : 'Unglaublich selten! Voll geladen + 30 Munition', '#ffb020');
  SFX.play('jackpot'); S.flash = 0.75; S.flashCol = '255,190,60'; shake(10);
  for (let i = 0; i < 4; i++) S.rings.push({ x: p.x, y: p.y, r: 6 + i * 18, max: 260, col: i % 2 ? '255,216,74' : '255,140,60', life: 0.9 + i * 0.18 });
  burst(p.x, p.y, 40, '#ffd84a', 50, 260, { up: 1.8 }); S.particles.push({ x: p.x, y: p.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.6, max: 0.6, col: '#fff', s: 1, beam: true, grav: 0, light: 260 });
  S.weaponShow = { g, t: 2.4 };
}
{ const _oc = openCrate; openCrate = function (c) { _oc(c); let ch = [0.004, 0.02, 0.07, 0.2][c.rarity] || 0; if (c.air) ch *= 1.5; if (S.where === 'exp' && S.W.biome === 'military') ch *= 2.2; if (c.pit) ch *= 1.5; if (Math.random() < ch) setTimeout(() => { if (S) giveWeapon(rollWeapon(), c.x, c.y, false); }, 1000); }; }
{ const _kz = killZombie; killZombie = function (z, src) { const n0 = S.pickups.length; _kz(z, src); for (let i = S.pickups.length - 1; i >= n0; i--) if (Math.random() < 0.55 && !RES[S.pickups[i].kind].rare) S.pickups.splice(i, 1); }; }

// ---------- Höhen: Schluchten & Treppen ----------
let MOVE_FROM_Z = null;
blockedFor = function (x, y, who) {
  const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
  if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) return { edge: true };
  const W = S.W, i = gy * MAP + gx; if (W.tiles[i] === 9) return { edge: true };
  if (MOVE_FROM_Z !== null && W.depth && Math.abs(W.depth[i] - MOVE_FROM_Z) > 30) return { edge: true, cliff: true };
  const b = S.grid[i];
  if (b) { if (who === 'player' && PLAYER_PASS[b.type]) return null; if (who === 'car' && (b.type === 'gate' || b.type === 'garage' || b.type === 'farm' || b.type === 'helipad')) return null; if (who === 'zombie' && ZOMBIE_PASS[b.type]) return null; return b; }
  return null;
};
{ const _me = moveEnt; moveEnt = function (e, dx, dy, r, who) { if (!S.W.depth) return _me(e, dx, dy, r, who); MOVE_FROM_Z = groundZ(e.x, e.y); try { return _me(e, dx, dy, r, who); } finally { MOVE_FROM_Z = null; } }; }
{ const _ad = ambientDark; ambientDark = function () { const a = S.W.ambient; if (a === 'cyber') return 0.6; if (a === 'dusk') return 0.4; let d = _ad(); if (S.W.kind === 'main' && S.p && groundZ(S.p.x, S.p.y) < -40) d = Math.max(d, 0.4); return d; }; }
{ const _cl = collectLights; collectLights = function () { _cl(); const t = performance.now() / 1000; for (const b of S.buildings) if (b.type === 'watchtower' && b.level >= 3) { const a = t * 0.9 + b.id; LIGHTS.push({ x: b.x + Math.cos(a) * 170, y: b.y + Math.sin(a) * 170, r: 120 + b.level * 15, col: '255,250,220', safe: true }); } }; }
function changeLevel(to) {
  SFX.play('door'); for (let i = 0; i < 6; i++) SFX.tone(150 + i * 12, 0.05, 'triangle', 0.05, 0.8, i * 0.12);
  UI.transition(to === 'under' ? 'DIE ALTSTADT' : 'NEONSTADT', to === 'under' ? 'Stufe um Stufe hinab – Holzhäuser, Laternen und Abendlicht' : 'Zurück nach oben – Neon, Regen und Hologramme', () => {
    const W = getCityW(to);
    if (to === 'under') { switchWorld('under', W, W.stairsUp.x, 4 * TILE); S.stairAnim = { t: 0, dur: 0.9, x0: W.stairsUp.x, y0: 4 * TILE, x1: W.spawn.x, y1: W.spawn.y }; }
    else { switchWorld('city', W, 22 * TILE, 4.5 * TILE); S.stairAnim = { t: 0, dur: 0.9, x0: 22 * TILE, y0: 4.5 * TILE, x1: W.spawnTop.x, y1: W.spawnTop.y }; }
  }, 700);
}
function underStairZ(x, y) { const W = S.W; if (!W.stairsUp || Math.abs(x - W.stairsUp.x) > 60) return 0; return clamp((250 - y) / 224, 0, 1) * 114; }

// ---------- Bauen überall + Verschmelzen ----------
placementInfo = function (wx, wy) {
  const bs = S.build, fp = footprint(bs.sel, bs.rot), gx = Math.floor(wx / TILE - fp.w / 2 + 0.5), gy = Math.floor(wy / TILE - fp.h / 2 + 0.5), cx = (gx + fp.w / 2) * TILE, cy = (gy + fp.h / 2) * TILE;
  let ok = true, why = '';
  if (S.where !== 'main' && S.where !== 'planet') { ok = false; why = 'Hier kann nicht gebaut werden'; }
  else if (BUILD_ONLY[bs.sel] && BUILD_ONLY[bs.sel] !== S.where) { ok = false; why = BUILD_ONLY[bs.sel] === 'main' ? 'Nur auf der Erde' : 'Nur auf fremden Planeten sinnvoll'; }
  if (ok && (bs.sel === 'turret' || bs.sel === 'autogun')) { const tg = gridAt(Math.floor(wx / TILE), Math.floor(wy / TILE)); if (tg && tg.type === 'wall') { const cost = buildCost(bs.sel), ok2 = !tg.mount && canAfford(cost) && Math.hypot(tg.x - S.p.x, tg.y - S.p.y) < 460; return { gx: tg.gx, gy: tg.gy, w: 1, h: 1, cx: tg.x, cy: tg.y, ok: ok2, why: tg.mount ? 'Mauer ist schon bewaffnet' : !canAfford(cost) ? 'Material fehlt: ' + costStr(cost) : 'Zu weit weg', cost, mount: tg }; } }
  for (let j = 0; j < fp.h && ok; j++) for (let i = 0; i < fp.w; i++) { const g = gridAt(gx + i, gy + j); if (g === undefined) { ok = false; why = 'Außerhalb'; break; } if (g) { ok = false; why = 'Belegt'; break; } const tt = S.W.tiles[(gy + j) * MAP + gx + i]; if (tt === 9 || tt === 11 || tt === 20) { ok = false; why = tt === 11 ? 'Schlucht – hier hält kein Fundament' : 'Gesperrt'; break; } }
  if (ok) { const x0 = gx * TILE, y0 = gy * TILE, x1 = x0 + fp.w * TILE, y1 = y0 + fp.h * TILE; staticNear(S.W, cx, cy, o => { if ((o.btype === 'tree' || o.btype === 'node') && o.hp > 0 && o.x > x0 - 6 && o.x < x1 + 6 && o.y > y0 - 6 && o.y < y1 + 6) { ok = false; why = o.btype === 'tree' ? 'Baum im Weg – erst fällen!' : 'Stein im Weg – abbauen!'; return true; } if (o.btype === 'prop' && o.solid && o.hw && Math.abs(o.x - cx) < o.hw + fp.w * TILE / 2 && Math.abs(o.y - cy) < o.hd + fp.h * TILE / 2) { ok = false; why = 'Hindernis im Weg'; return true; } }); for (const c of S.W.cars) if (c.x > x0 - 20 && c.x < x1 + 20 && c.y > y0 - 20 && c.y < y1 + 20) { ok = false; why = 'Fahrzeug im Weg'; } }
  if (ok && Math.hypot(cx - S.p.x, cy - S.p.y) > 460) { ok = false; why = 'Zu weit weg'; }
  if (ok && !PLAYER_PASS[bs.sel]) { const px = S.p.x, py = S.p.y; if (px > gx * TILE - 10 && px < (gx + fp.w) * TILE + 10 && py > gy * TILE - 10 && py < (gy + fp.h) * TILE + 10) { ok = false; why = 'Du stehst im Weg'; } }
  if (ok && BUILD[bs.sel].unique && S.buildings.some(b => b.type === bs.sel)) { ok = false; why = 'Nur eins erlaubt'; }
  const cost = buildCost(bs.sel); if (ok && !canAfford(cost)) { ok = false; why = 'Material fehlt: ' + costStr(cost); }
  let merge = 0; if (ok && MERGE[bs.sel]) for (let j = gy - 1; j <= gy + fp.h; j++) for (let i = gx - 1; i <= gx + fp.w; i++) { const corner = (i === gx - 1 || i === gx + fp.w) && (j === gy - 1 || j === gy + fp.h), inside = i >= gx && i < gx + fp.w && j >= gy && j < gy + fp.h; if (corner || inside) continue; const o = gridAt(i, j); if (o && o.type === bs.sel) merge++; }
  return { gx, gy, w: fp.w, h: fp.h, cx, cy, ok, why, cost, merge };
};
function updateNeighbors(b) { if (b.type !== 'wall' && b.type !== 'gate') return 0; const isW = o => o && (o.type === 'wall' || o.type === 'gate' || o.type === 'hq' || o.type === 'watchtower'); const nb = { e: isW(gridAt(b.gx + 1, b.gy)), w: isW(gridAt(b.gx - 1, b.gy)), s: isW(gridAt(b.gx, b.gy + 1)), n: isW(gridAt(b.gx, b.gy - 1)) }; b.nb = nb; return (nb.e ? 1 : 0) + (nb.w ? 1 : 0) + (nb.s ? 1 : 0) + (nb.n ? 1 : 0); }
function mergeScan(b) {
  if (!MERGE[b.type]) { b.mnb = null; b.mlinks = 0; b.mkey = ''; return 0; }
  const m = { e: false, w: false, s: false, n: false }, same = o => o && o !== b && o.type === b.type;
  for (let j = b.gy; j < b.gy + b.h; j++) { if (same(gridAt(b.gx + b.w, j))) m.e = true; if (same(gridAt(b.gx - 1, j))) m.w = true; }
  for (let i = b.gx; i < b.gx + b.w; i++) { if (same(gridAt(i, b.gy + b.h))) m.s = true; if (same(gridAt(i, b.gy - 1))) m.n = true; }
  b.mnb = m; b.mlinks = (m.e ? 1 : 0) + (m.w ? 1 : 0) + (m.s ? 1 : 0) + (m.n ? 1 : 0); b.mkey = (m.e ? 'e' : '') + (m.w ? 'w' : '') + (m.s ? 's' : '') + (m.n ? 'n' : ''); return b.mlinks;
}
function touching(b) { const set = new Set(); for (let j = b.gy - 1; j <= b.gy + b.h; j++) for (let i = b.gx - 1; i <= b.gx + b.w; i++) { const o = gridAt(i, j); if (o && o !== b) set.add(o); } return [...set]; }
function mergeGroup(b) { const seen = new Set([b]), q = [b]; while (q.length) { const c = q.pop(); for (const o of touching(c)) if (o.type === b.type && !seen.has(o)) { seen.add(o); q.push(o); } } return [...seen]; }
function mergeFx(b) {
  const grp = mergeGroup(b), n = grp.length, name = MERGE[b.type];
  for (const o of touching(b)) if (o.type === b.type) { const jx = (b.x + o.x) / 2, jy = (b.y + o.y) / 2; burst(jx, jy, 10, '#ffe066', 26, 200, { up: 1.6 }); S.rings.push({ x: jx, y: jy, r: 4, max: 90, col: '255,216,74', life: 0.6 }); }
  for (const o of grp) { o.pop = 1; o.shakeT = 0.25; }
  floater(b.x, b.y - 10, '⚡ VERSCHMOLZEN · ' + name + ' ×' + n, n >= 4 ? '#ffd84a' : '#bfff7a', true);
  setTimeout(() => S && floater(b.x, b.y - 4, MERGE_BONUS[b.type] || '', '#7ad7ff'), 350);
  for (let i = 0; i < Math.min(6, n + 1); i++) SFX.tone(440 * Math.pow(1.1225, i * 2), 0.12, 'triangle', 0.1, 1, i * 0.06);
  shake(5 + Math.min(10, n * 1.5)); S.flash = Math.max(S.flash, 0.18 + Math.min(0.3, n * 0.04)); S.flashCol = '255,230,120';
  if (n === 3 || n === 6 || n === 10) { announce('⚡ ' + name + ' ×' + n + '!', MERGE_BONUS[b.type] || 'Großanlage', '#ffd84a'); SFX.play('streak'); addXp(n * 8, b.x, b.y); } else addXp(4 + n * 2);
}
{
  const _pb = placeBuilding;
  placeBuilding = function (info, silentLoad, data) { const b = _pb(info, silentLoad, data); if (!b || (info.mount && !data)) return b; mergeScan(b); for (const o of touching(b)) mergeScan(o); recalcCap(); if (!silentLoad) { b.drop = 1; if (b.mlinks) setTimeout(() => S && S.buildings.includes(b) && mergeFx(b), 260); } return b; };
  const _rb = removeBuilding; removeBuilding = function (b, refund) { const nb = touching(b); _rb(b, refund); for (const o of nb) mergeScan(o); recalcCap(); };
  const _ub = upgradeBuilding;
  upgradeBuilding = function (b) { const l0 = b.level; _ub(b); if (b.level <= l0) return; b.evo = 1.4; S.particles.push({ x: b.x, y: b.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.7, max: 0.7, col: '#fff', s: 1, beam: true, grav: 0, light: 240 }); for (const c of ['#ffd84a', '#7dff5a', '#7ad7ff', '#ff7ad0']) burst(b.x, b.y, 30, c, 10, 220, { up: 2 }); if (b.level >= maxLevel(b.type)) setTimeout(() => { if (!S) return; announce('★ MAX-STUFE ★', BUILD[b.type].n + ' voll ausgebaut', '#7dff5a'); SFX.play('jackpot'); }, 600); };
}
function maxLevel(type) { return (type === 'wall' || type === 'gate' || type === 'hq' || type === 'workbench' || type === 'watchtower') ? 4 : 3; }
{ const _uc = upgradeCost; upgradeCost = function (type, lvl) { const c = _uc(type, lvl); if (type === 'workbench' && lvl >= 2) c.elec = lvl; if (type === 'watchtower' && lvl >= 3) c.elec = 2; if (BUILD[type] && BUILD[type].planet) { delete c.wood; c.scrap = (c.scrap || 0) + 10 * lvl; c.elec = (c.elec || 0) + lvl; } return c; }; }
function recalcCap() { S.cap = 150 + S.mainB.filter(b => b.type === 'storage').reduce((a, b) => a + (150 + (b.level - 1) * 100) * (1 + 0.25 * (b.mlinks || 0)), 0); }

// ---------- Werkstatt & Läden ----------
{
  const _fi = findInteract; findInteract = function () { const p = S.p; if (!p.inCar && !p.inHeli && !p.inShip && (S.where === 'main' || S.where === 'planet')) for (const b of S.buildings) if (b.type === 'workbench' && Math.hypot(b.x - p.x, b.y - p.y) < 76) return { kind: 'craft', b, text: 'E · WERKSTATT (Stufe ' + b.level + ')' }; return _fi(); };
  const _di = doInteract; doInteract = function (it) { if (it.kind === 'craft') { S.craftB = it.b; CityUI.open('craft'); return; } _di(it); };
}
function gunCards(list, black) {
  const C = S.city; let h = '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
  for (const g of Object.keys(list)) { const o = list[g], own = S.unlocked[g], st = WEAPONS[g], price = Math.round(o.price * (black ? 1 : discount())); const why = own ? '' : o.rank && C.rank < o.rank ? 'Rang „' + RANKS[o.rank].n + '“ nötig' : o.station && !S.station.owned ? 'Nur für Stationsbesitzer' : '';
    h += `<div class="mcard ${own ? 'act' : ''}"><b>${st.icon} ${st.n}</b><p>${GUN_DESC[g]}</p><small>Schaden ${st.dmg}${st.pellets > 1 ? '×' + st.pellets : ''} · Magazin ${st.mag} · ${Math.round(60 / st.rate)} Schuss/min</small><br><br><button class="btn ${own || why ? '' : 'gold'}" data-gun="${g}" data-price="${price}" ${own || why ? 'disabled' : ''}>${own ? '✔ IM BESITZ' : why ? '🔒 ' + why : 'KAUFEN · ' + fmtMoney(price)}</button></div>`; }
  return h + '</div>';
}
function bindGunButtons(root) {
  root.querySelectorAll('[data-gun]').forEach(e => e.onclick = () => { const g = e.dataset.gun, pr = +e.dataset.price; if (S.unlocked[g] || !spendMoney(pr)) return; UI.closeAll(); giveWeapon(g, S.p.x, S.p.y, true); });
  root.querySelectorAll('[data-ammo]').forEach(e => e.onclick = () => { const n = +e.dataset.ammo, pr = +e.dataset.price, k = e.dataset.k || 'ammo'; if (!spendMoney(pr)) return; S.res[k] = (S.res[k] || 0) + n; floater(S.p.x, S.p.y, '+' + n + ' ' + RES[k].s, RES[k].col, true); CityUI.render(); });
}
function ammoRow() { const a = priceBuy('ammo'), g = priceBuy('grenades'), m = priceBuy('meds'); return `<div class="gunrow"><div class="mcard"><b>▰ Munition ×30</b><p>Besitz: ${Math.floor(S.res.ammo)}</p><button class="btn" data-ammo="30" data-price="${a}">${fmtMoney(a)}</button></div><div class="mcard"><b>▰▰ Kiste ×150</b><p>10% Rabatt</p><button class="btn" data-ammo="150" data-price="${Math.round(a * 4.5)}">${fmtMoney(Math.round(a * 4.5))}</button></div><div class="mcard"><b>● Granate</b><p>Besitz: ${S.res.grenades}</p><button class="btn" data-ammo="1" data-k="grenades" data-price="${g}">${fmtMoney(g)}</button></div><div class="mcard"><b>✚ Medikit</b><p>Besitz: ${S.res.meds}</p><button class="btn" data-ammo="1" data-k="meds" data-price="${m}">${fmtMoney(m)}</button></div></div>`; }
{
  const _cr = CityUI.render;
  CityUI.render = function () {
    const st = this.station, b = $('cityBody');
    if (st === 'guns') { b.innerHTML = this.header('WAFFENHÄNDLER »KALIBER«', 'Lizenzierte Feuerkraft. Die einzige legale Art, an eine Waffe zu kommen.') + gunCards(GUN_SHOP, false) + ammoRow() + '<div class="csub" style="margin-top:10px">💡 Geld: Holz/Stein/Schrott am Markt verkaufen, Aufträge, Exportrampe.</div>'; bindGunButtons(b); return; }
    if (st === 'craft') { renderCraft.call(this); return; }
    _cr.call(this);
    if (st === 'black') { b.insertAdjacentHTML('beforeend', '<h2 style="margin-top:14px">🔫 UNTER DER THEKE</h2>' + gunCards(BLACK_GUNS, true)); bindGunButtons(b); }
    if (st === 'radio') { const btn = b.querySelector('[data-airdrop]'); if (btn) { const left = 3 - (S.day - (S.radioDropDay || -99)); if (left > 0) { btn.disabled = true; btn.textContent = 'Wieder in ' + left + ' Tag(en)'; } else { btn.disabled = false; btn.textContent = 'ANFORDERN · ' + fmtMoney(600); btn.onclick = () => { if (!spendMoney(600)) return; S.radioDropDay = S.day; UI.closeAll(); startAirdrop(); }; } } }
  };
}
function renderCraft() {
  const wb = S.craftB, L = wb ? wb.level : 1, b = $('cityBody');
  let h = this.header('🛠 WERKSTATT · STUFE ' + L, 'Rohstoffe rein, Nachschub raus. Upgrade (Baumodus · U) = neue Rezepte.') + '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
  RECIPES.forEach((r, i) => { const lock = L < r.lvl, ok = !lock && canAfford(r.need); h += `<div class="mcard ${lock ? '' : 'act'}" style="${lock ? 'opacity:.5' : ''}"><b>${r.icon} ${r.n}</b><p>${lock ? '🔒 Ab Stufe ' + r.lvl : 'Kosten: ' + costStr(r.need)}</p><button class="btn ${ok ? 'gold' : ''}" data-craft="${i}" ${ok ? '' : 'disabled'}>${lock ? 'GESPERRT' : 'HERSTELLEN'}</button> <button class="btn sm" data-craft5="${i}" ${!lock && canAfford(Object.fromEntries(Object.entries(r.need).map(([k, v]) => [k, v * 5]))) ? '' : 'disabled'}>×5</button></div>`; });
  b.innerHTML = h + '</div>';
  const craft = (i, n) => { const r = RECIPES[i]; for (let k = 0; k < n; k++) { if (!canAfford(r.need)) break; pay(r.need); for (const [kk, vv] of Object.entries(r.give)) addRes(kk, vv, S.p.x, S.p.y, true); } SFX.play('upgrade'); if (wb) { burst(wb.x, wb.y, 30, '#ffd84a', 16, 160, { up: 1.5 }); wb.pop = 1; } UI.toast('🛠 Hergestellt: ' + (n > 1 ? n + '× ' : '') + r.n); renderCraft.call(CityUI); };
  b.querySelectorAll('[data-craft]').forEach(e => e.onclick = () => craft(+e.dataset.craft, 1));
  b.querySelectorAll('[data-craft5]').forEach(e => e.onclick = () => craft(+e.dataset.craft5, 5));
}

// ---------- Industrie überall ----------
function countTrees(b) { let n = 0; for (const t of S.W.trees) if (t.hp > 0 && !t.deco && Math.hypot(t.x - b.x, t.y - b.y) < 180) n++; return n; }
function rebuildNets() {
  const list = S.buildings.filter(isPB); S.nets = [];
  for (const b of list) { b.net = -1; if (b.type === 'pcable') { b.cnb = { e: isPB(gridAt(b.gx + 1, b.gy)), w: isPB(gridAt(b.gx - 1, b.gy)), s: isPB(gridAt(b.gx, b.gy + 1)), n: isPB(gridAt(b.gx, b.gy - 1)) }; b.skey = null; } }
  for (const b of list) { if (b.net >= 0) continue; const net = { bs: [], prod: 0, use: 0, stor: 0, cap: 0, ok: false }, q = [b]; b.net = S.nets.length; S.nets.push(net); while (q.length) { const c = q.pop(); net.bs.push(c); for (let j = c.gy - 1; j <= c.gy + c.h; j++) for (let i = c.gx - 1; i <= c.gx + c.w; i++) { const corner = (i === c.gx - 1 || i === c.gx + c.w) && (j === c.gy - 1 || j === c.gy + c.h); if (corner) continue; const n = gridAt(i, j); if (isPB(n) && n.net < 0) { n.net = b.net; q.push(n); } } } }
  const W = S.W;
  for (const b of list) {
    if (b.type === 'drill') { if (W.planet && S.where === 'planet') { b.dres = W.planet.res; b.nearNode = W.nodes.some(n => n.kind === W.planet.node && n.hp > 0 && Math.hypot(n.x - b.x, n.y - b.y) < 110); } else { let best = null, bd = 130; for (const n of W.nodes) { if (n.hp <= 0 || !NODE_YIELD[n.kind]) continue; const d = Math.hypot(n.x - b.x, n.y - b.y); if (d < bd) { bd = d; best = n; } } b.dres = best ? NODE_YIELD[best.kind][0] : 'stone'; b.nearNode = !!best; } }
    if (b.type === 'sawmill') b.trees = countTrees(b);
  }
  S.factoryDirty = false;
}
function genOutput(b, t) { const env = PLANET_ENV[planetId()] || { sun: 1, wind: 1, geo: 1 }, A = atmoHere(), L = (1 + 0.35 * (b.level - 1)) * (1 + 0.1 * (b.mlinks || 0)); switch (BUILD[b.type].gen) { case 'solar': return 7 * env.sun * (0.25 + 0.75 * S.dayness) * (A && A === ATMO.normal ? 1.25 : 1) * L; case 'wind': return (3 + 5 * (0.5 + 0.5 * Math.sin(t * 0.37 + b.id * 1.7) * Math.sin(t * 0.11 + b.id))) * env.wind * L; case 'geo': return 14 * env.geo * L; case 'reactor': return 45 * L; } return 0; }
function deliverItem(t, res) {
  if (!t) return false;
  if (t.type === 'belt') { if (t.item) return false; t.item = { res, p: 0 }; return true; }
  if (t.type === 'container') { const amt = ITEM_AMT[res] || 1; if (RES[res] && RES[res].cap && S.res[res] >= S.cap) return false; S.res[res] = (S.res[res] || 0) + amt; if (RES[res] && RES[res].cap) S.res[res] = Math.min(S.cap, S.res[res]); t.count = (t.count || 0) + 1; t.pop = 1; S.stats.factory = (S.stats.factory || 0) + 1; S.floaters.push({ x: t.x + R(-10, 10), y: t.y, z: 60, text: '+' + amt + ' ' + RES[res].s, col: RES[res].col, life: 1, big: false }); SFX.tone(1200 + Math.random() * 300, 0.05, 'triangle', 0.05); if (t.count % 25 === 0) { announce('📦 ' + t.count + ' GELIEFERT!', 'Deine Fabrik läuft wie geschmiert', '#ffd84a'); SFX.play('cash'); addXp(40); } else addXp(2); return true; }
  if (t.type === 'export') { const m = MARKET[res], v = Math.max(1, Math.round((m ? m.sell * (ITEM_AMT[res] || 1) : 2) * 1.1 * (1 + 0.05 * (t.mlinks || 0)))); S.res.money += v; t.count = (t.count || 0) + 1; t.pop = 1; S.stats.exported = (S.stats.exported || 0) + v; S.floaters.push({ x: t.x + R(-10, 10), y: t.y, z: 70, text: '+' + fmtMoney(v), col: '#ffd84a', life: 1, big: v >= 100 }); SFX.play('coin'); if (t.count % 30 === 0) { announce('💰 ' + t.count + ' VERKAUFT', 'Gesamterlös ' + fmtMoney(S.stats.exported), '#ffd84a'); SFX.play('cash'); addXp(30); } return true; }
  if (t.type === 'smelter') { if ((t.inp || 0) >= 8) return false; t.inp = (t.inp || 0) + 1; t.inRes = res; return true; }
  if (t.type === 'ammofab') { if (res !== 'scrap' || (t.inp || 0) >= 8) return false; t.inp = (t.inp || 0) + 1; return true; }
  return false;
}
{
  const _uf = updateFactory;
  updateFactory = function (dt) {
    if (S.where === 'planet') { _uf(dt); v11Machines(dt); return; }
    if (S.where !== 'main' || !S.buildings.some(isPB)) return;
    // Erde: Planetenlogik ohne Atmosphäre/Wellen
    earthFactory(dt);
  };
}
function earthFactory(dt) {
  if (S.factoryDirty || !S.nets) rebuildNets();
  const t = performance.now() / 1000;
  for (const n of S.nets) { n.prod = 0; n.use = 0; n.stor = 0; n.cap = 0; }
  for (const b of S.buildings) { if (!isPB(b)) continue; const d = BUILD[b.type], n = S.nets[b.net]; if (!n) continue; if (d.gen) { b.out = genOutput(b, t); n.prod += b.out; } if (d.use) n.use += d.use; if (d.store) { b.stor = b.stor || 0; n.cap += d.store * b.level; } }
  for (const n of S.nets) { const diff = n.prod - n.use; if (diff >= 0) { n.ok = true; let ch = diff * dt * 0.6; for (const b of n.bs) if (BUILD[b.type].store && ch > 0) { const add = Math.min(ch, BUILD[b.type].store * b.level - b.stor); b.stor += add; ch -= add; } } else { let need = -diff * dt; for (const b of n.bs) if (BUILD[b.type].store && need > 0) { const tk = Math.min(need, b.stor); b.stor -= tk; need -= tk; } n.ok = need <= 0.0001; } for (const b of n.bs) { if (BUILD[b.type].store) { n.stor += b.stor; b.charge = b.stor / (BUILD[b.type].store * b.level); } const d = BUILD[b.type]; b.powered = d.use ? n.ok : true; if (b.type === 'pcable') b.powered = n.prod > 0; } }
  for (const b of S.buildings) { if (!isPB(b)) continue; b.pop = Math.max(0, (b.pop || 0) - dt * 3);
    switch (b.type) {
      case 'wind': b.rotor = (b.rotor || 0) + dt * (1 + (b.out || 0) * 0.5); break;
      case 'drill': { b.buf = b.buf || []; const res = b.dres || 'stone'; if (b.powered && b.buf.length < 6) { b.prog = (b.prog || 0) + dt * (b.nearNode ? 1.4 : 0.5); if (b.prog >= 6) { b.prog = 0; b.buf.push(res); burst(b.x, b.y, 40, RES[res].col, 6, 90); SFX.play('stone'); } } pushBuffer(b); break; }
      case 'belt': if (b.item && b.powered) { b.item.p += dt / 0.7; if (b.item.p >= 1) { const [fx, fy] = frontTile(b), tb = gridAt(fx, fy); if (tb && tb !== b && deliverItem(tb, b.item.res)) b.item = null; else b.item.p = 1; } } break;
      case 'smelter': b.buf = b.buf || []; if (b.powered && (b.inp || 0) > 0 && b.buf.length <= 4) { b.prog = (b.prog || 0) + dt; if (b.prog >= 3.5) { b.prog = 0; b.inp--; b.buf.push(b.inRes, b.inRes); burst(b.x, b.y, 30, '#ff8a2a', 12, 120); } } pushBuffer(b); break;
      case 'scanner': if (b.powered && !S.W.scanned) { b.prog = (b.prog || 0) + dt; if (b.prog >= 8) { S.W.scanned = true; let n = 0; for (let k = 0; k < 40 && n < 6; k++) { const a = R(0, 6.28), r = R(180, 560), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (!freeAt(S.W, x, y, 20) || gridAt(Math.floor(x / TILE), Math.floor(y / TILE))) continue; const nd = addNode(S.W, x, y, Math.random() < 0.5 ? 'rock' : 'scrap'); if (nd) { nd.sc = 1.45; nd.rich = true; n++; } } announce('📡 ' + n + ' REICHE VORKOMMEN!', 'Bohrturm daneben = schnellere Förderung', '#5fff8a'); MINI_DIRTY = true; S.factoryDirty = true; } } break;
      case 'sensor': if (b.powered) S.sensorOn = true; break;
    }
  }
  v11Machines(dt);
}
function v11Machines(dt) {
  for (const b of S.buildings) {
    if (b.type === 'sawmill') { b.buf = b.buf || []; b.treeT = (b.treeT || 0) - dt; if (b.treeT <= 0) { b.treeT = 5; b.trees = countTrees(b); } if (b.powered && (b.trees || 0) >= 2 && b.buf.length < 6) { b.prog = (b.prog || 0) + dt * (0.7 + 0.1 * Math.min(b.trees, 10)) * (1 + 0.3 * (b.level - 1)); if (Math.random() < dt * 14) burst(b.x + 4, b.y, 28, '#e8c890', 1, 70); if (b.prog >= 4) { b.prog = 0; b.buf.push('wood'); SFX.play('chop'); } } pushBuffer(b); }
    if (b.type === 'ammofab') { b.buf = b.buf || []; if (b.powered && (b.inp || 0) > 0 && b.buf.length <= 4) { b.prog = (b.prog || 0) + dt * (1 + 0.35 * (b.level - 1)); if (b.prog >= 3) { b.prog = 0; b.inp--; b.buf.push('ammo'); burst(b.x, b.y, 30, '#ffe066', 10, 110); SFX.tone(700, 0.08, 'square', 0.05, 1.4); } } pushBuffer(b); }
  }
}
{
  const _fb = factoryBoxes; factoryBoxes = function (t) {
    if (S.where === 'main') for (const b of S.buildings) if (b.type === 'belt' && b.item) { const d = DIRS[b.rot || 0], k = b.item.p - 0.5, c = RES[b.item.res].col; addModel([[0, 0, 0, 12, 12, 10, c], [0, 0, 10, 8, 8, 2, hexShade(c, 1.3)]], b.x + d[0] * k * TILE, b.y + d[1] * k * TILE, 6, t, 1); }
    _fb(t);
    const ws = S.weaponShow; if (ws && S.phase === 'play') { const all = []; weaponParts(ws.g, { attach: {}, camo: 'std', t }, all); const k = Math.min(1, (2.4 - ws.t) * 3); addModel(all, S.p.x, S.p.y, 46 + 40 * k + Math.sin(t * 3) * 4 + groundZ(S.p.x, S.p.y), t * 2.6, 1.6 + k * 0.8, Math.min(1, ws.t * 2), 6000); }
  };
  const _fu = factoryUnderlay; factoryUnderlay = function (t) {
    if (S.where === 'main' && S.build.on) for (const b of S.buildings) if (BUILD[b.type].rot) { const d = DIRS[b.rot || 0], a = P(b.x, b.y, 8), c = P(b.x + d[0] * TILE * 0.7, b.y + d[1] * TILE * 0.7, 8); G.strokeStyle = '#ffd84a'; G.lineWidth = 3; G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(c.x, c.y); G.stroke(); }
    _fu(t);
    const gh = S.ghost; if (S.build.on && gh && gh.ok && gh.merge) { const q = P(gh.cx, gh.cy, 0), r = (gh.w + gh.h) * TILE * 0.42 + Math.sin(t * 8) * 4; G.strokeStyle = 'rgba(255,216,74,0.95)'; G.lineWidth = 3; G.setLineDash([6, 5]); G.beginPath(); G.ellipse(q.x, q.y, r * IX * 1.414 * VIEW.zoom, r * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.stroke(); G.setLineDash([]); G.font = '900 13px "Trebuchet MS", Arial'; G.textAlign = 'center'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.75)'; const txt = '⚡ VERSCHMILZT (' + gh.merge + ')'; G.strokeText(txt, q.x, q.y - 70 * VIEW.zoom); G.fillStyle = '#ffd84a'; G.fillText(txt, q.x, q.y - 70 * VIEW.zoom); }
    G.lineWidth = 1;
  };
  const _flab = factoryLabels; factoryLabels = function (t) {
    _flab(t); G.textAlign = 'center'; G.font = '900 11px "Trebuchet MS", Arial';
    for (const b of S.buildings) { if (!onScreen(b.x, b.y)) continue; let txt = '', col = '#ffd84a';
      if (b.type === 'sawmill') { txt = (b.trees || 0) >= 2 ? '🪚 ' + b.trees + ' Bäume · ' + Math.round((b.prog || 0) / 4 * 100) + '%' : '🪚 KEINE BÄUME'; col = (b.trees || 0) >= 2 ? '#d9a86a' : '#ff5e3a'; }
      else if (b.type === 'ammofab') txt = '🏭 ' + (b.inp || 0) + ' Schrott → ' + (b.buf ? b.buf.length : 0) + '×10 Muni';
      else if (b.type === 'export') txt = '💰 ' + (b.count || 0) + ' verkauft';
      else if (S.where === 'main' && b.type === 'drill') txt = '⛏ ' + RES[b.dres || 'stone'].s + ' ' + Math.round((b.prog || 0) / 6 * 100) + '%';
      else if (S.where === 'main' && BUILD[b.type].gen) { txt = '⚡ +' + (b.out || 0).toFixed(1); col = '#5fff8a'; }
      else if (S.where === 'main' && b.type === 'container') txt = '📦 ' + (b.count || 0);
      if (!txt) continue; const q = P(b.x, b.y, 70 + b.h * 14), w = G.measureText(txt).width + 12; G.fillStyle = 'rgba(4,10,16,0.75)'; G.fillRect(q.x - w / 2, q.y - 12, w, 16); G.fillStyle = col; G.fillText(txt, q.x, q.y); }
  };
}

// ---------- Tick ----------
let _stepT = 0;
function v11Tick(dt) {
  if (!S || !S.p) return; const p = S.p;
  if (S.phase === 'play') { S.hbT = (S.hbT || 0) - dt; if (S.hbT <= 0) { S.hbT = 0.3; if (hotbarSig() !== S.hbSig) refreshHotbar(); } }
  if (S.weaponShow) { S.weaponShow.t -= dt; if (S.weaponShow.t <= 0) S.weaponShow = null; }
  for (const b of S.buildings) {
    if (b.drop > 0) { const fast = b.type === 'wall' || b.type === 'gate' || b.type === 'pcable' || b.type === 'belt'; b.drop = Math.max(0, b.drop - dt * (fast ? 4.5 : 2.4)); if (b.drop === 0) { burst(b.x, b.y, 4, '#b8a27a', fast ? 6 : 18, fast ? 90 : 170); if (!fast) { shake(4); SFX.noise(0.14, 0.28, 420); S.rings.push({ x: b.x, y: b.y, r: 6, max: 50 + b.w * 26, col: '230,210,160', life: 0.45 }); } b.pop = Math.max(b.pop || 0, 0.6); } }
    if (b.evo > 0) { b.evo = Math.max(0, b.evo - dt); if (Math.random() < dt * 24) burst(b.x + R(-20, 20), b.y + R(-20, 20), R(10, 60), Math.random() < 0.5 ? '#ffd84a' : '#ffffff', 2, 80, { up: 1.2 }); if (b.evo === 0) { burst(b.x, b.y, 30, '#7dff5a', 24, 200, { up: 1.6 }); SFX.play('pickup'); } }
  }
  for (const bl of S.bullets) if (bl.gz === undefined) bl.gz = groundZ(bl.px, bl.py);
  const a = S.stairAnim;
  if (a) { a.t += dt; const k = Math.min(1, a.t / a.dur); p.x = lerp(a.x0, a.x1, k); p.y = lerp(a.y0, a.y1, k); p.a = Math.atan2(a.y1 - a.y0, a.x1 - a.x0); p.walk += dt * 10; p.moving = 1; _stepT -= dt; if (_stepT <= 0) { _stepT = 0.17; SFX.tone(120 + Math.random() * 30, 0.05, 'triangle', 0.06, 0.7); } if (k >= 1) { const fn = a.done; S.stairAnim = null; p.moving = 0; if (fn) fn(); } }
  else if (S.phase === 'play' && !UI.overlay) {
    if (S.where === 'city' && S.W.stairsDown && tileType(S.W, p.x, p.y) === 20) S.stairAnim = { t: 0, dur: 1.0, x0: p.x, y0: p.y, x1: 22 * TILE, y1: 4.2 * TILE, done: () => changeLevel('under') };
    else if (S.where === 'under' && S.W.stairsUp && Math.abs(p.x - S.W.stairsUp.x) < 56 && p.y < S.W.stairsUp.y) S.stairAnim = { t: 0, dur: 1.25, x0: p.x, y0: p.y, x1: S.W.stairsUp.x, y1: 1.2 * TILE, done: () => changeLevel('city') };
  }
  p.az = S.where === 'under' ? underStairZ(p.x, p.y) : 0;
}
addEventListener('keydown', e => { if (e.code === 'Tab' && S && S.phase === 'play' && S.build.on && !UI.overlay) { e.preventDefault(); setBuildCat((S.buildCat || 0) + (e.shiftKey ? -1 : 1)); } });
