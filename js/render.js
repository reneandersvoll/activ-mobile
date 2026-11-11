'use strict';
// ===================== RENDER (Isometrie) =====================
let BOXES = [], LIGHT_CV = null, LIGHT_G = null;
function addModel(parts, x, y, z0, ang, sc, alpha, bias) {
  sc = sc || 1; alpha = alpha === undefined ? 1 : alpha; bias = bias || 0;
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], w = p[3] * sc, d = p[4] * sc, h = p[5] * sc, z = z0 + p[2] * sc, pa = ang + (p[7] || 0);
    const cx = x + (p[0] * c - p[1] * s) * sc, cy = y + (p[0] * s + p[1] * c) * sc, flat = h <= 4.5 && p[2] * sc <= 4 && z0 <= 4, L = Math.max(w, d);
    if (!flat && L > 54 && h > 5) { const n = Math.ceil(L / 44), alongW = w >= d, ca = Math.cos(pa), sa = Math.sin(pa); for (let k = 0; k < n; k++) { const off = (k + 0.5) / n * L - L / 2, px = cx + (alongW ? off * ca : -off * sa), py = cy + (alongW ? off * sa : off * ca); BOXES.push({ k: px + py + z * 0.5 + bias, x: px, y: py, z, w: alongW ? w / n + 0.5 : w, d: alongW ? d : d / n + 0.5, h, a: pa, c: p[6], al: alpha }); } continue; }
    BOXES.push({ k: flat ? -1e6 + cx + cy + z : cx + cy + z * 0.5 + (p[8] || 0) + bias, x: cx, y: cy, z, w, d, h, a: pa, c: p[6], al: alpha });
  }
}
function flushBoxes() { BOXES.sort((a, b) => a.k - b.k); let al = 1; for (const b of BOXES) { if (b.al !== al) { al = b.al; G.globalAlpha = al; } if (b.spr) drawSpriteItem(b); else obox(b.x, b.y, b.z, b.w, b.d, b.h, b.a, b.c); } G.globalAlpha = 1; BOXES = []; }
const SPR_CACHE = new Map();
function makeSprite(parts, ang) {
  ang = ang || 0; const c = Math.cos(ang), s = Math.sin(ang); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of parts) { const cx = p[0] * c - p[1] * s, cy = p[0] * s + p[1] * c, r = Math.max(p[3], p[4]) * 0.72 + 1; for (const [dx, dy] of [[-r, -r], [r, -r], [r, r], [-r, r]]) for (const z of [p[2], p[2] + p[5]]) { const X = (cx + dx - cy - dy) * IX, Y = (cx + dx + cy + dy) * IY - z * IZ; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } }
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(x1 - x0 + 6)); cv.height = Math.max(1, Math.ceil(y1 - y0 + 6));
  const g = cv.getContext('2d'), sG = G, sV = Object.assign({}, VIEW), sB = BOXES;
  G = g; BOXES = []; Object.assign(VIEW, { cx: 0, cy: 0, ox: -x0 + 3, oy: -y0 + 3, zoom: 1 }); g.strokeStyle = 'rgba(14,26,16,0.6)'; g.lineWidth = 1;
  addModel(parts, 0, 0, 0, ang, 1); flushBoxes(); G = sG; Object.assign(VIEW, sV); BOXES = sB;
  return { cv, ox: -x0 + 3, oy: -y0 + 3 };
}
function getSprite(key, fn, ang) { const k = key + '|' + (OUTLINE ? 1 : 0); let sp = SPR_CACHE.get(k); if (!sp) { sp = makeSprite(fn(), ang); SPR_CACHE.set(k, sp); if (SPR_CACHE.size > 1200) SPR_CACHE.delete(SPR_CACHE.keys().next().value); } return sp; }
function addSprite(sp, x, y, z, sc, alpha, bias) { BOXES.push({ k: x + y + (bias === undefined ? 12 : bias), spr: sp, x, y, z: z || 0, sc: sc || 1, al: alpha === undefined ? 1 : alpha }); }
function drawSpriteItem(b) { const p = P(b.x, b.y, b.z), k = VIEW.zoom * b.sc, sp = b.spr; G.drawImage(sp.cv, p.x - sp.ox * k, p.y - sp.oy * k, sp.cv.width * k, sp.cv.height * k); }
const BUILD_SPRITE = { wall: b => { const n = b.nb || {}; return (n.e ? 1 : 0) + '' + (n.w ? 1 : 0) + (n.s ? 1 : 0) + (n.n ? 1 : 0) + (b.mount || ''); }, farm: b => Math.floor((b.grow || 0) * 5), lamp: b => b.powered === false ? 0 : 1, storage: b => Math.floor((b.fill || 0) * 6), garage: () => 0, turret: () => 0 };
const ANIM_PROPS = { pump: 1, station: 1, clocktower: 1 };
const BIG_PROPS = ['rathaus', 'royal', 'villa', 'shop', 'apartment', 'neoncasino', 'neonbar', 'elevator', 'cityhome', 'blackmarket', 'bunker', 'labbox', 'container', 'pilthouse', 'zaunhouse', 'clocktower', 'glassdome', 'skyloft', 'radiohut', 'radiotower', 'chemvat', 'wreckship', 'cybertower', 'jhouse', 'teahouse', 'gunshop', 'stairsup', 'headframe'];

function renderWorld(dt, opts) {
  opts = opts || {};
  const W = innerWidth, H = innerHeight, t = performance.now() / 1000, Wd = S.W, p = S.p, space = Wd.kind === 'space';
  G.strokeStyle = 'rgba(14,26,16,0.6)'; G.lineWidth = 1; OUTLINE = SETTINGS.outline;
  drawGround(Wd);
  const vis = visibleChunks(Wd, 700);
  const wind = Math.sin(t * 1.3) * 2 + (S.rainAmt > 1 ? Math.sin(t * 5) * 3 : 0);
  if (!QUALITY_LOW && !space) { G.lineWidth = 2 * VIEW.zoom; for (let ci = 0; ci < 4; ci++) { G.strokeStyle = Wd.grassCols[ci]; G.beginPath(); for (const idx of vis) for (const g of Wd.grassCh[idx]) { if (g.c !== ci) continue; const q = P(g.x, g.y, 0); if (q.x < -20 || q.x > W + 20 || q.y < -20 || q.y > H + 30) continue; const sw = Math.sin(t * 2 + g.ph) * 2 + wind, h = g.h * VIEW.zoom; G.moveTo(q.x - 3, q.y); G.lineTo(q.x - 4 + sw, q.y - h); G.moveTo(q.x, q.y); G.lineTo(q.x + sw * 1.2, q.y - h * 1.2); G.moveTo(q.x + 3, q.y); G.lineTo(q.x + 4 + sw, q.y - h * 0.9); } G.stroke(); } }
  G.lineWidth = 1; G.strokeStyle = 'rgba(14,26,16,0.6)';
  if (S.build.on && S.phase === 'play') drawBuildGrid();
  for (const r of S.rings) { const q = P(r.x, r.y, 2); G.strokeStyle = 'rgba(' + r.col + ',' + clamp(r.life, 0, 1) + ')'; G.lineWidth = 4 * VIEW.zoom; G.beginPath(); G.ellipse(q.x, q.y, r.r * IX * 1.414 * VIEW.zoom, r.r * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.stroke(); }
  G.lineWidth = 1; G.strokeStyle = 'rgba(14,26,16,0.6)';
  factoryUnderlay(t);
  const tm = taskMarker(); if (tm) { const q = P(tm.x, tm.y, 0), r = 40 + Math.sin(t * 4) * 6; G.strokeStyle = 'rgba(255,216,74,0.9)'; G.lineWidth = 3; G.beginPath(); G.ellipse(q.x, q.y, r * IX * 1.414 * VIEW.zoom, r * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.stroke(); G.lineWidth = 1; }
  if (!space) {
    G.beginPath();
    const shp = (x, y, r) => { const q = P(x, y, groundZ(x, y)), k = VIEW.zoom; G.moveTo(q.x + r * IX * 1.414 * k, q.y); G.ellipse(q.x, q.y, r * IX * 1.414 * k, r * IY * 1.414 * k, 0, 0, 6.283); };
    for (const idx of vis) for (const tr of Wd.chunkObjs[idx].trees) if (tr.hp > 0) shp(tr.x + 10, tr.y + 10, 26 * tr.sc * (tr.grow > 0 ? tr.grow : 1));
    for (const z of S.zombies) if (onScreen(z.x, z.y)) shp(z.x + (ZTYPES[z.type].drone ? 20 : 0), z.y + (ZTYPES[z.type].drone ? 20 : 0), 11 * z.sc);
    for (const c of Wd.cars) if (onScreen(c.x, c.y)) shp(c.x, c.y, 34);
    for (const n of Wd.npcs) if (onScreen(n.x, n.y)) shp(n.x, n.y, 10);
    if (Wd.heli && onScreen(Wd.heli.x, Wd.heli.y, 300)) shp(Wd.heli.x + Wd.heli.z * 0.3, Wd.heli.y + Wd.heli.z * 0.3, 44 * (1 - Math.min(0.5, Wd.heli.z / 400)));
    const sh = S.ship; if (sh && sh.world === S.where && onScreen(sh.x, sh.y, 400)) shp(sh.x + sh.z * 0.3, sh.y + sh.z * 0.3, 50 * (1 - Math.min(0.6, sh.z / 600)));
    if (S.phase === 'play' && !p.inCar && !p.inHeli && !p.inShip) shp(p.x, p.y, 11);
    G.fillStyle = 'rgba(0,20,0,0.22)'; G.fill();
  }
  const pd = p.x + p.y, psx = p.x - p.y;
  for (const idx of vis) {
    const co = Wd.chunkObjs[idx];
    for (const tr of co.trees) {
      if (!onScreen(tr.x, tr.y, 220)) continue;
      if (tr.hp <= 0) { addSprite(getSprite('stump', () => [[0, 0, 0, 12, 12, 6, '#5b3a22'], [0, 0, 6, 10, 10, 0.5, '#c9a36b']]), tr.x, tr.y, 0, tr.sc, 1, 0); continue; }
      const sc = tr.sc * (tr.grow > 0 && tr.grow < 1 ? 0.3 + tr.grow * 0.7 : 1), wob = tr.wob > 0 ? Math.sin(t * 40) * tr.wob * 3 : 0;
      const behind = S.phase === 'play' && tr.x + tr.y > pd && tr.x + tr.y - pd < 120 && Math.abs((tr.x - tr.y) - psx) < 55 * sc;
      if (!tr.skey) tr.skey = 'tree|' + tr.kind + '|' + tr.cols.join('') + '|' + Math.round(tr.v * 2) + '|' + (tr.flowers ? 1 : 0);
      addSprite(getSprite(tr.skey, () => tr.parts), tr.x + wob, tr.y, groundZ(tr.x, tr.y), sc, behind ? 0.38 : 1, 14);
    }
    for (const n of co.nodes) { if (n.hp <= 0 || !onScreen(n.x, n.y)) continue; const wob = n.wob > 0 ? Math.sin(t * 50) * n.wob * 2 : 0; addSprite(getSprite('node|' + n.kind, () => n.parts), n.x + wob, n.y, space ? Math.sin(t + n.x) * 4 : groundZ(n.x, n.y), n.sc * (0.6 + 0.4 * n.hp / n.max), 1, n.pit ? -30 : 8); }
    for (const b of co.bushes) { if (!onScreen(b.x, b.y)) continue; addSprite(getSprite('bush|' + b.col + '|' + b.berries + '|' + (b.tuft ? Math.round(b.sc * 10) + (b.flower || '') : ''), () => b.parts), b.x, b.y, 0, b.sc, 1, 5); }
    for (const pr of co.props) {
      if (!onScreen(pr.x, pr.y, pr.tower ? 400 : pr.kind === 'edenskyline' ? 900 : pr.kind === 'station' ? 500 : 240)) continue;
      if (pr.tower) { const T = pr.tower, behind = S.phase === 'play' && pd < pr.x + pr.y + pr.hw * 0.3 && Math.abs(psx - (pr.x - pr.y)) < (pr.hw + pr.hd) * 0.95 && pd > pr.x + pr.y - (pr.hw + pr.hd) * 3.5; addSprite(getSprite('tower|' + T.seed + '|' + (T.looted >= T.floors ? 1 : 0), () => towerParts(T)), pr.x, pr.y, 0, 1, behind ? 0.3 : 1, 0); continue; }
      if (ANIM_PROPS[pr.kind]) { addModel(propParts(Object.assign({}, pr, { ph: t * 1.5 + (pr.ph || 0), t })), pr.x, pr.y, 0, pr.ang, 1); continue; }
      if (!pr.skey) pr.skey = 'prop|' + pr.kind + '|' + (pr.len || 0) + '|' + (pr.seed || 0) + '|' + (pr.col || '') + '|' + (pr.col2 || '') + '|' + (pr.broken ? 1 : 0) + '|' + (pr.flowers ? 1 : 0) + '|' + (pr.H || 0) + '|' + (pr.w || 0) + '|' + (pr.cab || 0) + '|' + (pr.zaun ? 1 : 0) + '|' + (pr.owned ? 1 : 0) + '|' + (pr.fixed ? 1 : 0) + '|' + (pr.tur || 0).toFixed(1) + '|' + (pr.ang || 0).toFixed(2);
      const big = BIG_PROPS.includes(pr.kind), behind = big && S.phase === 'play' && pd < pr.x + pr.y + 20 && pd > pr.x + pr.y - (pr.hw + pr.hd) * 2.6 && Math.abs(psx - (pr.x - pr.y)) < (pr.hw + pr.hd) * 0.9;
      addSprite(getSprite(pr.skey, () => propParts(pr), pr.ang), pr.x, pr.y, 0, 1, behind ? 0.35 : 1, pr.solid === false ? (pr.kind === 'edenskyline' ? 0 : -40) : big ? 0 : 10);
    }
  }
  for (const f of S.fallingTrees) { const k = Math.min(1, f.t / 0.9); addModel(f.parts.filter(q => q[2] >= 20).map(q => [q[0], q[1], q[2] * (1 - k * 0.85), q[3], q[4], q[5] * (1 - k * 0.3), q[6]]), f.x + Math.cos(f.a) * k * 40, f.y + Math.sin(f.a) * k * 40, 0, 0, f.sc, Math.max(0, 1 - Math.max(0, f.t - 0.9) * 2)); }
  for (const c of Wd.cars) { if (!onScreen(c.x, c.y, 120)) continue; addModel(carParts(c), c.x, c.y, 0, c.a, 1.25); if (c.up.gun && !c.wreck) addModel(carGunBarrel(c), c.x, c.y, 0, c.a + (c.gunAng || 0), 1.25); }
  if (Wd.heli && onScreen(Wd.heli.x, Wd.heli.y, 300)) addModel(heliParts(Wd.heli), Wd.heli.x, Wd.heli.y, Wd.heli.z, Wd.heli.a, 1.1, 1, Wd.heli.z > 30 ? 400 : 0);
  if (Wd.exHeli) addModel(heliParts(Wd.exHeli), Wd.exHeli.x, Wd.exHeli.y, 0, Wd.exHeli.a, 1.1);
  const sh = S.ship;
  if (sh && sh.world === S.where && onScreen(sh.x, sh.y, 400)) addModel(shipParts(sh, t, { flying: sh.z > 3 || space, thrust: p.inShip === sh && sh.thrust, boosting: sh.boosting }), sh.x, sh.y, space ? 30 + Math.sin(t * 2) * 3 : sh.z, sh.a, 1.3, 1, sh.z > 30 || space ? 400 : 0);
  for (const a of Wd.airships) if (onScreen(a.x, a.y, 600)) addModel(airshipParts(t), a.x, a.y, a.z, a.a, 1.4, 1, 3000);
  for (const c of Wd.crates) { if (!onScreen(c.x, c.y)) continue; const z = c.air ? c.z || 0 : space ? 10 + Math.sin(t * 1.5 + c.x) * 6 : groundZ(c.x, c.y); addModel(crateParts(c), c.x, c.y, z, space ? t * 0.4 + c.x : 0.3, 1); if (c.air && z > 0) addModel([[0, 0, 60, 70, 70, 4, '#e8e8e8'], [0, 0, 64, 50, 50, 6, '#ff5e3a'], [0, 0, 70, 24, 24, 4, '#e8e8e8']], c.x, c.y, z, 0.3, 1); }
  for (const pk of S.pickups) { if (!onScreen(pk.x, pk.y)) continue; const col = RES[pk.kind] ? RES[pk.kind].col : '#fff'; addModel([[0, 0, 0, 8, 8, 6, col], [0, 0, 6, 6, 6, 2, hexShade(col, 1.2)]], pk.x, pk.y, 6 + Math.sin(t * 4 + pk.x) * 3 + (space ? 20 : groundZ(pk.x, pk.y)), t * 2, 1); }
  for (const b of S.buildings) {
    if (!onScreen(b.x, b.y, 220)) continue;
    const sc = 1 + Math.sin(b.pop * Math.PI) * 0.25, shk = b.shakeT > 0 ? R(-2, 2) : 0; if (b.shakeT > 0) b.shakeT -= dt;
    const st = BUILD_SPRITE[b.type], dz = b.drop > 0 ? b.drop * b.drop * 220 : 0;
    if (st && !(b.evo > 0)) addSprite(getSprite('b|' + b.type + '|' + b.level + '|' + b.w + 'x' + b.h + '|' + st(b) + '|' + (b.mkey || ''), () => buildingParts(b, 0)), b.x + shk, b.y, dz, sc, 1, b.type === 'wall' ? 12 : 16); else addModel(buildingParts(b, t), b.x + shk, b.y, dz, BUILD[b.type].rot ? (b.rot || 0) * Math.PI / 2 : 0, sc * (b.evo > 0 ? 1 + Math.sin(b.evo * 18) * 0.04 : 1));
    if (b.type === 'turret') addModel(turretHeadParts(b), b.x, b.y, dz, b.headAng, sc);
    if (b.type === 'autogun') addModel(autogunHeadParts(b, t), b.x, b.y, dz, b.headAng, sc);
    if (b.mount) { const hz = 30 + b.level * 4 + 12; addModel(b.mount === 'turret' ? turretHeadParts(b) : autogunHeadParts(b, t), b.x, b.y, hz - (b.mount === 'turret' ? 8 : 6), b.headAng, sc * 1.05, 1, 30); }
  }
  for (const z of S.zombies) {
    if (!onScreen(z.x, z.y, 120)) continue; const T = ZTYPES[z.type];
    if (T.drone) { addModel(droneParts(z.t, z.hit > 0), z.x, z.y, 30 + Math.sin(z.t * 3) * 5, z.a, 1.3); continue; }
    if (T.creature) { addModel(creatureParts(z, t), z.x, z.y, -12 * z.rise + groundZ(z.x, z.y), z.a, z.sc); continue; }
    const look = z.hit > 0 ? Object.assign({}, z.look, { skin: '#f4ffd0', shirt: '#ffffff' }) : z.look, parts = humanParts(look, { walk: z.walk, moving: 1, zombie: true, alien: T.alien, t: z.t });
    if (z.type === 'boss') parts.push(...bossExtras(z.t)); if (z.type === 'brute') parts.push([-2, -9, 30, 4, 4, 6, '#9aa19c'], [-2, 9, 30, 4, 4, 6, '#9aa19c']);
    addModel(parts, z.x, z.y, -12 * z.rise + groundZ(z.x, z.y), z.a, z.sc);
    if (z.burn > 1) addModel([[0, 0, 40, 6, 6, 8 + Math.sin(t * 20) * 3, '#ff8a2a']], z.x, z.y, 0, 0, z.sc);
  }
  for (const n of Wd.npcs) { if (!onScreen(n.x, n.y, 100)) continue; addModel(humanParts(n.look, { walk: n.walk, moving: n.moving || 0, npc: true, t: n.t, wave: !!n.station && Math.hypot(p.x - n.x, p.y - n.y) < 140 }), n.x, n.y, groundZ(n.x, n.y), n.a, 1); }
  if (S.follower && !S.follower.hidden) { const f = S.follower; addModel(humanParts(f.hurt > 0 ? Object.assign({}, f.look, { shirt: '#ff8080' }) : f.look, { walk: f.walk, moving: f.moving, npc: true, t }), f.x, f.y, 0, f.a || 0, 1); }
  if (S.phase === 'play' && !p.inCar && !p.inHeli && !p.inShip) {
    const tool = currentTool(), carrying = S.city.task && S.city.task.type === 'deliver' && tool === 'axe' && !S.build.on, blink = p.invuln > 0 && Math.floor(t * 10) % 2 === 0;
    addModel(humanParts(p.hurt > 0.25 ? Object.assign({}, LOOK, { shirt: '#ff8080' }) : LOOK, { walk: p.walk, moving: p.moving, tool: S.build.on ? 'axe' : carrying ? 'package' : inCity() ? null : tool, swing: p.swing, recoil: p.recoil, pump: p.pump, attach: S.attach[tool], camo: S.camo[tool], t }), p.x, p.y, groundZ(p.x, p.y) + (p.az || 0), p.a, 1, blink ? 0.4 : 1);
  }
  if (S.phase === 'fall') { addModel(humanParts(LOOK, { walk: t * 4, moving: 0.4, t }), p.x, p.y, p.alt, p.a, 1); if (p.chute > 0) addModel([[0, 0, 70, 76, 76, 5, '#d9a343'], [0, 0, 75, 56, 56, 6, '#f2c45d'], [0, 0, 81, 30, 30, 5, '#d9a343'], [0, -32, 40, 2, 2, 32, '#ddd'], [0, 32, 40, 2, 2, 32, '#ddd']], p.x, p.y, p.alt, 0.3, 1); }
  if (S.drone) { const d = S.drone; addModel(droneParts(t), d.x, d.y, d.z + Math.sin(t * 4) * 4, d.a || 0, 1.1); }
  let ghost = null;
  if (S.build.on && S.phase === 'play' && !UI.blocking()) {
    const m = screenToWorld(MOUSE.x, MOUSE.y); ghost = placementInfo(m.x, m.y);
    G.globalAlpha = 0.55; tileDiamond(ghost.gx, ghost.gy, ghost.w, ghost.h); G.fillStyle = ghost.ok ? '#6dff5a' : '#ff4545'; G.fill(); G.globalAlpha = 1;
    G.strokeStyle = ghost.ok ? '#d8ffb0' : '#ffb0b0'; G.lineWidth = 2.5; tileDiamond(ghost.gx, ghost.gy, ghost.w, ghost.h); G.stroke(); G.lineWidth = 1; G.strokeStyle = 'rgba(14,26,16,0.6)';
    const fake = { type: S.build.sel, w: ghost.w, h: ghost.h, level: 1, nb: {}, grow: 0.5, powered: true, x: ghost.cx, y: ghost.cy, gx: ghost.gx, gy: ghost.gy, rot: S.build.rot, headAng: t };
    if (ghost.mount) { const hz = 30 + ghost.mount.level * 4 + 12 + Math.sin(t * 6) * 4 + 10; addModel(S.build.sel === 'turret' ? turretHeadParts(fake) : autogunHeadParts(fake, t), ghost.cx, ghost.cy, hz, t * 2, 1.05, 0.75, 6000); fake.type = null; }
    if (fake.type === 'wall' || fake.type === 'gate') { const isW = o => o && (o.type === 'wall' || o.type === 'gate' || o.type === 'hq' || o.type === 'watchtower'); fake.nb = { e: isW(gridAt(ghost.gx + 1, ghost.gy)), w: isW(gridAt(ghost.gx - 1, ghost.gy)), s: isW(gridAt(ghost.gx, ghost.gy + 1)), n: isW(gridAt(ghost.gx, ghost.gy - 1)) }; }
    if (fake.type) addModel(buildingParts(fake, t), ghost.cx, ghost.cy, Math.sin(t * 5) * 2 + 3, BUILD[fake.type].rot ? S.build.rot * Math.PI / 2 : 0, 1, 0.6, 5000); S.ghost = ghost;
  } else S.ghost = null;
  if (S.phase === 'intro' || S.phase === 'fall') {
    const pl = S.plane; G.lineWidth = 34 * VIEW.zoom; G.strokeStyle = 'rgba(0,15,0,0.22)'; const s1 = P(pl.x - 150, pl.y, 0), s2 = P(pl.x + 150, pl.y, 0); G.beginPath(); G.moveTo(s1.x, s1.y); G.lineTo(s2.x, s2.y); G.stroke(); G.lineWidth = 1;
    addModel(planeParts(t), pl.x, pl.y, pl.z, 0, 1.5, 1, 3000);
    if (!S.clouds) { S.clouds = []; for (let i = 0; i < 50; i++) S.clouds.push({ x: R(0, WORLD), y: R(pl.y - 900, pl.y + 700), z: R(150, 300), s: R(0.7, 1.6), v: R(15, 35) }); }
    const ca = S.phase === 'fall' ? 0.82 * clamp((p.alt - 80) / 220, 0, 1) : 0.82;
    if (ca > 0.03) for (const c of S.clouds) { c.x += c.v * dt; if (c.x > WORLD + 400) c.x = -400; if (!onScreen(c.x, c.y, 400)) continue; addModel([[0, 0, 0, 90, 60, 10, '#f4f8f6'], [20, 10, 8, 60, 44, 10, '#ffffff'], [-30, -12, 4, 46, 36, 8, '#e9efec'], [44, 26, 0, 30, 24, 6, '#eef3f0']], c.x, c.y, c.z, 0, c.s, ca * 0.75, 9000); }
  }
  if (S.dropPlane) addModel(planeParts(t), S.dropPlane.x, S.dropPlane.y, S.dropPlane.z, S.dropPlane.a, 0.8, 1, 3000);
  if (Wd.trams) for (const tr of Wd.trams) if (onScreen(tr.x, tr.y, 200)) { if (!tr.parts) tr.parts = propParts({ kind: 'tram', snow: true, col: tr.col }); addModel(tr.parts, tr.x, tr.y, 0, tr.ang, 1); }
  factoryBoxes(t);
  flushBoxes();
  if (sh && sh.world === S.where && sh.hitFx > 0 && sh.shield > 0) { const q = P(sh.x, sh.y, (space ? 30 : sh.z) + 14); G.strokeStyle = 'rgba(165,140,255,' + sh.hitFx * 2.5 + ')'; G.lineWidth = 4; G.beginPath(); G.ellipse(q.x, q.y, 80 * VIEW.zoom, 40 * VIEW.zoom, 0, 0, 6.283); G.stroke(); G.lineWidth = 1; }
  const hh = Wd.heli; if (hh && hh.rotSpd > 10 && onScreen(hh.x, hh.y, 300)) { const q = P(hh.x - Math.cos(hh.a) * 2, hh.y - Math.sin(hh.a) * 2, hh.z + 56 * 1.1); G.fillStyle = 'rgba(30,30,30,0.18)'; G.beginPath(); G.ellipse(q.x, q.y, 88 * 1.1 * IX * 1.414 * VIEW.zoom, 88 * 1.1 * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.fill(); }
  if (ghost && BUILD[S.build.sel].light) { const r = BUILD[S.build.sel].light, c = P(ghost.cx, ghost.cy, 0); G.setLineDash([8, 6]); G.strokeStyle = 'rgba(255,230,120,0.7)'; G.lineWidth = 2; G.beginPath(); G.ellipse(c.x, c.y, r * IX * 1.414 * VIEW.zoom, r * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.stroke(); G.setLineDash([]); G.lineWidth = 1; }
  for (const b of S.buildings) { if (b.hp >= b.max || !onScreen(b.x, b.y)) continue; const q = P(b.x, b.y, 50 + b.h * 10); G.fillStyle = 'rgba(0,0,0,0.6)'; G.fillRect(q.x - 22, q.y, 44, 5); G.fillStyle = b.hp / b.max > 0.4 ? '#7dff5a' : '#ff5e5e'; G.fillRect(q.x - 22, q.y, 44 * b.hp / b.max, 5); }
  for (const z of S.zombies) { if (z.hp >= z.max || !onScreen(z.x, z.y)) continue; const q = P(z.x, z.y, ZTYPES[z.type].drone ? 60 : 52 * z.sc), w = z.type === 'boss' ? 90 : 26 * z.sc; G.fillStyle = 'rgba(0,0,0,0.6)'; G.fillRect(q.x - w / 2, q.y, w, 4); G.fillStyle = z.type === 'boss' ? '#ffb020' : '#ff4d4d'; G.fillRect(q.x - w / 2, q.y, w * Math.max(0, z.hp / z.max), 4); }
  if (S.build.on) { G.textAlign = 'center'; G.font = '900 12px "Trebuchet MS", Arial'; for (const b of S.buildings) { if (b.level < 2 || !onScreen(b.x, b.y) || b.type === 'wall' || b.type === 'pcable' || b.type === 'belt') continue; const q = P(b.x, b.y, 46 + b.h * 12), txt = '★'.repeat(b.level); G.lineWidth = 3; G.strokeStyle = 'rgba(0,0,0,0.7)'; G.strokeText(txt, q.x, q.y); G.fillStyle = b.level >= maxLevel(b.type) ? '#7dff5a' : '#ffd84a'; G.fillText(txt, q.x, q.y); } }
  G.textAlign = 'center';
  for (const n of Wd.npcs) { if (!n.station || !onScreen(n.x, n.y)) continue; const d = Math.hypot(p.x - n.x, p.y - n.y); if (d > 380) continue; const q = P(n.x, n.y, 58); G.font = '900 12px "Trebuchet MS", Arial'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.75)'; G.strokeText(n.name, q.x, q.y); G.fillStyle = d < 58 ? '#ffe066' : '#ffffff'; G.fillText(n.name, q.x, q.y); }
  factoryLabels(t);
  for (const o of Wd.outposts) { if (!onScreen(o.x, o.y)) continue; const q = P(o.x, o.y, 70); G.font = '900 12px "Trebuchet MS", Arial'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.75)'; G.strokeText(o.n, q.x, q.y); G.fillStyle = '#ffb020'; G.fillText(o.n, q.x, q.y); }
  G.lineWidth = 1;
  const tool = currentTool();
  if (S.phase === 'play' && !p.inCar && !p.inHeli && !p.inShip && !S.build.on && GUNS.includes(tool) && S.attach[tool].laser) { const a = p.a, m0 = P(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, 22), m1 = P(p.x + Math.cos(a) * 520, p.y + Math.sin(a) * 520, 22); G.strokeStyle = 'rgba(255,40,40,0.55)'; G.lineWidth = 1.5; G.beginPath(); G.moveTo(m0.x, m0.y); G.lineTo(m1.x, m1.y); G.stroke(); }
  for (const b of S.bullets) { const bz = b.z + (b.gz || 0), a = P(b.px, b.py, bz), c = P(b.x, b.y, bz); G.strokeStyle = b.src === 'enemy' ? 'rgba(255,94,58,1)' : b.laser ? 'rgba(255,110,200,1)' : b.src === 'plasma' ? 'rgba(255,94,240,1)' : b.src === 'turret' || b.src === 'drone' || b.src === 'heli' ? 'rgba(140,220,255,0.9)' : b.src === 'sniper' ? '#fff' : 'rgba(255,240,150,0.95)'; G.lineWidth = b.laser || b.src === 'plasma' ? 4 : b.src === 'sniper' ? 4 : 2.5; G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(c.x, c.y); G.stroke(); }
  G.lineWidth = 1;
  for (const g of S.grenades) { const q = P(g.x, g.y, g.z); G.fillStyle = '#3e5b2d'; G.fillRect(q.x - 4, q.y - 4, 8, 8); }
  for (const q of S.particles) {
    if (q.invisible) continue; const s = P(q.x, q.y, q.z); if (s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) continue; const al = clamp(q.life / q.max, 0, 1);
    if (q.beam) { G.fillStyle = 'rgba(150,255,255,' + al + ')'; G.fillRect(s.x - 6, s.y - 900, 12, 900); continue; }
    if (q.smoke) { G.fillStyle = q.col; G.globalAlpha = al * 0.8; G.beginPath(); G.arc(s.x, s.y, q.s * VIEW.zoom, 0, 6.283); G.fill(); G.globalAlpha = 1; continue; }
    if (q.flashP) { G.fillStyle = q.col; G.beginPath(); G.arc(s.x, s.y, q.s * 1.6 * VIEW.zoom, 0, 6.283); G.fill(); continue; }
    G.globalAlpha = al; G.fillStyle = q.col; const sz = q.s * VIEW.zoom; G.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  G.globalAlpha = 1; G.textAlign = 'center';
  for (const f of S.floaters) { const q = P(f.x, f.y, f.z), al = clamp(f.life, 0, 1), sc = f.big ? 1 + Math.max(0, f.life - 1) * 2 : 1; G.globalAlpha = al; G.font = '900 ' + Math.round((f.big ? 20 : 14) * sc) + 'px "Trebuchet MS", Arial'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.7)'; G.strokeText(f.text, q.x, q.y); G.fillStyle = f.col; G.fillText(f.text, q.x, q.y); }
  G.globalAlpha = 1; G.lineWidth = 1;
  renderLighting(t);
  if (S.bloodMoon && S.dayness < 0.4 && S.where === 'main') { G.fillStyle = 'rgba(160,0,0,0.16)'; G.fillRect(0, 0, W, H); }
  if (Wd.ambient === 'under') { const gr = G.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, Math.max(W, H) * 0.7); gr.addColorStop(0, 'rgba(60,140,90,0)'); gr.addColorStop(1, 'rgba(40,110,70,0.35)'); G.fillStyle = gr; G.fillRect(0, 0, W, H); }
  if (S.rainAmt > 0.05) { G.strokeStyle = 'rgba(170,210,255,' + (0.35 * Math.min(1, S.rainAmt)) + ')'; G.lineWidth = 1.2; G.beginPath(); for (let i = 0; i < 160 * S.rainAmt; i++) { const x = (i * 97.3 + t * 300 * (1 + (i % 3) * 0.2)) % (W + 100) - 50, y = (i * 61.7 + t * 900 * (1 + (i % 5) * 0.1)) % (H + 50); G.moveTo(x, y); G.lineTo(x - 6, y + 18); } G.stroke(); G.fillStyle = 'rgba(40,60,90,' + 0.12 * Math.min(1, S.rainAmt) + ')'; G.fillRect(0, 0, W, H); }
  if (Wd.biome === 'lab') { G.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 120; i++) G.fillRect((i * 83.1 + t * 40 * (1 + i % 3)) % W, (i * 47.3 + t * 70 * (1 + (i % 4) * 0.3)) % H, 2.5, 2.5); }
  if ((S.weather === 'Nebel' && S.where === 'main') || (Wd.biome && BIOMES[Wd.biome].fog)) { const gr = G.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, Math.max(W, H) * 0.7), fc = Wd.biome === 'swamp' ? '120,160,110' : '210,220,215'; gr.addColorStop(0, 'rgba(' + fc + ',0)'); gr.addColorStop(1, 'rgba(' + fc + ',0.6)'); G.fillStyle = gr; G.fillRect(0, 0, W, H); }
  if (Wd.kind === 'planet') { const gr = G.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(' + hexToRgbStr(Wd.planet.col[1]) + ',0.45)'); G.fillStyle = gr; G.fillRect(0, 0, W, H);
    const A = atmoHere(); if (A && A.haze) { const k = 0.035 + (S.atmoHurt || 0) * 0.09 + Math.sin(t * 2) * 0.01; const g2 = G.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, Math.max(W, H) * 0.7); g2.addColorStop(0, 'rgba(' + A.haze + ',0)'); g2.addColorStop(1, 'rgba(' + A.haze + ',' + k * 2.5 + ')'); G.fillStyle = g2; G.fillRect(0, 0, W, H); G.fillStyle = 'rgba(' + A.haze + ',0.5)'; for (let i = 0; i < 50; i++) G.fillRect((i * 131.7 + t * 25 * (1 + i % 3)) % W, (i * 77.3 + Math.sin(t + i) * 30 + t * 12) % H, 3, 3); } }
  if (Wd.ambient === 'cyber') { G.strokeStyle = 'rgba(160,220,255,0.35)'; G.lineWidth = 1; G.beginPath(); for (let i = 0; i < 120; i++) { const x = (i * 97.3 + t * 180) % (W + 60) - 30, y = (i * 61.7 + t * 820 * (1 + (i % 4) * 0.15)) % (H + 40); G.moveTo(x, y); G.lineTo(x - 3, y + 14); } G.stroke(); const gr = G.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(120,30,160,0.12)'); gr.addColorStop(1, 'rgba(20,160,220,0.28)'); G.fillStyle = gr; G.fillRect(0, 0, W, H); }
  else if (Wd.ambient === 'dusk') { const gr = G.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,170,80,0.22)'); gr.addColorStop(0.5, 'rgba(255,120,60,0.06)'); gr.addColorStop(1, 'rgba(120,40,20,0.2)'); G.fillStyle = gr; G.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { const a = 0.4 + Math.sin(t * 2 + i) * 0.3; G.fillStyle = 'rgba(255,200,110,' + a + ')'; G.fillRect((i * 131.7 + Math.sin(t * 0.7 + i) * 40) % W, (H - (i * 53.3 + t * 18 * (1 + i % 3)) % H), 2.5, 2.5); } }
  else if (Wd.kind === 'city') { G.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 140; i++) { const s = 2 + (i % 3); G.fillRect((i * 83.1 + t * 30 * (1 + i % 3) + Math.sin(t + i) * 20) % W, (i * 47.3 + t * 55 * (1 + (i % 4) * 0.3)) % H, s, s); } const gr = G.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(150,190,255,0.10)'); gr.addColorStop(1, 'rgba(255,200,230,0.06)'); G.fillStyle = gr; G.fillRect(0, 0, W, H); }
  if (Wd.kind === 'under' && Wd.ambient === 'under') { G.fillStyle = 'rgba(120,255,170,0.35)'; for (let i = 0; i < 40; i++) G.fillRect((i * 97.1) % W, (i * 53.3 + t * 260 * (1 + i % 3)) % H, 1.5, 7); const gr = G.createLinearGradient(0, 0, 0, H * 0.4); gr.addColorStop(0, 'rgba(0,8,4,0.55)'); gr.addColorStop(1, 'rgba(0,8,4,0)'); G.fillStyle = gr; G.fillRect(0, 0, W, H * 0.4); }
  if (sh && p.inShip === sh && !space && sh.z > 380) { const k = (sh.z - 380) / 140; G.fillStyle = 'rgba(200,230,255,' + k * 0.5 + ')'; G.fillRect(0, 0, W, H); }
  if (space && sh && sh.reentry > 0) { G.fillStyle = 'rgba(255,140,60,' + sh.reentry / 1.6 * 0.5 + ')'; G.fillRect(0, 0, W, H); }
  if (S.lightning > 0) { G.fillStyle = 'rgba(230,240,255,' + S.lightning * 0.7 + ')'; G.fillRect(0, 0, W, H); }
  if (S.flash > 0) { G.fillStyle = 'rgba(' + S.flashCol + ',' + S.flash * 0.45 + ')'; G.fillRect(0, 0, W, H); }
  if (p.hurt > 0) { const gr = G.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, 'rgba(200,0,0,' + p.hurt * 1.2 + ')'); G.fillStyle = gr; G.fillRect(0, 0, W, H); }
  if (S.phase === 'play') {
    const air = Wd.crates.find(c => c.air && !c.open); if (air) edgeArrow(air.x, air.y, '#ff5e3a', 'ABWURF');
    const h = S.where === 'main' ? hq() : null; if (h && S.dayness < 0.4) edgeArrow(h.x, h.y, '#7dff5a', 'HQ');
    if (tm) edgeArrow(tm.x, tm.y, '#ffd84a', tm.label);
    if (S.where === 'exp') edgeArrow(Wd.exHeli.x, Wd.exHeli.y, '#ff5e3a', 'EXTRAKTION');
    if (space && Wd.station) edgeArrow(Wd.station.x, Wd.station.y, '#5fd4ff', 'STATION');
    if (sh && sh.world === S.where && !p.inShip) edgeArrow(sh.x, sh.y, '#7ad7ff', 'SCHIFF');
  }
  if (!opts.noCursor) drawCrosshair(t);
}
function taskMarker() {
  const t = S.city.task; if (!t || S.where !== 'main') return null;
  if (t.type === 'deliver') { const o = S.W.outposts[t.target]; return { x: o.x, y: o.y, label: '📦 ' + o.n }; }
  if (t.type === 'rescue') return S.follower ? { x: S.W.eden.x, y: S.W.eden.y, label: 'NEU-EDEN' } : { x: t.x, y: t.y, label: '🧍 VERMISSTE' };
  return null;
}
function edgeArrow(x, y, col, label) {
  const q = P(x, y, 0), W = innerWidth, H = innerHeight; if (q.x > 40 && q.x < W - 40 && q.y > 40 && q.y < H - 40) return;
  const a = Math.atan2(q.y - H / 2, q.x - W / 2), ex = clamp(W / 2 + Math.cos(a) * W, 50, W - 50), ey = clamp(H / 2 + Math.sin(a) * H, 90, H - 120);
  G.save(); G.translate(ex, ey); G.rotate(a); G.fillStyle = col; G.beginPath(); G.moveTo(16, 0); G.lineTo(-8, -10); G.lineTo(-8, 10); G.closePath(); G.fill(); G.restore();
  G.font = '900 11px Arial'; G.textAlign = 'center'; G.fillStyle = col; G.fillText(label, ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4);
}
function drawBuildGrid() {
  const m = screenToWorld(MOUSE.x, MOUSE.y), cgx = Math.floor(m.x / TILE), cgy = Math.floor(m.y / TILE), R0 = 9;
  for (let j = cgy - R0; j <= cgy + R0; j++) for (let i = cgx - R0; i <= cgx + R0; i++) { if (i < 0 || j < 0 || i >= MAP || j >= MAP) continue; const d = Math.hypot(i - cgx, j - cgy); if (d > R0) continue; const al = (1 - d / R0) * 0.6; tileDiamond(i, j, 1, 1); if (S.grid[j * MAP + i]) { G.fillStyle = 'rgba(255,200,80,' + al * 0.25 + ')'; G.fill(); } G.strokeStyle = 'rgba(190,255,140,' + al + ')'; G.stroke(); }
  G.strokeStyle = 'rgba(14,26,16,0.6)';
}
function renderLighting(t) {
  const W = innerWidth, H = innerHeight, dark = ambientDark(), amb = S.W.ambient;
  const dusk = amb || S.W.kind === 'planet' ? 0 : Math.max(0, 1 - Math.abs(S.dayness - 0.5) * 2) * (S.dayness < 1 ? 1 : 0);
  if (dusk > 0.02) { G.fillStyle = 'rgba(255,120,60,' + dusk * 0.18 + ')'; G.fillRect(0, 0, W, H); }
  if (dark < 0.03) return;
  const sc = 0.5; if (!LIGHT_CV) { LIGHT_CV = document.createElement('canvas'); LIGHT_G = LIGHT_CV.getContext('2d'); }
  const lw = Math.ceil(W * sc), lh = Math.ceil(H * sc); if (LIGHT_CV.width !== lw || LIGHT_CV.height !== lh) { LIGHT_CV.width = lw; LIGHT_CV.height = lh; }
  const L = LIGHT_G; L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, lw, lh);
  L.fillStyle = amb === 'cyber' ? 'rgba(10,6,24,' + dark + ')' : amb === 'dusk' ? 'rgba(50,22,12,' + dark + ')' : amb === 'under' ? 'rgba(6,18,12,' + dark + ')' : amb === 'station' ? 'rgba(6,10,20,' + dark + ')' : S.W.kind === 'planet' ? 'rgba(' + hexToRgbStr(hexShade(S.W.planet.col[1], 0.3)) + ',' + dark + ')' : S.bloodMoon && S.where === 'main' ? 'rgba(24,4,8,' + dark + ')' : 'rgba(4,8,28,' + dark + ')'; L.fillRect(0, 0, lw, lh);
  L.globalCompositeOperation = 'destination-out';
  for (const li of LIGHTS) { const q = P(li.x, li.y, 0), r = li.r * (li.flick ? 1 + Math.sin(t * 17 + li.x) * 0.04 : 1), rx = r * IX * 1.414 * VIEW.zoom * sc, ry = r * IY * 1.414 * VIEW.zoom * sc; if (q.x * sc + rx < 0 || q.x * sc - rx > lw || q.y * sc + ry < 0 || q.y * sc - ry * 2 > lh) continue; L.save(); L.translate(q.x * sc, q.y * sc); L.scale(1, ry / rx); const gr = L.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gr; L.beginPath(); L.arc(0, 0, rx, 0, 6.283); L.fill(); L.restore(); }
  G.drawImage(LIGHT_CV, 0, 0, W, H);
  G.globalCompositeOperation = 'lighter';
  const strength = amb === 'under' || amb === 'station' || amb === 'cyber' ? 0.45 : amb === 'dusk' ? 0.32 : 0.22;
  for (const li of LIGHTS) { const q = P(li.x, li.y, 0), r = li.r * IX * 1.414 * VIEW.zoom * 0.7; if (q.x < -r || q.x > W + r || q.y < -r || q.y > H + r) continue; G.save(); G.translate(q.x, q.y); G.scale(1, IY / IX); const gr = G.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(' + li.col + ',' + strength * dark + ')'); gr.addColorStop(1, 'rgba(' + li.col + ',0)'); G.fillStyle = gr; G.beginPath(); G.arc(0, 0, r, 0, 6.283); G.fill(); G.restore(); }
  G.globalCompositeOperation = 'source-over';
  for (const z of S.zombies) { if (!onScreen(z.x, z.y)) continue; const q = P(z.x + Math.cos(z.a) * 6 * z.sc, z.y + Math.sin(z.a) * 6 * z.sc, ZTYPES[z.type].drone ? 34 : 35 * z.sc); G.fillStyle = ZTYPES[z.type].alien ? 'rgba(255,242,122,' + dark + ')' : 'rgba(255,60,40,' + dark + ')'; G.fillRect(q.x - 4, q.y - 1, 3, 2); G.fillRect(q.x + 1, q.y - 1, 3, 2); }
}
function drawCrosshair(t) {
  if (S.phase !== 'play' || UI.blocking()) return;
  const x = MOUSE.x, y = MOUSE.y, tool = currentTool(); G.strokeStyle = S.build.on ? 'rgba(190,255,140,0.9)' : S.p.inShip ? 'rgba(255,120,200,0.95)' : 'rgba(255,255,255,0.9)'; G.lineWidth = 2;
  const sp = GUNS.includes(tool) && !S.p.inShip ? 6 + weaponStat(tool).spread * 60 + S.p.recoil * 8 : 6;
  G.beginPath(); G.moveTo(x - sp - 6, y); G.lineTo(x - sp, y); G.moveTo(x + sp, y); G.lineTo(x + sp + 6, y); G.moveTo(x, y - sp - 6); G.lineTo(x, y - sp); G.moveTo(x, y + sp); G.lineTo(x, y + sp + 6); G.stroke();
  if (S.hitMark > 0 || S.killMark > 0) { G.strokeStyle = S.killMark > 0 ? '#ff3030' : '#fff'; G.lineWidth = 3; const k = 8 + (S.killMark > 0 ? 4 : 0); G.beginPath(); G.moveTo(x - k - 6, y - k - 6); G.lineTo(x - k, y - k); G.moveTo(x + k + 6, y - k - 6); G.lineTo(x + k, y - k); G.moveTo(x - k - 6, y + k + 6); G.lineTo(x - k, y + k); G.moveTo(x + k + 6, y + k + 6); G.lineTo(x + k, y + k); G.stroke(); }
  if (S.p.reload > 0) { const st = weaponStat(S.p.reloadKind); G.strokeStyle = '#ffe066'; G.lineWidth = 3; G.beginPath(); G.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - S.p.reload / st.reload)); G.stroke(); }
  if (S.hold.what && S.hold.t > 0) { G.strokeStyle = '#7dff5a'; G.lineWidth = 4; G.beginPath(); G.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.hold.t / S.hold.max); G.stroke(); }
  G.lineWidth = 1;
}
function renderMinimap(cv) {
  const g = cv.getContext('2d'), size = cv.width, W = S.W;
  if (MINI_DIRTY || !MINI) { MINI = buildMinimapBase(W, size, S.edenFound); MINI_DIRTY = false; }
  g.clearRect(0, 0, size, size); g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 2, 0, 6.283); g.clip();
  const zoom = W.kind === 'main' ? (S.p.inHeli || S.p.inShip ? 2.6 : 4.5) : 2.2, m = worldToMini(S.p.x, S.p.y, size, W);
  g.translate(size / 2, size / 2); g.scale(zoom, zoom); g.translate(-m.x, -m.y); g.fillStyle = W.kind === 'space' ? '#05050c' : '#122416'; g.fillRect(-size, -size, size * 3, size * 3); g.drawImage(MINI, 0, 0);
  const dot = (x, y, c, r) => { const q = worldToMini(x, y, size, W); g.fillStyle = c; g.fillRect(q.x - r / 2, q.y - r / 2, r, r); };
  for (const b of S.buildings) dot(b.x, b.y, b.type === 'hq' ? '#7dff5a' : '#e8d17a', b.type === 'hq' ? 3 : 1.4);
  for (const c of W.cars) dot(c.x, c.y, c.wreck ? '#a0522d' : '#7ad7ff', 2);
  if (W.heli) dot(W.heli.x, W.heli.y, W.heli.wreck ? '#ff9a3c' : '#7ad7ff', 3);
  if (S.ship && S.ship.world === S.where) dot(S.ship.x, S.ship.y, '#ff7ad0', 3);
  for (const o of W.outposts) dot(o.x, o.y, '#ffb020', 2.2);
  if (W.radioHut) dot(W.radioHut.x, W.radioHut.y, S.radioFixed ? '#5fff8a' : '#ff9a3c', 3);
  if (W.kind === 'main' && S.edenFound) dot(W.eden.x, W.eden.y, '#ffd84a', 4);
  if (W.station) dot(W.station.x, W.station.y, '#5fd4ff', 6);
  if (W.kind === 'main' && S.edenHint) { const q = worldToMini(S.edenHint.x, S.edenHint.y, size, W); g.strokeStyle = 'rgba(255,154,60,0.9)'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(q.x, q.y, S.edenHint.r / (2 * W.size * TILE) * size * 1.4, S.edenHint.r / (2 * W.size * TILE) * size * 0.8, 0, 0, 6.283); g.stroke(); }
  for (const n of W.npcs) if (n.station) dot(n.x, n.y, '#ffe066', 2);
  if (W.scanned) for (const n of W.nodes) if (n.rich && n.hp > 0) dot(n.x, n.y, '#5fff8a', 3.4);
  for (const c of W.crates) if (!c.open) dot(c.x, c.y, c.air ? '#ff3b30' : RARITY[c.rarity].col, c.air ? 2.6 : 1.3);
  const tm = taskMarker(); if (tm) dot(tm.x, tm.y, '#ffd84a', 3.2); if (W.exHeli) dot(W.exHeli.x, W.exHeli.y, '#ff3b30', 3.4);
  const thermal = Object.values(S.attach).some(a => a.thermal);
  if (S.uav > 0 || S.dayness < 0.35 || S.where === 'exp' || S.where === 'planet' || S.where === 'space' || S.where === 'station') for (const z of S.zombies) if (S.uav > 0 || thermal || S.where === 'space' || Math.hypot(z.x - S.p.x, z.y - S.p.y) < 260 || S.buildings.some(b => b.type === 'watchtower' && Math.hypot(b.x - z.x, b.y - z.y) < 380 + b.level * 140)) dot(z.x, z.y, '#ff4040', z.type === 'boss' ? 3 : 1.3);
  g.restore(); g.save(); g.translate(size / 2, size / 2);
  const a = S.p.a; g.rotate(Math.atan2(Math.sin(a) + Math.cos(a), Math.cos(a) - Math.sin(a))); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4); g.lineTo(-4, 4); g.closePath(); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 2, 0, 6.283); g.stroke();
  g.fillStyle = '#ffd84a'; g.font = '900 12px Arial'; g.textAlign = 'center'; g.fillText('N', size / 2, 13);
}
