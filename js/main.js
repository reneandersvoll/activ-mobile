'use strict';
// ===================== MAIN: Loop, Menüs, Input, Speichern =====================
const CV = $('game'); let DPR = 1, QUALITY_LOW = false;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, QUALITY_LOW ? 1 : 1.5); CV.width = innerWidth * DPR; CV.height = innerHeight * DPR; }
addEventListener('resize', resize); resize();
const CTX = CV.getContext('2d');
function showErr(e) { const el = $('err'); el.classList.remove('hidden'); el.textContent = 'Fehler (Spiel läuft weiter): ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n') : e); clearTimeout(showErr._t); showErr._t = setTimeout(() => el.classList.add('hidden'), 8000); }
window.addEventListener('error', ev => showErr(ev.error || ev.message));
const TIPS = ['Monster entstehen nur in der Dunkelheit – baue Licht!', 'Mausrad zoomt. Shift+Mausrad wechselt den Slot.', 'Setz ein Geschütz direkt auf eine Mauer – sie verschmelzen zum Wehrturm!', 'Auf Planeten: erst Strom, dann Analysator – sonst weißt du nicht, was du atmest.', 'Fließbänder brauchen Strom. Bohrturm → Band → Frachtcontainer = Rohstoffe im Schlaf.', 'In den Schluchten kommt niemand rüber – außer über Brücken.', 'Im HQ steht eine Garderobe. Neuer Look gefällig?', 'Im Westen steht eine verlassene Funkstation. Repariere das Funkgerät!', 'Neu-Eden liegt hinter goldenen Mauern im Südwesten.', 'Mit einem Himmelsloft darfst du ein Raumschiff kaufen.', 'Steig mit dem Raumschiff über Höhe 520 – dann bist du im Orbit.', 'Die tote Station im Orbit kann man entern und übernehmen.', 'Auf fremden Planeten gibt es Ressourcen, die es auf der Erde nicht gibt.', 'Ohne Crew kein Sprung. Die Raumfahrtbehörde vermittelt nur an Angesehene.', 'Bist du nachts nicht da, greifen Monster deine Basis trotzdem an.', 'Im Grasmeer im Südosten gibt es kein Holz – aber viel Platz.'];
function setupMenuWorld() {
  S = newState(12345); S.phase = 'menu'; S.time = 0.86; S.zoom = 0.85;
  const c = 64, put = (type, gx, gy, lvl) => { const d = BUILD[type]; placeBuilding({ gx, gy, w: d.w, h: d.h }, true, { type, level: lvl || 1, hp: 9999 }); };
  put('hq', c - 1, c - 1, 3);
  for (let i = -4; i <= 4; i++) { if (Math.abs(i) <= 1) { put('gate', c + i, c + 4, 2); continue; } put('wall', c + i, c - 4, 2); put('wall', c + i, c + 4, 3); put('wall', c - 4, c + i, 2); put('wall', c + 4, c + i, 3); }
  put('turret', c - 3, c - 3, 2); put('turret', c + 3, c + 3, 2); put('lamp', c - 3, c + 3, 2); put('farm', c + 1, c - 3); put('fire', c - 3, c + 1); put('generator', c + 2, c + 1); put('helipad', c + 6, c - 2, 2);
  S.ship = newShip(); Object.assign(S.ship, { x: (c + 7.5) * TILE, y: (c - 0.5) * TILE, z: 90, up: { laser: 2, wings: 1, boost: 1, shield: 1 }, paint: 'piltover', state: 'flying' });
  const car = S.W.starterCar; car.wreck = false; car.hp = 220; car.x = (c + 6) * TILE; car.y = (c + 4) * TILE; car.a = 1.2; car.up = { ram: 1, lights: 1 }; car.lightsOn = true;
  S.p.x = c * TILE + 24; S.p.y = c * TILE + 24; prewarmChunks(S.W, S.p.x, S.p.y, 3);
}
function startNewGame() {
  $('loading').classList.remove('hidden'); $('loadTxt').textContent = 'WILDNIS WIRD GENERIERT …';
  setTimeout(() => {
    try {
      S = newState(Math.floor(Math.random() * 1e9)); S.phase = 'intro'; refreshHotbar();
      S.city.offers = genCityTasks(false); S.city.fixer = genCityTasks(true); genOffers(); genExpOffers();
      UI.closeAll(); UI.hide('menu'); UI.hide('editor'); $('hud').classList.add('hidden');
      $('introHint').classList.remove('hidden'); $('introHint').querySelector('.t').textContent = 'LEERTASTE · ABSPRINGEN'; $('introHint').querySelector('.s').textContent = 'Transportflug über die überwucherte Zone';
      const ct = camTarget(S.plane.x, S.plane.y, S.plane.z); VIEW.cx = ct.x; VIEW.cy = ct.y; prewarmChunks(S.W, ct.x, ct.y, 3);
    } catch (e) { showErr(e); }
    $('loading').classList.add('hidden');
  }, 60);
}
function jump() { if (S.phase !== 'intro') return; S.phase = 'fall'; S.p.x = S.plane.x - 40; S.p.y = S.plane.y; S.p.alt = S.plane.z - 10; S.p.chute = 0; S.introT = 0; for (const k in KEYS) KEYS[k] = false; SFX.noise(0.6, 0.25, 1500); $('introHint').querySelector('.t').textContent = 'WASD · LANDUNG STEUERN'; $('introHint').querySelector('.s').textContent = 'Fallschirm öffnet automatisch'; }
function land() {
  const p = S.p; p.alt = 0;
  if (staticHit(p.x, p.y, 10) || blockedFor(p.x, p.y, 'player')) { outer: for (let r = 20; r < 500; r += 20) for (let a = 0; a < 6.28; a += 0.5) { const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (!staticHit(x, y, 10) && !blockedFor(x, y, 'player')) { p.x = x; p.y = y; break outer; } } }
  S.phase = 'play'; $('introHint').classList.add('hidden'); $('hud').classList.remove('hidden'); refreshHotbar(); UI.updateHud(true);
  burst(p.x, p.y, 5, '#a88a5a', 30, 160); shake(8); announce('WILLKOMMEN, ' + (LOOK.name || 'SURVIVOR').toUpperCase(), 'Fälle Bäume (Klick) · B = Bauen · E = Interagieren', '#b8ff6a');
  setTimeout(() => S && S.phase === 'play' && UI.toast('Gerüchte: Im Westen soll eine alte Funkstation stehen …'), 6000);
}
function saveGame(auto) {
  if (!S || S.phase !== 'play') return; if (S.exp) { if (!auto) UI.toast('Während einer Expedition kann nicht gespeichert werden.'); return; }
  if (S.where === 'planet' && S.W.planet) S.pbases[S.W.planet.id] = S.buildings.map(serializeB);
  const W = S.mainW, towers = []; W.props.forEach((p, i) => { if (p.tower && (p.tower.looted || p.tower.restock)) towers.push([i, p.tower.looted, p.tower.restock]); });
  const city = Object.assign({}, S.city); if (city.task && city.task.type === 'rescue') city.task = null;
  const ship = S.ship ? Object.assign({}, S.ship) : null; if (ship && ship.world !== 'main') { const sp = W.shipPad; Object.assign(ship, { world: 'main', x: sp.x, y: sp.y, z: 0, state: 'parked' }); } if (ship) { ship.z = 0; ship.state = 'parked'; ship.vx = ship.vy = 0; }
  const data = { v: 9, seed: S.seed, time: S.time, day: S.day, night: S.night, wasNight: S.wasNight, weather: S.weather, lastNoonDay: S.lastNoonDay, res: S.res, p: { x: S.where === 'main' ? S.p.x : W.eden.x + 40, y: S.where === 'main' ? S.p.y : W.eden.y + 20, hp: S.p.hp, maxHp: S.p.maxHp, hunger: S.p.hunger, mag: S.p.mag, slot: S.p.slot },
    buildings: S.mainB.map(serializeB), pbases: S.pbases, atmoKnown: S.atmoKnown, cars: W.cars.map((c, i) => ({ i, x: c.x, y: c.y, a: c.a, wreck: c.wreck, hp: c.hp, maxHp: c.maxHp, fuel: c.fuel, up: c.up })),
    heli: W.heli ? { x: W.heli.x, y: W.heli.y, a: W.heli.a, wreck: W.heli.wreck, hp: W.heli.hp, maxHp: W.heli.maxHp, fuel: W.heli.fuel, up: W.heli.up } : null,
    crates: W.crates.filter(c => !c.open).map(c => ({ x: c.x, y: c.y, rarity: c.rarity, air: !!c.air })), trees: W.trees.map((t, i) => t.hp < t.max ? [i, t.hp, t.regrow] : null).filter(Boolean), nodes: W.nodes.map((n, i) => n.hp < n.max ? [i, n.hp, n.respawn] : null).filter(Boolean), towers,
    xp: S.xp, level: S.level, perks: S.perks, stats: S.stats, attach: S.attach, camo: S.camo, unlocked: S.unlocked, missions: S.missions, city, edenFound: S.edenFound, edenHint: S.edenHint, zoneSeen: S.zoneSeen, expOffers: S.expOffers,
    radioFixed: S.radioFixed, radioDropDay: S.radioDropDay, ship, station: S.station, crew: S.crew, date: new Date().toLocaleString('de-DE') };
  try { localStorage.setItem(Auth.saveKey(), JSON.stringify(data)); if (!auto) UI.toast('💾 Spiel gespeichert'); } catch (e) { UI.toast('Speichern fehlgeschlagen'); }
  updateMenuLoad();
}
function loadGame() {
  const raw = localStorage.getItem(Auth.saveKey()); if (!raw) return;
  $('loading').classList.remove('hidden'); $('loadTxt').textContent = 'SPIELSTAND WIRD GELADEN …';
  setTimeout(() => {
    try {
      const d = JSON.parse(raw); S = newState(d.seed);
      Object.assign(S, { time: d.time, day: d.day, night: d.night, wasNight: d.wasNight, weather: d.weather, lastNoonDay: d.lastNoonDay, xp: d.xp, level: d.level, perks: d.perks, stats: Object.assign(S.stats, d.stats), attach: Object.assign(S.attach, d.attach), camo: Object.assign(S.camo, d.camo), unlocked: d.unlocked || {}, missions: d.missions, edenFound: d.edenFound, edenHint: d.edenHint, zoneSeen: d.zoneSeen || {}, expOffers: d.expOffers || [], radioFixed: d.radioFixed, radioDropDay: d.radioDropDay || 0, station: d.station || S.station, crew: d.crew || [] });
      S.pbases = d.pbases || {}; S.atmoKnown = d.atmoKnown || {};
      S.city = Object.assign(S.city, d.city); Object.assign(S.res, d.res); Object.assign(S.p, d.p); S.ship = d.ship;
      const W = S.mainW;
      for (const b of d.buildings) placeBuilding({ gx: b.gx, gy: b.gy, w: b.w, h: b.h }, true, b);
      for (const c of d.cars) if (W.cars[c.i]) Object.assign(W.cars[c.i], c);
      if (d.heli && W.heli) Object.assign(W.heli, d.heli, { z: 0, state: 'parked', rot: 0, rotSpd: 0, vx: 0, vy: 0 });
      W.crates = d.crates.map(c => Object.assign({ opening: 0, open: false, hold: 0, z: 0 }, c));
      for (const [i, hp, rg] of d.trees) { const t = W.trees[i]; if (t) { t.hp = hp; t.regrow = rg; } }
      for (const [i, hp, rs] of d.nodes) { const n = W.nodes[i]; if (n) { n.hp = hp; n.respawn = rs; } }
      for (const [i, l, r] of d.towers || []) { const p = W.props[i]; if (p && p.tower) { p.tower.looted = l; p.tower.restock = r; } }
      if (S.radioFixed && W.radioHut) W.radioHut.fixed = true;
      S.dayness = smoothstep(0.2, 0.28, S.time) * (1 - smoothstep(0.76, 0.84, S.time)); if (S.wasNight) S.budget = 10 + S.night * 6;
      S.phase = 'play'; S.zoom = 0.9; refreshHotbar(); switchWorld('main', W, S.p.x, S.p.y);
      UI.closeAll(); UI.hide('menu'); $('hud').classList.remove('hidden'); $('introHint').classList.add('hidden'); UI.updateHud(true);
      announce('WILLKOMMEN ZURÜCK', 'Tag ' + S.day + ' · Level ' + S.level, '#b8ff6a');
    } catch (e) { showErr(e); }
    $('loading').classList.add('hidden');
  }, 60);
}
function updateMenuLoad() { if (Auth.user && !$('menu').classList.contains('hidden')) Lobby.refresh(); }
function toMenu() { if (S && S.phase === 'play') saveGame(true); UI.closeAll(); S.fp = false; $('hud').classList.add('hidden'); $('introHint').classList.add('hidden'); $('loading').classList.remove('hidden'); setTimeout(() => { setupMenuWorld(); $('loading').classList.add('hidden'); Lobby.show(); }, 50); }
function toggleFP() {
  return; // Ego-Perspektive deaktiviert
  if (!S || S.phase !== 'play') return; S.fp = !S.fp; S.build.on = false; S.fpPitch = -0.05; SFX.play('click');
  if (S.fp) { try { CV.requestPointerLock(); } catch (e) { } UI.toast('👁 EGO-PERSPEKTIVE · Maus = umsehen · V = zurück'); } else if (document.pointerLockElement) document.exitPointerLock();
}
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && S && S.fp && S.phase === 'play' && !UI.overlay) UI.openPause(); });
addEventListener('keydown', e => {
  SFX.init(); if (e.target && e.target.tagName === 'INPUT') return; const c = e.code;
  if (c === 'Space' || c.startsWith('Arrow') || c === 'Tab') e.preventDefault();
  if (c === 'Escape') {
    if (UI.overlay === 'editor') { UI.closeEditor(false); return; }
    if (UI.overlay === 'terminal' || UI.overlay === 'holo' || UI.overlay === 'shipui') { UI.closeAll(); return; }
    if (UI.overlay === 'city') { if (Casino.busy) return; UI.hide('citymenu'); UI.overlay = null; return; }
    if (UI.overlay === 'settings' || UI.overlay === 'help') { UI.hide(UI.overlay); UI.overlay = null; if (S.phase !== 'menu') UI.openPause(); return; }
    if (UI.overlay === 'pause') { UI.closeAll(); if (S.fp) try { CV.requestPointerLock(); } catch (er) { } return; }
    if (!$('editor').classList.contains('hidden')) { if (UI.editMode !== 'create') UI.closeEditor(false); return; }
    if (!UI.overlay && S && (S.phase === 'play' || S.phase === 'intro' || S.phase === 'fall')) { if (S.build.on) { S.build.on = false; return; } UI.openPause(); }
    return;
  }
  KEYS[c] = true; if (!S || UI.overlay) return;
  if (S.phase === 'intro' && c === 'Space') { jump(); return; }
  if (S.phase !== 'play') return;
  const p = S.p;
  if (c === 'KeyV') { toggleFP(); return; }
  if (c === 'Space' && p.inHeli) { heliLand(); return; }
  if (c === 'KeyB' && !p.inCar && !p.inHeli && !p.inShip) { if (S.where !== 'main' && S.where !== 'planet') { UI.toast('Hier kann nicht gebaut werden.'); return; } S.build.on = !S.build.on; if (S.build.on && S.fp) { S.fp = false; if (document.pointerLockElement) document.exitPointerLock(); } SFX.play('click'); }
  const digit = c.startsWith('Digit') ? (c === 'Digit0' ? 10 : +c.slice(5)) : 0;
  if (S.build.on) { const ch = c.startsWith('Digit') ? c.slice(5) : c.startsWith('Key') ? c.slice(3) : '', idx = KEYSET.indexOf(ch), ord = curOrder(); if (idx >= 0 && ord[idx]) { S.build.sel = ord[idx]; SFX.play('click'); } }
  else if (digit && digit <= HOTBAR.length) { p.slot = digit - 1; SFX.play('click'); p.reload = 0; }
  if (c === 'KeyR') { if (S.build.on) { S.build.rot = (S.build.rot + 1) % 4; SFX.play('click'); } else { const t = currentTool(); if (GUNS.includes(t)) startReload(t); } }
  if (c === 'KeyE' && !e.repeat) { const it = findInteract(); if (it && !it.hold && it.kind !== 'none') doInteract(it); else if (it && it.hold && !it.can) { SFX.play('deny'); UI.toast(it.text); } }
  if (c === 'KeyF') { if (S.res.food > 0 && p.hunger < 98) { S.res.food--; p.hunger = Math.min(100, p.hunger + 28); p.hp = Math.min(p.maxHp, p.hp + 5); floater(p.x, p.y, '+28 SATT', '#9cff6a'); SFX.play('pickup'); } else if (S.res.food <= 0) UI.toast('Keine Nahrung – Farmen, Beeren oder in der Stadt kaufen'); }
  if (S.build.on && S.hoverB) { if (c === 'KeyU') upgradeBuilding(S.hoverB); if (c === 'KeyX') removeBuilding(S.hoverB, true); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; MOUSE.down = false; });
CV.addEventListener('mousemove', e => {
  MOUSE.x = e.clientX; MOUSE.y = e.clientY;
  if (S && S.fp && S.phase === 'play' && !UI.overlay && Math.abs(e.movementX || 0) < 250 && Math.abs(e.movementY || 0) < 250) { const p = S.p; S.fpPitch = clamp(S.fpPitch - (e.movementY || 0) * 0.0022, -0.9, 0.9); if (p.inShip) p.inShip.a += (e.movementX || 0) * 0.0025; else if (!p.inCar && !p.inHeli) p.a += (e.movementX || 0) * 0.0028; }
});
CV.addEventListener('mousedown', e => {
  SFX.init(); MOUSE.x = e.clientX; MOUSE.y = e.clientY; if (e.button === 2) { MOUSE.right = true; return; }
  MOUSE.down = true; if (!S || UI.overlay || S.phase !== 'play') return;
  if (S.fp && !document.pointerLockElement) try { CV.requestPointerLock(); } catch (er) { }
  if (S.build.on) tryPlace();
});
addEventListener('mouseup', e => { if (e.button === 2) MOUSE.right = false; else MOUSE.down = false; if (S) S.build.lastTile = -1; });
CV.addEventListener('contextmenu', e => e.preventDefault());
CV.addEventListener('wheel', e => {
  if (!S || S.phase !== 'play' || UI.overlay) return;
  if (e.shiftKey) { if (S.build.on) { const O = curOrder(), i = Math.max(0, O.indexOf(S.build.sel)); S.build.sel = O[(i + (e.deltaY > 0 ? 1 : -1) + O.length) % O.length]; } else S.p.slot = (S.p.slot + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length; SFX.play('click'); return; }
  S.userZoom = clamp(S.userZoom * (e.deltaY > 0 ? 0.88 : 1.14), 0.45, 2.4);
}, { passive: true });
function tryPlace() { const m = screenToWorld(MOUSE.x, MOUSE.y), info = placementInfo(m.x, m.y), key = info.gx + info.gy * MAP; if (key === S.build.lastTile) return; S.build.lastTile = key; if (info.ok) placeBuilding(info); else SFX.play('deny'); }
$('cSave').onclick = () => UI.closeEditor(true);
$('cBack').onclick = () => UI.closeEditor(false);
document.querySelectorAll('.lb-nav button').forEach(b => b.onclick = () => Lobby.setTab(b.dataset.lt));
$('lbPlay').onclick = () => Lobby.play(); $('lbLogout').onclick = () => Auth.logout(); $('cRand').onclick = () => UI.randomLook(); $('prevCv').onclick = () => { UI.editWalk = !UI.editWalk; };
$('pResume').onclick = () => { UI.closeAll(); if (S.fp) try { CV.requestPointerLock(); } catch (e) { } };
$('pSave').onclick = () => saveGame(false);
$('pHelp').onclick = () => { UI.hide('pause'); UI.overlay = 'help'; UI.show('help'); };
$('pSet').onclick = () => { UI.hide('pause'); UI.overlay = 'settings'; UI.renderSettings(); UI.show('settings'); };
$('pMenu').onclick = () => toMenu();
$('pQuit').onclick = () => { saveGame(true); window.close(); setTimeout(() => { document.body.innerHTML = '<div style="display:flex;height:100vh;align-items:center;justify-content:center;flex-direction:column;font-family:Arial Black;color:#b8ff6a;background:#0b160f"><h1>SPIEL GESPEICHERT & BEENDET</h1><p style="color:#ccc;font-family:Arial">Du kannst diesen Tab jetzt schließen.</p></div>'; }, 200); };
$('sVol').oninput = e => { SETTINGS.vol = +e.target.value; UI.saveSettings(); UI.renderSettings(); };
$('sBack').onclick = () => { UI.hide('settings'); UI.overlay = null; if (S && S.phase !== 'menu') UI.openPause(); };
$('hBack').onclick = () => { UI.hide('help'); UI.overlay = null; if (S && S.phase !== 'menu') UI.openPause(); };
$('tClose').onclick = () => UI.closeAll();
document.querySelectorAll('#terminal .tab').forEach(t => t.onclick = () => { UI.tab = t.dataset.t; UI.armSel = null; SFX.play('click'); UI.renderTab(); });
$('dRespawn').onclick = () => { UI.closeAll(); respawn(); };
$('dMenu').onclick = () => { S.exp = null; S.phase = 'menu'; toMenu(); };

let lowFpsT = 0, last = performance.now(), fpsAcc = 0, fpsN = 0, menuSpawn = 0, tipT = 0;
function update(dt) {
  const p = S.p;
  if (S.phase === 'menu') {
    S.time = (S.time + dt / 160) % 1; S.dayness = smoothstep(0.2, 0.28, S.time) * (1 - smoothstep(0.76, 0.84, S.time)); collectLights();
    menuSpawn -= dt; if (menuSpawn <= 0 && S.zombies.length < 14) { menuSpawn = 1.2; const a = R(0, 6.28); spawnZombie(Math.random() < 0.2 ? 'runner' : 'walker', p.x + Math.cos(a) * 650, p.y + Math.sin(a) * 650); }
    updateZombies(dt); updateBuildings(dt); updateProjectiles(dt); updateNature(dt); updateEffects(dt); for (const b of S.buildings) b.hp = b.max;
    const sh = S.ship, tt = performance.now() / 4000; sh.x = 64 * TILE + Math.cos(tt) * 260; sh.y = 64 * TILE + Math.sin(tt) * 260; sh.a = tt + Math.PI / 2; sh.z = 110 + Math.sin(tt * 3) * 20; sh.thrust = true;
    const t = performance.now() / 6000, ct = camTarget(p.x + Math.cos(t) * 240, p.y + Math.sin(t) * 240, 0); VIEW.cx = lerp(VIEW.cx || ct.x, ct.x, dt * 2); VIEW.cy = lerp(VIEW.cy || ct.y, ct.y, dt * 2);
    tipT -= dt; if (tipT <= 0) { tipT = 6; $('tipTxt').textContent = pick(TIPS); } return;
  }
  if (UI.overlay) return;
  if (S.phase === 'intro') { S.plane.x += 240 * dt; if (S.plane.x > WORLD - 600) jump(); const ct = camTarget(S.plane.x, S.plane.y, S.plane.z); VIEW.cx = lerp(VIEW.cx, ct.x, Math.min(1, dt * 3)); VIEW.cy = lerp(VIEW.cy, ct.y, Math.min(1, dt * 3)); S.zoom = 0.7; S.time += dt / DAY_LEN; S.dayness = 1; collectLights(); updateEffects(dt); return; }
  if (S.phase === 'fall') {
    S.plane.x += 240 * dt; S.introT += dt;
    const ix = (KEYS.KeyD ? 1 : 0) - (KEYS.KeyA ? 1 : 0), iy = (KEYS.KeyS ? 1 : 0) - (KEYS.KeyW ? 1 : 0), il = Math.hypot(ix, iy) || 1, wx = (ix + iy) / 1.414 / il, wy = (-ix + iy) / 1.414 / il;
    p.x = clamp(p.x + wx * 190 * dt, 80, WORLD - 80); p.y = clamp(p.y + wy * 190 * dt, 80, WORLD - 80); if (ix || iy) p.a = Math.atan2(wy, wx);
    if (S.introT > 0.9 && !p.chute) { p.chute = 1; SFX.noise(0.4, 0.3, 900); shake(5); }
    p.alt -= (p.chute ? 85 : 260) * dt; const ct = camTarget(p.x, p.y, Math.max(0, p.alt)); VIEW.cx = lerp(VIEW.cx, ct.x, Math.min(1, dt * 4)); VIEW.cy = lerp(VIEW.cy, ct.y, Math.min(1, dt * 4)); S.zoom = lerp(S.zoom, 0.9, dt);
    S.time += dt / DAY_LEN; S.dayness = 1; collectLights(); updateEffects(dt); if (p.alt <= 0) land(); return;
  }
  if (S.phase === 'dead') { updateEffects(dt); return; }
  S.stats.played += dt; updateWorldTime(dt); collectLights(); updatePlayer(dt);
  if (S.build.on && MOUSE.down && (S.build.sel === 'wall' || S.build.sel === 'gate')) tryPlace();
  S.hoverB = S.build.on ? (bldAt(screenToWorld(MOUSE.x, MOUSE.y).x, screenToWorld(MOUSE.x, MOUSE.y).y) || null) : null;
  updateZombies(dt); updateBuildings(dt); updateFactory(dt); updateProjectiles(dt); updateNature(dt); updateEffects(dt); updateCityTask(dt); updateExpedition(dt); checkMission();
  if (inCity()) updateCityLife(dt);
  const h = p.inHeli, sh = p.inShip, tgt = p.inCar || h || sh || p;
  const look = p.inCar ? { x: Math.cos(p.inCar.a) * p.inCar.v * 0.35, y: Math.sin(p.inCar.a) * p.inCar.v * 0.35 } : h ? { x: h.vx * 0.5, y: h.vy * 0.5 } : sh ? { x: sh.vx * 0.4, y: sh.vy * 0.4 } : (() => { const m = screenToWorld(MOUSE.x, MOUSE.y); return { x: (m.x - p.x) * 0.12, y: (m.y - p.y) * 0.12 }; })();
  const ct = camTarget(tgt.x + look.x, tgt.y + look.y, h ? h.z * 0.6 : sh ? (S.where === 'space' ? 30 : sh.z * 0.6) : 0);
  VIEW.cx = lerp(VIEW.cx, ct.x, Math.min(1, dt * 5)); VIEW.cy = lerp(VIEW.cy, ct.y, Math.min(1, dt * 5));
  const base = h ? 0.6 : sh ? (S.where === 'space' ? 0.62 : clamp(0.75 - sh.z / 1200, 0.42, 0.75)) : p.inCar ? 0.72 : S.build.on ? 0.82 : inCity() ? 1.6 : 0.95;
  S.zoom = lerp(S.zoom, base * S.userZoom, dt * 3);
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try {
    if (S) {
      update(dt); CTX.setTransform(DPR, 0, 0, DPR, 0, 0); G = CTX;
      const sh = S.shake > 0.3 ? S.shake : 0; VIEW.ox = innerWidth / 2 + R(-sh, sh); VIEW.oy = innerHeight / 2 + R(-sh, sh); VIEW.zoom = S.zoom;
      if (S.fp && S.phase === 'play') renderFP(dt); else renderWorld(dt, { noCursor: S.phase !== 'play' });
      if (S.phase === 'play' || S.phase === 'dead') { UI.updateHud(); if (!frame._mt || now - frame._mt > 120) { renderMinimap($('mini')); frame._mt = now; } }
      UI.renderArsenal(dt); HoloUI.render(dt); ShipUI.draw(dt);
    }
    if (!$('editor').classList.contains('hidden')) UI.renderEditor(dt);
    Lobby.render(dt);
  } catch (e) { showErr(e); }
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { const fps = fpsN / fpsAcc; if (SETTINGS.fps) $('fps').textContent = Math.round(fps) + ' FPS'; if (S && S.phase === 'play' && !UI.overlay) { lowFpsT = fps < 28 ? lowFpsT + fpsAcc : 0; if (lowFpsT > 5 && !QUALITY_LOW) { QUALITY_LOW = true; SETTINGS.particles = 'niedrig'; resize(); UI.toast('Performance-Modus aktiviert'); } } fpsAcc = 0; fpsN = 0; }
  requestAnimationFrame(frame);
}
(function boot() { $('loading').classList.remove('hidden'); setTimeout(() => { try { setupMenuWorld(); } catch (e) { showErr(e); } $('loading').classList.add('hidden'); UI.saveSettings(); $('tipTxt').textContent = pick(TIPS); Auth.boot(); requestAnimationFrame(frame); }, 50); })();
window.__VS = { get S() { return S; }, startNewGame, jump, saveGame, loadGame, UI, Auth, Lobby };
