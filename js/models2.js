'use strict';
// ===================== MODELLE 2: Gebäude, Props, Stadt, Station =====================
function towerParts(T) {
  const out = [], rng = mulberry32(T.seed), rr = (a, b) => a + rng() * (b - a);
  const w = T.fw * TILE - 10, d = T.fh * TILE - 10, H = T.floors * 22, col = T.col, trim = hexShade(col, 0.8), glass = T.glass ? '#5f8796' : '#1d2b33', hw = w / 2, hd = d / 2;
  out.push([0, 0, 0, w + 8, d + 8, 5, '#6d6a64']);
  const H0 = T.ruined ? H * 0.55 : H;
  out.push([0, 0, 5, w, d, H0, col]);
  if (T.ruined) {
    for (let i = 0; i < 6; i++) { out.push([hw - 6, -hd + (i + 0.5) * d / 6, 5 + H0, 12, d / 6 - 1, rr(0.1, 0.45) * H, col]); out.push([-hw + (i + 0.5) * w / 6, hd - 6, 5 + H0, w / 6 - 1, 12, rr(0.05, 0.4) * H, col]); }
    for (let i = 0; i < 4; i++) out.push([rr(-hw + 10, hw - 10), rr(-hd + 10, hd - 10), 5 + H0, 3, 3, rr(20, 60), '#3a3330']);
    for (let i = 0; i < 6; i++) out.push([rr(-hw + 10, hw - 20), rr(-hd + 10, hd - 20), 5 + H0, rr(10, 22), rr(10, 22), rr(4, 10), i % 2 ? '#8f8a80' : '#3f8a3a']);
  }
  for (let f = 0; f < T.floors; f++) {
    const z = 5 + f * 22; if (z + 16 > (T.ruined ? 5 + H0 + 6 : 1e9) || z + 18 > 5 + H0 + (T.ruined ? 6 : 0)) break;
    out.push([hw + 0.6, 0, z, 1.6, d, 2.4, trim]); out.push([0, hd + 0.6, z, w, 1.6, 2.4, trim]);
    for (let i = 0; i < Math.floor(d / 15); i++) { const r = rng(); out.push([hw + 0.4, -hd + 9 + i * 15, z + 6, 0.8, 9, 11, r < 0.18 ? '#0a0d10' : r < 0.22 ? '#ffd27a' : glass]); }
    for (let i = 0; i < Math.floor(w / 15); i++) { const r = rng(); out.push([-hw + 9 + i * 15, hd + 0.4, z + 6, 9, 0.8, 11, r < 0.18 ? '#0a0d10' : r < 0.22 ? '#ffd27a' : glass]); }
  }
  for (let i = 0, n = 4 + Math.floor(rng() * 6); i < n; i++) { const side = rng() < 0.5, hh = rr(30, Math.min(H0, 200)), gc = rng() < 0.5 ? '#2f6b2a' : '#3f8a3a'; if (side) out.push([hw + 1.6, rr(-hd + 8, hd - 8), 5, 1.6, rr(6, 16), hh, gc]); else out.push([rr(-hw + 8, hw - 8), hd + 1.6, 5, rr(6, 16), 1.6, hh, gc]); }
  for (let i = 0; i < 5; i++) out.push([rr(-hw, hw), hd + 8, 0, rr(12, 22), 10, rr(8, 14), '#2f7a35']);
  out.push([0, hd + 1, 5, 22, 2, 22, '#1a1a1a']); out.push([0, hd + 2, 27, 28, 3, 3, trim]); out.push([0, hd + 2.2, 30, 16, 1, 5, T.looted >= T.floors ? '#555' : '#ffb020']);
  if (!T.ruined) { const z = 5 + H; out.push([hw - 2, 0, z, 4, d, 6, trim]); out.push([0, hd - 2, z, w, 4, 6, trim]); out.push([-hw + 2, 0, z, 4, d, 6, trim]); out.push([0, -hd + 2, z, w, 4, 6, trim]); out.push([-hw / 3, -hd / 3, z, 22, 22, 4, '#3a3330']); out.push([-hw / 3, -hd / 3, z + 4, 18, 18, 22, '#7a5a3a']); out.push([hw / 3, hd / 3, z, 16, 12, 10, '#9aa19c']); if (rng() < 0.6) { out.push([0, 0, z, 3, 3, 60, '#5b6266']); out.push([0, 0, z + 60, 4, 4, 3, '#ff3b30']); } out.push([rr(-hw / 2, hw / 2), rr(-hd / 2, hd / 2), z, 20, 16, 6, '#3f8a3a']); }
  for (let i = 0; i < 4; i++) out.push([hw + rr(10, 24), rr(-hd, hd), 0, rr(8, 16), rr(8, 16), rr(3, 9), '#8f8a80']);
  return out;
}
// Piltover-Haus: cremefarbene Wände, schieferblaues Mansarddach, Gold
function piltHouse(push, x, y, w, d, H, roof, rng, z0) {
  z0 = z0 || 0; const wall = rng() < 0.5 ? '#efe3c8' : '#e6d6b4', trim = '#c9952a';
  push(x, y, z0, w, d, H, wall); push(x, y, z0, w + 2, d + 2, 4, '#b8a888');
  for (let f = 0; f < Math.floor(H / 22); f++) { const zz = z0 + 8 + f * 22; for (let i = 0; i < Math.floor(d / 14); i++) push(x + w / 2 + 0.4, y - d / 2 + 8 + i * 14, zz, 0.8, 7, 12, rng() < 0.25 ? '#ffd27a' : '#4a6a8a'); for (let i = 0; i < Math.floor(w / 14); i++) push(x - w / 2 + 8 + i * 14, y + d / 2 + 0.4, zz, 7, 0.8, 12, rng() < 0.25 ? '#ffd27a' : '#4a6a8a'); push(x + w / 2 + 0.8, y, zz - 3, 1, d, 1.6, trim); push(x, y + d / 2 + 0.8, zz - 3, w, 1, 1.6, trim); }
  const z = z0 + H; push(x, y, z, w + 3, d + 3, 3, trim); push(x, y, z + 3, w, d, 10, roof); push(x, y, z + 13, w * 0.7, d * 0.7, 9, hexShade(roof, 0.88)); push(x, y, z + 22, w * 0.35, d * 0.35, 6, roof);
  for (let i = 0; i < 2; i++) push(x + w / 2 - 2, y - d / 4 + i * d / 2, z + 6, 6, 8, 9, '#efe3c8');
  push(x - w / 4, y - d / 4, z + 13, 5, 5, 18, '#a5503a'); push(x - w / 4, y - d / 4, z + 31, 6, 6, 2, '#7a3a2a');
  if (rng() < 0.4) { push(x, y, z + 28, 3, 3, 14, trim); push(x, y, z + 42, 5, 5, 4, '#ffd84a'); }
}
function zaunHouse(push, x, y, w, d, H, rng) {
  const walls = ['#5a4a3a', '#4a5248', '#6a5040', '#3e4a46', '#5e5a4e'], c = walls[Math.floor(rng() * walls.length)];
  push(x, y, 0, w, d, H, c); push(x + w / 2 + 0.4, y + d / 4, 10, 0.8, d / 3, H * 0.4, hexShade(c, 1.25)); push(x - w / 4, y + d / 2 + 0.4, H * 0.5, w / 3, 0.8, H * 0.3, hexShade(c, 0.8));
  for (let i = 0; i < 2; i++) { const g = rng() < 0.5 ? '#ffb04a' : '#5fff8a'; push(x + w / 2 + 0.6, y - d / 4 + i * d / 2, H * 0.55, 1, 8, 8, '#2a2a2a'); push(x + w / 2 + 1, y - d / 4 + i * d / 2, H * 0.55 + 1, 0.6, 6, 6, g); }
  push(x - w / 2 + 6, y + d / 2 + 2, 0, 3, 3, H + 14, '#5a3b2a'); push(x - w / 2 + 6, y + d / 2 + 2, H + 14, 3, 14, 3, '#5a3b2a');
  push(x + w / 2 + 2, y - d / 2 + 6, 0, 3, 3, H + 6, '#6a5a3a');
  push(x, y, H, w + 4, d + 4, 4, '#3a2a22'); push(x - w / 6, y, H + 4, w * 0.6, d * 0.8, H * 0.5, hexShade(c, 0.9)); push(x - w / 6, y, H * 1.5 + 4, w * 0.66, d * 0.86, 3, '#3a2a22');
  push(x + w / 2 + 4, y, 22, 10, d * 0.8, 1.5, rng() < 0.5 ? '#8a2a2a' : '#2a6a5a');
  if (rng() < 0.5) { push(x + w / 2 + 0.6, y, 30, 1, 14, 6, '#120f16'); push(x + w / 2 + 1.2, y, 31, 0.4, 10, 3, rng() < 0.5 ? '#ff3fa4' : '#5fff8a'); }
}
function propParts(p) {
  const out = [], k = p.kind, push = (...a) => out.push(a);
  switch (k) {
    case 'ruin': { const c = '#8f948e', len = p.len; push(0, -len / 2 + 5, 0, 10, 10, 50, c); for (let i = 0; i < len / 16; i++) push(0, -len / 2 + 13 + i * 16, 0, 8, 16, 18 + ((i * 37 + p.seed) % 30), hexShade(c, 0.95 + (i % 2) * 0.05)); push(18, len / 3, 0, 14, 12, 6, '#7a7f7a'); for (let i = 0; i < 6; i++) push(((i * 7) % 8) - 4, -len / 2 + (i + 0.5) * len / 6, 6 + (i * 11) % 30, 11, 6, 7, i % 2 ? '#3f8a3a' : '#2f6b2a'); break; }
    case 'streetlamp': push(0, 0, 0, 6, 6, 4, '#3a3f42'); push(0, 0, 4, 3, 3, 62, '#4b5257'); push(8, 0, 64, 18, 3, 3, '#4b5257'); if (p.broken) { push(16, 0, 58, 6, 5, 4, '#2a2a2a'); push(0, 0, 20, 2, 6, 30, '#2f6b2a'); } else push(16, 0, 60, 8, 6, 4, '#2a2a2a'); break;
    case 'barrier': push(0, 0, 0, 40, 10, 6, '#b8b2a6'); push(0, 0, 6, 40, 6, 10, '#c8c2b6'); push(-10, 0, 6, 8, 6.4, 4, '#d63031'); push(10, 0, 6, 8, 6.4, 4, '#d63031'); push(0, 6, 0, 14, 3, 8, '#3f8a3a'); break;
    case 'trafficlight': push(0, 0, 0, 4, 4, 56, '#2d3436'); push(0, 0, 56, 6, 8, 18, '#1c1c1c'); push(3.2, 0, 70, 0.6, 4, 3, '#4a1010'); push(3.2, 0, 65, 0.6, 4, 3, '#4a3a10'); push(3.2, 0, 60, 0.6, 4, 3, '#103a10'); push(0, 2, 10, 2, 2, 30, '#2f6b2a'); break;
    case 'hpad':
      push(0, 0, 0, 150, 150, 3, '#7d7f7c'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; push(Math.cos(a) * 55, Math.sin(a) * 55, 3, 16, 6, 0.6, '#e1b12c', a + Math.PI / 2); }
      push(0, -14, 3, 46, 7, 0.6, '#f2f2f2', Math.PI / 2); push(0, 14, 3, 46, 7, 0.6, '#f2f2f2', Math.PI / 2); push(0, 0, 3, 7, 28, 0.6, '#f2f2f2', Math.PI / 2);
      for (const [x, y] of [[-70, -70], [70, -70], [-70, 70], [70, 70]]) push(x, y, 3, 6, 6, 3, '#ff3b30'); break;
    case 'bunker': push(0, 0, 0, 90, 70, 34, '#7d7f74'); push(0, 0, 34, 96, 76, 6, '#6a6c62'); push(45.4, 0, 10, 1, 40, 6, '#111'); push(0, 35.4, 0, 22, 1, 26, '#222'); push(-20, -10, 40, 30, 30, 6, '#556b2f'); break;
    case 'tank': push(0, 0, 0, 80, 44, 14, '#4b5d3a'); push(0, -22, 0, 82, 8, 12, '#2a2a2a'); push(0, 22, 0, 82, 8, 12, '#2a2a2a'); push(-4, 0, 14, 56, 40, 12, '#556b2f'); push(-6, 0, 26, 34, 30, 14, '#4b5d3a'); push(32, 0, 31, 50, 5, 5, '#3a4a2a', p.tur || 0); break;
    case 'sandbag': for (let i = -2; i <= 2; i++) { push(0, i * 13, 0, 14, 12, 8, '#b5a27a'); push(0, i * 13 + 6, 8, 14, 12, 8, '#a8956c'); } break;
    case 'wtower': for (const [x, y] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) push(x, y, 0, 4, 4, 70, '#5b4a30'); push(0, 0, 70, 40, 40, 4, '#6b5a3a'); push(0, 20, 74, 40, 2, 14, '#6b5a3a'); push(20, 0, 74, 2, 40, 14, '#6b5a3a'); push(0, 0, 94, 46, 46, 4, '#4a3d2a'); break;
    case 'container': push(0, 0, 0, 100, 34, 36, p.col || '#a0522d'); for (let i = -45; i <= 45; i += 9) push(i, 17.2, 2, 2, 0.6, 32, hexShade(p.col || '#a0522d', 0.8)); push(-10, 0, 36, 30, 20, 5, '#3f8a3a'); break;
    case 'pump': push(0, 0, 0, 40, 26, 10, '#3a3a3a'); push(-8, 0, 10, 6, 6, 40, '#6b6b6b'); push(-8, 0, 50, 60, 6, 6, '#c0392b', Math.sin(p.ph || 0) * 0.25); push(20, 0, 10, 10, 10, 24, '#2d2d2d'); break;
    case 'hut': push(0, 0, 4, 50, 40, 26, '#5a4630'); push(0, 0, 30, 56, 46, 5, '#3e3324'); push(0, 0, 35, 40, 30, 6, '#4a3d2a'); push(25.2, 0, 8, 0.6, 12, 18, '#1a1a1a'); break;
    case 'skull': push(0, 0, 0, 10, 12, 9, '#e6e1d4'); push(5.2, -2.5, 4, 0.6, 3, 3, '#111'); push(5.2, 2.5, 4, 0.6, 3, 3, '#111'); push(8, 6, 0, 16, 3, 3, '#e6e1d4'); break;
    case 'labbox': push(0, 0, 0, 70, 50, 40, '#e8eef2'); push(0, 0, 40, 74, 54, 4, '#c8d0d4'); push(35.2, 0, 4, 0.6, 16, 28, '#2a3038'); push(0, 25.2, 18, 40, 0.6, 10, '#5ff4ff'); break;
    case 'antenna': push(0, 0, 0, 16, 16, 4, '#9aa6aa'); push(0, 0, 4, 4, 4, 90, '#c8d0d4'); push(0, 0, 70, 30, 2, 2, '#c8d0d4'); push(0, 0, 94, 5, 5, 4, '#ff3b30'); break;
    case 'sign': push(0, 0, 0, 4, 4, 34, '#5b4a30'); push(0, 0, 30, 3, 34, 16, p.col || '#c9a36b'); push(1.8, 0, 34, 0.4, 26, 3, '#3a2a1a'); break;
    // ----- Funkstation -----
    case 'radiotower': {
      const H = 230; for (let i = 0; i < 10; i++) { const z = i * H / 10, s = 30 - i * 2.6; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) push(a * s / 2, b * s / 2, z, 3, 3, H / 10 + 1, '#8a3a2a'); push(0, -s / 2, z + 10, s, 1.6, 1.6, '#a85a3a'); push(-s / 2, 0, z + 10, 1.6, s, 1.6, '#a85a3a'); }
      push(0, 0, H, 4, 4, 24, '#9aa6aa'); push(0, 0, H + 24, 6, 6, 4, '#ff3b30'); push(6, 0, H * 0.6, 4, 30, 30, '#c8d0d4'); push(8.4, 0, H * 0.6 + 4, 0.6, 22, 22, '#9aa6aa');
      push(-8, 6, H * 0.4, 4, 4, 30, '#3a7a30'); push(8, -8, H * 0.15, 6, 6, 50, '#2f6b2a'); push(0, 0, 0, 40, 40, 4, '#6d6a64'); break;
    }
    case 'radiohut':
      push(0, 0, 0, 96, 70, 4, '#6d6a64'); push(-6, 0, 4, 80, 60, 44, '#9a958a'); push(-6, 0, 48, 86, 66, 5, '#6a5040'); push(-6, 0, 53, 70, 50, 4, '#5a4030');
      push(34.4, -14, 4, 0.6, 18, 30, '#3a2a1a'); push(34.4, 14, 20, 0.6, 20, 14, '#1a2a2a'); push(-6, 30.4, 22, 26, 0.6, 14, '#1a2a2a');
      push(-20, -10, 57, 22, 22, 4, '#c8d0d4'); push(-20, -10, 61, 26, 26, 2, '#e8eef2', 0.6); push(-20, -10, 63, 3, 3, 12, '#9aa6aa');
      push(10, 0, 57, 12, 10, 8, '#7a3a2a'); push(36, 26, 0, 22, 14, 18, '#c0a030'); push(36, 26, 18, 18, 10, 3, '#8a7020');
      push(-50, -10, 0, 4, 60, 40, '#2f6b2a'); push(-30, 34, 0, 40, 4, 30, '#3a7a30'); push(10, -36, 46, 26, 10, 10, '#3f8a3a');
      push(36.2, -14, 36, 0.6, 18, 6, p.fixed ? '#5fff8a' : '#552222'); break;
    case 'fence': { const len = p.len || 96; for (let i = 0; i <= len / 24; i++) push(-len / 2 + i * 24, 0, 0, 3, 3, 30, '#6a6a6a'); push(0, 0, 26, len, 1.4, 1.4, '#8a8a8a'); push(0, 0, 14, len, 0.6, 12, 'rgba' === 1 ? '' : '#5a5a5a'); for (let i = 0; i < len / 30; i++) push(-len / 2 + 10 + i * 30, 0, 0, 10, 4, 20, '#3a7a30'); break; }
    case 'dropbox': push(0, 0, 0, 20, 20, 4, '#4a4f52'); push(0, 0, 4, 14, 14, 30, '#2e5e8a'); push(7.2, 0, 14, 0.6, 10, 12, '#1c3a5a'); push(0, 0, 34, 16, 16, 3, '#24496b'); push(0, -8, 0, 2, 2, 60, '#5a5a5a'); push(0, -12, 50, 1, 8, 10, '#ffb020'); push(0, 0, 37, 4, 4, 4, '#ffd84a'); break;
    case 'campfire': for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; push(Math.cos(a) * 13, Math.sin(a) * 13, 0, 7, 7, 5, i % 2 ? '#7d817e' : '#959995'); } push(0, 0, 1, 22, 5, 5, '#6b4423', 0.6); push(0, 0, 6, 12, 12, 9, '#ff7b1c'); push(1, -1, 10, 8, 8, 9, '#ffb52e'); break;
    // ----- Neu-Eden außen -----
    case 'citywall': {
      const len = p.len, H = p.H || 84, stone = p.H ? '#e6d6b4' : '#b9b5aa';
      push(0, 0, 0, len, 26, H, stone); push(0, 0, H, len + 2, 30, 6, '#c9b896'); push(0, 0, H - 14, len + 1, 28, 3, '#c9952a');
      for (let i = 0; i < len / 48; i++) { const x = -len / 2 + 24 + i * 48; push(x, 13.4, 10, 3, 0.6, H - 20, hexShade(stone, 0.9)); push(x, 0, H + 6, 12, 12, 10, '#c9b896'); if (i % 3 === 0 && p.H) { push(x, 0, H + 16, 16, 16, 30, '#e6d6b4'); push(x, 0, H + 46, 18, 18, 8, '#3b4d74'); push(x, 0, H + 54, 10, 10, 8, '#3b4d74'); push(x, 0, H + 62, 3, 3, 10, '#ffd84a'); } }
      for (let i = 0; i < len / 96; i++) push(-len / 2 + 48 + i * 96, 14, H * 0.8, 6, 4, 4, '#fffbd0');
      for (let i = 0; i < len / 60; i++) push(-len / 2 + 30 + i * 60, 14, 0, 18, 4, 30 + (i * 17) % 40, i % 2 ? '#2f6b2a' : '#3f8a3a');
      break;
    }
    case 'citygate':
      push(0, -56, 0, 40, 40, 160, '#e6d6b4'); push(0, 56, 0, 40, 40, 160, '#e6d6b4'); for (const s of [-56, 56]) { push(0, s, 160, 46, 46, 8, '#c9952a'); push(0, s, 168, 34, 34, 22, '#3b4d74'); push(0, s, 190, 20, 20, 16, '#3b4d74'); push(0, s, 206, 4, 4, 18, '#ffd84a'); }
      push(0, 0, 110, 34, 76, 30, '#e6d6b4'); push(0, 0, 140, 36, 80, 4, '#c9952a'); push(18.2, 0, 116, 0.6, 30, 20, '#c9952a'); push(18.6, 0, 121, 0.4, 18, 10, '#5fd4ff');
      push(0, 0, 0, 16, 72, 110, '#5a4a30'); for (let i = -3; i <= 3; i++) push(8.4, i * 10, 4, 0.6, 3, 100, '#c9952a'); push(8.6, 0, 50, 0.6, 20, 20, '#ffd84a');
      push(22, -56, 100, 4, 8, 8, '#fffbd0'); push(22, 56, 100, 4, 8, 8, '#fffbd0'); break;
    case 'edenskyline': {
      const rng = mulberry32(p.seed || 7), w = p.w, d = p.d, cx = 0, cy = 0;
      const roofs = ['#3b4d74', '#34466a', '#3f7f7a', '#4a5f8a', '#a5503a'];
      push(0, 0, 0, w, d, 40, '#d8c8a4');
      const n = 7;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = -w / 2 + (i + 0.5) * w / n, y = -d / 2 + (j + 0.5) * d / n, dc = Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2);
        if (dc < 1.2) continue;
        const H = 90 + (4 - dc) * 26 + rng() * 40;
        piltHouse(push, x + (rng() - 0.5) * 10, y + (rng() - 0.5) * 10, w / n - 14, d / n - 14, H, roofs[Math.floor(rng() * roofs.length)], rng, 40);
      }
      // Zentrum: Schloss mit Türmen + Glaskuppel
      push(cx, cy, 40, 150, 150, 140, '#efe3c8'); push(cx, cy, 180, 156, 156, 6, '#c9952a');
      for (const [x, y] of [[-60, -60], [60, -60], [-60, 60], [60, 60]]) { push(x, y, 40, 36, 36, 220, '#e6d6b4'); push(x, y, 260, 40, 40, 6, '#c9952a'); push(x, y, 266, 30, 30, 30, '#3b4d74'); push(x, y, 296, 18, 18, 30, '#34466a'); push(x, y, 326, 8, 8, 24, '#3b4d74'); push(x, y, 350, 3, 3, 16, '#ffd84a'); push(x + 18.4, y, 200, 0.6, 10, 30, '#5fd4ff'); }
      push(cx, cy, 186, 90, 90, 80, '#efe3c8'); push(cx, cy, 266, 96, 96, 6, '#c9952a'); push(cx, cy, 272, 70, 70, 40, '#3b4d74'); push(cx, cy, 312, 44, 44, 40, '#34466a'); push(cx, cy, 352, 20, 20, 40, '#3b4d74'); push(cx, cy, 392, 6, 6, 30, '#ffd84a'); push(cx, cy, 422, 10, 10, 6, '#fff3c0');
      push(cx + 45.4, cy, 220, 0.6, 30, 30, '#c9952a'); push(cx + 45.8, cy, 228, 0.4, 20, 14, '#5fd4ff');
      push(cx + 110, cy - 110, 40, 90, 90, 30, '#c9952a'); push(cx + 110, cy - 110, 70, 80, 80, 26, '#9fd3d6'); push(cx + 110, cy - 110, 96, 56, 56, 20, '#aee0e0'); push(cx + 110, cy - 110, 116, 30, 30, 14, '#bfe8e8'); push(cx + 110, cy - 110, 130, 4, 4, 14, '#ffd84a');
      break;
    }
    // ----- Piltover (Oberstadt) -----
    case 'pilthouse': { const rng = mulberry32(p.seed || 3); piltHouse(push, 0, 0, p.w || 90, p.d || 80, p.H || 70, p.col || '#3b4d74', rng, 0); push(0, (p.d || 80) / 2 + 1, 0, 18, 2, 24, '#5a3b20'); break; }
    case 'clocktower':
      push(0, 0, 0, 60, 60, 10, '#c9b896'); push(0, 0, 10, 46, 46, 170, '#efe3c8'); for (let i = 0; i < 5; i++) { push(23.4, 0, 30 + i * 28, 0.8, 10, 16, '#4a6a8a'); push(0, 23.4, 30 + i * 28, 10, 0.8, 16, '#4a6a8a'); push(23.6, 0, 26 + i * 28, 1, 46, 2, '#c9952a'); }
      push(0, 0, 180, 52, 52, 6, '#c9952a'); push(0, 0, 186, 46, 46, 40, '#e6d6b4'); push(23.4, 0, 196, 0.8, 30, 30, '#fff3c0'); push(23.8, 0, 210, 0.6, 2, 13, '#2a2a2a', (p.t || 0)); push(0, 23.4, 196, 30, 0.8, 30, '#fff3c0');
      push(0, 0, 226, 50, 50, 6, '#c9952a'); push(0, 0, 232, 40, 40, 20, '#3b4d74'); push(0, 0, 252, 26, 26, 24, '#34466a'); push(0, 0, 276, 12, 12, 24, '#3b4d74'); push(0, 0, 300, 3, 3, 20, '#ffd84a'); break;
    case 'glassdome':
      push(0, 0, 0, 150, 120, 8, '#c9952a'); push(0, 0, 8, 140, 110, 24, '#9fd3d6'); push(0, 0, 32, 120, 92, 20, '#aee0e0'); push(0, 0, 52, 90, 66, 16, '#bfe8e8'); push(0, 0, 68, 50, 36, 12, '#cfeeee'); push(0, 0, 80, 6, 6, 16, '#ffd84a');
      for (let i = -3; i <= 3; i++) { push(i * 20, 55.6, 8, 1.6, 0.6, 24, '#c9952a'); push(70.6, i * 15, 8, 0.6, 1.6, 24, '#c9952a'); }
      push(0, 0, 8, 120, 2, 60, 'transparent' === 1 ? '' : '#c9952a'); for (let i = 0; i < 6; i++) push(-50 + i * 20, 40, 8, 10, 10, 18, '#3a8a3c'); break;
    case 'rathaus': {
      const w = 260, d = 200;
      push(0, 0, 0, w + 20, d + 20, 6, '#c9b896'); push(-20, 0, 6, w - 50, d - 30, 100, '#efe3c8');
      for (let i = 0; i < 8; i++) { push(w / 2 - 24, -d / 2 + 22 + i * (d - 44) / 7, 6, 12, 12, 100, '#fbf6ea'); push(-w / 2 + 40 + i * (w - 80) / 7, d / 2 - 14, 6, 12, 12, 100, '#fbf6ea'); }
      push(0, 0, 106, w, d, 8, '#c9952a'); push(0, 0, 114, w - 20, d - 20, 18, '#3b4d74'); push(0, 0, 132, w - 70, d - 70, 18, '#34466a');
      push(0, 0, 150, 70, 70, 50, '#efe3c8'); push(35.4, 0, 165, 0.6, 30, 30, '#fff3c0'); push(0, 0, 200, 78, 78, 6, '#c9952a'); push(0, 0, 206, 56, 56, 26, '#3b4d74'); push(0, 0, 232, 30, 30, 26, '#34466a'); push(0, 0, 258, 4, 4, 30, '#ffd84a');
      push(w / 2 + 2, 0, 6, 4, 60, 0.6, '#8a1c1c'); for (const s of [-1, 1]) { push(w / 2 + 14, s * 70, 0, 3, 3, 120, '#c9952a'); push(w / 2 + 14, s * 70 + 10, 100, 2, 20, 14, '#3b4d74'); } break;
    }
    case 'royal': {
      const w = 240, d = 200;
      push(0, 0, 0, w + 10, d + 10, 6, '#2a2a2a'); push(0, 0, 6, w, d, 80, '#efe3c8');
      for (let i = 0; i < 6; i++) { push(w / 2 + 2, -d / 2 + 24 + i * (d - 48) / 5, 6, 10, 10, 80, '#e8b923'); push(-w / 2 + 24 + i * (w - 48) / 5, d / 2 + 2, 6, 10, 10, 80, '#e8b923'); }
      push(w / 2 + 0.6, 0, 70, 1.4, d, 6, '#ffd84a'); push(0, d / 2 + 0.6, 70, w, 1.4, 6, '#ffd84a');
      push(0, 0, 86, w + 6, d + 6, 8, '#c9952a'); push(0, 0, 94, w - 40, d - 40, 24, '#7a2a3a'); push(0, 0, 118, w - 90, d - 90, 30, '#9fd3d6'); push(0, 0, 148, w - 140, d - 140, 20, '#bfe8e8'); push(0, 0, 168, 6, 6, 20, '#ffd84a');
      push(w / 2 + 34, 0, 0, 60, 40, 1, '#8a1c1c'); push(w / 2 + 1, 0, 6, 1, 40, 50, '#3a0a0a'); for (const s of [-1, 1]) push(w / 2 + 16, s * 34, 0, 8, 8, 40, '#e8b923'); break;
    }
    case 'villa':
      push(0, 0, 0, 200, 160, 4, '#7fbf5a'); push(-20, -10, 4, 120, 100, 50, '#efe3c8'); push(-20, -10, 54, 130, 110, 6, '#c9952a'); push(-20, -10, 60, 110, 90, 14, '#3b4d74'); push(-20, -10, 74, 70, 50, 12, '#34466a');
      push(40.6, -10, 4, 0.6, 20, 34, '#5a3b20'); for (let i = 0; i < 3; i++) push(40.4, -40 + i * 30, 24, 0.6, 14, 16, '#86d0ee'); push(60, 50, 4, 60, 36, 3, '#5ac8e8'); for (let i = -3; i <= 3; i++) push(-95, i * 22, 4, 10, 20, 12, '#2f7a35'); break;
    case 'skyloft':
      push(0, 0, 0, 140, 120, 140, '#efe3c8'); for (let f = 0; f < 6; f++) for (let i = 0; i < 6; i++) push(70.4, -50 + i * 20, 10 + f * 22, 0.8, 10, 14, f === 5 ? '#ffd27a' : '#4a6a8a');
      push(0, 0, 140, 146, 126, 6, '#c9952a'); push(-20, 0, 146, 90, 110, 30, '#3b4d74'); push(40, 0, 146, 70, 100, 4, '#7d7f7c'); push(40, 0, 150, 40, 6, 0.6, '#ffd84a', Math.PI / 2); push(40, 0, 150, 6, 40, 0.6, '#ffd84a', Math.PI / 2);
      for (const [x, y] of [[8, -44], [72, -44], [8, 44], [72, 44]]) push(x, y, 150, 4, 4, 4, '#5fd4ff'); break;
    case 'shop': {
      const c = p.col || '#3b4d74'; push(0, 0, 0, 130, 110, 4, '#c9b896'); push(-10, 0, 4, 100, 100, 54, '#efe3c8'); push(-10, 0, 58, 106, 106, 4, '#c9952a'); push(-10, 0, 62, 96, 96, 14, c); push(-10, 0, 76, 60, 60, 10, hexShade(c, 0.88));
      for (let i = 0; i < 6; i++) push(46, -45 + i * 18, 34, 18, 16, 3, i % 2 ? '#c9952a' : '#efe3c8');
      push(40.6, 0, 4, 0.6, 24, 30, '#5a3b20'); push(40.6, -32, 14, 0.6, 18, 18, '#86d0ee'); push(40.6, 32, 14, 0.6, 18, 18, '#86d0ee'); push(40, 0, 66, 2, 70, 14, '#c9952a'); push(41.2, 0, 69, 0.4, 56, 8, '#fff3c0');
      push(55, -40, 4, 12, 12, 12, '#2f7a35'); push(55, 40, 4, 12, 12, 12, '#2f7a35'); break;
    }
    case 'apartment': { const rng = mulberry32(11); piltHouse(push, 0, 0, 160, 110, 120, '#3b4d74', rng, 0); break; }
    case 'fountain': push(0, 0, 0, 90, 90, 10, '#e6d6b4'); push(0, 0, 10, 80, 80, 1, '#5ac8e8'); push(0, 0, 10, 16, 16, 30, '#efe3c8'); push(0, 0, 40, 36, 36, 4, '#c9952a'); push(0, 0, 44, 30, 30, 1, '#5ac8e8'); push(0, 0, 44, 6, 6, 22, '#e8b923'); push(0, 0, 66, 10, 10, 6, '#9fe6ff'); break;
    case 'elevator':
      for (const [x, y] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) push(x, y, 0, 8, 8, 170, p.zaun ? '#5a4a3a' : '#c9952a');
      push(0, 30, 0, 52, 2, 170, p.zaun ? '#3a4a40' : '#7fc7dd'); push(30, 0, 0, 2, 52, 170, p.zaun ? '#3a4a40' : '#7fc7dd'); push(0, 0, 170, 70, 70, 10, p.zaun ? '#4a3a2a' : '#c9952a');
      push(0, 0, 4 + (p.cab || 0), 46, 46, 34, p.zaun ? '#6a5a4a' : '#efe3c8'); push(23.4, 0, 8 + (p.cab || 0), 0.6, 20, 26, '#2a3038'); push(32, 0, 140, 2, 40, 14, p.col || '#7dff5a'); break;
    case 'lamppost': push(0, 0, 0, 8, 8, 4, '#3a2a1a'); push(0, 0, 4, 3, 3, 56, '#c9952a'); push(0, 0, 60, 12, 12, 12, '#fff2c0'); push(0, 0, 72, 14, 14, 3, '#c9952a'); push(0, 0, 75, 4, 4, 6, '#c9952a'); break;
    case 'bench': push(0, 0, 0, 34, 10, 8, '#7a5230'); push(0, -4, 8, 34, 2, 10, '#7a5230'); push(-14, 0, 0, 3, 10, 8, '#c9952a'); push(14, 0, 0, 3, 10, 8, '#c9952a'); break;
    case 'planter': push(0, 0, 0, 30, 30, 12, '#e6d6b4'); push(0, 0, 12, 26, 26, 12, '#3a8a3c'); push(-3, 3, 22, 16, 16, 8, '#4fa548'); if (p.flowers) for (let i = 0; i < 4; i++) push(-8 + i * 5, (i % 2) * 6 - 3, 30, 4, 4, 3, ['#ff7eb6', '#ffd84a', '#ffffff', '#b58cff'][i]); break;
    case 'innergate': push(0, -60, 0, 30, 30, 120, '#e6d6b4'); push(0, 60, 0, 30, 30, 120, '#e6d6b4'); push(0, -60, 120, 34, 34, 20, '#3b4d74'); push(0, 60, 120, 34, 34, 20, '#3b4d74'); push(0, 0, 90, 30, 150, 20, '#efe3c8'); push(16, 0, 94, 1, 80, 12, '#c9952a'); break;
    // ----- Zaun (Unterstadt) -----
    case 'zaunhouse': { const rng = mulberry32(p.seed || 5); zaunHouse(push, 0, 0, p.w || 90, p.d || 80, p.H || 70, rng); break; }
    case 'stall': {
      const c = p.col || '#8a2a2a';
      for (const [x, y] of [[-20, -16], [20, -16], [-20, 16], [20, 16]]) push(x, y, 0, 3, 3, 40, '#5a3b2a');
      push(0, 0, 18, 44, 34, 4, '#6b4423'); push(4, 0, 40, 52, 40, 3, c); push(26, 0, 36, 3, 40, 6, c); push(8, -6, 22, 10, 10, 8, '#8b5e34'); push(-8, 6, 22, 8, 8, 10, '#5fff8a'); push(-8, -8, 22, 6, 6, 6, '#ffb04a');
      push(24, -18, 34, 4, 4, 6, '#ffd27a'); push(24, 18, 34, 4, 4, 6, '#ffd27a'); push(-10, 26, 0, 14, 12, 10, '#7a5230'); break;
    }
    case 'pipebridge': {
      const len = p.len || 300;
      push(-len / 2, 0, 0, 12, 12, 130, '#4a3a2a'); push(len / 2, 0, 0, 12, 12, 130, '#4a3a2a');
      push(0, 0, 120, len, 22, 6, '#3a3028'); push(0, -10, 126, len, 2, 10, '#5a4a3a'); push(0, 10, 126, len, 2, 10, '#5a4a3a');
      push(0, 0, 104, len, 8, 8, '#6a5a3a'); push(0, 0, 112, len, 4, 4, '#3a6a4a');
      for (let i = 0; i < len / 60; i++) { push(-len / 2 + 30 + i * 60, 0, 100, 4, 24, 4, '#4a3a2a'); push(-len / 2 + 30 + i * 60, 12, 94, 4, 4, 6, i % 2 ? '#5fff8a' : '#ffb04a'); }
      break;
    }
    case 'chemvat': push(0, 0, 0, 50, 50, 8, '#3a3028'); push(0, 0, 8, 40, 40, 60, '#5a4a3a'); for (let i = 0; i < 3; i++) push(0, 0, 18 + i * 18, 42, 42, 2, '#3a3028'); push(20.4, 0, 20, 0.8, 14, 30, '#5fff8a'); push(0, 0, 68, 30, 30, 6, '#4a3a2a'); push(0, 0, 74, 6, 6, 40, '#4a3a2a'); push(18, 18, 30, 30, 6, 6, '#6a5a3a'); break;
    case 'neoncasino':
      push(0, 0, 0, 220, 180, 4, '#1c1c18'); push(0, 0, 4, 190, 160, 90, '#3a2f28'); for (let i = 0; i < 4; i++) { push(95.6, 0, 14 + i * 20, 1, 160, 2, i % 2 ? '#ff3fa4' : '#5fff8a'); push(0, 80.6, 14 + i * 20, 190, 1, 2, i % 2 ? '#ff3fa4' : '#5fff8a'); }
      for (let i = -2; i <= 2; i++) { push(95.8, i * 30, 30, 1, 10, 10, '#2a2a2a'); push(96.2, i * 30, 31, 0.6, 8, 8, '#ffb04a'); }
      push(0, 0, 94, 196, 166, 6, '#4a3a2a'); push(-30, -20, 100, 40, 40, 30, '#5a4a3a'); push(-30, -20, 130, 10, 10, 30, '#3a3028'); push(40, 20, 100, 30, 30, 50, '#4a3a2a');
      push(96, 0, 4, 1, 40, 50, '#0a0a0e'); push(100, 0, 58, 4, 110, 26, '#120f16'); push(102.2, 0, 62, 0.4, 96, 18, '#ff3fa4'); push(102.4, 0, 66, 0.3, 60, 8, '#5fff8a'); break;
    case 'neonbar': {
      const c1 = p.col || '#ff3fa4', c2 = p.col2 || '#5fff8a';
      zaunHouse(push, -10, 0, 130, 120, 70, mulberry32(p.seed || 9));
      push(55.6, 0, 4, 1, 120, 2, c2); push(55.4, 0, 4, 0.6, 26, 34, '#120f16'); push(55.8, 0, 38, 0.4, 30, 2, c2);
      push(58, 0, 46, 3, 70, 22, '#120f16'); push(59.6, -18, 52, 0.4, 20, 10, c1); push(59.6, 14, 52, 0.4, 24, 10, c2); push(70, -50, 0, 10, 10, 14, '#3a3a3a'); break;
    }
    case 'blackmarket': push(0, 0, 0, 100, 34, 36, '#3a2a2a'); push(0, 0, 36, 100, 34, 36, '#2a3a32'); push(0, 22, 72, 110, 50, 3, '#5a4a2a'); for (let i = -2; i <= 2; i++) push(i * 18, 34, 0, 14, 14, 14 + (i % 2) * 8, '#6b4423'); push(0, 50, 18, 70, 16, 1, '#5fff8a'); break;
    case 'barrelfire': push(0, 0, 0, 16, 16, 22, '#5a3b2a'); push(0, 0, 22, 12, 12, 8, '#ff7b1c'); push(0, 0, 28, 6, 6, 8, '#ffd84a'); break;
    case 'trash': push(0, 0, 0, 30, 24, 10, '#2a2a2a'); push(-6, 4, 10, 14, 12, 8, '#3a3a2a'); push(8, -4, 6, 10, 10, 9, '#2a3a4a'); push(0, 12, 0, 8, 4, 4, '#5fff8a'); break;
    case 'neonsign': push(0, 0, 0, 4, 4, 70, '#3a2a1a'); push(0, 0, 66, 4, 50, 24, '#120f16'); push(2.4, 0, 70, 0.4, 42, 4, p.col || '#ff3fa4'); push(2.4, 0, 80, 0.4, 30, 4, p.col2 || '#5fff8a'); break;
    case 'cityhome': zaunHouse(push, -10, 0, 90, 90, 60, mulberry32(21)); break;
    // ----- Weltraum -----
    case 'station': {
      const own = p.owned, lc = own ? '#5fd4ff' : '#552222', hull = '#8a929a', dark = '#5a626a';
      push(0, 0, 0, 120, 120, 50, hull); push(0, 0, 50, 90, 90, 30, dark); push(0, 0, 80, 40, 40, 40, hull); push(0, 0, 120, 10, 10, 50, '#c8d0d4'); push(0, 0, 170, 6, 6, 4, own ? '#5fff8a' : '#ff3b30');
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + (p.rot || 0); push(Math.cos(a) * 200, Math.sin(a) * 200, 10, 60, 30, 24, i % 2 ? hull : dark, a + Math.PI / 2); push(Math.cos(a) * 200, Math.sin(a) * 200, 34, 40, 20, 3, lc, a + Math.PI / 2); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + (p.rot || 0); push(Math.cos(a) * 110, Math.sin(a) * 110, 20, 160, 10, 10, dark, a); }
      for (const s of [-1, 1]) { push(0, s * 320, 20, 80, 150, 3, '#2a4a8a'); for (let i = -2; i <= 2; i++) push(0, s * 320 + i * 30, 23, 82, 1, 1, '#9fc8e8'); push(0, s * 250, 25, 6, 50, 6, dark); }
      push(80, 0, 10, 80, 30, 20, dark); push(124, 0, 10, 8, 40, 30, '#3a3f44'); push(128.6, 0, 18, 0.6, 30, 14, own ? '#5fff8a' : '#ffb020');
      if (!own) { push(30, -30, 50, 20, 20, 10, '#2a2a2a'); push(-40, 40, 20, 30, 10, 16, '#3a3330'); }
      break;
    }
    case 'stwall': { const len = p.len; push(0, 0, 0, len, 14, 64, '#5a626a'); push(0, 0, 64, len + 2, 16, 4, '#3a4048'); push(0, 7.4, 20, len, 0.6, 4, p.owned ? '#5fd4ff' : '#8a3a2a'); push(0, 7.4, 46, len, 0.6, 2, '#3a4048'); for (let i = 0; i < len / 48; i++) push(-len / 2 + 24 + i * 48, 7.6, 0, 6, 1, 64, '#4a5058'); break; }
    case 'console': push(0, 0, 0, 30, 18, 20, '#3a4048'); push(4, 0, 20, 22, 16, 4, '#2a2f36'); push(-4, 0, 20, 4, 16, 18, '#2a2f36'); push(-1.6, 0, 24, 0.6, 14, 12, p.owned ? '#5fd4ff' : '#ff5e3a'); for (let i = -1; i <= 1; i++) push(6, i * 5, 24.1, 3, 3, 0.6, ['#5fff8a', '#ffb020', '#ff3b30'][i + 1]); break;
    case 'core': push(0, 0, 0, 70, 70, 10, '#3a4048'); push(0, 0, 10, 40, 40, 8, '#2a2f36'); for (const [x, y] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) push(x, y, 10, 6, 6, 70, '#5a626a'); push(0, 0, 18, 24, 24, 50, p.owned ? '#5fd4ff' : '#ff5e3a'); push(0, 0, 68, 34, 34, 8, '#3a4048'); push(0, 0, 76, 10, 10, 14, '#5a626a'); break;
    case 'holo': push(0, 0, 0, 90, 90, 22, '#2a2f36'); push(0, 0, 22, 96, 96, 3, '#3a4048'); push(0, 0, 25, 80, 80, 1, '#1c3a4a'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; push(Math.cos(a) * 44, Math.sin(a) * 44, 22, 6, 6, 6, '#5fd4ff'); } break;
    case 'bunk': push(0, 0, 0, 50, 22, 10, '#4a5058'); push(0, 0, 10, 48, 20, 3, '#9fb4c8'); push(0, 0, 30, 50, 22, 3, '#4a5058'); push(0, 0, 33, 48, 20, 3, '#c0392b'); push(-24, 0, 0, 2, 22, 40, '#3a4048'); push(24, 0, 0, 2, 22, 40, '#3a4048'); break;
    case 'monolith': push(0, 0, 0, 40, 40, 6, '#5a4a2a'); push(0, 0, 6, 20, 12, 110, '#1e1a14'); push(10.2, 0, 30, 0.6, 6, 60, p.col || '#5fffc0'); push(0, 6.2, 50, 6, 0.6, 40, p.col || '#5fffc0'); push(0, 0, 116, 10, 10, 4, p.col || '#5fffc0'); break;
    case 'alienpod': push(0, 0, 0, 30, 30, 6, '#2a2050'); push(0, 0, 6, 22, 22, 22, p.col || '#7a5cff'); push(0, 0, 28, 14, 14, 8, hexShade(p.col || '#7a5cff', 1.3)); push(11.2, 0, 12, 0.6, 8, 10, '#fff27a'); break;
    case 'wreckship': push(0, 0, 0, 120, 40, 26, '#4a4f55'); push(40, 0, 10, 40, 30, 22, '#3a3f44'); push(-30, -40, 0, 50, 40, 6, '#3a3f44', 0.4); push(-20, 34, 0, 30, 20, 10, '#5a3b2a'); push(60, 0, 26, 20, 16, 10, '#2a3a3a'); push(-50, 0, 26, 30, 10, 30, '#3a3f44'); break;
    case 'shipdock': push(0, 0, 0, 140, 140, 4, '#3a4048'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; push(Math.cos(a) * 60, Math.sin(a) * 60, 4, 12, 4, 0.6, '#ffb020', a + Math.PI / 2); } for (const [x, y] of [[-66, -66], [66, -66], [-66, 66], [66, 66]]) push(x, y, 4, 6, 6, 6, '#5fd4ff'); break;
  }
  return out;
}

// ---------- Spielergebäude ----------
function wallColorSet(lvl) {
  return [null, { post: '#7a5230', plank: '#8b5e34', dark: '#5e3c20', top: '#a87a48' }, { post: '#7f827e', plank: '#9a9c98', dark: '#6d706c', top: '#b4b6b2' },
    { post: '#4f585e', plank: '#5d666d', dark: '#3a4046', top: '#e1b12c' }, { post: '#2f3d4f', plank: '#3d4f63', dark: '#25303d', top: '#5ff4ff' }][Math.min(lvl, 4)];
}
function buildingParts(b, t) {
  const out = [], L = b.level, Wd = b.w * TILE, Hd = b.h * TILE, push = (...a) => out.push(a);
  switch (b.type) {
    case 'wall': case 'gate': {
      const C = wallColorSet(L), nb = b.nb || {}, H = 30 + L * 4, isGate = b.type === 'gate';
      if (!isGate) { push(0, 0, 0, 11, 11, H + 8, C.post); push(0, 0, H + 8, 7, 7, 5, C.top); }
      const seg = (dx, dy) => {
        const ax = dx !== 0, cx = dx * 12.5, cy = dy * 12.5; if (isGate) return;
        push(cx, cy, 0, ax ? 25 : 8, ax ? 8 : 25, H, C.plank); push(cx, cy, H * 0.3, ax ? 25 : 9, ax ? 9 : 25, 2.5, C.dark); push(cx, cy, H * 0.7, ax ? 25 : 9, ax ? 9 : 25, 2.5, C.dark);
        if (L === 1) for (let i = 0; i < 3; i++) push(cx + (ax ? (i - 1) * 7 : 0), cy + (ax ? 0 : (i - 1) * 7), H, 3, 3, 5, C.top);
        else if (L >= 3) for (let i = 0; i < 2; i++) push(cx + (ax ? (i - 0.5) * 10 : 0), cy + (ax ? 0 : (i - 0.5) * 10), H, 2, 2, 6, '#c8d0d4');
        else push(cx, cy, H, ax ? 25 : 10, ax ? 10 : 25, 3, C.top);
      };
      if (nb.e) seg(1, 0); if (nb.w) seg(-1, 0); if (nb.s) seg(0, 1); if (nb.n) seg(0, -1);
      if (!isGate && !nb.e && !nb.w && !nb.s && !nb.n) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; push(Math.cos(a) * 9, Math.sin(a) * 9, 0, 5, 5, H - 4, C.plank); }
      if (isGate) {
        const ax = (nb.e || nb.w) || !(nb.n || nb.s), open = b.open || 0, p1 = ax ? [0, -19] : [-19, 0], p2 = ax ? [0, 19] : [19, 0];
        push(p1[0], p1[1], 0, 10, 10, H + 14, C.post); push(p2[0], p2[1], 0, 10, 10, H + 14, C.post); push(0, 0, H + 10, ax ? 10 : 48, ax ? 48 : 10, 5, C.dark);
        const dh = Math.max(2, (H + 4) * (1 - open)); push(0, 0, (H + 4) * open * 0.9, ax ? 6 : 30, ax ? 30 : 6, dh, C.plank);
      }
      break;
    }
    case 'fire': {
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; push(Math.cos(a) * 13, Math.sin(a) * 13, 0, 7, 7, 5, i % 2 ? '#7d817e' : '#959995'); }
      push(0, 0, 1, 22, 5, 5, '#6b4423', 0.6); push(0, 0, 3, 22, 5, 5, '#5a3b20', -0.7);
      const f = Math.sin(t * 13) * 2, g = Math.cos(t * 9) * 2; push(0, 0, 6, 12, 12, 10 + f, '#ff7b1c'); push(1, -1, 10, 8, 8, 10 + g, '#ffb52e'); push(-1, 1, 15, 4, 4, 8 + f, '#fff07a');
      if (L >= 2) { push(0, -16, 0, 3, 3, 26, '#4a3020'); push(0, 16, 0, 3, 3, 26, '#4a3020'); push(0, 0, 26, 2, 34, 2, '#4a3020'); push(0, 0, 18, 8, 8, 7, '#2a2a2a'); }
      break;
    }
    case 'hq': {
      const wallC = L >= 3 ? '#5d666d' : L === 2 ? '#9a8f7c' : '#a0784c', trim = L >= 3 ? '#e1b12c' : '#6b4a2b', h = 46, s = Wd / 2 - 3;
      push(0, 0, 0, Wd - 2, Hd - 2, 3, '#7a6448'); push(-s, 0, 3, 6, Hd - 2, h, wallC); push(0, -s, 3, Wd - 2, 6, h, wallC); push(-s, 0, 3 + h, 8, Hd, 4, trim); push(0, -s, 3 + h, Wd, 8, 4, trim);
      push(-s + 3.2, -30, 20, 0.6, 22, 16, '#bfe9ff'); push(-s + 3.2, 34, 20, 0.6, 22, 16, '#bfe9ff');
      push(s, -42, 3, 6, 52, 14, wallC); push(s, 46, 3, 6, 44, 14, wallC); push(-20, s, 3, 92, 6, 14, wallC); push(52, s, 3, 26, 6, 14, wallC);
      push(s, -42, 17, 7, 53, 3, trim); push(s, 46, 17, 7, 45, 3, trim); push(-20, s, 17, 93, 7, 3, trim); push(52, s, 17, 27, 7, 3, trim);
      push(-52, -18, 3, 16, 44, 14, '#6b4f36'); push(-52, -18, 17, 17, 45, 2, '#8b6b4a'); push(-58, -26, 19, 3, 20, 13, '#1d1f22'); push(-56.4, -26, 21, 0.6, 17, 9, (Math.floor(t * 2) % 2) ? '#4ff7ff' : '#38d8f0');
      push(-58, -4, 19, 3, 12, 9, '#1d1f22'); push(-56.4, -4, 20.5, 0.6, 10, 6, '#7dff8a'); push(-34, -20, 3, 10, 10, 10, '#2f3542'); push(-39, -20, 13, 2.5, 10, 13, '#2f3542');
      push(26, -50, 3, 44, 20, 9, '#5e4b34'); push(26, -50, 12, 42, 18, 3, '#6a8caf'); push(-60, 34, 8, 4, 36, 30, '#5b3a22'); push(30, 20, 3, 16, 16, 14, '#8b5e34'); push(46, 6, 3, 10, 14, 34, '#6b4a2b'); push(40.6, 6, 8, 0.6, 8, 22, '#bfe9ff'); push(46, 6, 37, 12, 16, 3, '#8b6b4a'); push(40.4, 0, 20, 0.6, 2, 2, '#ffd84a'); push(10, 50, 3, 8, 8, 8, '#a0522d'); push(10, 50, 11, 12, 12, 10, '#3f8a3a');
      push(-60, -60, 49, 3, 3, 46 + L * 6, '#8a8a8a'); push(-60, -60, 95 + L * 6, 5, 5, 3, (Math.floor(t * 1.5) % 2) ? '#ff3b30' : '#661111');
      if (L >= 2) for (let i = -2; i <= 2; i++) { if (i === 0) continue; push(s + 10, i * 24, 0, 10, 20, 8, '#b5a27a'); push(i * 24, s + 10, 0, 20, 10, 8, '#b5a27a'); }
      if (L >= 3) { push(-60, 60, 49, 18, 18, 4, '#3a4046'); push(-60, 60, 53, 3, 22, 10, '#c8d0d4', t * 1.2); }
      if (L >= 4) { push(-s - 3.4, 0, 30, 0.6, Hd - 10, 2, '#5ff4ff'); push(0, -s - 3.4, 30, Wd - 10, 0.6, 2, '#5ff4ff'); }
      break;
    }
    case 'farm': {
      const g = b.grow || 0, half = Wd / 2 - 4; push(0, 0, 0, Wd - 6, Hd - 6, 2, '#5a3e26');
      for (let i = -half; i <= half; i += 22) { push(-half, i, 0, 3, 3, 12, '#7a5230'); push(half, i, 0, 3, 3, 12, '#7a5230'); push(i, -half, 0, 3, 3, 12, '#7a5230'); push(i, half, 0, 3, 3, 12, '#7a5230'); }
      const rows = 3 + Math.min(2, L - 1);
      for (let r = 0; r < rows; r++) { const y = -half + 10 + r * ((Hd - 28) / (rows - 1 || 1)); push(0, y, 2, Wd - 18, 7, 2, '#3e2a18'); for (let c = -2; c <= 2; c++) { push(c * 15, y, 4, 4, 4, 3 + g * 14, g >= 1 ? '#e2c044' : g > 0.6 ? '#9fcf4a' : '#5fae3e'); if (g >= 1 && (c + r) % 3 === 0) push(c * 15 + 4, y + 3, 4, 7, 7, 6, '#e67e22'); } }
      if (L >= 2) { push(half - 10, half - 10, 0, 3, 3, 30, '#7a5230'); push(half - 10, half - 10, 30, 7, 7, 7, '#e8d17a'); }
      break;
    }
    case 'lamp': { const on = b.powered !== false, hh = 58 + L * 10; push(0, 0, 0, 14, 14, 5, '#4a4f52'); push(0, 0, 5, 5, 5, hh - 5, '#5b6266'); for (const hs of (L >= 2 ? [-1, 1] : [0])) { push(4, hs * 7, hh - 2, 10, 9, 7, '#2d3236'); push(9.4, hs * 7, hh - 1, 0.8, 8, 5, on ? '#fffbd0' : '#555'); } break; }
    case 'turret': push(0, 0, 0, 34, 34, 8, '#5d666d'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; push(Math.cos(a) * 19, Math.sin(a) * 19, 0, 10, 8, 7, '#b5a27a', a); } push(0, 0, 8, 12, 12, 8, '#3c464d'); break;
    case 'storage': {
      push(0, 0, 0, Wd - 8, Hd - 8, 4, '#7a5230'); const n = 3 + Math.floor((b.fill || 0.3) * 6), spots = [[-22, -22], [0, -22], [22, -22], [-22, 0], [22, 0], [-22, 22], [0, 22], [22, 22], [0, 0]];
      for (let i = 0; i < n && i < spots.length; i++) { const [x, y] = spots[i]; if (i % 3 === 2) { push(x, y, 4, 14, 14, 20, '#2e5e8a'); push(x, y, 24, 14.4, 14.4, 2, '#24496b'); } else { push(x, y, 4, 18, 18, 16, '#8b5e34'); push(x, y, 20, 18.6, 18.6, 2, '#6b4423'); } }
      break;
    }
    case 'generator': push(0, 0, 0, Wd - 10, Hd - 10, 4, '#4a4f52'); push(-6, 0, 4, 56, 30, 24, '#d4a017'); push(-6, 0, 28, 50, 26, 3, '#b8860b'); push(21, 0, 8, 1, 22, 14, '#2d2d2d'); push(-26, 8, 28, 5, 5, 18, '#5b6266'); push(-10, -15.8, 19, 3, 0.4, 3, (Math.floor(t * 3) % 2 && b.powered !== false) ? '#4dff6a' : '#1a5a22'); if (L >= 2) push(14, 12, 4, 12, 10, 18, '#c0392b'); break;
    case 'garage': {
      const hw = Wd / 2 - 4, hh = Hd / 2 - 4, roofZ = 56; push(0, 0, 0, Wd - 4, Hd - 4, 2, '#55595c');
      for (const [x, y] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [-hw, 0], [hw, 0]]) push(x, y, 0, 7, 7, roofZ, '#6b7378');
      push(-hw, 0, roofZ, 8, Hd, 4, '#4a5257'); push(hw, 0, roofZ, 8, Hd, 4, '#4a5257'); push(0, -hh, roofZ, Wd, 8, 4, '#4a5257'); for (let i = -2; i <= 2; i++) push(0, i * 26, roofZ, Wd - 4, 3, 3, '#4a5257');
      push(-hw + 3, 0, 4, 4, Hd - 20, 30, '#7a5230'); push(hw - 12, hh - 14, 0, 14, 14, 15, '#1b1b1b'); push(hw - 12, -hh + 14, 0, 12, 12, 18, '#c0392b'); push(0, 0, 2, 20, 40, 3, '#e1b12c'); break;
    }
    case 'helipad': {
      push(0, 0, 0, Wd - 4, Hd - 4, 4, L >= 3 ? '#4d5960' : '#6d6f6c'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; push(Math.cos(a) * 50, Math.sin(a) * 50, 4, 14, 5, 0.6, '#e1b12c', a + Math.PI / 2); }
      push(0, -13, 4, 40, 6, 0.6, '#f2f2f2', Math.PI / 2); push(0, 13, 4, 40, 6, 0.6, '#f2f2f2', Math.PI / 2); push(0, 0, 4, 6, 24, 0.6, '#f2f2f2', Math.PI / 2);
      const s = Wd / 2 - 6; for (const [x, y] of [[-s, -s], [s, -s], [-s, s], [s, s]]) { push(x, y, 0, 6, 6, 8, '#3a3f42'); push(x, y, 8, 5, 5, 3, (Math.floor(t * 2 + x) % 2) ? '#ff3b30' : '#4dff6a'); }
      push(-s + 6, s - 8, 0, 14, 14, 22, '#c0392b'); push(s - 6, -s + 20, 0, 4, 4, 56, '#9aa6aa'); push(s - 6, -s + 20, 50, 2, 22, 10, '#ff9a3c', Math.sin(t * 2) * 0.4);
      if (L >= 2) { push(-s + 8, -s + 22, 0, 18, 24, 26, '#3a4046'); push(-s + 17.4, -s + 22, 6, 0.6, 18, 14, '#7dff8a'); }
      if (L >= 3) { push(0, -s + 2, 0, 80, 4, 30, '#5d666d'); push(0, -s + 2, 30, 84, 6, 4, '#e1b12c'); }
      break;
    }
    case 'beacon': { push(0, 0, 0, 34, 34, 8, '#5d666d'); push(0, 0, 8, 22, 22, 6, '#3a3a4a'); const pu = Math.sin(t * 3) * 2; push(0, 0, 14, 10, 10, 40 + L * 8, '#c77dff'); push(6, 4, 12, 6, 6, 24, '#e0aaff'); push(-6, -4, 12, 6, 6, 28, '#9d4edd'); push(0, 0, 54 + L * 8 + pu, 6, 6, 6, '#f3d9ff'); break; }
  }
  return out;
}
function turretHeadParts(b) {
  const out = [], L = b.level, rc = b.flash > 0 ? -3 : 0;
  out.push([0, 0, 16, 18, 16, 11, '#46525a']); out.push([-6, 0, 20, 8, 14, 9, '#3a444b']); out.push([3, 0, 27, 10, 10, 3, '#2d3439']);
  if (L >= 2) { out.push([16 + rc, -3.5, 20, 22, 3, 3, '#1b1e20']); out.push([16 + rc, 3.5, 20, 22, 3, 3, '#1b1e20']); } else out.push([16 + rc, 0, 20, 24, 3.4, 3.4, '#1b1e20']);
  if (L >= 3) out.push([0, 0, 30, 6, 6, 6, '#e1b12c']); out.push([8.6, -4, 22, 0.6, 3, 3, b.powered === false ? '#444' : '#ff4d4d']);
  return out;
}
