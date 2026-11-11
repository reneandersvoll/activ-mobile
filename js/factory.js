'use strict';
// ===================== PLANETEN-INDUSTRIE: Strom, Bänder, Messgeräte, Atmosphäre =====================
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const DIR_NAMES = ['→ Ost', '↓ Süd', '← West', '↑ Nord'];
function initAtmo(seed) {
  const r = mulberry32((seed ^ 0x5eed) >>> 0), t = ['toxisch', 'alkalisch', 'normal'].sort(() => r() - 0.5), ids = ['vyr', 'korrax', 'nimbara', 'aurum'], out = {}, ph = {};
  ids.forEach((id, i) => { out[id] = i < 3 ? t[i] : t[Math.floor(r() * 3)]; const A = ATMO[out[id]]; ph[id] = +(A.ph[0] + r() * (A.ph[1] - A.ph[0])).toFixed(1); });
  return { atmo: out, ph };
}
function isPB(b) { return b && BUILD[b.type] && BUILD[b.type].planet; }
function planetId() { return S.where === 'planet' ? S.W.planet.id : null; }
function atmoHere() { const id = planetId(); return id ? ATMO[S.atmo[id]] : null; }
function frontTile(b) {
  const d = DIRS[b.rot || 0];
  if (b.w === 1 && b.h === 1) return [b.gx + d[0], b.gy + d[1]];
  if (d[0] === 1) return [b.gx + b.w, b.gy + Math.floor(b.h / 2)]; if (d[0] === -1) return [b.gx - 1, b.gy + Math.floor(b.h / 2)];
  if (d[1] === 1) return [b.gx + Math.floor(b.w / 2), b.gy + b.h]; return [b.gx + Math.floor(b.w / 2), b.gy - 1];
}
function inBubble(x, y) { for (const b of S.buildings) if (b.type === 'scrubber' && b.powered && Math.hypot(b.x - x, b.y - y) < 280 + (b.level - 1) * 60) return true; return false; }
// ---------- Netze ----------
function rebuildNets() {
  const list = S.buildings.filter(isPB); S.nets = [];
  for (const b of list) { b.net = -1; if (b.type === 'pcable') { b.cnb = { e: isPB(gridAt(b.gx + 1, b.gy)), w: isPB(gridAt(b.gx - 1, b.gy)), s: isPB(gridAt(b.gx, b.gy + 1)), n: isPB(gridAt(b.gx, b.gy - 1)) }; b.skey = null; } }
  for (const b of list) {
    if (b.net >= 0) continue; const net = { bs: [], prod: 0, use: 0, stor: 0, cap: 0, ok: false }, q = [b]; b.net = S.nets.length; S.nets.push(net);
    while (q.length) {
      const c = q.pop(); net.bs.push(c);
      for (let j = c.gy - 1; j <= c.gy + c.h; j++) for (let i = c.gx - 1; i <= c.gx + c.w; i++) {
        const corner = (i === c.gx - 1 || i === c.gx + c.w) && (j === c.gy - 1 || j === c.gy + c.h); if (corner) continue;
        const n = gridAt(i, j); if (isPB(n) && n.net < 0) { n.net = b.net; q.push(n); }
      }
    }
  }
  const W = S.W, nodeKind = W.planet ? W.planet.node : null;
  for (const b of list) if (b.type === 'drill') b.nearNode = W.nodes.some(n => n.kind === nodeKind && n.hp > 0 && Math.hypot(n.x - b.x, n.y - b.y) < 110);
  S.factoryDirty = false;
}
function genOutput(b, t) {
  const env = PLANET_ENV[planetId()] || { sun: 1, wind: 1, geo: 1 }, A = atmoHere(), L = 1 + 0.35 * (b.level - 1);
  switch (BUILD[b.type].gen) {
    case 'solar': return 7 * env.sun * (0.25 + 0.75 * S.dayness) * (A && A === ATMO.normal ? 1.25 : 1) * L;
    case 'wind': return (3 + 5 * (0.5 + 0.5 * Math.sin(t * 0.37 + b.id * 1.7) * Math.sin(t * 0.11 + b.id))) * env.wind * L;
    case 'geo': return 14 * env.geo * L;
    case 'reactor': return 45 * L;
  }
  return 0;
}
function deliverItem(t, res) {
  if (!t) return false;
  if (t.type === 'belt') { if (t.item) return false; t.item = { res, p: 0 }; return true; }
  if (t.type === 'container') {
    S.res[res] = (S.res[res] || 0) + 1; t.count = (t.count || 0) + 1; t.pop = 1; S.stats.factory = (S.stats.factory || 0) + 1;
    S.floaters.push({ x: t.x + R(-10, 10), y: t.y, z: 60, text: '+1 ' + RES[res].s, col: RES[res].col, life: 1, big: false }); SFX.tone(1200 + Math.random() * 300, 0.05, 'triangle', 0.05);
    if (t.count % 25 === 0) { announce('📦 ' + t.count + ' GELIEFERT!', 'Deine Fabrik läuft wie geschmiert', '#ffd84a'); SFX.play('cash'); S.rings.push({ x: t.x, y: t.y, r: 5, max: 140, col: '255,216,74', life: 0.8 }); addXp(40); } else addXp(2);
    return true;
  }
  if (t.type === 'smelter') { if ((t.inp || 0) >= 8) return false; t.inp = (t.inp || 0) + 1; t.inRes = res; return true; }
  return false;
}
function pushBuffer(b) { if (!b.buf || !b.buf.length) return; const [fx, fy] = frontTile(b), t = gridAt(fx, fy); if (t && t !== b && deliverItem(t, b.buf[0])) b.buf.shift(); }
// ---------- Update ----------
function updateFactory(dt) {
  if (S.where !== 'planet') return;
  if (S.factoryDirty || !S.nets) rebuildNets();
  const t = performance.now() / 1000, pid = planetId(), A = atmoHere(), p = S.p;
  for (const n of S.nets) { n.prod = 0; n.use = 0; n.stor = 0; n.cap = 0; }
  for (const b of S.buildings) {
    if (!isPB(b)) continue; const d = BUILD[b.type], n = S.nets[b.net]; if (!n) continue;
    if (d.gen) { b.out = genOutput(b, t); n.prod += b.out; }
    if (d.use) n.use += d.use; if (d.store) { b.stor = b.stor || 0; n.stor += b.stor; n.cap += d.store * b.level; }
  }
  for (const n of S.nets) {
    const diff = n.prod - n.use;
    if (diff >= 0) { n.ok = n.use > 0 || n.prod > 0; let charge = diff * dt * 0.6; for (const b of n.bs) if (BUILD[b.type].store && charge > 0) { const cap = BUILD[b.type].store * b.level, add = Math.min(charge, cap - b.stor); b.stor += add; charge -= add; } }
    else { let need = -diff * dt; for (const b of n.bs) if (BUILD[b.type].store && need > 0) { const take = Math.min(need, b.stor); b.stor -= take; need -= take; } n.ok = need <= 0.0001; n.drain = true; }
    n.stor = 0; for (const b of n.bs) if (BUILD[b.type].store) { n.stor += b.stor; b.charge = b.stor / (BUILD[b.type].store * b.level); }
    for (const b of n.bs) { const d = BUILD[b.type]; b.powered = d.use ? n.ok : (d.gen || d.store || b.type === 'pcable') ? true : n.ok; if (b.type === 'pcable') b.powered = n.prod > 0; }
  }
  S.sensorOn = false;
  for (const b of S.buildings) {
    if (!isPB(b)) continue; b.pop = Math.max(0, (b.pop || 0) - dt * 3); b.flash = Math.max(0, (b.flash || 0) - dt);
    switch (b.type) {
      case 'wind': b.rotor = (b.rotor || 0) + dt * (1 + (b.out || 0) * 0.5); break;
      case 'drill': b.buf = b.buf || []; if (b.powered && b.buf.length < 6) { b.prog = (b.prog || 0) + dt * (b.nearNode ? 2 : 1); if (b.prog >= 6) { b.prog = 0; b.buf.push(S.W.planet.res); burst(b.x, b.y, 40, RES[S.W.planet.res].col, 6, 90); SFX.play('stone'); } if (Math.random() < dt * 6) burst(b.x, b.y, 4, '#8a7a5a', 1, 60); } pushBuffer(b); break;
      case 'belt': if (b.item && b.powered) { b.item.p += dt / 0.7; if (b.item.p >= 1) { const [fx, fy] = frontTile(b), tb = gridAt(fx, fy); if (tb && tb !== b && deliverItem(tb, b.item.res)) b.item = null; else b.item.p = 1; } } break;
      case 'smelter': b.buf = b.buf || []; if (b.powered && (b.inp || 0) > 0 && b.buf.length <= 4) { b.prog = (b.prog || 0) + dt; if (Math.random() < dt * 8) smoke(b.x - 20, b.y - 18, 95, 'rgba(90,80,70,0.5)', 1); if (b.prog >= 3.5) { b.prog = 0; b.inp--; b.buf.push(b.inRes, b.inRes); burst(b.x, b.y, 30, '#ff8a2a', 12, 120); SFX.tone(400, 0.2, 'sawtooth', 0.06, 1.5); } } pushBuffer(b); break;
      case 'analyzer':
        if (b.powered && !S.atmoKnown[pid]) { b.prog = (b.prog || 0) + dt; if (Math.random() < dt * 10) burst(b.x, b.y, 55, '#5fd4ff', 1, 30, { nograv: true }); if (b.prog >= 6) { S.atmoKnown[pid] = true; const AA = ATMO[S.atmo[pid]]; announce(AA.icon + ' ATMOSPHÄRE: ' + AA.n, 'pH ' + S.atmoPh[pid] + ' · ' + AA.desc, AA.col); SFX.play('crate'); S.flash = 0.6; S.flashCol = hexToRgbStr(AA.col); for (let i = 0; i < 3; i++) S.rings.push({ x: b.x, y: b.y, r: 10 + i * 20, max: 500, col: hexToRgbStr(AA.col), life: 1 + i * 0.2 }); addXp(220, b.x, b.y); b.skey = null; } }
        break;
      case 'scanner':
        if (b.powered && !S.W.scanned) { b.prog = (b.prog || 0) + dt; if (b.prog >= 8) { S.W.scanned = true; const nk = S.W.planet.node; let n = 0; for (let k = 0; k < 40 && n < 6; k++) { const a = R(0, 6.28), r = R(180, 560), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (x < 80 || y < 80 || x > WORLD - 80 || y > WORLD - 80 || !freeAt(S.W, x, y, 20) || gridAt(Math.floor(x / TILE), Math.floor(y / TILE))) continue; const nd = addNode(S.W, x, y, nk); if (nd) { nd.sc = 1.45; nd.rich = true; S.W.lightsStatic.push({ x, y, r: 110, col: S.W.planet.light, safe: false, node: nd }); S.rings.push({ x, y, r: 5, max: 100, col: hexToRgbStr(RES[S.W.planet.res].col), life: 1.2 }); n++; } } announce('📡 ' + n + ' REICHE ERZADERN GEORTET!', 'Auf der Minimap markiert · Bohrturm daneben = doppelte Förderung', '#5fff8a'); SFX.play('streak'); MINI_DIRTY = true; addXp(150); S.factoryDirty = true; } }
        break;
      case 'sensor': if (b.powered) S.sensorOn = true; break;
      case 'pturret':
        if (b.powered) { b.cd = (b.cd || 0) - dt; let best = null, bd = 360 + 40 * b.level; for (const z of S.zombies) { const dd = Math.hypot(z.x - b.x, z.y - b.y); if (dd < bd) { bd = dd; best = z; } }
          if (best) { const ta = Math.atan2(best.y - b.y, best.x - b.x); b.headAng = (b.headAng || 0) + angDiff(b.headAng || 0, ta) * Math.min(1, dt * 8); if (b.cd <= 0) { b.cd = 0.34 / b.level; b.flash = 0.08; const mx = b.x + Math.cos(ta) * 22, my = b.y + Math.sin(ta) * 22; S.bullets.push({ x: mx, y: my, z: 26, vx: Math.cos(ta) * 900, vy: Math.sin(ta) * 900, life: 0.6, dmg: 40 * b.level, src: 'turret', px: mx, py: my, laser: true }); SFX.play('laser'); } } }
        break;
    }
  }
  // Atmosphäre
  S.atmoHurt = Math.max(0, (S.atmoHurt || 0) - dt);
  if (A && A.dmg > 0 && !p.inShip && S.phase === 'play' && !inBubble(p.x, p.y)) {
    p.hp -= A.dmg * dt; S.atmoHurt = Math.min(1, S.atmoHurt + dt * 2); S.inHazard = true;
    if (!S.atmoWarned) { S.atmoWarned = true; UI.toast((S.atmoKnown[pid] ? A.icon + ' ' + A.n + ': ' : '⚠ Unbekannte Atmosphäre: ') + 'Du verlierst Leben! Atmo-Filter bauen.'); }
    if (p.hp <= 0) playerDie();
  } else S.inHazard = false;
  if (A && A.bdmg > 0) for (const b of S.buildings.slice()) { if (b.type === 'scrubber' || inBubble(b.x, b.y)) continue; b.hp -= A.bdmg * dt; if (b.hp <= 0) removeBuilding(b, false); }
  // Angriffswellen
  const base = S.buildings.filter(isPB);
  if (base.length >= 3) {
    S.pwaveT = (S.pwaveT === undefined ? 110 : S.pwaveT) - dt;
    if (S.pwaveT <= 10 && !S.pwaveWarn && S.sensorOn) { S.pwaveWarn = true; announce('👁 BIO-SENSOR: WELLE IN 10s', 'Massive Lebenszeichen nähern sich der Basis', '#ff5e3a'); SFX.play('night'); }
    if (S.pwaveT <= 0) {
      S.pwaveN = (S.pwaveN || 0) + 1; S.pwaveT = 95; S.pwaveWarn = false;
      const cx = base.reduce((a, b) => a + b.x, 0) / base.length, cy = base.reduce((a, b) => a + b.y, 0) / base.length, n = 4 + (S.W.danger || 1) * 2 + S.pwaveN, a0 = R(0, 6.28);
      let made = 0; for (let k = 0; k < n * 4 && made < n; k++) { const a = a0 + R(-0.7, 0.7), r = R(620, 820), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (x < 60 || y < 60 || x > WORLD - 60 || y > WORLD - 60 || staticHit(x, y, 14) || blockedFor(x, y, 'zombie')) continue; spawnZombie(pickZType(), x, y); const z = S.zombies[S.zombies.length - 1]; z.siege = { x: cx, y: cy }; made++; }
      announce('⚠ ANGRIFFSWELLE ' + S.pwaveN, made + ' Kreaturen greifen deine Kolonie an!', '#ff5e3a'); SFX.play('streak'); shake(8);
    }
  }
}
// ---------- Rendering ----------
function factoryBoxes(t) {
  if (S.where !== 'planet') return;
  for (const b of S.buildings) {
    if (b.type === 'belt' && b.item) { const d = DIRS[b.rot || 0], k = b.item.p - 0.5; addModel([[0, 0, 0, 12, 12, 10, RES[b.item.res].col], [0, 0, 10, 8, 8, 2, hexShade(RES[b.item.res].col, 1.3)]], b.x + d[0] * k * TILE, b.y + d[1] * k * TILE, 6, t, 1); }
    if (b.type === 'pturret') addModel(pturretHead(b), b.x, b.y, 0, b.headAng || 0, 1);
  }
}
function factoryUnderlay(t) {
  if (S.where !== 'planet') return;
  for (const b of S.buildings) if (b.type === 'scrubber' && b.powered) { const q = P(b.x, b.y, 0), r = 280 + (b.level - 1) * 60; G.strokeStyle = 'rgba(95,255,180,' + (0.35 + Math.sin(t * 2) * 0.15) + ')'; G.lineWidth = 3; G.setLineDash([10, 8]); G.beginPath(); G.ellipse(q.x, q.y, r * IX * 1.414 * VIEW.zoom, r * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.stroke(); G.setLineDash([]); G.fillStyle = 'rgba(95,255,180,0.05)'; G.fill(); }
  if (S.build.on) for (const b of S.buildings) if (BUILD[b.type].rot) { const d = DIRS[b.rot || 0], a = P(b.x, b.y, 8), c = P(b.x + d[0] * TILE * 0.7, b.y + d[1] * TILE * 0.7, 8); G.strokeStyle = '#ffd84a'; G.lineWidth = 3; G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(c.x, c.y); G.stroke(); }
  G.lineWidth = 1;
}
function factoryLabels(t) {
  if (S.where !== 'planet') return; const pid = planetId();
  G.textAlign = 'center'; G.font = '900 11px "Trebuchet MS", Arial';
  for (const b of S.buildings) {
    if (!isPB(b) || !onScreen(b.x, b.y) || b.type === 'pcable' || b.type === 'belt') continue;
    const d = BUILD[b.type]; let txt = '', col = '#bff4ff';
    if (d.gen) { txt = '⚡ +' + (b.out || 0).toFixed(1); col = '#5fff8a'; }
    else if (d.store) { txt = '🔋 ' + Math.round((b.charge || 0) * 100) + '%'; col = (b.charge || 0) > 0.3 ? '#5fff8a' : '#ffb020'; }
    else if (b.type === 'container') { txt = '📦 ' + (b.count || 0); col = '#ffd84a'; }
    else if (d.use && !b.powered) { txt = Math.floor(t * 2) % 2 ? '⚡ KEIN STROM' : '⚡ −' + d.use; col = '#ff5e3a'; }
    else if (b.type === 'analyzer') { txt = S.atmoKnown[pid] ? ATMO[S.atmo[pid]].icon + ' ' + ATMO[S.atmo[pid]].n + ' · pH ' + S.atmoPh[pid] : '⚗ ANALYSE ' + Math.min(100, Math.round((b.prog || 0) / 6 * 100)) + '%'; col = S.atmoKnown[pid] ? ATMO[S.atmo[pid]].col : '#5fd4ff'; }
    else if (b.type === 'scanner') { txt = S.W.scanned ? '📡 ADERN GEORTET' : '📡 SCAN ' + Math.min(100, Math.round((b.prog || 0) / 8 * 100)) + '%'; col = '#5fff8a'; }
    else if (b.type === 'sensor') { txt = '👁 ' + S.zombies.length + ' Lebensformen · Welle ' + Math.max(0, Math.ceil(S.pwaveT || 0)) + 's'; col = S.pwaveT < 15 ? '#ff5e3a' : '#bff4ff'; }
    else if (b.type === 'drill') { txt = '⛏ ' + (b.nearNode ? '×2 ' : '') + Math.round((b.prog || 0) / 6 * 100) + '% · ' + DIR_NAMES[b.rot || 0]; col = '#ffb020'; }
    else if (b.type === 'smelter') { txt = '🏭 ' + (b.inp || 0) + ' → ' + (b.buf ? b.buf.length : 0); col = '#ff8a2a'; }
    else if (d.use) { txt = '⚡ −' + d.use; col = '#9fc4d0'; }
    if (!txt) continue;
    const q = P(b.x, b.y, 70 + b.h * 14), w = G.measureText(txt).width + 12;
    G.fillStyle = 'rgba(4,10,16,0.75)'; G.fillRect(q.x - w / 2, q.y - 12, w, 16); G.strokeStyle = col; G.lineWidth = 1; G.strokeRect(q.x - w / 2, q.y - 12, w, 16); G.fillStyle = col; G.fillText(txt, q.x, q.y);
  }
}
function factoryHud() {
  if (S.where !== 'planet') return ''; const pid = planetId(), A = ATMO[S.atmo[pid]], known = S.atmoKnown[pid];
  let prod = 0, use = 0, stor = 0, cap = 0; for (const n of S.nets || []) { prod += n.prod; use += n.use; stor += n.stor; cap += n.cap; }
  const items = S.buildings.filter(b => b.type === 'container').reduce((a, b) => a + (b.count || 0), 0);
  let h = `<b style="color:${known ? A.col : '#ff9a3c'}">${known ? A.icon + ' ATMOSPHÄRE: ' + A.n + ' · pH ' + S.atmoPh[pid] : '⚠ ATMOSPHÄRE: ??? (Analysator bauen)'}</b>`;
  if (S.inHazard) h += `<br><span style="color:#ff5e3a">☣ Die Atmosphäre schadet dir – Atmo-Filter bauen!</span>`;
  h += `<hr><b>⚡ STROMNETZ</b> <span style="color:${prod >= use ? '#5fff8a' : '#ff5e3a'}">${prod.toFixed(1)} / ${use.toFixed(1)}</span>`;
  h += `<div class="bar" style="height:8px;margin-top:4px"><div style="width:${use ? Math.min(100, prod / use * 100) : 100}%;background:${prod >= use ? '#5fff8a' : '#ff5e3a'}"></div></div>`;
  if (cap) h += `🔋 ${Math.round(stor)}/${Math.round(cap)} · `;
  h += `📦 ${items} geliefert`;
  if (S.sensorOn) h += `<br><span style="color:${S.pwaveT < 15 ? '#ff5e3a' : '#bff4ff'}">👁 Nächste Welle: ${Math.max(0, Math.ceil(S.pwaveT || 0))}s</span>`;
  return h;
}
