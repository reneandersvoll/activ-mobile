'use strict';
// ===================== UPDATE =====================
function updateWorldTime(dt) {
  const prevT = S.time; S.time += dt / DAY_LEN; if (S.time >= 1) { S.time -= 1; S.day++; }
  const t = S.time; S.dayness = smoothstep(0.2, 0.28, t) * (1 - smoothstep(0.76, 0.84, t));
  const night = S.dayness < 0.35, here = S.where === 'main';
  if (night && !S.wasNight) {
    S.night++; S.bloodMoon = S.night % 7 === 0; S.bossNight = S.night % 5 === 0; S.budget = Math.round((10 + S.night * 6) * (S.bloodMoon ? 2 : 1));
    if (!here) S.awayNight = true;
    if (here) { SFX.play('night'); announce(S.bloodMoon ? '🩸 BLUTMOND · NACHT ' + S.night : 'NACHT ' + S.night, S.bloodMoon ? 'Doppelt so viele Monster. Bleib im Licht!' : S.bossNight ? '⚠ DER WURZELKÖNIG ERWACHT ⚠' : 'Monster entstehen nur in der Dunkelheit', S.bloodMoon ? '#ff2a2a' : '#ff5e5e'); }
    else UI.toast(S.bloodMoon ? '🩸 Blutmond über der Erde. Deine Basis ist auf sich allein gestellt …' : '☾ Nacht über der Zone. Deine Basis ist unbewacht.');
    if (S.bossNight && here) setTimeout(() => { if (S && S.phase === 'play' && S.where === 'main') for (let i = 0; i < 30; i++) { const a = R(0, 6.28), x = S.p.x + Math.cos(a) * 700, y = S.p.y + Math.sin(a) * 700; if (x > 60 && y > 60 && x < WORLD - 60 && y < WORLD - 60 && !isSafe(x, y)) { spawnZombie('boss', x, y); break; } } }, 6000);
  }
  if (!night && S.wasNight) {
    S.stats.nights++; if (here || S.where === 'exp') { SFX.play('dawn'); announce('DIE SONNE GEHT AUF', 'Tag ' + S.day + ' · Monster verbrennen im Licht', '#ffd84a'); }
    for (const z of S.zombies) if (z.type !== 'boss' && !ZTYPES[z.type].alien && !ZTYPES[z.type].drone) z.burn = R(0.1, 1.5);
    if (S.awayNight) { S.awayNight = false; setTimeout(() => S && absentRaid(), 1500); }
    S.bloodMoon = false; withMain(() => respawnCrates()); dailyCity();
    if (S.station.owned && S.station.up.lab && S.res.xeno > 0) { const n = Math.min(3, S.res.xeno); S.res.xeno -= n; S.res.money += n * 400; UI.toast('🧬 Xeno-Labor: ' + n + ' Biomasse → +' + fmtMoney(n * 400)); }
    if (!S.exp) saveGame(true); checkMission();
  }
  S.wasNight = night;
  if (prevT < 0.5 && t >= 0.5 && S.lastNoonDay !== S.day && here) { S.lastNoonDay = S.day; if (S.day % 4 === 0) startAirdrop(); }
  S.weatherT -= dt;
  if (S.weatherT <= 0) { const r = Math.random(), nw = r < 0.45 ? 'Klar' : r < 0.72 ? 'Regen' : r < 0.87 ? 'Nebel' : 'Gewitter'; if (nw !== S.weather) { S.weather = nw; if (here) UI.toast({ Klar: '☀ Der Himmel klart auf', Regen: '🌧 Regen – Farmen wachsen doppelt so schnell', Nebel: '🌫 Dichter Nebel zieht auf', Gewitter: '⛈ GEWITTER!' }[nw]); } S.weatherT = R(50, 100); }
  const outdoor = S.where === 'main' || S.where === 'city' || (S.where === 'exp' && S.W.biome !== 'desert');
  S.rainAmt = lerp(S.rainAmt, !outdoor ? 0 : S.weather === 'Regen' ? 1 : S.weather === 'Gewitter' ? 1.6 : 0, dt * 0.5);
  if (outdoor && S.weather === 'Gewitter' && Math.random() < dt * 0.12) { S.lightning = 1; setTimeout(() => SFX.noise(1.4, 0.35, 300), 300); }
  S.lightning = Math.max(0, S.lightning - dt * 2.5);
  for (const k in S.city.buffs) S.city.buffs[k] = Math.max(0, S.city.buffs[k] - dt);
}
function respawnCrates() {
  const W = S.mainW; W.crates = W.crates.filter(c => !c.open);
  for (let i = W.crates.length, made = 0; i < 12 && made < 2; i++, made++) for (let k = 0; k < 20; k++) { const x = R(150, W.size * TILE - 150), y = R(150, W.size * TILE - 150), gx = Math.floor(x / TILE), gy = Math.floor(y / TILE); if (inRect(gx, gy, EDEN_RECT, 1) || S.mainGrid[gy * W.size + gx] || !freeAt(W, x, y, 14)) continue; const r = Math.random(); W.crates.push({ x, y, rarity: r < 0.55 ? 0 : r < 0.83 ? 1 : r < 0.96 ? 2 : 3, opening: 0, open: false, hold: 0 }); break; }
  for (const pr of W.props) if (pr.tower && pr.tower.looted >= pr.tower.floors && S.day >= pr.tower.restock) pr.tower.looted = 0;
}
function startAirdrop(near) {
  const p = near || S.p; let tx, ty;
  for (let k = 0; k < 25; k++) { tx = clamp(p.x + R(-450, 450), 200, WORLD - 200); ty = clamp(p.y + R(-450, 450), 200, WORLD - 200); if (!bldAt(tx, ty) && freeAt(S.W, tx, ty, 20)) break; }
  const a = R(0, Math.PI * 2); S.dropPlane = { x: tx - Math.cos(a) * 1400, y: ty - Math.sin(a) * 1400, z: 360, a, tx, ty, dropped: false, t: 0 };
  announce('VERSORGUNGSABWURF!', 'Folge dem roten Rauch', '#ff5e3a'); SFX.play('streak');
}
function updatePlayer(dt) {
  const p = S.p;
  p.invuln = Math.max(0, p.invuln - dt); p.hurt = Math.max(0, p.hurt - dt); p.recoil = Math.max(0, p.recoil - dt * 8); p.pump = Math.max(0, p.pump - dt * 3); p.fireCd -= dt;
  if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) finishReload(); }
  const safeCity = inCity();
  p.hunger = Math.max(0, p.hunger - dt * (100 / 330) * (perk('hunger') ? 0.6 : 1));
  if (p.hunger <= 0) { p.hp -= dt * 1.5; if (p.hp <= 0) { if (safeCity) { p.hp = 5; UI.toast('Du verhungerst! Kauf etwas zu essen.'); } else { playerDie(); return; } } }
  else if (p.hunger > 70 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + dt * (safeCity ? 2.5 : (S.where === 'planet' && S.crew.some(c => c.role === 'medic')) ? 2 : 0.8));
  if (p.inCar) { updateDriving(dt, p.inCar); return; }
  if (p.inHeli) { updateHeliFlight(dt, p.inHeli); return; }
  if (p.inShip) { updateShipFlight(dt, p.inShip); return; }
  let ix = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0), iy = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
  const il = Math.hypot(ix, iy);
  let speed = 165 * (1 + 0.12 * perk('speed')) * (S.city.buffs.speed > 0 ? 1.15 : 1);
  const sprint = (KEYS.ShiftLeft || KEYS.ShiftRight) && il > 0 && p.stamina > 1;
  if (sprint) { speed *= 1.55; p.stamina = Math.max(0, p.stamina - dt * 28); } else p.stamina = Math.min(100, p.stamina + dt * 18);
  const tool = currentTool();
  if (MOUSE.down && GUNS.includes(tool) && !(S.attach[tool] || {}).stock && !S.build.on) speed *= tool === 'lmg' ? 0.6 : 0.75;
  if (p.channel > 0) speed *= 0.5; if (tileType(S.W, p.x, p.y) === 3) speed *= 1.08;
  if (il > 0) {
    ix /= il; iy /= il; let wx, wy;
    if (S.fp) { const c = Math.cos(p.a), s = Math.sin(p.a), f = -iy, r = ix; wx = c * f - s * r; wy = s * f + c * r; }
    else { wx = (ix + iy) / 1.414; wy = (-ix + iy) / 1.414; }
    moveEnt(p, wx * speed * dt, wy * speed * dt, 9, 'player'); p.walk += dt * (sprint ? 16 : 11); p.moving = Math.min(1, p.moving + dt * 6);
  } else p.moving = Math.max(0, p.moving - dt * 6);
  const m = aimPoint(); if (!S.fp) p.a = Math.atan2(m.y - p.y, m.x - p.x);
  if (p.swing > 0) { const prev = p.swing; p.swing += dt / (WEAPONS.axe.rate / (1 + 0.15 * perk('rate'))); if (prev < 0.55 && p.swing >= 0.55 && !p.swingHit) { p.swingHit = true; meleeHit(); } if (p.swing >= 1) p.swing = 0; }
  if (MOUSE.down && !S.build.on && !UI.blocking() && !safeCity) {
    if (tool === 'axe' && p.swing === 0) { p.swing = 0.001; p.swingHit = false; }
    else if (GUNS.includes(tool)) fireWeapon(tool, m.x, m.y);
    else if (tool === 'medkit' && p.channel <= 0 && S.res.meds > 0 && p.hp < p.maxHp) { p.channel = 1.2; SFX.tone(500, 0.3, 'sine', 0.08, 1.5); }
    else if (tool === 'grenade' && S.res.grenades > 0 && p.fireCd <= 0) { S.res.grenades--; p.fireCd = 0.8; const d = Math.min(380, Math.hypot(m.x - p.x, m.y - p.y)), a = Math.atan2(m.y - p.y, m.x - p.x); S.grenades.push({ x: p.x, y: p.y, z: 30, sx: p.x, sy: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, dur: 0.85, fuse: 1.6 }); SFX.tone(300, 0.1, 'triangle', 0.08, 1.4); }
  }
  if (p.channel > 0) { p.channel -= dt; if (Math.random() < dt * 20) burst(p.x, p.y, 30, '#7dff8a', 1, 40, { nograv: true }); if (p.channel <= 0) { S.res.meds--; p.hp = Math.min(p.maxHp, p.hp + 55); floater(p.x, p.y, '+55 HP', '#7dff8a', true); SFX.play('pickup'); } }
  holdInteract(dt);
  const z = zoneAt(p.x, p.y);
  if (z !== S.curZone) { S.curZone = z; if (z && !(z.once && S.zoneSeen[z.id])) { S.zoneSeen[z.id] = true; announce(z.n, z.sub, z.col); if (z.id === 'eden') discoverEden(); } }
  if (S.where === 'main' && !S.edenFound && Math.hypot(S.W.eden.x - p.x, S.W.eden.y - p.y) < 420) discoverEden();
}
function holdInteract(dt) {
  const it = S.phase === 'play' ? findInteract() : null; S.prompt = it ? it.text : '';
  if (it && it.hold && KEYS.KeyE && it.can) {
    const obj = it.obj || it.car || it.crate; if (S.hold.what !== obj) { S.hold.what = obj; S.hold.t = 0; }
    S.hold.t += dt; S.hold.max = it.hold; if (Math.random() < dt * 15) burst(obj.x, obj.y, 20, '#ffe066', 1, 80);
    if (S.hold.t >= it.hold) { finishHold(it); S.hold.what = null; S.hold.t = 0; KEYS.KeyE = false; }
  } else if (!KEYS.KeyE) { S.hold.what = null; S.hold.t = 0; }
}
function updateDriving(dt, c) {
  const p = S.p, u = c.up, maxV = 290 + 75 * (u.engine || 0) * (perk('pilot') ? 1.2 : 1);
  const throttle = (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0) - (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0), steerIn = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0);
  let boost = 1;
  if (u.nitro && (KEYS.ShiftLeft || KEYS.ShiftRight) && c.nitro > 0 && throttle > 0) { boost = 1.6; c.nitro -= dt * 30; smoke(c.x - Math.cos(c.a) * 34, c.y - Math.sin(c.a) * 34, 10, '#ff8a2a', 2); } else c.nitro = Math.min(100, c.nitro + dt * 8);
  if (c.fuel > 0 && throttle !== 0) { c.v += throttle * 330 * boost * dt; c.fuel = Math.max(0, c.fuel - dt * Math.abs(c.v) / maxV * 0.45 * (perk('pilot') ? 0.65 : 1)); if (c.fuel <= 0) announce('KEIN SPRIT!', 'Kanister finden und tanken (E)', '#ff8080'); }
  c.v *= Math.pow(throttle === 0 ? 0.4 : 0.8, dt); c.v = clamp(c.v, -maxV * 0.4, maxV * boost * (tileType(S.W, c.x, c.y) === 3 ? 1.25 : 1));
  c.steer = lerp(c.steer, steerIn * 0.5, dt * 8); c.a += c.steer * dt * clamp(c.v / 120, -1.6, 1.6) * 1.4;
  const blk = moveEnt(c, Math.cos(c.a) * c.v * dt, Math.sin(c.a) * c.v * dt, 22, 'car');
  if (blk) { const spd = Math.abs(c.v); if (blk.btype === 'tree' && u.ram && spd > 200) { chopTree(blk, 999); c.v *= 0.7; } else { if (spd > 120) { damageCar(c, spd * 0.05); shake(6); SFX.noise(0.15, 0.3, 800); } if (blk.btype === 'tree') blk.wob = 1; c.v *= -0.3; } }
  if (Math.abs(c.v) > 30 && Math.random() < dt * 8) smoke(c.x - Math.cos(c.a) * 32, c.y - Math.sin(c.a) * 32, 8, 'rgba(90,90,90,0.35)', 1);
  p.x = c.x; p.y = c.y; p.a = c.a; c.lightsOn = S.dayness < 0.6;
  for (const z of S.zombies) { if (z.dead) continue; if (Math.hypot(z.x - c.x, z.y - c.y) < 28 + 8 * z.sc && Math.abs(c.v) > 70) { const wasHp = z.hp; damageZombie(z, Math.abs(c.v) * 0.55 * (u.ram ? 2 : 1), 'car', Math.cos(c.a) * c.v * 1.5, Math.sin(c.a) * c.v * 1.5); if (z.dead) { floater(z.x, z.y, 'ÜBERFAHREN!', '#7ad7ff', true); addXp(8); shake(4); } else c.v *= 0.5; damageCar(c, Math.min(wasHp, 40) * 0.08 * (u.armor ? 0.5 : 1)); } }
  if (u.gun) autoGun(c, dt, c.x - Math.cos(c.a) * 12, c.y - Math.sin(c.a) * 12, 40, 'turret', 380);
}
function autoGun(v, dt, gx, gy, gz, src, range) {
  v.gunCd = (v.gunCd || 0) - dt; let best = null, bd = range;
  for (const z of S.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - gx, z.y - gy); if (d < bd) { bd = d; best = z; } }
  if (!best) return; const ta = Math.atan2(best.y - gy, best.x - gx); v.gunAng = lerp(v.gunAng || 0, angDiff(v.a || 0, ta), dt * 10);
  if (v.gunCd <= 0) { v.gunCd = 0.13; const a = ta + R(-0.04, 0.04); S.bullets.push({ x: gx, y: gy, z: gz, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, life: 0.5, dmg: src === 'heli' ? 18 : 14, src, px: gx, py: gy }); SFX.noise(0.04, 0.1, 3000); }
}
function damageCar(c, d) { c.hp -= d; if (c.hp <= 0) { explode(c.x, c.y, 120, 120, 'car'); c.wreck = true; c.hp = 0; c.v = 0; c.up = {}; c.lightsOn = false; if (S.p.inCar === c) { S.p.inCar = null; S.p.x = c.x + 40; S.p.y = c.y; hurtPlayer(25); } announce('FAHRZEUG ZERSTÖRT', 'Wrack kann repariert werden', '#ff6b6b'); } }
function updateHeliFlight(dt, h) {
  const p = S.p, u = h.up;
  let ix = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0), iy = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
  const il = Math.hypot(ix, iy), turbo = (KEYS.ShiftLeft || KEYS.ShiftRight) ? 1.5 : 1, maxV = 330 * (u.engine ? 1.4 : 1) * turbo;
  if (h.state === 'flying' && h.fuel > 0) {
    h.z = lerp(h.z, 170, dt * 1.6);
    if (il > 0 && h.z > 40) { ix /= il; iy /= il; const wx = (ix + iy) / 1.414, wy = (-ix + iy) / 1.414; h.vx += wx * 520 * dt; h.vy += wy * 520 * dt; h.a += angDiff(h.a, Math.atan2(wy, wx)) * Math.min(1, dt * 3); }
    h.fuel = Math.max(0, h.fuel - dt * (0.9 + Math.hypot(h.vx, h.vy) / maxV * 0.9) * (u.tank ? 0.5 : 1) * (perk('pilot') ? 0.65 : 1));
    if (h.fuel <= 0) { announce('TREIBSTOFF LEER!', 'Notlandung durch Autorotation', '#ff6b6b'); h.state = 'landing'; }
  }
  if (h.state === 'landing') {
    h.z = Math.max(0, h.z - dt * 90);
    if (h.z <= 0) {
      h.state = 'parked'; h.vx = 0; h.vy = 0; shake(6); burst(h.x, h.y, 2, '#a88a5a', 30, 180); SFX.noise(0.3, 0.3, 600);
      const pad = helipad();
      if (pad && Math.hypot(pad.x - h.x, pad.y - h.y) < 80) { h.x = pad.x; h.y = pad.y; const take = Math.min(100 - h.fuel, S.res.fuel); h.fuel += take; S.res.fuel -= take; if (pad.level >= 2) h.hp = h.maxHp; announce('GELANDET AUF DER LANDESTATION', (take > 0 ? '+' + Math.round(take) + '% betankt' : 'Kein Sprit zum Tanken') + (pad.level >= 2 ? ' · repariert' : ''), '#7ad7ff'); }
      else if (staticHit(h.x, h.y, 30) || blockedFor(h.x, h.y, 'car')) { h.hp -= 60; announce('HARTE LANDUNG!', 'Heli beschädigt', '#ff8080'); }
      h.rotSpd = 0;
    }
  }
  h.vx *= Math.pow(0.35, dt); h.vy *= Math.pow(0.35, dt); const sp = Math.hypot(h.vx, h.vy); if (sp > maxV) { h.vx *= maxV / sp; h.vy *= maxV / sp; }
  h.x = clamp(h.x + h.vx * dt, 60, WORLD - 60); h.y = clamp(h.y + h.vy * dt, 60, WORLD - 60); h.rotSpd = lerp(h.rotSpd, h.state === 'parked' ? 0 : 22, dt * 1.5);
  p.x = h.x; p.y = h.y; p.a = h.a;
  if (u.gun && h.z > 40) autoGun(h, dt, h.x, h.y, h.z, 'heli', 460);
  if (h.hp <= 0) { explode(h.x, h.y, 140, 150, 'car'); h.wreck = true; h.z = 0; h.state = 'parked'; h.up = {}; S.p.inHeli = null; S.p.x = h.x + 50; S.p.y = h.y; hurtPlayer(40); announce('HELIKOPTER ABGESTÜRZT', 'Wrack kann repariert werden', '#ff6b6b'); }
}
function heliLand() { const h = S.p.inHeli; if (!h || h.state !== 'flying') return; h.state = 'landing'; SFX.play('click'); }

function updateZombies(dt) {
  const p = S.p, target = p.inCar || p.inShip || p, night = S.dayness < 0.35;
  if (S.phase === 'play') {
    if (S.where === 'main') {
      if (night && S.budget > 0) { S.spawnT -= dt; const cap = (18 + S.night * 5) * (S.bloodMoon ? 1.6 : 1); if (S.spawnT <= 0 && S.zombies.length < cap) { if (trySpawn()) S.budget--; S.spawnT = Math.max(0.35, (2.6 - S.night * 0.22) * (S.bloodMoon ? 0.5 : 1)); } }
      if (!night && S.curZone && S.curZone.id === 'ruin' && !p.inHeli && !p.inShip) { S.ruinT -= dt; if (S.ruinT <= 0 && S.zombies.length < 12) { trySpawn(400, 700, S.curZone); S.ruinT = R(4, 8); } }
    } else if (S.where === 'exp' || S.where === 'planet') {
      S.spawnT -= dt; const cap = 10 + (S.W.danger || 1) * 6 + (night ? 6 : 0);
      if (S.spawnT <= 0 && S.zombies.length < cap && !(p.inShip && p.inShip.z > 60)) { trySpawn(450, 800); S.spawnT = Math.max(0.6, 2.6 - (S.W.danger || 1) * 0.45); }
    } else if (S.where === 'space') {
      S.spawnT -= dt; const near = !S.station.owned && S.W.station && Math.hypot(S.W.station.x - p.x, S.W.station.y - p.y) < 1200;
      if (S.spawnT <= 0 && S.zombies.length < (near ? 8 : 4)) { const a = R(0, 6.28), d = R(700, 1000); spawnZombie('xdrone', clamp(p.x + Math.cos(a) * d, 40, WORLD - 40), clamp(p.y + Math.sin(a) * d, 40, WORLD - 40)); S.spawnT = near ? 2.5 : 6; }
    }
  }
  const flying = (p.inHeli && p.inHeli.z > 20) || (p.inShip && p.inShip.z > 20 && S.where !== 'space');
  for (const z of S.zombies) {
    if (z.dead) continue;
    const T = ZTYPES[z.type];
    z.t += dt; z.hit = Math.max(0, z.hit - dt); z.atk = Math.max(0, z.atk - dt); z.alert = Math.max(0, z.alert - dt); z.rise = Math.max(0, z.rise - dt * 1.5);
    z.groan -= dt; if (z.groan <= 0) { z.groan = R(4, 10); if (Math.hypot(z.x - p.x, z.y - p.y) < 500 && !T.drone) SFX.play('zombie'); }
    const burns = S.where === 'main' && !T.alien && !(S.curZone && S.curZone.id === 'ruin');
    if (z.burn > 0 || (S.dayness > 0.6 && z.type !== 'boss' && burns && z.alert <= 0)) { z.burn = Math.max(z.burn, 0.01); z.burn += dt; if (z.burn > 1) { z.hp -= dt * 35; if (Math.random() < dt * 20) burst(z.x, z.y, 25 * z.sc, '#ff8a2a', 1, 40, { up: 1.5 }); if (z.hp <= 0) { z.dead = true; burst(z.x, z.y, 20, '#3a3a3a', 14, 120); } } }
    z.kx *= Math.pow(0.02, dt); z.ky *= Math.pow(0.02, dt);
    let tx = target.x, ty = target.y, tb = null; const dP = Math.hypot(target.x - z.x, target.y - z.y);
    if (z.siege && dP > 260 && !p.inShip) { let bd = 1e9; for (const b of S.buildings) { const d = Math.hypot(b.x - z.x, b.y - z.y); if (d < bd) { bd = d; tb = b; } } if (tb) { tx = tb.x; ty = tb.y; } else { tx = z.siege.x; ty = z.siege.y; } }
    else if (flying || !(z.alert > 0 || dP < 520 || T.drone)) { let bd = z.type === 'brute' ? 900 : 480; for (const b of S.buildings) { const d = Math.hypot(b.x - z.x, b.y - z.y); if (d < bd) { bd = d; tb = b; } } if (tb) { tx = tb.x; ty = tb.y; } else if (flying) { tx = z.x + Math.cos(z.t) * 50; ty = z.y + Math.sin(z.t) * 50; } }
    const a = Math.atan2(ty - z.y, tx - z.x); z.a = z.a + angDiff(z.a, a) * Math.min(1, dt * 6);
    let sp = z.sp * lightFactor(z.x, z.y) * (S.bloodMoon ? 1.15 : 1); if (z.rise > 0) sp *= 0.2;
    const reach = 20 + 9 * z.sc + (T.drone ? 30 : 0), dT = tb ? Math.hypot(tx - z.x, ty - z.y) : dP;
    let mx = Math.cos(a) * sp * dt + z.kx * dt, my = Math.sin(a) * sp * dt + z.ky * dt;
    if (T.drone) { const orbit = dT < 220; if (orbit) { mx = Math.cos(a + 1.4) * sp * dt; my = Math.sin(a + 1.4) * sp * dt; } z.x = clamp(z.x + mx, 20, WORLD - 20); z.y = clamp(z.y + my, 20, WORLD - 20); z.walk += dt;
      z.shot = (z.shot || R(1, 2)) - dt; if (z.shot <= 0 && dT < 450) { z.shot = R(1.2, 2.2); const sa = Math.atan2(ty - z.y, tx - z.x); S.bullets.push({ x: z.x, y: z.y, z: 30, vx: Math.cos(sa) * 520, vy: Math.sin(sa) * 520, life: 1.2, dmg: T.dmg, src: 'enemy', px: z.x, py: z.y }); SFX.tone(600, 0.08, 'square', 0.04, 0.5); }
      continue; }
    if (!tb && dT < reach) { mx = z.kx * dt; my = z.ky * dt; }
    if (T.ranged && !flying) { z.shot = (z.shot || R(1, 2)) - dt; if (z.shot <= 0 && dP < 420) { z.shot = R(1.3, 2.2); const sa = Math.atan2(target.y - z.y, target.x - z.x); S.bullets.push({ x: z.x, y: z.y, z: 38, vx: Math.cos(sa) * 480, vy: Math.sin(sa) * 480, life: 1.1, dmg: T.dmg, src: 'enemy', px: z.x, py: z.y }); SFX.tone(900, 0.1, 'sine', 0.05, 0.5); } if (!tb && dP < 210) { mx = z.kx * dt; my = z.ky * dt; } }
    if (T.blink) { z.bt = (z.bt || R(2, 4)) - dt; if (z.bt <= 0 && dP > 150 && dP < 800) { z.bt = R(2.5, 4); const nx = z.x + Math.cos(a) * 140, ny = z.y + Math.sin(a) * 140; if (!blockedFor(nx, ny, 'zombie') && !staticHit(nx, ny, 10)) { burst(z.x, z.y, 25, '#c8c0ff', 14, 140, { nograv: true }); z.x = nx; z.y = ny; burst(z.x, z.y, 25, '#8a7cff', 14, 140, { nograv: true }); SFX.tone(1600, 0.12, 'sine', 0.05, 0.4); } } }
    for (const o of S.zombies) { if (o === z || o.dead) continue; const dx = z.x - o.x, dy = z.y - o.y, d2 = dx * dx + dy * dy, rr = 18 * (z.sc + o.sc) / 2; if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2); mx += dx / d * (rr - d) * 0.5; my += dy / d * (rr - d) * 0.5; } }
    const blk = moveEnt(z, mx, my, 10 * z.sc, 'zombie');
    if (Math.abs(mx) + Math.abs(my) > 0.1) z.walk += dt * (z.type === 'runner' || z.type === 'xeno' ? 14 : 8);
    if (blk && blk.type && z.atk <= 0) { z.atk = 0.9; blk.hp -= T.dmg * (T.bldg || 1); blk.shakeT = 0.2; burst(blk.x + R(-10, 10), blk.y + R(-10, 10), 20, '#8b5e34', 5, 120); if (blk.hp <= 0) removeBuilding(blk, false); }
    else if (blk && blk.btype === 'tree' && z.type === 'boss') chopTree(blk, 999);
    if (!blk && tb && Math.hypot(tb.x - z.x, tb.y - z.y) < Math.max(tb.w, tb.h) * TILE / 2 + reach && z.atk <= 0) { z.atk = 0.9; tb.hp -= T.dmg * (T.bldg || 1); if (tb.hp <= 0) removeBuilding(tb, false); }
    if (!flying && dP < reach + (p.inCar || p.inShip ? 16 : 0) && z.atk <= 0 && S.phase === 'play') {
      z.atk = z.type === 'runner' || z.type === 'xeno' ? 0.6 : 1;
      if (p.inCar) damageCar(p.inCar, T.dmg * 0.6 * (p.inCar.up.armor ? 1 / (1 + p.inCar.up.armor * 0.4) : 1));
      else if (p.inShip) damageShip(T.dmg * 0.6); else if (p.inHeli) p.inHeli.hp -= T.dmg * 0.5; else hurtPlayer(T.dmg);
    }
    if (S.follower && Math.hypot(S.follower.x - z.x, S.follower.y - z.y) < reach && z.atk <= 0) { z.atk = 1; S.follower.hp -= T.dmg; S.follower.hurt = 0.3; if (S.follower.hp <= 0) { burst(S.follower.x, S.follower.y, 20, '#c0392b', 30, 160); S.follower = null; failCityTask('Die Überlebende wurde getötet'); } }
    if (z.type === 'boss') { z.stomp -= dt; if (z.stomp <= 0 && dP < 220) { z.stomp = 4.5; S.rings.push({ x: z.x, y: z.y, r: 10, max: 180, col: '140,255,90', life: 0.6 }); shake(14); SFX.play('boom'); if (dP < 170 && !flying) hurtPlayer(25); } if (Math.random() < dt * 0.15) for (let i = 0; i < 2; i++) spawnZombie('walker', z.x + R(-60, 60), z.y + R(-60, 60)); }
  }
  S.zombies = S.zombies.filter(z => !z.dead);
}
function updateBuildings(dt) {
  if (S.where !== 'main' && S.where !== 'planet') return;
  let prod = 0, use = 0;
  for (const b of S.buildings) { const d = BUILD[b.type]; if (d.power > 0 && !isPB(b)) prod += (d.power + (b.level - 1) * (b.type === 'hq' ? 4 : 6)) * (1 + 0.15 * (b.mlinks || 0)); }
  for (const b of S.buildings) { const d = BUILD[b.type]; if (isPB(b)) continue; if (d.power < 0 || b.mount === 'turret') { use += b.mount === 'turret' ? 3 : -d.power; b.powered = use <= prod; } else b.powered = true; }
  S.power.prod = prod; S.power.use = use; const p = S.p;
  for (const b of S.buildings) {
    b.t += dt; b.pop = Math.max(0, b.pop - dt * 2.5); b.flash = Math.max(0, b.flash - dt);
    if (b.type === 'farm') b.grow = Math.min(1, b.grow + dt / 75 * (1 + (b.level - 1) * 0.3) * (1 + 0.2 * (b.mlinks || 0)) * (S.rainAmt > 0.5 ? 2 : 1));
    if (b.type === 'gate') { const near = Math.hypot(p.x - b.x, p.y - b.y) < 70 || S.W.cars.some(c => !c.wreck && Math.hypot(c.x - b.x, c.y - b.y) < 90); b.open = clamp(b.open + (near ? dt * 3 : -dt * 3), 0, 1); }
    if (b.type === 'fire' && Math.random() < dt * 6) S.particles.push({ x: b.x + R(-4, 4), y: b.y + R(-4, 4), z: 22, vx: R(-10, 10), vy: R(-10, 10), vz: R(40, 90), life: 0.8, max: 0.8, col: Math.random() < 0.5 ? '#ffb52e' : '#ff7b1c', s: 3, grav: 0 });
    if (b.type === 'autogun' || b.mount === 'autogun') {
      b.cd -= dt; b.spin = (b.spin || 0) + dt * (b.firing ? 25 : 2); b.firing = false; let best = null, bd = 230 + 30 * b.level + (b.mount ? 70 : 0);
      for (const z of S.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - b.x, z.y - b.y); if (d < bd) { bd = d; best = z; } }
      if (best) { const ta = Math.atan2(best.y - b.y, best.x - b.x); b.headAng += angDiff(b.headAng, ta) * Math.min(1, dt * 14); if (b.cd <= 0 && Math.abs(angDiff(b.headAng, ta)) < 0.4) {
        if (S.res.ammo <= 0) { if (!b.noAmmoT || b.noAmmoT < S.stats.played) { b.noAmmoT = S.stats.played + 6; floater(b.x, b.y, 'KEINE MUNITION', '#ff8080'); } }
        else { b.cd = 0.09; b.firing = true; b.flash = 0.05; b.shots = (b.shots || 0) + 1; if (b.shots % 4 === 0) S.res.ammo--; const z0 = b.mount ? 50 + b.level * 4 : 22, mx = b.x + Math.cos(b.headAng) * 24, my = b.y + Math.sin(b.headAng) * 24, a = b.headAng + R(-0.08, 0.08); S.bullets.push({ x: mx, y: my, z: z0, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, life: 0.32, dmg: (8 + 3 * b.level) * (1 + 0.35 * perk('turret')), src: 'turret', px: mx, py: my }); if (Math.hypot(b.x - p.x, b.y - p.y) < 600 && Math.random() < 0.5) SFX.noise(0.03, 0.06, 3200); } } }
      else b.headAng += dt * 0.6;
    }
    if ((b.type === 'turret' || b.mount === 'turret') && b.powered) {
      b.cd -= dt; let best = null, bd = 300 + 50 * b.level + (b.mount ? 70 : 0);
      for (const z of S.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - b.x, z.y - b.y); if (d < bd) { bd = d; best = z; } }
      if (best) { const ta = Math.atan2(best.y - b.y, best.x - b.x); b.headAng += angDiff(b.headAng, ta) * Math.min(1, dt * 10); if (b.cd <= 0 && Math.abs(angDiff(b.headAng, ta)) < 0.3) { b.cd = 0.45 / b.level; b.flash = 0.06; const mx = b.x + Math.cos(b.headAng) * 26, my = b.y + Math.sin(b.headAng) * 26; S.bullets.push({ x: mx, y: my, z: b.mount ? 56 + b.level * 4 : 26, vx: Math.cos(b.headAng) * 950, vy: Math.sin(b.headAng) * 950, life: 0.5, dmg: (16 + 6 * b.level) * (1 + 0.35 * perk('turret')), src: 'turret', px: mx, py: my }); if (Math.hypot(b.x - p.x, b.y - p.y) < 600) SFX.noise(0.05, 0.08, 2500); } }
      else b.headAng += dt * 0.4;
    }
    if (b.type === 'storage') b.fill = clamp((S.res.wood + S.res.stone + S.res.scrap) / (S.cap * 3), 0, 1);
  }
}
function updateProjectiles(dt) {
  for (const b of S.bullets) {
    b.px = b.x; b.py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.src === 'enemy') { const tgt = S.p.inShip || S.p; if (Math.hypot(tgt.x - b.x, tgt.y - b.y) < (S.p.inShip ? 34 : 14)) { b.life = 0; if (S.p.inShip) damageShip(b.dmg); else hurtPlayer(b.dmg); burst(b.x, b.y, 30, '#ff5e3a', 6, 100); } continue; }
    for (const z of S.zombies) { if (z.dead || (b.hitSet && b.hitSet.has(z))) continue; if (Math.hypot(z.x - b.x, z.y - b.y) < 14 * z.sc + 4 + (ZTYPES[z.type].drone ? 10 : 0)) { damageZombie(z, b.dmg, b.src, b.vx * 0.06, b.vy * 0.06); if (b.pierce > 0) { b.pierce--; b.hitSet.add(z); b.dmg *= 0.8; } else { b.life = 0; break; } } }
    if (b.life > 0 && b.z < 60) { const t = staticHit(b.x, b.y, 1); if (t && t.btype === 'tree') { b.life = 0; burst(b.x, b.y, 20, '#8b5e34', 4, 80); } else if (t && t.btype === 'node') { b.life = 0; burst(b.x, b.y, 15, '#ffe066', 4, 120); if (b.src === 'ship') mineNode(t, 10); } else if (t && t.btype === 'prop') { b.life = 0; burst(b.x, b.y, 15, '#ffe066', 4, 120); } }
  }
  S.bullets = S.bullets.filter(b => b.life > 0);
  for (const g of S.grenades) { g.t += dt; g.fuse -= dt; const k = Math.min(1, g.t / g.dur); g.x = lerp(g.sx, g.tx, k); g.y = lerp(g.sy, g.ty, k); g.z = k >= 1 ? 3 : 30 + Math.sin(k * Math.PI) * 90 - k * 30; if (g.fuse <= 0) { g.done = true; explode(g.x, g.y, 130, 170, 'grenade'); } }
  S.grenades = S.grenades.filter(g => !g.done);
  for (const m of S.mortar) { m.t -= dt; if (m.t <= 0 && !m.done) { m.done = true; if (m.orbital) { let n = 0; for (const z of S.zombies.slice()) { if (Math.hypot(z.x - S.p.x, z.y - S.p.y) < 900 && n < 30) { n++; setTimeout(() => { if (S && !z.dead) { S.particles.push({ x: z.x, y: z.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.4, max: 0.4, col: '#9ff', s: 1, beam: true, grav: 0, light: 200 }); damageZombie(z, 9999, 'grenade'); } }, n * 70); } } } else { const al = S.zombies.filter(z => Math.hypot(z.x - S.p.x, z.y - S.p.y) < 800), z = al.length ? pick(al) : null, x = z ? z.x : S.p.x + R(-300, 300), y = z ? z.y : S.p.y + R(-300, 300); if (Math.hypot(x - S.p.x, y - S.p.y) > 90) explode(x, y, 140, 220, 'grenade'); } } }
  S.mortar = S.mortar.filter(m => !m.done);
  if (S.drone) { const d = S.drone; d.t -= dt; d.cd -= dt; d.x = lerp(d.x, S.p.x - 40 + Math.cos(d.t) * 30, dt * 3); d.y = lerp(d.y, S.p.y - 40 + Math.sin(d.t) * 30, dt * 3); let best = null, bd = 420; for (const z of S.zombies) { const dd = Math.hypot(z.x - d.x, z.y - d.y); if (dd < bd) { bd = dd; best = z; } } if (best) { d.a = Math.atan2(best.y - d.y, best.x - d.x); if (d.cd <= 0) { d.cd = 0.18; S.bullets.push({ x: d.x, y: d.y, z: 60, vx: Math.cos(d.a) * 1100, vy: Math.sin(d.a) * 1100, life: 0.45, dmg: 20, src: 'drone', px: d.x, py: d.y }); } } if (d.t <= 0) S.drone = null; }
  const tr = S.p.inShip && S.ship.up.tractor ? 400 : 110;
  for (const pk of S.pickups) { pk.t += dt; const d = Math.hypot(pk.x - S.p.x, pk.y - S.p.y); if (d < tr && S.phase === 'play' && !S.p.inHeli) { pk.x += (S.p.x - pk.x) * dt * 7; pk.y += (S.p.y - pk.y) * dt * 7; } if (d < (S.p.inShip ? 40 : 16)) { pk.done = true; addRes(pk.kind, pk.amt, S.p.x, S.p.y); SFX.play('pickup'); } if (pk.t > 60) pk.done = true; }
  S.pickups = S.pickups.filter(p => !p.done);
}
function updateEffects(dt) {
  if (typeof v11Tick === 'function') v11Tick(dt);
  for (const q of S.particles) { q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= q.grav * dt; q.life -= dt; if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.6; q.vy *= 0.6; } if (q.smoke) { q.s += dt * 10; q.vx *= 0.98; } }
  S.particles = S.particles.filter(q => q.life > 0); if (S.particles.length > 1400) S.particles.splice(0, S.particles.length - 1400);
  for (const f of S.floaters) { f.z += dt * 40; f.life -= dt; } S.floaters = S.floaters.filter(f => f.life > 0);
  for (const r of S.rings) { r.life -= dt; r.r += (r.max - r.r) * dt * 6; } S.rings = S.rings.filter(r => r.life > 0);
  for (const f of S.fallingTrees) f.t += dt; S.fallingTrees = S.fallingTrees.filter(f => f.t < 1.4);
  S.shake *= Math.pow(0.002, dt); S.flash = Math.max(0, S.flash - dt * 1.5); S.hitMark = Math.max(0, S.hitMark - dt); S.killMark = Math.max(0, S.killMark - dt); S.multiT = Math.max(0, S.multiT - dt);
  if (S.streak > 0) { S.streakT -= dt; if (S.streakT <= 0) { S.streak = 0; S.streakGot = {}; } }
  S.uav = Math.max(0, S.uav - dt); if (S.build.chainT > 0) S.build.chainT -= dt;
  if (S.perkDelay > 0) { S.perkDelay -= dt; if (S.perkDelay <= 0 && S.pendingPerks > 0) UI.openPerks(); }
}
function updateNature(dt) {
  const W = S.W;
  for (const t of W.trees) { if (t.wob > 0) t.wob = Math.max(0, t.wob - dt * 3); if (t.hp <= 0) { t.regrow -= dt; if (t.regrow <= 0) { t.hp = t.max; t.grow = 0.01; MINI_DIRTY = true; } } if (t.grow > 0 && t.grow < 1) t.grow = Math.min(1, t.grow + dt / 20); }
  for (const n of W.nodes) { if (n.wob > 0) n.wob = Math.max(0, n.wob - dt * 3); if (n.hp <= 0) { n.respawn -= dt; if (n.respawn <= 0) { n.hp = n.max; MINI_DIRTY = true; } } }
  for (const b of W.bushes) if (b.berry && b.berries < 3) { b.regrow -= dt; if (b.regrow <= 0) { b.berries = 3; b.parts = bushParts(b); } }
  for (const c of W.crates) { if (c.open) c.opening = Math.min(1.5, c.opening + dt); if (c.air && c.z > 0) { c.z = Math.max(0, c.z - dt * 75); if (c.z === 0) { shake(5); burst(c.x, c.y, 5, '#8b7355', 25, 150); } } if (c.air && !c.open && Math.random() < dt * 8) smoke(c.x + 20, c.y, 5, 'rgba(255,60,50,0.55)', 1); }
  W.crates = W.crates.filter(c => !(c.open && c.opening >= 1.5));
  if (S.dropPlane) { const d = S.dropPlane; d.t += dt; d.x += Math.cos(d.a) * 300 * dt; d.y += Math.sin(d.a) * 300 * dt; if (!d.dropped && Math.hypot(d.x - d.tx, d.y - d.ty) < 40) { d.dropped = true; W.crates.push({ x: d.tx, y: d.ty, z: 360, air: true, rarity: Math.random() < 0.6 ? 2 : 3, opening: 0, open: false, hold: 0 }); } if (d.t > 12) S.dropPlane = null; }
  if (W.heli) { if (!S.p.inHeli) W.heli.rotSpd = lerp(W.heli.rotSpd || 0, 0, dt); W.heli.rot = (W.heli.rot || 0) + (W.heli.rotSpd || 0) * dt; if (S.p.inHeli && W.heli.rotSpd > 5) { W.heli.sndT = (W.heli.sndT || 0) - dt; if (W.heli.sndT <= 0) { W.heli.sndT = 0.11; SFX.play('rotor'); } } }
  if (W.exHeli) W.exHeli.rot += 6 * dt;
  for (const a of W.airships) { a.x += Math.cos(a.a) * a.sp * dt; a.y += Math.sin(a.a) * a.sp * dt; if (a.x < -400 || a.y < -400 || a.x > WORLD + 400 || a.y > WORLD + 400) { a.x = WORLD / 2 - Math.cos(a.a) * WORLD * 0.7; a.y = WORLD / 2 - Math.sin(a.a) * WORLD * 0.7; } }
  if (W.stationProp) W.stationProp.rot = (W.stationProp.rot || 0) + dt * 0.05;
  for (const n of W.npcs) {
    n.t += dt;
    if (n.wander) { if (!n.tx || Math.hypot(n.tx - n.x, n.ty - n.y) < 10) { n.tx = n.home.x + R(-260, 260); n.ty = n.home.y + R(-260, 260); n.wait = R(1, 4); } if (n.wait > 0) { n.wait -= dt; n.moving = 0; continue; } const a = Math.atan2(n.ty - n.y, n.tx - n.x); n.a = a; const ox = n.x, oy = n.y; moveEnt(n, Math.cos(a) * 55 * dt, Math.sin(a) * 55 * dt, 8, 'npc'); if (Math.hypot(n.x - ox, n.y - oy) < 0.3) n.tx = null; n.walk += dt * 10; n.moving = 1; }
    else if (Math.hypot(S.p.x - n.x, S.p.y - n.y) < 160) n.a += angDiff(n.a, Math.atan2(S.p.y - n.y, S.p.x - n.x)) * Math.min(1, dt * 4);
  }
  if (S.follower) { const f = S.follower, d = Math.hypot(S.p.x - f.x, S.p.y - f.y); f.hurt = Math.max(0, (f.hurt || 0) - dt); if (S.p.inCar || S.p.inHeli || S.p.inShip) { f.x = S.p.x; f.y = S.p.y; f.hidden = true; } else { f.hidden = false; if (d > 50) { const a = Math.atan2(S.p.y - f.y, S.p.x - f.x); f.a = a; moveEnt(f, Math.cos(a) * Math.min(200, d * 2) * dt, Math.sin(a) * Math.min(200, d * 2) * dt, 8, 'player'); f.walk += dt * 11; f.moving = 1; if (d > 500) { f.x = S.p.x - 30; f.y = S.p.y; } } else f.moving = 0; } }
}
