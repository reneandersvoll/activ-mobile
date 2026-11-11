'use strict';
// ===================== RAUMSCHIFF, WELTRAUM, STATION, PLANETEN =====================
function shipMaxHp(sh) { return 300 + (sh.up.hull || 0) * 120; }
function shipMaxShield(sh) { return (sh.up.shield || 0) * 90; }
function newShip() { const sp = S.mainW.shipPad; return { owned: true, world: 'main', x: sp.x, y: sp.y, z: 0, a: -0.8, vx: 0, vy: 0, hp: 300, shield: 0, up: {}, paint: 'white', state: 'parked', fireCd: 0, reentry: 0, noHit: 0, orbit: 'earth' }; }
function crewHas(role) { return S.crew.some(c => c.role === role); }
function stationRange() { return 1 + (S.station.up.engine || 0) + (crewHas('navigator') ? 1 : 0); }

function boardShip() { const sh = S.ship; S.p.inShip = sh; sh.state = 'flying'; SFX.play('dock'); announce('COCKPIT', 'WASD fliegen · LEERTASTE steigen · C sinken · SHIFT Boost · Klick = Laser', '#7ad7ff'); }
function exitShip() { const sh = S.ship; if (sh.z > 3) return; S.p.inShip = null; sh.state = 'parked'; S.p.x = sh.x + 50; S.p.y = sh.y + 40; if (staticHit(S.p.x, S.p.y, 9)) { S.p.x = sh.x - 50; } SFX.play('door'); }
function damageShip(d) {
  const sh = S.ship; if (!sh) return;
  sh.noHit = 3; sh.hitFx = 0.3;
  if (sh.shield > 0) { const a = Math.min(sh.shield, d); sh.shield -= a; d -= a; SFX.tone(900, 0.06, 'sine', 0.05, 0.6); }
  if (d <= 0) return;
  sh.hp -= d; shake(4); SFX.play('hurt');
  if (sh.hp <= 0) shipDestroyed();
}
function shipDestroyed() {
  const sh = S.ship; explode(sh.x, sh.y, 140, 0, 'none'); S.p.inShip = null;
  UI.transition('NOTKAPSEL AUSGELÖST', 'Das Schiff wird zur Landeplattform vor Neu-Eden geschleppt', () => {
    const sp = S.mainW.shipPad; Object.assign(sh, { world: 'main', x: sp.x, y: sp.y, z: 0, state: 'parked', hp: Math.round(shipMaxHp(sh) * 0.3), shield: 0, vx: 0, vy: 0, orbit: 'earth' });
    switchWorld('main', S.mainW, sp.x + 60, sp.y + 50); S.p.hp = Math.max(20, S.p.hp * 0.5); S.phase = 'play';
  }, 1600);
}
function fireShip(sh) {
  if (sh.fireCd > 0) return;
  const L = sh.up.laser || 0, m = aimPoint(), a = Math.atan2(m.y - sh.y, m.x - sh.x), dmg = 20 * (1 + 0.3 * L) * (crewHas('gunner') ? 1.25 : 1) * (1 + 0.2 * perk('dmg'));
  const offs = L === 0 ? [0] : L === 1 ? [-22, 22] : L === 2 ? [-30, -22, 22, 30] : [-30, -22, 0, 22, 30];
  const z = S.where === 'space' ? 30 : Math.max(20, sh.z + 10), c = Math.cos(sh.a), s = Math.sin(sh.a);
  for (const o of offs) { const gx = sh.x - s * o, gy = sh.y + c * o; S.bullets.push({ x: gx, y: gy, z, vx: Math.cos(a) * 1300, vy: Math.sin(a) * 1300, life: 0.8, dmg, src: 'ship', px: gx, py: gy, laser: true }); }
  sh.fireCd = 0.16; SFX.play('laser');
}
function updateShipFlight(dt, sh) {
  const p = S.p, space = S.where === 'space';
  let ix = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0), iy = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
  const il = Math.hypot(ix, iy), boosting = (KEYS.ShiftLeft || KEYS.ShiftRight) && sh.up.boost && il > 0;
  const maxV = 430 * (1 + 0.35 * (sh.up.boost || 0)) * (crewHas('pilot') ? 1.2 : 1) * (perk('pilot') ? 1.1 : 1) * (boosting ? 1.6 : 1) * (space ? 1.3 : 1);
  const up = KEYS.Space, down = KEYS.KeyC || KEYS.ControlLeft;
  sh.fireCd -= dt; sh.noHit -= dt; sh.hitFx = Math.max(0, (sh.hitFx || 0) - dt);
  if (sh.noHit <= 0) sh.shield = Math.min(shipMaxShield(sh), sh.shield + dt * 12);
  if (crewHas('engineer')) sh.hp = Math.min(shipMaxHp(sh), sh.hp + dt * 2);
  if (!space) {
    if (up) sh.z = Math.min(560, sh.z + dt * 200); else if (down) sh.z = Math.max(0, sh.z - dt * 180); else if (sh.z > 0 && sh.z < 30) sh.z = Math.min(30, sh.z + dt * 60);
    if (sh.z <= 0 && down) {
      if (sh.state !== 'parked') {
        sh.state = 'parked'; sh.vx = sh.vy = 0; shake(5); burst(sh.x, sh.y, 2, '#a8c8e8', 25, 160); SFX.play('dock');
        const pad = helipad(), sp = S.W.shipPad, onPad = (pad && S.where === 'main' && Math.hypot(pad.x - sh.x, pad.y - sh.y) < 90) || (sp && Math.hypot(sp.x - sh.x, sp.y - sh.y) < 90);
        if (onPad) { sh.hp = shipMaxHp(sh); sh.shield = shipMaxShield(sh); announce('GELANDET', 'Plattform: Schiff vollständig repariert', '#7ad7ff'); } else UI.toast('Gelandet · E zum Aussteigen');
      }
    } else if (sh.z > 0) sh.state = 'flying';
    if (sh.z >= 520) { goToSpace(); return; }
  } else {
    if (down) { sh.reentry += dt; if (Math.random() < dt * 20) burst(sh.x, sh.y, 30, '#ff9a3c', 2, 120); if (sh.reentry >= 1.6) { sh.reentry = 0; leaveSpace(); return; } } else sh.reentry = Math.max(0, sh.reentry - dt * 2);
  }
  const canMove = space || sh.z > 12;
  if (il > 0 && canMove) { ix /= il; iy /= il; let wx, wy; if (S.fp) { const c = Math.cos(sh.a), s = Math.sin(sh.a), f = -iy, r = ix; wx = c * f - s * r * 0.4; wy = s * f + c * r * 0.4; sh.a += ix * dt * 2.2 * (sh.up.wings ? 1.4 : 1); } else { wx = (ix + iy) / 1.414; wy = (-ix + iy) / 1.414; } sh.vx += wx * 900 * dt; sh.vy += wy * 900 * dt; }
  sh.vx *= Math.pow(space ? 0.55 : 0.3, dt); sh.vy *= Math.pow(space ? 0.55 : 0.3, dt);
  const sp = Math.hypot(sh.vx, sh.vy); if (sp > maxV) { sh.vx *= maxV / sp; sh.vy *= maxV / sp; }
  if (!S.fp && sp > 20) sh.a += angDiff(sh.a, Math.atan2(sh.vy, sh.vx)) * Math.min(1, dt * (sh.up.wings ? 6 : 4));
  sh.x = clamp(sh.x + sh.vx * dt, 60, WORLD - 60); sh.y = clamp(sh.y + sh.vy * dt, 60, WORLD - 60);
  sh.thrust = (il > 0 && canMove) || up; sh.boosting = boosting;
  if (sh.thrust && Math.random() < dt * 30) { const bx = sh.x - Math.cos(sh.a) * 45, by = sh.y - Math.sin(sh.a) * 45; S.particles.push({ x: bx, y: by, z: (space ? 30 : sh.z) + 12, vx: -Math.cos(sh.a) * 120 + R(-20, 20), vy: -Math.sin(sh.a) * 120 + R(-20, 20), vz: 0, life: 0.4, max: 0.4, col: boosting ? '#ff9a3c' : '#7ff4ff', s: 4, grav: 0, light: 60 }); }
  if (sh.thrust) { sh.sndT = (sh.sndT || 0) - dt; if (sh.sndT <= 0) { sh.sndT = 0.16; SFX.play('thrust'); } }
  if (MOUSE.down && !UI.blocking() && !S.build.on && (space || sh.z > 10)) fireShip(sh);
  if (!space && sh.z < 30 && sp > 50) for (const z of S.zombies) if (!z.dead && Math.hypot(z.x - sh.x, z.y - sh.y) < 40) damageZombie(z, 40, 'ship');
  p.x = sh.x; p.y = sh.y; p.a = sh.a;
  holdInteract(dt);
}
function goToSpace() {
  const sh = S.ship; sh.orbit = S.where === 'main' ? 'earth' : S.where === 'planet' ? S.W.planet.id : sh.orbit;
  if (S.where === 'main') S.lastMainPos = { x: sh.x, y: sh.y };
  if (S.dayness < 0.35 && S.where === 'main') S.awayNight = true;
  SFX.play('warp');
  UI.transition('ORBIT ERREICHT', 'Atmosphäre verlassen · ' + PLANETS.find(p => p.id === sh.orbit).n, () => {
    const has = S.station.at === sh.orbit;
    if (!S.spaceW || S.spaceW.at !== sh.orbit) S.spaceW = makeSpaceWorld(sh.orbit);
    const W = S.spaceW; if (!has && W.stationProp) { W.props.splice(W.props.indexOf(W.stationProp), 1); for (const co of W.chunkObjs) co.props = co.props.filter(q => q !== W.stationProp); for (const b of W.buckets) { const i = b.indexOf(W.stationProp); if (i >= 0) b.splice(i, 1); } W.stationProp = null; W.station = null; }
    if (W.stationProp) W.stationProp.owned = S.station.owned;
    sh.z = 0; sh.state = 'flying'; sh.vx = sh.vy = 0; S.p.inShip = sh;
    const sx = W.station ? W.station.x + 520 : W.size * TILE / 2, sy = W.station ? W.station.y + 300 : W.size * TILE / 2;
    switchWorld('space', W, sx, sy); S.spawnT = 6;
    if (W.station && !S.station.visited.found) { S.station.visited.found = true; setTimeout(() => announce('UNBEKANNTE STATION ENTDECKT', 'Flieg hin und docke an (E). Vorsicht: Drohnen!', '#5fd4ff'), 900); }
    else announce('WELTRAUM', 'C halten = Wiedereintritt · E an der Station = Andocken', '#a58cff');
  }, 1500);
}
function leaveSpace() {
  const sh = S.ship, o = sh.orbit; SFX.play('warp');
  UI.transition('WIEDEREINTRITT', PLANETS.find(p => p.id === o).n + ' · ' + PLANETS.find(p => p.id === o).sub, () => {
    S.p.inShip = sh; sh.z = 460; sh.state = 'flying'; sh.vx = sh.vy = 0;
    if (o === 'earth') { const lp = S.lastMainPos || S.mainW.shipPad; switchWorld('main', S.mainW, lp.x, lp.y); }
    else { const W = makePlanetWorld(o); switchWorld('planet', W, W.shipPad.x, W.shipPad.y); S.spawnT = 5; if (!S.station.visited[o]) { S.station.visited[o] = true; S.stats.planets++; addXp(300); } setTimeout(() => announce(W.planet.n, W.planet.sub + ' · Exklusiv: ' + RES[W.planet.res].n, W.planet.col[0]), 400); }
  }, 1600);
}
function dockStation() {
  const sh = S.ship; SFX.play('dock');
  UI.transition('ANDOCKEN', S.station.owned ? 'Willkommen zurück an Bord, Kommandant' : 'Warnung: Lebenszeichen an Bord …', () => {
    const W = makeStationWorld(S.station.owned);
    sh.z = 0; sh.state = 'parked'; sh.vx = sh.vy = 0; S.p.inShip = null; sh.world = 'station'; sh.x = W.shipPad.x; sh.y = W.shipPad.y; sh.a = 0;
    switchWorld('station', W, W.spawn.x, W.spawn.y); sh.world = 'station';
    if (!S.station.owned) { for (const [x, y, t] of [[15, 9, 'xeno'], [12, 15, 'xeno'], [18, 15, 'xeno'], [15, 21, 'xbrute'], [24, 13, 'xeno'], [6, 8, 'xeno'], [24, 24, 'xeno'], [22, 6, 'xeno'], [10, 24, 'xeno'], [15, 12, 'xbrute']]) spawnZombie(t, x * TILE, y * TILE); announce('STATION BESETZT', 'Schalte die Xenos aus und hacke den Kern (E halten)', '#ff5e3a'); }
    else { S.crew.forEach((c, i) => addNpc(W, (12 + (i % 3) * 3) * TILE, (17 + Math.floor(i / 3) * 2) * TILE, 0, c.look, null, c.name, { wander: true, crew: c.role })); announce('STATION »AURORA«', 'Orbit: ' + PLANETS.find(p => p.id === S.station.at).n + ' · Kontrollzentrum am Hologramm', '#5fd4ff'); }
  }, 1300);
}
function undockStation() {
  const sh = S.ship; SFX.play('dock');
  UI.transition('ABDOCKEN', 'Hangartore öffnen …', () => {
    const at = S.station.at; sh.orbit = at;
    if (!S.spaceW || S.spaceW.at !== at) S.spaceW = makeSpaceWorld(at);
    const W = S.spaceW; if (W.stationProp) W.stationProp.owned = S.station.owned;
    S.p.inShip = sh; sh.state = 'flying'; sh.z = 0;
    switchWorld('space', W, W.station.x + 300, W.station.y + 200); S.spawnT = 8;
  }, 1100);
}
function takeoverStation() {
  const near = S.zombies.filter(z => !z.dead && Math.hypot(z.x - S.W.core.x, z.y - S.W.core.y) < 700).length;
  if (near) { UI.toast('⚠ Noch ' + near + ' Xenos in der Nähe des Kerns!'); SFX.play('deny'); return; }
  S.station.owned = true; SFX.play('jackpot'); S.flash = 0.7; S.flashCol = '95,212,255'; shake(12);
  for (let i = 0; i < 4; i++) S.rings.push({ x: S.W.core.x, y: S.W.core.y, r: 10 + i * 30, max: 600, col: '95,212,255', life: 1 + i * 0.2 });
  addXp(600); announce('STATION ÜBERNOMMEN!', 'Sie gehört dir. Heuere in Neu-Eden eine Crew an, um zu anderen Planeten zu springen.', '#5fd4ff');
  setTimeout(() => { if (S && S.where === 'station') { const sh = S.ship, W = makeStationWorld(true); switchWorld('station', W, S.p.x, S.p.y); sh.world = 'station'; sh.x = W.shipPad.x; sh.y = W.shipPad.y; S.crew.forEach((c, i) => addNpc(W, (12 + i * 3) * TILE, 17 * TILE, 0, c.look, null, c.name, { wander: true, crew: c.role })); } }, 2600);
}
function travelTo(pid) {
  const P0 = PLANETS.find(p => p.id === pid);
  UI.closeAll(); SFX.play('warp');
  Warp.play(P0, () => { S.station.at = pid; S.spaceW = null; S.ship.orbit = pid; announce('ANKUNFT: ' + P0.n, P0.sub + ' · Abdocken und landen!', P0.col[0]); addXp(150); });
}
function genCrewOffers() {
  const roles = Object.keys(CREW_ROLES);
  S.crewOffers = [0, 1, 2, 3].map(() => { const role = pick(roles), skill = RI(1, 3); return { name: pick(CREW_FIRST) + ' ' + pick(CREW_LAST), role, skill, price: 2500 + skill * 2500 + RI(0, 1500), look: npcLook('spacer') }; });
}

// ---------- Warp-Animation ----------
const Warp = {
  play(P0, done) {
    const cv = $('warpCv'), box = $('warp'); box.classList.remove('hidden'); UI.overlay = 'warp';
    cv.width = innerWidth; cv.height = innerHeight; const g = cv.getContext('2d'), stars = []; for (let i = 0; i < 500; i++) stars.push({ a: R(0, 6.283), r: R(5, 50), s: R(0.5, 2) });
    const t0 = performance.now(), dur = 3200;
    $('warpTxt').textContent = 'SPRUNG NACH ' + P0.n;
    const step = now => {
      const k = (now - t0) / dur, W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, sp = k < 0.7 ? Math.pow(k / 0.7, 2) : 1 - (k - 0.7) / 0.3;
      g.fillStyle = 'rgba(2,3,12,0.35)'; g.fillRect(0, 0, W, H);
      for (const s of stars) { s.r += (2 + sp * 60) * s.s; if (s.r > Math.max(W, H)) s.r = R(5, 30); const x = cx + Math.cos(s.a) * s.r, y = cy + Math.sin(s.a) * s.r, len = sp * 40 * s.s; g.strokeStyle = sp > 0.5 ? 'rgba(170,220,255,0.9)' : 'rgba(255,255,255,0.8)'; g.lineWidth = s.s; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(s.a) * len, y - Math.sin(s.a) * len); g.stroke(); }
      const tun = g.createRadialGradient(cx, cy, 0, cx, cy, 200 + sp * 300); tun.addColorStop(0, 'rgba(' + hexToRgbStr(P0.col[0]) + ',' + (0.5 * sp) + ')'); tun.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = tun; g.fillRect(0, 0, W, H);
      if (k > 0.85) { g.fillStyle = 'rgba(255,255,255,' + ((k - 0.85) / 0.15) + ')'; g.fillRect(0, 0, W, H); }
      if (k < 1) requestAnimationFrame(step); else { box.classList.add('hidden'); UI.overlay = null; done(); S.flash = 0.8; S.flashCol = '255,255,255'; }
    };
    requestAnimationFrame(step);
  }
};

// ---------- Hologramm-Kontrollzentrum ----------
const HoloUI = {
  sel: null, pts: [], t0: 0,
  open() { UI.overlay = 'holo'; UI.show('holo'); SFX.play('holo'); this.sel = this.sel || PLANETS.find(p => p.id !== S.station.at).id; this.panel(); const cv = $('holoCv'); cv.onclick = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height; let best = null, bd = 50; for (const p of this.pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } if (best) { this.sel = best.id; SFX.play('holo'); this.panel(); } }; },
  panel() {
    const P0 = PLANETS.find(p => p.id === this.sel), here = S.station.at === P0.id, dist = Math.abs(P0.dist - PLANETS.find(p => p.id === S.station.at).dist) || (here ? 0 : 1), rng = stationRange();
    let why = here ? 'Du bist bereits hier.' : !S.station.owned ? 'Station nicht übernommen.' : S.crew.length < 3 ? 'Mindestens 3 Crewmitglieder nötig (' + S.crew.length + '/3). Anheuern: Raumfahrtbehörde in Neu-Eden.' : dist > rng ? 'Außer Reichweite (' + dist + ' > ' + rng + '). Warp-Antrieb verbessern.' : null;
    let h = `<div class="hp-title" style="color:${P0.col[0]}">${P0.n}</div><div class="hp-sub">${P0.sub}</div>`;
    h += `<div class="hp-row"><span>Sprungdistanz</span><b>${dist}</b></div><div class="hp-row"><span>Reichweite</span><b>${rng}</b></div>`;
    if (P0.res) h += `<div class="hp-row"><span>Exklusiv</span><b style="color:${RES[P0.res].col}">${RES[P0.res].ic} ${RES[P0.res].n}</b></div><div class="hp-row"><span>Gefahr</span><b style="color:#ff5e3a">${'☠'.repeat(P0.danger)}</b></div>`;
    h += `<div class="hp-row"><span>Besucht</span><b>${S.station.visited[P0.id] ? '✔' : '—'}</b></div>`;
    h += `<button class="btn gold big" id="hJump" ${why ? 'disabled' : ''} style="width:100%;margin-top:10px">🌀 SPRUNG STARTEN</button>${why ? `<div class="hp-warn">${why}</div>` : ''}`;
    h += '<div class="hp-sec">STATIONS-UPGRADES</div>';
    for (const [k, u] of Object.entries(STATION_UP)) { const lv = S.station.up[k] || 0, max = lv >= u.max, c = cleanCost(u.cost(lv + 1)); h += `<div class="hp-up ${max ? 'own' : ''}"><b>${u.icon} ${u.n} ${u.max > 1 ? lv + '/' + u.max : ''}</b><small>${u.d}</small><button class="btn sm" data-su="${k}" ${max || !canAfford(c) || !S.station.owned ? 'disabled' : ''}>${max ? 'MAX' : costStr(c)}</button></div>`; }
    h += '<div class="hp-sec">CREW (' + S.crew.length + '/5)</div>' + (S.crew.length ? S.crew.map(c => `<div class="hp-row"><span>${CREW_ROLES[c.role].icon} ${c.name}</span><b>${'★'.repeat(c.skill)}</b></div>`).join('') : '<div class="hp-warn">Keine Crew. Anheuern in Neu-Eden (Raumfahrtbehörde).</div>');
    h += '<button class="btn" id="hShip" style="width:100%;margin-top:10px">🚀 HANGAR: Schiff aufrüsten</button>';
    $('holoPanel').innerHTML = h;
    const j = $('hJump'); if (j) j.onclick = () => travelTo(P0.id);
    $('hShip').onclick = () => { UI.hide('holo'); ShipUI.open(); };
    $('holoPanel').querySelectorAll('[data-su]').forEach(b => b.onclick = () => { const k = b.dataset.su, u = STATION_UP[k], lv = S.station.up[k] || 0, c = cleanCost(u.cost(lv + 1)); if (!canAfford(c)) return; pay(c); S.station.up[k] = lv + 1; SFX.play('upgrade'); S.flash = 0.3; S.flashCol = '95,212,255'; addXp(80); UI.toast(u.n + ' → Stufe ' + (lv + 1)); this.panel(); });
  },
  render(dt) {
    const cv = $('holoCv'); if (!cv || UI.overlay !== 'holo') return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, t = performance.now() / 1000, cx = W / 2, cy = H / 2 + 20;
    g.fillStyle = '#020a14'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(95,212,255,0.12)'; g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(cx + i * 50, cy - 40); g.lineTo(cx + i * 120, H); g.stroke(); } for (let j = 0; j < 8; j++) { const y = cy - 40 + Math.pow(j / 8, 1.6) * (H - cy + 40); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const sun = g.createRadialGradient(cx, cy, 2, cx, cy, 60); sun.addColorStop(0, '#fff8d0'); sun.addColorStop(0.4, 'rgba(255,200,90,0.8)'); sun.addColorStop(1, 'rgba(255,150,40,0)'); g.fillStyle = sun; g.beginPath(); g.arc(cx, cy, 60, 0, 6.283); g.fill();
    const rng = stationRange(), curD = PLANETS.find(p => p.id === S.station.at).dist;
    for (let d = 0; d <= 3; d++) { const rx = 110 + d * 95, ry = rx * 0.38; g.strokeStyle = 'rgba(95,212,255,' + (Math.abs(d - curD) <= rng ? 0.45 : 0.12) + ')'; g.setLineDash(d % 2 ? [6, 6] : []); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.283); g.stroke(); }
    g.setLineDash([]);
    const rr = 110 + (curD + rng) * 95; g.strokeStyle = 'rgba(125,255,90,' + (0.25 + Math.sin(t * 3) * 0.15) + ')'; g.lineWidth = 2; g.setLineDash([3, 8]); g.beginPath(); g.ellipse(cx, cy, Math.min(rr, 420), Math.min(rr, 420) * 0.38, 0, 0, 6.283); g.stroke(); g.setLineDash([]);
    this.pts = [];
    PLANETS.forEach((P0, i) => {
      const rx = 110 + P0.dist * 95, ang = t * (0.15 / (1 + P0.dist)) + i * 2.1, x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * rx * 0.38, r = P0.id === 'earth' ? 18 : 14 + P0.dist * 2;
      const inR = Math.abs(P0.dist - curD) <= rng || P0.id === S.station.at;
      g.globalAlpha = inR ? 1 : 0.35;
      g.strokeStyle = 'rgba(95,212,255,0.25)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 60); g.stroke();
      const pg = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r); pg.addColorStop(0, P0.col[2]); pg.addColorStop(0.5, P0.col[0]); pg.addColorStop(1, P0.col[1]);
      g.fillStyle = pg; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(' + hexToRgbStr(P0.col[0]) + ',0.6)'; g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.45, -0.3, 0, 6.283); g.stroke();
      const glow = g.createRadialGradient(x, y, r, x, y, r * 2.4); glow.addColorStop(0, 'rgba(' + hexToRgbStr(P0.col[0]) + ',0.35)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 2.4, 0, 6.283); g.fill();
      if (this.sel === P0.id) { g.strokeStyle = '#ffd84a'; g.lineWidth = 2; const s = r + 10 + Math.sin(t * 5) * 3; g.strokeRect(x - s, y - s, s * 2, s * 2); g.lineWidth = 1; }
      if (S.station.at === P0.id) { g.fillStyle = '#5fd4ff'; g.beginPath(); g.moveTo(x, y - r - 22); g.lineTo(x - 7, y - r - 34); g.lineTo(x + 7, y - r - 34); g.fill(); }
      g.font = '900 13px "Courier New"'; g.textAlign = 'center'; g.fillStyle = inR ? '#bff4ff' : '#4a7a8a'; g.fillText(P0.n, x, y + r + 18);
      g.globalAlpha = 1; this.pts.push({ id: P0.id, x, y });
    });
    for (let y = 0; y < H; y += 3) { g.fillStyle = 'rgba(95,212,255,0.035)'; g.fillRect(0, y, W, 1); }
    g.fillStyle = 'rgba(95,212,255,' + (0.03 + Math.random() * 0.03) + ')'; g.fillRect(0, (t * 120) % H, W, 30);
    g.font = '900 15px "Courier New"'; g.textAlign = 'left'; g.fillStyle = '#5fd4ff'; g.fillText('> STATION AURORA // NAVIGATIONSHOLOGRAMM // ORBIT: ' + PLANETS.find(p => p.id === S.station.at).n, 16, 26);
  },
};

// ---------- Hangar: Schiff aufrüsten (Showcase) ----------
const ShipUI = {
  sel: null, fly: 0, flash: 0, rot: -0.7, drag: null, tab: 'up',
  open() {
    if (!S.ship) { UI.toast('Du besitzt kein Raumschiff.'); return; }
    UI.overlay = 'shipui'; UI.show('shipui'); this.sel = null; this.render(); SFX.play('holo');
    const cv = $('shipCv');
    cv.onmousedown = e => { this.drag = e.clientX; }; addEventListener('mouseup', () => { this.drag = null; });
    cv.onmousemove = e => { if (this.drag !== null) { this.rot += (e.clientX - this.drag) * 0.01; this.drag = e.clientX; } };
  },
  render() {
    const sh = S.ship, body = $('shipList');
    $('shipStats').innerHTML = `RUMPF ${Math.round(sh.hp)}/${shipMaxHp(sh)} · SCHILD ${shipMaxShield(sh)} · LASER ${['1x', '2x', '4x', '5x'][sh.up.laser || 0]} · TEMPO ${Math.round(100 + 35 * (sh.up.boost || 0))}%`;
    document.querySelectorAll('#shipui .tab').forEach(t => t.classList.toggle('act', t.dataset.t === this.tab));
    let h = '';
    if (this.tab === 'up') {
      for (const [k, u] of Object.entries(SHIP_UP)) { const lv = sh.up[k] || 0, max = lv >= u.max, c = cleanCost(u.cost(lv + 1)); h += `<div class="aitem ${max ? 'own' : ''} ${this.sel === k ? 'sel' : ''}" data-k="${k}"><b>${u.icon} ${u.n} ${u.max > 1 ? '(' + lv + '/' + u.max + ')' : ''}</b><small>${u.d}</small><small style="color:${max ? '#4dff6a' : canAfford(c) ? '#ffe066' : '#ff8080'}">${max ? '✔ MAXIMAL' : costStr(c)}</small></div>`; }
    } else {
      for (const p of SHIP_PAINTS) { const own = sh.paint === p.id, bought = (sh.paints || []).includes(p.id) || p.price === 0; h += `<div class="aitem ${own ? 'own' : ''}" data-paint="${p.id}"><b><span style="display:inline-block;width:14px;height:14px;background:${p.col};border:2px solid ${p.acc};vertical-align:middle"></span> ${p.n}</b><small>${own ? '✔ AKTIV' : bought ? 'Gekauft – klicken' : fmtMoney(p.price)}</small></div>`; }
      h += `<div class="aitem" data-fix="1"><b>🔧 Rumpf reparieren</b><small>${costStr({ scrap: 20, titan: 1 })}</small></div>`;
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-k]').forEach(d => d.onclick = () => { const k = d.dataset.k, u = SHIP_UP[k]; if ((sh.up[k] || 0) >= u.max) return; this.sel = k; this.fly = 1; SFX.tone(300, 0.3, 'sawtooth', 0.06, 3); this.render(); });
    body.querySelectorAll('[data-paint]').forEach(d => d.onclick = () => { const p = SHIP_PAINTS.find(x => x.id === d.dataset.paint); sh.paints = sh.paints || []; if (!sh.paints.includes(p.id) && p.price > 0) { if (!spendMoney(p.price)) return; sh.paints.push(p.id); } sh.paint = p.id; this.flash = 1; SFX.play('crate'); this.render(); });
    body.querySelectorAll('[data-fix]').forEach(d => d.onclick = () => { if (!canAfford({ scrap: 20, titan: 1 })) { SFX.play('deny'); return; } pay({ scrap: 20, titan: 1 }); sh.hp = shipMaxHp(sh); SFX.play('upgrade'); this.render(); });
    const cb = $('shipConfirm');
    if (this.sel) {
      const u = SHIP_UP[this.sel], lv = sh.up[this.sel] || 0, c = cleanCost(u.cost(lv + 1)), ok = canAfford(c);
      cb.innerHTML = `<div class="info">${u.n} → Stufe ${lv + 1}<br><span style="color:${ok ? '#ffe066' : '#ff8080'}">${costStr(c)}${ok ? '' : ' – Material fehlt'}</span></div><button class="btn red" id="sCancel">ABBRECHEN</button><button class="btn gold" id="sOk" ${ok ? '' : 'disabled'}>✔ EINBAUEN</button>`;
      $('sCancel').onclick = () => { this.sel = null; this.render(); };
      $('sOk').onclick = () => { if (!canAfford(c)) return; pay(c); sh.up[this.sel] = lv + 1; if (this.sel === 'hull') sh.hp = shipMaxHp(sh); if (this.sel === 'shield') sh.shield = shipMaxShield(sh); this.sel = null; this.flash = 1; SFX.play('upgrade'); addXp(80); jobXp('mech', 1); S.flash = 0.3; S.flashCol = '120,220,255'; const cv = $('shipCv'); cv.classList.remove('flashfx'); void cv.offsetWidth; cv.classList.add('flashfx'); this.render(); UI.toast(u.n + ' eingebaut!'); };
    } else cb.innerHTML = '<div class="info" style="color:#9fc4d0">Upgrade wählen – es fliegt von oben ans Schiff. Ziehen = drehen.</div>';
  },
  draw(dt) {
    const cv = $('shipCv'); if (!cv || UI.overlay !== 'shipui') return;
    const g = cv.getContext('2d'), t = performance.now() / 1000, sh = S.ship;
    g.clearRect(0, 0, cv.width, cv.height);
    const bg = g.createRadialGradient(cv.width / 2, cv.height * 0.6, 20, cv.width / 2, cv.height * 0.6, cv.width * 0.7); bg.addColorStop(0, '#1c2c44'); bg.addColorStop(1, '#04070e'); g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(t * 2 + i) * 0.2) + ')'; g.fillRect((i * 137) % cv.width, (i * 71) % (cv.height * 0.5), 2, 2); }
    if (this.drag === null) this.rot += dt * 0.25;
    const sG = G, sV = Object.assign({}, VIEW), sO = OUTLINE;
    G = g; OUTLINE = true; Object.assign(VIEW, { cx: 0, cy: 0, ox: cv.width / 2, oy: cv.height / 2 + 70, zoom: 4.2 }); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1;
    isoEllipse(0, 0, 0, 48, 'rgba(95,212,255,0.12)'); g.strokeStyle = 'rgba(95,212,255,' + (0.4 + Math.sin(t * 3) * 0.2) + ')'; g.lineWidth = 2; const c0 = P(0, 0, 0); g.beginPath(); g.ellipse(c0.x, c0.y, 48 * IX * 1.414 * 4.2, 48 * IY * 1.414 * 4.2, 0, 0, 6.283); g.stroke(); g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,0.55)';
    const base = shipParts(sh, t, { flying: true, thrust: true }), withSel = this.sel ? shipParts(Object.assign({}, sh, { up: Object.assign({}, sh.up, { [this.sel]: (sh.up[this.sel] || 0) + 1 }) }), t, { flying: true, thrust: true }) : base;
    const keys = new Set(base.map(p => p.slice(0, 7).join(',')));
    this.fly = Math.max(0, this.fly - dt * 1.3); const e = Math.pow(this.fly, 2), bounce = this.fly > 0 && this.fly < 0.2 ? Math.sin(this.fly / 0.2 * Math.PI) * 2 : 0;
    BOXES = []; const hov = 12 + Math.sin(t * 2) * 2;
    addModel(base, 0, 0, hov, this.rot, 1);
    if (this.sel) addModel(withSel.filter(p => !keys.has(p.slice(0, 7).join(','))), 0, 0, hov + e * 60 + bounce, this.rot + e * 3, 1, 0.95, 40);
    flushBoxes();
    G = sG; Object.assign(VIEW, sV); OUTLINE = sO;
    if (this.flash > 0) { this.flash -= dt * 1.5; g.fillStyle = 'rgba(160,230,255,' + Math.max(0, this.flash) * 0.5 + ')'; g.fillRect(0, 0, cv.width, cv.height); for (let i = 0; i < 30; i++) { const a = i / 30 * 6.283 + t, r = (1 - this.flash) * 320; g.fillStyle = i % 2 ? '#7ff4ff' : '#ffd84a'; g.fillRect(cv.width / 2 + Math.cos(a) * r, cv.height / 2 + Math.sin(a) * r * 0.5, 6, 6); } }
    g.fillStyle = '#7ad7ff'; g.font = '900 13px "Courier New"'; g.fillText('> HANGAR // ' + (SHIP_PAINTS.find(p => p.id === sh.paint) || SHIP_PAINTS[0]).n.toUpperCase(), 14, 22);
  },
};
