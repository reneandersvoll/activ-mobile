'use strict';
// ===================== MODELLE 3: Fauna, Industrie, Bastionen, Stadt-Deko =====================
// ---------- Planeten-Kreaturen ----------
function creatureParts(z, t) {
  const T = ZTYPES[z.type], out = [], push = (...a) => out.push(a), hit = z.hit > 0;
  const sk = hit ? '#ffffff' : T.skin, acc = hit ? '#ffffff' : (T.acc || '#fff27a'), w = z.walk || 0, s1 = Math.sin(w), s2 = Math.sin(w + Math.PI);
  switch (T.creature) {
    case 'spore': {
      const b = Math.abs(Math.sin(w * 1.2)) * 7;
      push(0, 0, b, 9, 9, 10, '#e8f0e0'); push(0, 0, 10 + b, 20, 20, 7, sk); push(0, 0, 17 + b, 13, 13, 4, hexShade(sk, 1.3));
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3; push(Math.cos(a) * 7, Math.sin(a) * 7, 17.5 + b, 3, 3, 1, '#ffffff'); }
      push(4.6, -2, 4 + b, 0.6, 2, 2, '#1b1b1b'); push(4.6, 2, 4 + b, 0.6, 2, 2, '#1b1b1b'); push(0, 0, 9 + b, 21, 21, 1, hexShade(sk, 0.6)); break;
    }
    case 'golem': {
      push(s1 * 4, -6, 0, 9, 8, 16, hexShade(sk, 0.85)); push(s2 * 4, 6, 0, 9, 8, 16, hexShade(sk, 0.85));
      push(0, 0, 16, 16, 22, 20, sk); push(0, 0, 30, 18, 26, 6, hexShade(sk, 1.15));
      push(8.2, -5, 18, 0.6, 2, 12, acc); push(8.2, 4, 22, 0.6, 2, 8, acc); push(0, 11.2, 20, 6, 0.6, 2, acc);
      push(s2 * 5 + 3, -15, 12, 7, 7, 18, hexShade(sk, 0.9)); push(s1 * 5 + 3, 15, 12, 7, 7, 18, hexShade(sk, 0.9));
      push(s2 * 5 + 5, -15, 8, 9, 9, 6, hexShade(sk, 0.7)); push(s1 * 5 + 5, 15, 8, 9, 9, 6, hexShade(sk, 0.7));
      push(3, 0, 36, 11, 12, 10, sk); push(8.8, -3, 40, 0.6, 2.4, 2, acc); push(8.8, 3, 40, 0.6, 2.4, 2, acc);
      if (z.type === 'myco') { push(-2, -12, 36, 14, 14, 5, '#a6ffe6'); push(-2, 12, 36, 14, 14, 5, '#5fd6b0'); push(0, 0, 46, 16, 16, 4, '#2fd6b0'); }
      if (z.type === 'colossus') { push(0, 0, 46, 4, 4, 10, '#5fffc0'); push(0, 0, 56, 8, 8, 4, '#d9b35a'); }
      break;
    }
    case 'hound': {
      push(s1 * 4 + 8, -5, 0, 4, 4, 10, sk); push(s2 * 4 + 8, 5, 0, 4, 4, 10, sk); push(s2 * 4 - 8, -5, 0, 4, 4, 10, sk); push(s1 * 4 - 8, 5, 0, 4, 4, 10, sk);
      push(0, 0, 9, 26, 12, 9, sk); push(0, 0, 17, 22, 8, 2, hexShade(sk, 1.3));
      push(5, 6.2, 11, 10, 0.6, 2, acc); push(-6, -6.2, 12, 8, 0.6, 2, acc); push(-2, 0, 18.2, 6, 4, 1, acc);
      push(15, 0, 13, 10, 10, 9, sk); push(21, 0, 11, 6, 7, 4, hexShade(sk, 0.8)); push(20.2, -3, 17, 0.6, 2, 2, acc); push(20.2, 3, 17, 0.6, 2, 2, acc);
      push(13, -4, 22, 2, 2, 4, sk); push(13, 4, 22, 2, 2, 4, sk); push(-16, 0, 14 + s1 * 2, 10, 3, 3, acc); break;
    }
    case 'wraith': {
      const hv = 10 + Math.sin(t * 3 + z.walk) * 4;
      push(0, 0, hv, 8, 8, 24, sk); push(0, 0, hv + 24, 5, 5, 8, hexShade(sk, 1.4)); push(4.2, 0, hv + 18, 0.6, 4, 3, '#ffffff');
      for (let i = 0; i < 5; i++) { const a = t * 2 + i * 1.256; push(Math.cos(a) * 13, Math.sin(a) * 13, hv + 8 + (i % 2) * 8, 4, 4, 10, i % 2 ? '#c8c0ff' : '#6a5cdf'); }
      push(0, 0, hv - 6, 3, 3, 6, hexShade(sk, 0.7)); break;
    }
    case 'spider': {
      push(-8, 0, 8, 16, 16, 10, sk); push(4, 0, 9, 11, 11, 7, hexShade(sk, 1.2)); push(9.7, -2.5, 12, 0.6, 2, 2, '#ff3b30'); push(9.7, 2.5, 12, 0.6, 2, 2, '#ff3b30');
      push(-8, 0, 18, 5, 5, 8, acc); push(-12, 4, 17, 4, 4, 6, acc);
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const ph = (i % 2 ? s1 : s2) * 3, lx = 6 - i * 5; push(lx + ph, sd * 11, 7 + Math.abs(ph), 3, 12, 3, hexShade(sk, 0.85), sd * 0.3); push(lx + ph, sd * 18, 0, 3, 3, 9, hexShade(sk, 0.7)); }
      break;
    }
    case 'sentinel': {
      push(s1 * 3, -4, 0, 6, 6, 14, '#8a6a2a'); push(s2 * 3, 4, 0, 6, 6, 14, '#8a6a2a');
      push(0, 0, 14, 10, 16, 14, sk); push(5.2, 0, 16, 0.6, 8, 8, '#5fffc0'); push(0, 0, 28, 12, 18, 3, '#e8c86a');
      push(6, -10, 18, 14, 4, 4, sk); push(14, -10, 18.5, 6, 2, 2, '#5fffc0'); push(2, 10, 16, 6, 4, 10, sk);
      const ob = 38 + Math.sin(t * 4) * 2; push(0, 0, ob, 9, 9, 9, '#fff3c0'); push(4.7, 0, ob + 3, 0.6, 4, 3, '#5fffc0'); push(0, 0, ob - 3, 12, 12, 1, '#d9b35a'); break;
    }
  }
  return out;
}
// ---------- Mauer-Bastion & Selbstschussanlage ----------
function autogunHeadParts(b, t, powered) {
  const out = [], spin = (b.spin || 0), rc = b.flash > 0 ? -2 : 0;
  out.push([0, 0, 14, 16, 14, 9, '#4a4f3a']); out.push([-6, 0, 18, 6, 12, 7, '#3a3f2a']); out.push([-2, 7.4, 14, 8, 1, 6, '#d4a017']);
  for (let i = 0; i < 3; i++) { const a = spin + i * 2.094; out.push([14 + rc, Math.cos(a) * 2.6, 18.5 + Math.sin(a) * 2.6, 18, 1.8, 1.8, '#16191b']); }
  out.push([22 + rc, 0, 18.5, 3, 7, 7, '#2a2d2f']); out.push([0, -8, 12, 8, 4, 8, '#5a4a2a']);
  return out;
}
function bastionParts(b) {
  const C = wallColorSet(b.level), H = 30 + b.level * 4 + 8, out = [];
  out.push([0, 0, 0, 18, 18, H, C.post]); out.push([0, 0, H, 24, 24, 4, C.dark]); out.push([0, 0, H + 4, 26, 26, 1.5, '#e1b12c']);
  for (const [x, y] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) out.push([x, y, H + 4, 4, 4, 5, C.top]);
  out.push([9.2, 0, H * 0.45, 0.6, 6, 6, b.mount === 'turret' ? '#ff4d4d' : '#ffb020']);
  return out;
}
// ---------- Planeten-Industrie ----------
function pBuildingParts(b, t) {
  const out = [], push = (...a) => out.push(a), Wd = b.w * TILE, Hd = b.h * TILE, on = b.powered, glow = on ? '#5fd4ff' : '#3a3f44';
  switch (b.type) {
    case 'autogun': for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; push(Math.cos(a) * 16, Math.sin(a) * 16, 0, 10, 8, 8, '#b5a27a', a); } push(0, 0, 0, 22, 22, 10, '#5d666d'); break;
    case 'pcable': { const n = b.cnb || {}, c = on ? '#d9822b' : '#7a4a2a'; push(0, 0, 0, 8, 8, 4, '#2a2f34'); push(0, 0, 4, 5, 5, 2, on ? '#5fd4ff' : '#555');
      if (n.e) push(12, 0, 1.5, 24, 3, 3, c); if (n.w) push(-12, 0, 1.5, 24, 3, 3, c); if (n.s) push(0, 12, 1.5, 3, 24, 3, c); if (n.n) push(0, -12, 1.5, 3, 24, 3, c); break; }
    case 'solar': {
      for (const [x, y] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) push(x, y, 0, 4, 4, 14, '#5a626a');
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) push(-33 + i * 22, -33 + j * 22, 14 + j * 3, 20, 20, 2, (i + j) % 2 ? '#1e3a6a' : '#22447a');
      push(0, 0, 13, 88, 2, 1, '#9fc8e8'); push(0, 0, 13, 2, 88, 1, '#9fc8e8'); push(38, 38, 0, 12, 10, 12, '#3a4048'); push(44.4, 38, 4, 0.6, 6, 4, on ? '#5fff8a' : '#ff3b30'); break;
    }
    case 'wind': {
      push(0, 0, 0, 14, 14, 4, '#5a626a'); push(0, 0, 4, 5, 5, 86, '#d8dde3'); push(2, 0, 88, 14, 8, 8, '#c8d0d4'); push(10, 0, 92, 4, 4, 4, '#ff3b30');
      const a0 = b.rotor || 0; for (let k = 0; k < 3; k++) { const a = a0 + k * 2.094; for (let r = 4; r <= 28; r += 6) push(10, Math.cos(a) * r, 92 + Math.sin(a) * r, 2, 4, 4, '#eef3f6'); } break;
    }
    case 'geo': {
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; push(Math.cos(a) * 34, Math.sin(a) * 34, 0, 12, 12, 8 + (i % 3) * 3, '#4a3a36'); }
      push(0, 0, 0, 40, 40, 6, '#2a1e1a'); push(0, 0, 6, 22, 22, 3, '#ff6a2a'); push(0, 0, 9, 14, 14, 2, '#ffd27a');
      push(-24, -24, 0, 10, 10, 40, '#6a6a6a'); push(-24, -24, 40, 12, 12, 4, '#4a4a4a'); push(24, -24, 6, 30, 6, 6, '#8a5a3a'); push(28, 26, 0, 14, 12, 16, '#3a4048'); push(35.4, 26, 6, 0.6, 8, 4, on ? '#5fff8a' : '#ff3b30'); break;
    }
    case 'reactor': {
      push(0, 0, 0, Wd - 8, Hd - 8, 6, '#3a4048'); push(0, 0, 6, 100, 100, 4, '#2a2f36');
      for (const [x, y] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) { push(x, y, 6, 12, 12, 70, '#5a626a'); push(x, y, 76, 16, 16, 4, '#ffb020'); }
      const pu = 0.5 + Math.sin(t * 5) * 0.5; push(0, 0, 10, 30, 30, 60, on ? hsl2hex(300, 100, 55 + pu * 15) : '#5a2a5a'); push(0, 0, 70, 44, 44, 6, '#3a4048'); push(0, 0, 76, 14, 14, 20, '#5a626a');
      for (let i = 0; i < 10; i++) { const a = t * 1.5 + i / 10 * 6.283; push(Math.cos(a) * 32, Math.sin(a) * 32, 36 + Math.sin(t * 3 + i) * 3, 5, 5, 3, '#ff9af8'); } break;
    }
    case 'battery': { push(0, 0, 0, 30, 24, 30, '#2e3a46'); push(0, 0, 30, 32, 26, 3, '#ffb020'); const ch = b.charge || 0; for (let i = 0; i < 4; i++) push(15.4, -7.5 + i * 5, 6, 0.6, 4, 18, ch > i / 4 ? (ch > 0.5 ? '#5fff8a' : '#ffb020') : '#1a1f26'); push(-8, 0, 33, 4, 4, 4, '#c0392b'); push(8, 0, 33, 4, 4, 4, '#2d3436'); break; }
    case 'analyzer': {
      for (const a of [0, 2.09, 4.19]) push(Math.cos(a) * 9, Math.sin(a) * 9, 0, 3, 3, 30, '#7a828a', a);
      push(0, 0, 28, 14, 14, 10, '#c8d0d4'); push(0, 0, 38, 4, 4, 16, '#9aa6aa', t * (on ? 3 : 0)); push(0, 0, 54, 10, 3, 3, '#5fd4ff', t * (on ? 3 : 0));
      const ac = S && S.where === 'planet' && S.atmoKnown && S.atmoKnown[S.W.planet.id] ? ATMO[S.atmo[S.W.planet.id]].col : '#5fd4ff'; push(7.2, 0, 30, 0.6, 10, 6, on ? ac : '#222'); break;
    }
    case 'scanner': {
      push(0, 0, 0, 60, 60, 6, '#3a4048'); push(0, 0, 6, 14, 14, 30, '#5a626a'); const a = on ? t * 1.2 : 0.4;
      push(0, 0, 36, 50, 6, 4, '#c8d0d4', a); push(0, 0, 36, 6, 50, 4, '#c8d0d4', a); push(0, 0, 40, 30, 30, 3, '#e8eef2', a); push(0, 0, 43, 4, 4, 14, '#9aa6aa'); push(0, 0, 57, 5, 5, 4, on ? '#5fff8a' : '#552222'); break;
    }
    case 'sensor': { push(0, 0, 0, 14, 14, 6, '#3a4048'); push(0, 0, 6, 4, 4, 50, '#7a828a'); push(0, 0, 56, 24, 3, 6, '#c8d0d4', on ? t * 4 : 0); push(0, 0, 62, 5, 5, 5, on && Math.floor(t * 3) % 2 ? '#ff3b30' : '#551111'); break; }
    case 'drill': {
      for (const [x, y] of [[-26, -26], [26, -26], [-26, 26], [26, 26]]) push(x, y, 0, 5, 5, 80, '#8a5a3a');
      push(0, 0, 76, 60, 60, 4, '#6a4a2a'); push(0, 0, 80, 20, 20, 12, '#ffb020'); const bob = on ? Math.abs(Math.sin(t * 6)) * 14 : 0;
      push(0, 0, 6 + bob, 8, 8, 60, '#9aa6aa'); push(0, 0, bob, 12, 12, 8, '#5a626a'); push(0, 0, 0, 44, 44, 4, '#3a3028');
      push(30, 0, 0, 12, 22, 14, '#4a4f55'); push(36.4, 0, 4, 0.6, 14, 6, on ? '#5fff8a' : '#ff3b30');
      for (let i = 0; i < (b.buf ? b.buf.length : 0); i++) push(-20, -20 + i * 7, 4, 6, 6, 6, RES[b.buf[i]] ? RES[b.buf[i]].col : '#fff');
      break;
    }
    case 'belt': {
      push(0, 0, 0, 48, 40, 5, '#2a2f34'); push(0, -20, 0, 48, 3, 8, '#5a626a'); push(0, 20, 0, 48, 3, 8, '#5a626a'); push(0, 0, 5, 48, 34, 0.6, on ? '#3a3f44' : '#2a2a2a');
      const sh = on ? (t * 1.25 % 1) : 0; for (let k = 0; k < 2; k++) { const x = -24 + ((k * 0.5 + sh) % 1) * 48; push(x, -6, 5.4, 4, 10, 0.6, '#ffb020', 0.6); push(x, 6, 5.4, 4, 10, 0.6, '#ffb020', -0.6); }
      break;
    }
    case 'smelter': {
      push(0, 0, 0, 80, 80, 6, '#3a3028'); push(-6, 0, 6, 60, 64, 40, '#5a4a3a'); push(-6, 0, 46, 64, 68, 4, '#3a3028'); push(-20, -18, 50, 12, 12, 40, '#4a3a2a'); push(-20, -18, 90, 14, 14, 4, '#2a2a2a');
      push(24.4, 0, 12, 0.6, 22, 16, on ? '#ff8a2a' : '#3a2a20'); push(30, 0, 6, 12, 30, 8, '#6a5a3a'); push(-30, 0, 46, 16, 16, 10, '#8a7a5a');
      push(-6, -32.4, 20, 30, 0.6, 6, on ? '#ffb04a' : '#3a2a20'); break;
    }
    case 'container': { const c = '#2e5e8a'; push(0, 0, 0, 84, 70, 46, c); for (let i = -36; i <= 36; i += 8) push(i, 35.4, 2, 2, 0.6, 42, hexShade(c, 0.8)); push(0, 0, 46, 86, 72, 3, '#24496b'); push(42.4, 0, 30, 0.6, 20, 8, '#5fff8a'); push(0, 0, 49, 30, 20, 3, '#ffd84a'); break; }
    case 'scrubber': {
      push(0, 0, 0, 80, 80, 6, '#3a4048'); push(0, 0, 6, 54, 54, 30, '#c8d0d4'); push(0, 0, 36, 44, 44, 10, '#9fd3d6'); push(0, 0, 46, 26, 26, 8, '#bfe8e8');
      const a = on ? t * 6 : 0; for (const [x, y] of [[-20, -20], [20, 20]]) { push(x, y, 46, 3, 18, 2, '#3a4048', a); push(x, y, 46, 18, 3, 2, '#3a4048', a); }
      push(27.4, 0, 12, 0.6, 16, 12, on ? '#5fff8a' : '#552222'); break;
    }
    case 'pturret': for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; push(Math.cos(a) * 14, Math.sin(a) * 14, 0, 8, 8, 8, '#3a3060', a); } push(0, 0, 0, 20, 20, 12, '#2a2440'); break;
    case 'plamp': push(0, 0, 0, 10, 10, 4, '#2a2f34'); push(0, 0, 4, 4, 4, 34, '#e8f0e0'); push(0, 0, 38, 22, 22, 6, on ? '#5fffc0' : '#1c4a40'); push(0, 0, 44, 12, 12, 4, on ? '#a6ffe6' : '#2a5a50'); break;
  }
  return out;
}
function pturretHead(b) { const rc = b.flash > 0 ? -3 : 0; return [[0, 0, 12, 14, 14, 10, '#3a3460'], [12 + rc, 0, 16, 18, 4, 4, '#1c1830'], [20 + rc, 0, 16.5, 4, 5, 3, '#ff5ef0'], [0, 0, 22, 8, 8, 3, '#ff9af8']]; }
{
  const _bp0 = buildingParts;
  buildingParts = function (b, t) {
    if (BUILD[b.type] && (BUILD[b.type].planet || b.type === 'autogun')) return pBuildingParts(b, t);
    if ((b.type === 'wall') && b.mount) return _bp0(b, t).concat(bastionParts(b));
    return _bp0(b, t);
  };
}
// ---------- Stadt (Piltover im Schnee & Zaun) ----------
let CITY_SNOW = false;
piltHouse = function (push, x, y, w, d, H, roof, rng, z0) {
  z0 = z0 || 0; const walls = ['#efe3c8', '#e6d6b4', '#f2e8d4', '#dccaa6'], wall = walls[Math.floor(rng() * walls.length)], trim = '#c9952a', snow = CITY_SNOW;
  push(x, y, z0, w, d, H, wall); push(x, y, z0, w + 2, d + 2, 6, '#a8987a');
  const floors = Math.floor(H / 22);
  for (let f = 0; f < floors; f++) {
    const zz = z0 + 10 + f * 22;
    for (let i = 0; i < Math.floor(d / 16); i++) { const lit = rng() < 0.35, yy = y - d / 2 + 9 + i * 16; push(x + w / 2 + 0.5, yy, zz, 1, 8, 13, lit ? '#ffd27a' : '#4a6a8a'); push(x + w / 2 + 0.9, yy, zz + 13, 1, 10, 2, trim); if (f > 0 && rng() < 0.35) push(x + w / 2 + 2.5, yy, zz - 2, 4, 10, 2, '#7a4a2a'); if (f > 0 && rng() < 0.25) push(x + w / 2 + 3, yy, zz, 3, 8, 2, rng() < 0.5 ? '#ff7eb6' : '#ffd84a'); }
    for (let i = 0; i < Math.floor(w / 16); i++) { const lit = rng() < 0.35, xx = x - w / 2 + 9 + i * 16; push(xx, y + d / 2 + 0.5, zz, 8, 1, 13, lit ? '#ffd27a' : '#4a6a8a'); push(xx, y + d / 2 + 0.9, zz + 13, 10, 1, 2, trim); if (f > 0 && rng() < 0.35) push(xx, y + d / 2 + 2.5, zz - 2, 10, 4, 2, '#7a4a2a'); if (f > 0 && rng() < 0.25) push(xx, y + d / 2 + 3, zz, 8, 3, 2, rng() < 0.5 ? '#ff7eb6' : '#ffd84a'); }
    push(x + w / 2 + 0.8, y, zz - 4, 1.2, d, 2, trim); push(x, y + d / 2 + 0.8, zz - 4, w, 1.2, 2, trim);
  }
  if (z0 === 0) { push(x, y + d / 2 + 0.6, 0, 14, 1, 22, '#5a3b20'); push(x, y + d / 2 + 1.2, 22, 18, 1.4, 3, trim); push(x, y + d / 2 + 6, 24, 22, 10, 2, rng() < 0.5 ? '#3b4d74' : '#8a1c1c'); push(x - 10, y + d / 2 + 2, 16, 3, 3, 5, '#ffd27a'); push(x + 10, y + d / 2 + 2, 16, 3, 3, 5, '#ffd27a'); }
  const z = z0 + H; push(x, y, z, w + 4, d + 4, 3, trim); push(x, y, z + 3, w, d, 10, roof); push(x, y, z + 13, w * 0.72, d * 0.72, 9, hexShade(roof, 0.88)); push(x, y, z + 22, w * 0.38, d * 0.38, 6, roof);
  if (snow) { push(x, y, z + 13, w + 1, d + 1, 1.5, '#f4f8fb'); push(x, y, z + 22, w * 0.74, d * 0.74, 1.5, '#ffffff'); push(x, y, z + 28, w * 0.4, d * 0.4, 1.5, '#ffffff'); }
  for (let i = 0; i < 2; i++) { push(x + w / 2 - 2, y - d / 4 + i * d / 2, z + 6, 6, 8, 9, '#efe3c8'); push(x + w / 2 + 1.2, y - d / 4 + i * d / 2, z + 8, 0.6, 5, 5, rng() < 0.5 ? '#ffd27a' : '#4a6a8a'); if (snow) push(x + w / 2 - 2, y - d / 4 + i * d / 2, z + 15, 7, 9, 1.4, '#ffffff'); }
  push(x - w / 4, y - d / 4, z + 13, 5, 5, 20, '#a5503a'); push(x - w / 4, y - d / 4, z + 33, 7, 7, 2, '#7a3a2a'); if (snow) push(x - w / 4, y - d / 4, z + 35, 7, 7, 1.4, '#ffffff');
  if (rng() < 0.45) { push(x, y, z + 28, 3, 3, 14, trim); push(x, y, z + 42, 5, 5, 4, '#ffd84a'); }
};
zaunHouse = function (push, x, y, w, d, H, rng) {
  const walls = ['#5a4a3a', '#4a5248', '#6a5040', '#3e4a46', '#5e5a4e', '#4a3e36'], c = walls[Math.floor(rng() * walls.length)];
  push(x, y, 0, w, d, H, c); push(x, y, 0, w + 2, d + 2, 5, '#2a2620');
  for (let i = 0; i < 3; i++) push(x + w / 2 + 0.4, y - d / 3 + i * d / 3 + (rng() - 0.5) * 8, 8 + rng() * H * 0.6, 0.8, 8 + rng() * 10, 6 + rng() * 10, hexShade(c, 0.7 + rng() * 0.5));
  for (let i = 0; i < 2; i++) push(x - w / 3 + i * w / 2, y + d / 2 + 0.4, 10 + rng() * H * 0.5, 10 + rng() * 10, 0.8, 8 + rng() * 8, hexShade(c, 0.7 + rng() * 0.4));
  for (let i = 0; i < 3; i++) { const g = rng() < 0.5 ? '#ffb04a' : rng() < 0.6 ? '#5fff8a' : '#ff8ad0', yy = y - d / 3 + i * d / 3; if (rng() < 0.75) { push(x + w / 2 + 0.6, yy, H * 0.35 + (i % 2) * 14, 1, 9, 12, '#2a2a2a'); push(x + w / 2 + 1, yy, H * 0.35 + (i % 2) * 14 + 1.5, 0.6, 7, 9, g); } }
  push(x + w / 2 + 0.6, y + d / 4, 0, 1, 14, 24, '#3a2a1a'); push(x + w / 2 + 1, y + d / 4, 24, 1, 16, 2, '#6a5a3a');
  push(x - w / 2 + 6, y + d / 2 + 2, 0, 4, 4, H + 18, '#5a3b2a'); push(x - w / 2 + 6, y + d / 2 + 2, H + 18, 4, 18, 4, '#5a3b2a'); push(x + w / 2 + 2, y - d / 2 + 6, 0, 3, 3, H + 8, '#6a5a3a');
  push(x + w / 2 + 2, y, H * 0.75, 3, d * 0.9, 3, '#6a5a3a'); push(x, y + d / 2 + 2, H * 0.6, w * 0.9, 3, 3, '#4a6a4a');
  push(x, y, H, w + 6, d + 6, 4, '#3a2a22'); push(x - w / 8, y + 2, H + 4, w * 0.7, d * 0.85, H * 0.45, hexShade(c, 0.88)); push(x - w / 8, y + 2, H * 1.45 + 4, w * 0.78, d * 0.92, 3, '#3a2a22');
  if (rng() < 0.6) { push(x - w / 8 + w * 0.35 + 0.5, y, H + 14, 1, 10, 10, '#2a2a2a'); push(x - w / 8 + w * 0.35 + 1, y, H + 15.5, 0.6, 8, 7, '#ffd27a'); }
  push(x + w / 2 + 6, y, 24, 12, d * 0.8, 1.5, rng() < 0.5 ? '#8a2a2a' : '#2a6a5a'); push(x + w / 2 + 11, y, 18, 1, d * 0.8, 7, rng() < 0.5 ? '#8a2a2a' : '#2a6a5a');
  if (rng() < 0.6) { push(x + w / 2 + 0.6, y - d / 4, 34, 1, 16, 7, '#120f16'); push(x + w / 2 + 1.2, y - d / 4, 35.5, 0.4, 12, 4, rng() < 0.5 ? '#ff3fa4' : '#5fff8a'); }
  if (rng() < 0.5) { push(x - w / 3, y - d / 3, H * 1.45 + 7, 10, 10, 12, '#5a4a3a'); push(x - w / 3, y - d / 3, H * 1.45 + 19, 12, 12, 3, '#3a2a22'); }
};
{
  const _pp0 = propParts;
  propParts = function (p) {
    const out = [], push = (...a) => out.push(a), k = p.kind;
    switch (k) {
      case 'edenskyline': { CITY_SNOW = true; const r = _pp0(p); CITY_SNOW = false; return r; }
      case 'pilthouse': { const rng = mulberry32(p.seed || 3); CITY_SNOW = !!p.snow; piltHouse(push, 0, 0, p.w || 90, p.d || 80, p.H || 70, p.col || '#3b4d74', rng, 0); CITY_SNOW = false; return out; }
      case 'bigpipe': {
        const len = p.len, Hh = p.H || 130;
        for (const s of [-1, 1]) { const x = s * len / 2; push(x, 0, 0, 30, 30, Hh + 20, '#8a7a5a'); push(x, 0, 0, 36, 36, 10, '#5a4a3a'); for (let i = 0; i < 4; i++) push(x, 0, 20 + i * 30, 32, 32, 3, '#c9952a'); push(x, 0, Hh + 20, 40, 40, 6, '#c9952a'); push(x, 0, Hh + 26, 18, 18, 10, '#3b4d74'); }
        push(0, 0, Hh, len, 24, 24, '#6a4a7a'); push(0, -6, Hh + 24, len, 6, 3, '#8a6a9a'); push(0, 14, Hh + 2, len, 8, 10, '#5a3a6a');
        for (let i = 0; i < len / 40; i++) { const x = -len / 2 + 20 + i * 40; push(x, 0, Hh - 1, 5, 26, 26, '#c9952a'); if (i % 2) push(x + 10, 12.6, Hh + 8, 10, 0.6, 8, '#ff7ad0'); }
        push(0, 0, Hh + 34, len * 0.6, 10, 10, '#4a6a8a'); if (CITY_SNOW || p.snow) push(0, 0, Hh + 24, len, 24, 2, '#ffffff'); return out;
      }
      case 'hexsign': { const c = p.col || '#5fff8a'; push(0, 0, 0, 4, 4, p.H || 60, '#3a2a1a'); const z = (p.H || 60); push(0, 6, z - 10, 3, 14, 3, '#c9952a'); push(0, 14, z - 22, 4, 18, 18, '#1a2a22'); push(0, 14, z - 26, 4, 10, 4, '#1a2a22'); push(0, 14, z - 4, 4, 10, 4, '#1a2a22'); push(2.4, 14, z - 18, 0.6, 12, 10, c); push(2.6, 14, z - 15, 0.4, 6, 4, '#ffffff'); return out; }
      case 'gaslamp': push(0, 0, 0, 10, 10, 6, '#2a2a2a'); push(0, 0, 6, 4, 4, 54, '#3a3a3a'); push(0, 0, 30, 6, 6, 3, '#c9952a'); push(6, 0, 58, 14, 2, 2, '#3a3a3a'); push(12, 0, 46, 9, 9, 12, '#ffe7a0'); push(12, 0, 58, 11, 11, 3, '#2a2a2a'); push(12, 0, 61, 4, 4, 4, '#c9952a'); push(-6, 0, 58, 14, 2, 2, '#3a3a3a'); push(-12, 0, 46, 9, 9, 12, '#ffe7a0'); push(-12, 0, 58, 11, 11, 3, '#2a2a2a'); if (p.snow) { push(12, 0, 61, 11, 11, 1, '#ffffff'); push(-12, 0, 61, 11, 11, 1, '#ffffff'); } return out;
      case 'tram': { const c = p.col || '#3f7f7a'; push(0, 0, 4, 120, 34, 40, '#efe3c8'); push(0, 0, 4, 122, 36, 12, c); for (let i = -48; i <= 48; i += 16) { push(i, 17.4, 20, 10, 0.6, 14, '#ffd27a'); push(i, -17.4, 20, 10, 0.6, 14, '#ffd27a'); } push(60.4, 0, 18, 0.6, 22, 18, '#ffd27a'); push(0, 0, 44, 116, 30, 5, c); push(0, 0, 49, 100, 20, 3, '#c9952a'); push(0, 0, 52, 3, 3, 24, '#3a3a3a'); push(0, 0, 76, 30, 3, 2, '#3a3a3a'); for (const x of [-44, 44]) { push(x, -14, 0, 14, 5, 8, '#1a1a1a'); push(x, 14, 0, 14, 5, 8, '#1a1a1a'); } push(61, 0, 10, 2, 10, 5, '#fffbd0'); if (p.snow) push(0, 0, 49, 116, 30, 1.5, '#ffffff'); return out; }
      case 'kiosk': { push(0, 0, 0, 40, 40, 6, '#c9b896'); push(0, 0, 6, 32, 32, 34, '#3f7f7a'); for (let i = -1; i <= 1; i++) { push(16.4, i * 10, 12, 0.6, 7, 16, ['#ff7eb6', '#ffd84a', '#7fd8ff'][i + 1]); push(i * 10, 16.4, 12, 7, 0.6, 16, ['#ffd84a', '#ff7eb6', '#ffffff'][i + 1]); } push(0, 0, 40, 40, 40, 4, '#c9952a'); push(0, 0, 44, 28, 28, 10, '#3b4d74'); push(0, 0, 54, 12, 12, 6, '#34466a'); push(0, 0, 60, 3, 3, 8, '#ffd84a'); if (p.snow) push(0, 0, 54, 28, 28, 1.5, '#ffffff'); return out; }
      case 'flowercart': push(0, 0, 6, 40, 22, 14, '#7a4a2a'); push(-14, -12, 0, 10, 2, 12, '#3a2a1a'); push(-14, 12, 0, 10, 2, 12, '#3a2a1a'); for (let i = 0; i < 8; i++) push(-16 + (i % 4) * 10, -6 + Math.floor(i / 4) * 12, 20, 7, 7, 6, ['#ff7eb6', '#ffd84a', '#ffffff', '#b58cff'][i % 4]); push(0, 0, 40, 46, 28, 2, '#c0392b'); push(-20, 0, 20, 2, 2, 22, '#5a3b20'); push(20, 0, 20, 2, 2, 22, '#5a3b20'); return out;
      case 'statue': push(0, 0, 0, 40, 40, 14, '#c9b896'); push(0, 0, 14, 30, 30, 20, '#e6d6b4'); push(0, 0, 34, 34, 34, 3, '#c9952a'); push(0, 0, 37, 10, 12, 18, '#d9b35a'); push(0, 0, 55, 8, 8, 8, '#e8c86a'); push(4, -8, 46, 14, 3, 3, '#d9b35a'); push(12, -8, 52, 3, 3, 14, '#e8c86a'); if (p.snow) push(0, 0, 63, 8, 8, 1.5, '#ffffff'); return out;
      case 'garland': { const len = p.len; push(0, 0, 92, len, 1, 1, '#2a2a2a'); for (let i = 0; i < len / 14; i++) { const x = -len / 2 + 7 + i * 14, sag = Math.sin((i + 0.5) / (len / 14) * Math.PI) * 10; push(x, 0, 88 - sag, 3, 3, 4, ['#ffd84a', '#ff7ad0', '#7fd8ff', '#5fff8a'][i % 4]); } return out; }
      case 'vent': push(0, 0, 0, 20, 20, 3, '#3a3a3a'); for (let i = -1; i <= 1; i++) push(i * 6, 0, 3, 2, 18, 0.6, '#1a1a1a'); return out;
      case 'crates': push(0, 0, 0, 20, 20, 16, '#8b5e34'); push(16, 4, 0, 16, 16, 12, '#7a5230'); push(4, -2, 16, 16, 16, 12, '#9a6a3a'); push(0, 10.2, 4, 12, 0.6, 6, '#c9a36b'); return out;
      case 'barrels': for (const [x, y, c] of [[0, 0, '#5a3b2a'], [12, 6, '#3a4a5a'], [4, 14, '#5a5a2a']]) { push(x, y, 0, 11, 11, 18, c); push(x, y, 6, 12, 12, 1.5, '#2a2a2a'); push(x, y, 13, 12, 12, 1.5, '#2a2a2a'); } return out;
      case 'snowpile': push(0, 0, 0, 30, 26, 6, '#f4f8fb'); push(-4, 2, 6, 18, 14, 4, '#ffffff'); push(6, -4, 4, 10, 10, 4, '#eef3f8'); return out;
      case 'wires': { const len = p.len; push(0, 0, 110, len, 1, 1, '#1a1a1a'); push(0, 6, 104, len, 1, 1, '#1a1a1a'); for (let i = 0; i < len / 50; i++) { const x = -len / 2 + 25 + i * 50, sag = Math.sin((i + 0.5) / (len / 50) * Math.PI) * 14; push(x, 0, 92 - sag, 2, 2, 14, '#2a2a2a'); push(x, 0, 86 - sag, 7, 7, 6, ['#ffb04a', '#5fff8a', '#ff8ad0'][i % 3]); } return out; }
      case 'wallpipes': push(0, 0, 0, 8, 8, 120, '#5a4a3a'); push(10, 0, 0, 5, 5, 140, '#4a6a4a'); push(0, 0, 120, 8, 30, 8, '#5a4a3a'); push(0, 0, 40, 10, 10, 4, '#3a2a1a'); push(0, 0, 80, 10, 10, 4, '#3a2a1a'); push(10, 0, 60, 7, 7, 3, '#5fff8a'); return out;
      case 'zaunarch': { const len = p.len || 200; for (const s of [-1, 1]) { push(0, s * len / 2, 0, 20, 20, 150, '#4a3e36'); push(0, s * len / 2, 150, 24, 24, 6, '#3a2a22'); } push(0, 0, 130, 22, len, 20, '#4a3e36'); push(0, 0, 150, 26, len + 10, 4, '#3a2a22'); push(11.4, 0, 133, 0.6, len * 0.5, 14, '#120f16'); push(11.8, 0, 136, 0.4, len * 0.4, 8, p.col || '#5fff8a'); for (let i = 0; i < 5; i++) push(12, -len / 2 + len * (i + 0.5) / 5, 122, 4, 4, 6, '#ffb04a'); return out; }
      case 'tramrailstop': push(0, 0, 0, 60, 20, 4, '#c9b896'); push(-24, 0, 4, 3, 3, 40, '#3a3a3a'); push(24, 0, 4, 3, 3, 40, '#3a3a3a'); push(0, 0, 44, 66, 26, 3, '#3f7f7a'); push(0, -8, 4, 50, 4, 10, '#5a3b20'); push(0, 0, 47, 50, 20, 1.5, '#ffffff'); return out;
      case 'bridgerail': push(0, -22, 0, 4, 4, 18, '#6a5a4a'); push(0, 22, 0, 4, 4, 18, '#6a5a4a'); push(0, 0, 14, 4, 48, 3, '#8a7a5a'); push(0, 0, 7, 2, 48, 2, '#6a5a4a'); return out;
      case 'pylon': return out;
      case 'zaunsign': push(0, 0, 0, 3, 3, 50, '#3a2a1a'); push(0, 8, 44, 3, 16, 2, '#3a2a1a'); push(0, 16, 30, 3, 18, 14, '#120f16'); push(1.8, 16, 32, 0.4, 14, 10, p.col || '#ff3fa4'); return out;
    }
    return _pp0(p);
  };
}
// =====================================================================
// V11: Neonstadt (oben), Altstadt (unten), Treppen, Waffenladen, neue Gebäude
// =====================================================================
function lanternLineParts(push, len, seed, laundry) {
  const rng = mulberry32(seed || 1), n = Math.max(2, Math.floor(len / (laundry ? 14 : 20))), cols = laundry ? ['#c0392b', '#e8d17a', '#3d5a80', '#efe3c8', '#8e44ad', '#2a6a5a', '#e17055'] : ['#ff5a3c', '#ffb04a', '#ff8a3c', '#ffd27a', '#e8402a'];
  const z0 = laundry ? 78 : 96;
  push(-len / 2, 0, z0 - 4, 4, 4, 8, '#2a2a2a'); push(len / 2, 0, z0 - 4, 4, 4, 8, '#2a2a2a');
  for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, x = -len / 2 + f * len, sag = Math.sin(f * Math.PI) * 10; push(x, 0, z0 - sag, len / n + 0.6, 0.8, 0.8, '#1a1a1a');
    if (laundry) { if (rng() < 0.85) push(x, 0, z0 - sag - 13, 8 + rng() * 5, 1, 11 + rng() * 6, rpick(rng, cols)); }
    else if (i % 2 === 0 || n < 4) { const c = rpick(rng, cols); push(x, 0, z0 - sag - 4, 1, 1, 4, '#1a1a1a'); push(x, 0, z0 - sag - 15, 7, 7, 10, c); push(x, 0, z0 - sag - 5.5, 5, 5, 1.5, '#2a1a10'); push(x, 0, z0 - sag - 16.5, 5, 5, 1.5, '#2a1a10'); }
  }
}
// ---------- Neonstadt ----------
function cyberTowerParts(push, w, d, H, neon, rng) {
  const hw = w / 2, hd = d / 2, steel = rpick(rng, ['#22262f', '#1c2029', '#262b36', '#2c2433']), n2 = rpick(rng, ['#ff3fa4', '#3ff4ff', '#b05cff', '#5fff8a', '#ffb04a']);
  push(0, 0, 0, w + 4, d + 4, 6, '#14161c'); push(0, 0, 6, w, d, H * 0.55, steel);
  push(hw + 0.5, 0, 6, 0.8, d - 10, 20, '#3ff4ff'); push(hw + 0.9, 0, 9, 0.4, d - 16, 14, '#0e1a22'); push(0, hd + 0.5, 6, w - 10, 0.8, 20, neon); push(0, hd + 0.9, 9, w - 16, 0.4, 14, '#1a0e18');
  push(hw + 8, 0, 28, 16, d - 4, 2, '#3a3f4a'); push(hw + 15, 0, 26, 1, d - 4, 3, neon);
  for (let z = 34; z < H * 0.55; z += 14) { const lit = rng(); push(hw + 0.4, 0, z, 0.8, d - 8, 7, lit < 0.5 ? '#9ff4ff' : lit < 0.7 ? '#ffd27a' : '#2a3a4a'); push(0, hd + 0.4, z, w - 8, 0.8, 7, lit < 0.4 ? '#9ff4ff' : lit < 0.6 ? '#ff9ad8' : '#2a3a4a'); }
  const tw = w * 0.66, td = d * 0.66, z1 = 6 + H * 0.55;
  push(-hw * 0.12, -hd * 0.12, z1, tw, td, H * 0.45, hexShade(steel, 1.15));
  for (let z = z1 + 6; z < z1 + H * 0.45; z += 10) { push(-hw * 0.12 + tw / 2 + 0.4, -hd * 0.12, z, 0.8, td - 6, 5, rng() < 0.55 ? '#9ff4ff' : '#1a2a38'); push(-hw * 0.12, -hd * 0.12 + td / 2 + 0.4, z, tw - 6, 0.8, 5, rng() < 0.5 ? '#ff9ad8' : '#1a2a38'); }
  for (const [x, y] of [[hw, hd], [hw, -hd], [-hw, hd]]) push(x, y, 6, 2, 2, H * 0.55, neon);
  push(-hw * 0.12 + tw / 2, -hd * 0.12 + td / 2, z1, 2, 2, H * 0.45, n2);
  if (rng() < 0.7) { const yy = (rng() - 0.5) * (d - 30), zz = 40 + rng() * H * 0.3; push(hw + 4, yy, zz, 3, 3, 3, '#3a3f4a'); push(hw + 8, yy, zz - 10, 1, 26, 40, '#0a0c12'); push(hw + 8.8, yy, zz - 6, 0.4, 22, 32, rpick(rng, ['#ff3fa4', '#3ff4ff', '#b05cff'])); push(hw + 9.2, yy, zz + 4, 0.3, 14, 4, '#ffffff'); }
  const zt = z1 + H * 0.45;
  push(-hw * 0.12, -hd * 0.12, zt, tw + 2, td + 2, 3, '#14161c');
  if (rng() < 0.6) { push(-hw * 0.12, -hd * 0.12, zt + 3, 3, 3, 40, '#5b6266'); push(-hw * 0.12, -hd * 0.12, zt + 43, 5, 5, 3, '#ff3b30'); }
  else { push(-hw * 0.12, -hd * 0.12, zt + 3, tw * 0.7, td * 0.7, 2, '#2a2f3a'); push(-hw * 0.12, -hd * 0.12, zt + 5, tw * 0.5, 3, 0.6, neon); push(-hw * 0.12, -hd * 0.12, zt + 5, 3, td * 0.5, 0.6, neon); }
  push(hw * 0.3, hd * 0.3, z1, 14, 14, 10, '#3a3f4a'); push(hw * 0.3, hd * 0.3, z1 + 10, 10, 10, 2, '#1a1a1a');
  push(hw + 2, -hd + 6, 0, 3, 3, H * 0.55, '#3a3f4a'); push(hw + 2, -hd + 12, 0, 2, 2, H * 0.5, '#5a2a4a');
}
{
  const _ppV11 = propParts;
  propParts = function (p) {
    const out = [], push = (...a) => out.push(a), k = p.kind;
    switch (k) {
      case 'cybertower': cyberTowerParts(push, p.w || 90, p.d || 90, p.H || 160, p.col || '#ff3fa4', mulberry32(p.seed || 3)); return out;
      case 'holotree': { const rng = mulberry32(p.seed || 1), c = rng() < 0.5 ? '#ff3fa4' : '#3ff4ff'; push(0, 0, 0, 22, 22, 6, '#2a2f3a'); push(0, 0, 6, 4, 4, 40, '#5b6266'); for (let i = 0; i < 4; i++) push(0, 0, 30 + i * 10, 30 - i * 6, 30 - i * 6, 6, i % 2 ? c : hexShade(c, 0.7)); push(0, 0, 72, 4, 4, 6, '#ffffff'); return out; }
      case 'neonlamp': push(0, 0, 0, 10, 10, 4, '#1c2029'); push(0, 0, 4, 3, 3, 62, '#3a3f4a'); push(6, 0, 62, 16, 3, 3, '#3a3f4a'); push(13, 0, 52, 3, 10, 10, '#3ff4ff'); push(0, 0, 30, 4, 4, 18, '#ff3fa4'); return out;
      case 'hoload': { const rng = mulberry32(p.seed || 2), c = rpick(rng, ['#ff3fa4', '#3ff4ff', '#b05cff', '#ffb04a']); push(0, 0, 0, 5, 5, 96, '#2a2f3a'); push(0, 0, 92, 4, 50, 4, '#2a2f3a'); push(0, 0, 100, 2, 70, 40, '#0a0c12'); push(1.2, 0, 104, 0.4, 62, 32, c); for (let i = 0; i < 3; i++) push(1.6, -20 + i * 20, 112 + (i % 2) * 8, 0.3, 12, 8, i === 1 ? '#ffffff' : hexShade(c, 1.4)); return out; }
      case 'jhouse': {
        const rng = mulberry32(p.seed || 3), w = p.w || 90, d = p.d || 90, H = p.H || 80, hw = w / 2, hd = d / 2, wall = p.col || '#e8dcc0', roof = p.roof || '#6a3a2a', beam = '#4a2c1a', lit = ['#ffd27a', '#ffc060', '#ffe2a0'];
        push(0, 0, 0, w + 2, d + 2, 6, '#5a4a3a');
        const tiers = p.style === 'pagoda' ? 3 : p.style === 'block' ? 1 : 2, th = (H - 10) / tiers;
        for (let k = 0; k < tiers; k++) {
          const s = 1 - k * 0.16, ww = w * s, dd = d * s, z = 6 + k * th, hh = th - 12;
          const wc = p.style === 'block' ? rpick(rng, ['#d9c8a4', '#c8b08a', '#e8dcc0', '#b8a07a']) : wall;
          push(0, 0, z, ww, dd, hh, wc);
          for (let i = 0; i <= 3; i++) { push(ww / 2 + 0.5, -dd / 2 + i * dd / 3, z, 1.2, 2.4, hh, beam); push(-ww / 2 + i * ww / 3, dd / 2 + 0.5, z, 2.4, 1.2, hh, beam); }
          const rows = Math.max(1, Math.floor(hh / 16));
          for (let r = 0; r < rows; r++) { const zz = z + 5 + r * 16; for (let i = 0; i < Math.floor(dd / 16); i++) { const yy = -dd / 2 + 9 + i * 16; push(ww / 2 + 0.4, yy, zz, 0.8, 10, 10, rng() < 0.75 ? rpick(rng, lit) : '#3a2a1a'); push(ww / 2 + 0.9, yy, zz + 4.5, 0.4, 10, 1, beam); } for (let i = 0; i < Math.floor(ww / 16); i++) { const xx = -ww / 2 + 9 + i * 16; push(xx, dd / 2 + 0.4, zz, 10, 0.8, 10, rng() < 0.75 ? rpick(rng, lit) : '#3a2a1a'); push(xx, dd / 2 + 0.9, zz + 4.5, 10, 0.4, 1, beam); } }
          if (k > 0 || p.style === 'pagoda' || (tiers > 1 && rng() < 0.6)) { push(ww / 2 + 4, 0, z - 1, 8, dd + 4, 2, '#6a4a2a'); push(ww / 2 + 7.6, 0, z + 1, 0.8, dd + 4, 6, '#8a2a1a'); push(0, dd / 2 + 4, z - 1, ww + 8, 8, 2, '#6a4a2a'); push(0, dd / 2 + 7.6, z + 1, ww + 8, 0.8, 6, '#8a2a1a'); }
          const rz = z + hh;
          push(0, 0, rz, ww + 18, dd + 18, 3, roof); push(0, 0, rz + 3, ww + 10, dd + 10, 4, hexShade(roof, 1.12)); push(0, 0, rz + 7, ww * 0.7, dd * 0.7, 5, roof);
          for (const [x, y] of [[ww / 2 + 9, dd / 2 + 9], [ww / 2 + 9, -dd / 2 - 9], [-ww / 2 - 9, dd / 2 + 9]]) push(x, y, rz + 2, 4, 4, 4, hexShade(roof, 0.7));
          if (k === tiers - 1) { push(0, 0, rz + 12, ww * 0.45, 4, 6, hexShade(roof, 0.85)); if (p.style === 'pagoda') { push(0, 0, rz + 18, 3, 3, 22, '#c9952a'); push(0, 0, rz + 40, 6, 6, 4, '#c9952a'); } }
        }
        if (rng() < 0.7) { push(hw + 1, 0, 8, 1, Math.min(d - 12, 30), 18, '#ffb860'); push(hw + 2, 0, 20, 1, Math.min(d - 10, 34), 8, rpick(rng, ['#2a3a5a', '#8a2a2a', '#3e6a4a'])); push(hw + 6, d / 4, 18, 6, 6, 9, '#e8402a'); push(hw + 6, d / 4, 27, 4, 4, 1.4, '#2a1a10'); }
        if (rng() < 0.55) { const yy = (rng() - 0.5) * (d - 20); push(hw + 5, yy, 30, 2, 10, 34, '#efe3c8'); push(hw + 6.2, yy, 34, 0.4, 7, 26, '#2a1a10'); for (let i = 0; i < 4; i++) push(hw + 6.5, yy, 36 + i * 6, 0.3, 5, 3, '#8a2a1a'); }
        if (rng() < 0.4) { push(-hw / 3, -hd / 3, H, 12, 12, 10, '#a0a8b0'); }
        if (p.style !== 'pagoda' && rng() < 0.35) { push(-hw + 6, hd + 6, 0, 10, 4, H * 0.6, '#5a3a22'); for (let z = 8; z < H * 0.6; z += 8) push(-hw + 6, hd + 7, z, 10, 6, 1.4, '#7a4a2a'); }
        return out;
      }
      case 'teahouse': {
        push(0, 0, 0, 230, 230, 8, '#5a4a3a'); push(-10, 0, 8, 190, 190, 60, '#e8dcc0');
        for (let i = 0; i < 7; i++) { push(85.6, -90 + i * 30, 8, 2, 4, 60, '#4a2c1a'); push(-100 + i * 30, 95.6, 8, 4, 2, 60, '#4a2c1a'); push(85.4, -78 + i * 30, 22, 0.8, 18, 30, '#ffd27a'); }
        push(-10, 0, 68, 220, 220, 4, '#5a2a22'); push(-10, 0, 72, 200, 200, 6, '#7a3a2a');
        push(-10, 0, 78, 150, 150, 46, '#d9c8a4'); for (let i = 0; i < 5; i++) push(65.6, -60 + i * 30, 86, 0.8, 18, 26, '#ffc060');
        push(98, 0, 70, 10, 200, 2, '#6a4a2a'); push(103, 0, 72, 1, 200, 8, '#8a2a1a');
        push(-10, 0, 124, 180, 180, 4, '#5a2a22'); push(-10, 0, 128, 140, 140, 8, '#7a3a2a'); push(-10, 0, 136, 80, 80, 8, '#5a2a22'); push(-10, 0, 144, 30, 6, 10, '#c9952a');
        for (let i = -2; i <= 2; i++) { push(94, i * 36, 40, 1, 1, 10, '#1a1a1a'); push(94, i * 36, 30, 9, 9, 12, i % 2 ? '#e8402a' : '#ffb04a'); }
        push(100, 0, 8, 2, 50, 26, '#2a3a5a'); push(101, 0, 36, 4, 70, 18, '#efe3c8'); push(102.3, 0, 40, 0.4, 56, 10, '#8a2a1a');
        return out;
      }
      case 'stonewall': { const len = p.len; push(0, 0, 0, len, 26, 110, '#8a7a66'); for (let z = 12; z < 110; z += 14) push(0, 13.4, z, len, 0.6, 1.4, '#6a5a48'); push(0, 0, 110, len + 2, 30, 6, '#5a4a3a'); for (let i = 0; i < len / 70; i++) push(-len / 2 + 35 + i * 70, 14, 40 + (i * 23) % 40, 14, 4, 40, i % 2 ? '#4a7a3a' : '#c86a2a'); return out; }
      case 'torii': for (const s of [-1, 1]) { push(0, s * 44, 0, 8, 8, 96, '#c0392b'); push(0, s * 44, 0, 12, 12, 8, '#2a1a10'); } push(0, 0, 80, 8, 104, 6, '#c0392b'); push(0, 0, 96, 12, 124, 6, '#2a1a10'); push(0, 0, 102, 10, 116, 3, '#c0392b'); push(0, 0, 86, 4, 16, 10, '#efe3c8'); return out;
      case 'roundterrace': { for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; push(Math.cos(a) * 38, Math.sin(a) * 38, 0, 18, 10, 12, '#8a7a66', a + Math.PI / 2); push(Math.cos(a) * 40, Math.sin(a) * 40, 12, 18, 4, 8, '#2a3a2a', a + Math.PI / 2); } push(0, 0, 0, 30, 30, 10, '#8a7a66'); push(0, 0, 10, 24, 24, 1, '#5ac8e8'); push(0, 0, 10, 6, 6, 22, '#c9952a'); push(0, 0, 32, 10, 10, 4, '#c9952a'); return out; }
      case 'lanternpost': push(0, 0, 0, 6, 6, 4, '#2a2a2a'); push(0, 0, 4, 3, 3, 56, '#3a3a3a'); push(0, 0, 60, 12, 12, 12, '#ffd27a'); push(0, 0, 72, 14, 14, 3, '#2a2a2a'); push(0, 0, 58, 14, 14, 2, '#2a2a2a'); return out;
      case 'powerpole': push(0, 0, 0, 5, 5, 130, '#5a4a3a'); push(0, 0, 118, 4, 50, 4, '#5a4a3a'); push(0, 0, 106, 4, 36, 3, '#5a4a3a'); for (const y of [-22, -8, 8, 22]) push(0, y, 122, 3, 3, 4, '#d0d0d0'); push(0, 0, 70, 12, 10, 14, '#6a6a6a'); return out;
      case 'headframe': { const H = 230; for (const [x, y] of [[-60, -40], [60, -40], [-60, 40], [60, 40]]) push(x, y, 0, 6, 6, H * 0.7, '#b8602a'); for (let z = 30; z < H * 0.7; z += 36) { push(-60, 0, z, 4, 84, 4, '#c8702a'); push(60, 0, z, 4, 84, 4, '#c8702a'); push(0, -40, z, 124, 4, 4, '#c8702a'); push(0, 40, z, 124, 4, 4, '#c8702a'); } push(0, 0, H * 0.7, 130, 90, 6, '#9a4a20'); for (const s of [-1, 1]) { push(0, s * 26, H * 0.7 + 6, 4, 4, 50, '#c8702a'); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; push(Math.cos(a) * 34, s * 26, H * 0.7 + 56 + Math.sin(a) * 34, 8, 3, 3, '#7a3a1a', 0); } push(0, s * 26, H * 0.7 + 56, 6, 4, 6, '#2a2a2a'); } push(-80, 0, 0, 40, 60, 50, '#7a4a30'); push(-80, 0, 50, 46, 66, 5, '#5a2a22'); push(-59.4, 0, 14, 0.8, 30, 24, '#ffc060'); return out; }
      case 'stairwell': {
        for (const s of [-1, 1]) { for (let y = -72; y <= 72; y += 24) push(s * 50, y, 0, 4, 4, 28, '#2a2f3a'); push(s * 50, 0, 26, 3, 146, 3, '#3ff4ff'); push(s * 50, 0, 12, 1.4, 146, 1.4, '#ff3fa4'); }
        for (let x = -48; x <= 48; x += 24) push(x, -74, 0, 4, 4, 28, '#2a2f3a'); push(0, -74, 26, 102, 3, 3, '#3ff4ff');
        for (const s of [-1, 1]) { push(s * 54, 76, 0, 12, 12, 78, '#22262f'); push(s * 54, 76, 78, 16, 16, 5, '#3ff4ff'); push(s * 54, 76, 83, 9, 9, 10, '#ff3fa4'); }
        push(0, 76, 64, 118, 8, 12, '#14161c'); push(0, 80.4, 66, 80, 0.6, 8, '#ff3fa4'); push(0, 76, 76, 124, 10, 3, '#3ff4ff');
        return out;
      }
      case 'stairsup': {
        const n = 12, top = -118, bot = 106, sd = (bot - top) / n;
        for (let k = 0; k < n; k++) { const y = bot - (k + 0.5) * sd, h = (k + 1) * 9.5; push(0, y, 0, 92, sd + 0.5, h, k % 2 ? '#8a7a66' : '#968670'); push(0, y + sd / 2 - 1, h - 1, 92, 2, 1.5, '#b8a888'); }
        for (const s of [-1, 1]) { for (let k = 0; k < n; k += 2) { const y = bot - (k + 0.5) * sd, h = (k + 1) * 9.5; push(s * 48, y, h, 3, 3, 24, '#5a3a22'); } push(s * 48, 0, 0, 6, bot - top, 6, '#6a5a48'); }
        for (const s of [-1, 1]) { push(s * 52, bot + 8, 0, 4, 4, 70, '#3a2a1a'); push(s * 52, bot + 8, 70, 10, 10, 12, '#ffd27a'); push(s * 52, bot + 8, 82, 12, 12, 3, '#2a1a10'); }
        return out;
      }
      case 'gunshop': {
        push(0, 0, 0, 136, 136, 4, '#14161c'); push(-6, 0, 4, 110, 110, 58, '#22262f'); push(-6, 0, 62, 116, 116, 4, '#ff3b30'); push(-6, 0, 66, 100, 100, 12, '#1c1e22');
        for (let z = 10; z < 50; z += 4) push(49.6, 0, z, 0.6, 60, 1.6, '#3a3f4a');
        push(49.8, 0, 52, 0.8, 70, 8, '#8a1c1c'); push(50.4, 0, 54, 0.4, 56, 3, '#ff4d4d');
        push(-6, 0, 78, 64, 10, 26, '#0a0c12'); push(-6, 5.4, 82, 54, 0.6, 18, '#ff3b30'); push(-6, 6, 91, 46, 0.6, 2, '#ffffff', 0.45); push(-6, 6, 91, 46, 0.6, 2, '#ffffff', -0.45);
        for (const [x, y] of [[60, -40], [60, 40]]) { push(x, y, 4, 14, 22, 10, '#3a4048'); push(x, y, 14, 14, 22, 2, '#3ff4ff'); }
        push(62, 0, 4, 18, 12, 10, '#4b5d3a'); push(-6, 55.6, 10, 30, 0.6, 26, '#0e1a22'); push(-6, 56, 20, 20, 0.4, 4, '#3ff4ff');
        return out;
      }
      case 'lanternline': lanternLineParts(push, p.len || 120, p.seed, false); return out;
      case 'laundry': lanternLineParts(push, p.len || 120, p.seed, true); return out;
      case 'pathsign': push(0, 0, 0, 4, 4, 34, '#5b3a22'); push(4, 0, 26, 18, 3, 8, '#8b5e34'); push(13.6, 0, 27, 0.4, 2, 6, '#ffe066'); return out;
    }
    return _ppV11(p);
  };
}
// ---------- Neue Gebäude ----------
function workbenchParts(b, t) {
  const out = [], push = (...a) => out.push(a), L = b.level, Wd = b.w * TILE, Hd = b.h * TILE;
  push(0, 0, 0, Wd - 6, Hd - 6, 3, L >= 2 ? '#7d7f7c' : '#7a5230');
  push(-8, -8, 3, 44, 22, 14, '#8b5e34'); push(-8, -8, 17, 46, 24, 3, '#6b4423'); push(10, -14, 20, 8, 6, 6, '#5d666d'); push(14, -14, 22, 4, 8, 2, '#3a4048');
  push(-30, 18, 3, 26, 14, 10, '#6b4423'); for (let i = 0; i < 3; i++) push(-30 + (i - 1) * 7, 18, 13, 6, 14, 6, '#8b5e34');
  push(30, -30, 3, 4, 24, 34, '#5b3a22'); for (let i = 0; i < 4; i++) push(31.6, -40 + i * 7, 20 + (i % 2) * 6, 1, 3, 10, i % 2 ? '#9aa6aa' : '#c0392b');
  if (L >= 2) { push(20, 16, 3, 16, 12, 10, '#3a3f44'); push(20, 16, 13, 22, 10, 5, '#2a2f34'); push(-36, -30, 3, 14, 14, 26, '#c0392b'); }
  if (L >= 3) { for (const [x, y] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) push(x, y, 3, 5, 5, 58, '#5d666d'); push(0, 0, 61, Wd, Hd, 3, '#6a7a86'); push(26, -2, 3, 26, 14, 20, '#7a828a'); push(40, -2, 13, 4, 6, 6, '#2a2f34', t * 6); }
  if (L >= 4) { push(0, Hd / 2 - 2, 46, 70, 2, 12, '#120f16'); push(0, Hd / 2 - 0.6, 49, 58, 0.4, 6, (Math.floor(t * 2) % 2) ? '#5ff4ff' : '#3ac8e0'); const a = Math.sin(t * 2) * 0.8; push(-20, 20, 3, 10, 10, 10, '#e1b12c'); push(-20 + Math.cos(a) * 10, 20 + Math.sin(a) * 10, 18, 22, 4, 4, '#e1b12c', a); }
  return out;
}
function watchtowerParts(b, t) {
  const out = [], push = (...a) => out.push(a), L = b.level, H = 54 + L * 12, C = wallColorSet(Math.min(L, 4));
  if (L >= 2) { push(0, 0, 0, 30, 30, 26, C.post); push(0, 0, 26, 32, 32, 3, C.top); }
  for (const [x, y] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) push(x, y, L >= 2 ? 26 : 0, 4, 4, H - (L >= 2 ? 26 : 0), L >= 3 ? '#4f585e' : '#6b4a2b');
  push(0, 0, H, 40, 40, 4, C.plank); for (const [x, y, w, d] of [[0, 19, 40, 2], [19, 0, 2, 40], [0, -19, 40, 2], [-19, 0, 2, 40]]) push(x, y, H + 4, w, d, 10, C.plank);
  push(16, 18, 0, 6, 2, H, '#5b3a22'); for (let z = 8; z < H; z += 10) push(16, 19.5, z, 6, 1, 1.4, '#7a5230');
  if (L >= 2) { for (const [x, y] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) push(x, y, H + 4, 3, 3, 20, C.post); push(0, 0, H + 24, 46, 46, 4, L >= 4 ? '#25303d' : '#7a3a2a'); push(0, 0, H + 28, 30, 30, 6, L >= 4 ? '#3d4f63' : '#8a4a32'); }
  if (L >= 3) { const a = t * 0.9; push(0, 0, H + 6, 10, 10, 6, '#3a4046'); push(Math.cos(a) * 4, Math.sin(a) * 4, H + 12, 14, 9, 8, '#2a2f34', a); push(Math.cos(a) * 11, Math.sin(a) * 11, H + 13, 1, 7, 6, '#fffbd0', a); }
  if (L >= 4) { push(-19.4, 0, H * 0.6, 0.6, 30, 2, '#5ff4ff'); push(0, -19.4, H * 0.6, 30, 0.6, 2, '#5ff4ff'); push(0, 0, H + 39, 2, 2, 22, '#c8d0d4'); }
  return out;
}
const V11_PARTS = {
  sawmill(b, t) { const out = [], push = (...a) => out.push(a), on = b.powered, spin = on ? t * 20 : 0; push(0, 0, 0, 88, 88, 4, '#5a3e26'); push(0, 0, 4, 70, 26, 18, '#7a5230'); push(0, 0, 22, 74, 28, 3, '#5a3b20'); for (let i = 0; i < 4; i++) push(-30, -26 + (i % 2) * 8, 4 + Math.floor(i / 2) * 9, 26, 9, 9, i % 2 ? '#6b4423' : '#7a5230'); push(4, 0, 25, 2, 24, 24, '#c8d0d4', spin * 0.02); for (const [x, y] of [[-38, -38], [38, -38], [-38, 38], [38, 38]]) push(x, y, 4, 4, 4, 52, '#6b4a2b'); push(0, 0, 56, 90, 90, 3, '#8b6b4a'); push(40, 0, 4, 12, 20, 6, '#a87a48'); push(30, 30, 4, 12, 12, 10, '#3a4048'); push(36.4, 30, 8, 0.6, 8, 4, on ? '#5fff8a' : '#ff3b30'); return out; },
  ammofab(b, t) { const out = [], push = (...a) => out.push(a), on = b.powered; push(0, 0, 0, 90, 90, 5, '#3a3f44'); push(-6, 0, 5, 64, 70, 36, '#5d666d'); push(-6, 0, 41, 68, 74, 4, '#d4a017'); for (let i = -3; i <= 3; i++) push(26.4, i * 10, 8, 0.6, 5, 30, i % 2 ? '#1c1c1c' : '#d4a017'); push(-24, -18, 45, 22, 22, 14, '#4a4f55'); push(16, 20, 45, 8, 8, 30, '#4a4f55'); push(34, 0, 5, 18, 26, 10, '#4b5d3a'); push(-36, 26, 45, 6, 6, 6, on && Math.floor(t * 3) % 2 ? '#ff3b30' : '#551111'); push(27, 26, 10, 0.6, 8, 6, on ? '#5fff8a' : '#ff3b30'); return out; },
  export(b, t) { const out = [], push = (...a) => out.push(a); push(0, 0, 0, 92, 92, 4, '#4a4f52'); for (let i = -2; i <= 2; i++) push(i * 18, 0, 4, 2, 88, 1, '#e1b12c'); push(-22, -20, 4, 40, 20, 22, '#2e5e8a'); push(-22, 4, 4, 40, 20, 22, '#a0522d'); push(-22, -8, 26, 40, 20, 22, '#4b5d3a'); push(30, -36, 4, 6, 6, 70, '#e1b12c'); push(14, -36, 72, 40, 5, 5, '#e1b12c', Math.sin(t * 0.6) * 0.4); push(30, 26, 4, 24, 26, 8, '#5d666d'); push(-40, 36, 4, 4, 4, 40, '#3a3a3a'); push(-40, 36, 44, 22, 3, 16, '#120f16'); push(-40, 37.6, 47, 18, 0.4, 10, '#ffd84a'); return out; },
};
{ const _pbV11 = pBuildingParts; pBuildingParts = function (b, t) { if (V11_PARTS[b.type]) return V11_PARTS[b.type](b, t); return _pbV11(b, t); }; }
const MERGE_COL = { storage: '#ffcf7a', farm: '#5ac8e8', solar: '#5fd4ff', battery: '#5fff8a', container: '#ffd84a', export: '#ffd84a', generator: '#ffb020', wind: '#5fd4ff', geo: '#ff8a2a' };
function mergeParts(b) {
  const out = [], m = b.mnb; if (!m || !b.mlinks) return out;
  const Wd = b.w * TILE, Hd = b.h * TILE, col = MERGE_COL[b.type] || '#ffd84a', push = (...a) => out.push(a);
  const conn = (x, y, alongY, len) => { push(x, y, 0, alongY ? 18 : len, alongY ? len : 18, 6, '#3a3f44'); push(x, y, 6, alongY ? 6 : len, alongY ? len : 6, 1.6, col); };
  if (b.type === 'storage') {
    const ex = m.e ? 0 : 6, wx = m.w ? 0 : 6, sy = m.s ? 0 : 6, ny = m.n ? 0 : 6, w = Wd - ex - wx, h = Hd - sy - ny, cx = (wx - ex) / 2, cy = (ny - sy) / 2;
    for (const [x, y] of [[-Wd / 2 + 5, -Hd / 2 + 5], [Wd / 2 - 5, -Hd / 2 + 5], [-Wd / 2 + 5, Hd / 2 - 5], [Wd / 2 - 5, Hd / 2 - 5]]) push(x, y, 0, 5, 5, 44, '#6b4a2b');
    push(cx, cy, 44, w, h, 3, '#3b4d74'); push(cx, cy, 47, (m.e || m.w) ? w : w * 0.5, (m.e || m.w) ? h * 0.5 : h, 4, '#34466a');
  } else if (b.type === 'farm') {
    const blue = (x, y, along, len) => { push(x, y, 0.5, along ? 8 : len, along ? len : 8, 1.6, '#5ac8e8'); push(x, y, 0.2, along ? 12 : len, along ? len : 12, 1, '#3e2a18'); };
    if (m.e) blue(Wd / 2, 0, true, Hd - 8); if (m.w) blue(-Wd / 2, 0, true, Hd - 8); if (m.s) blue(0, Hd / 2, false, Wd - 8); if (m.n) blue(0, -Hd / 2, false, Wd - 8);
    if (b.mlinks >= 2) { push(0, 0, 0, 3, 3, 30, '#7a5230'); push(0, 0, 30, 8, 8, 8, '#e8d17a'); }
  } else { if (m.e) conn(Wd / 2, 0, true, Hd * 0.55); if (m.w) conn(-Wd / 2, 0, true, Hd * 0.55); if (m.s) conn(0, Hd / 2, false, Wd * 0.55); if (m.n) conn(0, -Hd / 2, false, Wd * 0.55); }
  return out;
}
function scaffoldParts(b, t) {
  const out = [], Wd = b.w * TILE, Hd = b.h * TILE, k = clamp(b.evo || 0, 0, 1), H = 30 + 50 * k;
  for (const [x, y] of [[-Wd / 2 - 3, -Hd / 2 - 3], [Wd / 2 + 3, -Hd / 2 - 3], [-Wd / 2 - 3, Hd / 2 + 3], [Wd / 2 + 3, Hd / 2 + 3]]) out.push([x, y, 0, 3, 3, H, '#c9a36b']);
  for (let z = 14; z < H; z += 16) { out.push([0, Hd / 2 + 3, z, Wd + 6, 2, 2, '#a87a48']); out.push([Wd / 2 + 3, 0, z, 2, Hd + 6, 2, '#a87a48']); }
  out.push([0, 0, H + 14 + Math.sin(t * 9) * 4, 12, 12, 12, '#ffd84a']);
  return out;
}
{
  const _bpV11 = buildingParts;
  buildingParts = function (b, t) {
    let out = b.type === 'workbench' ? workbenchParts(b, t) : b.type === 'watchtower' ? watchtowerParts(b, t) : _bpV11(b, t);
    if (b.mlinks) out = out.concat(mergeParts(b));
    if (b.evo > 0) out = out.concat(scaffoldParts(b, t || 0));
    return out;
  };
}
