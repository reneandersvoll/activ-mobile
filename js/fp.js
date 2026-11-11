'use strict';
// ===================== EGO-PERSPEKTIVE (gleiche Box-Modelle, echte Perspektive) =====================
const FP = { faces: [], cam: null };
const _fogC = new Map();
function fogShade(col, f, t, fog) {
  const tq = Math.round(t * 10), key = col + f + '|' + tq + fog; let v = _fogC.get(key); if (v) return v;
  const n = parseInt(col.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f > 1) { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= f; g *= f; b *= f; }
  const fc = parseInt(fog.slice(1), 16), fr = (fc >> 16) & 255, fg = (fc >> 8) & 255, fb = fc & 255, k = tq / 10;
  v = 'rgb(' + ((r + (fr - r) * k) | 0) + ',' + ((g + (fg - g) * k) | 0) + ',' + ((b + (fb - b) * k) | 0) + ')';
  if (_fogC.size > 20000) _fogC.clear(); _fogC.set(key, v); return v;
}
function fpCamSpace(x, y, z) { const c = FP.cam, dx = x - c.x, dy = y - c.y, dz = z - c.z, f = dx * c.cy + dy * c.sy, s = -dx * c.sy + dy * c.cy; return [s, dz * c.cp - f * c.sp, f * c.cp + dz * c.sp]; }
function fpClip(poly) {
  const N = 4, out = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ia = a[2] >= N, ib = b[2] >= N; if (ia) out.push(a); if (ia !== ib) { const t = (N - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, N]); } }
  return out;
}
const FPN = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function fpBox(x, y, z, w, d, h, ang, col, maxD, nofog) {
  const c = FP.cam, dist = Math.hypot(x - c.x, y - c.y); if (dist > maxD) return;
  { const r = Math.max(w, d, h) * 0.75, cc = fpCamSpace(x, y, z + h / 2); if (cc[2] < -r) return; if (Math.abs(cc[0]) - r > cc[2] * 1.15 + 10) return; if (Math.abs(cc[1]) - r > cc[2] * 0.75 + 10) return; }
  const cs = Math.cos(ang), sn = Math.sin(ang), hw = w / 2, hd = d / 2, LX = [-hw, hw, hw, -hw], LY = [-hd, -hd, hd, hd], wx = [], wy = [], V = [];
  for (let i = 0; i < 4; i++) { wx[i] = x + LX[i] * cs - LY[i] * sn; wy[i] = y + LX[i] * sn + LY[i] * cs; }
  for (let i = 0; i < 4; i++) V[i] = fpCamSpace(wx[i], wy[i], z); for (let i = 0; i < 4; i++) V[i + 4] = fpCamSpace(wx[i], wy[i], z + h);
  let allBehind = true; for (const v of V) if (v[2] > 4) { allBehind = false; break; } if (allBehind) return;
  const t = nofog ? 0 : clamp((dist - 260) / (maxD - 260), 0, 1) * 0.9, fog = c.fog;
  const add = (idx, f) => { const poly = fpClip(idx.map(i => V[i])); if (poly.length < 3) return; let dd = 0; for (const v of poly) dd += v[2]; FP.faces.push({ d: dd / poly.length, p: poly, c: fogShade(col, f, t, fog) }); };
  if (c.z > z + h) add([4, 5, 6, 7], 1.12); else if (c.z < z) add([0, 1, 2, 3], 0.5);
  for (let i = 0; i < 4; i++) { const nx = FPN[i][0] * cs - FPN[i][1] * sn, ny = FPN[i][0] * sn + FPN[i][1] * cs, j = (i + 1) & 3, mx = (wx[i] + wx[j]) / 2, my = (wy[i] + wy[j]) / 2; if (nx * (mx - c.x) + ny * (my - c.y) >= 0) continue; add([i, j, j + 4, i + 4], Math.round((0.72 + 0.13 * (nx - ny)) * 20) / 20); }
}
function fpModel(parts, x, y, z0, ang, sc, maxD) {
  sc = sc || 1; const c = Math.cos(ang), s = Math.sin(ang), far = Math.hypot(x - FP.cam.x, y - FP.cam.y) > 260;
  for (const p of parts) if (!far || p[3] > 5 || p[4] > 5) fpBox(x + (p[0] * c - p[1] * s) * sc, y + (p[0] * s + p[1] * c) * sc, z0 + p[2] * sc, p[3] * sc, p[4] * sc, p[5] * sc, ang + (p[7] || 0), p[6], maxD);
}
function fpProject(v) { const F = FP.cam.F; return [innerWidth / 2 + v[0] / v[2] * F, innerHeight / 2 - v[1] / v[2] * F]; }
function fpFlush() {
  FP.faces.sort((a, b) => b.d - a.d);
  const ol = SETTINGS.outline; G.lineWidth = 1; G.strokeStyle = 'rgba(10,20,14,0.45)';
  for (const f of FP.faces) { G.beginPath(); for (let i = 0; i < f.p.length; i++) { const q = fpProject(f.p[i]); if (i) G.lineTo(q[0], q[1]); else G.moveTo(q[0], q[1]); } G.closePath(); G.fillStyle = f.c; G.fill(); if (ol && f.d < 500) G.stroke(); }
  FP.faces = [];
}
function fpSkyCol() {
  const W = S.W;
  if (W.kind === 'space') return ['#02030a', '#0a0820', '#05050c'];
  if (W.ambient === 'under') return ['#0c1612', '#1a2a22', '#1a2420'];
  if (W.ambient === 'station') return ['#151a22', '#232a34', '#1e2530'];
  if (W.kind === 'planet') { const P0 = W.planet; return [hexShade(P0.col[1], 0.6), hexShade(P0.col[0], 0.9), hexShade(P0.col[1], 0.8)]; }
  const d = S.dayness; if (d < 0.3) return ['#050a1e', '#14204a', '#101a30'];
  return [hsl2hex(205, 60, 40 + d * 22), hsl2hex(195, 55, 70 + d * 12), d > 0.6 ? '#a8c8c0' : '#6a7a8a'];
}
function renderFP(dt) {
  const Wd = S.W, p = S.p, t = performance.now() / 1000, W = innerWidth, H = innerHeight;
  const veh = p.inShip || p.inHeli || p.inCar, bob = !veh ? Math.sin(p.walk) * p.moving * 2.5 : 0;
  const ez = p.inShip ? (S.where === 'space' ? 40 : p.inShip.z + 30) : p.inHeli ? p.inHeli.z + 30 : p.inCar ? 32 : 36 + bob, yaw = veh ? (veh.a || p.a) : p.a, pitch = S.fpPitch;
  const sky = fpSkyCol();
  FP.cam = { x: p.x - Math.cos(yaw) * (veh ? 10 : 0), y: p.y - Math.sin(yaw) * (veh ? 10 : 0), z: ez, cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), F: H * 0.85, fog: sky[2] };
  const F = FP.cam.F, hor = H / 2 + F * Math.tan(pitch);
  const sg = G.createLinearGradient(0, 0, 0, Math.max(10, hor)); sg.addColorStop(0, sky[0]); sg.addColorStop(1, sky[1]); G.fillStyle = sg; G.fillRect(0, 0, W, Math.max(0, hor) + 1);
  if (Wd.kind === 'space' && Wd.stars) { for (const s of Wd.stars) { const x = ((s.x * 4 - yaw / 6.283) % 1 + 1) % 1 * W * 2 - W * 0.5, y = s.y * H; G.fillStyle = s.c; G.fillRect(x, y, s.s, s.s); } }
  else if (!Wd.ambient || Wd.ambient === 'day') { G.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 8; i++) { const x = ((i * 0.17 - yaw / 6.283 + t * 0.002) % 1 + 1) % 1 * W * 1.6 - W * 0.3, y = hor - 60 - (i % 3) * 40; G.beginPath(); G.ellipse(x, y, 90, 18, 0, 0, 6.283); G.fill(); } }
  if (Wd.kind !== 'space') { const gc = tileColor(Wd, Wd.kind === 'city' ? 5 : Wd.kind === 'under' ? 7 : Wd.kind === 'station' ? 10 : 0, 0, 0.5), gg = G.createLinearGradient(0, hor, 0, H); gg.addColorStop(0, sky[2]); gg.addColorStop(0.25, gc); gg.addColorStop(1, hexShade(gc, 0.8)); G.fillStyle = gg; G.fillRect(0, hor, W, H - hor); }
  // Boden-Kacheln in der Nähe
  const gx0 = Math.floor(p.x / TILE), gy0 = Math.floor(p.y / TILE), RT = 11, base = Wd.kind === 'city' ? 5 : Wd.kind === 'under' ? 7 : Wd.kind === 'station' ? 10 : 0;
  if (Wd.kind !== 'space') for (let j = gy0 - RT; j <= gy0 + RT; j++) for (let i = gx0 - RT; i <= gx0 + RT; i++) {
    const tt = wTile(Wd, i, j); if (tt === base || tt === 9) continue;
    const poly = fpClip([fpCamSpace(i * TILE, j * TILE, 0.5), fpCamSpace((i + 1) * TILE, j * TILE, 0.5), fpCamSpace((i + 1) * TILE, (j + 1) * TILE, 0.5), fpCamSpace(i * TILE, (j + 1) * TILE, 0.5)]); if (poly.length < 3) continue;
    const d = Math.hypot((i + 0.5) * TILE - p.x, (j + 0.5) * TILE - p.y);
    G.beginPath(); poly.forEach((v, k) => { const q = fpProject(v); k ? G.lineTo(q[0], q[1]) : G.moveTo(q[0], q[1]); }); G.closePath(); G.fillStyle = fogShade(tileColor(Wd, tt, 0, 0.5), 1, clamp((d - 200) / 400, 0, 0.9), sky[2]); G.fill();
  }
  // Gras in der Nähe
  if (Wd.grassCh && !QUALITY_LOW) { G.strokeStyle = Wd.grassCols ? Wd.grassCols[1] : '#4f9b43'; G.lineWidth = 2; G.beginPath(); const ci = chunkIdx(Wd, p.x, p.y), NC = Wd.NC; for (const k of [ci, ci - 1, ci + 1, ci - NC, ci + NC]) { const arr = Wd.grassCh[k]; if (!arr) continue; for (const g of arr) { const dd = Math.hypot(g.x - p.x, g.y - p.y); if (dd > 260) continue; const a = fpCamSpace(g.x, g.y, 0), b = fpCamSpace(g.x + Math.sin(t * 2 + g.ph) * 2, g.y, g.h); if (a[2] < 5 || b[2] < 5) continue; const qa = fpProject(a), qb = fpProject(b); G.moveTo(qa[0], qa[1]); G.lineTo(qb[0], qb[1]); } } G.stroke(); }
  // Objekte
  const MD = 640, near = (o, r) => Math.hypot(o.x - p.x, o.y - p.y) < MD + (r || 0);
  const cx0 = Math.floor(p.x / TILE / CH), cy0 = Math.floor(p.y / TILE / CH), RC = 3;
  for (let j = cy0 - RC; j <= cy0 + RC; j++) for (let i = cx0 - RC; i <= cx0 + RC; i++) {
    if (i < 0 || j < 0 || i >= Wd.NC || j >= Wd.NC) continue; const co = Wd.chunkObjs[j * Wd.NC + i];
    for (const tr of co.trees) if (near(tr)) { if (tr.hp > 0) fpModel(tr.parts, tr.x, tr.y, 0, 0, tr.sc, MD); else fpBox(tr.x, tr.y, 0, 12 * tr.sc, 12 * tr.sc, 6, 0, '#5b3a22', MD); }
    for (const n of co.nodes) if (n.hp > 0 && near(n)) fpModel(n.parts, n.x, n.y, 0, 0, n.sc, MD);
    for (const b of co.bushes) if (Math.hypot(b.x - p.x, b.y - p.y) < 260) fpModel(b.parts, b.x, b.y, 0, 0, b.sc, 280);
  }
  for (const pr of Wd.props) { const big = pr.kind === 'edenskyline' ? 1600 : pr.tower ? 500 : pr.hw ? Math.max(pr.hw, pr.hd) : 0; if (!near(pr, big)) continue; if (!pr.fpParts || pr.kind === 'station') { pr.fpParts = pr.tower ? towerParts(pr.tower) : propParts(pr); if (pr.kind === 'edenskyline' || pr.tower) pr.fpParts = pr.fpParts.filter(q => Math.max(q[3], q[4]) >= 10 || q[5] >= 20); } fpModel(pr.fpParts, pr.x, pr.y, 0, pr.ang || 0, 1, MD + big); }
  for (const b of S.buildings) if (near(b, 100)) { fpModel(buildingParts(b, t), b.x, b.y, 0, 0, 1, MD + 100); if (b.type === 'turret') fpModel(turretHeadParts(b), b.x, b.y, 0, b.headAng, 1, MD); }
  for (const c of Wd.cars) if (c !== p.inCar && near(c)) fpModel(carParts(c), c.x, c.y, 0, c.a, 1.25, MD);
  if (Wd.heli && Wd.heli !== p.inHeli && near(Wd.heli, 100)) fpModel(heliParts(Wd.heli), Wd.heli.x, Wd.heli.y, Wd.heli.z, Wd.heli.a, 1.1, MD + 100);
  const sh = S.ship; if (sh && sh.world === S.where && !p.inShip && near(sh)) fpModel(shipParts(sh, t, { flying: sh.z > 3 }), sh.x, sh.y, sh.z, sh.a, 1.3, MD);
  for (const c of Wd.crates) if (!c.open && near(c)) fpModel(crateParts(c), c.x, c.y, c.air ? c.z || 0 : 0, 0.3, 1, MD);
  for (const z of S.zombies) if (near(z)) { if (ZTYPES[z.type].drone) fpModel(droneParts(z.t, z.hit > 0), z.x, z.y, 30, z.a, 1.3, MD); else { const parts = humanParts(z.hit > 0 ? Object.assign({}, z.look, { skin: '#f4ffd0' }) : z.look, { walk: z.walk, moving: 1, zombie: true, alien: ZTYPES[z.type].alien, t: z.t }); if (z.type === 'boss') parts.push(...bossExtras(z.t)); fpModel(parts, z.x, z.y, -12 * z.rise, z.a, z.sc, MD); } }
  for (const n of Wd.npcs) if (near(n)) fpModel(humanParts(n.look, { walk: n.walk, moving: n.moving || 0, npc: true, t: n.t }), n.x, n.y, 0, n.a, 1, MD);
  for (const pk of S.pickups) if (near(pk)) fpModel([[0, 0, 0, 8, 8, 6, RES[pk.kind] ? RES[pk.kind].col : '#fff']], pk.x, pk.y, 6 + Math.sin(t * 4) * 3, t * 2, 1, MD);
  if (S.follower && !S.follower.hidden) fpModel(humanParts(S.follower.look, { walk: S.follower.walk, moving: S.follower.moving, npc: true, t }), S.follower.x, S.follower.y, 0, S.follower.a || 0, 1, MD);
  for (const a of Wd.airships) fpModel(airshipParts(t), a.x, a.y, a.z, a.a, 1.4, 2400);
  fpFlush();
  // Projektile & Partikel
  G.lineWidth = 3;
  for (const b of S.bullets) { const a = fpCamSpace(b.px, b.py, b.z), c = fpCamSpace(b.x, b.y, b.z); if (a[2] < 5 || c[2] < 5) continue; const qa = fpProject(a), qc = fpProject(c); G.strokeStyle = b.src === 'enemy' ? '#ff5e3a' : b.laser ? '#ff7ad0' : b.src === 'plasma' ? '#ff5ef0' : '#fff0a0'; G.beginPath(); G.moveTo(qa[0], qa[1]); G.lineTo(qc[0], qc[1]); G.stroke(); }
  for (const q of S.particles) { if (q.invisible) continue; const v = fpCamSpace(q.x, q.y, q.z); if (v[2] < 5 || v[2] > 700) continue; const s = fpProject(v), sz = Math.max(1, q.s * F / v[2] * (q.smoke ? 1.5 : 1)); G.globalAlpha = clamp(q.life / q.max, 0, 1) * (q.smoke ? 0.5 : 1); G.fillStyle = q.col; G.fillRect(s[0] - sz / 2, s[1] - sz / 2, sz, sz); }
  G.globalAlpha = 1;
  G.textAlign = 'center';
  for (const f of S.floaters) { const v = fpCamSpace(f.x, f.y, f.z + 20); if (v[2] < 20 || v[2] > 600) continue; const s = fpProject(v); G.globalAlpha = clamp(f.life, 0, 1); G.font = '900 ' + Math.round(clamp(2400 / v[2], 10, 26)) + 'px "Trebuchet MS"'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.7)'; G.strokeText(f.text, s[0], s[1]); G.fillStyle = f.col; G.fillText(f.text, s[0], s[1]); }
  G.globalAlpha = 1;
  for (const n of Wd.npcs) { if (!n.station) continue; const v = fpCamSpace(n.x, n.y, 62); if (v[2] < 20 || v[2] > 420) continue; const s = fpProject(v); G.font = '900 13px "Trebuchet MS"'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.75)'; G.strokeText(n.name, s[0], s[1]); G.fillStyle = '#ffe066'; G.fillText(n.name, s[0], s[1]); }
  // Viewmodel
  if (!veh) drawViewmodel(t, bob);
  else drawCockpit(veh, t);
  renderFPLighting(t);
  if (S.rainAmt > 0.05) { G.strokeStyle = 'rgba(170,210,255,' + 0.35 * Math.min(1, S.rainAmt) + ')'; G.lineWidth = 1.2; G.beginPath(); for (let i = 0; i < 160 * S.rainAmt; i++) { const x = (i * 97.3 + t * 100) % W, y = (i * 61.7 + t * 1100 * (1 + (i % 5) * 0.1)) % H; G.moveTo(x, y); G.lineTo(x - 2, y + 22); } G.stroke(); }
  if (S.flash > 0) { G.fillStyle = 'rgba(' + S.flashCol + ',' + S.flash * 0.45 + ')'; G.fillRect(0, 0, W, H); }
  if (p.hurt > 0) { const gr = G.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, 'rgba(200,0,0,' + p.hurt * 1.2 + ')'); G.fillStyle = gr; G.fillRect(0, 0, W, H); }
  if (S.phase === 'play' && !UI.blocking()) { const x = W / 2, y = H / 2; G.strokeStyle = 'rgba(255,255,255,0.9)'; G.lineWidth = 2; G.beginPath(); G.moveTo(x - 10, y); G.lineTo(x - 4, y); G.moveTo(x + 4, y); G.lineTo(x + 10, y); G.moveTo(x, y - 10); G.lineTo(x, y - 4); G.moveTo(x, y + 4); G.lineTo(x, y + 10); G.stroke(); if (S.hitMark > 0 || S.killMark > 0) { G.strokeStyle = S.killMark > 0 ? '#ff3030' : '#fff'; G.lineWidth = 3; G.beginPath(); G.moveTo(x - 14, y - 14); G.lineTo(x - 8, y - 8); G.moveTo(x + 14, y - 14); G.lineTo(x + 8, y - 8); G.moveTo(x - 14, y + 14); G.lineTo(x - 8, y + 8); G.moveTo(x + 14, y + 14); G.lineTo(x + 8, y + 8); G.stroke(); } if (S.hold.what && S.hold.t > 0) { G.strokeStyle = '#7dff5a'; G.lineWidth = 4; G.beginPath(); G.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.hold.t / S.hold.max); G.stroke(); } }
  G.lineWidth = 1;
}
function drawViewmodel(t, bob) {
  const p = S.p, tool = S.build.on ? 'axe' : inCity() ? null : currentTool(); if (!tool) return;
  const parts = []; weaponParts(tool, { swing: p.swing, recoil: p.recoil, pump: p.pump, attach: S.attach[tool], camo: S.camo[tool], t }, parts);
  parts.push([4, -2, 16, 6, 5, 5, LOOK.skin], [-4, -4, 14, 10, 6, 6, LOOK.shirt]);
  const sway = Math.sin(p.walk * 0.5) * p.moving * 1.5, F = FP.cam.F, cam = [-14, -9 + sway, 30 + bob * 0.3];
  const faces = [];
  for (const q of parts) {
    const [x, y, z, w, d, h, col] = q, a = q[7] || 0, cs = Math.cos(a), sn = Math.sin(a), LX = [-w / 2, w / 2, w / 2, -w / 2], LY = [-d / 2, -d / 2, d / 2, d / 2], V = [];
    for (let k = 0; k < 8; k++) { const i = k & 3, lx = x + LX[i] * cs - LY[i] * sn, ly = y + LX[i] * sn + LY[i] * cs, lz = k < 4 ? z : z + h; V.push([ly - cam[1], lz - cam[2], lx - cam[0]]); }
    const add = (idx, f) => { const poly = idx.map(i => V[i]); if (poly.some(v => v[2] < 2)) return; let dd = 0; for (const v of poly) dd += v[2]; faces.push({ d: dd / 4, p: poly, c: shade(col, f) }); };
    add([4, 5, 6, 7], 1.12);
    for (let i = 0; i < 4; i++) { const nx = FPN[i][0] * cs - FPN[i][1] * sn, ny = FPN[i][0] * sn + FPN[i][1] * cs, j = (i + 1) & 3, mx = x + (LX[i] + LX[j]) / 2 * cs - (LY[i] + LY[j]) / 2 * sn, my = y + (LX[i] + LX[j]) / 2 * sn + (LY[i] + LY[j]) / 2 * cs; if (nx * (mx - cam[0]) + ny * (my - cam[1]) >= 0) continue; add([i, j, j + 4, i + 4], Math.round((0.72 + 0.13 * (nx - ny)) * 20) / 20); }
  }
  faces.sort((a, b) => b.d - a.d); G.strokeStyle = 'rgba(0,0,0,0.5)'; G.lineWidth = 1;
  const ox = innerWidth * 0.56, oy = innerHeight * 0.6, VK = 0.45;
  for (const f of faces) { G.beginPath(); f.p.forEach((v, k) => { const X = ox + v[0] / v[2] * F * VK, Y = oy - v[1] / v[2] * F * VK; k ? G.lineTo(X, Y) : G.moveTo(X, Y); }); G.closePath(); G.fillStyle = f.c; G.fill(); G.stroke(); }
}
function drawCockpit(veh, t) {
  const W = innerWidth, H = innerHeight;
  if (veh === S.p.inShip) {
    G.fillStyle = 'rgba(20,28,38,0.95)'; G.beginPath(); G.moveTo(0, H); G.lineTo(0, H * 0.78); G.lineTo(W * 0.25, H * 0.7); G.lineTo(W * 0.75, H * 0.7); G.lineTo(W, H * 0.78); G.lineTo(W, H); G.fill();
    G.strokeStyle = '#5fd4ff'; G.lineWidth = 2; G.strokeRect(W * 0.42, H * 0.76, W * 0.16, H * 0.12);
    G.fillStyle = '#5fd4ff'; G.font = '900 14px "Courier New"'; G.textAlign = 'center'; G.fillText('HÖHE ' + Math.round(veh.z) + ' · RUMPF ' + Math.round(veh.hp) + ' · SCHILD ' + Math.round(veh.shield), W / 2, H * 0.82);
    G.fillStyle = 'rgba(95,212,255,0.08)'; G.fillRect(0, 0, W, 4); G.fillRect(0, 0, 4, H * 0.75); G.fillRect(W - 4, 0, 4, H * 0.75);
  } else { G.fillStyle = 'rgba(30,24,20,0.92)'; G.fillRect(0, H * 0.82, W, H * 0.18); G.fillStyle = '#2a2a2a'; G.beginPath(); G.arc(W / 2, H * 0.95, H * 0.12, Math.PI, 0); G.lineWidth = 14; G.strokeStyle = '#1a1a1a'; G.stroke(); }
}
function renderFPLighting(t) {
  const dark = ambientDark(); if (dark < 0.03) return; const W = innerWidth, H = innerHeight;
  const gr = G.createRadialGradient(W / 2, H * 0.55, 40, W / 2, H * 0.55, Math.max(W, H) * 0.6);
  const col = S.W.ambient === 'under' ? '6,18,12' : S.W.ambient === 'station' ? '8,12,22' : '4,8,28';
  gr.addColorStop(0, 'rgba(' + col + ',' + dark * 0.25 + ')'); gr.addColorStop(1, 'rgba(' + col + ',' + Math.min(0.92, dark * 1.15) + ')'); G.fillStyle = gr; G.fillRect(0, 0, W, H);
  G.globalCompositeOperation = 'lighter';
  for (const L of LIGHTS) { const v = fpCamSpace(L.x, L.y, 30); if (v[2] < 10 || v[2] > 900) continue; const s = fpProject(v), r = L.r * FP.cam.F / v[2] * 0.6; if (r < 4) continue; const g2 = G.createRadialGradient(s[0], s[1], 0, s[0], s[1], r); g2.addColorStop(0, 'rgba(' + L.col + ',' + 0.35 * dark + ')'); g2.addColorStop(1, 'rgba(' + L.col + ',0)'); G.fillStyle = g2; G.fillRect(s[0] - r, s[1] - r, r * 2, r * 2); }
  G.globalCompositeOperation = 'source-over';
}
