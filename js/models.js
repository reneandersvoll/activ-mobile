'use strict';
// ===================== MODELLE: alles aus eckigen Boxen =====================
// Part: [lx, ly, lz, w, d, h, farbe, extraYaw, depthBias]
function camoColor(camoId, t) {
  const c = CAMOS.find(c => c.id === camoId) || CAMOS[0];
  if (c.id === 'diamond') return hsl2hex((t * 60) % 360, 70, 75);
  if (c.id === 'verdant') return hsl2hex(100 + Math.sin(t * 3) * 25, 90, 50 + Math.sin(t * 5) * 8);
  return c.col;
}
// ---------- Waffen ----------
function weaponParts(kind, o, out, ox, oy, oz) {
  ox = ox || 0; oy = oy || 0; oz = oz || 0;
  const push = (x, y, z, w, d, h, c) => out.push([x + ox, y + oy, z + oz, w, d, h, c]);
  const at = o.attach || {};
  if (kind === 'plasma') {
    const rc = -(o.recoil || 0) * 5, t = o.t || 0, glow = hsl2hex(300 + Math.sin(t * 6) * 20, 100, 65);
    push(-2 + rc, 0, 20, 9, 4, 6, '#2a2440'); push(8 + rc, 0, 20.5, 14, 5, 7, '#3a3460'); push(8 + rc, 0, 27.5, 10, 3, 1.5, glow);
    push(17 + rc, 0, 22, 9, 3.4, 3.4, '#1c1830'); push(22 + rc, 0, 22.4, 3, 4.4, 2.6, glow); push(8 + rc, -2.8, 21, 8, 0.6, 3, glow); push(6 + rc, 0, 14, 4, 3, 7, '#4a3c80');
    if (at.scope) push(6 + rc, 0, 28.5, 7, 2.6, 2.6, '#121415'); if (at.xenocore) push(2 + rc, 3, 22, 4, 2, 4, '#5fffc0');
    return;
  }
  if (kind === 'rifle' || kind === 'lmg' || kind === 'sniper') {
    const rc = -(o.recoil || 0) * (kind === 'sniper' ? 7 : 4), cam = camoColor(o.camo, o.t || 0), L = kind === 'sniper' ? 1.35 : kind === 'lmg' ? 1.2 : 1;
    push(-2 + rc, 0, 20, at.stock ? 11 : 8, at.stock ? 4 : 3.4, at.stock ? 6 : 5, at.stock ? '#3a3f42' : cam);
    push(7 + rc, 0, 21, 13 * L, kind === 'lmg' ? 5 : 4, 5.5, cam); push(7 + rc, 0, 26.5, 10 * L, 2.6, 1.2, '#1f2427');
    if (kind === 'lmg') { push(9 + rc, 3.2, 14, 7, 5, 8, '#3b4a2f'); push(9 + rc, 3.2, 22, 7, 5, 1, '#2a3522'); push(22 + rc, 0, 18, 1.5, 6, 4, '#16191b'); }
    else push(9 + rc, 0, at.extmag ? 11 : 15, 3.5, 3, at.extmag ? 10 : 6, '#1b1e20');
    push(17 * L + rc, 0, 23.2, 10 * L + (kind === 'sniper' ? 8 : 0), 2, 2, '#16191b'); push(14 + rc, 0, 21, 6, 3.6, 2.4, '#2a2f31');
    if (kind === 'sniper') { push(8 + rc, 0, 28, 13, 3.2, 3.2, '#121415'); push(14.8 + rc, 0, 28.3, 0.6, 2.6, 2.6, '#8ee8ff'); push(22 + rc, -2.5, 17, 1.2, 1.2, 7, '#222'); push(22 + rc, 2.5, 17, 1.2, 1.2, 7, '#222'); }
    if (at.suppressor) push(26 * L + 4 + rc, 0, 22.7, 10, 3, 3, '#0f1112');
    if (at.scope && kind !== 'sniper') { push(7 + rc, 0, 27.5, 9, 2.8, 2.8, '#121415'); push(11.8 + rc, 0, 27.8, 0.6, 2.2, 2.2, '#8ee8ff'); push(4 + rc, 0, 26.4, 1.5, 2, 1.4, '#121415'); push(10 + rc, 0, 26.4, 1.5, 2, 1.4, '#121415'); }
    if (at.thermal) push(3 + rc, 0, 27.5, 4, 3, 3, '#5a2a7a'); if (at.grip) push(14 + rc, 0, 16, 2.6, 2.6, 5, '#202325');
    if (at.laser) push(15 + rc, 2.6, 21.5, 5, 1.6, 1.6, '#b52222'); if (at.drum) push(9 + rc, 2.4, 14, 5, 2, 5, '#2b3b2b');
    if (at.hollow) push(5 + rc, -2.4, 22, 3, 0.6, 3, '#d4a017'); if (at.xenocore) push(3 + rc, 2.4, 22, 4, 1.4, 4, '#5fffc0');
  } else if (kind === 'shotgun') {
    const rc = -(o.recoil || 0) * 7, cam = camoColor(o.camo, o.t || 0);
    push(-3 + rc, 0, 20, 10, 4, 6, '#6b4523'); push(6 + rc, 0, 21, 12, 4.6, 5.5, cam); push(16 + rc, 0, 24.2, 14, 2.8, 2.8, '#17191a');
    push(16 + rc, 0, 21.4, 13, 2.6, 2.4, '#202224'); push(15 + rc + (o.pump || 0) * -4, 0, 20.6, 7, 4.4, 3.4, '#7a5230');
    if (at.scope) push(6 + rc, 0, 27, 7, 2.6, 2.4, '#121415'); if (at.suppressor) push(28 + rc, 0, 23.8, 7, 3.6, 3.6, '#0f1112');
    if (at.laser) push(14 + rc, 2.8, 21.5, 5, 1.6, 1.6, '#b52222'); if (at.hollow) push(4 + rc, -2.6, 22, 3, 0.6, 3, '#d4a017');
  } else if (kind === 'axe') {
    const s = o.swing || 0, e = s < 0.35 ? -s / 0.35 * 0.4 : (s - 0.35) / 0.65, k = clamp(e, -0.4, 1);
    const hx = lerp(9, 22, k) + (k < 0 ? k * 14 : 0), hz = lerp(36, 12, Math.max(0, k)) + (k < 0 ? -k * 18 : 0);
    for (let i = 0; i <= 4; i++) { const t = i / 4; push(lerp(6, hx, t), 0, lerp(21, hz, t) - 2, 3, 2.4, 4, i % 2 ? '#7a4f2a' : '#8b5e34'); }
    push(hx, 0, hz - 3, 4, 2.6, 8, '#9aa6aa'); push(hx + 2.8, 0, hz - 4, 1.6, 3, 10, '#e9f1f3'); push(hx - 2.6, 0, hz - 1, 2, 2.4, 4, '#5e6669');
  } else if (kind === 'medkit') { push(9, 0, 18, 8, 8, 6, '#ececec'); push(9, 0, 24.1, 2, 6, 0.4, '#d63031'); push(9, 0, 24.1, 6, 2, 0.4, '#d63031'); }
  else if (kind === 'grenade') { push(9, 0, 21, 4, 4, 5, '#3e5b2d'); push(9, 0, 26, 1.5, 1.5, 2, '#999'); }
  else if (kind === 'package') { push(8, 0, 16, 12, 12, 10, '#b5895a'); push(8, 0, 26.1, 12.4, 2, 0.4, '#d63031'); push(8, 0, 21, 12.4, 12.4, 1, '#d63031'); }
}

// ---------- Menschen & Monster ----------
function humanParts(L, A) {
  const out = [], bw = L.build === 'Breit' ? 1.22 : L.build === 'Schmal' ? 0.86 : 1;
  const ws = Math.sin(A.walk || 0) * (A.moving || 0), lift = Math.abs(Math.cos(A.walk || 0)) * (A.moving || 0) * 1.5;
  const pants = L.pants, shirt = L.shirt, skin = L.skin, boots = L.shoes || '#2b211a';
  out.push([ws * 4.5, -3.8 * bw, lift * (ws > 0 ? 1 : 0), 6, 6, 15, pants]); out.push([-ws * 4.5, 3.8 * bw, lift * (ws < 0 ? 1 : 0), 6, 6, 15, pants]);
  out.push([ws * 4.5 + 1, -3.8 * bw, lift * (ws > 0 ? 1 : 0), 8, 6.4, 4, boots]); out.push([-ws * 4.5 + 1, 3.8 * bw, lift * (ws < 0 ? 1 : 0), 8, 6.4, 4, boots]);
  const bob = lift * 0.6;
  out.push([0, 0, 15 + bob, 9, 15 * bw, 15, shirt]); out.push([0, 0, 15 + bob, 9.6, 15.6 * bw, 2.6, A.zombie ? '#3b3b2b' : (L.belt || '#3a2c1e')]);
  if (L.tie) { out.push([4.7, 0, 20 + bob, 0.6, 2, 9, L.tie]); out.push([4.7, -3.4, 24 + bob, 0.6, 3, 6, '#ececec']); out.push([4.7, 3.4, 24 + bob, 0.6, 3, 6, '#ececec']); }
  if (L.coat) { out.push([-1, 0, 6 + bob, 10.6, 16 * bw, 10, L.coat]); out.push([4.9, -5, 15 + bob, 0.6, 2, 12, L.trim || '#d9a441']); out.push([4.9, 5, 15 + bob, 0.6, 2, 12, L.trim || '#d9a441']); }
  if (L.neon) { out.push([4.7, -4, 18 + bob, 0.6, 1.2, 10, L.neon]); out.push([4.7, 4, 18 + bob, 0.6, 1.2, 10, L.neon]); }
  if (L.goggles) out.push([5.7, 0, 36 + bob, 0.8, 11, 3, L.goggles]);
  if (!A.zombie && !A.npc) { out.push([4.7, 3 * bw, 22 + bob, 0.6, 3, 4, hexShade(shirt, 0.7)]); out.push([-7, 0, 17 + bob, 5, 11 * bw, 12, L.pack]); out.push([-7, 0, 29 + bob, 5.5, 12 * bw, 3.4, '#8a7a55']); out.push([-9.6, 0, 19 + bob, 0.8, 7, 5, hexShade(L.pack, 0.75)]); }
  else if (A.zombie && !A.alien) { out.push([4.7, -3, 18 + bob, 0.6, 4, 5, '#3d2b2b']); out.push([4.7, 4, 25 + bob, 0.6, 3, 3, skin]); }
  const hz = 30 + bob, hx = A.zombie ? 2 : 0;
  out.push([hx, 0, hz, 11, 11, 11, skin]);
  const eye = A.alien ? '#fff27a' : A.zombie ? '#ff3b30' : '#1b1b1b';
  out.push([hx + 5.6, -2.6, hz + 5, 0.6, 2, 2.2, eye]); out.push([hx + 5.6, 2.6, hz + 5, 0.6, 2, 2.2, eye]);
  if (A.alien) { out.push([hx + 5.6, -2.6, hz + 8, 0.6, 1.6, 1.6, eye]); out.push([hx + 5.6, 2.6, hz + 8, 0.6, 1.6, 1.6, eye]); out.push([hx - 2, -3, hz + 11, 2, 2, 7, hexShade(skin, 0.7)]); out.push([hx - 2, 3, hz + 11, 2, 2, 7, hexShade(skin, 0.7)]); out.push([hx - 2, -3, hz + 18, 3, 3, 3, eye]); out.push([hx - 2, 3, hz + 18, 3, 3, 3, eye]); out.push([-5, 0, 22 + bob, 3, 13, 6, hexShade(skin, 0.6)]); }
  else if (A.zombie) out.push([hx + 5.6, 0, hz + 1.5, 0.6, 5, 1.6, '#2a0f0f']);
  else out.push([hx + 5.6, 0, hz + 2, 0.6, 3, 0.8, hexShade(skin, 0.7)]);
  if (L.glasses) { out.push([hx + 5.9, -2.6, hz + 4.6, 0.6, 3, 2.6, L.glasses]); out.push([hx + 5.9, 2.6, hz + 4.6, 0.6, 3, 2.6, L.glasses]); }
  const hc = L.hair;
  switch (L.hairStyle) {
    case 'Kurz': out.push([hx - 0.5, 0, hz + 10, 12, 12, 2.6, hc]); out.push([hx - 5, 0, hz + 3, 2.4, 12, 8, hc]); break;
    case 'Lang': out.push([hx - 0.5, 0, hz + 10, 12, 12, 2.6, hc]); out.push([hx - 5.4, 0, hz - 5, 2.6, 12.4, 16, hc]); out.push([hx, -5.8, hz + 1, 9, 1.2, 10, hc]); out.push([hx, 5.8, hz + 1, 9, 1.2, 10, hc]); break;
    case 'Irokese': out.push([hx - 1, 0, hz + 10.5, 11, 3, 5, hc]); break;
    case 'Afro': out.push([hx - 1, 0, hz + 6, 15, 15, 9, hc]); break;
    case 'Zopf': out.push([hx - 0.5, 0, hz + 10, 12, 12, 2.6, hc]); out.push([hx - 7.4, 0, hz - 2, 3, 3, 10, hc]); break;
  }
  switch (L.hat) {
    case 'Cap': out.push([hx, 0, hz + 10.5, 12.2, 12.2, 3.4, hexShade(shirt, 0.8)]); out.push([hx + 7.5, 0, hz + 10.6, 5, 10, 1.2, hexShade(shirt, 0.6)]); break;
    case 'Helm': out.push([hx, 0, hz + 9, 13.4, 13.4, 5.5, '#4b5d3a']); out.push([hx, 0, hz + 8, 14.4, 14.4, 1.4, '#3e4e30']); break;
    case 'Bandana': out.push([hx, 0, hz + 7.5, 11.8, 11.8, 3, '#c0392b']); out.push([hx - 6.5, 1, hz + 6, 2, 2, 4, '#c0392b']); break;
    case 'Beanie': out.push([hx, 0, hz + 9, 12.2, 12.2, 5.4, '#d35400']); out.push([hx, 0, hz + 14, 3, 3, 2.4, '#ecf0f1']); break;
    case 'Pilotenhaube': out.push([hx - 0.3, 0, hz + 6, 12.6, 12.6, 6, '#6b4f2a']); out.push([hx + 5.9, 0, hz + 6.4, 1.4, 9.5, 2.6, '#7fd8ff']); break;
    case 'Zylinder': out.push([hx, 0, hz + 10.5, 15, 15, 1.4, '#151515']); out.push([hx, 0, hz + 11.5, 10.5, 10.5, 10, '#151515']); out.push([hx, 0, hz + 12.5, 10.8, 10.8, 1.6, '#8a1c1c']); break;
    case 'Melone': out.push([hx, 0, hz + 10.5, 14, 14, 1.4, '#3a2c1e']); out.push([hx, 0, hz + 11.5, 10, 10, 5, '#3a2c1e']); break;
  }
  if (L.beard === 'Stoppeln') out.push([hx + 5.5, 0, hz, 0.8, 9, 3, hexShade(hc, 0.8)]);
  if (L.beard === 'Vollbart') out.push([hx + 5.2, 0, hz - 1, 2.2, 10, 5.5, hc]);
  const tool = A.tool, sz = 15 * bw / 2 + 2.6;
  if (A.zombie) {
    const reach = Math.sin((A.t || 0) * 6) * 1.5;
    out.push([7 + reach, -sz + 1, 24 + bob, 13, 4.5, 4.5, L.shirt]); out.push([7 - reach, sz - 1, 24 + bob, 13, 4.5, 4.5, L.shirt]);
    out.push([15 + reach, -sz + 1, 24 + bob, 4, 4.8, 4.8, skin]); out.push([15 - reach, sz - 1, 24 + bob, 4, 4.8, 4.8, skin]);
    if (A.alien) { out.push([19 + reach, -sz + 1, 24 + bob, 5, 1.2, 1.2, '#fff']); out.push([19 - reach, sz - 1, 24 + bob, 5, 1.2, 1.2, '#fff']); }
  } else if (GUNS.includes(tool)) {
    out.push([4, sz - 1, 21 + bob, 9, 4.6, 4.6, shirt]); out.push([8, -sz + 2, 21 + bob, 13, 4.6, 4.6, shirt]);
    out.push([10, 1, 20.5 + bob, 3.6, 4, 4, skin]); out.push([15, -1.5, 20.5 + bob, 3.6, 4, 4, skin]); weaponParts(tool, A, out, 0, 1, bob);
  } else if (tool === 'axe') {
    const s = A.swing || 0, up = s > 0 && s < 0.35 ? 8 : 0;
    out.push([3, sz - 1, 19 + bob + up * 0.5, 9, 4.6, 4.6, shirt]); out.push([6, sz - 3, 19 + bob + up, 4, 4.4, 4.4, skin]);
    out.push([-ws * 3, -sz, 15 + bob, 5, 4.6, 14, shirt]); out.push([-ws * 3, -sz, 13 + bob, 4.6, 4.4, 3.6, skin]); weaponParts('axe', A, out, 0, sz - 3, bob);
  } else if (tool === 'package') {
    out.push([5, -sz + 1, 18 + bob, 9, 4.6, 4.6, shirt]); out.push([5, sz - 1, 18 + bob, 9, 4.6, 4.6, shirt]); weaponParts('package', A, out, 0, 0, bob);
  } else {
    const wave = A.wave ? Math.sin((A.t || 0) * 5) * 3 : 0;
    out.push([-ws * 3, -sz, 15 + bob, 5, 4.6, 14, shirt]); out.push([-ws * 3, -sz, 13 + bob, 4.6, 4.4, 3.6, skin]);
    if (A.npc && !tool) { out.push([ws * 3, sz, 15 + bob + wave, 5, 4.6, 14, shirt]); out.push([ws * 3, sz, 13 + bob + wave, 4.6, 4.4, 3.6, skin]); }
    else { out.push([4, sz - 1, 18 + bob, 8, 4.6, 4.6, shirt]); out.push([8, sz - 3, 18 + bob, 4, 4.4, 4.4, skin]); if (tool) weaponParts(tool, A, out, 0, sz - 3, bob - 2); }
  }
  return out;
}
function zombieLook(type, seed, shirtOverride, alienSkin) {
  const z = ZTYPES[type], cloths = ['#5b4a6e', '#4a5a3a', '#6e4a3a', '#3a4a5e', '#5e5e4a', '#7a3a3a'];
  if (z.alien) { const sk = alienSkin || z.skin; return { skin: sk, hair: hexShade(sk, 0.6), hairStyle: 'Glatze', hat: 'Keine', shirt: hexShade(sk, 0.75), pants: hexShade(sk, 0.55), pack: '#000000', beard: 'Nein', build: type === 'xbrute' ? 'Breit' : 'Schmal', shoes: hexShade(sk, 0.4) }; }
  return { skin: z.skin, hair: '#2b2b20', hairStyle: seed % 3 === 0 ? 'Glatze' : seed % 3 === 1 ? 'Kurz' : 'Lang', hat: shirtOverride && seed % 4 === 0 ? 'Helm' : 'Keine', shirt: type === 'boss' ? '#4a3a22' : (shirtOverride && seed % 2 ? shirtOverride : cloths[seed % cloths.length]), pants: '#3a3226', pack: '#000000', beard: 'Nein', build: type === 'brute' ? 'Breit' : type === 'runner' ? 'Schmal' : 'Normal' };
}
function bossExtras(t) {
  const out = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; out.push([Math.cos(a) * 6, Math.sin(a) * 6, 42 + (i % 2) * 3, 3, 3, 9 + (i % 3) * 3, '#3b6b26']); }
  out.push([0, 0, 18, 10, 17, 3, '#6b8f3a']); out.push([-6, -6, 26, 3, 3, 14, '#4a7a2a']); out.push([-6, 6, 22, 3, 3, 16, '#4a7a2a']); out.push([0, 0, 46 + Math.sin(t * 4), 4, 4, 4, '#ff5e3a']);
  return out;
}
function droneParts(t, hit) {
  const b = hit ? '#ffffff' : '#3a4048', s = t * 25;
  return [[0, 0, 0, 18, 16, 8, b], [0, 0, 8, 12, 10, 4, '#2a2f36'], [9.4, 0, 3, 0.8, 8, 4, '#ff2a2a'], [10, 0, 4, 1, 3, 2, '#ffd0d0'], [-10, 0, 2, 4, 10, 4, '#555c66'],
    [0, -12, 4, 6, 6, 2, '#2a2f36'], [0, 12, 4, 6, 6, 2, '#2a2f36'], [0, -12, 6, 16, 2, 0.6, '#999', s], [0, 12, 6, 16, 2, 0.6, '#999', -s], [6, -6, -4, 6, 2, 2, '#16191b'], [6, 6, -4, 6, 2, 2, '#16191b']];
}
function npcLook(kind, rng) {
  const r = rng || Math.random, pk = a => a[Math.floor(r() * a.length)];
  const base = { skin: pk(CHAR_OPTS.skin.slice(0, 5)), hair: pk(CHAR_OPTS.hair), hairStyle: pk(CHAR_OPTS.hairStyle), hat: 'Keine', beard: pk(CHAR_OPTS.beard), build: pk(CHAR_OPTS.build), pack: '#000000' };
  if (kind === 'rich') return Object.assign(base, { shirt: pk(['#efe3c8', '#3a5f8a', '#7a2a3a', '#f2efe6', '#2f4f5a']), pants: pk(['#2a2a34', '#e6dcc4', '#3a2c22']), coat: pk(['#3b4d74', '#7a2a3a', '#2f4f5a', '#efe3c8']), trim: '#d9a441', tie: pk(['#8a1c1c', '#1c3a8a', '#d4a017']), shoes: '#2a1d14', hat: r() < 0.25 ? pk(['Zylinder', 'Melone']) : 'Keine', glasses: r() < 0.15 ? '#d9a441' : null });
  if (kind === 'punk') return Object.assign(base, { shirt: pk(['#2a332a', '#3a2a2a', '#2a2a3a', '#4a3a2a']), pants: pk(['#1a1a1a', '#2a2a2a', '#3a3226']), coat: r() < 0.4 ? pk(['#4a3a2a', '#2a3a32']) : null, trim: '#5fff8a', neon: pk(['#ff3fa4', '#5fff8a', '#3ff4ff', '#ffb020']), hairStyle: pk(['Irokese', 'Kurz', 'Glatze', 'Lang', 'Zopf']), hair: pk(['#ff3fa4', '#3ff4ff', '#5fff8a', '#2a1d14', '#8e44ad']), goggles: r() < 0.4 ? pk(['#5fff8a', '#ffb020']) : null });
  if (kind === 'guard') return Object.assign(base, { shirt: '#3b4d74', pants: '#1f2a36', hat: 'Helm', belt: '#d9a441', coat: '#2c3a5a', trim: '#d9a441' });
  if (kind === 'survivor') return Object.assign(base, { shirt: pk(['#5b7f3a', '#6b4f2a', '#8a3a3a', '#3d5a80']), pants: pk(CHAR_OPTS.pants), hat: pk(['Cap', 'Bandana', 'Beanie', 'Keine']), pack: '#6b4f2a' });
  if (kind === 'spacer') return Object.assign(base, { shirt: pk(['#dfe6e9', '#2e86de', '#e17055']), pants: '#2d3436', hat: 'Pilotenhaube', belt: '#ffb020', goggles: '#7fd8ff' });
  return Object.assign(base, { shirt: pk(CHAR_OPTS.shirt), pants: pk(CHAR_OPTS.pants) });
}

// ---------- Natur ----------
function treeParts(tr) {
  const out = [], v = tr.v, c = tr.cols;
  switch (tr.kind) {
    case 'oak':
      out.push([0, 0, 0, 10, 10, 38, '#5b3a22']); out.push([6, 0, 0, 5, 4, 5, '#4a2f1b']); out.push([-4, 5, 0, 4, 5, 4, '#4a2f1b']);
      out.push([0, 0, 30, 48, 48, 16, c[0]]); out.push([-3, 2, 45, 38, 36, 14, c[1]]); out.push([2, -2, 58, 22, 22, 11, c[2]]);
      out.push([18 * v, 12, 34, 16, 16, 12, c[1]]); out.push([-16, -14 * v, 38, 14, 14, 12, c[0]]); out.push([10, -18, 41, 12, 12, 10, c[2]]);
      if (tr.flowers) for (let i = 0; i < 5; i++) out.push([((i * 13) % 36) - 18, ((i * 23) % 36) - 18, 46 + i * 5, 4, 4, 3, '#f5a9c9']); break;
    case 'pine': case 'snowpine':
      out.push([0, 0, 0, 8, 8, 26, '#4e3420']); out.push([0, 0, 18, 42, 42, 12, c[0]]); out.push([0, 0, 30, 32, 32, 12, c[1]]); out.push([0, 0, 42, 22, 22, 12, c[0]]); out.push([0, 0, 54, 12, 12, 12, c[2]]); out.push([0, 0, 66, 5, 5, 6, c[2]]);
      if (tr.kind === 'snowpine') { out.push([0, 0, 30, 34, 34, 2, '#f4f8fb']); out.push([0, 0, 42, 24, 24, 2, '#f4f8fb']); out.push([0, 0, 54, 14, 14, 2, '#ffffff']); out.push([0, 0, 66, 6, 6, 2, '#ffffff']); } break;
    case 'birch':
      out.push([0, 0, 0, 7, 7, 46, '#e8e4d8']); out.push([3.6, 0, 12, 0.5, 4, 3, '#2d2d2d']); out.push([3.6, 1, 26, 0.5, 3, 2, '#2d2d2d']); out.push([0, 3.6, 34, 3, 0.5, 2, '#2d2d2d']);
      out.push([0, 0, 38, 32, 32, 14, c[0]]); out.push([2, 1, 51, 24, 24, 12, c[1]]); out.push([-12, 8, 42, 12, 12, 10, c[2]]); break;
    case 'cactus':
      out.push([0, 0, 0, 10, 10, 44, '#4f8a3a']); out.push([0, 0, 44, 8, 8, 4, '#5fa047']); out.push([8, 0, 16, 8, 6, 6, '#4f8a3a']); out.push([11, 0, 22, 6, 6, 14, '#5a9a42']);
      out.push([-8, 0, 22, 8, 6, 6, '#4f8a3a']); out.push([-11, 0, 28, 6, 6, 12, '#5a9a42']); out.push([0, 0, 48, 4, 4, 3, '#ff6b9a']); break;
    case 'dead':
      out.push([0, 0, 0, 9, 9, 50, '#3e3428']); out.push([6, 0, 30, 14, 3, 3, '#3e3428']); out.push([12, 0, 30, 3, 3, 14, '#3e3428']); out.push([-6, 2, 40, 12, 3, 3, '#3e3428']); out.push([-11, 2, 40, 3, 3, 12, '#3e3428']);
      out.push([0, 0, 50, 16, 16, 6, c[0]]); out.push([12, 0, 44, 8, 8, 5, c[1]]); break;
    case 'shroom': case 'shroomtall': {
      const H = tr.kind === 'shroomtall' ? 70 : 36;
      out.push([0, 0, 0, 9, 9, H, '#e8f0e0']); out.push([0, 0, H * 0.5, 11, 11, 3, c[2]]);
      out.push([0, 0, H, 50, 50, 8, c[0]]); out.push([0, 0, H + 8, 38, 38, 6, c[1]]); out.push([0, 0, H + 14, 20, 20, 4, c[0]]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + v; out.push([Math.cos(a) * 16, Math.sin(a) * 16, H + 8.5, 4, 4, 1, c[2]]); }
      out.push([0, 0, H - 2, 48, 48, 2, hexShade(c[0], 0.6)]); break;
    }
    case 'lavaspire':
      out.push([0, 0, 0, 22, 22, 18, '#2a1e22']); out.push([2, 1, 18, 16, 16, 22, '#1e1418']); out.push([0, 0, 40, 10, 10, 26, '#2a1e22']); out.push([0, 0, 66, 5, 5, 12, '#1e1418']);
      out.push([11.2, 0, 4, 0.6, 3, 30, '#ff6a2a']); out.push([0, 11.2, 10, 3, 0.6, 22, '#ffb04a']); out.push([5.2, 0, 44, 0.6, 2, 18, '#ff6a2a']); break;
    case 'obelisk':
      out.push([0, 0, 0, 20, 20, 6, '#3a3440']); out.push([0, 0, 6, 12, 12, 70, '#2a2430']); out.push([0, 0, 76, 8, 8, 8, '#2a2430']);
      out.push([6.2, 0, 20, 0.6, 4, 40, c[2] || '#ffd27a']); out.push([0, 6.2, 30, 4, 0.6, 30, c[2] || '#ffd27a']); out.push([0, 0, 84, 4, 4, 4, c[2] || '#ffd27a']); break;
    case 'crystaltree':
      out.push([0, 0, 0, 14, 14, 10, '#3a3060']); out.push([0, 0, 10, 8, 8, 50, '#8a7cff']); out.push([8, 4, 6, 6, 6, 36, '#b0a6ff']); out.push([-7, -4, 6, 6, 6, 42, '#6a5cdf']);
      out.push([4, -8, 4, 5, 5, 26, '#c8c0ff']); out.push([0, 0, 60, 4, 4, 10, '#e6ddff']); out.push([-9, 6, 4, 4, 4, 20, '#8a7cff']); break;
    case 'goldspire':
      out.push([0, 0, 0, 24, 24, 8, '#8a6a2a']); out.push([0, 0, 8, 16, 16, 30, '#d9b35a']); out.push([0, 0, 38, 12, 12, 6, '#7a5a14']); out.push([0, 0, 44, 8, 8, 34, '#e8c86a']); out.push([0, 0, 78, 4, 4, 14, '#fff3c0']);
      out.push([8.2, 0, 14, 0.6, 8, 8, '#5fffc0']); out.push([0, 8.2, 20, 8, 0.6, 8, '#5fffc0']); break;
    default:
      out.push([0, 0, 0, 11, 11, 56, '#6b4a2b']); out.push([7, 0, 0, 6, 4, 9, '#5a3b20']); out.push([-6, -5, 0, 5, 6, 8, '#5a3b20']); out.push([0, 7, 0, 4, 6, 7, '#5a3b20']);
      out.push([0, 0, 52, 62, 62, 10, c[0]]); out.push([4, -3, 62, 44, 44, 10, c[1]]); out.push([-20, 16, 56, 22, 22, 9, c[2]]);
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + v; out.push([Math.cos(a) * 26, Math.sin(a) * 26, 30, 2, 2, 24, '#2f6b2a']); }
  }
  return out;
}
function rockParts(n) {
  const out = [];
  switch (n.kind) {
    case 'rock': out.push([0, 0, 0, 30, 26, 18, '#8a918d']); out.push([-8, 7, 0, 18, 16, 26, '#7c837f']); out.push([10, -6, 0, 14, 14, 11, '#9aa19c']); out.push([-8, 7, 26, 12, 10, 3, '#5f9c4a']); out.push([2, 0, 18, 10, 8, 2, '#6aa953']); break;
    case 'scrap': out.push([0, 0, 0, 30, 24, 8, '#6b4a33']); out.push([-6, 4, 8, 16, 12, 9, '#8f5a36']); out.push([8, -4, 8, 10, 14, 6, '#5f6a70']); out.push([12, 8, 0, 9, 9, 9, '#1c1c1c']); out.push([-10, -8, 0, 4, 12, 16, '#a35f2a']); out.push([2, 2, 17, 6, 6, 3, '#c97a3a']); break;
    case 'milcrate': out.push([0, 0, 0, 30, 18, 14, '#4b5d3a']); out.push([0, 0, 14, 31, 19, 2, '#3e4e30']); out.push([0, 9.4, 4, 18, 0.6, 6, '#d4c27a']); out.push([-4, -2, 16, 18, 12, 10, '#556b2f']); out.push([12, 6, 0, 6, 6, 10, '#7a6a3a']); break;
    case 'crystal': out.push([0, 0, 0, 22, 22, 6, '#3a3a4a']); out.push([0, 0, 6, 8, 8, 30, '#c77dff']); out.push([7, 4, 4, 6, 6, 20, '#e0aaff']); out.push([-6, -3, 4, 6, 6, 24, '#9d4edd']); out.push([2, -8, 3, 5, 5, 14, '#d68cff']); break;
    case 'cellnode': out.push([0, 0, 0, 30, 22, 6, '#6b6b6b']); for (let i = -1; i <= 1; i++) { out.push([i * 9, 0, 6, 7, 16, 16, '#2d2d2d']); out.push([i * 9, 0, 22, 5, 4, 2, '#ffb020']); out.push([i * 9, 8.2, 12, 4, 0.6, 4, '#ffb020']); } break;
    case 'server': out.push([0, 0, 0, 16, 22, 40, '#2a3038']); for (let i = 0; i < 5; i++) { out.push([8.2, 0, 5 + i * 7, 0.6, 18, 4, '#1a1f26']); out.push([8.5, -6, 6 + i * 7, 0.4, 2, 1.5, i % 2 ? '#3ff4ff' : '#4dff6a']); } out.push([0, 0, 40, 18, 24, 3, '#e8eef2']); break;
    case 'rubble': out.push([0, 0, 0, 34, 28, 8, '#8f8a80']); out.push([-6, 4, 8, 16, 14, 8, '#a19c92']); out.push([8, -6, 6, 12, 10, 10, '#7a756c']); out.push([-12, -8, 0, 4, 4, 22, '#5a3b2a']); out.push([4, 10, 4, 18, 3, 3, '#4a4f52']); break;
    case 'asteroid': out.push([0, 0, 0, 40, 34, 26, '#6a6660']); out.push([-8, 6, 20, 24, 20, 14, '#7a756c']); out.push([10, -6, 4, 18, 14, 18, '#5a5650']); out.push([-14, -10, 6, 10, 10, 10, '#4a4640']); break;
    case 'titanrock': out.push([0, 0, 0, 38, 32, 24, '#55606a']); out.push([-6, 6, 18, 22, 18, 14, '#64707a']); out.push([19.2, 0, 6, 0.6, 10, 12, '#9fe8ff']); out.push([0, 16.2, 10, 12, 0.6, 8, '#9fe8ff']); out.push([4, -4, 32, 6, 6, 6, '#bff4ff']); break;
    case 'xenonode': out.push([0, 0, 0, 26, 26, 8, '#1c4a40']); out.push([0, 0, 8, 14, 14, 14, '#2fd6b0']); out.push([0, 0, 22, 8, 8, 8, '#a6ffe6']); for (let i = 0; i < 4; i++) { const a = i * 1.57; out.push([Math.cos(a) * 12, Math.sin(a) * 12, 4, 4, 4, 10, '#5fffc0']); } break;
    case 'plasmanode': out.push([0, 0, 0, 30, 28, 10, '#1e1418']); out.push([0, 0, 10, 16, 16, 18, '#2a1e22']); out.push([8.2, 0, 12, 0.6, 10, 12, '#ff5ef0']); out.push([0, 8.2, 12, 10, 0.6, 12, '#ff5ef0']); out.push([0, 0, 28, 8, 8, 6, '#ff9af8']); break;
    case 'voidnode': out.push([0, 0, 0, 20, 20, 4, '#2a2050']); out.push([0, 0, 4, 6, 6, 34, '#8a7cff']); out.push([6, 4, 4, 5, 5, 22, '#b0a6ff']); out.push([-5, -4, 4, 5, 5, 26, '#6a5cdf']); out.push([0, 0, 38, 3, 3, 6, '#ffffff']); break;
    case 'relicnode': out.push([0, 0, 0, 30, 30, 6, '#5a4a2a']); out.push([0, 0, 6, 18, 18, 18, '#d9b35a']); out.push([9.2, 0, 10, 0.6, 10, 10, '#5fffc0']); out.push([0, 0, 24, 12, 12, 4, '#e8c86a']); out.push([0, 0, 28, 6, 6, 8, '#fff3c0']); break;
  }
  return out;
}
function bushParts(b) {
  const out = [], c = b.col;
  if (b.tuft) { for (let i = 0; i < 7; i++) { const a = i * 0.9 + b.sc, r = (i % 3) * 4; out.push([Math.cos(a) * r, Math.sin(a) * r, 0, 2.4, 2.4, 14 + (i * 7) % 16, i % 2 ? c : hexShade(c, 1.15)]); } if (b.flower) out.push([0, 0, 26, 4, 4, 3, b.flower]); return out; }
  out.push([0, 0, 0, 24, 22, 12, c]); out.push([-6, 5, 6, 16, 14, 10, hexShade(c, 1.15)]); out.push([7, -4, 4, 12, 12, 9, hexShade(c, 0.9)]);
  if (b.berries > 0) for (let i = 0; i < 6; i++) out.push([((i * 7) % 20) - 10, ((i * 11) % 18) - 9, 12 + (i % 3) * 3, 3, 3, 3, '#e8384f']);
  return out;
}

// ---------- Fahrzeuge ----------
function carParts(car) {
  const out = [], u = car.up || {}, col = car.wreck ? '#8a5a3a' : car.color, dark = hexShade(col, 0.75), steer = car.steer || 0;
  const wheel = (x, y, ys) => { if (car.wreck && x > 0 && y > 0) return; out.push([x, y, 0, 13, 5, 13, '#151515', ys]); out.push([x, y + Math.sign(y) * 2.6, 4, 5, 0.6, 5, '#8a8a8a', ys]); };
  wheel(19, -15, steer); wheel(19, 15, steer); wheel(-19, -15, 0); wheel(-19, 15, 0);
  out.push([0, 0, 5, 62, 28, 11, col]); out.push([21, 0, 16, 20, 27, 4, col]); out.push([-6, 0, 16, 28, 27, 14, dark]);
  out.push([8.4, 0, 18, 1.4, 24, 10, car.wreck ? '#2a3a3a' : '#86d0ee']); out.push([-6, -13.8, 20, 22, 0.8, 8, car.wreck ? '#2a3a3a' : '#6ab0d0']); out.push([-6, 13.8, 20, 22, 0.8, 8, car.wreck ? '#2a3a3a' : '#6ab0d0']);
  out.push([-6, 0, 30, 29, 28, 2.4, col]); out.push([-24, 0, 16, 14, 27, 3, dark]); out.push([31.4, 0, 5, 2.4, 30, 5, '#2e2e2e']); out.push([-31.4, 0, 5, 2.4, 30, 5, '#2e2e2e']);
  const hl = car.wreck ? '#555' : (car.lightsOn ? '#fffbd0' : '#d8d2a0');
  out.push([31.2, -9, 11, 1, 6, 4, hl]); out.push([31.2, 9, 11, 1, 6, 4, hl]); out.push([-31.2, -10, 11, 1, 5, 3, '#ff3030']); out.push([-31.2, 10, 11, 1, 5, 3, '#ff3030']);
  if (car.wreck) { out.push([18, -6, 20, 10, 10, 4, '#2f6b2a']); out.push([-8, 4, 32, 14, 12, 5, '#3f8a3a']); out.push([-20, -10, 18, 8, 8, 8, '#2f6b2a']); out.push([0, 15, 4, 20, 2, 10, '#3a7a30']); }
  if (u.armor) { out.push([0, -14.8, 7, 52, 1.6, 9, '#59656c']); out.push([0, 14.8, 7, 52, 1.6, 9, '#59656c']); if (u.armor >= 2) out.push([9, 0, 21, 1.8, 24, 9, '#3a4248']); if (u.armor >= 3) out.push([-6, 0, 32.4, 26, 26, 2, '#4d5960']); }
  if (u.ram) { out.push([35, 0, 3, 5, 34, 10, '#5f6a70']); for (let i = -2; i <= 2; i++) out.push([39, i * 7, 6, 5, 2, 2, '#c8d0d4']); }
  if (u.lights) { out.push([-4, 0, 32.4, 4, 26, 3, '#2a2a2a']); for (let i = -1; i <= 1; i++) out.push([-1.6, i * 8, 32.6, 1, 5, 3, '#fffbe0']); }
  if (u.gun) { out.push([-12, 0, 32.4, 10, 10, 5, '#3a4248']); out.push([-12, 0, 37.4, 7, 7, 4, '#2c3236', car.gunAng || 0]); }
  if (u.nitro) { out.push([-26, -8, 19, 8, 5, 5, '#1e6fd9']); out.push([-26, 8, 19, 8, 5, 5, '#1e6fd9']); }
  if (u.engine >= 2) { out.push([22, 0, 20, 8, 10, 4, '#3a3a3a']); out.push([22, -3, 24, 2, 2, 2, '#999']); }
  return out;
}
function carGunBarrel() { return [[-6, 0, 38.5, 12, 2, 2, '#121212']]; }
function heliParts(h) {
  const out = [], u = h.up || {}, wr = h.wreck, col = wr ? '#6b5a3a' : '#5c6b45', dark = wr ? '#4a3d2a' : '#46523a', gl = wr ? '#2a3a3a' : '#86d0ee', rot = h.rot || 0;
  out.push([0, -15, 0, 66, 3, 3, '#2a2a2a']); out.push([0, 15, 0, 66, 3, 3, '#2a2a2a']);
  for (const x of [-12, 14]) { out.push([x, -15, 3, 3, 3, 9, '#333']); out.push([x, 15, 3, 3, 3, 9, '#333']); out.push([x, 0, 10, 3, 30, 2, '#333']); }
  out.push([0, 0, 11, 46, 28, 22, col]); out.push([27, 0, 13, 10, 24, 17, col]); out.push([34, 0, 15, 5, 18, 11, dark]); out.push([26, 0, 26, 12, 22, 8, gl]); out.push([33.2, 0, 15, 1, 18, 11, gl]);
  out.push([22, -14.2, 16, 9, 0.6, 10, gl]); out.push([22, 14.2, 16, 9, 0.6, 10, gl]); out.push([0, -14.3, 14, 18, 0.6, 15, dark]); out.push([0, 14.3, 14, 18, 0.6, 15, dark]);
  out.push([-6, 0, 33, 26, 18, 8, dark]); out.push([-46, 0, 23, 46, 7, 7, col]); out.push([-68, 0, 25, 9, 2.4, 24, col]); out.push([-60, 0, 27, 7, 26, 2, col]);
  out.push([-68, 4, 38, 2, 1, 18, '#1c1c1c', rot * 2.3]); out.push([-68, 0, 46, 3, 3, 2, '#ff3b30']); out.push([-2, 0, 41, 4, 4, 7, '#2a2a2a']); out.push([-2, 0, 48, 7, 7, 3, '#1c1c1c']);
  if (wr) { out.push([-2, 0, 50, 120, 4, 1.4, '#2a2a2a', 0.5]); out.push([10, -8, 33, 16, 12, 5, '#3f8a3a']); out.push([-30, 0, 30, 12, 9, 6, '#2f6b2a']); out.push([0, 14, 0, 26, 4, 18, '#3a7a30']); }
  else { out.push([-2, 0, 51, 160, 4.5, 1.4, '#1c1c1c', rot]); out.push([-2, 0, 51, 160, 4.5, 1.4, '#1c1c1c', rot + Math.PI / 2]); }
  if (u.light) { out.push([30, 0, 8, 6, 6, 5, '#2a2a2a']); out.push([33.2, 0, 9, 0.6, 4, 3, '#fffbd0']); }
  if (u.gun) for (const s of [-1, 1]) { out.push([8, s * 17, 12, 18, 4, 4, '#1c1c1c']); out.push([20, s * 17, 13, 10, 2, 2, '#111']); }
  if (u.armor) { out.push([0, -15, 12, 40, 1.4, 18, '#59656c']); out.push([0, 15, 12, 40, 1.4, 18, '#59656c']); }
  if (u.tank) { out.push([-4, -18, 8, 24, 5, 7, '#7a6a3a']); out.push([-4, 18, 8, 24, 5, 7, '#7a6a3a']); }
  return out;
}
// ---------- Raumschiff ----------
function shipParts(sh, t, o) {
  o = o || {};
  const out = [], u = sh.up || {}, paint = SHIP_PAINTS.find(p => p.id === sh.paint) || SHIP_PAINTS[0], col = paint.col, acc = paint.acc;
  const dark = hexShade(col, 0.7), glow = o.thrust ? '#7ff4ff' : '#3a8aa8', gl = '#86e0ff';
  const push = (...a) => out.push(a);
  // Landestützen
  if (!o.flying) for (const [x, y] of [[14, -12], [14, 12], [-20, -16], [-20, 16]]) { push(x, y, 0, 3, 3, 9, '#3a3f44'); push(x, y, 0, 7, 7, 1.5, '#2a2f34'); }
  // Rumpf
  push(0, 0, 9, 62, 18, 10, col); push(30, 0, 10, 12, 14, 8, col); push(39, 0, 11, 8, 9, 5, dark); push(44, 0, 12, 4, 4, 3, acc);
  push(-4, 0, 19, 40, 14, 5, dark); push(14, 0, 19, 18, 11, 6, gl); push(22, 0, 19, 4, 9, 4, gl);
  push(0, -9.2, 11, 40, 0.6, 3, acc); push(0, 9.2, 11, 40, 0.6, 3, acc);
  // Flügel (gepfeilt)
  for (const s of [-1, 1]) {
    push(-6, s * 18, 10, 30, 22, 3, col, s * 0.22); push(-14, s * 31, 10, 16, 10, 3, dark, s * 0.4); push(-18, s * 37, 8, 8, 4, 10, acc);
    push(-2, s * 22, 13, 18, 2, 1, acc, s * 0.22);
    if (u.wings) { push(-22, s * 42, 10, 14, 6, 2, '#e8b923', s * 0.6); push(-26, s * 46, 10, 4, 4, 14, '#ffd84a'); }
  }
  // Heckflossen & Triebwerke
  push(-28, -5, 19, 10, 2, 14, dark); push(-28, 5, 19, 10, 2, 14, dark);
  const eng = u.boost ? 1 + u.boost * 0.25 : 1;
  for (const s of [-1, 1]) {
    push(-30, s * 6, 9, 14 * eng, 8 * eng, 9 * eng, '#4a5058'); push(-37.4 * eng, s * 6, 10, 0.8, 6 * eng, 7 * eng, glow);
    if (o.thrust) { const f = 8 + Math.sin(t * 40 + s) * 3 + (o.boosting ? 14 : 0); push(-38 * eng - f / 2, s * 6, 11, f, 4 * eng, 4 * eng, o.boosting ? '#ff9a3c' : '#7ff4ff', 0, -5); push(-38 * eng - f / 2 - 2, s * 6, 12, f * 0.6, 2, 2, '#ffffff', 0, -5); }
  }
  // Waffen
  const L = u.laser || 0;
  if (L >= 1) for (const s of [-1, 1]) { push(8, s * 22, 8, 18, 3, 3, '#2a2f34'); push(18, s * 22, 8.5, 4, 2, 2, L >= 3 ? '#ff4d6a' : '#ff9ab0'); }
  if (L >= 2) for (const s of [-1, 1]) { push(2, s * 30, 9, 14, 2.4, 2.4, '#2a2f34'); push(10, s * 30, 9.3, 3, 1.6, 1.6, '#ff9ab0'); }
  if (L >= 3) { push(34, 0, 6, 16, 3, 3, '#1c1f24'); push(43, 0, 6.4, 3, 2, 2, '#ff4d6a'); }
  if (u.hull) { push(0, -9.6, 8, 44, 1.4, 9, '#5a6670'); push(0, 9.6, 8, 44, 1.4, 9, '#5a6670'); if (u.hull >= 2) push(-4, 0, 24, 30, 12, 2, '#5a6670'); if (u.hull >= 3) { push(30, -7.2, 9, 10, 1.4, 8, '#e8b923'); push(30, 7.2, 9, 10, 1.4, 8, '#e8b923'); } }
  if (u.shield) { push(-10, 0, 24, 8, 8, 3, '#2a2f34'); push(-10, 0, 27, 5, 5, 2 + u.shield, '#8a7cff'); }
  if (u.mining) { push(42, 0, 6, 8, 5, 4, '#3a3f44'); push(47, 0, 6.5, 3, 3, 3, '#5fff8a'); }
  if (u.cargo) { push(-6, 0, 2, 26, 12, 7, '#6b5a3a'); push(-6, 6.2, 4, 20, 0.6, 3, acc); }
  if (u.tractor) { push(4, 0, 2, 8, 8, 6, '#2a2050'); push(4, 0, 0.5, 6, 6, 2, '#a58cff'); }
  push(-28, 0, 33, 3, 3, 3, (Math.floor(t * 2) % 2) ? '#ff3b30' : '#661111');
  return out;
}
function planeParts(t) {
  const out = [], body = '#62704f', dark = '#46523a', light = '#7f8f68';
  out.push([0, 0, 0, 200, 34, 32, body]); out.push([108, 0, 4, 18, 28, 24, body]); out.push([122, 0, 8, 10, 20, 16, light]); out.push([112, 0, 22, 12, 24, 6, '#1f3540']);
  out.push([-112, 0, 8, 26, 26, 22, dark]); out.push([-130, 0, 14, 14, 16, 14, dark]); out.push([-128, 0, 26, 22, 4, 40, body]); out.push([-126, 0, 26, 18, 90, 4, light]);
  out.push([10, 0, 26, 52, 300, 5, light]); out.push([10, 0, 25, 48, 296, 1, dark]);
  for (const sy of [-80, -45, 45, 80]) { out.push([22, sy, 12, 40, 16, 14, '#4b564d']); out.push([43, sy, 14, 3, 13, 10, '#1d2420']); out.push([45, sy, 19, 1, 34, 3, '#2a2a2a', t * 40]); }
  for (let i = -70; i <= 70; i += 24) { out.push([i, -17.2, 18, 8, 0.6, 7, '#203a46']); out.push([i, 17.2, 18, 8, 0.6, 7, '#203a46']); }
  out.push([10, -152, 29, 4, 4, 3, '#ff3b30']); out.push([10, 152, 29, 4, 4, 3, '#4dff6a']);
  return out;
}
function airshipParts(t) {
  const out = [], push = (...a) => out.push(a);
  push(0, 0, 0, 120, 40, 34, '#efe3c8'); push(0, 0, 34, 100, 32, 6, '#e3d4b0'); push(60, 0, 6, 12, 28, 22, '#e3d4b0'); push(-62, 0, 8, 10, 26, 18, '#e3d4b0');
  for (let i = -40; i <= 40; i += 20) push(i, 0, 0, 2, 40.6, 34.6, '#c9952a');
  push(-66, 0, 30, 14, 3, 20, '#3b4d74'); push(-66, 0, 8, 14, 44, 3, '#3b4d74');
  push(0, 0, -22, 40, 14, 12, '#5a3b20'); push(0, 0, -10, 2, 2, 10, '#3a2a1a'); push(20.2, 0, -18, 0.6, 10, 6, '#ffd27a');
  push(-24, 0, -16, 3, 3, 3, '#3a3a3a'); push(-27, 0, -16, 1, 20, 2, '#5a5a5a', t * 20);
  return out;
}
// ---------- Kisten ----------
const RARITY = [{ n: 'GEWÖHNLICH', col: '#cfd8dc', mult: 1 }, { n: 'SELTEN', col: '#4aa3ff', mult: 1.6 }, { n: 'EPISCH', col: '#b05cff', mult: 2.4 }, { n: 'LEGENDÄR', col: '#ffb020', mult: 3.6 }];
function crateParts(c) {
  const out = [], rc = RARITY[c.rarity].col;
  if (c.space) { out.push([0, 0, 0, 24, 24, 20, '#4a5460']); out.push([0, 0, 20, 25, 25, 2, '#5a6470']); out.push([12.4, 0, 6, 0.6, 16, 8, rc]); out.push([0, 12.4, 6, 16, 0.6, 8, rc]); return out; }
  if (c.air) { out.push([0, 0, 0, 26, 26, 22, '#4a5a66']); out.push([0, 0, 22, 27, 27, 3, '#3a4650']); out.push([0, 13.4, 6, 20, 0.6, 10, rc]); out.push([13.4, 0, 6, 0.6, 20, 10, rc]); }
  else { out.push([0, 0, 0, 24, 18, 14, '#8b5e34']); out.push([-9, 0, 0, 2.6, 18.6, 14, '#5a3b20']); out.push([9, 0, 0, 2.6, 18.6, 14, '#5a3b20']); out.push([0, 0, 14 + (c.opening ? c.opening * 30 : 0), 25, 19, 3, '#7a5230']); out.push([0, 9.4, 4, 10, 0.6, 5, rc]); }
  return out;
}
