'use strict';
// ===================== SPIELLOGIK =====================
let S = null, MINI = null, MINI_DIRTY = false;
const DAY_LEN = 300;
const SETTINGS = Object.assign({ vol: 0.5, shake: true, outline: true, particles: 'hoch', fps: false }, JSON.parse(localStorage.getItem('vs9_settings') || '{}'));
const DEFAULT_LOOK = { name: 'Survivor', skin: '#e2b48c', hair: '#5b3a1e', hairStyle: 'Kurz', hat: 'Cap', shirt: '#3d5a80', pants: '#2d3436', pack: '#6b4f2a', beard: 'Nein', build: 'Normal' };
let LOOK = Object.assign({}, DEFAULT_LOOK, JSON.parse(localStorage.getItem('vs9_char') || localStorage.getItem('vs8_char') || '{}'));

function newState(seed) {
  setDims(128);
  const W = makeMainWorld(seed);
  const s = {
    seed, W, mainW: W, mainB: [], mainGrid: new Array(128 * 128).fill(null), where: 'main', cityW: null, underW: null,
    time: 0.31, day: 1, night: 0, dayness: 1, wasNight: false, weather: 'Klar', weatherT: 70, lightning: 0, rainAmt: 0, bloodMoon: false, awayNight: false,
    phase: 'intro', introT: 0, plane: { x: 1500, y: 64 * TILE - 160, z: 380, a: 0, t: 0 },
    p: { x: 64 * TILE, y: 64 * TILE, z: 0, a: 0, hp: 100, maxHp: 100, hunger: 100, stamina: 100, walk: 0, moving: 0, slot: 0, swing: 0, swingHit: false, recoil: 0, pump: 0, fireCd: 0, reload: 0, mag: { rifle: 30, shotgun: 6, sniper: 5, lmg: 100, plasma: 24 }, hurt: 0, inCar: null, inHeli: null, inShip: null, channel: 0, invuln: 0, alt: 0, chute: 0 },
    res: { wood: 25, stone: 12, scrap: 6, food: 4, ammo: 90, meds: 1, grenades: 2, fuel: 0, elec: 0, mil: 0, crystal: 0, cells: 0, titan: 0, xeno: 0, plasma: 0, void: 0, relic: 0, money: 60, frags: 0 },
    cap: 150, nextId: 1,
    zombies: [], bullets: [], grenades: [], particles: [], floaters: [], pickups: [], rings: [], fallingTrees: [],
    xp: 0, level: 1, perks: {}, pendingPerks: 0, perkDelay: 0,
    stats: { kills: 0, trees: 0, built: 0, crates: 0, roadkills: 0, brutes: 0, nights: 0, wk: { axe: 0, rifle: 0, shotgun: 0, sniper: 0, lmg: 0, plasma: 0 }, played: 0, bosses: 0, floors: 0, deliveries: 0, exps: 0, casinoWon: 0, casinoLost: 0, repairs: 0, planets: 0, aliens: 0 },
    attach: { rifle: {}, shotgun: {}, sniper: {}, lmg: {}, plasma: {} }, camo: { rifle: 'std', shotgun: 'std', sniper: 'std', lmg: 'std', plasma: 'std' }, unlocked: {},
    missions: { offers: [], active: null, base: 0, tier: 0 },
    streak: 0, streakT: 0, streakGot: {}, multiN: 0, multiT: 0, uav: 0, drone: null, mortar: [], dropPlane: null, lastNoonDay: 0,
    build: { on: false, sel: 'wall', rot: 0, lastTile: -1, chain: 0, chainT: 0 }, power: { prod: 0, use: 0 },
    spawnT: 3, budget: 0, bossNight: false, ruinT: 4,
    shake: 0, flash: 0, flashCol: '255,255,255', hitMark: 0, killMark: 0, lastCar: null, hold: { what: null, t: 0 }, prompt: '', zoom: 0.8, userZoom: 1,
    edenFound: false, edenHint: null, zoneSeen: {}, curZone: null, radioFixed: false, radioDropDay: 0,
    city: { rep: 0, rank: 0, job: null, jobXp: { courier: 0, guard: 0, mech: 0, barkeep: 0 }, biz: {}, apts: {}, task: null, offers: [], fixer: [], shiftDay: 0, missedRent: 0, mayor: false, electionDay: 0, priceF: 1, buffs: {}, guardKills: 0, passBought: false, lastDaily: 1 },
    exp: null, expOffers: [], follower: null,
    ship: null, station: { owned: false, at: 'earth', up: {}, visited: {} }, crew: [], crewOffers: [], spaceW: null, fp: false, fpPitch: -0.05,
    atmo: null, atmoPh: null, atmoKnown: {}, pbases: {}, nets: null, factoryDirty: true,
  };
  { const a = initAtmo(seed); s.atmo = a.atmo; s.atmoPh = a.ph; }
  s.buildings = s.mainB; s.grid = s.mainGrid;
  return s;
}
function perk(id) { return S.perks[id] || 0; }
function canAfford(cost) { for (const k in cost) if ((S.res[k] || 0) < cost[k]) return false; return true; }
function pay(cost) { for (const k in cost) S.res[k] -= cost[k]; }
function cleanCost(c) { const o = {}; for (const k in c) if (c[k] > 0) o[k] = c[k]; return o; }
function costStr(cost) { return Object.entries(cost).filter(([k, v]) => v > 0).map(([k, v]) => (k === 'money' ? fmtMoney(v) : v + ' ' + (RES[k] ? RES[k].n : k))).join(' · '); }
function fmtMoney(v) { return Math.round(v).toLocaleString('de-DE') + ' ₵'; }
function buildCost(type) { const c = Object.assign({}, BUILD[type].cost); if (perk('build')) for (const k in c) c[k] = Math.ceil(c[k] * Math.pow(0.8, perk('build'))); return c; }
function addRes(k, v, x, y, silent) {
  if (v <= 0) return;
  const toBag = S.exp && !['ammo', 'meds', 'grenades', 'food', 'money'].includes(k);
  if (toBag) S.exp.bag[k] = (S.exp.bag[k] || 0) + v;
  else if (RES[k] && RES[k].cap) { const b = S.res[k]; S.res[k] = Math.min(S.cap, S.res[k] + v); v = S.res[k] - b; if (v <= 0 && !silent) { floater(x || S.p.x, y || S.p.y, 'LAGER VOLL', '#ff8080'); return; } }
  else S.res[k] = (S.res[k] || 0) + v;
  if (k === 'money') SFX.play('coin'); if (k === 'frags') onFragment();
  if (!silent && v > 0 && RES[k]) floater(x || S.p.x, y || S.p.y, '+' + (k === 'money' ? fmtMoney(v) : v + ' ' + RES[k].s) + (toBag ? ' 🎒' : ''), RES[k].col, RES[k].rare);
}
function floater(x, y, text, col, big) { S.floaters.push({ x, y, z: 40, text, col: col || '#fff', life: 1.3, big: !!big }); }
function burst(x, y, z, col, n, spd, opts) { if (SETTINGS.particles === 'niedrig') n = Math.ceil(n / 3); for (let i = 0; i < n; i++) S.particles.push({ x, y, z: z || 10, vx: R(-1, 1) * (spd || 120), vy: R(-1, 1) * (spd || 120), vz: R(40, 200) * ((opts && opts.up) || 1), life: R(0.4, 1.0), max: 1, col, s: R(2, 5) * ((opts && opts.size) || 1), grav: opts && opts.nograv ? 0 : (S.where === 'space' ? 0 : 420) }); }
function smoke(x, y, z, col, n) { for (let i = 0; i < n; i++) S.particles.push({ x: x + R(-6, 6), y: y + R(-6, 6), z, vx: R(-15, 15), vy: R(-15, 15), vz: R(30, 70), life: R(1, 2), max: 2, col: col || 'rgba(80,80,80,0.5)', s: R(6, 12), smoke: true, grav: 0 }); }
function shake(v) { if (SETTINGS.shake) S.shake = Math.max(S.shake, v); }
function announce(t, s, c) { UI.announce(t, s, c); }
function addXp(v, x, y) {
  if (S.city.apts.pent || S.city.apts.villa || S.city.apts.sky) v = Math.round(v * 1.1);
  S.xp += v; if (x !== undefined) floater(x, y - 10, '+' + v + ' XP', '#c9a0ff');
  let need = xpNeed();
  while (S.xp >= need) { S.xp -= need; S.level++; S.pendingPerks++; S.perkDelay = 0.7; SFX.play('level'); S.flash = 0.6; S.flashCol = '255,220,90'; announce('LEVEL ' + S.level + '!', 'Wähle einen Perk', '#ffd84a'); burst(S.p.x, S.p.y, 20, '#ffe066', 50, 220); S.rings.push({ x: S.p.x, y: S.p.y, r: 10, max: 220, col: '255,220,90', life: 1 }); need = xpNeed(); }
}
function xpNeed() { return 100 + (S.level - 1) * 70; }
function camTarget(x, y, z) { const d = z * IZ / (2 * IY); return { x: x - d, y: y - d }; }
function aimPoint() { if (S.fp) return { x: S.p.x + Math.cos(S.p.a) * 420, y: S.p.y + Math.sin(S.p.a) * 420 }; return screenToWorld(MOUSE.x, MOUSE.y + 20 * IZ * VIEW.zoom); }
function inCity() { return S.where === 'city' || S.where === 'under'; }

// ---------- Welt wechseln ----------
function serializeB(b) { return { type: b.type, gx: b.gx, gy: b.gy, w: b.w, h: b.h, level: b.level, hp: b.hp, grow: b.grow, rot: b.rot || 0, mount: b.mount || null, count: b.count || 0, stor: b.stor || 0 }; }
function switchWorld(where, W, x, y) {
  const keepShip = S.p.inShip;
  if (S.where === 'planet' && S.W && S.W.planet) S.pbases[S.W.planet.id] = S.buildings.map(serializeB);
  S.W = W; setDims(W.size); S.where = where;
  if (where === 'main') { S.buildings = S.mainB; S.grid = S.mainGrid; } else { S.buildings = []; S.grid = new Array(W.size * W.size).fill(null); }
  S.nets = null; S.factoryDirty = true; S.pwaveT = 110; S.pwaveWarn = false; S.atmoWarned = false;
  if (where === 'planet' && W.planet && S.pbases[W.planet.id]) for (const d of S.pbases[W.planet.id]) { const b = placeBuilding({ gx: d.gx, gy: d.gy, w: d.w, h: d.h }, true, d); b.count = d.count; b.stor = d.stor; }
  S.zombies = []; S.bullets = []; S.pickups = []; S.grenades = []; S.particles = []; S.floaters = []; S.rings = []; S.fallingTrees = []; S.mortar = []; S.drone = null; S.dropPlane = null;
  const p = S.p; p.x = x; p.y = y; p.inCar = null; p.inHeli = null; p.inShip = null; p.channel = 0; p.reload = 0;
  if (keepShip && S.ship) { S.ship.world = where; S.ship.x = x; S.ship.y = y; p.inShip = S.ship; }
  S.build.on = false; S.hold.what = null;
  if (S.follower) { S.follower.x = x - 30; S.follower.y = y; }
  MINI = null; MINI_DIRTY = true; S.curZone = null; GCACHE.incomplete = true;
  const ct = camTarget(x, y, 0); VIEW.cx = ct.x; VIEW.cy = ct.y;
  prewarmChunks(W, x, y, 3);
  for (const k in KEYS) KEYS[k] = false; MOUSE.down = false;
  if (typeof UI !== 'undefined' && UI.buildHotbar) UI.buildHotbar();
}
function withMain(fn) {
  if (S.where === 'main') return fn();
  const sb = S.buildings, sg = S.grid, sm = MAP, sw = S.W;
  setDims(128); S.buildings = S.mainB; S.grid = S.mainGrid; S.W = S.mainW;
  try { return fn(); } finally { S.buildings = sb; S.grid = sg; S.W = sw; setDims(sm); }
}
function getCityW(level) { if (level === 'city') { if (!S.cityW) S.cityW = makeCityWorld('city'); return S.cityW; } if (!S.underW) S.underW = makeCityWorld('under'); return S.underW; }
function enterCity() {
  if (!S.edenFound) discoverEden();
  UI.transition('NEU-EDEN', 'Die Stadt des Fortschritts', () => {
    const W = getCityW('city'); if (S.dayness < 0.35) S.awayNight = true;
    switchWorld('city', W, W.spawn.x, W.spawn.y);
    if (!S.city.visited) { S.city.visited = true; announce('WILLKOMMEN IN NEU-EDEN', 'Oben Gold und Glas. Unten Rauch und Rost.', '#ffd84a'); }
    if (S.follower) completeRescue();
  });
}
function leaveCity() { UI.transition('DIE ZONE', 'Draußen herrscht der Tod', () => switchWorld('main', S.mainW, S.mainW.eden.x + 40, S.mainW.eden.y + 20)); }
function changeLevel(to) { SFX.play('elevator'); UI.transition(to === 'under' ? 'UNTERSTADT' : 'OBERSTADT', to === 'under' ? 'Chemdunst, Rost und schlechte Ideen' : 'Messing, Glas und gute Manieren', () => { const W = getCityW(to); switchWorld(to, W, W.spawn.x, W.spawn.y); }); }

// ---------- Grid / Kollision ----------
function gridAt(gx, gy) { if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) return undefined; return S.grid[gy * MAP + gx]; }
function bldAt(x, y) { return gridAt(Math.floor(x / TILE), Math.floor(y / TILE)); }
const PLAYER_PASS = { gate: 1, hq: 1, farm: 1, fire: 1, garage: 1, helipad: 1, belt: 1, pcable: 1 }, ZOMBIE_PASS = { farm: 1, fire: 1, helipad: 1, belt: 1, pcable: 1 };
function blockedFor(x, y, who) {
  const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
  if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) return { edge: true };
  const tt = S.W.tiles[gy * MAP + gx]; if (tt === 9 || tt === 11) return { edge: true };
  const b = S.grid[gy * MAP + gx];
  if (b) { if (who === 'player' && PLAYER_PASS[b.type]) return null; if (who === 'car' && (b.type === 'gate' || b.type === 'garage' || b.type === 'farm' || b.type === 'helipad')) return null; if (who === 'zombie' && ZOMBIE_PASS[b.type]) return null; return b; }
  return null;
}
function staticHit(x, y, r) {
  let hit = null;
  staticNear(S.W, x, y, o => {
    if (o.btype === 'tree') { if (o.hp > 0 && !o.deco && Math.hypot(o.x - x, o.y - y) < r + 7 * o.sc) { hit = o; return true; } }
    else if (o.btype === 'node') { if (o.hp > 0 && Math.hypot(o.x - x, o.y - y) < r + 14 * o.sc) { hit = o; return true; } }
    else if (o.btype === 'prop') { if (o.solid && o.hw && Math.abs(o.x - x) < o.hw + r && Math.abs(o.y - y) < o.hd + r) { hit = o; return true; } }
  });
  if (!hit && S.W.heli && !S.p.inHeli && S.W.heli.z < 5 && Math.hypot(S.W.heli.x - x, S.W.heli.y - y) < 26 + r) hit = { btype: 'heli' };
  const sh = S.ship; if (!hit && sh && sh.world === S.where && !S.p.inShip && sh.z < 5 && S.where !== 'space' && Math.hypot(sh.x - x, sh.y - y) < 28 + r) hit = { btype: 'ship' };
  return hit;
}
function moveEnt(e, dx, dy, r, who) {
  let res = null; const nx = e.x + dx;
  const b1 = blockedFor(nx + Math.sign(dx) * r, e.y, who) || staticHit(nx, e.y, r); if (!b1) e.x = nx; else res = b1;
  const ny = e.y + dy; const b2 = blockedFor(e.x, ny + Math.sign(dy) * r, who) || staticHit(e.x, ny, r); if (!b2) e.y = ny; else res = res || b2;
  e.x = clamp(e.x, 10, WORLD - 10); e.y = clamp(e.y, 10, WORLD - 10); return res;
}

// ---------- Licht ----------
let LIGHTS = [];
function ambientDark() {
  const W = S.W;
  if (W.ambient === 'under') return 0.76; if (W.ambient === 'station') return 0.55; if (W.ambient === 'space') return 0;
  let d = (1 - S.dayness) * 0.72;
  if (W.biome) d = Math.max(d, BIOMES[W.biome].dark);
  if (W.mask && W.kind === 'main' && S.p) { const m = W.mask[Math.floor(S.p.y / TILE) * W.size + Math.floor(S.p.x / TILE)]; if (m === 2) d = Math.max(d, 0.42); } if (W.kind === 'planet') d = Math.max(d, W.planet.dark);
  return d;
}
function collectLights() {
  LIGHTS = []; const t = performance.now() / 1000;
  for (const b of S.buildings) { const d = BUILD[b.type]; if (!d.light) continue; if (d.power < 0 && !b.powered) continue; let r = d.light * (1 + 0.25 * (b.level - 1)); if (b.type === 'hq') r = d.light + 45 * (b.level - 1); LIGHTS.push({ x: b.x, y: b.y, r, col: b.type === 'fire' ? '255,150,60' : b.type === 'beacon' ? '210,150,255' : '255,235,160', flick: b.type === 'fire', safe: true, b }); }
  const night = S.dayness < 0.5;
  for (const L of S.W.lightsStatic) { if (L.night && !night) continue; if (L.node && L.node.hp <= 0) continue; if (L.blink && Math.floor(t * 1.5) % 2) continue; LIGHTS.push(L); }
  for (const c of S.W.cars) { if (c.wreck || !c.lightsOn) continue; const big = c.up.lights ? 1 : 0; LIGHTS.push({ x: c.x + Math.cos(c.a) * (110 + big * 90), y: c.y + Math.sin(c.a) * (110 + big * 90), r: 120 + big * 120, col: '255,250,220', safe: true }); }
  const h = S.W.heli; if (h && !h.wreck && h.up.light && S.p.inHeli === h) LIGHTS.push({ x: h.x, y: h.y, r: 240, col: '230,245,255', safe: true });
  const sh = S.ship; if (sh && sh.world === S.where) LIGHTS.push({ x: sh.x + Math.cos(sh.a) * 60, y: sh.y + Math.sin(sh.a) * 60, r: 170, col: '200,240,255', safe: !!S.p.inShip });
  if (S.p && S.phase === 'play' && !S.p.inCar && !S.p.inHeli && !S.p.inShip) LIGHTS.push({ x: S.p.x, y: S.p.y, r: 95, col: '255,240,200', safe: false });
  for (const pt of S.particles) if (pt.light) LIGHTS.push({ x: pt.x, y: pt.y, r: pt.light * (pt.life / pt.max), col: '255,200,120', safe: false });
}
function isSafe(x, y) { if (S.where === 'main' && S.dayness > 0.35) return true; for (const L of LIGHTS) if (L.safe && Math.hypot(L.x - x, L.y - y) < L.r) return true; return false; }
function lightFactor(x, y) { for (const L of LIGHTS) if (L.safe && Math.hypot(L.x - x, L.y - y) < L.r * 0.8) return 0.75; return 1; }

// ---------- Gebäude ----------
function footprint(type, rot) { const d = BUILD[type]; return rot % 2 ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; }
function placementInfo(wx, wy) {
  const bs = S.build, fp = footprint(bs.sel, bs.rot), gx = Math.floor(wx / TILE - fp.w / 2 + 0.5), gy = Math.floor(wy / TILE - fp.h / 2 + 0.5), cx = (gx + fp.w / 2) * TILE, cy = (gy + fp.h / 2) * TILE;
  let ok = true, why = '';
  const def = BUILD[bs.sel];
  if (S.where === 'main' && def.planet) { ok = false; why = 'Nur auf fremden Planeten baubar'; }
  else if (S.where === 'planet' && !PLANET_ORDER.includes(bs.sel)) { ok = false; why = 'Auf Planeten nicht baubar'; }
  else if (S.where !== 'main' && S.where !== 'planet') { ok = false; why = 'Hier kann nicht gebaut werden'; }
  if (ok && (bs.sel === 'turret' || bs.sel === 'autogun')) {
    const tg = gridAt(Math.floor(wx / TILE), Math.floor(wy / TILE));
    if (tg && tg.type === 'wall') {
      const cost = buildCost(bs.sel), ok2 = !tg.mount && canAfford(cost) && Math.hypot(tg.x - S.p.x, tg.y - S.p.y) < 460;
      return { gx: tg.gx, gy: tg.gy, w: 1, h: 1, cx: tg.x, cy: tg.y, ok: ok2, why: tg.mount ? 'Mauer ist schon bewaffnet' : !canAfford(cost) ? 'Material fehlt: ' + costStr(cost) : 'Zu weit weg', cost, mount: tg };
    }
  }
  for (let j = 0; j < fp.h && ok; j++) for (let i = 0; i < fp.w; i++) { const g = gridAt(gx + i, gy + j); if (g === undefined) { ok = false; why = 'Außerhalb'; break; } if (g) { ok = false; why = 'Belegt'; break; } const tt = S.W.tiles[(gy + j) * MAP + gx + i]; if (tt === 9 || tt === 11) { ok = false; why = tt === 11 ? 'Schlucht!' : 'Gesperrt'; break; } }
  if (ok) {
    const x0 = gx * TILE, y0 = gy * TILE, x1 = x0 + fp.w * TILE, y1 = y0 + fp.h * TILE;
    staticNear(S.W, cx, cy, o => {
      if ((o.btype === 'tree' || o.btype === 'node') && o.hp > 0 && o.x > x0 - 6 && o.x < x1 + 6 && o.y > y0 - 6 && o.y < y1 + 6) { ok = false; why = o.btype === 'tree' ? 'Baum im Weg – erst fällen!' : 'Stein im Weg – abbauen!'; return true; }
      if (o.btype === 'prop' && o.solid && o.hw && Math.abs(o.x - cx) < o.hw + fp.w * TILE / 2 && Math.abs(o.y - cy) < o.hd + fp.h * TILE / 2) { ok = false; why = 'Hindernis im Weg'; return true; }
    });
    for (const c of S.W.cars) if (c.x > x0 - 20 && c.x < x1 + 20 && c.y > y0 - 20 && c.y < y1 + 20) { ok = false; why = 'Fahrzeug im Weg'; }
  }
  if (ok && Math.hypot(cx - S.p.x, cy - S.p.y) > 460) { ok = false; why = 'Zu weit weg'; }
  if (ok && !PLAYER_PASS[bs.sel]) { const px = S.p.x, py = S.p.y; if (px > gx * TILE - 10 && px < (gx + fp.w) * TILE + 10 && py > gy * TILE - 10 && py < (gy + fp.h) * TILE + 10) { ok = false; why = 'Du stehst im Weg'; } }
  if (ok && BUILD[bs.sel].unique && S.buildings.some(b => b.type === bs.sel)) { ok = false; why = 'Nur eins erlaubt'; }
  const cost = buildCost(bs.sel); if (ok && !canAfford(cost)) { ok = false; why = 'Material fehlt: ' + costStr(cost); }
  return { gx, gy, w: fp.w, h: fp.h, cx, cy, ok, why, cost };
}
function updateNeighbors(b) { if (b.type !== 'wall' && b.type !== 'gate') return 0; const isW = o => o && (o.type === 'wall' || o.type === 'gate' || o.type === 'hq'); const nb = { e: isW(gridAt(b.gx + 1, b.gy)), w: isW(gridAt(b.gx - 1, b.gy)), s: isW(gridAt(b.gx, b.gy + 1)), n: isW(gridAt(b.gx, b.gy - 1)) }; b.nb = nb; return (nb.e ? 1 : 0) + (nb.w ? 1 : 0) + (nb.s ? 1 : 0) + (nb.n ? 1 : 0); }
function mountWall(info) {
  const w = info.mount, type = S.build.sel; pay(info.cost); w.mount = type; w.headAng = 0; w.cd = 0; w.max += 160; w.hp = w.max; w.pop = 1; S.stats.built++; S.factoryDirty = true;
  SFX.play('upgrade'); shake(10); S.flash = 0.4; S.flashCol = '255,200,90'; burst(w.x, w.y, 40, '#ffe066', 40, 240, { up: 1.6 }); burst(w.x, w.y, 30, '#ff8a2a', 20, 160);
  for (let i = 0; i < 3; i++) S.rings.push({ x: w.x, y: w.y, r: 5 + i * 12, max: 140, col: '255,200,90', life: 0.8 + i * 0.15 });
  floater(w.x, w.y, '⚔ VERSCHMOLZEN! ' + (type === 'turret' ? 'WEHRTURM' : 'MG-BASTION'), '#ffd84a', true); addXp(40, w.x, w.y); return w;
}
function placeBuilding(info, silentLoad, data) {
  if (info.mount && !data) return mountWall(info);
  const type = data ? data.type : S.build.sel;
  const b = { id: S.nextId++, type, gx: info.gx, gy: info.gy, w: info.w, h: info.h, x: (info.gx + info.w / 2) * TILE, y: (info.gy + info.h / 2) * TILE, level: 1, hp: BUILD[type].hp, max: BUILD[type].hp, t: R(0, 5), powered: true, grow: 0, open: 0, flash: 0, headAng: 0, cd: 0, pop: 1, nb: {} };
  b.rot = data ? (data.rot || 0) : (BUILD[type].rot ? S.build.rot : 0);
  if (data) { b.level = data.level; b.max = Math.round(BUILD[type].hp * Math.pow(1.6, b.level - 1)); if (data.mount) { b.mount = data.mount; b.max += 160; } b.hp = Math.min(b.max, data.hp); b.grow = data.grow || 0; b.pop = 0; }
  S.factoryDirty = true;
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) S.grid[(b.gy + j) * MAP + b.gx + i] = b;
  S.buildings.push(b);
  const x0 = b.gx * TILE, y0 = b.gy * TILE, x1 = x0 + b.w * TILE, y1 = y0 + b.h * TILE, ci = chunkIdx(S.W, b.x, b.y);
  for (const k of [ci, ci + 1, ci - 1, ci + S.W.NC, ci - S.W.NC]) { const co = S.W.chunkObjs[k]; if (co) co.bushes = co.bushes.filter(o => !(o.x > x0 - 8 && o.x < x1 + 8 && o.y > y0 - 8 && o.y < y1 + 8)); }
  S.W.grassCh[ci] = S.W.grassCh[ci].filter(o => !(o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1));
  const c = updateNeighbors(b); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = gridAt(b.gx + dx, b.gy + dy); if (n) updateNeighbors(n); }
  recalcCap(); if (silentLoad) return b;
  pay(info.cost); S.stats.built++; SFX.play('build'); shake(4);
  burst(b.x, b.y, 10, '#c8ff7a', 18, 140); burst(b.x, b.y, 4, '#8b5e34', 10, 90); S.rings.push({ x: b.x, y: b.y, r: 6, max: 40 + b.w * 30, col: '170,255,110', life: 0.6 });
  addXp(type === 'wall' ? 3 : 15);
  if (c > 0 && (type === 'wall' || type === 'gate')) { const bs = S.build; bs.chain = bs.chainT > 0 ? bs.chain + 1 : 1; bs.chainT = 1.6; SFX.tone(520 + Math.min(bs.chain, 14) * 60, 0.08, 'triangle', 0.12, 1.4); burst(b.x, b.y, 30, '#ffe066', 10, 160); floater(b.x, b.y, bs.chain > 1 ? 'VERBUNDEN x' + bs.chain + '!' : 'VERBUNDEN!', bs.chain > 4 ? '#ffd84a' : '#bfff7a', bs.chain > 4); if (bs.chain === 5 || bs.chain === 10 || bs.chain === 20) { addXp(bs.chain * 3, b.x, b.y); SFX.play('streak'); } }
  else floater(b.x, b.y, BUILD[type].n.toUpperCase() + ' ERRICHTET', '#d6ff9a');
  if (type === 'hq') { announce('HQ ERRICHTET', 'Kommando-PC im Inneren (E)', '#7dff5a'); S.flash = 0.4; S.flashCol = '180,255,140'; }
  if (type === 'helipad') announce('LANDESTATION ERRICHTET', 'Heli & Raumschiff landen hier: tanken, reparieren, Expeditionen', '#7ad7ff');
  return b;
}
function maxLevel(type) { return (type === 'wall' || type === 'gate' || type === 'hq') ? 4 : 3; }
function upgradeBuilding(b) {
  if (b.level >= maxLevel(b.type)) { floater(b.x, b.y, 'MAX-STUFE', '#ffd84a'); SFX.play('deny'); return; }
  const cost = upgradeCost(b.type, b.level); if (!canAfford(cost)) { floater(b.x, b.y, 'FEHLT: ' + costStr(cost), '#ff8080'); SFX.play('deny'); return; }
  pay(cost); b.level++; b.max = Math.round(b.max * 1.6); b.hp = b.max; b.pop = 1; SFX.play('upgrade'); shake(9); S.flash = 0.35; S.flashCol = '255,230,120';
  burst(b.x, b.y, 20, '#ffe066', 45, 240, { up: 1.6 }); burst(b.x, b.y, 30, '#ffffff', 20, 160); for (let i = 0; i < 3; i++) S.rings.push({ x: b.x, y: b.y, r: 5 + i * 14, max: 120 + b.w * 40, col: '255,220,90', life: 0.8 + i * 0.15 });
  floater(b.x, b.y, BUILD[b.type].n.toUpperCase() + ' → ' + ((b.type === 'wall' || b.type === 'gate') ? LEVEL_NAMES[b.level].toUpperCase() : 'STUFE ' + b.level) + '!', '#ffd84a', true);
  addXp(20 * b.level, b.x, b.y); jobXp('mech', 0.5); recalcCap();
}
function removeBuilding(b, refund) {
  S.factoryDirty = true;
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) if (S.grid[(b.gy + j) * MAP + b.gx + i] === b) S.grid[(b.gy + j) * MAP + b.gx + i] = null;
  const i = S.buildings.indexOf(b); if (i >= 0) S.buildings.splice(i, 1);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = gridAt(b.gx + dx, b.gy + dy); if (n) updateNeighbors(n); }
  if (refund) { const c = BUILD[b.type].cost; for (const k in c) addRes(k, Math.floor(c[k] * 0.5), b.x, b.y, true); floater(b.x, b.y, 'ABGERISSEN (+50%)', '#ffcf7a'); }
  else if (S.where === 'main' && S.buildings === S.mainB && onScreen(b.x, b.y)) { burst(b.x, b.y, 15, '#8b5e34', 30, 200); floater(b.x, b.y, BUILD[b.type].n.toUpperCase() + ' ZERSTÖRT', '#ff6b6b'); SFX.play('boom'); }
  recalcCap();
}
function recalcCap() { S.cap = 150 + S.mainB.filter(b => b.type === 'storage').reduce((a, b) => a + 150 + (b.level - 1) * 100, 0); }
function hq() { return S.mainB.find(b => b.type === 'hq'); }
function helipad() { return S.mainB.find(b => b.type === 'helipad'); }
function deskPos(h) { return { x: h.x - 36, y: h.y - 20 }; }

// ---------- Waffen ----------
function refreshHotbar() {
  HOTBAR = ['axe', 'rifle', 'shotgun']; for (const g of ['sniper', 'lmg', 'plasma']) if (S.unlocked[g]) HOTBAR.push(g); HOTBAR.push('medkit', 'grenade');
  if (S.p.slot >= HOTBAR.length) S.p.slot = 0; if (typeof UI !== 'undefined') UI.buildHotbar();
}
function weaponStat(kind) {
  const w = WEAPONS[kind], at = S.attach[kind] || {}, st = Object.assign({}, w);
  st.dmg *= 1 + 0.2 * perk('dmg'); if (at.scope) { st.dmg *= 1.3; st.life *= 1.35; } if (at.hollow) st.dmg *= 1.25; if (at.xenocore) st.dmg *= 1.4; if (S.city.buffs.dmg > 0) st.dmg *= 1.25;
  st.rate /= 1 + 0.15 * perk('rate'); if (at.grip) st.spread *= 0.6; if (at.laser) st.spread *= 0.7; if (at.extmag) st.mag = Math.round(st.mag * 1.6); if (at.drum) st.reload *= 0.55;
  return st;
}
function currentTool() { return HOTBAR[S.p.slot]; }
function fireWeapon(kind, tx, ty) {
  const p = S.p, st = weaponStat(kind);
  if (p.fireCd > 0 || p.reload > 0) return;
  if (inCity()) { UI.toast('Waffen sind in Neu-Eden gesichert.'); p.fireCd = 1.5; return; }
  if (p.mag[kind] <= 0) { if (S.res.ammo > 0) startReload(kind); else { SFX.play('empty'); floater(p.x, p.y, 'KEINE MUNITION', '#ff8080'); p.fireCd = 0.4; } return; }
  p.mag[kind]--; p.fireCd = st.rate; p.recoil = 1; if (kind === 'shotgun') p.pump = 1;
  const a = Math.atan2(ty - p.y, tx - p.x); p.a = a;
  const mx = p.x + Math.cos(a) * 30, my = p.y + Math.sin(a) * 30;
  for (let i = 0; i < st.pellets; i++) { const sa = a + R(-st.spread, st.spread) * (p.moving > 0.5 ? 1.4 : 1); S.bullets.push({ x: mx, y: my, z: 24, vx: Math.cos(sa) * st.speed, vy: Math.sin(sa) * st.speed, life: st.life * R(0.9, 1.1), dmg: st.dmg, src: kind, px: mx, py: my, pierce: st.pierce || 0, hitSet: st.pierce ? new Set() : null }); }
  S.particles.push({ x: mx, y: my, z: 24, vx: 0, vy: 0, vz: 0, life: 0.06, max: 0.06, col: kind === 'plasma' ? '#ff9af8' : '#fff3a0', s: kind === 'sniper' ? 14 : 9, flashP: true, light: 140, grav: 0 });
  burst(mx, my, 24, kind === 'plasma' ? '#ff5ef0' : '#ffd56a', 3, 80, { nograv: true });
  if (kind !== 'plasma') S.particles.push({ x: p.x, y: p.y, z: 22, vx: Math.cos(a + 1.6) * 60, vy: Math.sin(a + 1.6) * 60, vz: 90, life: 0.8, max: 0.8, col: '#d4a017', s: 2.5, grav: 500 });
  const sup = (S.attach[kind] || {}).suppressor; SFX.play(sup ? 'rifleS' : st.sfx); shake(kind === 'shotgun' || kind === 'sniper' ? 6 : 1.6);
  for (const z of S.zombies) if (Math.hypot(z.x - p.x, z.y - p.y) < (sup ? 180 : 650)) z.alert = 8;
  if (p.mag[kind] <= 0 && S.res.ammo > 0) setTimeout(() => { if (S && S.p.mag[kind] <= 0) startReload(kind); }, 150);
}
function startReload(kind) { const p = S.p, st = weaponStat(kind); if (p.reload > 0 || p.mag[kind] >= st.mag || S.res.ammo <= 0) return; p.reload = st.reload; p.reloadKind = kind; SFX.play('reload'); }
function finishReload() { const p = S.p, kind = p.reloadKind, st = weaponStat(kind), take = Math.min(st.mag - p.mag[kind], S.res.ammo); p.mag[kind] += take; S.res.ammo -= take; SFX.tone(800, 0.05, 'square', 0.06); }
function damageZombie(z, dmg, src, kx, ky) {
  if (z.dead) return;
  z.hp -= dmg; z.hit = 0.12; if (kx !== undefined) { z.kx += kx; z.ky += ky; }
  floater(z.x + R(-8, 8), z.y, String(Math.round(dmg)), dmg > 40 ? '#ff5e3a' : '#ffe066', dmg > 40);
  burst(z.x, z.y, 22 * z.sc, ZTYPES[z.type].alien ? '#b58cff' : ZTYPES[z.type].drone ? '#ffd27a' : '#8fd14f', 4, 90);
  if (src !== 'turret' && src !== 'drone') { S.hitMark = 0.15; SFX.play('hit'); }
  const at = S.attach[src]; if (at && at.xenocore) S.p.hp = Math.min(S.p.maxHp, S.p.hp + 1);
  if (z.hp <= 0) killZombie(z, src);
}
function killZombie(z, src) {
  z.dead = true; const T = ZTYPES[z.type];
  S.stats.kills++; if (z.type === 'brute') S.stats.brutes++; if (T.alien || T.drone) S.stats.aliens++;
  if (z.type === 'boss') { S.stats.bosses++; announce('WURZELKÖNIG BESIEGT!', 'Legendäre Beute gedroppt', '#ffb020'); S.W.crates.push({ x: z.x, y: z.y, rarity: 3, opening: 0, open: false, hold: 0 }); shake(18); }
  if (src === 'car') S.stats.roadkills++;
  const playerKill = ['axe', 'rifle', 'shotgun', 'sniper', 'lmg', 'plasma', 'car', 'grenade', 'heli', 'ship'].includes(src);
  if (S.stats.wk[src] !== undefined) { S.stats.wk[src]++; checkCamoUnlock(src); }
  addXp(T.xp, z.x, z.y); SFX.play('kill');
  if (T.drone) { explode(z.x, z.y, 60, 0, 'none'); } else { burst(z.x, z.y, 20 * z.sc, T.creature ? (T.acc || T.skin) : T.alien ? '#b58cff' : '#7bbf45', 18, 170); burst(z.x, z.y, 20 * z.sc, T.creature ? T.skin : z.look.shirt, 10, 150, { size: 1.6 }); }
  if (T.spores) { for (let i = 0; i < 14; i++) S.particles.push({ x: z.x + R(-20, 20), y: z.y + R(-20, 20), z: 10, vx: R(-30, 30), vy: R(-30, 30), vz: R(20, 50), life: 1.6, max: 1.6, col: 'rgba(95,214,176,0.55)', s: 10, smoke: true, grav: 0 }); if (Math.hypot(S.p.x - z.x, S.p.y - z.y) < 70 && !S.p.inShip) { hurtPlayer(8); UI.toast('☣ Sporenwolke!'); } }
  if (playerKill) {
    S.killMark = 0.25; if (perk('vamp')) S.p.hp = Math.min(S.p.maxHp, S.p.hp + 3 * perk('vamp'));
    S.streak++; S.streakT = 20; S.multiN = S.multiT > 0 ? S.multiN + 1 : 1; S.multiT = 1.3;
    const mk = ['', '', 'DOPPELKILL', 'TRIPLEKILL', 'MULTIKILL', 'MONSTER-MASSAKER'][Math.min(S.multiN, 5)]; if (mk) { UI.combo(mk + (S.multiN > 5 ? ' x' + S.multiN : '')); addXp(S.multiN * 5); }
    checkStreak(); UI.killfeed((WEAPONS[src] ? WEAPONS[src].n : src === 'ship' ? 'Bordlaser' : src === 'car' ? 'Fahrzeug' : 'Explosion') + ' ▸ ' + T.n, '#fff');
    S.city.guardKills++; if (S.city.guardKills % 15 === 0) jobXp('guard', 1); cityTaskEvent('kill', z.type);
  }
  if (Math.random() < 0.22 + 0.15 * perk('ammo')) S.pickups.push({ x: z.x, y: z.y, kind: 'ammo', amt: RI(8, 18), t: 0 });
  if (Math.random() < 0.12) S.pickups.push({ x: z.x + 8, y: z.y, kind: 'scrap', amt: RI(2, 5), t: 0 });
  if (Math.random() < 0.06) S.pickups.push({ x: z.x, y: z.y + 8, kind: 'food', amt: 1, t: 0 });
  if (Math.random() < 0.05) S.pickups.push({ x: z.x - 8, y: z.y, kind: 'money', amt: RI(5, 25), t: 0 });
  if (z.type === 'brute' && Math.random() < 0.5) S.pickups.push({ x: z.x, y: z.y - 8, kind: 'grenades', amt: 1, t: 0 });
  if (S.where === 'exp' && Math.random() < 0.08) S.pickups.push({ x: z.x, y: z.y, kind: BIOMES[S.W.biome].excl, amt: 1, t: 0 });
  if (S.where === 'planet' && Math.random() < 0.3) S.pickups.push({ x: z.x, y: z.y, kind: S.W.planet.res, amt: z.type === 'xbrute' ? 3 : 1, t: 0 });
  if ((S.where === 'space' || S.where === 'station') && Math.random() < 0.35) S.pickups.push({ x: z.x, y: z.y, kind: Math.random() < 0.6 ? 'titan' : 'elec', amt: RI(1, 2), t: 0 });
}
function checkStreak() {
  const s = S.streak, give = (n, name, fn) => { if (s >= n && !S.streakGot[n]) { S.streakGot[n] = true; SFX.play('streak'); announce(n + 'ER-SERIE: ' + name, 'Abschussserien-Belohnung aktiviert', '#ff5e3a'); fn(); } };
  give(5, 'UAV', () => { S.uav = 35; }); give(10, 'MÖRSERSCHLAG', () => { for (let i = 0; i < 8; i++) S.mortar.push({ t: 1 + i * 0.35 }); });
  give(20, 'KAMPFDROHNE', () => { S.drone = { x: S.p.x, y: S.p.y, z: 70, t: 45, cd: 0, a: 0 }; }); give(35, 'ORBITALLASER', () => { S.mortar.push({ t: 0.8, orbital: true }); });
}
function checkCamoUnlock(src) { const k = S.stats.wk[src]; for (const c of CAMOS) if (c.kills > 0 && k === c.kills) { announce('TARNUNG FREIGESCHALTET', WEAPONS[src].n + ': ' + c.n, c.col); SFX.play('crate'); } }
function explode(x, y, r, dmg, src) {
  SFX.play('boom'); shake(14); S.flash = Math.max(S.flash, 0.25); S.flashCol = '255,180,90';
  burst(x, y, 10, '#ff9b45', 40, 300, { up: 1.5 }); burst(x, y, 10, '#ffe066', 25, 220); burst(x, y, 5, '#3b3b3b', 20, 200, { size: 1.5 }); smoke(x, y, 10, 'rgba(60,60,60,0.55)', 14);
  S.particles.push({ x, y, z: 20, vx: 0, vy: 0, vz: 0, life: 0.5, max: 0.5, col: '#fff', s: 1, light: 320, grav: 0, invisible: true }); S.rings.push({ x, y, r: 10, max: r * 1.3, col: '255,170,80', life: 0.5 });
  if (dmg > 0) for (const z of S.zombies) { const d = Math.hypot(z.x - x, z.y - y); if (d < r) { const k = 1 - d / r; damageZombie(z, dmg * (0.4 + 0.6 * k), src, (z.x - x) / (d || 1) * 300 * k, (z.y - y) / (d || 1) * 300 * k); } }
  if (dmg > 0) staticNear(S.W, x, y, o => { if (o.btype === 'tree' && o.hp > 0 && !o.deco && Math.hypot(o.x - x, o.y - y) < r * 0.6) chopTree(o, 200); });
  if (src === 'grenade' && Math.hypot(S.p.x - x, S.p.y - y) < r * 0.5 && !S.p.inCar && !S.p.inHeli && !S.p.inShip) hurtPlayer(15);
}
function hurtPlayer(d) { const p = S.p; if (p.invuln > 0 || S.phase !== 'play') return; p.hp -= d; p.hurt = 0.4; shake(6); SFX.play('hurt'); if (p.hp <= 0) playerDie(); }
function playerDie() { S.phase = 'dead'; S.p.hp = 0; S.p.inCar = null; S.p.inHeli = null; S.p.inShip = null; S.streak = 0; S.streakGot = {}; burst(S.p.x, S.p.y, 20, '#c0392b', 40, 200); if (S.city.task) failCityTask('Du bist gefallen'); UI.showDeath(); }
function respawn() {
  const p = S.p;
  if (S.exp) { endExpedition(false, 'GEFALLEN'); return; }
  if (S.ship && S.ship.world !== 'main') { const sp = S.mainW.shipPad; Object.assign(S.ship, { world: 'main', x: sp.x, y: sp.y, z: 0, state: 'parked', hp: Math.max(S.ship.hp, 60) }); }
  if (S.where !== 'main') switchWorld('main', S.mainW, 64 * TILE, 64 * TILE);
  const h = hq(); p.x = h ? h.x + 10 : 64 * TILE; p.y = h ? h.y + 10 : 64 * TILE;
  p.hp = p.maxHp; p.hunger = Math.max(p.hunger, 60); p.invuln = 4;
  for (const k of ['wood', 'stone', 'scrap', 'food']) S.res[k] = Math.floor(S.res[k] * 0.75); S.res.money = Math.floor(S.res.money * 0.9);
  S.phase = 'play'; announce('ZURÜCK IM KAMPF', '25% Ressourcen und 10% Credits verloren', '#7dff5a');
}
// ---------- Ressourcen ----------
function chopTree(t, dmg) {
  if (t.hp <= 0 || t.deco) return;
  const g = 1 + 0.5 * perk('gather'), alien = S.where === 'planet'; t.hp -= dmg; t.wob = 1;
  burst(t.x, t.y, 20, '#8b5e34', 6, 110); burst(t.x, t.y, 50, t.cols[1], 6, 140); SFX.play('chop');
  addRes(alien ? 'xeno' : 'wood', alien ? (Math.random() < 0.25 ? 1 : 0) : Math.round(3 * g), t.x, t.y);
  if (t.hp <= 0) { t.regrow = 240; S.stats.trees++; addRes(alien ? S.W.planet.res : 'wood', alien ? 1 : Math.round(10 * g), t.x, t.y - 10); burst(t.x, t.y, 40, t.cols[0], 30, 220, { size: 1.8 }); floater(t.x, t.y, alien ? 'ALIENPFLANZE GEERNTET!' : 'BAUM GEFÄLLT!', '#ffcf7a', true); shake(5); addXp(8, t.x, t.y); S.fallingTrees.push({ x: t.x, y: t.y, parts: t.parts, sc: t.sc, a: Math.atan2(t.y - S.p.y, t.x - S.p.x), t: 0 }); MINI_DIRTY = true; }
}
const NODE_YIELD = { rock: ['stone', 3, 8], scrap: ['scrap', 2, 6], rubble: ['stone', 2, 5], milcrate: ['mil', 1, 3], crystal: ['crystal', 1, 2], cellnode: ['cells', 1, 2], server: ['elec', 1, 3], asteroid: ['stone', 3, 8], titanrock: ['titan', 1, 3], xenonode: ['xeno', 1, 3], plasmanode: ['plasma', 1, 2], voidnode: ['void', 1, 2], relicnode: ['relic', 1, 1] };
function mineNode(n, dmg) {
  if (n.hp <= 0) return;
  const g = 1 + 0.5 * perk('gather'), y = NODE_YIELD[n.kind], rare = RES[y[0]].rare, mm = (S.p.inShip && S.ship.up.mining) ? 2 : 1;
  n.hp -= dmg; n.wob = 1; burst(n.x, n.y, 15, RES[y[0]].col, 8, 140); SFX.play('stone');
  if (!rare || Math.random() < 0.5) addRes(y[0], Math.max(1, Math.round(y[1] * (rare ? 1 : g) * mm)), n.x, n.y);
  if (n.kind === 'rubble' && Math.random() < 0.3) addRes('scrap', 2, n.x, n.y - 6);
  if (n.kind === 'asteroid' && Math.random() < 0.25) addRes('titan', 1, n.x, n.y - 6);
  if (n.hp <= 0) { n.respawn = 200; burst(n.x, n.y, 10, RES[y[0]].col, 25, 200, { size: 1.5 }); floater(n.x, n.y, rare ? RES[y[0]].n.toUpperCase() + '-QUELLE GEPLÜNDERT!' : 'ABGEBAUT!', '#ffe066', true); addXp(rare ? 20 : 6); addRes(y[0], Math.max(1, Math.round(y[2] * (rare ? 1 : g) * mm)), n.x, n.y - 10); MINI_DIRTY = true; if (rare) { SFX.play('crate'); S.rings.push({ x: n.x, y: n.y, r: 5, max: 90, col: hexToRgbStr(RES[y[0]].col), life: 0.7 }); } }
}
function meleeHit() {
  const p = S.p, a = p.a, hx = p.x + Math.cos(a) * 28, hy = p.y + Math.sin(a) * 28;
  let hit = false; const dmg = WEAPONS.axe.dmg * (1 + 0.6 * perk('melee')) * (1 + 0.2 * perk('dmg')) * (S.city.buffs.dmg > 0 ? 1.25 : 1);
  for (const z of S.zombies) { if (z.dead) continue; if (Math.hypot(z.x - hx, z.y - hy) < 30 + 10 * z.sc) { damageZombie(z, dmg, 'axe', Math.cos(a) * 220, Math.sin(a) * 220); hit = true; } }
  if (!hit) { let best = null, bd = 1e9; staticNear(S.W, hx, hy, o => { if (((o.btype === 'tree' && !o.deco) || o.btype === 'node') && o.hp > 0) { const d = Math.hypot(o.x - hx, o.y - hy); if (d < 52 && d < bd) { bd = d; best = o; } } }); if (best) { if (best.btype === 'tree') chopTree(best, 25); else mineNode(best, 25); shake(2.5); hit = true; } }
  if (!hit) { const b = bldAt(hx, hy); if (b && b.hp < b.max) { b.hp = Math.min(b.max, b.hp + 25); floater(b.x, b.y, 'REPARIERT +25', '#7dff5a'); SFX.tone(700, 0.06, 'square', 0.08); hit = true; } }
  if (!hit) SFX.noise(0.05, 0.08, 4000);
}
// ---------- Hochhäuser ----------
function towerDoor(T) { return { x: T.x, y: T.y + T.fh * TILE / 2 + 14 }; }
function lootTower(T) {
  const m = perk('loot') ? 2 : 1, f = T.looted + 1; S.stats.floors++; T.looted++; SFX.play('crate'); shake(3);
  const d = towerDoor(T), loot = [['scrap', RI(5, 12)]];
  if (Math.random() < 0.38) loot.push(['elec', RI(1, 3)]); if (Math.random() < 0.4) loot.push(['ammo', RI(10, 25)]); if (Math.random() < 0.13) loot.push(['meds', 1]);
  if (Math.random() < 0.3) loot.push(['fuel', RI(10, 25)]); if (Math.random() < 0.25) loot.push(['food', RI(1, 3)]); if (Math.random() < 0.35) loot.push(['money', RI(15, 70)]); if (Math.random() < 0.08) loot.push(['mil', 1]);
  if (S.res.frags < 3 && !S.edenFound && Math.random() < 0.16) loot.push(['frags', 1]);
  loot.forEach(([k, v], i) => setTimeout(() => { if (S) addRes(k, k === 'frags' ? 1 : Math.round(v * m), d.x, d.y - i * 5); }, 120 + i * 140));
  floater(d.x, d.y - 20, 'ETAGE ' + f + '/' + T.floors + ' DURCHSUCHT', '#ffb020', true); addXp(15 + f * 2, d.x, d.y);
  if (T.looted >= T.floors) { announce('DACH ERREICHT!', T.name + ' komplett geplündert · Legendäre Kiste', '#ffb020'); S.W.crates.push({ x: d.x + 30, y: d.y + 20, rarity: 3, opening: 0, open: false, hold: 0 }); T.restock = S.day + 3; }
  const n = 2 + Math.floor(f / 4) + (S.dayness < 0.35 ? 2 : 0);
  for (let i = 0; i < n; i++) for (let k = 0; k < 10; k++) { const a = R(0, 6.28), r = R(350, 560), x = S.p.x + Math.cos(a) * r, y = S.p.y + Math.sin(a) * r; if (!staticHit(x, y, 12) && !blockedFor(x, y, 'zombie')) { spawnZombie(Math.random() < 0.35 ? 'runner' : 'walker', x, y); S.zombies[S.zombies.length - 1].alert = 15; break; } }
  UI.toast('🔊 Der Lärm lockt ' + n + ' Monster an!'); checkMission();
}
function onFragment() {
  floater(S.p.x, S.p.y - 30, 'FUNKFRAGMENT ' + S.res.frags + '/3', '#ff9a3c', true);
  if (S.res.frags >= 3 && !S.edenHint && !S.edenFound) revealEdenHint(650);
}
function revealEdenHint(r) { const e = S.mainW.eden; S.edenHint = { x: e.x - 300 + R(-r / 3, r / 3), y: e.y + R(-r / 3, r / 3), r }; announce('FUNKSIGNAL TRIANGULIERT', 'Ein Suchgebiet ist auf der Minimap markiert', '#ff9a3c'); SFX.play('streak'); MINI_DIRTY = true; }
function discoverEden() { if (S.edenFound) return; S.edenFound = true; MINI_DIRTY = true; S.edenHint = null; announce('ENTDECKT: NEU-EDEN', 'Eine Festungsstadt hinter goldenen Mauern! (+250 XP)', '#ffd84a'); SFX.play('crate'); S.flash = 0.5; S.flashCol = '255,216,74'; addXp(250); }

// ---------- Interaktion ----------
function neighborProps(W, x, y) { const out = [], cx = Math.floor(x / TILE / CH), cy = Math.floor(y / TILE / CH); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = cx + i, Y = cy + j; if (X < 0 || Y < 0 || X >= W.NC || Y >= W.NC) continue; out.push(...W.chunkObjs[Y * W.NC + X].props); } return out; }
function findInteract() {
  const p = S.p, W = S.W, sh = S.ship;
  if (p.inCar) return { kind: 'exit', text: 'E · Aussteigen' };
  if (p.inHeli) return p.inHeli.z < 3 ? { kind: 'exitHeli', text: 'E · Aussteigen' } : { kind: 'land', text: 'E / LEERTASTE · Landen' };
  if (p.inShip) {
    if (S.where === 'space') { if (W.station && Math.hypot(W.station.x - p.x, W.station.y - p.y) < 280) return { kind: 'dock', text: 'E · AN STATION ANDOCKEN' }; return null; }
    return sh.z < 3 ? { kind: 'exitShip', text: 'E · Aussteigen' } : null;
  }
  if (inCity()) { for (const n of W.npcs) if (n.station && Math.hypot(n.x - p.x, n.y - p.y) < 58) return { kind: 'station', npc: n, text: 'E · ' + n.name }; return null; }
  if (sh && sh.world === S.where && Math.hypot(sh.x - p.x, sh.y - p.y) < 80) return S.where === 'station' ? { kind: 'undock', text: 'E · Einsteigen & ABDOCKEN' } : { kind: 'enterShip', text: 'E · Ins Raumschiff steigen' };
  if (S.where === 'station') {
    if (W.holo && Math.hypot(W.holo.x - p.x, W.holo.y - p.y) < 85) return { kind: 'holo', text: 'E · KONTROLLZENTRUM (Hologramm)' };
    if (W.core && !S.station.owned && Math.hypot(W.core.x - p.x, W.core.y - p.y) < 85) return { kind: 'core', text: 'E halten · STATIONSKERN HACKEN (Übernahme)', hold: 3.5, can: true, obj: W.core };
    for (const n of W.npcs) if (n.crew && Math.hypot(n.x - p.x, n.y - p.y) < 50) return { kind: 'crewtalk', npc: n, text: n.name + ' (' + CREW_ROLES[n.crew].n + ')' };
  }
  if (S.where === 'exp') { const h = W.exHeli; if (Math.hypot(h.x - p.x, h.y - p.y) < 80) return { kind: 'extract', text: 'E halten · EXTRAHIEREN (Beute sichern)', hold: 1.8, can: true, obj: h }; }
  if (S.where === 'main') {
    const h = hq(); if (h) { const d = deskPos(h); if (Math.hypot(p.x - d.x, p.y - d.y) < 46) return { kind: 'desk', text: 'E · KOMMANDO-PC benutzen' }; if (Math.hypot(p.x - (h.x + 40), p.y - (h.y + 6)) < 40) return { kind: 'wardrobe', text: 'E · GARDEROBE (Charakter bearbeiten)' }; }
    const he = W.heli;
    if (he && Math.hypot(he.x - p.x, he.y - p.y) < 75) {
      const cost = { scrap: 40, elec: 10, fuel: 20 };
      if (he.wreck) return { kind: 'repairHeli', obj: he, text: canAfford(cost) ? 'E halten · Helikopter reparieren (' + costStr(cost) + ')' : 'Heli-Wrack: braucht ' + costStr(cost), hold: 4, can: canAfford(cost) };
      if (he.fuel < 40 && S.res.fuel > 0) return { kind: 'refuelHeli', obj: he, text: 'E · Heli betanken (' + Math.round(he.fuel) + '%)' };
      return { kind: 'enterHeli', obj: he, text: 'E · Heli: Einsteigen & abheben' + (he.fuel <= 0 ? ' (kein Sprit!)' : '') };
    }
    if (W.eden && Math.hypot(W.eden.x - p.x, W.eden.y - p.y) < 100) return { kind: 'eden', text: 'E · Durch das Tor nach NEU-EDEN' };
    const hut = W.radioHut; if (hut && Math.hypot(hut.x + 45 - p.x, hut.y - 14 - p.y) < 70) { const c = { scrap: 30, elec: 6 }; if (!S.radioFixed) return { kind: 'radioFix', obj: hut, text: canAfford(c) ? 'E halten · Funkanlage reparieren (' + costStr(c) + ')' : 'Funkanlage defekt: braucht ' + costStr(c), hold: 3, can: canAfford(c) }; return { kind: 'radio', text: 'E · Funkgerät benutzen' }; }
    const t = S.city.task;
    for (const o of W.outposts) if (Math.hypot(o.x - p.x, o.y - p.y) < 60 && t && t.type === 'deliver' && t.target === W.outposts.indexOf(o)) return { kind: 'deliver', text: 'E · Paket abliefern 📦' };
    if (t && t.type === 'rescue' && !S.follower && Math.hypot(t.x - p.x, t.y - p.y) < 60) return { kind: 'rescue', text: 'E · Überlebende/n mitnehmen' };
    for (const pr of neighborProps(W, p.x, p.y)) { if (pr.kind !== 'tower') continue; const T = pr.tower, d = towerDoor(T); if (Math.hypot(d.x - p.x, d.y - p.y) < 50) { if (T.looted >= T.floors) return { kind: 'none', text: T.name + ': geplündert (füllt sich in ' + Math.max(1, T.restock - S.day) + ' Tag(en))' }; return { kind: 'tower', tower: T, text: 'E halten · ' + T.name + ' durchsuchen (Etage ' + (T.looted + 1) + '/' + T.floors + ')', hold: 2.4, can: true, obj: T }; } }
  }
  for (const c of W.cars) { if (Math.hypot(c.x - p.x, c.y - p.y) > 62) continue; if (c.wreck) return { kind: 'repair', car: c, obj: c, text: canAfford({ scrap: 20, wood: 10 }) ? 'E halten · Wrack reparieren (20 Schrott · 10 Holz)' : 'Wrack: braucht 20 Schrott · 10 Holz', hold: 2.4, can: canAfford({ scrap: 20, wood: 10 }) }; if (c.fuel < 30 && S.res.fuel > 0) return { kind: 'refuel', car: c, text: 'E · Tanken (' + Math.round(c.fuel) + '% Sprit)' }; return { kind: 'enter', car: c, text: 'E · Einsteigen' + (c.fuel <= 0 ? ' (kein Sprit!)' : '') }; }
  for (const c of W.crates) { if (c.open || (c.air && c.z > 0)) continue; if (Math.hypot(c.x - p.x, c.y - p.y) < 46) return { kind: 'crate', crate: c, obj: c, text: 'E halten · ' + RARITY[c.rarity].n + ' Kiste öffnen', hold: c.air ? 1.4 : 0.8, can: true }; }
  for (const b of S.buildings) if (b.type === 'farm' && b.grow >= 1 && p.x > b.gx * TILE - 20 && p.x < (b.gx + b.w) * TILE + 20 && p.y > b.gy * TILE - 20 && p.y < (b.gy + b.h) * TILE + 20) return { kind: 'harvest', b, text: 'E · Ernten' };
  for (const bu of W.chunkObjs[chunkIdx(W, p.x, p.y)].bushes) if (bu.berries > 0 && Math.hypot(bu.x - p.x, bu.y - p.y) < 40) return { kind: 'berry', bush: bu, text: 'E · Beeren pflücken' };
  return null;
}
function doInteract(it) {
  const p = S.p;
  switch (it.kind) {
    case 'exit': { const c = p.inCar; p.inCar = null; c.lightsOn = false; const sx = c.x + Math.cos(c.a + Math.PI / 2) * 36, sy = c.y + Math.sin(c.a + Math.PI / 2) * 36, bad = blockedFor(sx, sy, 'player') || staticHit(sx, sy, 8); p.x = bad ? c.x - Math.cos(c.a + Math.PI / 2) * 36 : sx; p.y = bad ? c.y - Math.sin(c.a + Math.PI / 2) * 36 : sy; break; }
    case 'exitHeli': { const h = p.inHeli; p.inHeli = null; p.x = h.x + 40; p.y = h.y + 30; h.state = 'parked'; break; }
    case 'land': heliLand(); break;
    case 'desk': UI.openTerminal(); break;
    case 'wardrobe': UI.openEditor('hq'); break;
    case 'enter': p.inCar = it.car; S.lastCar = it.car; SFX.play('car'); break;
    case 'enterHeli': { const h = it.obj; if (h.fuel <= 0) { UI.toast('Kein Sprit im Heli!'); return; } p.inHeli = h; h.state = 'flying'; SFX.play('car'); announce('ABHEBEN!', 'WASD fliegen · SHIFT Turbo · E/LEERTASTE landen', '#7ad7ff'); break; }
    case 'refuelHeli': { const h = it.obj, take = Math.min(100 - h.fuel, S.res.fuel); h.fuel += take; S.res.fuel -= take; floater(h.x, h.y, '+' + Math.round(take) + '% SPRIT', '#7ad7ff'); SFX.play('pickup'); break; }
    case 'refuel': { const c = it.car, take = Math.min(100 - c.fuel, S.res.fuel); c.fuel += take; S.res.fuel -= take; floater(c.x, c.y, '+' + Math.round(take) + '% SPRIT', '#7ad7ff'); SFX.play('pickup'); break; }
    case 'harvest': { const b = it.b; b.grow = 0; addRes('food', 4 + 3 * b.level, b.x, b.y); burst(b.x, b.y, 10, '#e2c044', 25, 160); SFX.play('pickup'); addXp(10, b.x, b.y); break; }
    case 'berry': it.bush.berries--; it.bush.regrow = 120; it.bush.parts = bushParts(it.bush); addRes('food', 1, it.bush.x, it.bush.y); SFX.play('pickup'); break;
    case 'eden': enterCity(); break;
    case 'deliver': completeDelivery(); break;
    case 'rescue': startFollower(); break;
    case 'station': UI.openStation(it.npc); break;
    case 'radio': CityUI.open('radio'); break;
    case 'enterShip': boardShip(); break;
    case 'exitShip': exitShip(); break;
    case 'dock': dockStation(); break;
    case 'undock': undockStation(); break;
    case 'holo': HoloUI.open(); break;
    case 'crewtalk': UI.toast('💬 ' + it.npc.name + ': „' + pick(['Bereit, Käpt\'n.', 'Die Sterne warten.', 'Hab den Warpkern poliert.', 'Wohin geht\'s als Nächstes?', 'Ich hab ein gutes Gefühl bei Aurum.', 'Sauerstoff: 98%. Moral: 100%.']) + '“'); break;
  }
}
function finishHold(it) {
  if (it.kind === 'repair') {
    if (!canAfford({ scrap: 20, wood: 10 })) return; pay({ scrap: 20, wood: 10 });
    const c = it.car; c.wreck = false; c.hp = c.maxHp; c.fuel = Math.max(c.fuel, 45); SFX.play('upgrade'); shake(8); S.flash = 0.3; S.flashCol = '120,220,255';
    burst(c.x, c.y, 20, c.color, 40, 220, { up: 1.4 }); S.rings.push({ x: c.x, y: c.y, r: 10, max: 160, col: '120,220,255', life: 0.8 }); announce('FAHRZEUG REPARIERT!', 'E zum Einsteigen', '#7ad7ff'); addXp(60, c.x, c.y); jobXp('mech', 2); S.stats.repairs++;
  } else if (it.kind === 'repairHeli') {
    const cost = { scrap: 40, elec: 10, fuel: 20 }; if (!canAfford(cost)) return; pay(cost);
    const h = it.obj; h.wreck = false; h.hp = h.maxHp; h.fuel = 60; SFX.play('upgrade'); shake(12); S.flash = 0.5; S.flashCol = '120,220,255';
    burst(h.x, h.y, 30, '#5c6b45', 50, 260, { up: 1.6 }); for (let i = 0; i < 3; i++) S.rings.push({ x: h.x, y: h.y, r: 10 + i * 20, max: 240, col: '120,220,255', life: 0.9 + i * 0.15 });
    announce('HELIKOPTER REPARIERT!', 'E zum Einsteigen · Baue eine Landestation an deiner Basis', '#7ad7ff'); addXp(150, h.x, h.y); jobXp('mech', 3); S.stats.repairs++;
  } else if (it.kind === 'radioFix') {
    const c = { scrap: 30, elec: 6 }; if (!canAfford(c)) return; pay(c); S.radioFixed = true; it.obj.fixed = true; it.obj.skey = null;
    SFX.play('upgrade'); S.flash = 0.4; S.flashCol = '255,154,60'; burst(it.obj.x, it.obj.y, 60, '#ff9a3c', 40, 200, { up: 1.5 });
    announce('FUNKANLAGE ONLINE', 'Täglicher Versorgungsabwurf · Funkpeilung möglich', '#ff9a3c'); addXp(120); if (!S.edenFound && !S.edenHint) setTimeout(() => S && revealEdenHint(420), 1500);
  } else if (it.kind === 'core') { takeoverStation(); }
  else if (it.kind === 'crate') openCrate(it.crate);
  else if (it.kind === 'tower') lootTower(it.tower);
  else if (it.kind === 'extract') endExpedition(true);
}
function openCrate(c) {
  c.open = true; c.opening = 0.001; S.stats.crates++;
  const rr = RARITY[c.rarity], m = rr.mult * (perk('loot') ? 2 : 1) * (c.space && S.ship && S.ship.up.cargo ? 1.5 : 1);
  SFX.play('crate'); shake(3 + c.rarity * 3); S.rings.push({ x: c.x, y: c.y, r: 5, max: 80 + c.rarity * 50, col: hexToRgbStr(rr.col), life: 0.9 }); burst(c.x, c.y, 20, rr.col, 20 + c.rarity * 15, 200, { up: 1.5 });
  if (c.rarity >= 2) announce(rr.n + 'E KISTE!', 'Großartige Beute', rr.col);
  let loot;
  if (c.space || S.where === 'space' || S.where === 'station') loot = [['titan', RI(1, 3)], ['elec', RI(1, 3)], ['scrap', RI(4, 10)], ['money', RI(60, 180)]].concat(c.rarity >= 2 ? [['plasma', 1], ['void', Math.random() < 0.5 ? 1 : 0]] : []);
  else { loot = [['ammo', RI(15, 35)], ['scrap', RI(4, 10)], ['wood', RI(5, 15)], ['stone', RI(4, 12)]]; if (Math.random() < 0.35 + c.rarity * 0.15) loot.push(['meds', 1]); if (Math.random() < 0.25 + c.rarity * 0.2) loot.push(['grenades', RI(1, 2)]); if (Math.random() < 0.35 + c.rarity * 0.15) loot.push(['fuel', RI(20, 40)]); if (Math.random() < 0.4) loot.push(['food', RI(2, 4)]); if (Math.random() < 0.3 + c.rarity * 0.15) loot.push(['money', RI(20, 60)]); if (c.rarity >= 2 && Math.random() < 0.4) loot.push(['elec', RI(1, 2)]); }
  if (S.where === 'exp') loot.push([BIOMES[S.W.biome].excl, RI(1, 2 + c.rarity)]);
  if (S.where === 'planet') loot.push([S.W.planet.res, RI(1, 1 + c.rarity)]);
  loot.forEach(([k, v], i) => setTimeout(() => { if (S && v > 0) { addRes(k, Math.round(v * (RES[k].rare ? 1 : m)), c.x, c.y - i * 4); SFX.tone(700 + i * 120, 0.06, 'triangle', 0.08); } }, 150 + i * 130));
  addXp(Math.round(18 * rr.mult), c.x, c.y);
}
// ---------- Missionen (PC) ----------
function genOffers() { const tier = Math.min(2, S.missions.tier); S.missions.offers = MISSION_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 3).map(m => ({ id: m.id, goal: m.goal[tier], reward: Object.fromEntries(Object.entries(m.reward).map(([k, v]) => [k, Math.round(v * (1 + tier * 0.6))])) })); }
function startMission(o) { const m = MISSION_POOL.find(x => x.id === o.id); S.missions.active = o; S.missions.base = S.stats[m.stat]; announce('MISSION: ' + m.n.toUpperCase(), m.d(o.goal), '#7ad7ff'); SFX.play('click'); }
function missionProgress() { const a = S.missions.active; if (!a) return null; const m = MISSION_POOL.find(x => x.id === a.id); return { m, a, v: Math.min(a.goal, S.stats[m.stat] - S.missions.base) }; }
function checkMission() { const mp = missionProgress(); if (!mp || mp.v < mp.a.goal) return; for (const k in mp.a.reward) addRes(k, mp.a.reward[k], S.p.x, S.p.y); addXp(120 + S.missions.tier * 60); announce('MISSION ERFÜLLT!', mp.m.n + ' · Belohnung erhalten', '#7dff5a'); SFX.play('crate'); S.flash = 0.3; S.flashCol = '120,255,140'; S.missions.active = null; S.missions.tier++; genOffers(); }
// ---------- Monster ----------
function spawnZombie(type, x, y) {
  const T = ZTYPES[type], seed = RI(0, 999);
  const hpMul = (1 + Math.max(0, S.night - 1) * 0.12) * ((S.where === 'exp' || S.where === 'planet') ? 1 + (S.W.danger || 1) * 0.25 : 1);
  const shirt = S.W.biome ? BIOMES[S.W.biome].shirt : null, alienSkin = S.W.planet && S.where === 'planet' ? S.W.planet.zskin : null;
  S.zombies.push({ type, x, y, a: 0, hp: T.hp * hpMul, max: T.hp * hpMul, sp: T.sp * R(0.9, 1.1), sc: T.sc, walk: R(0, 6), hit: 0, atk: 0, kx: 0, ky: 0, alert: 0, look: zombieLook(type, seed, shirt, alienSkin), burn: 0, stomp: 3, rise: T.drone ? 0 : 1, t: R(0, 9), groan: R(2, 8) });
  if (!T.drone) burst(x, y, 2, '#3b2a1a', 12, 80);
}
function pickZType() {
  if (S.where === 'space') return 'xdrone';
  if (S.where === 'planet') { const f = PLANET_FAUNA[S.W.planet.id]; return Math.random() < 0.12 + (S.W.danger || 1) * 0.04 ? f[2] : f[Math.floor(Math.random() * 2)]; }
  if (S.where === 'station') return Math.random() < 0.15 + (S.W.danger || 1) * 0.05 ? 'xbrute' : 'xeno';
  if (S.where === 'exp') { const m = BIOMES[S.W.biome].zMix, r = Math.random(); return r < m.walker ? 'walker' : r < m.walker + m.runner ? 'runner' : 'brute'; }
  const r = Math.random(), n = S.night; if (S.bloodMoon && r < 0.35) return 'runner'; if (n >= 2 && r < 0.18 + n * 0.03) return 'runner'; if (n >= 3 && r > 0.93 - n * 0.01) return 'brute'; return 'walker';
}
function trySpawn(minD, maxD, inZone) {
  const p = S.p;
  for (let tries = 0; tries < 25; tries++) {
    const a = R(0, Math.PI * 2), d = R(minD || 520, maxD || 900), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (x < 40 || y < 40 || x > WORLD - 40 || y > WORLD - 40) continue;
    if (inZone && !(x > inZone.x0 && x < inZone.x1 && y > inZone.y0 && y < inZone.y1)) continue;
    if (blockedFor(x, y, 'zombie') || staticHit(x, y, 14)) continue;
    if (!inZone && isSafe(x, y)) continue; if (inZone && LIGHTS.some(L => L.safe && Math.hypot(L.x - x, L.y - y) < L.r)) continue;
    spawnZombie(pickZType(), x, y); return true;
  }
  return false;
}
function zoneAt(x, y) { for (const z of S.W.zones) if (x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1) return z; return null; }
function absentRaid() {
  withMain(() => {
    const blds = S.mainB; if (!blds.length) return;
    const turrets = blds.filter(b => b.type === 'turret' || b.type === 'autogun' || b.mount).reduce((a, b) => a + b.level + (b.mount ? 1 : 0), 0), walls = blds.filter(b => b.type === 'wall' || b.type === 'gate').reduce((a, b) => a + b.level, 0), lights = blds.filter(b => BUILD[b.type].light).length;
    let attack = 12 + S.night * 9; if (S.bloodMoon) attack *= 2;
    const defense = turrets * 7 + walls * 0.6 + lights * 2; let dmgPts = Math.max(0, attack - defense) * 25; if (S.city.mayor) dmgPts *= 0.5;
    const lost = [], targets = blds.filter(b => b.type !== 'hq'); let guard = 0;
    while (dmgPts > 0 && targets.length && guard++ < 60) { const b = pick(targets), d = Math.min(dmgPts, R(60, 160)); dmgPts -= d; b.hp -= d; if (b.hp <= 0) { lost.push(BUILD[b.type].n); targets.splice(targets.indexOf(b), 1); removeBuilding(b, false); } }
    UI.raidReport(attack, defense, lost);
  });
}
