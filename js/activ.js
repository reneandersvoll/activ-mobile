'use strict';
// ============================================================
// ACTIV · activ.js – komplettes Spiel in einer Datei
// (zusammengeführt aus: core.js, models.js, world.js, game.js, engine.js, city.js, addons.js, features.js, fix.js, v18.js, v18b.js, v18c.js + mobile.js)
// ============================================================
const ACTIV_MOBILE = document.documentElement.dataset.mobile === '1';

// ===================================================== core.js =====================================================

// ===== ACTIV · core.js (zusammengeführt aus: core.js, data.js, data2.js) =====

// ----------------------------- core.js -----------------------------

// ===================== CORE: Mathe, Renderer, Audio, Input =====================
const TILE = 48;
let MAP = 128, WORLD = TILE * MAP;
function setDims(n) { MAP = n; WORLD = TILE * n; }
const IX = 0.72, IY = 0.40, IZ = 0.92;

const R = (a, b) => a + Math.random() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- Projektion ----------
const VIEW = { cx: 0, cy: 0, ox: 0, oy: 0, zoom: 1 };
let G = null;
function P(x, y, z) { const dx = x - VIEW.cx, dy = y - VIEW.cy, k = VIEW.zoom; return { x: VIEW.ox + (dx - dy) * IX * k, y: VIEW.oy + ((dx + dy) * IY - (z || 0) * IZ) * k }; }
function screenToWorld(sx, sy) { const a = (sx - VIEW.ox) / VIEW.zoom / IX, b = (sy - VIEW.oy) / VIEW.zoom / IY; return { x: VIEW.cx + (a + b) / 2, y: VIEW.cy + (b - a) / 2 }; }
function onScreen(x, y, m) { const p = P(x, y, 0); m = (m || 120) * Math.max(1, VIEW.zoom); return p.x > -m && p.x < innerWidth + m && p.y > -m * 1.6 && p.y < innerHeight + m * 3; }

// ---------- Farben ----------
const _cc = new Map();
function shade(col, f) {
  const key = col + f; let v = _cc.get(key); if (v) return v;
  const n = parseInt(col.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f > 1) { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; } else { r *= f; g *= f; b *= f; }
  v = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; _cc.set(key, v); return v;
}
function hexShade(col, f) {
  const n = parseInt(col.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f > 1) { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; } else { r *= f; g *= f; b *= f; }
  const h = x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0'); return '#' + h(r) + h(g) + h(b);
}
function hsl2hex(h, s, l) {
  s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = x => Math.round(x * 255).toString(16).padStart(2, '0'); return '#' + to(f(0)) + to(f(8)) + to(f(4));
}
function hexToRgbStr(h) { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }

// ---------- Box-Renderer ----------
const _bx = [0, 0, 0, 0], _by = [0, 0, 0, 0], _ty = [0, 0, 0, 0];
const NLX = [0, 1, 0, -1], NLY = [-1, 0, 1, 0];
let OUTLINE = true;
function obox(x, y, z, w, d, h, ang, col) {
  const c = Math.cos(ang), s = Math.sin(ang), hw = w / 2, hd = d / 2, k = VIEW.zoom;
  const LX = [-hw, hw, hw, -hw], LY = [-hd, -hd, hd, hd];
  for (let i = 0; i < 4; i++) {
    const wx = x + LX[i] * c - LY[i] * s, wy = y + LX[i] * s + LY[i] * c, dx = wx - VIEW.cx, dy = wy - VIEW.cy;
    _bx[i] = VIEW.ox + (dx - dy) * IX * k; const base = VIEW.oy + (dx + dy) * IY * k;
    _by[i] = base - z * IZ * k; _ty[i] = base - (z + h) * IZ * k;
  }
  if (h > 0) for (let i = 0; i < 4; i++) {
    const nx = NLX[i] * c - NLY[i] * s, ny = NLX[i] * s + NLY[i] * c;
    if (nx + ny <= 0.01) continue;
    const j = (i + 1) & 3, f = Math.round((0.72 + 0.13 * (nx - ny)) * 20) / 20;
    G.beginPath(); G.moveTo(_bx[i], _by[i]); G.lineTo(_bx[j], _by[j]); G.lineTo(_bx[j], _ty[j]); G.lineTo(_bx[i], _ty[i]); G.closePath();
    G.fillStyle = shade(col, f); G.fill(); if (OUTLINE) G.stroke();
  }
  G.beginPath(); G.moveTo(_bx[0], _ty[0]); G.lineTo(_bx[1], _ty[1]); G.lineTo(_bx[2], _ty[2]); G.lineTo(_bx[3], _ty[3]); G.closePath();
  G.fillStyle = shade(col, 1.12); G.fill(); if (OUTLINE) G.stroke();
}
function isoEllipse(x, y, z, r, fill) { const p = P(x, y, z), k = VIEW.zoom; G.beginPath(); G.ellipse(p.x, p.y, r * IX * 1.414 * k, r * IY * 1.414 * k, 0, 0, Math.PI * 2); G.fillStyle = fill; G.fill(); }
function tileDiamond(gx, gy, w, h) {
  const a = P(gx * TILE, gy * TILE, 0), b = P((gx + w) * TILE, gy * TILE, 0), c = P((gx + w) * TILE, (gy + h) * TILE, 0), d = P(gx * TILE, (gy + h) * TILE, 0);
  G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(b.x, b.y); G.lineTo(c.x, c.y); G.lineTo(d.x, d.y); G.closePath();
}

// ---------- Audio ----------
const SFX = {
  ctx: null, vol: 0.5, master: null,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination); } catch (e) { this.ctx = null; } },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  tone(f, dur, type, vol, slide, delay) {
    if (!this.ctx) return; const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq, delay) {
    if (!this.ctx) return; const t = this.ctx.currentTime + (delay || 0), len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf; const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = freq || 2000;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.3; src.connect(fl); fl.connect(g); g.connect(this.master); src.start(t);
  },
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'rifle': this.noise(0.09, 0.28, 2600); this.tone(160, 0.08, 'square', 0.08, 0.5); break;
      case 'rifleS': this.noise(0.06, 0.12, 900); break;
      case 'sniper': this.noise(0.35, 0.5, 1800); this.tone(110, 0.3, 'sawtooth', 0.15, 0.3); break;
      case 'shotgun': this.noise(0.28, 0.45, 1200); this.tone(90, 0.2, 'sawtooth', 0.12, 0.4); break;
      case 'laser': this.tone(1400, 0.12, 'sawtooth', 0.06, 0.25); break;
      case 'hit': this.tone(1300, 0.04, 'square', 0.06); break;
      case 'kill': this.tone(700, 0.08, 'square', 0.09, 1.8); this.tone(1400, 0.06, 'triangle', 0.07, 1, 0.05); break;
      case 'chop': this.noise(0.07, 0.25, 900); this.tone(220, 0.06, 'triangle', 0.08, 0.7); break;
      case 'stone': this.noise(0.06, 0.25, 3500); this.tone(500, 0.05, 'square', 0.05, 0.6); break;
      case 'build': this.tone(330, 0.09, 'square', 0.1); this.tone(495, 0.12, 'square', 0.1, 1, 0.07); break;
      case 'upgrade': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.09, 1, i * 0.06)); this.noise(0.4, 0.12, 6000, 0.25); break;
      case 'level': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.14, 1, i * 0.08)); break;
      case 'pickup': this.tone(880, 0.07, 'triangle', 0.1); this.tone(1320, 0.09, 'triangle', 0.1, 1, 0.05); break;
      case 'click': this.tone(600, 0.04, 'square', 0.05); break;
      case 'deny': this.tone(180, 0.15, 'square', 0.1, 0.7); break;
      case 'boom': this.noise(0.8, 0.6, 500); this.tone(60, 0.6, 'sine', 0.3, 0.4); break;
      case 'night': this.tone(110, 1.6, 'sawtooth', 0.08, 0.6); this.tone(82, 1.8, 'sine', 0.15, 0.7, 0.2); break;
      case 'dawn': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.1, 1, i * 0.12)); break;
      case 'reload': this.tone(300, 0.05, 'square', 0.06); this.tone(420, 0.05, 'square', 0.06, 1, 0.25); break;
      case 'empty': this.tone(900, 0.03, 'square', 0.05); break;
      case 'streak': [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(f, 0.15, 'sawtooth', 0.08, 1, i * 0.05)); break;
      case 'crate': [659, 784, 988, 1318, 1568].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.1, 1, i * 0.07)); break;
      case 'car': this.tone(70, 0.4, 'sawtooth', 0.12, 1.6); break;
      case 'hurt': this.tone(150, 0.12, 'sawtooth', 0.12, 0.6); break;
      case 'zombie': this.tone(R(90, 140), 0.35, 'sawtooth', 0.04, 0.7); break;
      case 'rotor': this.noise(0.07, 0.16, 260); break;
      case 'coin': this.tone(1320, 0.06, 'square', 0.07); this.tone(1760, 0.12, 'square', 0.07, 1, 0.06); break;
      case 'cash': [988, 1318, 1568, 1976].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, 1, i * 0.05)); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.16, 'square', 0.09, 1, i * 0.08)); break;
      case 'jackpot': for (let i = 0; i < 14; i++) this.tone(800 + (i % 4) * 200, 0.1, 'square', 0.08, 1, i * 0.06); this.noise(0.6, 0.15, 7000, 0.4); break;
      case 'lose': this.tone(300, 0.25, 'sawtooth', 0.08, 0.5); this.tone(200, 0.35, 'sawtooth', 0.08, 0.5, 0.2); break;
      case 'tick': this.tone(1800, 0.02, 'square', 0.04); break;
      case 'card': this.noise(0.05, 0.15, 5000); break;
      case 'elevator': this.tone(220, 1.2, 'sine', 0.1, 2); this.tone(880, 0.3, 'triangle', 0.08, 1, 1.1); break;
      case 'door': this.noise(0.25, 0.2, 700); this.tone(140, 0.2, 'triangle', 0.08, 0.8); break;
      case 'warp': this.tone(80, 2.2, 'sawtooth', 0.12, 12); this.noise(2, 0.2, 3000, 0.4); [523, 784, 1046].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.08, 1, 1.8 + i * 0.1)); break;
      case 'dock': this.tone(200, 0.3, 'square', 0.1, 0.6); this.noise(0.3, 0.3, 500, 0.25); this.tone(880, 0.2, 'triangle', 0.08, 1, 0.5); break;
      case 'holo': this.tone(1200, 0.08, 'sine', 0.06, 1.5); this.tone(1800, 0.1, 'sine', 0.04, 1, 0.05); break;
      case 'thrust': this.noise(0.12, 0.08, 400); break;
    }
  }
};

// ---------- Input ----------
const KEYS = {};
const MOUSE = { x: innerWidth / 2, y: innerHeight / 2, down: false, right: false };
;

// ----------------------------- data.js -----------------------------

// ===================== DATEN =====================
const RES = {
  wood:    { n: 'Holz',        s: 'HOLZ',    ic: '🪵', col: '#ffcf7a', cap: true },
  stone:   { n: 'Stein',       s: 'STEIN',   ic: '🪨', col: '#d6e0e4', cap: true },
  scrap:   { n: 'Schrott',     s: 'SCHROTT', ic: '⚙', col: '#ffa64d', cap: true },
  food:    { n: 'Nahrung',     s: 'ESSEN',   ic: '🍖', col: '#9cff6a' },
  ammo:    { n: 'Munition',    s: 'MUNI',    ic: '▰', col: '#ffe066' },
  meds:    { n: 'Medikit',     s: 'MEDS',    ic: '✚', col: '#ff7a7a' },
  grenades:{ n: 'Granate',     s: 'GRANATE', ic: '●', col: '#a6ff7a' },
  fuel:    { n: 'Sprit',       s: 'SPRIT',   ic: '⛽', col: '#7ad7ff' },
  elec:    { n: 'Elektronik',  s: 'ELEKTRO', ic: '🔌', col: '#5ff4ff', rare: true },
  mil:     { n: 'Militärteile', s: 'MILITÄR', ic: '🎖', col: '#b5c46a', rare: true },
  crystal: { n: 'Wurzelkristall', s: 'KRISTALL', ic: '💎', col: '#d68cff', rare: true },
  cells:   { n: 'Brennstoffzelle', s: 'ZELLEN', ic: '🔋', col: '#ffb020', rare: true },
  titan:   { n: 'Titanerz',    s: 'TITAN',   ic: '◆', col: '#9fc8e8', rare: true },
  xeno:    { n: 'Xenobiomasse', s: 'XENO',   ic: '🧬', col: '#5fffc0', rare: true },
  plasma:  { n: 'Plasmakern',  s: 'PLASMA',  ic: '☄', col: '#ff5ef0', rare: true },
  void:    { n: 'Leerenkristall', s: 'LEERE', ic: '✧', col: '#8a7cff', rare: true },
  relic:   { n: 'Alien-Relikt', s: 'RELIKT', ic: '⚱', col: '#ffd27a', rare: true },
  money:   { n: 'Credits',     s: '₵',       ic: '₵', col: '#ffd84a' },
  frags:   { n: 'Funkfragment', s: 'FUNK',   ic: '📻', col: '#ff9a3c' },
};
const HUD_RES = ['wood', 'stone', 'scrap', 'food', 'ammo', 'meds', 'grenades', 'fuel', 'elec', 'mil', 'crystal', 'cells', 'titan', 'xeno', 'plasma', 'void', 'relic'];

const BUILD = {
  wall:      { n: 'Mauer',       icon: '▥', w: 1, h: 1, cost: { wood: 6 },               hp: 220, solid: 1, desc: 'Verbindet sich automatisch. Ziehen zum Bauen.' },
  gate:      { n: 'Tor',         icon: '⛩', w: 1, h: 1, cost: { wood: 12, stone: 4 },     hp: 260, solid: 2, desc: 'Du kommst durch, Monster nicht.' },
  fire:      { n: 'Lagerfeuer',  icon: '🔥', w: 1, h: 1, cost: { wood: 10, stone: 3 },     hp: 80, light: 150, desc: 'Billiges Licht ohne Strom.' },
  hq:        { n: 'HQ',          icon: '⌂', w: 3, h: 3, cost: { wood: 40, stone: 25 },    hp: 900, light: 360, power: 10, unique: true, solid: 1, desc: 'Basis mit Kommando-PC. Großes Licht.' },
  farm:      { n: 'Farm',        icon: '🌾', w: 2, h: 2, cost: { wood: 18, stone: 2 },     hp: 160, desc: 'Baut Nahrung an. Regen beschleunigt.' },
  lamp:      { n: 'Flutlicht',   icon: '💡', w: 1, h: 1, cost: { wood: 8, stone: 6, scrap: 4 }, hp: 120, light: 230, power: -2, solid: 1, desc: 'Lichtzone: hier spawnt nichts.' },
  turret:    { n: 'Geschützturm', icon: '⊕', w: 1, h: 1, cost: { wood: 15, stone: 15, scrap: 12 }, hp: 260, light: 60, power: -3, solid: 1, desc: 'Schießt automatisch. Braucht Strom.' },
  storage:   { n: 'Lager',       icon: '▣', w: 2, h: 2, cost: { wood: 30, stone: 10 },    hp: 300, solid: 1, desc: '+150 Kapazität für Holz/Stein/Schrott.' },
  generator: { n: 'Generator',   icon: '⚡', w: 2, h: 1, cost: { wood: 15, stone: 20, scrap: 10 }, hp: 280, light: 50, power: 12, solid: 1, desc: '+12 Strom.' },
  garage:    { n: 'Garage',      icon: '🔧', w: 2, h: 3, cost: { wood: 35, stone: 20, scrap: 15 }, hp: 400, desc: 'Schaltet Fahrzeug-Upgrades am PC frei.' },
  helipad:   { n: 'Landestation', icon: '🚁', w: 3, h: 3, cost: { stone: 40, scrap: 30, elec: 6 }, hp: 600, light: 140, unique: true, desc: 'Tankt & repariert Heli/Raumschiff. Startet Expeditionen.' },
  beacon:    { n: 'Kristallfeuer', icon: '💎', w: 1, h: 1, cost: { stone: 20, crystal: 5 }, hp: 320, light: 480, solid: 1, desc: 'Riesige Lichtzone ohne Strom.' },
};
const BUILD_ORDER = ['wall', 'gate', 'fire', 'hq', 'farm', 'lamp', 'turret', 'storage', 'generator', 'garage', 'helipad', 'beacon'];
const BUILD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'T'];
const LEVEL_NAMES = ['', 'Holz', 'Stein', 'Stahl', 'Titan'];
function upgradeCost(type, lvl) {
  const base = BUILD[type].cost, m = lvl + 0.5, c = {};
  c.wood = Math.ceil((base.wood || 5) * m); c.stone = Math.ceil(((base.stone || 0) + 6) * m);
  if (lvl >= 2) c.scrap = Math.ceil(8 * lvl);
  if (type === 'turret' && lvl >= 2) c.mil = 4 * lvl;
  if (type === 'generator' && lvl >= 2) c.cells = 3;
  if (type === 'hq' && lvl >= 2) c.elec = 4 * lvl;
  if ((type === 'wall' || type === 'gate') && lvl >= 3) c.titan = 2;
  if (type === 'helipad') { delete c.wood; c.elec = 8 * lvl; if (lvl >= 2) { c.mil = 12; c.cells = 4; } }
  if (type === 'beacon') { delete c.wood; c.crystal = 4 * lvl; }
  return c;
}

const WEAPONS = {
  axe:     { n: 'Axt',     icon: '🪓', melee: true, dmg: 34, rate: 0.42 },
  rifle:   { n: 'Sturmgewehr', icon: '▰', dmg: 22, rate: 0.11, mag: 30, reload: 1.6, spread: 0.05, speed: 1100, life: 0.75, pellets: 1, sfx: 'rifle' },
  shotgun: { n: 'Schrotflinte', icon: '▬', dmg: 15, rate: 0.75, mag: 6, reload: 2.1, spread: 0.32, speed: 950, life: 0.4, pellets: 7, sfx: 'shotgun' },
  sniper:  { n: 'Scharfschütze', icon: '━', dmg: 130, rate: 1.1, mag: 5, reload: 2.4, spread: 0.006, speed: 2000, life: 0.9, pellets: 1, pierce: 3, sfx: 'sniper', unlock: { mil: 14, elec: 6, scrap: 30 } },
  lmg:     { n: 'Maschinengewehr', icon: '▤', dmg: 19, rate: 0.065, mag: 100, reload: 3.6, spread: 0.09, speed: 1100, life: 0.7, pellets: 1, sfx: 'rifle', unlock: { mil: 22, cells: 2, scrap: 40 } },
  plasma:  { n: 'Plasmagewehr', icon: '☄', dmg: 48, rate: 0.22, mag: 24, reload: 1.8, spread: 0.02, speed: 900, life: 0.9, pellets: 1, pierce: 1, sfx: 'laser', energy: true, unlock: { plasma: 6, xeno: 6, titan: 10 } },
  medkit:  { n: 'Medikit',  icon: '✚', item: 'meds' },
  grenade: { n: 'Granate',  icon: '●', item: 'grenades' },
};
const GUNS = ['rifle', 'shotgun', 'sniper', 'lmg', 'plasma'];
let HOTBAR = ['axe', 'rifle', 'shotgun', 'medkit', 'grenade'];

const ATTACH = {
  scope:     { n: '4x Zielfernrohr',   icon: '◉', cost: { scrap: 15, stone: 10 }, d: '+30% Schaden, größere Reichweite' },
  suppressor:{ n: 'Schalldämpfer',     icon: '▭', cost: { scrap: 12, wood: 10 },  d: 'Schüsse locken kaum Monster an' },
  grip:      { n: 'Vertikalgriff',     icon: '┻', cost: { scrap: 10, wood: 12 },  d: '-40% Streuung, weniger Rückstoß' },
  extmag:    { n: 'Erweitertes Magazin', icon: '▮', cost: { scrap: 14, stone: 6 }, d: '+60% Magazingröße' },
  laser:     { n: 'Taktischer Laser',  icon: '✦', cost: { scrap: 10, stone: 10 }, d: 'Ziellaser, -30% Streuung' },
  stock:     { n: 'Taktischer Schaft', icon: '◣', cost: { scrap: 12, wood: 15 },  d: 'Volles Tempo beim Schießen' },
  drum:      { n: 'Schnellladung',     icon: '⟳', cost: { scrap: 18, stone: 12 }, d: '-45% Nachladezeit' },
  hollow:    { n: 'Hohlspitz-Munition', icon: '◆', cost: { mil: 6, scrap: 10 },   d: '+25% Schaden' },
  thermal:   { n: 'Wärmebild-Optik',   icon: '◎', cost: { elec: 6, crystal: 2 },  d: 'Monster nachts auf Minimap' },
  xenocore:  { n: 'Xeno-Kern',         icon: '🧬', cost: { xeno: 4, relic: 1 },    d: '+40% Schaden, Treffer heilen 1 HP' },
};
const CAMOS = [
  { id: 'std', n: 'Standard', kills: 0, col: '#2d3538' }, { id: 'forest', n: 'Waldtarn', kills: 25, col: '#3f6b3a' },
  { id: 'desert', n: 'Wüste', kills: 60, col: '#b49660' }, { id: 'urban', n: 'Urban', kills: 120, col: '#7b8790' },
  { id: 'gold', n: 'GOLD', kills: 220, col: '#e8b923' }, { id: 'diamond', n: 'DIAMANT', kills: 400, col: '#8de9ff', anim: true },
  { id: 'verdant', n: 'VERDANT', kills: 700, col: '#7dff5a', anim: true },
];
const PERKS = [
  { id: 'dmg', n: 'Scharfschütze', icon: '🎯', d: '+20% Waffenschaden' }, { id: 'hp', n: 'Zäh wie Wurzeln', icon: '❤', d: '+25 maximale Lebenspunkte' },
  { id: 'gather', n: 'Holzfäller', icon: '🪓', d: '+50% Ertrag bei Bäumen & Steinen' }, { id: 'speed', n: 'Sprinter', icon: '👟', d: '+12% Laufgeschwindigkeit' },
  { id: 'rate', n: 'Abzugsfinger', icon: '⚡', d: '+15% Feuerrate' }, { id: 'vamp', n: 'Lebensraub', icon: '🩸', d: 'Jeder Kill heilt 3 HP' },
  { id: 'turret', n: 'Ingenieur', icon: '🔧', d: '+35% Turmschaden' }, { id: 'loot', n: 'Plünderer', icon: '💰', d: 'Kisten & Hochhäuser geben doppelt so viel' },
  { id: 'ammo', n: 'Munitionsjäger', icon: '▰', d: 'Monster lassen öfter Munition fallen' }, { id: 'melee', n: 'Berserker', icon: '💢', d: '+60% Nahkampfschaden' },
  { id: 'hunger', n: 'Asket', icon: '🍖', d: 'Hunger sinkt 40% langsamer' }, { id: 'build', n: 'Baumeister', icon: '🏗', d: 'Gebäude kosten 20% weniger' },
  { id: 'haggle', n: 'Feilscher', icon: '₵', d: '+15% Verkaufspreise, -10% Einkauf' }, { id: 'pilot', n: 'Pilot', icon: '🚀', d: 'Fahrzeuge schneller & sparsamer' },
];
const CAR_UP = {
  engine:  { n: 'Motor', icon: '⚙', max: 3, cost: l => ({ scrap: 15 * l, stone: 8 * l }), d: '+Höchstgeschwindigkeit' },
  armor:   { n: 'Panzerung', icon: '🛡', max: 3, cost: l => ({ scrap: 18 * l, stone: 10 * l }), d: '+Fahrzeug-HP, Stahlplatten' },
  ram:     { n: 'Rammbock', icon: '▼', max: 1, cost: () => ({ scrap: 25, wood: 20 }), d: 'Doppelter Überfahrschaden' },
  lights:  { n: 'Flutlichtbalken', icon: '💡', max: 1, cost: () => ({ scrap: 20, stone: 10 }), d: 'Riesiger Lichtkegel = sichere Zone' },
  gun:     { n: 'Dachgeschütz', icon: '⊕', max: 1, cost: () => ({ scrap: 30, mil: 8 }), d: 'Automatisches MG auf dem Dach' },
  nitro:   { n: 'Nitro', icon: '🔥', max: 1, cost: () => ({ scrap: 20, cells: 2 }), d: 'SHIFT = Boost mit Flammen' },
};
const HELI_UP = {
  light:  { n: 'Suchscheinwerfer', icon: '💡', cost: { elec: 8, scrap: 20 }, d: 'Lichtkegel unter dem Heli = sichere Zone' },
  gun:    { n: 'Bordkanone', icon: '⊕', cost: { mil: 15, scrap: 30 }, d: 'Automatisches Doppel-MG' },
  armor:  { n: 'Panzerung', icon: '🛡', cost: { mil: 10, stone: 25 }, d: '+150 Heli-HP' },
  tank:   { n: 'Zusatztank', icon: '⛽', cost: { cells: 4, scrap: 15 }, d: 'Halber Spritverbrauch' },
  engine: { n: 'Turbine', icon: '⚙', cost: { elec: 6, cells: 2 }, d: '+40% Fluggeschwindigkeit' },
};

// ---------- Raumschiff ----------
const SHIP_PRICE = 40000;
const SHIP_UP = {
  hull:   { n: 'Titan-Panzerung', icon: '🛡', max: 3, cost: l => ({ titan: 6 * l, scrap: 30 * l }), d: '+120 Rumpf-HP pro Stufe' },
  laser:  { n: 'Pulslaser', icon: '✦', max: 3, cost: l => ({ elec: 6 * l, plasma: l > 1 ? 2 * l : 0, titan: 3 * l }), d: '+Kanonen, +Schaden' },
  shield: { n: 'Deflektorschild', icon: '◎', max: 2, cost: l => ({ void: 3 * l, elec: 8 }), d: 'Regenerierender Energieschild' },
  boost:  { n: 'Nachbrenner', icon: '🔥', max: 2, cost: l => ({ cells: 3 * l, titan: 4 * l }), d: '+35% Tempo, SHIFT = Boost' },
  mining: { n: 'Bergbaulaser', icon: '⛏', max: 1, cost: () => ({ titan: 8, elec: 6 }), d: 'Doppelter Ertrag beim Asteroidenabbau' },
  wings:  { n: 'Goldene Schwingen', icon: '✈', max: 1, cost: () => ({ relic: 2, titan: 6 }), d: 'Wendiger. Sieht absurd gut aus.' },
  cargo:  { n: 'Frachtmodul', icon: '▣', max: 1, cost: () => ({ titan: 10, scrap: 40 }), d: '+50% Ertrag aus Raumkisten' },
  tractor:{ n: 'Traktorstrahl', icon: '⇊', max: 1, cost: () => ({ void: 4, plasma: 3 }), d: 'Zieht Beute aus großer Entfernung an' },
};
const SHIP_PAINTS = [
  { id: 'white', n: 'Polarweiß', col: '#d8dde3', acc: '#3a6fb8', price: 0 }, { id: 'piltover', n: 'Piltover-Gold', col: '#efe3c8', acc: '#c9952a', price: 2500 },
  { id: 'zaun', n: 'Zaun-Chem', col: '#3a4a40', acc: '#5fff8a', price: 2500 }, { id: 'crimson', n: 'Karmesin', col: '#a3242c', acc: '#1c1c22', price: 4000 },
  { id: 'void', n: 'Leerenstrom', col: '#241c4a', acc: '#a58cff', price: 9000 }, { id: 'gold', n: 'Reines Gold', col: '#e8b923', acc: '#fff3c0', price: 20000 },
];
const STATION_UP = {
  engine: { n: 'Warp-Antrieb', icon: '🌀', max: 3, cost: l => ({ titan: 12 * l, plasma: 3 * (l - 1), void: 2 * (l - 1) }), d: '+1 Sprungreichweite' },
  armor:  { n: 'Hüllenverstärkung', icon: '🛡', max: 2, cost: l => ({ titan: 15 * l }), d: 'Weniger Enterkommandos' },
  lab:    { n: 'Xeno-Labor', icon: '🧬', max: 1, cost: () => ({ xeno: 8, elec: 10 }), d: 'Wandelt täglich Xenobiomasse in Credits' },
};
const CREW_ROLES = {
  pilot: { n: 'Pilot/in', icon: '🧑‍✈️', d: '+20% Schiffstempo' }, engineer: { n: 'Ingenieur/in', icon: '🔧', d: 'Schiff repariert sich langsam' },
  navigator: { n: 'Navigator/in', icon: '🧭', d: '+1 Sprungreichweite' }, medic: { n: 'Sanitäter/in', icon: '✚', d: 'Heilt dich auf Planeten' },
  gunner: { n: 'Schütze/in', icon: '🎯', d: '+25% Schiffsschaden' },
};
const CREW_FIRST = ['Mira', 'Taro', 'Jonas', 'Vex', 'Ilka', 'Bram', 'Sana', 'Odo', 'Lenka', 'Kip', 'Ruva', 'Hesh', 'Nova', 'Grit', 'Ada', 'Zed'];
const CREW_LAST = ['Kovač', 'Rostfeld', 'Ambrose', 'Vandermeer', 'Okafor', 'Lindqvist', 'Stahl', 'Moreau', 'Hex', 'Ferro', 'Klee', 'Varga'];
const PLANETS = [
  { id: 'earth', n: 'ERDE', sub: 'Die überwucherte Heimat', dist: 0, col: ['#3f8a3a', '#2e6fa8', '#e9f2f5'], res: null },
  { id: 'vyr', n: 'VYR-7', sub: 'Biolumineszente Pilzwelt', dist: 1, danger: 1, res: 'xeno', col: ['#2fd6b0', '#1c6f8a', '#a6ffe6'], ground: [170, 40, 22], dirt: [190, 35, 16], trees: ['shroom', 'shroom', 'shroomtall'], node: 'xenonode', dark: 0.4, light: '90,255,200', zskin: '#5fd6b0' },
  { id: 'korrax', n: 'KORRAX', sub: 'Vulkanwelt der Obsidiantürme', dist: 2, danger: 2, res: 'plasma', col: ['#ff6a2a', '#3a1a14', '#ffd27a'], ground: [10, 30, 16], dirt: [20, 60, 22], trees: ['lavaspire', 'obelisk'], node: 'plasmanode', dark: 0.3, light: '255,120,60', zskin: '#c0503a' },
  { id: 'nimbara', n: 'NIMBARA', sub: 'Kristallsteppe im ewigen Zwielicht', dist: 2, danger: 2, res: 'void', col: ['#8a7cff', '#2a2050', '#e6ddff'], ground: [255, 25, 24], dirt: [265, 30, 18], trees: ['crystaltree'], node: 'voidnode', dark: 0.5, light: '160,140,255', zskin: '#9a8cff' },
  { id: 'aurum', n: 'AURUM PRIME', sub: 'Ruinen der Alten', dist: 3, danger: 3, res: 'relic', col: ['#e8b923', '#7a5a14', '#fff3c0'], ground: [42, 40, 40], dirt: [38, 45, 30], trees: ['goldspire', 'obelisk'], node: 'relicnode', dark: 0.15, light: '255,220,120', zskin: '#d9b35a' },
];

const ZTYPES = {
  walker: { n: 'Wucherer', hp: 60, sp: 48, dmg: 10, sc: 1, skin: '#6f9a4c', xp: 10 },
  runner: { n: 'Sprinter', hp: 40, sp: 105, dmg: 8, sc: 0.9, skin: '#8bb35a', xp: 14 },
  brute:  { n: 'Koloss', hp: 320, sp: 34, dmg: 28, sc: 1.6, skin: '#557a3c', xp: 45, bldg: 2.5 },
  boss:   { n: 'WURZELKÖNIG', hp: 2600, sp: 40, dmg: 40, sc: 2.6, skin: '#4a6b2e', xp: 400, bldg: 3 },
  xeno:   { n: 'Xeno-Jäger', hp: 90, sp: 80, dmg: 14, sc: 1.05, skin: '#7a5cff', xp: 22, alien: true },
  xbrute: { n: 'Xeno-Behemoth', hp: 520, sp: 40, dmg: 34, sc: 1.8, skin: '#5a3cc0', xp: 80, alien: true },
  xdrone: { n: 'Kampfdrohne', hp: 70, sp: 150, dmg: 12, sc: 1, skin: '#3a4048', xp: 25, drone: true },
};
const MISSION_POOL = [
  { id: 'kill', n: 'Säuberung', d: n => `Erledige ${n} Monster`, goal: [15, 25, 40], stat: 'kills', reward: { scrap: 20, ammo: 60 } },
  { id: 'chop', n: 'Rodung', d: n => `Fälle ${n} Bäume`, goal: [6, 10, 15], stat: 'trees', reward: { stone: 25, scrap: 10 } },
  { id: 'build', n: 'Festungsbau', d: n => `Errichte ${n} Gebäude`, goal: [6, 10, 16], stat: 'built', reward: { wood: 40, scrap: 15 } },
  { id: 'crates', n: 'Plünderzug', d: n => `Öffne ${n} Kisten`, goal: [2, 4, 6], stat: 'crates', reward: { ammo: 80, meds: 2 } },
  { id: 'brute', n: 'Großwildjagd', d: n => `Erledige ${n} Kolosse`, goal: [1, 3, 5], stat: 'brutes', reward: { grenades: 3, scrap: 25 } },
  { id: 'tower', n: 'Hochhaus-Raid', d: n => `Durchsuche ${n} Etagen in Rosthafen`, goal: [3, 6, 10], stat: 'floors', reward: { elec: 3, scrap: 30 } },
  { id: 'night', n: 'Durchhalten', d: n => `Überlebe ${n} Nacht${n > 1 ? 'e' : ''}`, goal: [1, 2, 3], stat: 'nights', reward: { wood: 50, stone: 40, meds: 1 } },
];
const BIOMES = {
  military: { n: 'Militärbasis Echo', icon: '🎖', desc: 'Verlassene Kaserne. Bunker, Panzerwracks, Waffenkisten.', excl: 'mil', node: 'milcrate', trees: ['pine', 'oak'], treeN: 160, grass: [78, 22, 34], dirt: [38, 18, 42], dark: 0, zMix: { walker: 0.5, runner: 0.25, brute: 0.25 }, shirt: '#4b5d3a', props: ['bunker', 'tank', 'sandbag', 'sandbag', 'tower', 'container'] },
  swamp: { n: 'Verseuchter Sumpf', icon: '💎', desc: 'Giftiger Nebel, leuchtende Wurzelkristalle.', excl: 'crystal', node: 'crystal', trees: ['dead', 'jungle'], treeN: 340, grass: [150, 30, 20], dirt: [100, 20, 18], dark: 0.5, fog: true, zMix: { walker: 0.4, runner: 0.5, brute: 0.1 }, shirt: '#3a4a3a', props: ['hut', 'skull'] },
  desert: { n: 'Ölfeld Sahra', icon: '🔋', desc: 'Glühender Sand, Ölpumpen, Batteriedepots.', excl: 'cells', node: 'cellnode', trees: ['cactus'], treeN: 120, grass: [40, 52, 60], dirt: [30, 45, 50], dark: 0, zMix: { walker: 0.6, runner: 0.2, brute: 0.2 }, shirt: '#b49660', props: ['pump', 'pump', 'container', 'skull'] },
  lab: { n: 'Forschungslabor Nord', icon: '🔌', desc: 'Eis und Schnee. Serverschränke voller Elektronik.', excl: 'elec', node: 'server', trees: ['snowpine'], treeN: 240, grass: [205, 18, 86], dirt: [210, 12, 72], dark: 0.15, snow: true, zMix: { walker: 0.45, runner: 0.35, brute: 0.2 }, shirt: '#dfe6e9', props: ['labbox', 'antenna', 'container'] },
};

// ---------- Stadt Neu-Eden ----------
const RANKS = [
  { n: 'Fremder', rep: 0 }, { n: 'Einwohner', rep: 60, d: '60 Bekanntheit' }, { n: 'Bürger', rep: 200, apt: 1, d: '200 Bekanntheit + eine Wohnung' },
  { n: 'Angesehen', rep: 600, apt: 2, d: '600 Bekanntheit + Wohnung in der Oberstadt' },
  { n: 'Ratsmitglied', rep: 1500, money: 20000, biz: 1, d: '1500 Bekanntheit + eigenes Geschäft + 20.000₵ Spende' },
  { n: 'Bürgermeister', rep: 4000, money: 60000, apt: 4, biz: 1, election: true, d: '4000 Bekanntheit + Villa + Geschäft + Wahlkampf 60.000₵' },
];
const APTS = [
  { id: 'cellar', n: 'Kellerloch (Unterstadt)', price: 900, rent: 15, rep: 1, tier: 1, d: 'Feucht, laut, aber deins. Schlafen & Spawnpunkt.' },
  { id: 'flat', n: 'Stadtwohnung (Oberstadt)', price: 6000, rent: 60, rep: 3, tier: 2, d: 'Sauber, sicher, mit Ausblick.' },
  { id: 'pent', n: 'Penthouse', price: 24000, rent: 180, rep: 8, tier: 3, d: 'Dachterrasse über der Stadt. +10% XP.' },
  { id: 'sky', n: 'Himmelsloft mit Landeplattform', price: 45000, rent: 300, rep: 12, tier: 3, pad: true, d: 'Private Landeplattform. Voraussetzung für ein Raumschiff!' },
  { id: 'villa', n: 'Villa am Park', price: 70000, rent: 450, rep: 15, tier: 4, d: 'Das Zuhause eines Bürgermeisters.' },
];
const JOBS = {
  courier: { n: 'Kurier', icon: '📦', wage: [60, 140, 300], xpFrom: 'Lieferungen über die Zone', biz: 'Kurierdienst "Schneller Spross"', bizPrice: 22000, bizIncome: 1100 },
  guard: { n: 'Stadtwache', icon: '🛡', wage: [80, 170, 340], xpFrom: 'Monster-Kills (je 15 = 1 XP)', biz: 'Söldnerfirma "Eiserne Wurzel"', bizPrice: 30000, bizIncome: 1500 },
  mech: { n: 'Mechaniker', icon: '🔧', wage: [70, 150, 320], xpFrom: 'Reparaturen & Upgrades', biz: 'Werkstatt "Rostlöser"', bizPrice: 26000, bizIncome: 1300 },
  barkeep: { n: 'Barkeeper', icon: '🍸', wage: [50, 120, 260], xpFrom: 'Schichten in der Bar', biz: 'Bar "Zum Rostigen Anker"', bizPrice: 18000, bizIncome: 1000 },
};
const JOB_RANKS = [{ n: 'Lehrling', xp: 0 }, { n: 'Geselle', xp: 5 }, { n: 'Meister', xp: 14 }, { n: 'Besitzer', xp: 999 }];
const MARKET = {
  wood: { buy: 3, sell: 1 }, stone: { buy: 4, sell: 1.5 }, scrap: { buy: 9, sell: 3 }, food: { buy: 14, sell: 4 },
  ammo: { buy: 1.6, sell: 0.4, pack: 30 }, meds: { buy: 140, sell: 40 }, grenades: { buy: 170, sell: 50 }, fuel: { buy: 4, sell: 1.2, pack: 20 },
  elec: { buy: 130, sell: 45 }, mil: { buy: 170, sell: 60 }, crystal: { buy: 260, sell: 95 }, cells: { buy: 210, sell: 75 },
  titan: { buy: 320, sell: 120 }, xeno: { buy: 600, sell: 230 }, plasma: { buy: 750, sell: 290 }, void: { buy: 900, sell: 340 }, relic: { buy: 2400, sell: 950 },
};
const DRINKS = [
  { n: 'Rostiger Nagel', price: 25, d: '+20 HP', fx: 'heal' }, { n: 'Schimmer-Shot', price: 60, d: '3 Min: +25% Schaden', fx: 'dmg' },
  { n: 'Wurzelschnaps', price: 90, d: '3 Min: +15% Tempo', fx: 'speed' }, { n: 'Goldener Eden', price: 400, d: '+40 Bekanntheit', fx: 'rep' },
];
const RUMORS = [
  'In der alten Funkstation im Westen soll das Funkgerät noch funktionieren – mit etwas Elektronik.',
  'Die Hochhäuser in Rosthafen sind noch voller Elektronik. Aber jedes Geräusch weckt die Toten.',
  'Alle sieben Nächte färbt sich der Mond rot. Dann kommen doppelt so viele.',
  'Wer ein Himmelsloft besitzt, darf bei der Sternenschmiede ein Raumschiff kaufen.',
  'Da oben im Orbit treibt eine tote Station. Angeblich ist sie nicht ganz so tot.',
  'Die Raumfahrtbehörde heuert nur für Leute mit Rang an. Ohne Crew kein Sprung.',
  'Auf Aurum Prime liegen Relikte, die mehr wert sind als dein Leben.',
  'Im Royal-Casino oben lassen sie nur Angesehene rein. Hier unten nimmt jeder dein Geld.',
  'Wenn du nachts nicht bei deiner Basis bist, kommen sie trotzdem. Bau Türme.',
];
const CHAR_OPTS = {
  skin: ['#f1d0b0', '#e2b48c', '#c68b5e', '#8d5a3b', '#5e3b26', '#9fd28a'], hair: ['#2a1d14', '#5b3a1e', '#b07a3c', '#e8d17a', '#d0d0d0', '#c0392b', '#2e86de', '#8e44ad'],
  hairStyle: ['Kurz', 'Lang', 'Irokese', 'Glatze', 'Afro', 'Zopf'], hat: ['Keine', 'Cap', 'Helm', 'Bandana', 'Beanie', 'Pilotenhaube'],
  shirt: ['#3d5a80', '#5b7f3a', '#8a3a3a', '#d9a441', '#2d3436', '#e17055', '#6c5ce7', '#dfe6e9'], pants: ['#2d3436', '#4a3b2a', '#3b4d61', '#556b2f', '#7f8c8d'],
  pack: ['#6b4f2a', '#3f5a36', '#2d3436', '#a0522d', '#c0392b'], beard: ['Nein', 'Stoppeln', 'Vollbart'], build: ['Normal', 'Schmal', 'Breit'],
};
;

// ----------------------------- data2.js -----------------------------

// ===================== DATEN V10: Planeten-Industrie, Atmosphären, Fauna, Mauer-Geschütze =====================
Object.assign(BUILD, {
  autogun: { n: 'Selbstschussanlage', icon: '⁂', w: 1, h: 1, cost: { scrap: 18, stone: 10, ammo: 30 }, hp: 220, solid: 1, desc: 'Schnellfeuer, frisst Munition. Auf eine MAUER setzen = VERSCHMELZEN!' },
});
BUILD.turret.desc = 'Schießt automatisch (Strom). Auf eine MAUER setzen = VERSCHMELZEN zum Wehrturm!';
const MAIN_ORDER = BUILD_ORDER.concat(['autogun']);
// ---------- Planeten-Gebäude ----------
Object.assign(BUILD, {
  pcable:   { n: 'Stromkabel', icon: '〰', w: 1, h: 1, cost: { scrap: 2 }, hp: 60, planet: 1, desc: 'Leitet Strom. Alles was sich berührt, bildet ein Netz.' },
  solar:    { n: 'Solarfeld', icon: '☀', w: 2, h: 2, cost: { scrap: 12, elec: 2 }, hp: 160, planet: 1, gen: 'solar', solid: 1, desc: 'Strom aus Sternenlicht. Schwankt mit Tageszeit & Planet.' },
  wind:     { n: 'Windturbine', icon: '✇', w: 1, h: 1, cost: { scrap: 15, titan: 2 }, hp: 180, planet: 1, gen: 'wind', solid: 1, desc: 'Böen-abhängig. Auf stürmischen Welten stark.' },
  geo:      { n: 'Geothermie', icon: '♨', w: 2, h: 2, cost: { titan: 6, scrap: 10 }, hp: 260, planet: 1, gen: 'geo', solid: 1, desc: 'Konstanter Strom aus der Kruste. Auf Vulkanwelten doppelt.' },
  reactor:  { n: 'Plasma-Reaktor', icon: '☢', w: 3, h: 3, cost: { plasma: 4, titan: 12, elec: 6 }, hp: 500, planet: 1, gen: 'reactor', solid: 1, light: 220, desc: 'Gigantische 45 ⚡. Das Herz jeder Kolonie.' },
  battery:  { n: 'Akkubank', icon: '🔋', w: 1, h: 1, cost: { cells: 2, scrap: 6 }, hp: 160, planet: 1, store: 240, solid: 1, desc: 'Speichert Überschuss, puffert Engpässe.' },
  analyzer: { n: 'Atmo-Analysator', icon: '⚗', w: 1, h: 1, cost: { elec: 3, scrap: 8 }, hp: 140, planet: 1, use: 4, solid: 1, desc: 'MESSGERÄT: Bestimmt die Atmosphäre (toxisch/normal/alkalisch).' },
  scanner:  { n: 'Seismo-Scanner', icon: '📡', w: 2, h: 2, cost: { elec: 4, titan: 3 }, hp: 200, planet: 1, use: 6, solid: 1, desc: 'MESSGERÄT: Findet reiche Erzadern & zeigt sie auf der Karte.' },
  sensor:   { n: 'Bio-Sensor', icon: '👁', w: 1, h: 1, cost: { elec: 2, scrap: 6 }, hp: 120, planet: 1, use: 3, solid: 1, desc: 'MESSGERÄT: Zählt Lebensformen, warnt vor Angriffswellen.' },
  drill:    { n: 'Bohrturm', icon: '⛏', w: 2, h: 2, cost: { titan: 5, scrap: 15 }, hp: 260, planet: 1, use: 8, solid: 1, rot: 1, desc: 'Fördert Planeten-Rohstoff aufs Band (R = Richtung). Neben Erzader doppelt.' },
  belt:     { n: 'Fließband', icon: '➤', w: 1, h: 1, cost: { scrap: 3 }, hp: 80, planet: 1, use: 1, rot: 1, walk: 1, desc: 'Transportiert Güter (R = Richtung). Braucht Strom.' },
  smelter:  { n: 'Raffinerie', icon: '🏭', w: 2, h: 2, cost: { titan: 8, elec: 4 }, hp: 300, planet: 1, use: 10, solid: 1, rot: 1, desc: 'Veredelt: 1 Rohstoff rein → 2 raus.' },
  container:{ n: 'Frachtcontainer', icon: '📦', w: 2, h: 2, cost: { scrap: 20 }, hp: 320, planet: 1, solid: 1, desc: 'Endstation. Alles was ankommt, landet in deinem Inventar.' },
  scrubber: { n: 'Atmo-Filter', icon: '🫧', w: 2, h: 2, cost: { elec: 6, titan: 6, xeno: 2 }, hp: 300, planet: 1, use: 14, solid: 1, light: 280, power: -1, desc: 'Atembare Kuppel: schützt dich & Gebäude vor der Atmosphäre.' },
  pturret:  { n: 'Plasmaturm', icon: '✸', w: 1, h: 1, cost: { plasma: 2, titan: 4 }, hp: 300, planet: 1, use: 6, solid: 1, desc: 'Plasma-Geschütz. Zerlegt Alien-Fauna.' },
  plamp:    { n: 'Biolumen-Laterne', icon: '🍄', w: 1, h: 1, cost: { scrap: 6, xeno: 1 }, hp: 90, planet: 1, use: 2, solid: 1, light: 200, power: -1, desc: 'Licht = keine Spawns.' },
});
const PLANET_ORDER = ['wall', 'gate', 'pcable', 'solar', 'wind', 'geo', 'reactor', 'battery', 'analyzer', 'scanner', 'sensor', 'drill', 'belt', 'smelter', 'container', 'scrubber', 'pturret', 'plamp'];
const KEYSET = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'T', 'G', 'H', 'J', 'K', 'L', 'N'];
function curOrder() { return S && S.where === 'planet' ? PLANET_ORDER : MAIN_ORDER; }
// ---------- Atmosphären ----------
const ATMO = {
  toxisch:   { n: 'TOXISCH', icon: '☣', col: '#7dff5a', haze: '90,255,90', ph: [2.1, 4.6], dmg: 1.4, bdmg: 0, desc: 'Giftige Sporen in der Luft. Ohne Atmo-Filter verlierst du Leben.' },
  alkalisch: { n: 'ALKALISCH', icon: '⚗', col: '#9fe8ff', haze: '210,240,255', ph: [10.4, 13.2], dmg: 0.7, bdmg: 0.5, desc: 'Ätzende Laugennebel. Schadet dir UND zerfrisst Gebäude.' },
  normal:    { n: 'NORMAL', icon: '✓', col: '#ffd84a', haze: null, ph: [6.6, 7.6], dmg: 0, bdmg: 0, desc: 'Atembar! Solarfelder liefern +25%.' },
};
const PLANET_ENV = { vyr: { sun: 0.6, wind: 0.5, geo: 1 }, korrax: { sun: 0.9, wind: 0.7, geo: 2 }, nimbara: { sun: 0.35, wind: 1.7, geo: 0.8 }, aurum: { sun: 1.3, wind: 0.9, geo: 1 } };
const PLANET_FAUNA = { vyr: ['sporeling', 'sporeling', 'myco'], korrax: ['magmahound', 'magmahound', 'obsidian'], nimbara: ['wraith', 'shardspider', 'shardspider'], aurum: ['sentinel', 'sentinel', 'colossus'] };
Object.assign(ZTYPES, {
  sporeling:   { n: 'Sporling', hp: 50, sp: 72, dmg: 9, sc: 1, skin: '#5fd6b0', xp: 16, alien: true, creature: 'spore', spores: true },
  myco:        { n: 'Myzel-Golem', hp: 620, sp: 32, dmg: 30, sc: 1.7, skin: '#2fa890', xp: 90, alien: true, creature: 'golem', acc: '#a6ffe6', bldg: 2.5 },
  magmahound:  { n: 'Magmahund', hp: 85, sp: 135, dmg: 12, sc: 1, skin: '#3a1e18', xp: 24, alien: true, creature: 'hound', acc: '#ff6a2a' },
  obsidian:    { n: 'Obsidian-Titan', hp: 950, sp: 28, dmg: 42, sc: 1.9, skin: '#1e1418', xp: 120, alien: true, creature: 'golem', acc: '#ff6a2a', bldg: 3 },
  wraith:      { n: 'Kristall-Phantom', hp: 75, sp: 62, dmg: 13, sc: 1, skin: '#8a7cff', xp: 26, alien: true, creature: 'wraith', blink: true },
  shardspider: { n: 'Splitterspinne', hp: 120, sp: 98, dmg: 14, sc: 1, skin: '#3a3060', xp: 28, alien: true, creature: 'spider', acc: '#c8c0ff' },
  sentinel:    { n: 'Goldwächter', hp: 170, sp: 48, dmg: 14, sc: 1.1, skin: '#d9b35a', xp: 34, alien: true, creature: 'sentinel', ranged: true },
  colossus:    { n: 'Relikt-Koloss', hp: 1400, sp: 30, dmg: 46, sc: 2, skin: '#8a6a2a', xp: 160, alien: true, creature: 'golem', acc: '#5fffc0', bldg: 3 },
});
const LOBBY_NEWS = [
  { t: 'V10 · SPIEL-UPDATE', s: 'Konto-System, neue Lobby, Spind & Karriere.' },
  { t: 'PLANETEN-INDUSTRIE', s: 'Strom, Kabel, Fließbänder, Messgeräte & Atmosphären.' },
  { t: 'NEUE FAUNA', s: 'Jeder Planet hat jetzt eigene Monster.' },
  { t: 'MAUERN VERSCHMELZEN', s: 'Setz Geschütze direkt auf deine Mauern.' },
  { t: 'NEU-EDEN 2.0', s: 'Verschneite Prachtstraßen & die neue Unterstadt.' },
  { t: 'DIE ZONE', s: 'Wiesen, Dunkelwälder und tiefe Schluchten.' },
];
;
;

// ===================================================== models.js =====================================================

// ===== ACTIV · models.js (zusammengeführt aus: models.js, models2.js, models3.js, zones_models.js) =====

// ----------------------------- models.js -----------------------------

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
;

// ----------------------------- models2.js -----------------------------

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
;

// ----------------------------- models3.js -----------------------------

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
  // Erdgeschoss: Leuchtfront
  push(hw + 0.5, 0, 6, 0.8, d - 10, 20, '#3ff4ff'); push(hw + 0.9, 0, 9, 0.4, d - 16, 14, '#0e1a22'); push(0, hd + 0.5, 6, w - 10, 0.8, 20, neon); push(0, hd + 0.9, 9, w - 16, 0.4, 14, '#1a0e18');
  push(hw + 8, 0, 28, 16, d - 4, 2, '#3a3f4a'); push(hw + 15, 0, 26, 1, d - 4, 3, neon);
  // Fensterbänder
  for (let z = 34; z < H * 0.55; z += 14) { const lit = rng(); push(hw + 0.4, 0, z, 0.8, d - 8, 7, lit < 0.5 ? '#9ff4ff' : lit < 0.7 ? '#ffd27a' : '#2a3a4a'); push(0, hd + 0.4, z, w - 8, 0.8, 7, lit < 0.4 ? '#9ff4ff' : lit < 0.6 ? '#ff9ad8' : '#2a3a4a'); }
  // Aufgesetzter Turm
  const tw = w * 0.66, td = d * 0.66, z1 = 6 + H * 0.55;
  push(-hw * 0.12, -hd * 0.12, z1, tw, td, H * 0.45, hexShade(steel, 1.15));
  for (let z = z1 + 6; z < z1 + H * 0.45; z += 10) { push(-hw * 0.12 + tw / 2 + 0.4, -hd * 0.12, z, 0.8, td - 6, 5, rng() < 0.55 ? '#9ff4ff' : '#1a2a38'); push(-hw * 0.12, -hd * 0.12 + td / 2 + 0.4, z, tw - 6, 0.8, 5, rng() < 0.5 ? '#ff9ad8' : '#1a2a38'); }
  // senkrechte Neonkanten
  for (const [x, y] of [[hw, hd], [hw, -hd], [-hw, hd]]) push(x, y, 6, 2, 2, H * 0.55, neon);
  push(-hw * 0.12 + tw / 2, -hd * 0.12 + td / 2, z1, 2, 2, H * 0.45, n2);
  // Holo-Schild
  if (rng() < 0.7) { const yy = (rng() - 0.5) * (d - 30), zz = 40 + rng() * H * 0.3; push(hw + 4, yy, zz, 3, 3, 3, '#3a3f4a'); push(hw + 8, yy, zz - 10, 1, 26, 40, '#0a0c12'); push(hw + 8.8, yy, zz - 6, 0.4, 22, 32, rpick(rng, ['#ff3fa4', '#3ff4ff', '#b05cff'])); push(hw + 9.2, yy, zz + 4, 0.3, 14, 4, '#ffffff'); }
  // Dach: Antennen, Lüfter, Landeplattform
  const zt = z1 + H * 0.45;
  push(-hw * 0.12, -hd * 0.12, zt, tw + 2, td + 2, 3, '#14161c');
  if (rng() < 0.6) { push(-hw * 0.12, -hd * 0.12, zt + 3, 3, 3, 40, '#5b6266'); push(-hw * 0.12, -hd * 0.12, zt + 43, 5, 5, 3, '#ff3b30'); }
  else { push(-hw * 0.12, -hd * 0.12, zt + 3, tw * 0.7, td * 0.7, 2, '#2a2f3a'); push(-hw * 0.12, -hd * 0.12, zt + 5, tw * 0.5, 3, 0.6, neon); push(-hw * 0.12, -hd * 0.12, zt + 5, 3, td * 0.5, 0.6, neon); }
  push(hw * 0.3, hd * 0.3, z1, 14, 14, 10, '#3a3f4a'); push(hw * 0.3, hd * 0.3, z1 + 10, 10, 10, 2, '#1a1a1a');
  // Rohre / Kabel
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
      // ---------- Altstadt ----------
      case 'jhouse': {
        const rng = mulberry32(p.seed || 3), w = p.w || 90, d = p.d || 90, H = p.H || 80, hw = w / 2, hd = d / 2, wall = p.col || '#e8dcc0', roof = p.roof || '#6a3a2a', beam = '#4a2c1a', lit = ['#ffd27a', '#ffc060', '#ffe2a0'];
        push(0, 0, 0, w + 2, d + 2, 6, '#5a4a3a');
        const tiers = p.style === 'pagoda' ? 3 : p.style === 'block' ? 1 : 2, th = (H - 10) / tiers;
        for (let k = 0; k < tiers; k++) {
          const s = 1 - k * 0.16, ww = w * s, dd = d * s, z = 6 + k * th, hh = th - 12;
          const wc = p.style === 'block' ? rpick(rng, ['#d9c8a4', '#c8b08a', '#e8dcc0', '#b8a07a']) : wall;
          push(0, 0, z, ww, dd, hh, wc);
          // Fachwerk/Pfosten
          for (let i = 0; i <= 3; i++) { push(ww / 2 + 0.5, -dd / 2 + i * dd / 3, z, 1.2, 2.4, hh, beam); push(-ww / 2 + i * ww / 3, dd / 2 + 0.5, z, 2.4, 1.2, hh, beam); }
          // Fenster (warm leuchtend, Sprossen)
          const rows = Math.max(1, Math.floor(hh / 16));
          for (let r = 0; r < rows; r++) { const zz = z + 5 + r * 16; for (let i = 0; i < Math.floor(dd / 16); i++) { const yy = -dd / 2 + 9 + i * 16; push(ww / 2 + 0.4, yy, zz, 0.8, 10, 10, rng() < 0.75 ? rpick(rng, lit) : '#3a2a1a'); push(ww / 2 + 0.9, yy, zz + 4.5, 0.4, 10, 1, beam); } for (let i = 0; i < Math.floor(ww / 16); i++) { const xx = -ww / 2 + 9 + i * 16; push(xx, dd / 2 + 0.4, zz, 10, 0.8, 10, rng() < 0.75 ? rpick(rng, lit) : '#3a2a1a'); push(xx, dd / 2 + 0.9, zz + 4.5, 10, 0.4, 1, beam); } }
          // umlaufender Balkon mit Geländer
          if (k > 0 || p.style === 'pagoda' || (tiers > 1 && rng() < 0.6)) { push(ww / 2 + 4, 0, z - 1, 8, dd + 4, 2, '#6a4a2a'); push(ww / 2 + 7.6, 0, z + 1, 0.8, dd + 4, 6, '#8a2a1a'); push(0, dd / 2 + 4, z - 1, ww + 8, 8, 2, '#6a4a2a'); push(0, dd / 2 + 7.6, z + 1, ww + 8, 0.8, 6, '#8a2a1a'); }
          // geschwungenes Dach (gestuft, mit Überstand)
          const rz = z + hh;
          push(0, 0, rz, ww + 18, dd + 18, 3, roof); push(0, 0, rz + 3, ww + 10, dd + 10, 4, hexShade(roof, 1.12)); push(0, 0, rz + 7, ww * 0.7, dd * 0.7, 5, roof);
          for (const [x, y] of [[ww / 2 + 9, dd / 2 + 9], [ww / 2 + 9, -dd / 2 - 9], [-ww / 2 - 9, dd / 2 + 9]]) push(x, y, rz + 2, 4, 4, 4, hexShade(roof, 0.7));
          if (k === tiers - 1) { push(0, 0, rz + 12, ww * 0.45, 4, 6, hexShade(roof, 0.85)); if (p.style === 'pagoda') { push(0, 0, rz + 18, 3, 3, 22, '#c9952a'); push(0, 0, rz + 40, 6, 6, 4, '#c9952a'); } }
        }
        // Erdgeschoss-Laden: Noren-Vorhang, Laterne, Schild
        if (rng() < 0.7) { push(hw + 1, 0, 8, 1, Math.min(d - 12, 30), 18, '#ffb860'); push(hw + 2, 0, 20, 1, Math.min(d - 10, 34), 8, rpick(rng, ['#2a3a5a', '#8a2a2a', '#3e6a4a'])); push(hw + 6, d / 4, 18, 6, 6, 9, '#e8402a'); push(hw + 6, d / 4, 27, 4, 4, 1.4, '#2a1a10'); }
        if (rng() < 0.55) { const yy = (rng() - 0.5) * (d - 20); push(hw + 5, yy, 30, 2, 10, 34, '#efe3c8'); push(hw + 6.2, yy, 34, 0.4, 7, 26, '#2a1a10'); for (let i = 0; i < 4; i++) push(hw + 6.5, yy, 36 + i * 6, 0.3, 5, 3, '#8a2a1a'); }
        if (rng() < 0.4) { push(-hw / 3, -hd / 3, H, 12, 12, 10, '#a0a8b0'); }
        if (p.style !== 'pagoda' && rng() < 0.35) { push(-hw + 6, hd + 6, 0, 10, 4, H * 0.6, '#5a3a22'); for (let z = 8; z < H * 0.6; z += 8) push(-hw + 6, hd + 7, z, 10, 6, 1.4, '#7a4a2a'); }
        return out;
      }
      case 'teahouse': {
        const rng = mulberry32(p.seed || 9);
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
      case 'powerpole': push(0, 0, 0, 5, 5, 130, '#5a4a3a'); push(0, 0, 118, 4, 50, 4, '#5a4a3a'); push(0, 0, 106, 4, 36, 3, '#5a4a3a'); for (const y of [-22, -8, 8, 22]) push(0, y, 122, 3, 3, 4, '#d0d0d0'); push(0, 0, 70, 12, 10, 14, '#6a6a6a'); push(0, 0, 0, 200, 0.6, 0.6, 'rgba' === 1 ? '' : '#1a1a1a'); return out;
      case 'headframe': { const H = 230; for (const [x, y] of [[-60, -40], [60, -40], [-60, 40], [60, 40]]) push(x * (1 - 0.0), y, 0, 6, 6, H * 0.7, '#b8602a'); for (let z = 30; z < H * 0.7; z += 36) { push(-60, 0, z, 4, 84, 4, '#c8702a'); push(60, 0, z, 4, 84, 4, '#c8702a'); push(0, -40, z, 124, 4, 4, '#c8702a'); push(0, 40, z, 124, 4, 4, '#c8702a'); } push(0, 0, H * 0.7, 130, 90, 6, '#9a4a20'); for (const s of [-1, 1]) { push(0, s * 26, H * 0.7 + 6, 4, 4, 50, '#c8702a'); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; push(Math.cos(a) * 34, s * 26, H * 0.7 + 56 + Math.sin(a) * 34, 8, 3, 3, '#7a3a1a', 0); } push(0, s * 26, H * 0.7 + 56, 6, 4, 6, '#2a2a2a'); } push(-80, 0, 0, 40, 60, 50, '#7a4a30'); push(-80, 0, 50, 46, 66, 5, '#5a2a22'); push(-59.4, 0, 14, 0.8, 30, 24, '#ffc060'); return out; }
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
;

// ----------------------------- zones_models.js -----------------------------

// ===================== MODELLE: Militärbasis & Steinbruch =====================
{
  const _rpZ = rockParts;
  rockParts = function (n) {
    const out = [], push = (...a) => out.push(a);
    switch (n.kind) {
      case 'ironvein': push(0, 0, 0, 34, 28, 16, '#7a7068'); push(-8, 6, 0, 18, 16, 26, '#857a70'); push(10, -6, 0, 14, 14, 12, '#6e655d'); push(17.2, -2, 4, 0.6, 10, 8, '#b5652a'); push(-8, 14.2, 6, 10, 0.6, 12, '#c4702e'); push(-17.2, 6, 10, 0.6, 8, 10, '#a85a24'); push(-8, 6, 26, 10, 8, 2, '#c4702e'); push(4, 2, 16, 6, 6, 3, '#d9884a'); return out;
      case 'coalvein': push(0, 0, 0, 32, 28, 12, '#4a4844'); push(-6, 4, 12, 16, 14, 10, '#232120'); push(8, -6, 6, 12, 12, 12, '#1a1918'); push(-10, -8, 0, 10, 10, 8, '#2c2a28'); push(-6, 4, 22, 8, 6, 3, '#3a3836'); push(8.2, -6, 12, 0.6, 4, 2, '#8a8a8a'); push(2, 10, 12, 4, 4, 2, '#5a5856'); return out;
      case 'coppervein': push(0, 0, 0, 32, 26, 18, '#6a6a66'); push(-6, 6, 18, 18, 14, 10, '#787874'); push(16.2, 0, 6, 0.6, 10, 8, '#3fd0a0'); push(0, 13.2, 8, 12, 0.6, 8, '#2fb88a'); push(-6, 6, 28, 8, 6, 3, '#5fffc0'); push(10, -6, 18, 6, 6, 4, '#c87a3a'); return out;
      case 'milwreck': push(0, 0, 0, 34, 22, 6, '#4b5d3a'); push(-6, 2, 6, 18, 14, 8, '#3e4e30'); push(8, -4, 6, 14, 8, 5, '#2a2a2a'); push(-12, -8, 0, 4, 16, 14, '#5a6a48', 0.6); push(12, 8, 0, 8, 8, 8, '#1c1c1c'); push(2, 0, 14, 10, 8, 3, '#d4c27a'); push(-4, 6, 14, 6, 4, 2, '#7a7f86'); return out;
    }
    return _rpZ(n);
  };
}
function jetParts(push, rng, broken, col) {
  const camo = [col, hexShade(col, 0.82), hexShade(col, 1.12)], burn = '#1c1a18';
  // Rumpf
  push(0, 0, 10, 70, 14, 12, camo[0]); push(38, 0, 11, 10, 11, 10, camo[1]); push(46, 0, 12, 8, 8, 7, '#3a3e42'); push(52, 0, 13, 6, 4, 4, '#2a2d30');
  push(24, 0, 22, 18, 9, 6, broken ? '#1a2228' : '#6ab0d0'); push(24, 0, 28, 14, 6, 2, '#2a3a44');
  push(-34, -4, 12, 10, 6, 8, '#2c2f33'); push(-34, 4, 12, 10, 6, 8, '#2c2f33'); push(-40, -4, 13, 3, 5, 6, '#141414'); push(-40, 4, 13, 3, 5, 6, '#141414');
  // Tragflächen (gepfeilt)
  push(-2, -22, 14, 26, 30, 2, camo[2], -0.35); if (!broken) push(-2, 22, 14, 26, 30, 2, camo[2], 0.35);
  push(-8, -36, 14, 12, 3, 4, '#d8d8d8'); push(4, -14, 10, 10, 3, 3, '#3a3e42');
  // Leitwerk
  push(-30, -5, 22, 14, 2, 18, camo[1], 0.1); push(-30, 5, 22, 14, 2, 18, camo[1], -0.1); push(-34, -12, 12, 12, 14, 2, camo[2]); push(-34, 12, 12, 12, 14, 2, camo[2]);
  push(-26, -5, 34, 4, 1, 3, '#c0392b');
  // Fahrwerk / Bruch
  if (!broken) { for (const [x, y] of [[30, 0], [-6, -8], [-6, 8]]) { push(x, y, 0, 3, 3, 10, '#2a2a2a'); push(x, y, 0, 6, 3, 6, '#151515'); } }
  else { push(0, 0, 0, 74, 18, 10, '#2a2a2a'); push(-2, 26, 0, 24, 26, 2, camo[2], 0.9); push(-2, 34, 0, 10, 10, 4, burn); push(18, -4, 22, 12, 10, 4, burn); }
  for (let k = 0; k < 5; k++) push(-30 + rng() * 60, (rng() - 0.5) * 12, 22 + rng() * 1, 6 + rng() * 6, 4 + rng() * 4, 1, burn);
  push(10, 7.2, 14, 8, 0.6, 5, '#e8e8e8'); push(10, 7.6, 15, 6, 0.4, 3, '#2a2a2a');
}
{
  const _ppZ = propParts;
  propParts = function (p) {
    const out = [], push = (...a) => out.push(a), k = p.kind, rng = mulberry32(p.seed || 1);
    switch (k) {
      case 'jetwreck': { const SC = 1.75, sp = (x, y, z, w, d, h, c, a) => out.push([x * SC, y * SC, z * SC, w * SC, d * SC, h * SC, c, a || 0]); jetParts(sp, rng, p.broken, p.broken ? '#5f6a62' : '#6b7480'); for (let i = 0; i < 5; i++) sp(-50 + rng() * 100, (rng() - 0.5) * 70, 0, 6 + rng() * 10, 4 + rng() * 8, 2 + rng() * 3, rng() < 0.5 ? '#3a3e42' : '#1c1a18', rng() * 3); return out; }
      case 'milheli': {
        const col = '#4b5d3a', dark = '#3a4a2c', br = p.broken, push = (x, y, z, w, d, h, c, a) => out.push([x * 1.45, y * 1.45, z * 1.45, w * 1.45, d * 1.45, h * 1.45, c, a || 0]);
        for (const s of [-1, 1]) { push(0, s * 14, 0, 50, 3, 3, '#2a2a2a'); push(-10, s * 14, 3, 3, 3, 8, '#333'); push(10, s * 14, 3, 3, 3, 8, '#333'); }
        push(4, 0, 10, 40, 22, 18, col); push(22, 0, 12, 12, 18, 12, dark); push(28, 0, 14, 6, 14, 8, br ? '#1a2228' : '#6ab0d0'); push(8, 11.2, 14, 14, 0.6, 10, '#1a1a1a'); push(-6, 0, 28, 22, 16, 6, dark);
        push(-2, 0, 34, 6, 6, 6, '#2a2a2a');
        if (br) { push(-30, 4, 6, 30, 6, 6, col, 0.5); push(-48, 14, 0, 10, 4, 12, dark, 0.5); push(-10, 26, 0, 40, 4, 2, '#1a1a1a', 1.1); push(16, -26, 0, 36, 4, 2, '#1a1a1a', -0.4); push(4, 0, 0, 44, 26, 3, '#1c1a18'); }
        else { push(-26, 0, 16, 36, 6, 6, col); push(-44, 0, 18, 4, 2, 16, dark); push(-44, 4, 24, 2, 10, 2, '#2a2a2a'); for (const a of [0.3, 1.87, 3.44, 5.01]) push(Math.cos(a) * 24, Math.sin(a) * 24, 40, 48, 4, 1.5, '#1a1a1a', a); }
        push(-14, -11.2, 18, 6, 0.6, 6, '#e8e8e8'); push(-14, -11.6, 20, 2, 0.4, 2, '#c0392b');
        return out;
      }
      case 'miltruck': {
        const col = p.broken ? '#3a3a2e' : '#556b2f', cv = p.broken ? '#2a2a24' : '#6b7a4a';
        for (const x of [-20, -6, 22]) for (const s of [-1, 1]) { if (p.broken && x === 22 && s > 0) continue; push(x, s * 15, 0, 12, 5, 12, '#151515'); push(x, s * 17.4, 4, 5, 0.6, 5, '#7a7a7a'); }
        push(0, 0, 6, 70, 26, 6, '#2a2a2a'); push(24, 0, 12, 20, 26, 18, col); push(31, 0, 22, 6, 22, 8, p.broken ? '#1a2228' : '#86c0d8'); push(35, 0, 12, 1, 24, 8, '#3a3a3a');
        push(-10, 0, 12, 44, 28, 4, hexShade(col, 0.85));
        if (!p.broken) { push(-10, 0, 16, 44, 28, 20, cv); for (let i = -2; i <= 2; i++) push(-10 + i * 10, 0, 36, 2, 30, 2, hexShade(cv, 0.8)); push(-32.4, 0, 18, 0.6, 22, 16, hexShade(cv, 0.7)); }
        else { for (let i = -2; i <= 2; i++) { push(-10 + i * 10, -13, 16, 2, 2, 18, '#1a1a1a'); push(-10 + i * 10, 13, 16, 2, 2, 18, '#1a1a1a'); } push(-10, 0, 16, 30, 20, 4, '#1c1a18'); push(-6, 4, 20, 10, 8, 6, '#4b5d3a'); }
        push(34.6, -9, 10, 0.6, 5, 4, p.broken ? '#444' : '#d8d2a0'); push(34.6, 9, 10, 0.6, 5, 4, p.broken ? '#444' : '#d8d2a0'); push(24, 13.2, 18, 8, 0.6, 6, '#e8e8e8');
        return out;
      }
      case 'apc': {
        const col = p.broken ? '#3a3a2e' : '#4b5d3a';
        for (const x of [-18, -6, 6, 18]) for (const s of [-1, 1]) push(x, s * 16, 0, 10, 5, 10, '#151515');
        push(0, 0, 6, 56, 30, 14, col); push(22, 0, 12, 14, 30, 8, hexShade(col, 0.9), 0); push(-4, 0, 20, 40, 26, 6, hexShade(col, 1.08));
        push(-4, 0, 26, 16, 14, 8, hexShade(col, 0.9)); push(10, 0, 30, 20, 3, 3, '#1a1a1a', p.tur || 0.2);
        push(-28.4, 0, 8, 0.6, 16, 14, '#2a2a2a'); push(28, -8, 16, 0.6, 6, 3, '#86c0d8');
        if (p.broken) { push(-4, 0, 26, 30, 22, 2, '#1c1a18'); push(12, 18, 0, 14, 6, 4, '#2a2a2a', 0.6); }
        return out;
      }
      case 'hangar': {
        const col = p.col || '#6b7076', w = 230, d = 130, br = p.broken;
        push(0, 0, 0, w + 6, d + 6, 3, '#55585a');
        for (let i = 0; i < 8; i++) { const f = i / 7, z = Math.sin(f * Math.PI) * 56, x = -w / 2 + f * w; push(x, -d / 2 + 3, 0, 6, 6, z + 8, hexShade(col, 0.8)); }
        push(0, -d / 2 + 3, 0, w, 4, 46, col);
        const segs = 16; for (let i = 0; i < segs; i++) { const f = (i + 0.5) / segs, z = Math.pow(Math.sin(f * Math.PI), 0.6) * 58 + 8, x = -w / 2 + f * w; if (br && i >= 7 && i <= 11) { if (i % 2) push(x, 0, 0, w / segs - 2, d * 0.5, 5, '#3a3e42', rng()); push(x, -d / 2 + 6, z - 4, 3, 3, 6, '#2a2a2a'); continue; } push(x, 0, z, w / segs + 1, d, 4, i % 2 ? col : hexShade(col, 1.07)); push(x, d / 2 - 2, 0, w / segs + 1, 3, z, i % 2 ? hexShade(col, 0.9) : hexShade(col, 0.95)); }
        for (let r = -2; r <= 2; r++) for (let i = 0; i < segs; i += 2) { const f = (i + 0.5) / segs, z = Math.pow(Math.sin(f * Math.PI), 0.6) * 58 + 12, x = -w / 2 + f * w; push(x, r * d / 5, z, w / segs + 1, 3, 2, hexShade(col, 0.75)); }
        push(0, d / 2 - 1, 0, w * 0.6, 4, 44, '#1a1c1e'); push(-w * 0.3 - 6, d / 2 + 2, 0, 12, 6, 48, '#4a4e52'); push(w * 0.3 + 6, d / 2 + 2, 0, 12, 6, 48, '#4a4e52');
        push(0, d / 2 + 3, 50, 70, 2, 12, '#e8e8e8'); push(0, d / 2 + 3.6, 53, 60, 0.6, 6, '#2a2a2a');
        push(-60, 10, 3, 30, 20, 14, '#4b5d3a'); push(50, -20, 3, 16, 16, 16, '#7a5a3a'); push(70, 10, 3, 10, 10, 18, '#c0392b');
        if (br) { push(10, 20, 3, 40, 10, 4, '#3a3e42', 0.7); push(-10, -10, 3, 30, 6, 6, '#2a2a2a', -0.5); push(0, 0, 60, 30, 20, 3, '#1c1a18'); }
        return out;
      }
      case 'radar': push(0, 0, 0, 30, 30, 6, '#55585a'); push(0, 0, 6, 8, 8, 40, '#7a7f86'); push(0, 0, 46, 14, 14, 6, '#5a5e62'); push(6, 0, 56, 4, 44, 26, '#c8d0d4', 0.4); push(10, 0, 58, 2, 34, 20, '#e0e6ea', 0.4); push(14, 0, 68, 14, 2, 2, '#3a3e42'); push(20, 0, 68, 3, 3, 3, '#c0392b'); push(-14, 14, 0, 10, 10, 14, '#4b5d3a'); return out;
      case 'fueltank': { const br = p.broken; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; push(Math.cos(a) * 15, Math.sin(a) * 15, 0, 12, 12, br && i > 4 ? 14 : 36, i % 2 ? '#8a7a5a' : '#7a6a4a', a); } push(0, 0, 0, 26, 26, br ? 10 : 36, '#7a6a4a'); if (!br) { push(0, 0, 36, 30, 30, 3, '#6a5a3a'); push(0, 0, 39, 8, 8, 4, '#4a4a4a'); push(15.6, 0, 12, 0.6, 18, 10, '#c0392b'); push(15.8, 0, 15, 0.4, 14, 4, '#e8e8e8'); for (let z = 6; z < 36; z += 8) push(17, -8, z, 2, 4, 1, '#3a3a3a'); } else { push(0, 0, 10, 22, 22, 1, '#1c1a18'); push(18, 10, 0, 14, 10, 3, '#7a6a4a', 0.8); } return out; }
      case 'barbwire': { const len = p.len || 180, n = Math.max(2, Math.round(len / 40)); for (let i = 0; i <= n; i++) { const x = -len / 2 + i * len / n; push(x, 0, 0, 3, 3, 22, '#5b4a30'); } push(0, 0, 8, len, 0.6, 0.6, '#8a8a8a'); push(0, 0, 14, len, 0.6, 0.6, '#8a8a8a'); push(0, 0, 20, len, 0.6, 0.6, '#8a8a8a'); for (let i = 0; i < len / 9; i++) { const x = -len / 2 + 4 + i * 9; push(x, 0, 22 + (i % 2), 5, 5, 4, '#9a9a9a', i); } return out; }
      case 'crater': { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, r = 30 + rng() * 6; push(Math.cos(a) * r, Math.sin(a) * r, 0, 14, 10, 1.2 + rng() * 1.5, rng() < 0.5 ? '#3a3026' : '#4a3a2a', a); } push(0, 0, 0, 44, 44, 0.6, '#1a1612'); push(0, 0, 0.6, 26, 26, 0.6, '#0e0c0a'); for (let i = 0; i < 4; i++) push((rng() - 0.5) * 30, (rng() - 0.5) * 30, 0.8, 4, 4, 2, '#5a5e62'); return out; }
      case 'miltent': { const c = '#5a6a42'; push(0, 0, 0, 44, 34, 2, '#3a3026'); push(0, -9, 2, 42, 18, 14, c, 0); push(0, 9, 2, 42, 18, 14, hexShade(c, 0.88)); push(0, 0, 16, 44, 6, 6, hexShade(c, 0.8)); push(22.4, 0, 2, 0.6, 12, 12, '#1a1a1a'); push(-22, 0, 0, 3, 3, 24, '#5b4a30'); push(22, 0, 0, 3, 3, 24, '#5b4a30'); return out; }
      case 'milflag': push(0, 0, 0, 10, 10, 4, '#55585a'); push(0, 0, 4, 2, 2, 70, '#9aa0a6'); push(8, 0, 58, 14, 1, 10, '#4b5d3a', 0.2); push(8, 0.8, 61, 8, 0.4, 4, '#d4c27a', 0.2); return out;
      case 'milsign': push(0, 0, 0, 3, 3, 34, '#5b4a30'); push(0, 6, 26, 2, 30, 16, '#4b5d3a'); push(1.2, 6, 30, 0.4, 24, 8, '#d4c27a'); push(1.4, 6, 33, 0.3, 18, 2, '#1a1a1a'); return out;
      case 'barrels': for (const [x, y, c] of [[0, 0, '#4b5d3a'], [12, 6, '#3a4a5a'], [4, 14, '#6b4a2a']]) { push(x, y, 0, 11, 11, 18, c); push(x, y, 6, 12, 12, 1.5, '#2a2a2a'); push(x, y, 13, 12, 12, 1.5, '#2a2a2a'); } return out;
      // ---------- Steinbruch ----------
      case 'excavator': {
        const y = '#e1b12c', d = '#b88a14', a = p.ang || 0;
        for (const s of [-1, 1]) { push(0, s * 14, 0, 42, 8, 10, '#2a2a2a'); for (let i = -2; i <= 2; i++) push(i * 8, s * 18.2, 2, 3, 0.6, 6, '#5a5a5a'); }
        push(0, 0, 10, 34, 26, 6, '#3a3a3a'); push(-2, 0, 16, 30, 26, 14, y); push(-14, 0, 16, 8, 24, 16, d); push(6, -6, 30, 14, 12, 14, d); push(6, -6, 34, 0.6, 10, 8, '#6ab0d0'); push(13.2, -6, 32, 0.6, 10, 10, '#6ab0d0');
        push(22, 6, 30, 30, 6, 6, y, -0.5); push(42, 6, 30, 26, 5, 5, y, 0.7); push(52, 6, 14, 12, 14, 10, '#4a4a4a'); for (let i = -1; i <= 1; i++) push(58, 6 + i * 4, 12, 3, 2, 4, '#7a7a7a');
        push(-10, 10, 30, 3, 3, 10, '#2a2a2a'); push(-2, 13.2, 20, 14, 0.6, 4, '#1a1a1a');
        return out;
      }
      case 'minecart': push(0, -8, 0, 30, 2, 2, '#5a5a5a'); push(0, 8, 0, 30, 2, 2, '#5a5a5a'); for (let i = -2; i <= 2; i++) push(i * 6, 0, 0, 3, 20, 1, '#5b3a22'); for (const x of [-7, 7]) for (const s of [-1, 1]) push(x, s * 8, 2, 6, 2, 6, '#2a2a2a'); push(0, 0, 6, 22, 16, 12, '#7a5a3a'); push(0, 0, 18, 24, 18, 2, '#5a3a22'); push(-2, 0, 18, 16, 12, 6, '#8a8278'); push(4, 2, 22, 8, 6, 4, '#c4702e'); return out;
      case 'rockpile': { for (let i = 0; i < 9; i++) { const a = rng() * 6.283, r = rng() * 12; push(Math.cos(a) * r, Math.sin(a) * r, i < 5 ? 0 : 8, 10 + rng() * 10, 10 + rng() * 8, 8 + rng() * 8, ['#8a867c', '#7a766d', '#97928a', '#6e6b64'][i % 4], rng()); } push(0, 0, 14, 10, 10, 6, '#a39e94'); return out; }
      case 'quarrylamp': push(0, 0, 0, 8, 8, 4, '#3a3a3a'); push(0, 0, 4, 3, 3, 66, '#5a5e62'); push(0, 0, 66, 24, 3, 3, '#5a5e62'); for (const s of [-1, 1]) { push(s * 10, 0, 58, 8, 6, 8, '#2a2a2a'); push(s * 10, 3.2, 59, 6, 0.6, 6, '#fffbd0'); } push(0, 0, 4, 1, 1, 60, '#1a1a1a'); return out;
      case 'crusher': {
        push(0, 0, 0, 116, 88, 4, '#55585a');
        for (const [x, y] of [[-40, -30], [40, -30], [-40, 30], [40, 30]]) push(x, y, 4, 6, 6, 50, '#c79a14');
        push(0, 0, 50, 90, 70, 4, '#b88a14'); push(-10, 0, 54, 40, 40, 26, '#7a7f86'); push(-10, 0, 80, 50, 50, 4, '#5a5e62'); push(-10, 0, 84, 30, 30, 10, '#4a4e52');
        push(30, 0, 4, 30, 36, 30, '#6a6e72'); push(30, 18.4, 8, 20, 0.6, 18, '#2a2a2a'); push(30, -18.4, 20, 8, 0.6, 6, '#e1b12c');
        push(-44, 20, 4, 24, 20, 20, '#8a867c'); push(-44, 20, 24, 20, 16, 6, '#97928a'); push(-44, -24, 4, 18, 18, 14, '#7a766d');
        push(10, 0, 92, 6, 6, 20, '#3a3a3a'); push(10, 0, 112, 8, 8, 3, '#1a1a1a');
        return out;
      }
      case 'conveyor': { push(-30, 0, 0, 4, 4, 6, '#c79a14'); push(0, 0, 0, 4, 4, 20, '#c79a14'); push(30, 0, 0, 4, 4, 34, '#c79a14'); for (let i = 0; i < 8; i++) { const f = i / 7, x = -36 + f * 72, z = 4 + f * 30; push(x, 0, z, 10, 12, 2, '#3a3a3a'); push(x, 0, z + 2, 9, 10, 2, i % 2 ? '#8a867c' : '#7a766d'); } push(-40, 0, 0, 10, 14, 4, '#c79a14'); return out; }
      case 'shack': push(0, 0, 0, 62, 50, 4, '#5a4a3a'); push(0, 0, 4, 54, 42, 30, '#7a5230'); for (let i = -2; i <= 2; i++) push(i * 11, 21.4, 4, 1, 0.6, 30, '#5b3a22'); push(27.4, -8, 8, 0.6, 14, 22, '#3a2a1a'); push(27.4, 10, 16, 0.6, 12, 10, '#ffd27a'); push(0, 0, 34, 62, 50, 4, '#6a6e72'); push(0, 0, 38, 40, 50, 4, '#5a5e62'); push(-20, 18, 38, 6, 6, 14, '#4a4a4a'); push(34, 14, 0, 10, 10, 14, '#c0392b'); push(34, 4, 0, 10, 10, 14, '#4b5d3a'); return out;
    }
    return _ppZ(p);
  };
}
;
;

// ===================================================== world.js =====================================================

// ===== ACTIV · world.js (zusammengeführt aus: world.js, world2.js, zones_world.js) =====

// ----------------------------- world.js -----------------------------

// ===================== WELTEN =====================
const CH = 8, GPAD = 22, GPADB = 96;
function rpick(r, a) { return a[Math.floor(r() * a.length)]; }
const TREE_COLS = {
  oak: [['#2f7a35', '#3f9440', '#5cb04a'], ['#2a6e33', '#3a8a3c', '#4fa548'], ['#357f2e', '#4c9a3a', '#6fbf4f']], pine: [['#1f5a3a', '#2a6e47', '#3b8a57']], snowpine: [['#2a5a4a', '#356b57', '#4a7d68']],
  birch: [['#6dae45', '#86c454', '#a5d867']], jungle: [['#246b2e', '#33853a', '#4aa046'], ['#2b7a3a', '#3f9446', '#5db052']], cactus: [['#4f8a3a', '#5a9a42', '#6aaa52']], dead: [['#4a5a3a', '#3a4a2a', '#5a6a4a']],
  shroom: [['#2fd6b0', '#1fa890', '#a6ffe6'], ['#5f9cff', '#3a6fd8', '#c8dcff'], ['#ff7ad0', '#d84ab0', '#ffd0f0']], shroomtall: [['#2fd6b0', '#1fa890', '#a6ffe6'], ['#9a7cff', '#6a4cd8', '#e0d6ff']],
  lavaspire: [['#2a1e22', '#1e1418', '#ff6a2a']], obelisk: [['#2a2430', '#1e1a24', '#ffd27a']], crystaltree: [['#8a7cff', '#6a5cdf', '#e6ddff']], goldspire: [['#d9b35a', '#e8c86a', '#fff3c0']],
};
// Tiles: 0 Boden, 2 Erde, 3 Straße, 4 Gehweg, 5 Marmor, 6 Platz, 7 Unterstadt, 8 Beton, 9 gesperrt, 10 Metallboden
function baseWorld(kind, size, seed) {
  const NC = Math.ceil(size / CH);
  const W = { kind, size, seed, NC, tiles: new Uint8Array(size * size), roadMark: new Uint8Array(size * size), trees: [], nodes: [], bushes: [], props: [], cars: [], crates: [], npcs: [], lightsStatic: [], zones: [], outposts: [], grassCh: [], chunkObjs: [], chunks: new Map(), BS: 96, heli: null, biome: null, airships: [] };
  for (let i = 0; i < NC * NC; i++) { W.grassCh.push([]); W.chunkObjs.push({ trees: [], bushes: [], nodes: [], props: [] }); }
  W.BN = Math.ceil(size * TILE / W.BS); W.buckets = new Array(W.BN * W.BN); for (let i = 0; i < W.buckets.length; i++) W.buckets[i] = [];
  const rng = mulberry32(seed); W.rng = rng;
  const ph = []; for (let i = 0; i < 8; i++) ph.push([rng() * 6.28, 0.05 + rng() * 0.11, 0.05 + rng() * 0.11]);
  W.noise = (x, y) => { let v = 0; for (const [p, a, b] of ph) v += Math.sin(x * a + p) * Math.cos(y * b - p * 0.7); return v / ph.length; };
  return W;
}
function wTile(W, gx, gy) { if (gx < 0 || gy < 0 || gx >= W.size || gy >= W.size) return 9; return W.tiles[gy * W.size + gx]; }
function setTile(W, gx, gy, t) { if (gx < 0 || gy < 0 || gx >= W.size || gy >= W.size) return; W.tiles[gy * W.size + gx] = t; }
function chunkIdx(W, x, y) { const cx = clamp(Math.floor(x / TILE / CH), 0, W.NC - 1), cy = clamp(Math.floor(y / TILE / CH), 0, W.NC - 1); return cy * W.NC + cx; }
function addBucket(W, o, type, hw, hd) {
  o.btype = type; const BS = W.BS;
  const x0 = clamp(Math.floor((o.x - (hw || 0)) / BS), 0, W.BN - 1), x1 = clamp(Math.floor((o.x + (hw || 0)) / BS), 0, W.BN - 1), y0 = clamp(Math.floor((o.y - (hd || 0)) / BS), 0, W.BN - 1), y1 = clamp(Math.floor((o.y + (hd || 0)) / BS), 0, W.BN - 1);
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) W.buckets[j * W.BN + i].push(o);
}
function staticNear(W, x, y, fn) {
  const bx = Math.floor(x / W.BS), by = Math.floor(y / W.BS);
  for (let j = by - 1; j <= by + 1; j++) for (let i = bx - 1; i <= bx + 1; i++) { if (i < 0 || j < 0 || i >= W.BN || j >= W.BN) continue; const arr = W.buckets[j * W.BN + i]; for (let k = 0; k < arr.length; k++) if (fn(arr[k]) === true) return true; }
  return false;
}
function tileType(W, x, y) { return wTile(W, Math.floor(x / TILE), Math.floor(y / TILE)); }
function isBlockedTile(W, x, y) { const t = tileType(W, x, y); return t === 1 || t === 9 || t === 11 || t === 20; }
function addTree(W, x, y, kind, opts) {
  if (isBlockedTile(W, x, y)) return null;
  const rng = W.rng, cl = TREE_COLS[kind] || TREE_COLS.oak;
  const tr = { x, y, kind, v: rng() * 2 - 1, cols: cl[Math.floor(rng() * cl.length)], sc: 0.85 + rng() * 0.45, hp: 100, max: 100, regrow: 0, wob: 0, flowers: kind === 'oak' && rng() < 0.2, deco: opts && opts.deco };
  tr.parts = treeParts(tr); W.trees.push(tr); W.chunkObjs[chunkIdx(W, x, y)].trees.push(tr); addBucket(W, tr, 'tree'); return tr;
}
function addNode(W, x, y, kind) {
  if (isBlockedTile(W, x, y)) return null;
  const n = { x, y, kind, hp: 100, max: 100, respawn: 0, wob: 0, sc: 0.85 + W.rng() * 0.4 };
  n.parts = rockParts(n); W.nodes.push(n); W.chunkObjs[chunkIdx(W, x, y)].nodes.push(n); addBucket(W, n, 'node'); return n;
}
function addBush(W, x, y, tuft) {
  if (isBlockedTile(W, x, y)) return;
  const rng = W.rng, berry = !tuft && rng() < 0.18;
  let pal = W.biome === 'desert' ? ['#7a8a3a', '#8a9a4a'] : W.biome === 'lab' ? ['#5a7a6a', '#6a8a7a'] : W.biome === 'swamp' ? ['#2a4a2a', '#3a5a2a', '#4a3a5a'] : ['#2f7a35', '#3a8a3c', '#2a6a30', '#4a9a3e'];
  if (W.planet) pal = [W.planet.col[0], hexShade(W.planet.col[0], 0.7), W.planet.col[1]];
  if (tuft) pal = ['#7fae3a', '#8fbe4a', '#a8c45a', '#6a9a34', '#b5c46a'];
  const b = { x, y, col: pal[Math.floor(rng() * pal.length)], berries: berry ? 3 : 0, berry, regrow: 0, sc: 0.7 + rng() * 0.7, tuft: !!tuft, flower: tuft && rng() < 0.2 ? rpick(rng, ['#ffd84a', '#ff7eb6', '#ffffff', '#b58cff']) : null };
  b.parts = bushParts(b); W.bushes.push(b); W.chunkObjs[chunkIdx(W, x, y)].bushes.push(b);
}
function addProp(W, kind, x, y, o) {
  o = o || {};
  const p = Object.assign({ kind, x, y, ang: 0, solid: true }, o);
  if (p.hw !== undefined && p.ang && Math.abs(Math.sin(p.ang)) > 0.5) { const t = p.hw; p.hw = p.hd; p.hd = t; }
  W.props.push(p); W.chunkObjs[chunkIdx(W, x, y)].props.push(p);
  if (p.solid && p.hw) addBucket(W, p, 'prop', p.hw, p.hd); else p.btype = 'prop';
  if (p.light) W.lightsStatic.push({ x: x + (p.lx || 0), y: y + (p.ly || 0), r: p.light, col: p.lcol || '255,220,140', safe: p.safe !== false, night: p.nightOnly, flick: p.flick, blink: p.blink });
  return p;
}
function addCrate(W, x, y, rarity, space) { if (isBlockedTile(W, x, y)) return; W.crates.push({ x, y, rarity, opening: 0, open: false, hold: 0, space: !!space }); }
function addNpc(W, x, y, a, look, station, name, opts) { const n = Object.assign({ x, y, a, look, station, name, walk: 0, t: Math.random() * 9, home: { x, y } }, opts || {}); W.npcs.push(n); return n; }
function road(W, x0, y0, x1, y1) {
  const S = W.size;
  if (y0 === y1) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let k = 0; k < 2; k++) { const gy = y0 + k; if (x < 0 || x >= S || gy >= S) continue; const i = gy * S + x; W.roadMark[i] = (W.tiles[i] === 3 && W.roadMark[i] !== (k ? 8 : 1)) ? 4 : (k ? 8 : 1); W.tiles[i] = 3; } }
  else { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let k = 0; k < 2; k++) { const gx = x0 + k; if (y < 0 || y >= S || gx >= S) continue; const i = y * S + gx; W.roadMark[i] = (W.tiles[i] === 3 && W.roadMark[i] !== (k ? 16 : 2)) ? 4 : (k ? 16 : 2); W.tiles[i] = 3; } }
}
function freeAt(W, x, y, r) { if (isBlockedTile(W, x, y)) return false; return !staticNear(W, x, y, o => { if (o.btype === 'prop' && o.hw) return Math.abs(o.x - x) < o.hw + r && Math.abs(o.y - y) < o.hd + r; return Math.hypot(o.x - x, o.y - y) < r + 14; }); }

// =========================================================
// HAUPTKARTE
// =========================================================
const RUIN_RECT = { x0: 72, y0: 4, x1: 127, y1: 55 };
const EDEN_RECT = { x0: 10, y0: 100, x1: 28, y1: 118 };
const EDEN_GATE = { gx: 28, gy: 109 };
const GRASS_RECT = { x0: 78, y0: 66, x1: 124, y1: 124 };
const RADIO = { gx: 30, gy: 34 };
const MIL_RECT = { x0: 27, y0: 66, x1: 56, y1: 96 };
const QUARRY = { cx: 42, cy: 14, r: 9 };
function inZoneV16(gx, gy, m) { m = m || 0; return inRect(gx, gy, MIL_RECT, m) || Math.hypot(gx - QUARRY.cx, gy - QUARRY.cy) < QUARRY.r + 6 + m; }
function inRect(gx, gy, r, m) { m = m || 0; return gx >= r.x0 - m && gx <= r.x1 + m && gy >= r.y0 - m && gy <= r.y1 + m; }

function makeMainWorld(seed) {
  const W = baseWorld('main', 128, seed), S = W.size, rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, C = 64;
  W.name = 'DIE WILDNIS';
  for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) { const n = W.noise(gx, gy); if (n < -0.36 && !inRect(gx, gy, GRASS_RECT)) W.tiles[gy * S + gx] = 2; }
  road(W, 20, 60, 127, 60); road(W, 98, 46, 98, 60); road(W, 60, 60, 60, 112); road(W, 60, 112, 116, 112); road(W, 20, 24, 74, 24); road(W, 20, 24, 20, 84);
  buildRuinCity(W);
  buildEdenExterior(W);
  buildRadioStation(W);
  buildMilitary(W);
  buildQuarry(W);
  buildTerrain(W);
  W.zones.push({ id: 'grass', n: 'DAS GRASMEER', sub: 'Endloses hohes Gras. Keine Deckung, kein Holz.', x0: GRASS_RECT.x0 * T, y0: GRASS_RECT.y0 * T, x1: GRASS_RECT.x1 * T, y1: GRASS_RECT.y1 * T, col: '#d8e86a' });
  // Kurier-Abwurfpunkte
  const DROPS = [{ n: 'Abwurfpunkt Kiefernhang', gx: 40, gy: 44 }, { n: 'Abwurfpunkt Ostbrücke', gx: 118, gy: 64 }, { n: 'Abwurfpunkt Grasmeer', gx: 100, gy: 100 }, { n: 'Abwurfpunkt Südwald', gx: 48, gy: 96 }, { n: 'Funkstation', gx: RADIO.gx + 4, gy: RADIO.gy + 5 }];
  for (const d of DROPS) { const x = d.gx * T, y = d.gy * T; if (d.n !== 'Funkstation') addProp(W, 'dropbox', x, y, { hw: 10, hd: 10, light: 70, lcol: '255,176,32', safe: false }); W.outposts.push({ n: d.n, x, y }); }
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) if (Math.hypot(i, j) < 9 && wTile(W, C + i, C + j) === 2) setTile(W, C + i, C + j, 0);
  const nearStart = (x, y, r) => Math.hypot(x - C * T, y - C * T) < r;
  for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) {
    if (W.tiles[gy * S + gx] !== 3 || inRect(gx, gy, RUIN_RECT)) continue;
    if (rng() < 0.004) addProp(W, 'barrier', (gx + 0.5) * T, (gy + 0.5) * T, { hw: 20, hd: 6, ang: rng() < 0.5 ? 0 : Math.PI / 2 });
    else if (rng() < 0.012 && !nearStart(gx * T, gy * T, 300)) addTree(W, (gx + rng()) * T, (gy + rng()) * T, rng() < 0.5 ? 'birch' : 'oak');
  }
  for (let gx = 22; gx < 126; gx += 6) addProp(W, 'streetlamp', (gx + 0.5) * T, 59.6 * T, { hw: 4, hd: 4, broken: rng() < 0.7, ang: Math.PI / 2 });
  // Nur 2 reparierbare Wracks
  [[C + 6, C - 2, '#c0392b'], [104, 30, '#2e86de']].forEach(([gx, gy, col]) => W.cars.push({ id: W.cars.length, x: gx * T, y: gy * T, a: rr(0, 6.28), color: col, wreck: true, hp: 0, maxHp: 220, fuel: 0, up: {}, v: 0, steer: 0, gunAng: 0, nitro: 100 }));
  W.starterCar = W.cars[0];
  for (let i = 0; i < 30; i++) {
    const x = rr(200, S * T - 200), y = rr(200, S * T - 200), gx = Math.floor(x / T), gy = Math.floor(y / T);
    if (W.tiles[gy * S + gx] !== 0 || inZoneV16(gx, gy, 2) || inRect(gx, gy, RUIN_RECT, 2) || inRect(gx, gy, EDEN_RECT, 8) || inRect(gx, gy, GRASS_RECT) || nearStart(x, y, 340)) continue;
    const len = rr(60, 130); addProp(W, 'ruin', x, y, { len, seed: Math.floor(rng() * 100), hw: 7, hd: len / 2, ang: rng() < 0.5 ? 0 : Math.PI / 2 });
  }
  const forestOK = (gx, gy) => { const t = wTile(W, gx, gy); return (t === 0 || t === 2) && !inZoneV16(gx, gy, 0) && !inRect(gx, gy, RUIN_RECT, 1) && !inRect(gx, gy, EDEN_RECT, 1) && !inRect(gx, gy, GRASS_RECT) && Math.hypot(gx - RADIO.gx - 3, gy - RADIO.gy - 3) > 7 && Math.hypot(gx - EDEN_RECT.x1 - 5, gy - EDEN_GATE.gy + 3) > 4.5 && !(W.mask && W.mask[gy * S + gx] === 1); };
  for (let i = 0; i < 2300; i++) { const x = rr(60, S * T - 60), y = rr(60, S * T - 60), gx = Math.floor(x / T), gy = Math.floor(y / T); if (!forestOK(gx, gy) || nearStart(x, y, 270) || !freeAt(W, x, y, 14)) continue; const n = W.noise(gx, gy); addTree(W, x, y, n < -0.2 ? 'pine' : rng() < 0.15 ? 'birch' : rng() < 0.45 ? 'jungle' : 'oak'); }
  forestFill(W);
  for (let i = 0; i < 900; i++) {
    const gx = rr(EDEN_RECT.x0 - 9, EDEN_RECT.x1 + 13), gy = rr(EDEN_RECT.y0 - 11, EDEN_RECT.y1 + 8);
    if (inRect(Math.floor(gx), Math.floor(gy), EDEN_RECT, 1)) continue;
    if (Math.abs(gy - EDEN_GATE.gy - 0.5) < 2 && gx > EDEN_GATE.gx && gx < EDEN_GATE.gx + 14) continue;
    const x = gx * T, y = gy * T; if (!forestOK(Math.floor(gx), Math.floor(gy)) || !freeAt(W, x, y, 12)) continue;
    addTree(W, x, y, rng() < 0.5 ? 'jungle' : rng() < 0.5 ? 'pine' : 'oak');
  }
  for (let gx = EDEN_GATE.gx + 1; gx < EDEN_GATE.gx + 14; gx++) { setTile(W, gx, EDEN_GATE.gy, 2); setTile(W, gx, EDEN_GATE.gy + 1, 2); }
  for (let i = 0; i < 260; i++) {
    const x = rr(80, S * T - 80), y = rr(80, S * T - 80), gx = Math.floor(x / T), gy = Math.floor(y / T), t = wTile(W, gx, gy);
    if ((t !== 0 && t !== 2) || inZoneV16(gx, gy, 0) || nearStart(x, y, 200) || inRect(gx, gy, EDEN_RECT, 2) || (inRect(gx, gy, GRASS_RECT) && rng() < 0.8) || !freeAt(W, x, y, 16)) continue;
    addNode(W, x, y, inRect(gx, gy, RUIN_RECT) ? 'rubble' : rng() < 0.68 ? 'rock' : 'scrap');
  }
  for (let i = 0; i < 2200; i++) { const x = rr(30, S * T - 30), y = rr(30, S * T - 30), gx = Math.floor(x / T), gy = Math.floor(y / T), t = wTile(W, gx, gy); if ((t === 0 || t === 2 || (t === 4 && rng() < 0.4)) && !inZoneV16(gx, gy, -2) && !inRect(gx, gy, EDEN_RECT) && !inRect(gx, gy, GRASS_RECT)) addBush(W, x, y); }
  for (let i = 0; i < 2600; i++) { const x = rr(GRASS_RECT.x0, GRASS_RECT.x1) * T, y = rr(GRASS_RECT.y0, GRASS_RECT.y1) * T; if (wTile(W, Math.floor(x / T), Math.floor(y / T)) !== 3) addBush(W, x, y, true); }
  for (let i = 0; i < 14; i++) { const x = rr(150, S * T - 150), y = rr(150, S * T - 150), gx = Math.floor(x / T), gy = Math.floor(y / T); if (inRect(gx, gy, EDEN_RECT, 1) || inZoneV16(gx, gy, 0) || !freeAt(W, x, y, 14)) continue; const r = rng(); addCrate(W, x, y, r < 0.55 ? 0 : r < 0.83 ? 1 : r < 0.96 ? 2 : 3); }
  finishWorld(W);
  return W;
}
function buildRuinCity(W) {
  const rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, XS = [74, 84, 94, 104, 114, 124], YS = [6, 16, 26, 36, 46];
  for (const x of XS) road(W, x, 6, x, 47); for (const y of YS) road(W, 74, y, 125, y);
  W.zones.push({ id: 'ruin', n: 'RUINENSTADT ROSTHAFEN', sub: 'Hochhäuser plündern (E) · Lärm weckt die Toten', x0: 73 * T, y0: 5 * T, x1: 127 * T, y1: 49 * T, col: '#ff9a3c' });
  const palette = [['#9a958a', false], ['#8a4b3a', false], ['#4f6f7f', true], ['#b8a27a', false], ['#7a7f86', true], ['#6b5a4a', false]];
  for (let bx = 0; bx < XS.length - 1; bx++) for (let by = 0; by < YS.length - 1; by++) {
    const x0 = XS[bx] + 2, y0 = YS[by] + 2;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) setTile(W, x0 + i, y0 + j, (i === 0 || j === 0 || i === 7 || j === 7) ? 4 : (rng() < 0.6 ? 2 : 0));
    for (let i = 1; i < 8; i += 3) addProp(W, 'streetlamp', (x0 + i + 0.5) * T, (y0 + 7.6) * T, { hw: 4, hd: 4, broken: rng() < 0.8, ang: Math.PI / 2 });
    if (rng() < 0.6) addTree(W, (x0 + 7.5) * T, (y0 + rr(1, 6)) * T, rng() < 0.5 ? 'birch' : 'oak');
    const ix = (x0 + 1) * T, iy = (y0 + 1) * T, r = rng();
    if (bx === 2 && by === 2) {
      for (let j = 1; j < 7; j++) for (let i = 1; i < 7; i++) setTile(W, x0 + i, y0 + j, 4);
      const cx = ix + 3 * T, cy = iy + 3 * T; addProp(W, 'hpad', cx, cy, { solid: false });
      W.heli = { x: cx, y: cy, z: 0, a: -0.6, wreck: true, hp: 0, maxHp: 260, fuel: 0, up: {}, rot: 0, rotSpd: 0, vx: 0, vy: 0, state: 'parked' };
      W.zones.push({ id: 'hpad', n: 'DACHLANDEPLATZ', sub: 'Ein Helikopter-Wrack! (Schrott, Elektronik, Sprit)', x0: ix, y0: iy, x1: ix + 6 * T, y1: iy + 6 * T, col: '#7ad7ff', once: true });
    } else if (r < 0.72) {
      const fw = 4 + Math.floor(rng() * 3), fh = 4 + Math.floor(rng() * 3), ox = (6 - fw) / 2, oy = (6 - fh) / 2, pal = palette[Math.floor(rng() * palette.length)], ruined = rng() < 0.35;
      const Tw = { seed: Math.floor(rng() * 1e6), fw, fh, floors: ruined ? 8 + Math.floor(rng() * 8) : 6 + Math.floor(rng() * 13), col: pal[0], glass: pal[1], ruined, looted: 0, restock: 0, name: rpick(rng, ['Hotel Atlas', 'Bürohaus Nord', 'Wohnturm Rost', 'Kaufhaus Klee', 'Bank Varga', 'Klinik St. Ivo', 'Telekom-Turm', 'Lagerhaus 9']) };
      const cx = ix + (ox + fw / 2) * T, cy = iy + (oy + fh / 2) * T; Tw.x = cx; Tw.y = cy;
      for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) setTile(W, x0 + 1 + Math.floor(ox) + i, y0 + 1 + Math.floor(oy) + j, 4);
      addProp(W, 'tower', cx, cy, { hw: fw * T / 2 - 2, hd: fh * T / 2 - 2, tower: Tw });
      for (let k = 0; k < 2; k++) addNode(W, cx + fw * T / 2 + rr(14, 30), cy + rr(-fh * T / 2, fh * T / 2), 'rubble');
    } else { for (let k = 0; k < 7; k++) addTree(W, ix + rr(20, 6 * T - 20), iy + rr(20, 6 * T - 20), rpick(rng, ['oak', 'jungle', 'birch'])); addProp(W, 'ruin', ix + 3 * T, iy + 2 * T, { len: 90, seed: 7, hw: 7, hd: 45 }); addNode(W, ix + 2 * T, iy + 4 * T, 'scrap'); }
  }
  for (const x of XS) for (const y of YS) addProp(W, 'trafficlight', (x - 0.3) * T, (y - 0.3) * T, { hw: 3, hd: 3 });
  for (let k = 0; k < 14; k++) { const vert = rng() < 0.5, line = vert ? rpick(rng, XS) : rpick(rng, YS), along = vert ? rr(7, 46) : rr(75, 124); addProp(W, 'barrier', (vert ? line + 1 : along) * T, (vert ? along : line + 1) * T, { hw: 20, hd: 6, ang: vert ? 0 : Math.PI / 2 }); }
  for (let k = 0; k < 40; k++) { const vert = rng() < 0.5, line = vert ? rpick(rng, XS) : rpick(rng, YS), along = vert ? rr(7, 46) : rr(75, 124); addTree(W, (vert ? line + rr(0.2, 1.8) : along) * T, (vert ? along : line + rr(0.2, 1.8)) * T, rpick(rng, ['oak', 'birch', 'jungle'])); }
}
function buildEdenExterior(W) {
  const T = TILE, R0 = EDEN_RECT;
  for (let gy = R0.y0; gy <= R0.y1; gy++) for (let gx = R0.x0; gx <= R0.x1; gx++) setTile(W, gx, gy, 9);
  const len = (R0.x1 - R0.x0) * T, cx = (R0.x0 + R0.x1) / 2 * T, cy = (R0.y0 + R0.y1) / 2 * T, H = 150;
  addProp(W, 'edenskyline', cx, cy, { w: len - 30, d: len - 30, seed: 4242, solid: false });
  addProp(W, 'citywall', cx, R0.y0 * T, { len, hw: len / 2, hd: 14, H });
  addProp(W, 'citywall', cx, R0.y1 * T, { len, hw: len / 2, hd: 14, H });
  addProp(W, 'citywall', R0.x0 * T, cy, { len, hw: len / 2, hd: 14, H, ang: Math.PI / 2 });
  const gy = EDEN_GATE.gy + 1, l1 = (gy - 3 - R0.y0) * T, l2 = (R0.y1 - gy - 3) * T;
  addProp(W, 'citywall', R0.x1 * T, R0.y0 * T + l1 / 2, { len: l1, hw: l1 / 2, hd: 14, H, ang: Math.PI / 2 });
  addProp(W, 'citywall', R0.x1 * T, R0.y1 * T - l2 / 2, { len: l2, hw: l2 / 2, hd: 14, H, ang: Math.PI / 2 });
  addProp(W, 'citygate', R0.x1 * T, gy * T, { hw: 22, hd: 76, light: 190, lcol: '255,230,170' });
  W.eden = { x: (R0.x1 + 1.4) * T, y: gy * T };
  W.shipPad = { x: (R0.x1 + 5) * T, y: (gy - 4) * T };
  addProp(W, 'hpad', W.shipPad.x, W.shipPad.y, { solid: false, light: 120, lcol: '160,220,255', safe: true });
  W.zones.push({ id: 'eden', n: 'NEU-EDEN', sub: 'Die Festungsstadt. Eintritt nur durchs Tor (E).', x0: (R0.x1 - 2) * T, y0: (gy - 7) * T, x1: (R0.x1 + 9) * T, y1: (gy + 6) * T, col: '#ffd84a', once: true });
}
function buildRadioStation(W) {
  const T = TILE, x = RADIO.gx * T, y = RADIO.gy * T;
  for (let j = -6; j <= 8; j++) for (let i = -6; i <= 8; i++) setTile(W, RADIO.gx + i, RADIO.gy + j, Math.hypot(i - 1, j - 1) < 6 ? 8 : 2);
  W.radioTower = addProp(W, 'radiotower', x - 60, y - 60, { hw: 20, hd: 20 });
  W.radioHut = addProp(W, 'radiohut', x + 80, y + 40, { hw: 48, hd: 35, fixed: false });
  W.lightsStatic.push({ x: x - 60, y: y - 60, r: 60, col: '255,60,40', safe: false, blink: true });
  addProp(W, 'fence', x + 20, y + 200, { len: 240, hw: 120, hd: 3 }); addProp(W, 'fence', x - 140, y + 60, { len: 200, hw: 100, hd: 3, ang: Math.PI / 2 });
  addProp(W, 'container', x - 40, y + 150, { hw: 50, hd: 17, col: '#7a5a3a' }); addCrate(W, x + 30, y + 120, 1); addCrate(W, x - 90, y + 20, 2);
  W.zones.push({ id: 'radio', n: 'VERLASSENE FUNKSTATION', sub: 'Das Funkgerät könnte noch funktionieren …', x0: x - 300, y0: y - 300, x1: x + 400, y1: y + 400, col: '#ff9a3c' });
}

// =========================================================
// EXPEDITION / PLANET
// =========================================================
function genOpenWorld(W, cfg) {
  const S = W.size, rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, lz = { gx: 7, gy: 32 };
  for (let gy = 0; gy < S; gy++) for (let gx = 0; gx < S; gx++) { if (Math.hypot(gx - lz.gx, gy - lz.gy) < 7) continue; if (W.noise(gx * 1.3, gy * 1.3) < -0.3) W.tiles[gy * S + gx] = 2; }
  W.lz = { x: lz.gx * T, y: lz.gy * T };
  for (const pr of cfg.props) { const x = rr(400, S * T - 200), y = rr(200, S * T - 200); if (!freeAt(W, x, y, Math.max(pr.hw, pr.hd) + 10)) continue; addProp(W, pr.kind, x, y, Object.assign({ ang: rng() < 0.5 ? 0 : Math.PI / 2 }, pr)); if (pr.crate) addCrate(W, x + pr.hw + 30, y + 20, rng() < 0.5 ? 2 : 1); }
  for (let i = 0; i < cfg.treeN; i++) { const x = rr(40, S * T - 40), y = rr(40, S * T - 40); if (Math.hypot(x - W.lz.x, y - W.lz.y) < 260 || !freeAt(W, x, y, 14)) continue; addTree(W, x, y, rpick(rng, cfg.trees)); }
  for (let i = 0; i < 30; i++) { const x = rr(300, S * T - 80), y = rr(80, S * T - 80); if (!freeAt(W, x, y, 18)) continue; addNode(W, x, y, cfg.node); }
  for (let i = 0; i < 20; i++) { const x = rr(300, S * T - 80), y = rr(80, S * T - 80); if (!freeAt(W, x, y, 18)) continue; addNode(W, x, y, rng() < 0.5 ? 'rock' : 'scrap'); }
  for (let i = 0; i < 600; i++) addBush(W, rr(30, S * T - 30), rr(30, S * T - 30));
  for (let i = 0; i < cfg.crates; i++) { const x = rr(400, S * T - 100), y = rr(100, S * T - 100); if (!freeAt(W, x, y, 14)) continue; const r = rng(); addCrate(W, x, y, r < 0.3 ? 0 : r < 0.65 ? 1 : r < 0.9 ? 2 : 3); }
}
function makeExpWorld(seed, biomeId, danger) {
  const B = BIOMES[biomeId], W = baseWorld('exp', 64, seed); W.biome = biomeId; W.name = B.n.toUpperCase(); W.danger = danger;
  const dims = { bunker: [48, 38], tank: [42, 26], sandbag: [8, 34], tower: [24, 24], container: [50, 17], pump: [24, 14], hut: [28, 23], skull: [0, 0], labbox: [37, 27], antenna: [8, 8] };
  const props = []; for (let k = 0; k < 34; k++) { const kind = rpick(W.rng, B.props), d = dims[kind]; props.push({ kind: kind === 'tower' ? 'wtower' : kind, hw: d[0], hd: d[1], solid: kind !== 'skull', crate: kind === 'bunker' || kind === 'labbox', col: rpick(W.rng, ['#a0522d', '#2e5e8a', '#4b5d3a']), ph: W.rng() * 6 }); }
  if (biomeId === 'lab' || biomeId === 'military') { road(W, 9, 32, 60, 32); road(W, 34, 6, 34, 60); }
  genOpenWorld(W, { props, treeN: B.treeN, trees: B.trees, node: B.node, crates: 7 + danger * 3 });
  W.exHeli = { x: W.lz.x, y: W.lz.y + 10, z: 0, a: 0, wreck: false, up: {}, rot: 0, rotSpd: 6 };
  addProp(W, 'hpad', W.lz.x, W.lz.y + 10, { solid: false, light: 200, lcol: '255,90,70', safe: true });
  if (B.node === 'crystal') for (const n of W.nodes) if (n.kind === 'crystal') W.lightsStatic.push({ x: n.x, y: n.y, r: 90, col: '200,120,255', safe: false, node: n });
  finishWorld(W); return W;
}
function makePlanetWorld(pid) {
  const P0 = PLANETS.find(p => p.id === pid), W = baseWorld('planet', 72, 9000 + PLANETS.indexOf(P0) * 77 + ((S && S.seed) || 0) % 997);
  W.planet = P0; W.name = P0.n + ' · ' + P0.sub.toUpperCase(); W.danger = P0.danger;
  const props = []; for (let k = 0; k < 24; k++) { const r = W.rng(); props.push(r < 0.35 ? { kind: 'monolith', hw: 20, hd: 20, col: P0.col[2] } : r < 0.7 ? { kind: 'alienpod', hw: 15, hd: 15, col: P0.col[0], solid: true } : { kind: 'wreckship', hw: 60, hd: 30, crate: true }); }
  genOpenWorld(W, { props, treeN: 320, trees: P0.trees, node: P0.node, crates: 6 });
  for (const n of W.nodes) if (n.kind === P0.node) W.lightsStatic.push({ x: n.x, y: n.y, r: 100, col: P0.light, safe: false, node: n });
  for (const p of W.props) if (p.kind === 'monolith' || p.kind === 'alienpod') W.lightsStatic.push({ x: p.x, y: p.y, r: 110, col: P0.light, safe: false });
  W.shipPad = { x: W.lz.x, y: W.lz.y };
  addProp(W, 'shipdock', W.lz.x, W.lz.y, { solid: false, light: 220, lcol: '120,220,255', safe: true });
  finishWorld(W); return W;
}
// =========================================================
// WELTRAUM & STATION
// =========================================================
function makeSpaceWorld(at) {
  const W = baseWorld('space', 80, 5000 + PLANETS.findIndex(p => p.id === at) * 13), rng = W.rng, T = TILE, S = W.size;
  W.name = 'ORBIT · ' + PLANETS.find(p => p.id === at).n; W.at = at; W.planet = PLANETS.find(p => p.id === at);
  W.station = { x: S * T / 2, y: S * T / 2 };
  W.stationProp = addProp(W, 'station', W.station.x, W.station.y, { hw: 130, hd: 130, owned: false });
  for (let i = 0; i < 70; i++) { const x = rng() * S * T, y = rng() * S * T; if (Math.hypot(x - W.station.x, y - W.station.y) < 600) continue; addNode(W, x, y, rng() < 0.3 ? 'titanrock' : 'asteroid'); }
  for (let i = 0; i < 5; i++) { const x = rng() * S * T, y = rng() * S * T; if (Math.hypot(x - W.station.x, y - W.station.y) < 500) continue; addCrate(W, x, y, rng() < 0.5 ? 1 : 2, true); }
  W.stars = []; for (let i = 0; i < 260; i++) W.stars.push({ x: rng(), y: rng(), s: rng() * 2 + 0.5, d: rng() * 0.6 + 0.2, c: rpick(rng, ['#ffffff', '#cfe6ff', '#ffe6c0', '#c8b8ff']) });
  W.ambient = 'space';
  return W;
}
function makeStationWorld(owned) {
  const W = baseWorld('station', 30, 3131), T = TILE, S = 30;
  W.name = owned ? 'STATION »AURORA« (DEINE)' : 'VERLASSENE STATION'; W.ambient = 'station'; W.owned = owned;
  for (let i = 0; i < S * S; i++) W.tiles[i] = 10;
  const wall = (x, y, len, vert) => addProp(W, 'stwall', x * T, y * T, { len: len * T, hw: len * T / 2, hd: 8, ang: vert ? Math.PI / 2 : 0, owned });
  wall(15, 2, 26); wall(15, 28, 26); wall(2, 15, 26, true); wall(28, 15, 26, true);
  wall(8, 10, 10); wall(22, 10, 10); wall(8, 20, 10); wall(22, 20, 10); wall(10, 5.5, 5, true); wall(20, 24.5, 5, true);
  W.core = addProp(W, 'core', 15 * T, 15 * T, { hw: 35, hd: 35, owned, light: 260, lcol: owned ? '95,212,255' : '255,94,58', safe: false });
  W.holo = addProp(W, 'holo', 22 * T, 6 * T, { hw: 45, hd: 45, light: 200, lcol: '95,212,255', safe: false });
  W.shipPad = { x: 6 * T, y: 24 * T }; addProp(W, 'shipdock', W.shipPad.x, W.shipPad.y, { solid: false, light: 200, lcol: '255,200,120', safe: false });
  for (const [x, y] of [[5, 5], [25, 5], [25, 25], [13, 7], [17, 23], [5, 15], [25, 15]]) addProp(W, 'console', x * T, y * T, { hw: 15, hd: 9, owned, light: 90, lcol: owned ? '95,212,255' : '255,120,80', safe: false });
  for (const [x, y] of [[24, 18], [24, 21]]) addProp(W, 'bunk', x * T, y * T, { hw: 25, hd: 11 });
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) W.lightsStatic.push({ x: (4 + i * 3) * T, y: (j ? 26 : 4) * T, r: 130, col: owned ? '180,220,255' : '255,120,90', safe: false });
  if (!owned) for (const [x, y, r] of [[4, 8, 2], [26, 8, 1], [10, 26, 2], [26, 26, 3], [15, 4, 1], [4, 26, 1], [18, 12, 2]]) addCrate(W, x * T, y * T, r, true);
  W.spawn = { x: W.shipPad.x + 80, y: W.shipPad.y - 40 };
  finishWorld(W); return W;
}

// =========================================================
// NEU-EDEN: Oberstadt (Piltover-Stil) & Unterstadt (Zaun-Stil)
// =========================================================
function makeCityWorld(level) {
  const W = baseWorld(level, 40, level === 'city' ? 777 : 666), S = 40, T = TILE, rng = W.rng, rr = (a, b) => a + rng() * (b - a);
  W.name = level === 'city' ? 'NEU-EDEN · OBERSTADT' : 'NEU-EDEN · UNTERSTADT';
  const st = (gx, gy, a, look, station, name) => addNpc(W, gx * T, gy * T, a, look, station, name);
  if (level === 'city') {
    for (let i = 0; i < S * S; i++) W.tiles[i] = 5;
    for (let i = 3; i < 37; i++) for (let k = 0; k < 3; k++) { setTile(W, i, 18 + k, 6); setTile(W, 19 + k, i, 6); }
    for (const [x0, y0, w, h] of [[3, 3, 6, 5], [30, 30, 7, 6], [3, 25, 6, 5]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) setTile(W, x0 + i, y0 + j, 0);
    for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2]]) addProp(W, 'citywall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang, H: 110 });
    addProp(W, 'citywall', (S - 0.4) * T, 8 * T, { len: 16 * T, hw: 8 * T, hd: 14, ang: Math.PI / 2, H: 110 }); addProp(W, 'citywall', (S - 0.4) * T, 31 * T, { len: 18 * T, hw: 9 * T, hd: 14, ang: Math.PI / 2, H: 110 });
    addProp(W, 'innergate', (S - 1.2) * T, 19.5 * T, { hw: 16, hd: 76 });
    addProp(W, 'rathaus', 19.5 * T, 6.5 * T, { hw: 140, hd: 110 });
    addProp(W, 'royal', 31 * T, 11 * T, { hw: 125, hd: 105, light: 260, lcol: '255,210,90', lx: 150 });
    addProp(W, 'shop', 9 * T, 13 * T, { hw: 66, hd: 56, col: '#3b4d74' }); addProp(W, 'shop', 9 * T, 21.5 * T, { hw: 66, hd: 56, col: '#3f7f7a' });
    addProp(W, 'shop', 30 * T, 23.5 * T, { hw: 66, hd: 56, col: '#a5503a' }); addProp(W, 'shop', 26 * T, 30.5 * T, { hw: 66, hd: 56, col: '#34466a' });
    addProp(W, 'skyloft', 13 * T, 32 * T, { hw: 72, hd: 62 }); addProp(W, 'villa', 33 * T, 34 * T, { hw: 100, hd: 80 });
    addProp(W, 'clocktower', 27 * T, 4 * T, { hw: 30, hd: 30 }); addProp(W, 'glassdome', 6 * T, 5.5 * T, { hw: 75, hd: 60 });
    addProp(W, 'pilthouse', 6 * T, 28 * T, { w: 100, d: 90, H: 90, col: '#3f7f7a', seed: 3, hw: 52, hd: 47 }); addProp(W, 'pilthouse', 36 * T, 3.5 * T, { w: 80, d: 70, H: 80, col: '#a5503a', seed: 8, hw: 42, hd: 37 });
    addProp(W, 'elevator', 19.5 * T, 30 * T, { hw: 38, hd: 38, light: 120, lcol: '160,255,140', col: '#ffd84a' });
    addProp(W, 'fountain', 20 * T, 19.5 * T, { hw: 46, hd: 46 });
    for (let i = 5; i < 36; i += 4) { if (i > 16 && i < 23) continue; addProp(W, 'lamppost', i * T, 17.6 * T, { hw: 4, hd: 4, light: 150, lcol: '255,230,170', nightOnly: true }); addProp(W, 'lamppost', i * T, 21.4 * T, { hw: 4, hd: 4, light: 150, lcol: '255,230,170', nightOnly: true }); }
    for (let i = 5; i < 36; i += 6) { if (i > 15 && i < 24) continue; addProp(W, 'bench', 22.4 * T, i * T, { hw: 6, hd: 17, ang: Math.PI / 2 }); addProp(W, 'planter', 17.4 * T, i * T, { hw: 15, hd: 15, flowers: true }); }
    for (let k = 0; k < 14; k++) { const r = rpick(rng, [[3, 3, 6, 5], [30, 30, 7, 6], [3, 25, 6, 5]]); const x = (r[0] + rr(0.5, r[2] - 0.5)) * T, y = (r[1] + rr(0.5, r[3] - 0.5)) * T; if (freeAt(W, x, y, 20)) addTree(W, x, y, rpick(rng, ['oak', 'birch']), { deco: true }); }
    for (let i = 0; i < 3; i++) W.airships.push({ x: rr(0, S * T), y: rr(0, S * T), z: 260 + i * 40, a: rr(0, 6.28), sp: rr(20, 40) });
    st(13.8, 13, 0, npcLook('rich', rng), 'market', 'Händlerin Mara');
    st(13.8, 21.5, 0, npcLook('rich', rng), 'broker', 'Makler Vossberg');
    st(34.8, 23.5, Math.PI, npcLook('rich', rng), 'jobs', 'Jobvermittlung');
    st(30.8, 30.5, Math.PI, npcLook('rich', rng), 'courier', 'Kurier-Zentrale');
    st(23, 9.5, Math.PI / 2, Object.assign(npcLook('rich', rng), { hat: 'Zylinder' }), 'townhall', 'Stadtschreiber Okoro');
    st(35.5, 11, Math.PI, Object.assign(npcLook('rich', rng), { coat: '#1b1b22' }), 'royal', 'ROYAL CASINO');
    st(16.5, 34.5, Math.PI / 2, npcLook('spacer', rng), 'shipyard', 'Werft »Sternenschmiede«');
    st(10, 7.5, 0, npcLook('spacer', rng), 'agency', 'Raumfahrtbehörde');
    st(9.5, 30, 0, npcLook('rich', rng), 'home', 'Hausmeister');
    st(22, 30, Math.PI, npcLook('guard', rng), 'elevator', 'Aufzug ↓ Unterstadt');
    st(36, 17, Math.PI, npcLook('guard', rng), 'exit', 'Stadttor');
    for (let k = 0; k < 16; k++) addNpc(W, rr(6, 34) * T, rr(16, 23) * T, rr(0, 6), npcLook('rich', rng), null, null, { wander: true });
    W.spawn = { x: 36 * T, y: 19.5 * T }; W.ambient = 'day';
  } else {
    for (let i = 0; i < S * S; i++) W.tiles[i] = 7;
    for (let i = 2; i < 38; i++) for (let k = 0; k < 2; k++) { setTile(W, i, 19 + k, 4); setTile(W, 19 + k, i, 4); }
    for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2], [(S - 0.4) * T, S * T / 2, Math.PI / 2]]) addProp(W, 'citywall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang });
    const glows = [['255,63,164', '#ff3fa4'], ['95,255,138', '#5fff8a'], ['255,176,74', '#ffb04a']];
    let si = 0;
    for (const gx of [6, 13, 27, 34]) for (const gy of [5, 13, 27, 34]) { if ((gx === 13 || gx === 27) && gy === 5) continue; if (gx === 34 && gy === 34) continue; if (gx === 13 && gy === 34) continue; addProp(W, 'zaunhouse', gx * T, gy * T, { w: 100, d: 90, H: 60 + (si % 3) * 25, seed: 50 + si++, hw: 52, hd: 47, light: 110, lcol: rpick(rng, glows)[0], safe: false }); }
    addProp(W, 'neoncasino', 20 * T, 8 * T, { hw: 110, hd: 92, light: 300, lcol: '255,63,164', lx: 130 });
    addProp(W, 'neonbar', 8 * T, 21 * T, { hw: 80, hd: 66, col: '#ff3fa4', col2: '#5fff8a', light: 210, lcol: '255,63,164', lx: 90, seed: 31 });
    addProp(W, 'neonbar', 31 * T, 23 * T, { hw: 80, hd: 66, col: '#ffb04a', col2: '#5fff8a', light: 210, lcol: '95,255,138', lx: 90, seed: 32 });
    addProp(W, 'blackmarket', 9 * T, 34 * T, { hw: 52, hd: 30, light: 120, lcol: '95,255,138' });
    addProp(W, 'cityhome', 31 * T, 34.5 * T, { hw: 52, hd: 47 });
    addProp(W, 'elevator', 20 * T, 33 * T, { hw: 38, hd: 38, light: 140, lcol: '160,255,140', col: '#5fff8a', cab: 120, zaun: true });
    addProp(W, 'pipebridge', 20 * T, 15 * T, { len: 520, hw: 6, hd: 6, solid: false }); addProp(W, 'pipebridge', 26 * T, 26 * T, { len: 420, hw: 6, hd: 6, ang: Math.PI / 2, solid: false });
    for (const [x, y] of [[15, 25], [25, 15], [4, 30]]) addProp(W, 'chemvat', x * T, y * T, { hw: 25, hd: 25, light: 120, lcol: '95,255,138', safe: false });
    for (let k = 0; k < 12; k++) { const x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 34)) continue; addProp(W, 'stall', x, y, { hw: 24, hd: 18, col: rpick(rng, ['#8a2a2a', '#2a6a5a', '#7a5a2a']), light: 80, lcol: '255,200,120', safe: false }); }
    for (let k = 0; k < 10; k++) { const n = rpick(rng, glows), x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 30)) continue; addProp(W, 'neonsign', x, y, { hw: 4, hd: 26, col: n[1], col2: rpick(rng, glows)[1], light: 100, lcol: n[0], safe: false, ang: rng() < 0.5 ? 0 : Math.PI / 2 }); }
    for (let k = 0; k < 10; k++) { const x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 20)) continue; addProp(W, 'barrelfire', x, y, { hw: 9, hd: 9, light: 120, lcol: '255,140,60', flick: true, safe: false }); }
    for (let k = 0; k < 14; k++) { const x = rr(3, 37) * T, y = rr(3, 37) * T; if (!freeAt(W, x, y, 20)) continue; addProp(W, 'trash', x, y, { solid: false }); }
    st(20, 13.5, Math.PI / 2, npcLook('punk', rng), 'neon', 'Casino »DIE GRUBE«');
    st(13.5, 21, 0, npcLook('punk', rng), 'bar', 'Bar »Rostiger Anker«');
    st(36, 23, Math.PI, npcLook('punk', rng), 'bar2', 'Bar »Letzter Tropfen«');
    st(12, 37, Math.PI / 2, Object.assign(npcLook('punk', rng), { hat: 'Bandana' }), 'black', 'Schwarzmarkt');
    st(27, 30, Math.PI, Object.assign(npcLook('punk', rng), { hat: 'Zylinder', coat: '#1a1a1a' }), 'fixer', 'Der Fixer');
    st(35, 34.5, Math.PI, npcLook('punk', rng), 'home', 'Kellerloch-Vermieterin');
    st(22.5, 33, Math.PI, npcLook('guard', rng), 'elevator', 'Aufzug ↑ Oberstadt');
    for (let k = 0; k < 20; k++) addNpc(W, rr(4, 36) * T, rr(4, 36) * T, rr(0, 6), npcLook('punk', rng), null, null, { wander: true });
    W.spawn = { x: 22.5 * T, y: 30 * T }; W.ambient = 'under';
  }
  finishWorld(W); return W;
}

function finishWorld(W) {
  const rng = mulberry32(W.seed + 99), S = W.size, T = TILE;
  let cols = W.biome === 'desert' ? ['#a8a050', '#b8b060', '#98904a', '#c0b870'] : W.biome === 'lab' ? ['#8aa8a0', '#9ab8b0', '#7a9890', '#aac8c0'] : W.biome === 'swamp' ? ['#2f5a3a', '#3a6a3a', '#2a4a3a', '#5a4a6a'] : ['#4f9b43', '#62ad4b', '#3e8a3a', '#78bd52'];
  if (W.planet && W.kind === 'planet') cols = [W.planet.col[0], hexShade(W.planet.col[0], 0.75), W.planet.col[2], hexShade(W.planet.col[1], 1.3)];
  W.grassCols = cols;
  if (W.kind === 'space' || W.kind === 'station') return;
  const n = W.kind === 'main' ? S * S * 0.62 : (W.kind === 'exp' || W.kind === 'planet') ? S * S * 0.5 : S * S * 0.12;
  for (let i = 0; i < n; i++) {
    const x = rng() * S * T, y = rng() * S * T, t = tileType(W, x, y);
    if (!(t === 0 || t === 2 || t === 19 || (t === 3 && rng() < 0.3) || (t === 4 && rng() < 0.2))) continue;
    W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 8 + rng() * 12, c: Math.floor(rng() * 4), ph: rng() * 6 });
  }
  if (W.kind === 'main' && W.mask) for (let i = 0; i < 26000; i++) { const x = rng() * S * T, y = rng() * S * T, gx = Math.floor(x / T), gy = Math.floor(y / T); if (W.mask[gy * S + gx] !== 1 || W.tiles[gy * S + gx] !== 0) continue; W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 16 + rng() * 16, c: Math.floor(rng() * 4), ph: rng() * 6 }); }
  if (W.kind === 'main') for (let i = 0; i < 9000; i++) { const x = rng() * (GRASS_RECT.x1 - GRASS_RECT.x0) * T + GRASS_RECT.x0 * T, y = rng() * (GRASS_RECT.y1 - GRASS_RECT.y0) * T + GRASS_RECT.y0 * T; if (tileType(W, x, y) === 3) continue; W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 18 + rng() * 18, c: Math.floor(rng() * 4), ph: rng() * 6 }); }
}

// ---------- Boden-Chunks ----------
function tileColor(W, t, n, r) {
  const B = W.biome ? BIOMES[W.biome] : null, PL = W.kind === 'planet' ? W.planet : null;
  switch (t) {
    case 0: if (PL) return hsl2hex(PL.ground[0] + n * 12, PL.ground[1], PL.ground[2] + n * 5 + r * 2); return B ? hsl2hex(B.grass[0] + n * 10, B.grass[1], B.grass[2] + n * 5 + r * 2) : hsl2hex(102 + n * 18, 46, 30 + n * 6 + r * 2);
    case 2: if (PL) return hsl2hex(PL.dirt[0], PL.dirt[1], PL.dirt[2] + n * 6); return B ? hsl2hex(B.dirt[0], B.dirt[1], B.dirt[2] + n * 6) : hsl2hex(32, 30, 30 + n * 6);
    case 3: return hsl2hex(220, 5, 24 + n * 4 + r * 2);
    case 4: return W.ambient === 'under' ? hsl2hex(150, 8, 22 + n * 3 + r * 2) : hsl2hex(40, 6, 50 + n * 4 + r * 2);
    case 5: return hsl2hex(40, 30, 84 + n * 3);
    case 6: return hsl2hex(32, 34, 70 + n * 4);
    case 7: return hsl2hex(150, 14, 12 + n * 3 + r * 2);
    case 8: return hsl2hex(70, 6, 44 + n * 4);
    case 10: return hsl2hex(210, 10, 26 + n * 3 + r * 2);
    case 11: return '#120e0a';
    case 12: case 15: return hsl2hex(30, 10, (W.kind === 'city' ? 52 : 44) + n * 4);
    case 13: return hsl2hex(40, 40, 80);
    case 14: return hsl2hex(205, 30, 93 + n * 2);
    case 16: return hsl2hex(38, 16, 72 + n * 3);
    case 17: return hsl2hex(150, 12, 15 + n * 3 + r * 2);
    case 18: return hsl2hex(160, 8, 13);
    case 19: return hsl2hex(95, 32, 19 + n * 4 + r * 2);
    case 21: return hsl2hex(40, 6, 46 + n * 4);
    case 22: return hsl2hex(60, 4, 42 + n * 4 + r * 2);
    case 23: return hsl2hex(30, 18, 20 + n * 4 + r * 2);
  }
  return '#16301d';
}
function renderChunk(W, cx, cy) {
  const cw = Math.ceil(2 * CH * TILE * IX), chh = Math.ceil(2 * CH * TILE * IY) + GPAD + GPADB;
  const RS = (W.kind === 'city' || W.kind === 'under') ? 2 : 1;
  const cv = document.createElement('canvas'); cv.width = cw * RS; cv.height = chh * RS;
  const g = cv.getContext('2d'), sG = G, sV = Object.assign({}, VIEW);
  G = g; Object.assign(VIEW, { cx: cx * CH * TILE, cy: cy * CH * TILE, ox: CH * TILE * IX * RS, oy: GPAD * RS, zoom: RS });
  const rng = mulberry32(W.seed * 7 + cx * 1013 + cy * 7919), S = W.size, T = TILE, gx0 = cx * CH, gy0 = cy * CH;
  const HC = W.kind === 'planet' ? [W.planet.col[0], hexShade(W.planet.col[0], 0.7), W.planet.col[2]] : W.biome === 'desert' ? ['#a8a050', '#8a8040'] : W.biome === 'lab' ? ['#7a9890', '#6a8880', '#ffffff'] : W.biome === 'swamp' ? ['#2a5a3a', '#3a6a3a', '#5a4a6a'] : ['#3d7f35', '#4f9b43', '#62ad4b', '#2f6b2e', '#78bd52'];
  const HB = HC.map(() => []);
  for (let gy = gy0; gy < Math.min(S, gy0 + CH); gy++) for (let gx = gx0; gx < Math.min(S, gx0 + CH); gx++) {
    const t = W.tiles[gy * S + gx], n = W.noise(gx * 1.7, gy * 1.7), col = tileColor(W, t, n, rng());
    if (t !== 11 && t !== 20 && t !== 21) { tileDiamond(gx, gy, 1, 1); g.fillStyle = col; g.fill(); g.strokeStyle = col; g.lineWidth = 1; g.stroke(); }
    if (t >= 11 && drawTileDetail(g, W, t, gx, gy, rng)) continue;
    if (t === 4 || t === 5 || t === 6 || t === 8 || t === 10) { g.strokeStyle = t === 10 ? 'rgba(120,180,220,0.18)' : 'rgba(0,0,0,0.12)'; tileDiamond(gx, gy, 1, 1); g.stroke(); if (t === 6 || t === 5) { tileDiamond(gx + 0.25, gy + 0.25, 0.5, 0.5); g.fillStyle = t === 5 ? 'rgba(201,149,42,0.12)' : 'rgba(255,255,255,0.1)'; g.fill(); } }
    if (t === 10 && (gx + gy) % 3 === 0) { tileDiamond(gx + 0.1, gy + 0.1, 0.8, 0.8); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.stroke(); }
    if (t === 3) {
      const m = W.roadMark[gy * S + gx]; g.strokeStyle = 'rgba(240,200,60,0.75)'; g.lineWidth = 2;
      const dash = (ax, ay, bx, by) => { const a = P(ax, ay, 0), b = P(bx, by, 0); g.beginPath(); g.moveTo(lerp(a.x, b.x, 0.2), lerp(a.y, b.y, 0.2)); g.lineTo(lerp(a.x, b.x, 0.7), lerp(a.y, b.y, 0.7)); g.stroke(); };
      if (m === 1 && gx % 2 === 0) dash(gx * T, (gy + 1) * T, (gx + 1) * T, (gy + 1) * T); if (m === 2 && gy % 2 === 0) dash((gx + 1) * T, gy * T, (gx + 1) * T, (gy + 1) * T);
      for (let k = 0; k < 2; k++) if (rng() < 0.5) { const a = P((gx + rng()) * T, (gy + rng()) * T, 0); g.strokeStyle = 'rgba(10,10,10,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + (rng() - 0.5) * 20, a.y + (rng() - 0.5) * 10); g.stroke(); }
    }
    if (t === 7 && rng() < 0.22) { const a = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = rng() < 0.6 ? 'rgba(95,255,138,0.12)' : 'rgba(255,63,164,0.12)'; g.beginPath(); g.ellipse(a.x, a.y, 16 + rng() * 10, 6 + rng() * 4, 0, 0, 6.28); g.fill(); }
    const grassy = t === 0 || t === 2 || t === 19, crack = t === 3 || t === 4 || t === 8;
    let halms = grassy ? (W.kind === 'main' || W.kind === 'exp' || W.kind === 'planet' ? 13 : 3) : crack ? (W.kind === 'main' || W.kind === 'exp' ? 3 : 0) : 0;
    if (W.biome === 'desert' && grassy) halms = 2; if (W.kind === 'main' && ((inRect(gx, gy, GRASS_RECT) && grassy) || (W.mask && W.mask[gy * S + gx] === 1))) halms = 30;
    for (let k = 0; k < halms; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0), h = 3 + rng() * 9; HB[Math.floor(rng() * HC.length)].push(p.x, p.y, p.x + (rng() - 0.5) * 4, p.y - h); }
    if (grassy && rng() < 0.6) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = W.biome === 'lab' ? 'rgba(255,255,255,0.35)' : W.biome === 'desert' ? 'rgba(255,240,200,0.18)' : 'rgba(30,70,30,0.25)'; g.beginPath(); g.ellipse(p.x, p.y, 10 + rng() * 22, 5 + rng() * 10, 0, 0, 6.28); g.fill(); }
    if (grassy && (W.kind === 'main' || W.kind === 'planet')) for (let k = 0; k < 2.5; k++) if (rng() < 0.8) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = W.kind === 'planet' ? rpick(rng, [W.planet.col[2], '#ffffff', W.planet.col[0]]) : ['#ffd84a', '#ff7eb6', '#ffffff', '#b58cff', '#ff6b4a', '#7fd8ff'][Math.floor(rng() * 6)]; g.fillRect(p.x - 1.5, p.y - 4, 3, 3); }
    if (rng() < 0.5) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(140,140,120,0.5)'; g.fillRect(p.x, p.y, 2 + rng() * 3, 1.5); }
  }
  g.lineWidth = 1.2;
  for (let c = 0; c < HC.length; c++) { const a = HB[c]; if (!a.length) continue; g.strokeStyle = HC[c]; g.beginPath(); for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); } g.stroke(); }
  G = sG; Object.assign(VIEW, sV);
  return cv;
}
const GCACHE = { cv: null, g: null, W: null, vx: 0, vy: 0, zoom: 1, incomplete: true };
function composeGround(W, g, cw, ch) {
  const k = VIEW.zoom, NC = W.NC, cwc = Math.ceil(2 * CH * TILE * IX), chc = Math.ceil(2 * CH * TILE * IY) + GPAD + GPADB;
  let made = 0, missing = false;
  g.fillStyle = W.ambient === 'under' ? '#060c0a' : W.kind === 'tower' ? '#0b0a09' : W.kind === 'station' ? '#03050a' : '#16301d'; g.fillRect(0, 0, cw, ch);
  for (let cy = 0; cy < NC; cy++) for (let cx = 0; cx < NC; cx++) {
    const p = P(cx * CH * TILE, cy * CH * TILE, 0), x0 = p.x - CH * TILE * IX * k, y0 = p.y - GPAD * k, w = cwc * k, h = chc * k;
    if (x0 > cw || y0 > ch || x0 + w < 0 || y0 + h < 0) continue;
    const key = cy * NC + cx; let c = W.chunks.get(key);
    if (!c && made < 3) { c = renderChunk(W, cx, cy); made++; }
    if (c) { W.chunks.delete(key); W.chunks.set(key, c); g.drawImage(c, x0, y0, w, h); }
    else { missing = true; const a = P(cx * CH * TILE, cy * CH * TILE, 0), b = P((cx + 1) * CH * TILE, cy * CH * TILE, 0), cc = P((cx + 1) * CH * TILE, (cy + 1) * CH * TILE, 0), d = P(cx * CH * TILE, (cy + 1) * CH * TILE, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(cc.x, cc.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = tileColor(W, 0, 0, 0.5); g.fill(); }
  }
  while (W.chunks.size > 170) W.chunks.delete(W.chunks.keys().next().value);
  return missing;
}
function drawSpace(W) {
  const sw = innerWidth, sh = innerHeight, t = performance.now() / 1000;
  const gr = G.createLinearGradient(0, 0, 0, sh); gr.addColorStop(0, '#02030a'); gr.addColorStop(1, '#0a0820'); G.fillStyle = gr; G.fillRect(0, 0, sw, sh);
  const neb = G.createRadialGradient(sw * 0.25, sh * 0.3, 10, sw * 0.25, sh * 0.3, sw * 0.6); neb.addColorStop(0, 'rgba(120,60,200,0.22)'); neb.addColorStop(1, 'rgba(0,0,0,0)'); G.fillStyle = neb; G.fillRect(0, 0, sw, sh);
  for (const s of W.stars) { const x = ((s.x * sw * 2 - (VIEW.cx - VIEW.cy) * 0.05 * s.d) % sw + sw) % sw, y = ((s.y * sh * 2 - (VIEW.cx + VIEW.cy) * 0.03 * s.d) % sh + sh) % sh; G.globalAlpha = 0.5 + Math.sin(t * 2 + s.x * 50) * 0.3; G.fillStyle = s.c; G.fillRect(x, y, s.s, s.s); }
  G.globalAlpha = 1;
  const pl = W.planet, px = sw * 0.78 - (VIEW.cx - VIEW.cy) * 0.02, py = sh * 1.05 - (VIEW.cx + VIEW.cy) * 0.01, pr = Math.min(sw, sh) * 0.62;
  const pg = G.createRadialGradient(px - pr * 0.3, py - pr * 0.4, pr * 0.1, px, py, pr); pg.addColorStop(0, pl.col[2]); pg.addColorStop(0.35, pl.col[0]); pg.addColorStop(1, pl.col[1]);
  G.fillStyle = pg; G.beginPath(); G.arc(px, py, pr, 0, 6.283); G.fill();
  G.save(); G.beginPath(); G.arc(px, py, pr, 0, 6.283); G.clip(); G.globalAlpha = 0.18; for (let i = 0; i < 7; i++) { G.fillStyle = i % 2 ? '#ffffff' : pl.col[1]; G.fillRect(px - pr, py - pr + i * pr * 0.3 + Math.sin(t * 0.1 + i) * 10, pr * 2, pr * 0.08); } G.restore(); G.globalAlpha = 1;
  const atm = G.createRadialGradient(px, py, pr * 0.95, px, py, pr * 1.12); atm.addColorStop(0, 'rgba(' + hexToRgbStr(pl.col[2]) + ',0.5)'); atm.addColorStop(1, 'rgba(0,0,0,0)'); G.fillStyle = atm; G.beginPath(); G.arc(px, py, pr * 1.12, 0, 6.283); G.fill();
}
function drawGround(W) {
  if (W.kind === 'space') { drawSpace(W); return; }
  const sw = innerWidth, sh = innerHeight, C = GCACHE, cw = Math.ceil(sw * 1.5), ch = Math.ceil(sh * 1.5);
  let r = C.cv ? VIEW.zoom / C.zoom : 1, need = !C.cv || C.W !== W || C.incomplete || Math.abs(r - 1) > 0.025 || C.cv.width !== cw || C.cv.height !== ch;
  let dx = 0, dy = 0;
  if (!need) { const s = P(C.vx, C.vy, 0); dx = s.x - cw / 2 * r; dy = s.y - ch / 2 * r; if (dx > 0 || dy > 0 || dx + cw * r < sw || dy + ch * r < sh) need = true; }
  if (need) {
    if (!C.cv) { C.cv = document.createElement('canvas'); C.g = C.cv.getContext('2d'); }
    if (C.cv.width !== cw || C.cv.height !== ch) { C.cv.width = cw; C.cv.height = ch; }
    const sV = Object.assign({}, VIEW), sG = G;
    Object.assign(VIEW, { ox: cw / 2 + (VIEW.ox - sw / 2), oy: ch / 2 + (VIEW.oy - sh / 2) });
    const vx = screenToWorld(cw / 2, ch / 2); Object.assign(VIEW, { cx: vx.x, cy: vx.y, ox: cw / 2, oy: ch / 2 });
    G = C.g; C.incomplete = composeGround(W, C.g, cw, ch); G = sG; Object.assign(VIEW, sV);
    C.vx = vx.x; C.vy = vx.y; C.zoom = VIEW.zoom; C.W = W; r = 1;
    const s = P(C.vx, C.vy, 0); dx = s.x - cw / 2; dy = s.y - ch / 2;
  }
  G.drawImage(C.cv, dx, dy, cw * r, ch * r);
}
function prewarmChunks(W, x, y, r) {
  if (W.kind === 'space') return;
  const cx0 = Math.floor(x / TILE / CH), cy0 = Math.floor(y / TILE / CH);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const cx = cx0 + i, cy = cy0 + j; if (cx < 0 || cy < 0 || cx >= W.NC || cy >= W.NC) continue; const key = cy * W.NC + cx; if (!W.chunks.has(key)) W.chunks.set(key, renderChunk(W, cx, cy)); }
  GCACHE.incomplete = true;
}
function visibleChunks(W, extraBottom) {
  const pts = [screenToWorld(-100, -150), screenToWorld(innerWidth + 100, -150), screenToWorld(-100, innerHeight + (extraBottom || 600)), screenToWorld(innerWidth + 100, innerHeight + (extraBottom || 600))];
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const cx0 = clamp(Math.floor(Math.min(...xs) / TILE / CH), 0, W.NC - 1), cx1 = clamp(Math.floor(Math.max(...xs) / TILE / CH), 0, W.NC - 1), cy0 = clamp(Math.floor(Math.min(...ys) / TILE / CH), 0, W.NC - 1), cy1 = clamp(Math.floor(Math.max(...ys) / TILE / CH), 0, W.NC - 1);
  const out = []; for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.push(cy * W.NC + cx); return out;
}
function buildMinimapBase(W, size, showEden) {
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const g = cv.getContext('2d'), img = g.createImageData(size, size), WW = W.size * TILE;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = (i / size - 0.5) * 2 * WW, v = j / size * 2 * WW, x = (u + v) / 2, y = (v - u) / 2, idx = (j * size + i) * 4, gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
    let t = tileType(W, x, y), c;
    if (W.kind === 'space') c = t === 9 ? null : [8, 8, 20];
    else if (W.kind === 'main' && inRect(gx, gy, EDEN_RECT)) c = showEden ? [230, 210, 160] : [40, 90, 44];
    else c = t === 9 ? null : ({ 11: [24, 18, 14], 12: [150, 140, 128], 13: [230, 200, 140], 14: [235, 240, 248], 15: [120, 116, 110], 16: [200, 190, 170], 17: [30, 50, 42], 18: [26, 36, 32], 19: [34, 66, 34], 21: [128, 122, 112], 22: [138, 138, 128], 23: [70, 56, 40], 2: [110, 90, 60], 3: [60, 62, 66], 4: [120, 118, 112], 5: [230, 220, 196], 6: [200, 180, 150], 7: [30, 44, 38], 8: [110, 112, 100], 10: [60, 70, 80] }[t] || (W.kind === 'planet' ? [80, 80, 110] : W.biome === 'desert' ? [200, 180, 110] : W.biome === 'lab' ? [220, 228, 232] : W.biome === 'swamp' ? [40, 70, 50] : (W.kind === 'main' && inRect(gx, gy, GRASS_RECT)) ? [130, 160, 70] : [62, 120, 58]));
    if (!c) { img.data[idx + 3] = 0; continue; }
    img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(25,70,30,0.9)'; for (const t of W.trees) { if (t.hp <= 0) continue; const m = worldToMini(t.x, t.y, size, W); g.fillRect(m.x - 0.7, m.y - 0.7, 1.4, 1.4); }
  for (const p of W.props) if (p.kind === 'tower') { const m = worldToMini(p.x, p.y, size, W); g.fillStyle = '#9a958a'; g.fillRect(m.x - 2, m.y - 2, 4, 4); }
  return cv;
}
function worldToMini(x, y, size, W) { const WW = (W ? W.size : MAP) * TILE; return { x: ((x - y) / (2 * WW) + 0.5) * size, y: (x + y) / (2 * WW) * size }; }
;

// ----------------------------- world2.js -----------------------------

// ===================== WELT V10: Wiesen, Wälder, Schluchten · Neu-Eden 2.0 · Bodenmuster =====================
// V11: Schluchten begehbar (W.depth, W.ramp) · 20 = Treppenschacht
const RAVINE_D = 84;
function groundZ(x, y) { const W = S && S.W; if (!W || !W.depth) return 0; const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE); if (gx < 0 || gy < 0 || gx >= W.size || gy >= W.size) return 0; return W.depth[gy * W.size + gx]; }
// Tiles neu: 11 Schlucht, 12 Pflaster, 13 Mosaik, 14 Schnee, 15 Schienen, 16 Gehwegplatten, 17 Nasspflaster, 18 Gitterrost, 19 Waldboden
function buildTerrain(W) {
  const S = W.size, rng = W.rng, rr = (a, b) => a + rng() * (b - a), T = TILE, C = 64;
  W.mask = new Uint8Array(S * S); if (!W.depth) { W.depth = new Float32Array(S * S); W.ramp = new Map(); }
  const avoid = (gx, gy, m) => inZoneV16(gx, gy, m + 3) || inRect(gx, gy, RUIN_RECT, m) || inRect(gx, gy, EDEN_RECT, m + 7) || Math.hypot(gx - C, gy - C) < 13 + m || Math.hypot(gx - RADIO.gx, gy - RADIO.gy) < 11 + m || inRect(gx, gy, GRASS_RECT, m);
  // --- Schluchten ---
  let made = 0;
  for (let k = 0; k < 60 && made < 4; k++) {
    let x = rr(10, 118), y = rr(10, 118); if (avoid(x | 0, y | 0, 5)) continue;
    let a = rr(0, 6.28); const len = Math.floor(rr(26, 44)), cells = new Map();
    for (let s = 0; s < len; s++) {
      a += rr(-0.32, 0.32); x += Math.cos(a); y += Math.sin(a); if (x < 5 || y < 5 || x > 122 || y > 122) break;
      const wd = 1.1 + Math.sin(s / len * Math.PI) * 1.6;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { if (Math.hypot(i, j) > wd) continue; const gx = Math.floor(x + i), gy = Math.floor(y + j); if (avoid(gx, gy, 0)) continue; cells.set(gy * S + gx, [gx, gy]); }
    }
    if (cells.size < 45) continue; made++;
    let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0; const roads = [];
    for (const [gx, gy] of cells.values()) { if (wTile(W, gx, gy) === 3) { roads.push([gx, gy]); continue; } setTile(W, gx, gy, 11); x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy); }
    for (const [gx, gy] of roads) for (const [dx, dy, ang] of [[1, 0, 0], [-1, 0, 0], [0, 1, Math.PI / 2], [0, -1, Math.PI / 2]]) if (wTile(W, gx + dx, gy + dy) === 11) addProp(W, 'bridgerail', (gx + 0.5 + dx * 0.45) * T, (gy + 0.5 + dy * 0.45) * T, { hw: 3, hd: 24, ang: dx ? 0 : Math.PI / 2 });
    W.zones.push({ id: 'ravine' + made, n: 'DIE SCHLUCHT', sub: 'Ein tiefer Riss in der Erde. Steig über die Felspfade hinab – unten glühen Kristalle.', x0: x0 * T, y0: y0 * T, x1: (x1 + 1) * T, y1: (y1 + 1) * T, col: '#c9a36b' });
    let rocks = 0; for (const [gx, gy] of cells.values()) { if (rocks > 12 || rng() > 0.15) continue; for (const [dx, dy] of [[1, 1], [-1, -1], [2, 0], [0, 2]]) { const tx = gx + dx, ty = gy + dy, t = wTile(W, tx, ty); if (t === 0 || t === 2) { addNode(W, (tx + 0.5) * T, (ty + 0.5) * T, 'rock'); rocks++; break; } } }
    const pit = [...cells.values()].filter(([gx, gy]) => wTile(W, gx, gy) === 11);
    for (const [gx, gy] of pit) W.depth[gy * S + gx] = -RAVINE_D;
    const rampAt = [], order = pit.slice().sort(() => rng() - 0.5);
    for (const [gx, gy] of order) {
      if (rampAt.length >= 3) break;
      if (rampAt.some(([x, y]) => Math.hypot(x - gx, y - gy) < 10)) continue;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const rt = wTile(W, gx - dx, gy - dy); if (rt !== 0 && rt !== 2 && rt !== 19) continue;
        if (wTile(W, gx + dx, gy + dy) !== 11 || wTile(W, gx + 2 * dx, gy + 2 * dy) !== 11) continue;
        W.depth[gy * S + gx] = -RAVINE_D / 3; W.depth[(gy + dy) * S + gx + dx] = -RAVINE_D * 2 / 3;
        W.ramp.set(gy * S + gx, [dx, dy, 0]); W.ramp.set((gy + dy) * S + gx + dx, [dx, dy, 1]);
        addProp(W, 'pathsign', (gx - dx + 0.5 - dy * 0.42) * T, (gy - dy + 0.5 - dx * 0.42) * T, { hw: 3, hd: 3, solid: false });
        rampAt.push([gx, gy]); break;
      }
    }
    const floor = pit.filter(([gx, gy]) => W.depth[gy * S + gx] === -RAVINE_D && !W.ramp.has(gy * S + gx)).sort(() => rng() - 0.5);
    const rawNode = (gx, gy, kind, sc) => { const x = (gx + 0.3 + rng() * 0.4) * T, y = (gy + 0.3 + rng() * 0.4) * T, n = { x, y, kind, hp: 100, max: 100, respawn: 0, wob: 0, sc: sc || (0.9 + rng() * 0.35), pit: true }; n.parts = rockParts(n); W.nodes.push(n); W.chunkObjs[chunkIdx(W, x, y)].nodes.push(n); addBucket(W, n, 'node'); return n; };
    floor.slice(0, 3).forEach(([gx, gy]) => { const n = rawNode(gx, gy, 'crystal', 1.25); W.lightsStatic.push({ x: n.x, y: n.y, r: 95, col: '200,120,255', safe: false, node: n }); });
    floor.slice(3, 6).forEach(([gx, gy], i) => rawNode(gx, gy, i ? 'scrap' : 'rock'));
    if (floor[6]) { const [gx, gy] = floor[6]; W.crates.push({ x: (gx + 0.5) * T, y: (gy + 0.5) * T, rarity: 2, opening: 0, open: false, hold: 0, pit: true }); }
    W.ravines = (W.ravines || 0) + 1;
  }
  // --- Wiesen ---
  const names = ['WILDBLUMENWIESE', 'SONNENWIESE', 'MOHNFELD', 'KLEEWIESE', 'LICHTUNG', 'HIRTENWIESE', 'GLÜHWÜRMCHENWIESE'];
  for (let k = 0, m = 0; k < 80 && m < 7; k++) {
    const cx = rr(10, 118), cy = rr(10, 118), r = rr(5.5, 9.5); if (avoid(cx | 0, cy | 0, Math.ceil(r)) ) continue;
    let bad = false; for (let j = -r; j <= r && !bad; j++) for (let i = -r; i <= r; i++) if (W.mask[Math.floor(cy + j) * S + Math.floor(cx + i)]) { bad = true; break; } if (bad) continue;
    m++;
    for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) { const gx = Math.floor(cx + i), gy = Math.floor(cy + j); if (gx < 0 || gy < 0 || gx >= S || gy >= S) continue; const d = Math.hypot(i, j) + W.noise(gx * 3, gy * 3) * 2; if (d > r) continue; W.mask[gy * S + gx] = 1; const t = W.tiles[gy * S + gx]; if (t === 2) W.tiles[gy * S + gx] = 0; }
    for (let i = 0; i < r * r * 4; i++) { const a = rr(0, 6.28), d = Math.sqrt(rng()) * r, x = (cx + Math.cos(a) * d) * T, y = (cy + Math.sin(a) * d) * T; const gx = Math.floor(x / T), gy = Math.floor(y / T); if (W.mask[gy * S + gx] === 1 && wTile(W, gx, gy) === 0) addBush(W, x, y, true); }
    W.zones.push({ id: 'meadow' + m, n: names[m - 1], sub: 'Weites offenes Feld. Gute Sicht – keine Deckung.', x0: (cx - r) * T, y0: (cy - r) * T, x1: (cx + r) * T, y1: (cy + r) * T, col: '#d8ff7a' });
  }
  // --- Dunkelwälder ---
  for (let k = 0, m = 0; k < 80 && m < 5; k++) {
    const cx = rr(10, 118), cy = rr(10, 118), r = rr(6, 10); if (avoid(cx | 0, cy | 0, Math.ceil(r))) continue;
    let bad = false; for (let j = -r; j <= r && !bad; j += 2) for (let i = -r; i <= r; i += 2) if (W.mask[Math.floor(cy + j) * S + Math.floor(cx + i)]) { bad = true; break; } if (bad) continue;
    m++;
    for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) { const gx = Math.floor(cx + i), gy = Math.floor(cy + j); if (gx < 0 || gy < 0 || gx >= S || gy >= S) continue; const d = Math.hypot(i, j) + W.noise(gx * 3, gy * 3) * 2; if (d > r) continue; const t = W.tiles[gy * S + gx]; if (t !== 0 && t !== 2) continue; W.mask[gy * S + gx] = 2; W.tiles[gy * S + gx] = 19; }
    W.forests = W.forests || []; W.forests.push({ cx, cy, r });
    W.zones.push({ id: 'forest' + m, n: 'DUNKELWALD', sub: 'Dichtes Unterholz. Hier ist es auch tagsüber finster.', x0: (cx - r) * T, y0: (cy - r) * T, x1: (cx + r) * T, y1: (cy + r) * T, col: '#7aae5a' });
  }
}
function forestFill(W) {
  const rng = W.rng, T = TILE;
  for (const f of W.forests || []) for (let i = 0; i < f.r * f.r * 3.2; i++) { const a = rng() * 6.28, d = Math.sqrt(rng()) * f.r, x = (f.cx + Math.cos(a) * d) * T, y = (f.cy + Math.sin(a) * d) * T; if (wTile(W, Math.floor(x / T), Math.floor(y / T)) !== 19 || !freeAt(W, x, y, 8)) continue; addTree(W, x, y, rng() < 0.55 ? 'pine' : rng() < 0.6 ? 'jungle' : 'dead'); }
}
// ---------- Detaillierte Bodenmuster ----------
function drawTileDetail(g, W, t, gx, gy, rng) {
  const T = TILE, sub = (i, j, n, col, inset) => { inset = inset || 0.08; const a = P((gx + (i + inset) / n) * T, (gy + (j + inset) / n) * T, 0), b = P((gx + (i + 1 - inset) / n) * T, (gy + (j + inset) / n) * T, 0), c = P((gx + (i + 1 - inset) / n) * T, (gy + (j + 1 - inset) / n) * T, 0), d = P((gx + (i + inset) / n) * T, (gy + (j + 1 - inset) / n) * T, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = col; g.fill(); };
  const S = W.size, nb = (dx, dy) => wTile(W, gx + dx, gy + dy);
  switch (t) {
    case 11: case 20: case 21: {
      const city = t === 20, Q = t === 21, cave = Q && W.cave && W.cave.has(gy * S + gx), dep = (x, y) => { const tt = wTile(W, x, y); if (tt === 9) return 0; return W.depth ? W.depth[y * S + x] : (tt === 11 || tt === 20 ? -RAVINE_D : 0); };
      const d = dep(gx, gy), ramp = W.ramp ? W.ramp.get(gy * S + gx) : null, PZ = (x, y, z) => P(x * T, y * T, z);
      const poly = (pts, col) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); g.fillStyle = col; g.fill(); };
      const quadZ = (x0, y0, x1, y1, z, col) => poly([PZ(x0, y0, z), PZ(x1, y0, z), PZ(x1, y1, z), PZ(x0, y1, z)], col);
      const deepK = clamp(-d / RAVINE_D, 0, 1);
      if (city) {
        quadZ(gx, gy, gx + 1, gy + 1, d, hsl2hex(220, 14, 26 - deepK * 8));
        for (let k = 1; k < 4; k++) { const f = k / 4, a = PZ(gx, gy + f, d), b = PZ(gx + 1, gy + f, d); g.strokeStyle = 'rgba(63,244,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      } else {
        if (Q) {
          for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) quadZ(gx + i / 3, gy + j / 3, gx + (i + 1) / 3, gy + (j + 1) / 3, d, hsl2hex(36 + rng() * 14, 5 + rng() * 6, (cave ? 20 : 44) + rng() * 8 - deepK * 6));
          for (let k = 0; k < 9; k++) { const q = PZ(gx + rng(), gy + rng(), d); g.fillStyle = rng() < 0.5 ? 'rgba(200,195,180,0.75)' : 'rgba(70,66,60,0.7)'; g.fillRect(q.x - 1.5, q.y - 1, 2 + rng() * 3, 2); }
          if (!cave && rng() < 0.25) { const q = PZ(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6, d); g.fillStyle = 'rgba(60,50,40,0.35)'; g.beginPath(); g.ellipse(q.x, q.y, 12 + rng() * 10, 4 + rng() * 3, 0, 0, 6.283); g.fill(); }
          if (!cave && rng() < 0.18) { const a = PZ(gx + 0.1, gy + rng(), d), b = PZ(gx + 0.9, gy + rng(), d); g.strokeStyle = 'rgba(40,36,30,0.45)'; g.lineWidth = 2.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]); }
          if (cave && rng() < 0.4) { const q = PZ(gx + rng(), gy + rng(), d); g.fillStyle = 'rgba(120,200,255,0.25)'; g.beginPath(); g.ellipse(q.x, q.y, 8 + rng() * 8, 3 + rng() * 3, 0, 0, 6.283); g.fill(); }
        } else {
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) quadZ(gx + i / 3, gy + j / 3, gx + (i + 1) / 3, gy + (j + 1) / 3, d, hsl2hex(28 + rng() * 10, 12 + rng() * 8, 27 + rng() * 7 - deepK * 4));
        if (ramp) {
          const [dx, dy] = ramp; quadZ(gx + 0.08, gy + 0.08, gx + 0.92, gy + 0.92, d, hsl2hex(34, 14, 46 + rng() * 6));
          for (let k = 1; k < 4; k++) { const f = k / 4, a = dy ? PZ(gx + 0.08, gy + f, d) : PZ(gx + f, gy + 0.08, d), b = dy ? PZ(gx + 0.92, gy + f, d) : PZ(gx + f, gy + 0.92, d); g.strokeStyle = 'rgba(30,22,14,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.strokeStyle = 'rgba(220,200,160,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y - 2); g.lineTo(b.x, b.y - 2); g.stroke(); }
        } else {
          for (let k = 0; k < 7; k++) { const q = PZ(gx + rng(), gy + rng(), d); g.fillStyle = rng() < 0.5 ? 'rgba(160,145,120,0.8)' : 'rgba(70,58,46,0.8)'; g.fillRect(q.x - 2, q.y - 1, 3 + rng() * 3, 2); }
          if (rng() < 0.3) { const q = PZ(gx + 0.3 + rng() * 0.4, gy + 0.3 + rng() * 0.4, d); g.fillStyle = 'rgba(60,120,150,0.55)'; g.beginPath(); g.ellipse(q.x, q.y, 10 + rng() * 10, 4 + rng() * 3, 0, 0, 6.283); g.fill(); }
          if (rng() < 0.45) { const q = PZ(gx + rng(), gy + rng(), d); g.strokeStyle = '#4f7f3a'; g.lineWidth = 1.4; g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(q.x + k * 2 - 4, q.y); g.lineTo(q.x + k * 2 - 4 + (rng() - 0.5) * 4, q.y - 4 - rng() * 6); } g.stroke(); }
        }
        }
      }
      const face = (ax, ay, bx, by, zt, zb, nt, west) => {
        if (zt - zb < 2) return;
        const a = PZ(ax, ay, zt), b = PZ(bx, by, zt), b2 = PZ(bx, by, zb), a2 = PZ(ax, ay, zb);
        if (city) { poly([a, b, b2, a2], west ? '#2a2f3a' : '#363c4a'); poly([a, b, PZ(bx, by, zt - 3), PZ(ax, ay, zt - 3)], '#ff3fa4'); return; }
        if (Q) {
          const qb = west ? ['#6e6b64', '#7a766d', '#646058', '#837e74'] : ['#8a867c', '#97928a', '#7d7a72', '#a39e94'];
          let qi = Math.floor(rng() * 2);
          for (let z = zt; z > zb; z -= 6 + rng() * 5) { const z2 = Math.max(zb, z - 6 - rng() * 5); poly([PZ(ax, ay, z), PZ(bx, by, z), PZ(bx, by, z2), PZ(ax, ay, z2)], qb[qi++ % qb.length]); }
          g.strokeStyle = 'rgba(40,36,30,0.55)'; g.lineWidth = 1;
          for (let k = 0; k < 4; k++) { const f = 0.1 + rng() * 0.8, p1 = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt - 1), p2 = PZ(ax + (bx - ax) * (f + 0.04), ay + (by - ay) * (f + 0.04), zb + 2); g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke(); }
          for (let k = 0; k < 2; k++) if (rng() < 0.5) { const f = rng(), p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt - 2); g.fillStyle = 'rgba(160,82,40,0.5)'; g.fillRect(p.x - 1.5, p.y, 3, (zt - zb) * 0.6); }
          if (nt === 21 || nt === 3) poly([a, b, PZ(bx, by, zt - 2.5), PZ(ax, ay, zt - 2.5)], '#b8b2a6');
          else if (nt === 0 || nt === 2 || nt === 19) { poly([a, b, PZ(bx, by, zt - 5), PZ(ax, ay, zt - 5)], '#4a7a3a'); g.strokeStyle = 'rgba(60,110,45,0.9)'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k < 5; k++) { const f = rng(), p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt - 4); g.moveTo(p.x, p.y); g.lineTo(p.x + (rng() - 0.5) * 3, p.y + 6 + rng() * 10); } g.stroke(); }
          g.lineWidth = 1; return;
        }
        if (nt === 3) { poly([a, b, b2, a2], '#3a2a1c'); for (let k = 0; k <= 4; k++) { const f = k / 4, p1 = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt), p2 = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zb); g.strokeStyle = '#6a4a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke(); } g.lineWidth = 1; return; }
        const bands = west ? ['#5e4b3a', '#6b5643', '#54432f', '#735c45', '#4a3b2c'] : ['#7a6450', '#8a735a', '#6d5946', '#937a5e', '#625040'];
        let bi = Math.floor(rng() * 3);
        for (let z = zt; z > zb; z -= 8 + rng() * 6) { const z2 = Math.max(zb, z - 8 - rng() * 6); poly([PZ(ax, ay, z), PZ(bx, by, z), PZ(bx, by, z2), PZ(ax, ay, z2)], bands[bi++ % bands.length]); }
        g.strokeStyle = 'rgba(25,18,12,0.55)'; g.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) { const f = 0.15 + rng() * 0.7, zs = zt - rng() * 20; let p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zs); g.beginPath(); g.moveTo(p.x, p.y); for (let z = zs; z > zb + 6; z -= 10) { p = PZ(ax + (bx - ax) * (f + (rng() - 0.5) * 0.08), ay + (by - ay) * (f + (rng() - 0.5) * 0.08), z); g.lineTo(p.x, p.y); } g.stroke(); }
        for (let k = 0; k < 3; k++) { const f = rng(), z = zb + 6 + rng() * (zt - zb - 12), p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, z); g.fillStyle = rng() < 0.5 ? '#9a8468' : '#43352a'; g.fillRect(p.x - 3, p.y - 2, 6, 4); }
        if (nt === 0 || nt === 2 || nt === 19) {
          poly([a, b, PZ(bx, by, zt - 5), PZ(ax, ay, zt - 5)], nt === 2 ? '#5a4630' : '#3f7a35');
          g.strokeStyle = 'rgba(60,110,45,0.9)'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k < 6; k++) { const f = rng(), p = PZ(ax + (bx - ax) * f, ay + (by - ay) * f, zt - 4); g.moveTo(p.x, p.y); g.lineTo(p.x + (rng() - 0.5) * 3, p.y + 6 + rng() * 14); } g.stroke(); g.lineWidth = 1;
        }
      };
      const dn = dep(gx, gy - 1), dw = dep(gx - 1, gy);
      if (dn > d) face(gx, gy, gx + 1, gy, dn, d, nb(0, -1), false);
      if (dw > d) face(gx, gy, gx, gy + 1, dw, d, nb(-1, 0), true);
      if (dn > d + 10) poly([PZ(gx, gy, d), PZ(gx + 1, gy, d), PZ(gx + 1, gy + 0.3, d), PZ(gx, gy + 0.3, d)], 'rgba(0,0,0,0.28)');
      if (dw > d + 10) poly([PZ(gx, gy, d), PZ(gx + 0.3, gy, d), PZ(gx + 0.3, gy + 1, d), PZ(gx, gy + 1, d)], 'rgba(0,0,0,0.22)');
      g.strokeStyle = city ? 'rgba(255,63,164,0.9)' : Q ? 'rgba(210,205,195,0.8)' : 'rgba(190,165,120,0.7)'; g.lineWidth = 2;
      for (const [dx, dy, ax, ay, bx, by] of [[1, 0, 1, 0, 1, 1], [0, 1, 0, 1, 1, 1]]) if (dep(gx + dx, gy + dy) > d + 10) { const a = PZ(gx + ax, gy + ay, dep(gx + dx, gy + dy)), b = PZ(gx + bx, gy + by, dep(gx + dx, gy + dy)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      g.lineWidth = 1; return true;
    }
    case 22: {
      const S2 = W.size;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) sub(i, j, 2, hsl2hex(60, 3 + rng() * 3, 40 + rng() * 9), 0.03);
      if ((W.runwayY && gy === W.runwayY && gx >= MIL_RECT.x0 && gx <= MIL_RECT.x1 && gx % 2 === 0) || (W.runwayY2 && gy === W.runwayY2 && gx % 3 !== 0)) { const a = P((gx + 0.15) * T, (gy + 1) * T, 0), b = P((gx + 0.75) * T, (gy + 1) * T, 0); g.strokeStyle = 'rgba(240,240,230,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      if (rng() < 0.55) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.strokeStyle = 'rgba(20,20,20,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); for (let k = 0; k < 3; k++) g.lineTo(p.x + (rng() - 0.5) * 26, p.y + (rng() - 0.5) * 12); g.stroke(); }
      if (rng() < 0.22) { const p = P((gx + 0.5) * T, (gy + 0.5) * T, 0); g.fillStyle = 'rgba(15,12,10,0.45)'; g.beginPath(); g.ellipse(p.x, p.y, 14 + rng() * 14, 6 + rng() * 6, 0, 0, 6.283); g.fill(); }
      if (rng() < 0.12) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(70,90,60,0.6)'; g.fillRect(p.x - 4, p.y - 2, 8, 3); }
      return true;
    }
    case 23: {
      for (let k = 0; k < 8; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = rng() < 0.5 ? 'rgba(25,20,15,0.55)' : 'rgba(110,90,60,0.5)'; g.fillRect(p.x, p.y, 2 + rng() * 4, 2); }
      if (rng() < 0.3) { const p = P((gx + 0.5) * T, (gy + 0.5) * T, 0); g.fillStyle = 'rgba(10,8,6,0.4)'; g.beginPath(); g.ellipse(p.x, p.y, 16 + rng() * 10, 7 + rng() * 4, 0, 0, 6.283); g.fill(); }
      return false;
    }
    case 12: case 15: {
      const snow = W.kind === 'city';
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const l = 38 + rng() * 14; sub(i + (j % 2) * 0.5 - 0.25, j, 4, hsl2hex(28 + rng() * 14, 10 + rng() * 8, snow ? l + 8 : l), 0.1); }
      if (snow && rng() < 0.5) for (let k = 0; k < 6; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(255,255,255,' + (0.4 + rng() * 0.5) + ')'; g.beginPath(); g.ellipse(p.x, p.y, 3 + rng() * 8, 1.5 + rng() * 3, 0, 0, 6.283); g.fill(); }
      if (t === 15) { for (const o of [0.28, 0.72]) { const a = P(gx * T, (gy + o) * T, 0), b = P((gx + 1) * T, (gy + o) * T, 0); g.strokeStyle = '#2a2a2e'; g.lineWidth = 4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.strokeStyle = '#c8d0d8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a.x, a.y - 1.5); g.lineTo(b.x, b.y - 1.5); g.stroke(); } g.lineWidth = 1; }
      return true;
    }
    case 13: {
      const pc = W.plaza || { x: 0, y: 0 }, pal = ['#d9b35a', '#efe3c8', '#3b6a9a', '#efe3c8', '#a5503a', '#efe3c8', '#3f7f7a'];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const x = gx + (i + 0.5) / 3, y = gy + (j + 0.5) / 3, d = Math.hypot(x - pc.x, y - pc.y), an = Math.atan2(y - pc.y, x - pc.x), ring = Math.floor(d / 0.9), star = Math.floor((an + Math.PI) / (Math.PI / 8)) % 2; sub(i, j, 3, ring % 3 === 1 && star ? '#d9b35a' : pal[ring % pal.length], 0.04); }
      return true;
    }
    case 14: {
      tileDiamond(gx, gy, 1, 1); g.fillStyle = hsl2hex(205, 30, 92 + rng() * 4); g.fill();
      for (let k = 0; k < 3; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(170,200,230,0.35)'; g.beginPath(); g.ellipse(p.x, p.y, 8 + rng() * 14, 3 + rng() * 5, 0, 0, 6.283); g.fill(); }
      for (let k = 0; k < 5; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = '#ffffff'; g.fillRect(p.x, p.y, 1.5, 1.5); }
      return true;
    }
    case 16: {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) sub(i, j, 2, hsl2hex(38, 14 + rng() * 6, 70 + rng() * 8), 0.05);
      const a = P(gx * T, gy * T, 0), b = P((gx + 1) * T, gy * T, 0); g.strokeStyle = 'rgba(201,149,42,0.5)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      if (W.kind === 'city' && rng() < 0.4) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(p.x, p.y, 6 + rng() * 6, 2 + rng() * 2, 0, 0, 6.283); g.fill(); }
      return true;
    }
    case 17: {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) sub(i + (j % 2) * 0.5 - 0.25, j, 3, hsl2hex(150 + rng() * 30, 10 + rng() * 6, 13 + rng() * 6), 0.1);
      if (rng() < 0.3) { const p = P((gx + 0.3 + rng() * 0.4) * T, (gy + 0.3 + rng() * 0.4) * T, 0); g.fillStyle = 'rgba(30,60,50,0.8)'; g.beginPath(); g.ellipse(p.x, p.y, 14 + rng() * 10, 5 + rng() * 3, 0, 0, 6.283); g.fill(); g.fillStyle = rng() < 0.5 ? 'rgba(95,255,138,0.35)' : 'rgba(255,63,164,0.35)'; g.fillRect(p.x - 6, p.y - 1, 12, 2); }
      return true;
    }
    case 18: {
      tileDiamond(gx, gy, 1, 1); g.fillStyle = '#1a2420'; g.fill(); g.strokeStyle = 'rgba(90,110,100,0.6)';
      for (let k = 1; k < 5; k++) { const a = P((gx + k / 5) * T, gy * T, 0), b = P((gx + k / 5) * T, (gy + 1) * T, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      if (rng() < 0.3) { const p = P((gx + 0.5) * T, (gy + 0.5) * T, 0); g.fillStyle = 'rgba(95,255,138,0.25)'; g.beginPath(); g.ellipse(p.x, p.y, 14, 6, 0, 0, 6.283); g.fill(); }
      return true;
    }
    case 19: {
      for (let k = 0; k < 10; k++) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = rng() < 0.5 ? 'rgba(90,60,30,0.5)' : 'rgba(40,70,30,0.6)'; g.fillRect(p.x, p.y, 3, 2); }
      return false;
    }
  }
  return false;
}
// ---------- Neu-Eden 2.0 ----------
function makeCityWorld(level) {
  const S = 44, W = baseWorld(level, S, level === 'city' ? 777 : 666), T = TILE, rng = W.rng, rr = (a, b) => a + rng() * (b - a);
  W.name = level === 'city' ? 'NEU-EDEN · OBERSTADT' : 'NEU-EDEN · UNTERSTADT';
  const occ = new Uint8Array(S * S), mark = (x0, y0, w, h) => { for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if (i >= 0 && j >= 0 && i < S && j < S) occ[j * S + i] = 1; };
  const isFree = (x0, y0, w, h) => { for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if (i < 1 || j < 1 || i >= S - 1 || j >= S - 1 || occ[j * S + i]) return false; return true; };
  const st = (gx, gy, a, look, station, name) => { mark(Math.floor(gx) - 1, Math.floor(gy) - 1, 3, 3); return addNpc(W, gx * T, gy * T, a, look, station, name); };
  const big = (kind, tx, ty, tw, th, o) => { mark(tx, ty, tw, th); return addProp(W, kind, (tx + tw / 2) * T, (ty + th / 2) * T, Object.assign({ hw: tw * T / 2 - 6, hd: th * T / 2 - 6 }, o || {})); };
  const city = level === 'city', base = city ? 17 : 17, side = city ? 18 : 18;
  for (let i = 0; i < S * S; i++) W.tiles[i] = base;
  // Straßen
  if (city) for (let i = 1; i < S - 1; i++) for (let k = 18; k <= 25; k++) { const edge = k === 18 || k === 25; setTile(W, i, k, edge ? side : (city && (k === 21 || k === 22) ? 15 : base)); setTile(W, k, i, edge ? side : base); mark(i, k, 1, 1); mark(k, i, 1, 1); }
  if (city) for (const a of [9, 10, 33, 34]) for (let i = 1; i < S - 1; i++) { if (wTile(W, i, a) === base) { setTile(W, i, a, city ? 12 : 18); } if (wTile(W, a, i) === base) setTile(W, a, i, city ? 12 : 18); mark(i, a, 1, 1); mark(a, i, 1, 1); }
  W.plaza = { x: 22, y: 22 };
  if (city) for (let j = 14; j < 30; j++) for (let i = 14; i < 30; i++) if (Math.hypot(i + 0.5 - 22, j + 0.5 - 22) < 6.5) setTile(W, i, j, 18);
  // Mauern
  if (city) {
  for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2]]) addProp(W, 'citywall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang, H: 120 }); addProp(W, 'citywall', (S - 0.4) * T, 8.5 * T, { len: 17 * T, hw: 8.5 * T, hd: 14, ang: Math.PI / 2, H: 120 }); addProp(W, 'citywall', (S - 0.4) * T, 35.5 * T, { len: 17 * T, hw: 8.5 * T, hd: 14, ang: Math.PI / 2, H: 120 }); addProp(W, 'innergate', (S - 1.2) * T, 22 * T, { hw: 16, hd: 76 }); }
  const BL = { NW1: [2, 2], NW2: [11, 2], NW3: [2, 11], NW4: [11, 11], NE1: [26, 2], NE2: [35, 2], NE3: [26, 11], NE4: [35, 11], SW1: [2, 26], SW2: [11, 26], SW3: [2, 35], SW4: [11, 35], SE1: [26, 26], SE2: [35, 26], SE3: [26, 35], SE4: [35, 35] };
  const fillHouses = (x0, y0, w, h) => {
    for (let pass = 0; pass < 2; pass++) for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) {
      const tw = pass ? 2 : 2 + Math.floor(rng() * 2), th = pass ? 2 : 2 + Math.floor(rng() * 2); if (!isFree(i, j, tw, th) || i + tw > x0 + w || j + th > y0 + h) continue;
      mark(i, j, tw, th);
      if (city) addProp(W, 'cybertower', (i + tw / 2) * T, (j + th / 2) * T, { w: tw * T - 8, d: th * T - 8, H: 130 + Math.floor(rng() * 6) * 34, col: rpick(rng, ['#ff3fa4', '#3ff4ff', '#b05cff', '#5fff8a', '#ffb04a']), seed: Math.floor(rng() * 1e5), snow: false, hw: tw * T / 2 - 4, hd: th * T / 2 - 4 });
      else addProp(W, 'zaunhouse', (i + tw / 2) * T, (j + th / 2) * T, { w: tw * T - 6, d: th * T - 6, H: 70 + Math.floor(rng() * 5) * 16, seed: Math.floor(rng() * 1e5), hw: tw * T / 2 - 3, hd: th * T / 2 - 3, light: rng() < 0.5 ? 90 : 0, lcol: rpick(rng, ['255,176,74', '95,255,138', '255,138,208']), safe: false });
    }
  };
  const park = (x0, y0, w, h) => {
    for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if (!occ[j * S + i]) setTile(W, i, j, 18);
    mark(x0, y0, w, h);
    for (let k = 0; k < (city ? 9 : 4); k++) { const x = (x0 + rr(0.6, w - 0.6)) * T, y = (y0 + rr(0.6, h - 0.6)) * T; if (freeAt(W, x, y, 22)) { if (city) addProp(W, 'holotree', x, y, { hw: 12, hd: 12, light: 90, lcol: rng() < 0.5 ? '255,63,164' : '63,244,255', safe: false, seed: Math.floor(rng() * 999) }); else addProp(W, 'chemvat', x, y, { hw: 25, hd: 25, light: 120, lcol: '95,255,138', safe: false }); } }
    if (city) { addProp(W, 'statue', (x0 + w / 2) * T, (y0 + h / 2) * T, { hw: 20, hd: 20 }); for (let k = 0; k < 4; k++) { const x = (x0 + rr(0.5, w - 0.5)) * T, y = (y0 + rr(0.5, h - 0.5)) * T; if (freeAt(W, x, y, 18)) addProp(W, rpick(rng, ['vent', 'bench', 'planter', 'neonlamp']), x, y, rng() < 0.7 ? { solid: false, snow: false, light: 0 } : { hw: 6, hd: 17, snow: false }); } }
  };
  if (city) {
    // Wahrzeichen & Läden
    big('rathaus', 11, 12, 6, 5); st(14, 17.4, Math.PI / 2, Object.assign(npcLook('rich', rng), { hat: 'Zylinder' }), 'townhall', 'Stadtschreiber Okoro');
    big('glassdome', 2, 2, 4, 3); big('clocktower', 13, 3, 2, 2, { hw: 30, hd: 30 });
    big('royal', 26, 12, 6, 5, { light: 260, lcol: '255,210,90', lx: 150 }); st(29, 17.4, Math.PI / 2, Object.assign(npcLook('rich', rng), { coat: '#1b1b22' }), 'royal', 'ROYAL CASINO');
    big('shop', 36, 13, 3, 3, { col: '#3b4d74' }); st(37.5, 17.4, Math.PI / 2, npcLook('rich', rng), 'market', 'Händlerin Mara');
    big('shop', 3, 27, 3, 3, { col: '#3f7f7a' }); st(4.5, 26.6, -Math.PI / 2, npcLook('spacer', rng), 'agency', 'Raumfahrtbehörde');
    big('skyloft', 12, 27, 3, 3); st(13.5, 26.6, -Math.PI / 2, npcLook('spacer', rng), 'shipyard', 'Werft »Sternenschmiede«');
    big('shop', 27, 27, 3, 3, { col: '#a5503a' }); st(28.5, 26.6, -Math.PI / 2, npcLook('rich', rng), 'broker', 'Makler Vossberg');
    big('shop', 36, 27, 3, 3, { col: '#6a4a7a' }); st(37.5, 26.6, -Math.PI / 2, npcLook('rich', rng), 'jobs', 'Jobvermittlung');
    big('shop', 27, 36, 3, 3, { col: '#34466a' }); st(28.5, 35.4, -Math.PI / 2, npcLook('rich', rng), 'courier', 'Kurier-Zentrale');
    big('villa', 36, 36, 5, 4); big('apartment', 3, 36, 4, 3); st(5, 35.4, -Math.PI / 2, npcLook('rich', rng), 'home', 'Hausmeister');
    W.depth = new Float32Array(S * S); W.ramp = new Map();
    for (let j = 4; j <= 6; j++) for (let i = 21; i <= 22; i++) { setTile(W, i, j, 20); W.depth[j * S + i] = -24 * (7 - j); W.ramp.set(j * S + i, [0, 1, 0]); }
    mark(20, 3, 4, 5);
    addProp(W, 'stairwell', 22 * T, 5.5 * T, { solid: false, light: 130, lcol: '63,244,255' });
    W.stairsDown = { x: 22 * T, y: 7 * T }; W.spawnTop = { x: 22 * T, y: 8.4 * T };
    big('gunshop', 6, 27, 3, 3); st(7.5, 26.6, -Math.PI / 2, Object.assign(npcLook('guard', rng), { coat: '#1b1b22', neon: '#ff3fa4', goggles: '#3ff4ff' }), 'guns', 'Waffenhändler »Kaliber«');
    // Holo-Reklamen über den Straßen
    for (const [x, y, a] of [[5, 18.2, 0], [12, 18.2, 0], [31, 18.2, 0], [39, 18.2, 0], [5, 25.8, 0], [31, 25.8, 0], [18.2, 5, Math.PI / 2], [25.8, 12, Math.PI / 2], [18.2, 31, Math.PI / 2], [25.8, 38, Math.PI / 2]]) addProp(W, 'hoload', x * T, y * T, { hw: 4, hd: 4, ang: a, seed: Math.floor(x * 13 + y), solid: false, light: 110, lcol: rpick(rng, ['255,63,164', '63,244,255', '176,92,255']), safe: false });
    st(41.6, 19.4, Math.PI, npcLook('guard', rng), 'exit', 'Stadttor');
    park(11, 35, 7, 7); park(35, 2, 7, 7); park(2, 11, 7, 7);
    for (const k in BL) fillHouses(BL[k][0], BL[k][1], 7, 7);
    // Plaza
    addProp(W, 'fountain', 22 * T, 22 * T, { hw: 46, hd: 46 });
    for (const [x, y] of [[17.5, 17.5], [26.5, 17.5], [17.5, 26.5], [26.5, 26.5]]) addProp(W, 'statue', x * T, y * T, { hw: 20, hd: 20, snow: false });
    // Straßenmöbel
    for (let i = 2; i < 42; i += 3) { if (i > 15 && i < 29) continue; addProp(W, 'neonlamp', i * T, 18.5 * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); addProp(W, 'neonlamp', i * T, 25.5 * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); addProp(W, 'neonlamp', 18.5 * T, i * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); addProp(W, 'neonlamp', 25.5 * T, i * T, { hw: 5, hd: 5, light: 160, lcol: '63,244,255', nightOnly: false, snow: false }); }
    for (const x of [6, 36]) { addProp(W, 'bigpipe', x * T, 22 * T, { len: 9 * T, H: 140, ang: Math.PI / 2, solid: false, snow: false }); for (const y of [17.5, 26.5]) addProp(W, 'pylon', x * T, y * T, { hw: 16, hd: 16 }); }
    addProp(W, 'bigpipe', 22 * T, 12 * T, { len: 9 * T, H: 120, solid: false, snow: false }); for (const x of [17.5, 26.5]) addProp(W, 'pylon', x * T, 12 * T, { hw: 16, hd: 16 });
    for (const x of [10, 14, 30, 33, 39]) addProp(W, 'garland', x * T, 22 * T, { len: 8 * T, ang: Math.PI / 2, solid: false });
    for (const y of [8, 31, 38]) addProp(W, 'garland', 22 * T, y * T, { len: 8 * T, solid: false });
    for (const [x, y, c] of [[8.5, 17.8, '#5fff8a'], [33.5, 17.8, '#ff7ad0'], [16.5, 26.2, '#5fff8a'], [40, 26.2, '#7fd8ff'], [17.8, 7, '#ff7ad0'], [26.2, 30, '#5fff8a']]) addProp(W, 'hexsign', x * T, y * T, { hw: 3, hd: 3, col: c, light: 70, lcol: hexToRgbStr(c), safe: false, H: 64 });
    for (const [x, y] of [[8, 25.3], [36, 18.7]]) addProp(W, 'tramrailstop', x * T, y * T, { hw: 30, hd: 10 });
    for (const [x, y, k] of [[20, 10, 'kiosk'], [24, 33, 'kiosk'], [31, 24.6, 'flowercart'], [12, 19.2, 'flowercart'], [33, 6, 'crates'], [8, 6, 'barrels'], [38, 30, 'crates'], [5, 31, 'barrels']]) addProp(W, k, x * T, y * T, { hw: k === 'kiosk' ? 20 : 16, hd: k === 'kiosk' ? 20 : 12, snow: false });
    for (let k = 0; k < 18; k++) { const x = rr(2, 42) * T, y = rr(2, 42) * T; if (!freeAt(W, x, y, 20)) continue; const tt = tileType(W, x, y); if (tt === 15 || tt === 13) continue; addProp(W, rpick(rng, ['vent', 'planter', 'bench', 'trash']), x, y, { solid: false, flowers: true, snow: false }); }
    W.vents = []; for (let k = 0; k < 10; k++) { const x = rr(3, 41) * T, y = rr(3, 41) * T; if (!freeAt(W, x, y, 14) || tileType(W, x, y) === 15) continue; addProp(W, 'vent', x, y, { solid: false }); W.vents.push({ x, y }); }
    W.trams = [{ x: 8 * T, y: 21.5 * T, ang: 0, dir: 1, col: '#3f7f7a', sp: 70, wait: 0, x0: 3.5, x1: 13.5 }, { x: 36 * T, y: 22.5 * T, ang: Math.PI, dir: -1, col: '#a5503a', sp: 60, wait: 0, x0: 30.5, x1: 40.5 }];
    for (const i of [15, 16, 17, 27, 28, 29]) for (const j of [21, 22]) if (wTile(W, i, j) === 15) setTile(W, i, j, 12);
    for (let i = 0; i < 4; i++) W.airships.push({ x: rr(0, S * T), y: rr(0, S * T), z: 300 + i * 40, a: rr(0, 6.28), sp: rr(20, 40) });
    for (let k = 0; k < 34; k++) { const x = rr(3, 41) * T, y = (rng() < 0.5 ? rr(18.5, 25.5) : rr(3, 41)) * T, x2 = rng() < 0.5 ? x : rr(18.5, 25.5) * T; if (!freeAt(W, x2, y, 12)) continue; addNpc(W, x2, y, rr(0, 6), npcLook('rich', rng), null, null, { wander: true }); }
    W.spawn = { x: 40.5 * T, y: 22 * T }; W.ambient = 'cyber'; W.name = 'NEU-EDEN · NEONSTADT';
    for (let i = 0; i < 40; i++) W.lightsStatic.push({ x: rr(2, 42) * T, y: rr(2, 42) * T, r: 100, col: rpick(rng, ['255,63,164', '63,244,255', '176,92,255']), safe: false });
  } else {
    // ===================== V11: DIE ALTSTADT (Gassen im Stil einer verwinkelten Hafen-/Bergbaustadt) =====================
    W.name = 'NEU-EDEN · ALTSTADT';
    const AL = [7, 14, 21, 28, 35], inAL = v => AL.some(a => v === a || v === a + 1);
    const closed = [['v', 7, 9, 13], ['h', 14, 30, 34], ['v', 35, 23, 27], ['h', 28, 1, 6], ['v', 14, 30, 34], ['h', 7, 37, 42]];
    const passages = [['h', 25, 9, 13], ['v', 31, 2, 6], ['h', 11, 23, 27], ['v', 11, 37, 42], ['h', 32, 37, 42]];
    const inSeg = (segs, i, j, wide) => segs.some(([o, a, f, t]) => o === 'v' ? (i === a || (wide && i === a + 1)) && j >= f && j <= t : (j === a || (wide && j === a + 1)) && i >= f && i <= t);
    const plaza = (i, j) => i >= 16 && i <= 27 && j >= 16 && j <= 27;
    const walk = (i, j) => i >= 1 && j >= 1 && i < S - 1 && j < S - 1 && (plaza(i, j) || inSeg(passages, i, j, false) || ((inAL(i) || inAL(j)) && !inSeg(closed, i, j, true)));
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const w = walk(i, j); setTile(W, i, j, !w ? 7 : plaza(i, j) ? 12 : 16); if (w) mark(i, j, 1, 1); }
    for (const [x, y, ang] of [[S * T / 2, 0.4 * T, 0], [S * T / 2, (S - 0.4) * T, 0], [0.4 * T, S * T / 2, Math.PI / 2], [(S - 0.4) * T, S * T / 2, Math.PI / 2]]) addProp(W, 'stonewall', x, y, { len: S * T, hw: S * T / 2, hd: 14, ang });
    addProp(W, 'stairsup', 22 * T, 3 * T, { solid: false, light: 150, lcol: '255,190,110' });
    addProp(W, 'torii', 22 * T, 6.4 * T, { solid: false });
    W.stairsUp = { x: 22 * T, y: 5.2 * T }; W.spawn = { x: 22 * T, y: 6.9 * T };
    const warm = ['255,190,110', '255,150,70', '255,210,140'];
    big('neoncasino', 16, 9, 5, 5, { light: 240, lcol: '255,160,80', lx: 110 }); st(18.5, 14.5, Math.PI / 2, npcLook('punk', rng), 'neon', 'Spielhalle »DIE GRUBE«');
    big('teahouse', 9, 16, 5, 5, { light: 200, lcol: '255,180,100', seed: 31 }); st(14.5, 18.5, 0, npcLook('punk', rng), 'bar', 'Teehaus »Rostiger Anker«');
    big('teahouse', 30, 23, 5, 5, { light: 200, lcol: '255,180,100', seed: 32 }); st(29.5, 25.5, Math.PI, npcLook('punk', rng), 'bar2', 'Schenke »Letzter Tropfen«');
    big('blackmarket', 16, 30, 5, 3, { light: 120, lcol: '255,170,90' }); st(18.5, 29.5, -Math.PI / 2, Object.assign(npcLook('punk', rng), { hat: 'Bandana' }), 'black', 'Schwarzmarkt');
    big('cityhome', 23, 30, 3, 3); st(24.5, 29.5, -Math.PI / 2, npcLook('punk', rng), 'home', 'Kellerloch-Vermieterin');
    st(26.4, 26.4, Math.PI, Object.assign(npcLook('punk', rng), { hat: 'Zylinder', coat: '#1a1a1a' }), 'fixer', 'Der Fixer');
    // Platz: runde Terrasse mit Brunnen, Laternenmasten, Markt
    addProp(W, 'roundterrace', 21.5 * T, 21.5 * T, { hw: 40, hd: 40, light: 230, lcol: '255,200,120', safe: false });
    for (const [x, y] of [[17, 17], [26, 17], [17, 26], [26, 26], [21.5, 16.8], [16.8, 21.5], [26.2, 21.5], [21.5, 26.2]]) { addProp(W, 'lanternpost', x * T, y * T, { hw: 4, hd: 4, solid: false }); W.lightsStatic.push({ x: x * T, y: y * T, r: 110, col: rpick(rng, warm), safe: false }); }
    for (const [x, y, a, c] of [[18.6, 18.6, 0, '#8a2a2a'], [24.4, 18.6, Math.PI / 2, '#3e6a4a'], [18.6, 24.4, -Math.PI / 2, '#7a5a2a'], [24.4, 24.4, Math.PI, '#8a2a2a']]) addProp(W, 'stall', x * T, y * T, { hw: 22, hd: 16, col: c, light: 80, lcol: '255,200,120', safe: false, ang: a, solid: false });
    // Wahrzeichen: Förderturm, Strommasten
    for (const [i, j] of [[2, 2], [37, 37]]) if (isFree(i, j, 4, 4)) { mark(i, j, 4, 4); addProp(W, 'headframe', (i + 2) * T, (j + 2) * T, { hw: 2 * T - 6, hd: 2 * T - 6, light: 120, lcol: '255,170,90', safe: false }); }
    // Holzhäuser, Mehrstöcker, Pagoden – eng aneinander
    const walls = ['#e8dcc0', '#d9c8a4', '#8a5a3a', '#7a4a30', '#c8b08a', '#a8643a', '#efe3c8'], roofs = ['#6a3a2a', '#4a5a4a', '#5a3a2a', '#3e4a46', '#7a4a2a', '#5a2a22'];
    for (const sizes of [[[3, 3], [3, 2], [2, 3]], [[2, 2]], [[2, 1], [1, 2], [1, 1]]]) for (let j = 1; j < S - 1; j++) for (let i = 1; i < S - 1; i++) for (const [tw, th] of sizes) {
      if (!isFree(i, j, tw, th)) continue; mark(i, j, tw, th);
      const seed = Math.floor(rng() * 1e5), big3 = tw * th >= 6, r = rng();
      const style = big3 && r < 0.25 ? 'pagoda' : big3 && r < 0.6 ? 'block' : 'wood';
      const H = style === 'pagoda' ? 150 + Math.floor(rng() * 3) * 30 : style === 'block' ? 120 + Math.floor(rng() * 4) * 22 : 60 + Math.floor(rng() * 3) * 22;
      addProp(W, 'jhouse', (i + tw / 2) * T, (j + th / 2) * T, { w: tw * T - 4, d: th * T - 4, H, seed, style, col: rpick(rng, walls), roof: rpick(rng, roofs), hw: tw * T / 2 - 2, hd: th * T / 2 - 2 });
      break;
    }
    // Leben über den Gassen: Papierlaternen, Wäsche, Stromleitungen
    let li = 0;
    for (const a of AL) for (let j = 2; j < S - 2; j += 3) { if (!walk(a, j) || !walk(a + 1, j) || plaza(a, j)) continue; const kind = (li++ % 3 === 1) ? 'laundry' : 'lanternline'; addProp(W, kind, (a + 1) * T, (j + 0.5) * T, { len: 2 * T + 26, ang: 0, solid: false, seed: li * 13 }); if (kind === 'lanternline') W.lightsStatic.push({ x: (a + 1) * T, y: (j + 0.5) * T, r: 115, col: rpick(rng, warm), safe: false }); }
    for (const a of AL) for (let i = 2; i < S - 2; i += 3) { if (!walk(i, a) || !walk(i, a + 1) || plaza(i, a) || inAL(i)) continue; const kind = (li++ % 3 === 1) ? 'laundry' : 'lanternline'; addProp(W, kind, (i + 0.5) * T, (a + 1) * T, { len: 2 * T + 26, ang: Math.PI / 2, solid: false, seed: li * 13 }); if (kind === 'lanternline') W.lightsStatic.push({ x: (i + 0.5) * T, y: (a + 1) * T, r: 115, col: rpick(rng, warm), safe: false }); }
    for (const [o, a, f, t] of passages) for (let k = f; k <= t; k += 2) { const x = o === 'v' ? (a + 0.5) * T : (k + 0.5) * T, y = o === 'v' ? (k + 0.5) * T : (a + 0.5) * T; addProp(W, 'lanternline', x, y, { len: T + 20, ang: o === 'v' ? 0 : Math.PI / 2, solid: false, seed: k }); W.lightsStatic.push({ x, y, r: 80, col: '255,170,90', safe: false }); }
    for (const a of AL) for (let k = 3; k < S - 3; k += 6) { const i = a + 1, j = k; if (walk(i, j) && !plaza(i, j)) { addProp(W, 'powerpole', (a + 0.15) * T, (j + 0.5) * T, { solid: false }); } }
    // Kram am Gassenrand
    W.vents = [];
    for (let k = 0; k < 80; k++) {
      const i = 1 + Math.floor(rng() * (S - 2)), j = 1 + Math.floor(rng() * (S - 2)); if (!walk(i, j) || plaza(i, j) || (i >= 20 && i <= 23 && j <= 7)) continue;
      const x = (i + 0.2 + rng() * 0.6) * T, y = (j + 0.2 + rng() * 0.6) * T, r = rng();
      if (r < 0.2) addProp(W, rpick(rng, ['crates', 'barrels', 'planter']), x, y, { solid: false, flowers: true });
      else if (r < 0.32) addProp(W, 'lanternpost', x, y, { solid: false });
      else if (r < 0.42) addProp(W, 'bench', x, y, { solid: false });
      else if (r < 0.5) addProp(W, 'stall', x, y, { hw: 22, hd: 16, col: rpick(rng, ['#8a2a2a', '#3e6a4a', '#7a5a2a']), light: 70, lcol: '255,200,120', safe: false, solid: false, ang: rng() < 0.5 ? 0 : Math.PI / 2 });
      else if (r < 0.62) { const tr = addTree(W, x, y, 'oak', { deco: true }); if (tr) { tr.cols = rpick(rng, [['#c86a2a', '#e08a3a', '#f0b050'], ['#5a7a3a', '#7a9a4a', '#a8b85a'], ['#b84a2a', '#d86a3a', '#e8a04a']]); tr.sc *= 0.7; tr.parts = treeParts(tr); } }
    }
    for (let k = 0, n = 0; k < 400 && n < 46; k++) { const i = 1 + Math.floor(rng() * (S - 2)), j = 1 + Math.floor(rng() * (S - 2)); if (!walk(i, j) || j < 7) continue; const x = (i + 0.5) * T, y = (j + 0.5) * T; if (!freeAt(W, x, y, 10)) continue; addNpc(W, x, y, rr(0, 6), npcLook('survivor', rng), null, null, { wander: true }); n++; }
    W.ambient = 'dusk'; W.alleys = true;
  }
  finishWorld(W); return W;
}
function updateCityLife(dt) {
  const W = S.W;
  if (W.trams) for (const tr of W.trams) {
    if (tr.wait > 0) { tr.wait -= dt; continue; }
    tr.x += tr.dir * tr.sp * dt; tr.ang = tr.dir > 0 ? 0 : Math.PI;
    if (tr.x > tr.x1 * TILE || tr.x < tr.x0 * TILE) { tr.dir *= -1; tr.wait = 3; tr.x = clamp(tr.x, tr.x0 * TILE, tr.x1 * TILE); }

    const p = S.p; if (Math.abs(p.x - tr.x) < 64 && Math.abs(p.y - tr.y) < 22) { p.y = tr.y + (p.y < tr.y ? -24 : 24); }
    for (const n of W.npcs) if (Math.abs(n.x - tr.x) < 64 && Math.abs(n.y - tr.y) < 22) n.y = tr.y + (n.y < tr.y ? -24 : 24);
  }
  if (W.vents) for (const v of W.vents) if (Math.random() < dt * 2.5) S.particles.push({ x: v.x + R(-6, 6), y: v.y + R(-6, 6), z: 4, vx: R(-8, 8), vy: R(-8, 8), vz: R(25, 45), life: R(1.5, 2.5), max: 2.5, col: W.kind === 'under' ? 'rgba(140,220,170,0.35)' : 'rgba(235,240,250,0.45)', s: R(6, 10), smoke: true, grav: 0 });
}
;

// ----------------------------- zones_world.js -----------------------------

// ===================== ZONEN: Militärbasis »Eisenfalke« & Steinbruch »Graufels« =====================
// Tiles: 21 Steinbruch (mit Tiefe W.depth), 22 Militärbeton, 23 verbrannte Erde
function buildMilitary(W) {
  const R0 = MIL_RECT, rng = mulberry32(W.seed * 3 + 17), rr = (a, b) => a + rng() * (b - a), T = TILE, S = W.size;
  const P2 = (gx, gy) => [gx * T, gy * T];
  // Boden: verbrannte Erde, Rollbahn, Vorfeld
  for (let gy = R0.y0; gy <= R0.y1; gy++) for (let gx = R0.x0; gx <= R0.x1; gx++) {
    const n = W.noise(gx * 2.1, gy * 2.1); setTile(W, gx, gy, n < -0.15 ? 23 : rng() < 0.18 ? 23 : 2);
  }
  W.runwayY = 90;
  for (let gx = R0.x0 + 1; gx <= R0.x1 - 1; gx++) for (let gy = 88; gy <= 92; gy++) setTile(W, gx, gy, 22);
  for (let gy = 70; gy <= 84; gy++) for (let gx = 30; gx <= 46; gx++) setTile(W, gx, gy, 22);         // Vorfeld vor den Hangars
  for (let gy = 72; gy <= 80; gy++) for (let gx = 49; gx <= 54; gx++) setTile(W, gx, gy, 22);         // Fahrzeughof
  for (let k = 0; k < 40; k++) { const gx = Math.floor(rr(R0.x0 + 1, R0.x1)), gy = Math.floor(rr(R0.y0 + 1, R0.y1)); if (wTile(W, gx, gy) === 22 && rng() < 0.6) setTile(W, gx, gy, 23); }
  road(W, 22, 79, 28, 79);
  // Zaun mit Lücken + Stacheldraht
  const fenceH = (y, x0, x1) => { for (let x = x0; x < x1; x += 4) { if (rng() < 0.22) continue; addProp(W, 'barbwire', (x + 2) * T, y * T, { len: 4 * T - 6, hw: 2 * T, hd: 4, seed: x * 7 + y }); } };
  const fenceV = (x, y0, y1) => { for (let y = y0; y < y1; y += 4) { if (rng() < 0.22 || (y >= 77 && y <= 81 && x === R0.x0)) continue; addProp(W, 'barbwire', x * T, (y + 2) * T, { len: 4 * T - 6, hw: 4, hd: 2 * T, ang: Math.PI / 2, seed: x * 3 + y }); } };
  fenceH(R0.y0, R0.x0, R0.x1); fenceH(R0.y1 + 1, R0.x0, R0.x1); fenceV(R0.x0, R0.y0, R0.y1); fenceV(R0.x1 + 1, R0.y0, R0.y1);
  addProp(W, 'barrier', (R0.x0 + 0.5) * T, 77.6 * T, { hw: 6, hd: 20, ang: Math.PI / 2, solid: false });
  addProp(W, 'milsign', (R0.x0 - 1) * T, 77.4 * T, { hw: 4, hd: 4, seed: 1 });
  // Hangars
  addProp(W, 'hangar', 35 * T, 68.6 * T, { hw: 120, hd: 70, seed: 1, col: '#6b7076' });
  addProp(W, 'hangar', 43.5 * T, 68.6 * T, { hw: 120, hd: 70, seed: 2, col: '#5f6a62', broken: true });
  // Jets
  addProp(W, 'jetwreck', 38 * T, 90 * T, { hw: 88, hd: 60, seed: 3, ang: 0.15 });
  addProp(W, 'jetwreck', 50 * T, 89 * T, { hw: 88, hd: 60, seed: 4, ang: -0.6, broken: true });
  addProp(W, 'jetwreck', 33 * T, 76 * T, { hw: 88, hd: 60, seed: 5, ang: Math.PI / 2 });
  // Hubschrauber
  addProp(W, 'milheli', 51.5 * T, 84 * T, { hw: 56, hd: 36, seed: 6, ang: 0.7 });
  addProp(W, 'milheli', 30.5 * T, 85 * T, { hw: 56, hd: 36, seed: 7, ang: -1.1, broken: true });
  addProp(W, 'hpad', 51.5 * T, 84 * T, { solid: false });
  // Fahrzeuge
  [[50, 73, 0.2, 0], [53, 75.5, 1.6, 1], [50.5, 78, -0.3, 0], [46, 81, 2.4, 1]].forEach(([x, y, a, br], i) => addProp(W, 'miltruck', x * T, y * T, { hw: 34, hd: 18, seed: 10 + i, ang: a, broken: !!br }));
  addProp(W, 'apc', 41 * T, 82 * T, { hw: 32, hd: 20, seed: 20, ang: 0.4 });
  addProp(W, 'apc', 53 * T, 93.5 * T, { hw: 32, hd: 20, seed: 21, ang: 2.2, broken: true });
  addProp(W, 'tank', 29.5 * T, 93 * T, { hw: 40, hd: 22, tur: 0.8 });
  // Gebäude & Kram
  addProp(W, 'bunker', 53 * T, 68.8 * T, { hw: 45, hd: 35 });
  addProp(W, 'radar', 29.8 * T, 70 * T, { hw: 20, hd: 20, seed: 30 });
  addProp(W, 'fueltank', 54 * T, 86.5 * T, { hw: 22, hd: 22, seed: 31 });
  addProp(W, 'fueltank', 54.5 * T, 82 * T, { hw: 22, hd: 22, seed: 32, broken: true });
  for (const [x, y] of [[28.3, 67.3], [55, 95], [28.3, 95]]) addProp(W, 'wtower', x * T, y * T, { hw: 20, hd: 20 });
  for (const [x, y, a] of [[47, 85, 0], [36, 85, 0.3], [44.5, 75, Math.PI / 2], [31, 81, Math.PI / 2], [48, 93.5, 0]]) addProp(W, 'sandbag', x * T, y * T, { hw: 7, hd: 32, ang: a });
  for (const [x, y, a] of [[47.5, 70.8, 0], [49.5, 70.8, 0], [33, 94.5, 1.57]]) addProp(W, 'miltent', x * T, y * T, { hw: 22, hd: 18, seed: Math.floor(x * 9), ang: a });
  for (const [x, y] of [[42, 87], [36, 79], [47, 77], [40, 94], [52, 91], [32, 72]]) addProp(W, 'crater', x * T, y * T, { solid: false, seed: Math.floor(x * 13 + y) });
  addProp(W, 'milflag', 46.5 * T, 72.6 * T, { hw: 3, hd: 3, seed: 40 });
  for (let k = 0; k < 6; k++) { const x = rr(R0.x0 + 2, R0.x1 - 2) * T, y = rr(R0.y0 + 2, R0.y1 - 2) * T; if (freeAt(W, x, y, 24)) addProp(W, rng() < 0.5 ? 'container' : 'barrels', x, y, { hw: rng() < 0.5 ? 50 : 14, hd: rng() < 0.5 ? 17 : 14, col: rpick(rng, ['#4b5d3a', '#556b2f', '#6b5a3a']), ang: rng() < 0.5 ? 0 : Math.PI / 2 }); }
  // Brennende Wracks (Licht + Rauch)
  W.milFires = [];
  for (const [x, y] of [[50, 89], [43.5, 69.5], [53, 93.5], [30.5, 85]]) { const [px, py] = P2(x, y); W.lightsStatic.push({ x: px, y: py, r: 120, col: '255,130,50', safe: false, flick: true }); W.milFires.push({ x: px, y: py }); }
  // Beute: Militärkisten, Wrackteile, seltene Kisten
  let n = 0; for (let k = 0; k < 120 && n < 16; k++) { const x = rr(R0.x0 + 1.5, R0.x1 - 1.5) * T, y = rr(R0.y0 + 1.5, R0.y1 - 1.5) * T; if (!freeAt(W, x, y, 20)) continue; addNode(W, x, y, 'milcrate'); n++; }
  n = 0; for (let k = 0; k < 120 && n < 9; k++) { const x = rr(R0.x0 + 1.5, R0.x1 - 1.5) * T, y = rr(R0.y0 + 1.5, R0.y1 - 1.5) * T; if (!freeAt(W, x, y, 20)) continue; addNode(W, x, y, 'milwreck'); n++; }
  for (const [x, y, r] of [[35, 70.5, 3], [44, 70.5, 2], [52, 70, 2], [31, 92, 2]]) W.crates.push({ x: x * T, y: y * T, rarity: r, opening: 0, open: false, hold: 0 });
  W.zones.push({ id: 'military', n: 'MILITÄRBASIS EISENFALKE', sub: 'Zerstörte Luftwaffenbasis · Militärteile in Kisten & Wracks · Hier lauern Tote', x0: R0.x0 * T, y0: R0.y0 * T, x1: (R0.x1 + 1) * T, y1: (R0.y1 + 1) * T, col: '#b5c46a' });
}

function buildQuarry(W) {
  const Q = QUARRY, rng = mulberry32(W.seed * 5 + 91), rr = (a, b) => a + rng() * (b - a), T = TILE, S = W.size;
  if (!W.depth) { W.depth = new Float32Array(S * S); W.ramp = new Map(); }
  W.cave = new Set(); W.caveRoofs = [];
  road(W, Q.cx, Q.cy + Q.r - 1, Q.cx, 24);
  const STEP = 24, lvOf = d => clamp(Math.floor((Q.r - d) / 1.9), 0, 4);
  const dist = (gx, gy) => Math.hypot(gx + 0.5 - Q.cx, gy + 0.5 - Q.cy) + W.noise(gx * 3.3, gy * 3.3) * 0.9;
  for (let gy = Q.cy - Q.r - 2; gy <= Q.cy + Q.r + 2; gy++) for (let gx = Q.cx - Q.r - 2; gx <= Q.cx + Q.r + 2; gx++) {
    if (gx < 1 || gy < 1 || gx >= S - 1 || gy >= S - 1) continue;
    const d = dist(gx, gy); if (d > Q.r) continue;
    const i = gy * S + gx; if (W.tiles[i] === 3 && lvOf(d) === 0) continue;
    W.tiles[i] = 21; W.depth[i] = -lvOf(d) * STEP;
  }
  // Plateaus (Felsnadeln) mit verschiedenen Höhen
  const mesa = (cx, cy, rad, dz) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const gx = cx + i, gy = cy + j; if (Math.hypot(i, j) > rad || wTile(W, gx, gy) !== 21) continue; W.depth[gy * S + gx] = Math.min(0, W.depth[gy * S + gx] + dz); } };
  mesa(Q.cx + 3, Q.cy - 2, 1.2, 48); mesa(Q.cx - 3, Q.cy + 3, 1.0, 48); mesa(Q.cx + 1, Q.cy + 1, 0.6, 24);
  // Höhlen (nach Nordwesten, damit man in den Eingang schauen kann)
  const CD = -48;
  for (const ang of [Math.PI * 1.0, Math.PI * 1.22, Math.PI * 1.43]) {
    const dx = Math.cos(ang), dy = Math.sin(ang), tiles = [];
    for (let s = Q.r - 4.6; s <= Q.r + 4.5; s += 0.25) {
      for (const off of [-0.55, 0, 0.55]) {
        const fx = Q.cx + dx * s - dy * off, fy = Q.cy + dy * s + dx * off, gx = Math.floor(fx), gy = Math.floor(fy);
        if (gx < 1 || gy < 1 || gx >= S - 1 || gy >= S - 1) continue;
        const i = gy * S + gx; W.tiles[i] = 21; W.depth[i] = CD;
        if (s > Q.r - 0.3 && !W.cave.has(i)) { W.cave.add(i); tiles.push([gx, gy, s]); }
      }
    }
    if (!tiles.length) continue;
    // Felsdach
    const mx = Q.cx + dx * (Q.r - 0.1), my = Q.cy + dy * (Q.r - 0.1), parts = [], rp = mulberry32(Math.floor(ang * 1000));
    const seen = new Set(), RC = ['#7a766d', '#878279', '#6e6a62', '#918b80', '#837d72'];
    for (const [gx, gy, s] of tiles) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const k = (gx + i) + ',' + (gy + j); if (seen.has(k)) continue; seen.add(k);
      const ox = (gx + i + 0.5 - mx) * T, oy = (gy + j + 0.5 - my) * T, along = ox * dx + oy * dy, across = Math.abs(-ox * dy + oy * dx);
      if (along < -T * 0.5 || across > T * 1.75) continue;
      const hill = Math.max(4, 30 * (1 - across / (T * 2.2)) * Math.min(1, along / (T * 1.4) + 0.55)), c = RC[Math.floor(rp() * RC.length)];
      parts.push([ox + (rp() - 0.5) * 6, oy + (rp() - 0.5) * 6, CD, T + 4, T + 4, -CD + hill * 0.55, c]);
      parts.push([ox + (rp() - 0.5) * 10, oy + (rp() - 0.5) * 10, hill * 0.55, T * 0.8, T * 0.75, hill * 0.35 + 2, hexShade(c, 1.08)]);
      if (rp() < 0.7) parts.push([ox + (rp() - 0.5) * 16, oy + (rp() - 0.5) * 16, hill * 0.9, 12 + rp() * 12, 10 + rp() * 12, 4 + rp() * 6, hexShade(c, 1.15)]);
      if (rp() < 0.55) parts.push([ox + (rp() - 0.5) * 20, oy + (rp() - 0.5) * 20, hill * 0.9, 16 + rp() * 10, 14 + rp() * 8, 2.5, rp() < 0.5 ? '#4f7f3a' : '#5f9c4a']);
      if (rp() < 0.25) { const bx = ox + (rp() - 0.5) * 18, by = oy + (rp() - 0.5) * 18; parts.push([bx, by, hill * 0.9, 4, 4, 10, '#5b3a22'], [bx, by, hill * 0.9 + 8, 16, 16, 10, '#3f8a3a'], [bx, by, hill * 0.9 + 16, 10, 10, 6, '#5cb04a']); }
    }
    // Höhlenmund (dunkle Öffnung + Sturz + Stützbalken)
    const fx = -dx * T * 0.56, fy = -dy * T * 0.56, rot = Math.atan2(dy, dx);
    parts.push([fx * 1.02, fy * 1.02, CD, 4, T * 1.5, 36, '#0d0b09', rot]);
    parts.push([fx * 0.9, fy * 0.9, CD, 2, T * 1.1, 26, '#050403', rot]);
    parts.push([fx * 1.05, fy * 1.05, CD + 36, 8, T * 2.0, 10, '#6a665e', rot]);
    for (const s of [-1, 1]) { const px = fx * 1.04 - dy * s * T * 0.74, py = fy * 1.04 + dx * s * T * 0.74; parts.push([px, py, CD, 5, 5, 36, '#5b3a22'], [px - dy * s * 6, py + dx * s * 6, CD, 14, 14, 24, '#7a766d']); }
    parts.push([fx * 1.06, fy * 1.06, CD + 34, 6, T * 1.6, 4, '#6b4423', rot]);
    parts.push([fx * 1.08 - dy * T * 0.3, fy * 1.08 + dx * T * 0.3, CD + 22, 3, 3, 6, '#ffd27a']);
    W.caveRoofs.push({ x: mx * T, y: my * T, parts, key: 'caveroof|' + Math.round(ang * 100) });
    // Erze & Kristalle in der Höhle (mit Licht)
    tiles.sort((a, b) => a[2] - b[2]);
    tiles.forEach(([gx, gy], k) => {
      if (k % 4 !== 2) return;
      const x = (gx + 0.5) * T, y = (gy + 0.5) * T, kind = ['crystal', 'titanrock', 'coppervein'][(k >> 2) % 3];
      const nd = addNode(W, x, y, kind); if (!nd) return; nd.pit = true;
      W.lightsStatic.push({ x, y, r: 85, col: kind === 'crystal' ? '200,120,255' : kind === 'titanrock' ? '140,220,255' : '90,255,190', safe: false, node: nd });
    });
    const last = tiles[tiles.length - 1]; W.crates.push({ x: (last[0] + 0.5) * T, y: (last[1] + 0.5) * T, rarity: 2, opening: 0, open: false, hold: 0, pit: true });
  }
  // Erze auf den Terrassen
  const spots = []; for (let gy = Q.cy - Q.r; gy <= Q.cy + Q.r; gy++) for (let gx = Q.cx - Q.r; gx <= Q.cx + Q.r; gx++) { const i = gy * S + gx; if (wTile(W, gx, gy) === 21 && !W.cave.has(i)) spots.push([gx, gy]); }
  spots.sort(() => rng() - 0.5);
  const kinds = ['ironvein', 'ironvein', 'coalvein', 'rock', 'ironvein', 'coalvein', 'coppervein', 'rock', 'rock', 'ironvein', 'coalvein', 'rock', 'coppervein', 'ironvein'];
  let placed = 0; for (const [gx, gy] of spots) { if (placed >= kinds.length) break; const x = (gx + 0.3 + rng() * 0.4) * T, y = (gy + 0.3 + rng() * 0.4) * T; if (!freeAt(W, x, y, 20)) continue; const nd = addNode(W, x, y, kinds[placed]); if (nd) { placed++; if (nd.kind === 'coppervein') W.lightsStatic.push({ x, y, r: 60, col: '90,255,190', safe: false, node: nd }); } }
  const top = (gx, gy) => W.depth[gy * S + gx];
  const putIn = (kind, gx, gy, o) => addProp(W, kind, (gx + 0.5) * T, (gy + 0.5) * T, Object.assign({ z: top(gx, gy) }, o));
  // Maschinen & Kram im Bruch
  const deep = spots.filter(([gx, gy]) => top(gx, gy) === -48 && Math.hypot(gx - Q.cx, gy - Q.cy) > 2);
  if (deep[0]) putIn('excavator', deep[0][0], deep[0][1], { hw: 30, hd: 20, seed: 1, ang: 0.6 });
  const mid = spots.filter(([gx, gy]) => top(gx, gy) === -24);
  if (mid[0]) putIn('minecart', mid[0][0], mid[0][1], { hw: 12, hd: 9, seed: 2, ang: 0.3 });
  if (mid[1]) putIn('rockpile', mid[1][0], mid[1][1], { hw: 18, hd: 18, seed: 3 });
  if (mid[2]) putIn('rockpile', mid[2][0], mid[2][1], { hw: 18, hd: 18, seed: 4 });
  const rim = spots.filter(([gx, gy]) => top(gx, gy) === 0 && Math.hypot(gx - Q.cx, gy - Q.cy) > Q.r - 1.6);
  for (let k = 0; k < Math.min(4, rim.length); k += 1) { const [gx, gy] = rim[k * 5 % rim.length]; putIn('quarrylamp', gx, gy, { hw: 4, hd: 4, seed: 10 + k, light: 150, lcol: '255,220,150', safe: false }); }
  // Brecheranlage + Förderband + Hütte am Rand (auf normalem Boden)
  addProp(W, 'crusher', (Q.cx + Q.r + 3.5) * T, (Q.cy + 3) * T, { hw: 60, hd: 46, seed: 5 });
  addProp(W, 'conveyor', (Q.cx + Q.r + 0.6) * T, (Q.cy + 3) * T, { hw: 40, hd: 8, seed: 6, solid: false });
  addProp(W, 'shack', (Q.cx + 6) * T, (Q.cy + Q.r + 2.5) * T, { hw: 30, hd: 24, seed: 7 });
  addProp(W, 'rockpile', (Q.cx + Q.r + 3) * T, (Q.cy - 2) * T, { hw: 20, hd: 20, seed: 8 });
  addProp(W, 'barrels', (Q.cx + 3) * T, (Q.cy + Q.r + 2.2) * T, { hw: 14, hd: 14 });
  W.zones.push({ id: 'quarry', n: 'STEINBRUCH GRAUFELS', sub: 'Terrassen voller Erze · Im Nordwesten führen Höhlen in den Fels', x0: (Q.cx - Q.r - 3) * T, y0: (Q.cy - Q.r - 3) * T, x1: (Q.cx + Q.r + 6) * T, y1: (Q.cy + Q.r + 4) * T, col: '#d6d0c4' });
}
;
;

// ===================================================== game.js =====================================================

// ===== ACTIV · game.js (zusammengeführt aus: factory.js, game.js, update.js) =====

// ----------------------------- factory.js -----------------------------

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
;

// ----------------------------- game.js -----------------------------

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
;

// ----------------------------- update.js -----------------------------

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
  p.hunger = Math.max(0, p.hunger - dt * (100 / 560) * (perk('hunger') ? 0.6 : 1));
  if (p.hunger <= 0) { p.hp -= dt * 1.0; S.starving = true; if (p.hp <= 0) { if (safeCity) { p.hp = 5; UI.toast('Du verhungerst! Kauf etwas zu essen.'); } else { playerDie(); return; } } }
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
    if (!flying && dP < reach + (p.inCar || p.inShip ? 16 : 0) && z.atk <= 0 && S.phase === 'play' && Math.abs(groundZ(z.x, z.y) - groundZ(target.x, target.y)) < 28) {
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
;
;

// ===================================================== engine.js =====================================================

// ===== ACTIV · engine.js (zusammengeführt aus: ship.js, render.js, fp.js, ui.js) =====

// ----------------------------- ship.js -----------------------------

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
;

// ----------------------------- render.js -----------------------------

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
const BIG_PROPS = ['rathaus', 'royal', 'villa', 'shop', 'apartment', 'neoncasino', 'neonbar', 'elevator', 'cityhome', 'blackmarket', 'bunker', 'labbox', 'container', 'pilthouse', 'zaunhouse', 'clocktower', 'glassdome', 'skyloft', 'radiohut', 'radiotower', 'chemvat', 'wreckship', 'cybertower', 'jhouse', 'teahouse', 'gunshop', 'stairsup', 'headframe', 'hangar', 'crusher'];

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
      if (ANIM_PROPS[pr.kind]) { addModel(propParts(Object.assign({}, pr, { ph: t * 1.5 + (pr.ph || 0), t })), pr.x, pr.y, pr.z || 0, pr.ang, 1); continue; }
      if (!pr.skey) pr.skey = 'prop|' + pr.kind + '|' + (pr.len || 0) + '|' + (pr.seed || 0) + '|' + (pr.col || '') + '|' + (pr.col2 || '') + '|' + (pr.broken ? 1 : 0) + '|' + (pr.flowers ? 1 : 0) + '|' + (pr.H || 0) + '|' + (pr.w || 0) + '|' + (pr.cab || 0) + '|' + (pr.zaun ? 1 : 0) + '|' + (pr.owned ? 1 : 0) + '|' + (pr.fixed ? 1 : 0) + '|' + (pr.tur || 0).toFixed(1) + '|' + (pr.ang || 0).toFixed(2);
      const big = BIG_PROPS.includes(pr.kind), behind = big && S.phase === 'play' && pd < pr.x + pr.y + 20 && pd > pr.x + pr.y - (pr.hw + pr.hd) * 2.6 && Math.abs(psx - (pr.x - pr.y)) < (pr.hw + pr.hd) * 0.9;
      const poc = pr.solid !== false && pr.hw && !pr.z ? occlRect(pr.x - pr.hw, pr.y - pr.hd, pr.x + pr.hw, pr.y + pr.hd, pr.x, pr.y, pr.hw * 2, pr.hd * 2, big) : null;
      addSprite(getSprite(pr.skey, () => propParts(pr), pr.ang), pr.x, pr.y, pr.z || 0, 1, poc ? Math.min(poc.al, behind ? 0.35 : 1) : behind ? 0.35 : 1, poc ? poc.sb : pr.solid === false ? (pr.kind === 'edenskyline' ? 0 : -40) : big ? 0 : 10);
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
    const oc = occlRect(b.gx * TILE, b.gy * TILE, (b.gx + b.w) * TILE, (b.gy + b.h) * TILE, b.x, b.y, b.w * TILE, b.h * TILE, b.type !== 'wall' && b.type !== 'gate' && b.type !== 'farm' && b.type !== 'pcable' && b.type !== 'belt' && b.type !== 'helipad');
    if (st && !(b.evo > 0)) addSprite(getSprite('b|' + b.type + '|' + b.level + '|' + b.w + 'x' + b.h + '|' + st(b) + '|' + (b.mkey || ''), () => buildingParts(b, 0)), b.x + shk, b.y, dz, sc, oc ? oc.al : 1, oc ? oc.sb : (b.type === 'wall' ? 12 : 16)); else addModel(buildingParts(b, t), b.x + shk, b.y, dz, BUILD[b.type].rot ? (b.rot || 0) * Math.PI / 2 : 0, sc * (b.evo > 0 ? 1 + Math.sin(b.evo * 18) * 0.04 : 1), oc ? oc.al : 1, oc ? oc.mb : 0);
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
// Verdeckung: Spieler vor/hinter Gebäuden korrekt sortieren (Achsen-Rechteck-Test statt Mittelpunkt)
function occlRect(x0, y0, x1, y1, cx, cy, W2, H2, tall) {
  const p = S.p; if (S.phase !== 'play' || p.inCar || p.inHeli || p.inShip) return null;
  const px = p.x, py = p.y, M = 70; if (px < x0 - M || px > x1 + M || py < y0 - M || py > y1 + M) return null;
  const inside = px > x0 + 2 && px < x1 - 2 && py > y0 + 2 && py < y1 - 2; if (inside) return null;
  const front = px >= x1 - 2 || py >= y1 - 2, ps = px + py, bs = cx + cy;
  if (front) return { sb: ps - 60 - bs, mb: ps - 60 - bs - (W2 + H2) / 2 - 90, al: 1 };
  return { sb: ps + 60 - bs, mb: ps + 60 - bs + (W2 + H2) / 2, al: tall && (W2 + H2) > 100 ? 0.42 : 1 };
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
;

// ----------------------------- fp.js -----------------------------

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
;

// ----------------------------- ui.js -----------------------------

// ===================== UI (DOM) =====================
const $ = id => document.getElementById(id);
const UI = {
  overlay: null, tab: 'arsenal', armWeapon: 'rifle', armSel: null, armFly: 0, armFlash: 0, camoSel: null,
  blocking() { return !!this.overlay; }, show(id) { $(id).classList.remove('hidden'); }, hide(id) { $(id).classList.add('hidden'); },
  announce(t, s, col) { if (!t) return; const a = $('announce'); a.querySelector('.t').textContent = t; a.querySelector('.t').style.color = col || '#fff'; a.querySelector('.s').textContent = s || ''; a.classList.remove('go'); void a.offsetWidth; a.classList.add('go'); },
  combo(t) { const c = $('combo'); c.textContent = t; c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); },
  toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(this._tt); this._tt = setTimeout(() => e.classList.remove('show'), 2800); },
  killfeed(t, col) { const k = $('killfeed'), d = document.createElement('div'); d.className = 'kf'; d.textContent = t; d.style.color = col; k.prepend(d); setTimeout(() => d.remove(), 3500); while (k.children.length > 6) k.lastChild.remove(); },
  transition(title, sub, fn, dur) { const e = $('trans'); e.querySelector('.t').textContent = title; e.querySelector('.s').textContent = sub || ''; e.classList.remove('hidden', 'out'); void e.offsetWidth; e.classList.add('in'); this.closeAll(); this.overlay = 'trans'; setTimeout(() => { try { fn(); } catch (err) { showErr(err); } if (this.overlay === 'trans') this.overlay = null; e.classList.remove('in'); e.classList.add('out'); setTimeout(() => e.classList.add('hidden'), 600); }, dur || 900); },
  report(title, html, col) { const r = $('report'); r.querySelector('h2').textContent = title; r.querySelector('h2').style.color = col || '#ffd84a'; r.querySelector('.rb').innerHTML = html; r.classList.remove('hidden', 'go'); void r.offsetWidth; r.classList.add('go'); clearTimeout(this._rt); this._rt = setTimeout(() => r.classList.add('hidden'), 9000); },
  dailyReport(lines) { if (!lines.length) return; this.report('☀ TAGESBERICHT · TAG ' + S.day, lines.map(([a, b, c]) => `<div class="rl"><span>${a}</span><b style="color:${c}">${b}</b></div>`).join('') + `<div class="rl"><span>Kontostand</span><b class="money">${fmtMoney(S.res.money)}</b></div>`); },
  raidReport(atk, def, lost) { const ok = !lost.length; this.report(ok ? '🛡 BASIS HAT DIE NACHT ÜBERSTANDEN' : '🔥 ÜBERFALL AUF DEINE BASIS', `<div class="rl"><span>Angriffsstärke</span><b style="color:#ff6b6b">${Math.round(atk)}</b></div><div class="rl"><span>Verteidigung</span><b style="color:#7dff5a">${Math.round(def)}</b></div>` + (lost.length ? `<div class="rl"><span>Zerstört</span><b style="color:#ff6b6b">${lost.join(', ')}</b></div>` : '<div class="rl"><span>Keine Verluste</span><b>✔</b></div>'), ok ? '#7dff5a' : '#ff5e3a'); },
  expReport(ok, lines, xp, B, reason) { this.report(ok ? '🚁 EXTRAKTION: ' + B.n.toUpperCase() : '☠ ' + reason, (lines.length ? lines.map(([k, v]) => `<div class="rl"><span>${RES[k].ic} ${RES[k].n}</span><b style="color:${ok ? RES[k].col : '#777'}">+${v}</b></div>`).join('') : '<div class="rl"><span>Keine Beute</span><b>—</b></div>') + (ok ? `<div class="rl"><span>Erfahrung</span><b style="color:#c9a0ff">+${xp} XP</b></div>` : ''), ok ? '#ffd84a' : '#ff5e3a'); },
  buildHotbar() {
    const hb = $('hotbar'); hb.innerHTML = '';
    HOTBAR.forEach((k, i) => { const w = WEAPONS[k], d = document.createElement('div'); d.className = 'slot' + (i === 0 ? ' fixed' : ''); d.innerHTML = `<span class="k">${i + 1}</span><span class="ic">${w.icon}</span><span class="nm">${w.n.toUpperCase()}</span><span class="am"></span>`; hb.appendChild(d); });
    const bb = $('buildbar'); bb.innerHTML = '';
    if (typeof BUILD_CATS !== 'undefined' && S) { const cats = document.createElement('div'); cats.className = 'bcats'; BUILD_CATS.forEach((c, i) => { const t = document.createElement('div'); t.className = 'bcat' + (i === (S.buildCat || 0) ? ' act' : ''); t.innerHTML = c.n; t.onclick = () => setBuildCat(i); cats.appendChild(t); }); const hint = document.createElement('div'); hint.className = 'bcat hint'; hint.textContent = 'TAB ⇄'; cats.appendChild(hint); bb.appendChild(cats); }
    curOrder().forEach((k, i) => { const b = BUILD[k], d = document.createElement('div'); d.className = 'bslot'; d.dataset.k = k; d.innerHTML = `<div class="k">${KEYSET[i]}</div><div class="ic">${b.icon}</div><div class="nm">${b.n}</div><div class="c"></div>`; d.onclick = () => { S.build.sel = k; SFX.play('click'); }; bb.appendChild(d); });
    const res = $('res'); res.innerHTML = ''; HUD_RES.forEach(k => { const d = document.createElement('div'); d.className = 'rs' + (RES[k].rare ? ' rare' : ''); d.innerHTML = `<small>${RES[k].s}</small><span id="r_${k}">0</span>`; res.appendChild(d); });
  },
  _last: 0,
  updateHud(force) {
    const now = performance.now(); if (!force && now - this._last < 80) return; this._last = now;
    const p = S.p, C = S.city;
    $('hpBar').style.width = (p.hp / p.maxHp * 100) + '%'; $('hpTxt').textContent = Math.ceil(Math.max(0, p.hp)) + '/' + p.maxHp;
    $('huBar').style.width = p.hunger + '%'; $('huTxt').textContent = Math.round(p.hunger); $('stBar').style.width = p.stamina + '%';
    $('lvlBadge').textContent = S.level; $('xpBar').style.width = (S.xp / xpNeed() * 100) + '%'; $('xpTxt').textContent = Math.floor(S.xp) + '/' + xpNeed();
    $('moneyTxt').textContent = fmtMoney(S.res.money); $('rankTxt').textContent = RANKS[C.rank].n + (C.job ? ' · ' + JOBS[C.job].n : '');
    for (const k of HUD_RES) { const e = $('r_' + k); if (!e) continue; const v = Math.floor(S.res[k] || 0); e.textContent = RES[k].cap ? v + '/' + S.cap : v; e.style.color = RES[k].cap && v >= S.cap ? '#ff8080' : RES[k].rare && v > 0 ? RES[k].col : '#fff'; e.parentNode.style.display = RES[k].rare && !v && !(S.exp && S.exp.bag[k]) ? 'none' : ''; }
    const hh = Math.floor(S.time * 24), mm = Math.floor((S.time * 24 % 1) * 60);
    $('clkT').textContent = `TAG ${S.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    $('clkW').textContent = '📍 ' + (S.where === 'main' ? (S.curZone ? S.curZone.n : 'WILDNIS') : S.W.name);
    const night = S.dayness < 0.35;
    $('clkS').innerHTML = (night ? `<span style="color:${S.bloodMoon ? '#ff2a2a' : '#ff6b6b'}">${S.bloodMoon ? '🩸 BLUTMOND' : '☾ NACHT ' + S.night}</span>` : '☀ Tag') + ' · ' + { Klar: '☀ Klar', Regen: '🌧 Regen', Nebel: '🌫 Nebel', Gewitter: '⛈ Gewitter' }[S.weather] + '';
    $('clkP').innerHTML = S.where === 'main' ? `⚡ Strom ${S.power.use}/${S.power.prod}` + (S.uav > 0 ? ' · <span style="color:#ff5e3a">UAV</span>' : '') : '';
    const slots = $('hotbar').children;
    HOTBAR.forEach((k, i) => { const s = slots[i]; if (!s) return; s.classList.toggle('act', i === p.slot && !S.build.on); let am = ''; if (GUNS.includes(k)) am = p.mag[k] + '/' + S.res.ammo; if (k === 'medkit') am = S.res.meds; if (k === 'grenade') am = S.res.grenades; s.querySelector('.am').textContent = am; });
    $('buildbar').classList.toggle('hidden', !S.build.on); $('buildinfo').classList.toggle('hidden', !S.build.on);
    $('mode').innerHTML = S.build.on ? '🏗 BAUMODUS · B = Kampf' : p.inCar ? '🚗 FAHREN · E = Aussteigen' : p.inHeli ? '🚁 FLIEGEN · E = Landen' : p.inShip ? (S.where === 'space' ? '🚀 WELTRAUM · C halten = Wiedereintritt' : '🚀 FLUG · LEER ↑ · C ↓') : inCity() ? '🏙 STADT · Waffen gesichert' : S.where === 'planet' ? '🪐 PLANET · B = Kolonie bauen' : '⚔ KAMPF · B = Bauen';
    if (S.build.on) {
      for (const d of $('buildbar').children) { const k = d.dataset.k; if (!k) continue; const c = buildCost(k); d.classList.toggle('act', k === S.build.sel); d.classList.toggle('poor', !canAfford(c)); d.querySelector('.c').textContent = costStr(c); }
      const g = S.ghost, def = BUILD[S.build.sel], hov = S.hoverB;
      let txt = `<b>${def.n}</b> – ${def.desc}<br>` + (g ? (g.ok ? '<span style="color:#9cff66">✔ Klick zum Bauen</span>' : '<span style="color:#ff8080">✖ ' + g.why + '</span>') : '');
      if (hov) txt += ` | Ziel: <b>${BUILD[hov.type].n} St.${hov.level}</b> · U Upgrade (${hov.level >= maxLevel(hov.type) ? 'MAX' : costStr(upgradeCost(hov.type, hov.level))}) · X Abreißen`;
      if (g && g.mount) txt = `<b>⚔ VERSCHMELZEN:</b> ${def.n} auf Mauer setzen → ${S.build.sel === 'turret' ? 'WEHRTURM' : 'MG-BASTION'} (+160 HP, +Reichweite)<br>` + (g.ok ? '<span style="color:#ffd84a">✔ Klick zum Verschmelzen!</span>' : '<span style="color:#ff8080">✖ ' + g.why + '</span>');
      if (def.rot) txt += ' · <b style="color:#ffd84a">Richtung: ' + DIR_NAMES[S.build.rot] + '</b>';
      $('buildinfo').innerHTML = txt + ' · R Drehen · Shift+Rad wechseln · TAB Kategorie';
    }
    const pr = $('prompt'); pr.classList.toggle('hidden', !S.prompt || S.build.on); if (S.prompt) pr.textContent = S.prompt;
    if (p.inCar) { const c = p.inCar; pr.classList.remove('hidden'); pr.innerHTML = `🚗 ${Math.round(Math.abs(c.v) / 3)} km/h · ⛽ ${Math.round(c.fuel)}% · 🛡 ${Math.round(c.hp)}/${c.maxHp} · E Aussteigen`; }
    if (p.inHeli) { const h = p.inHeli; pr.classList.remove('hidden'); pr.innerHTML = `🚁 Höhe ${Math.round(h.z)} · ⛽ ${Math.round(h.fuel)}% · 🛡 ${Math.round(h.hp)}/${h.maxHp} · E/LEERTASTE Landen`; }
    const sb = $('shipbar'); sb.classList.toggle('hidden', !p.inShip);
    if (p.inShip) { const sh = p.inShip, mh = shipMaxHp(sh), ms = shipMaxShield(sh); $('shHp').style.width = sh.hp / mh * 100 + '%'; $('shSh').style.width = (ms ? sh.shield / ms * 100 : 0) + '%'; $('shAlt').style.height = clamp((S.where === 'space' ? 1 : sh.z / 520), 0, 1) * 100 + '%'; $('shTxt').innerHTML = S.where === 'space' ? (sh.reentry > 0 ? '<span style="color:#ff9a3c">WIEDEREINTRITT ' + Math.round(sh.reentry / 1.6 * 100) + '%</span>' : 'ORBIT · ' + PLANETS.find(q => q.id === sh.orbit).n) : 'HÖHE ' + Math.round(sh.z) + (sh.z > 380 ? ' <span style="color:#7ff4ff">→ ORBIT</span>' : ''); if (S.prompt) { pr.classList.remove('hidden'); pr.textContent = S.prompt; } }
    const mp = missionProgress(), t = C.task, me = $('mission'); let mh = factoryHud();
    if (mp) mh += `<b>MISSION · ${mp.m.n.toUpperCase()}</b><br>${mp.m.d(mp.a.goal)}<div class="bar" style="height:8px;margin-top:5px"><div style="width:${mp.v / mp.a.goal * 100}%;background:#7ad7ff"></div></div>`;
    if (t) mh += `${mh ? '<hr>' : ''}<b style="color:#ffd84a">${t.icon} ${t.n}</b><br>${t.desc}${t.time ? `<div class="bar" style="height:8px;margin-top:5px"><div style="width:${t.left / t.time * 100}%;background:${t.left < 30 ? '#ff5e3a' : '#ffd84a'}"></div></div>⏱ ${Math.ceil(t.left)}s` : ''}${t.goal ? ` · ${t.progress}/${t.goal}` : ''}`;
    if (S.exp) { const e = S.exp; mh = `<b style="color:#ff9a3c">🚁 EXPEDITION · ${BIOMES[e.o.biome].n}</b><div class="bar" style="height:10px;margin-top:5px"><div style="width:${e.left / e.o.dur * 100}%;background:${e.left < 60 ? '#ff3b30' : '#ff9a3c'}"></div></div><b style="font-size:16px">EXTRAKTION: ${Math.floor(e.left / 60)}:${String(Math.floor(e.left % 60)).padStart(2, '0')}</b><br>🎒 ${Object.entries(e.bag).map(([k, v]) => RES[k].ic + v).join(' ') || 'leer'}`; }
    if (S.where === 'station' && !S.station.owned) mh = `<b style="color:#ff5e3a">⚠ STATION BESETZT</b><br>Xenos an Bord: ${S.zombies.length}<br>Ziel: Kern hacken (E halten)`;
    me.classList.toggle('hidden', !mh); me.innerHTML = mh; if (mh) me.style.top = ($('tl').offsetHeight + 24) + 'px';
    const st = $('streak'); st.classList.toggle('hidden', S.streak < 2); if (S.streak >= 2) st.innerHTML = `<span class="n">${S.streak}</span> ABSCHUSSSERIE`;
    const bf = []; if (C.buffs.dmg > 0) bf.push('💥 ' + Math.ceil(C.buffs.dmg) + 's'); if (C.buffs.speed > 0) bf.push('👟 ' + Math.ceil(C.buffs.speed) + 's'); $('buffs').textContent = bf.join(' · ');
  },
  openPause() { this.overlay = 'pause'; this.show('pause'); if (document.pointerLockElement) document.exitPointerLock(); },
  closeAll() { ['pause', 'terminal', 'perks', 'settings', 'help', 'death', 'citymenu', 'holo', 'shipui'].forEach(i => this.hide(i)); this.overlay = null; },
  openStation(n) {
    if (n.station === 'elevator') { changeLevel(S.where === 'city' ? 'under' : 'city'); return; }
    if (n.station === 'exit') { leaveCity(); return; }
    if (n.station === 'royal' && S.city.rank < 3) { this.toast('🎩 „Nur für angesehene Bürger.“ (Rang: Angesehen)'); SFX.play('deny'); return; }
    CityUI.open(n.station);
  },
  openTerminal() { this.overlay = 'terminal'; this.show('terminal'); this.armSel = null; this.renderTab(); SFX.play('click'); if (document.pointerLockElement) document.exitPointerLock(); },
  renderTab() {
    document.querySelectorAll('#terminal .tab').forEach(t => t.classList.toggle('act', t.dataset.t === this.tab));
    const body = $('tBody');
    if (this.tab === 'arsenal' || this.tab === 'camo') {
      const wk = this.armWeapon;
      body.innerHTML = `<div class="tgrid"><div><div class="row" style="margin-bottom:8px">${GUNS.map(g => `<button class="btn sm ${wk === g ? 'gold' : ''}" data-w="${g}">${WEAPONS[g].n.toUpperCase()}${!S.unlocked[g] ? ' 🔒' : ''}</button>`).join('')}</div><canvas id="armCv" width="560" height="330"></canvas><div id="armStats" style="font-size:12px;margin-top:8px;color:#9fdcf0"></div></div><div><div class="alist" id="aList"></div><div id="confirmBar"></div></div></div>`;
      body.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { this.armWeapon = b.dataset.w; this.armSel = null; SFX.play('click'); this.renderTab(); });
      const list = $('aList'), locked = !S.unlocked[wk];
      if (locked) { list.innerHTML = `<div class="mcard" style="grid-column:1/3"><b>🔒 ${WEAPONS[wk].n.toUpperCase()} – NICHT IM BESITZ</b><p>Waffen bekommst du nur auf zwei Wegen:<br>• <b style="color:#ffd84a">Kaufen</b> beim Waffenhändler »Kaliber« (Neonstadt) oder auf dem Schwarzmarkt (Altstadt).<br>• <b style="color:#b05cff">Finden</b> – ganz selten in Kisten.</p><small style="color:#ffe066">${GUN_SHOP[wk] ? 'Kaliber: ' + fmtMoney(GUN_SHOP[wk].price) : ''}${GUN_SHOP[wk] && BLACK_GUNS[wk] ? ' · ' : ''}${BLACK_GUNS[wk] ? 'Schwarzmarkt: ' + fmtMoney(BLACK_GUNS[wk].price) : ''}</small></div>`; $('confirmBar').innerHTML = ''; }
      else if (this.tab === 'arsenal') {
        for (const [k, a] of Object.entries(ATTACH)) { const own = S.attach[wk][k], d = document.createElement('div'); d.className = 'aitem' + (own ? ' own' : '') + (this.armSel === k ? ' sel' : ''); d.innerHTML = `<b>${a.icon} ${a.n}</b><small>${a.d}</small><small style="color:${own ? '#4dff6a' : canAfford(a.cost) ? '#ffe066' : '#ff8080'}">${own ? '✔ MONTIERT' : costStr(a.cost)}</small>`; d.onclick = () => { if (own) return; this.armSel = k; this.armFly = 1; SFX.tone(400, 0.25, 'sawtooth', 0.06, 2.5); this.renderTab(); }; list.appendChild(d); }
        const cb = $('confirmBar');
        if (this.armSel) { const a = ATTACH[this.armSel], ok = canAfford(a.cost); cb.innerHTML = `<div class="info">${a.n}<br><span style="color:${ok ? '#ffe066' : '#ff8080'}">${costStr(a.cost)}</span></div><button class="btn red" id="aCancel">ABBRECHEN</button><button class="btn gold" id="aOk" ${ok ? '' : 'disabled'}>✔ MONTIEREN</button>`; $('aCancel').onclick = () => { this.armSel = null; this.renderTab(); }; $('aOk').onclick = () => { if (!canAfford(a.cost)) return; pay(a.cost); S.attach[wk][this.armSel] = true; this.armSel = null; this.armFlash = 1; SFX.play('upgrade'); addXp(30); const cv = $('armCv'); cv.classList.remove('flashfx'); void cv.offsetWidth; cv.classList.add('flashfx'); this.renderTab(); }; }
        else cb.innerHTML = '<div class="info" style="color:#9fc4d0">Aufsatz wählen – er fliegt auf die Waffe.</div>';
      } else {
        const kills = S.stats.wk[wk];
        for (const c of CAMOS) { const un = kills >= c.kills, d = document.createElement('div'); d.className = 'aitem' + (S.camo[wk] === c.id ? ' own' : '') + (un ? '' : ' lock'); d.innerHTML = `<b><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${c.col};vertical-align:middle;border:2px solid #000"></span> ${c.n}</b><small>${un ? 'Freigeschaltet' : '🔒 ' + kills + '/' + c.kills + ' Kills'}</small>`; d.onmouseenter = () => { if (un) this.camoSel = c.id; }; d.onclick = () => { if (!un) return; S.camo[wk] = c.id; this.armFlash = 1; SFX.play('crate'); this.renderTab(); }; list.appendChild(d); }
        $('confirmBar').innerHTML = '';
      }
      const st = weaponStat(wk); $('armStats').innerHTML = `SCHADEN ${Math.round(st.dmg)}${st.pellets > 1 ? 'x' + st.pellets : ''} · FEUERRATE ${Math.round(60 / st.rate)}/min · MAGAZIN ${st.mag} · NACHLADEN ${st.reload.toFixed(1)}s`;
    } else if (this.tab === 'cars') {
      const hasGarage = S.mainB.some(b => b.type === 'garage'), car = (S.lastCar && !S.lastCar.wreck) ? S.lastCar : S.mainW.cars.find(c => !c.wreck), h = S.mainW.heli;
      let html = '<div class="tgrid" style="grid-template-columns:1fr 1fr"><div>';
      if (!hasGarage) html += '<div class="mcard"><b>🔧 GARAGE BENÖTIGT</b><p>Baumodus, Taste 0.</p></div>'; else if (!car) html += '<div class="mcard"><b>🚗 KEIN AUTO</b><p>Es gibt nur zwei Wracks auf der Karte. Halte Ausschau!</p></div>';
      else { html += `<div class="mcard"><b>🚗 AUTO</b><p>HP ${Math.round(car.hp)}/${car.maxHp} · Sprit ${Math.round(car.fuel)}%</p></div><div class="alist">`; for (const [k, u] of Object.entries(CAR_UP)) { const lv = car.up[k] || 0, max = lv >= u.max, c = u.cost(lv + 1); html += `<div class="aitem ${max ? 'own' : ''}" data-u="${k}"><b>${u.icon} ${u.n}</b><small>${u.d}</small><small style="color:${max ? '#4dff6a' : canAfford(c) ? '#ffe066' : '#ff8080'}">${max ? '✔ MAX' : costStr(c)}</small></div>`; } html += '</div>'; }
      html += '</div><div>';
      if (!h || h.wreck) html += '<div class="mcard"><b>🚁 HELIKOPTER</b><p>Wrack auf einem Dach in Rosthafen.</p></div>';
      else { html += `<div class="mcard"><b>🚁 HELIKOPTER</b><p>HP ${Math.round(h.hp)}/${h.maxHp} · Sprit ${Math.round(h.fuel)}%</p></div><div class="alist">`; for (const [k, u] of Object.entries(HELI_UP)) html += `<div class="aitem ${h.up[k] ? 'own' : ''}" data-hu="${k}"><b>${u.icon} ${u.n}</b><small>${u.d}</small><small style="color:${h.up[k] ? '#4dff6a' : canAfford(u.cost) ? '#ffe066' : '#ff8080'}">${h.up[k] ? '✔' : costStr(u.cost)}</small></div>`; html += '</div>'; }
      body.innerHTML = html + '</div></div>';
      body.querySelectorAll('[data-u]').forEach(d => d.onclick = () => { const k = d.dataset.u, u = CAR_UP[k], lv = car.up[k] || 0; if (lv >= u.max) return; const c = u.cost(lv + 1); if (!canAfford(c)) { SFX.play('deny'); return; } pay(c); car.up[k] = lv + 1; if (k === 'armor') { car.maxHp = 220 + car.up.armor * 120; car.hp = car.maxHp; } SFX.play('upgrade'); addXp(40); this.renderTab(); });
      body.querySelectorAll('[data-hu]').forEach(d => d.onclick = () => { const k = d.dataset.hu, u = HELI_UP[k]; if (h.up[k] || !canAfford(u.cost)) { SFX.play('deny'); return; } pay(u.cost); h.up[k] = 1; if (k === 'armor') { h.maxHp += 150; h.hp = h.maxHp; } SFX.play('upgrade'); addXp(60); this.renderTab(); });
    } else if (this.tab === 'ship') {
      body.innerHTML = S.ship ? `<div class="mcard act"><b>🚀 RAUMSCHIFF</b><p>Rumpf ${Math.round(S.ship.hp)}/${shipMaxHp(S.ship)} · Schild ${shipMaxShield(S.ship)} · Station: ${S.station.owned ? 'Deine (Orbit ' + PLANETS.find(p => p.id === S.station.at).n + ')' : 'nicht übernommen'} · Crew ${S.crew.length}/5</p><button class="btn gold big" id="openHangar">🔧 HANGAR ÖFFNEN</button></div>` : '<div class="mcard"><b>🚀 KEIN RAUMSCHIFF</b><p>Kaufe in Neu-Eden ein Himmelsloft mit Landeplattform – dann verkauft dir die Werft »Sternenschmiede« ein Schiff.</p></div>';
      const oh = $('openHangar'); if (oh) oh.onclick = () => { this.hide('terminal'); ShipUI.open(); };
    } else if (this.tab === 'missions') {
      if (!S.missions.offers.length) genOffers(); const act = S.missions.active;
      body.innerHTML = '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">' + S.missions.offers.map(o => { const m = MISSION_POOL.find(x => x.id === o.id), isA = act && act.id === o.id; return `<div class="mcard ${isA ? 'act' : ''}"><b>${m.n.toUpperCase()}</b><p>${m.d(o.goal)}</p><small>${costStr(o.reward)} + XP</small><br><br><button class="btn ${isA ? '' : 'gold'}" data-m="${o.id}" ${isA ? 'disabled' : ''}>${isA ? '● AKTIV' : 'ANNEHMEN'}</button></div>`; }).join('') + '</div>';
      body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { startMission(S.missions.offers.find(o => o.id === b.dataset.m)); this.renderTab(); });
    } else if (this.tab === 'exp') {
      if (!S.expOffers.length) genExpOffers(); const why = expBlocker();
      body.innerHTML = `<div class="mcard" style="margin-bottom:12px;border-color:${why ? '#ff5e3a' : '#4dff6a'}"><b>${why ? '⛔ NICHT STARTBEREIT' : '✔ HELIKOPTER STARTBEREIT'}</b><p>${why || 'Wähle ein Einsatzgebiet.'}</p><small>Beute landet im 🎒 Rucksack – nur bei erfolgreicher Extraktion behältst du sie.</small></div><div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">` + S.expOffers.map((o, i) => { const B = BIOMES[o.biome]; return `<div class="mcard exp-${o.biome}"><b>${B.icon} ${B.n.toUpperCase()}</b><p>${B.desc}</p><small>Gefahr ${'☠'.repeat(o.danger)} · ${Math.floor(o.dur / 60)} min · Sprit ${o.fuel}%</small><br><small>Exklusiv: <b style="color:${RES[B.excl].col}">${RES[B.excl].ic} ${RES[B.excl].n}</b></small><br><br><button class="btn gold" data-exp="${i}" ${why ? 'disabled' : ''}>🚁 STARTEN</button></div>`; }).join('') + '</div>';
      body.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => startExpedition(S.expOffers[+b.dataset.exp]));
    } else if (this.tab === 'stats') {
      const s = S.stats, it = [['MONSTER', s.kills], ['ALIENS', s.aliens], ['NÄCHTE', s.nights], ['LEVEL', S.level], ['BÄUME', s.trees], ['GEBÄUDE', s.built], ['KISTEN', s.crates], ['ETAGEN', s.floors], ['EXPEDITIONEN', s.exps], ['PLANETEN', s.planets], ['LIEFERUNGEN', s.deliveries], ['BOSSE', s.bosses], ['FABRIK-GÜTER', s.factory || 0], ['CASINO +', fmtMoney(s.casinoWon)], ['CASINO −', fmtMoney(s.casinoLost)], ['SPIELZEIT', Math.floor(s.played / 60) + ' min']];
      body.innerHTML = '<div class="stats">' + it.map(([n, v]) => `<div class="stat"><b>${v}</b><small>${n}</small></div>`).join('') + '</div>';
    }
  },
  renderArsenal(dt) {
    const cv = $('armCv'); if (!cv || this.overlay !== 'terminal' || (this.tab !== 'arsenal' && this.tab !== 'camo')) return;
    const g = cv.getContext('2d'), t = performance.now() / 1000, wk = this.armWeapon; g.clearRect(0, 0, cv.width, cv.height);
    const sG = G, sV = Object.assign({}, VIEW), sO = OUTLINE, zm = wk === 'sniper' ? 8.5 : 10.5;
    G = g; OUTLINE = true; Object.assign(VIEW, { cx: 7, cy: -7, ox: cv.width / 2, oy: cv.height / 2 + 175 * zm / 10.5, zoom: zm }); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
    const ang = -0.62 + Math.sin(t * 0.6) * 0.3, camo = this.tab === 'camo' && this.camoSel ? this.camoSel : S.camo[wk], base = S.attach[wk], withSel = this.armSel ? Object.assign({}, base, { [this.armSel]: true }) : base;
    const all = [], bp = []; weaponParts(wk, { attach: withSel, camo, t }, all); weaponParts(wk, { attach: base, camo, t }, bp);
    const keys = new Set(bp.map(p => p.join(','))); this.armFly = Math.max(0, this.armFly - dt * 1.4); const e = Math.pow(this.armFly, 2);
    isoEllipse(7, -7, -10, 26, 'rgba(0,0,0,0.35)'); BOXES = [];
    const locked = !S.unlocked[wk];
    addModel(all.filter(p => keys.has(p.join(','))), 0, 0, -10, ang, 1, locked ? 0.35 : 1); addModel(all.filter(p => !keys.has(p.join(','))), 0, 0, -10 + e * 40, ang + e * 2.5, 1, 0.95, 50); flushBoxes();
    G = sG; Object.assign(VIEW, sV); OUTLINE = sO;
    if (this.armFlash > 0) { this.armFlash -= dt * 1.5; g.fillStyle = 'rgba(255,240,150,' + Math.max(0, this.armFlash) * 0.6 + ')'; g.fillRect(0, 0, cv.width, cv.height); }
    g.fillStyle = '#7ad7ff'; g.font = '900 13px Courier New'; g.fillText('> ' + WEAPONS[wk].n.toUpperCase(), 14, 22);
  },
  openPerks() {
    if (this.overlay && this.overlay !== 'perks') { S.perkDelay = 0.5; return; }
    this.overlay = 'perks'; this.show('perks'); if (document.pointerLockElement) document.exitPointerLock();
    const box = $('pCards'); box.innerHTML = '';
    PERKS.slice().sort(() => Math.random() - 0.5).slice(0, 3).forEach(pk => { const d = document.createElement('div'); d.className = 'pcard'; d.innerHTML = `<div class="ic">${pk.icon}</div><b>${pk.n}</b><p>${pk.d}</p><small>${S.perks[pk.id] ? 'STUFE ' + (S.perks[pk.id] + 1) : 'NEU'}</small>`; d.onclick = () => { S.perks[pk.id] = (S.perks[pk.id] || 0) + 1; if (pk.id === 'hp') { S.p.maxHp += 25; S.p.hp += 25; } SFX.play('upgrade'); S.pendingPerks--; this.hide('perks'); this.overlay = null; announce(pk.n.toUpperCase(), pk.d, '#ffe066'); if (S.pendingPerks > 0) S.perkDelay = 0.4; }; box.appendChild(d); });
  },
  showDeath() { this.overlay = 'death'; this.show('death'); if (document.pointerLockElement) document.exitPointerLock(); $('dStats').innerHTML = S.exp ? '<span style="color:#ff5e3a">EXPEDITION GESCHEITERT – Beute verloren.</span>' : `Tag ${S.day} · ${S.stats.kills} Monster erledigt · Level ${S.level}`; $('dRespawn').textContent = S.exp ? '🚁 ZUR BASIS' : hq() ? '↻ AM HQ WIEDERBELEBEN' : '↻ WIEDERBELEBEN'; },
  editLook: null, editSpin: 0, editWalk: false,
  openEditor() { this.editLook = Object.assign({}, LOOK); this.show('editor'); this.hide('menu'); $('cName').value = this.editLook.name; this.renderEditorOpts(); },
  renderEditorOpts() {
    const o = $('cOpts'); o.innerHTML = ''; const L = this.editLook;
    const add = (key, label, colors) => { const d = document.createElement('div'); d.className = 'opt'; d.innerHTML = `<div class="lbl">${label}</div><div class="sw"></div>`; const sw = d.querySelector('.sw'); for (const v of CHAR_OPTS[key]) { const e = document.createElement('div'); if (colors) { e.className = 'c' + (L[key] === v ? ' sel' : ''); e.style.background = v; } else { e.className = 't' + (L[key] === v ? ' sel' : ''); e.textContent = v; } e.onclick = () => { L[key] = v; SFX.play('click'); this.renderEditorOpts(); }; sw.appendChild(e); } o.appendChild(d); };
    add('skin', 'HAUTFARBE', true); add('hairStyle', 'FRISUR'); add('hair', 'HAARFARBE', true); add('beard', 'BART'); add('hat', 'KOPFBEDECKUNG'); add('shirt', 'OBERTEIL', true); add('pants', 'HOSE', true); add('pack', 'RUCKSACK', true); add('build', 'KÖRPERBAU');
  },
  renderEditor(dt) {
    const cv = $('prevCv'), g = cv.getContext('2d'), t = performance.now() / 1000; g.clearRect(0, 0, cv.width, cv.height);
    const sG = G, sV = Object.assign({}, VIEW); G = g; Object.assign(VIEW, { cx: 0, cy: 0, ox: cv.width / 2, oy: cv.height / 2 + 150, zoom: 6.2 }); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
    isoEllipse(0, 0, 0, 16, 'rgba(0,0,0,0.35)'); this.editSpin += dt * 0.7; BOXES = []; addModel(humanParts(this.editLook, { walk: t * 9, moving: this.editWalk ? 1 : 0, tool: 'rifle', attach: {}, camo: 'std', t }), 0, 0, 0, this.editSpin, 1); flushBoxes();
    G = sG; Object.assign(VIEW, sV); g.fillStyle = '#ffe066'; g.font = '900 22px Arial Black'; g.textAlign = 'center'; g.fillText(($('cName').value || 'Survivor').toUpperCase(), cv.width / 2, 36); g.textAlign = 'left';
  },
  randomLook() { const L = this.editLook; for (const k of Object.keys(CHAR_OPTS)) L[k] = pick(CHAR_OPTS[k]); SFX.play('crate'); this.renderEditorOpts(); },
  renderSettings() {
    $('sVol').value = SETTINGS.vol; $('sVolT').textContent = Math.round(SETTINGS.vol * 100) + '%';
    const tog = (id, key, vals) => { const e = $(id); e.innerHTML = ''; vals.forEach(([v, n]) => { const d = document.createElement('div'); d.className = 't' + (SETTINGS[key] === v ? ' sel' : ''); d.textContent = n; d.onclick = () => { SETTINGS[key] = v; this.saveSettings(); this.renderSettings(); }; e.appendChild(d); }); };
    tog('sShake', 'shake', [[true, 'AN'], [false, 'AUS']]); tog('sOut', 'outline', [[true, 'AN'], [false, 'AUS']]); tog('sPart', 'particles', [['hoch', 'HOCH'], ['niedrig', 'NIEDRIG']]); tog('sFps', 'fps', [[true, 'AN'], [false, 'AUS']]);
  },
  saveSettings() { localStorage.setItem('vs9_settings', JSON.stringify(SETTINGS)); SFX.setVol(SETTINGS.vol); $('fps').classList.toggle('hidden', !SETTINGS.fps); },
};
;
;

// ===================================================== city.js =====================================================

// ===== ACTIV · city.js (zusammengeführt aus: city.js, casino.js, expedition.js, auth.js, main.js) =====

// ----------------------------- city.js -----------------------------

// ===================== NEU-EDEN: Wirtschaft, Aufträge, Jobs, Ränge, Werft, Behörde =====================
function aptTier() { let t = 0; for (const a of APTS) if (S.city.apts[a.id]) t = Math.max(t, a.tier); return t; }
function hasBiz() { return Object.keys(S.city.biz).length > 0; }
function discount() { let d = 1; if (S.city.mayor) d *= 0.75; else if (S.city.rank >= 4) d *= 0.9; if (perk('haggle')) d *= 0.9; return d; }
function priceBuy(k) { const m = MARKET[k]; return Math.max(1, Math.ceil(m.buy * (m.pack || 1) * S.city.priceF * discount())); }
function priceSell(k) { const m = MARKET[k]; return Math.max(1, Math.floor(m.sell * (m.pack || 1) * (2 - S.city.priceF) * (1 + 0.15 * perk('haggle')))); }
function giveMoney(v) { S.res.money += v; floater(S.p.x, S.p.y, '+' + fmtMoney(v), '#ffd84a', v >= 500); SFX.play(v >= 500 ? 'cash' : 'coin'); }
function spendMoney(v) { if (S.res.money < v) { SFX.play('deny'); UI.toast('Nicht genug Credits (' + fmtMoney(v) + ')'); return false; } S.res.money -= v; SFX.play('coin'); return true; }
function addRep(v, silent) {
  S.city.rep = Math.max(0, S.city.rep + v); if (!silent) floater(S.p.x, S.p.y - 24, (v >= 0 ? '+' : '') + v + ' BEKANNTHEIT', v >= 0 ? '#7ad7ff' : '#ff8080', v >= 20);
  const next = RANKS[S.city.rank + 1]; if (next && rankReqMet(S.city.rank + 1) && !next.money && !S.city.rankHint) { S.city.rankHint = true; UI.toast('🏛 Du kannst im Rathaus aufsteigen: ' + next.n); }
}
function rankReqMet(i) { const r = RANKS[i]; if (!r) return false; if (S.city.rep < r.rep) return false; if (r.apt && aptTier() < r.apt) return false; if (r.biz && !hasBiz()) return false; return true; }
function jobRankIdx(j) { if (S.city.biz[j]) return 3; const x = S.city.jobXp[j] || 0; return x >= JOB_RANKS[2].xp ? 2 : x >= JOB_RANKS[1].xp ? 1 : 0; }
function jobXp(j, v) { if (S.city.job !== j) return; const b = jobRankIdx(j); S.city.jobXp[j] += v; const a = jobRankIdx(j); if (a > b) { announce('BEFÖRDERT: ' + JOB_RANKS[a].n.toUpperCase(), JOBS[j].n + ' · höherer Tageslohn', '#ffd84a'); SFX.play('level'); addRep(15); } }
function dailyCity() {
  const C = S.city; if (C.lastDaily === S.day) return; C.lastDaily = S.day; const lines = [];
  C.priceF = R(0.85, 1.25);
  if (C.job) { const r = jobRankIdx(C.job); if (r < 3) { const w = JOBS[C.job].wage[r]; S.res.money += w; lines.push(['💼 Lohn als ' + JOBS[C.job].n + ' (' + JOB_RANKS[r].n + ')', '+' + fmtMoney(w), '#7dff5a']); } }
  for (const j in C.biz) { const inc = JOBS[j].bizIncome; S.res.money += inc; C.rep += 8; lines.push(['🏢 ' + JOBS[j].biz, '+' + fmtMoney(inc), '#7dff5a']); }
  if (C.mayor) { S.res.money += 4000; C.rep += 20; lines.push(['👑 Steuereinnahmen', '+' + fmtMoney(4000), '#ffd84a']); }
  if (S.crew.length) { const pay = S.crew.length * 120; S.res.money -= pay; lines.push(['🚀 Crew-Heuer (' + S.crew.length + ')', '-' + fmtMoney(pay), '#ff8080']); }
  for (const a of APTS) if (C.apts[a.id]) {
    if (S.res.money >= a.rent) { S.res.money -= a.rent; C.rep += a.rep; lines.push(['🏠 Miete ' + a.n, '-' + fmtMoney(a.rent), '#ff8080']); C.missedRent = 0; }
    else { C.missedRent++; C.rep = Math.max(0, C.rep - 20); lines.push(['⚠ Miete nicht bezahlt (' + C.missedRent + '/3)', '-20 Ruf', '#ff5e3a']); if (C.missedRent >= 3) { delete C.apts[a.id]; C.missedRent = 0; lines.push(['🚪 ' + a.n + ' zwangsgeräumt!', '', '#ff5e3a']); } }
  }
  C.offers = genCityTasks(false); C.fixer = genCityTasks(true); genCrewOffers();
  if (C.rank >= 1 || C.job || lines.length) UI.dailyReport(lines);
}
function genCityTasks(fixer) {
  const out = [], M = S.mainW, eden = M.eden;
  for (let i = 0; i < 3; i++) {
    const type = fixer ? pick(['smuggle', 'hit', 'heist']) : pick(['deliver', 'deliver', 'rescue', 'bounty', 'salvage']), t = { type, fixer };
    if (type === 'deliver' || type === 'smuggle') { t.target = Math.floor(Math.random() * M.outposts.length); const o = M.outposts[t.target], d = Math.hypot(o.x - eden.x, o.y - eden.y); t.time = Math.round(110 + d / 110); t.n = (type === 'smuggle' ? 'Schmuggelware' : 'Paket') + ' → ' + o.n; t.reward = { money: Math.round((type === 'smuggle' ? 3.2 : 1) * (180 + d / 9)), rep: type === 'smuggle' ? 0 : 12 }; t.desc = type === 'smuggle' ? 'Nur NACHTS übergeben.' : 'Durch die Zone liefern. Nachts +50% Bonus.'; t.job = 'courier'; t.icon = type === 'smuggle' ? '🕶' : '📦'; }
    else if (type === 'rescue') { let x, y; for (let k = 0; k < 60; k++) { x = R(600, M.size * TILE - 600); y = R(600, M.size * TILE - 600); const d = Math.hypot(x - eden.x, y - eden.y); if (d > 1400 && d < 3800 && freeAt(M, x, y, 20)) break; } t.x = x; t.y = y; t.time = 420; t.n = 'Vermisste Person bergen'; t.desc = 'Finde die Person und bring sie lebend nach Neu-Eden.'; t.reward = { money: RI(450, 750), rep: 28 }; t.job = 'courier'; t.icon = '🧍'; }
    else if (type === 'bounty' || type === 'hit') { const brute = type === 'hit' || Math.random() < 0.4; t.kind = brute ? 'brute' : 'any'; t.goal = brute ? (type === 'hit' ? 3 : RI(2, 3)) : RI(10, 18); t.n = brute ? 'Kopfgeld: ' + t.goal + ' Kolosse' : 'Kopfgeld: ' + t.goal + ' Monster'; t.desc = 'Erledige sie irgendwo in der Zone.'; t.reward = { money: type === 'hit' ? RI(1400, 1900) : brute ? RI(500, 700) : RI(300, 450), rep: type === 'hit' ? 5 : 15 }; t.job = 'guard'; t.icon = '💀'; t.progress = 0; }
    else { const k = type === 'heist' ? null : pick(['elec', 'mil', 'crystal', 'cells', 'titan']); t.need = type === 'heist' ? { xeno: 2, plasma: 1, mil: 3 } : { [k]: k === 'elec' ? RI(3, 6) : RI(2, 3) }; t.n = type === 'heist' ? 'Der Alien-Coup' : 'Bergung: ' + RES[k].n; t.desc = 'Bring ' + costStr(t.need) + ' hierher.'; const v = Object.entries(t.need).reduce((a, [kk, vv]) => a + MARKET[kk].sell * vv, 0); t.reward = { money: Math.round(v * (type === 'heist' ? 3.5 : 2.4)), rep: type === 'heist' ? 0 : 20 }; t.job = 'mech'; t.icon = type === 'heist' ? '👽' : '🔌'; }
    out.push(t);
  }
  return out;
}
function acceptCityTask(t) {
  if (S.city.task) { UI.toast('Du hast schon einen Auftrag.'); SFX.play('deny'); return; }
  const task = Object.assign({}, t); task.left = t.time || 0; task.carry = t.type === 'deliver' || t.type === 'smuggle'; if (t.type === 'smuggle') { task.type = 'deliver'; task.smuggle = true; }
  S.city.task = task; const list = t.fixer ? S.city.fixer : S.city.offers; list.splice(list.indexOf(t), 1); SFX.play('cash'); announce('AUFTRAG ANGENOMMEN', task.n, '#ffd84a');
}
function cancelCityTask() { failCityTask('Abgebrochen'); }
function failCityTask(reason) { if (!S.city.task) return; announce('AUFTRAG GESCHEITERT', reason + ' · -10 Bekanntheit', '#ff5e3a'); SFX.play('lose'); S.city.rep = Math.max(0, S.city.rep - 10); S.city.task = null; S.follower = null; }
function rewardCityTask(bonus) {
  const t = S.city.task; if (!t) return; const money = Math.round(t.reward.money * (bonus || 1)); S.city.task = null;
  giveMoney(money); if (t.reward.rep) addRep(t.reward.rep); addXp(60 + Math.round(money / 20)); if (t.job) jobXp(t.job, 1); if (t.type === 'deliver') S.stats.deliveries++;
  announce('AUFTRAG ERFÜLLT!', '+' + fmtMoney(money) + (bonus > 1 ? ' (Nachtzuschlag!)' : ''), '#ffd84a'); S.flash = 0.4; S.flashCol = '255,216,74';
  for (let i = 0; i < 24; i++) S.particles.push({ x: S.p.x, y: S.p.y, z: 30, vx: R(-120, 120), vy: R(-120, 120), vz: R(150, 300), life: 1.2, max: 1.2, col: i % 2 ? '#ffd84a' : '#fff3a0', s: 4, grav: 420 });
}
function completeDelivery() { const t = S.city.task; if (!t || t.type !== 'deliver') return; if (t.smuggle && S.dayness > 0.35) { UI.toast('🕶 „Nicht bei Tageslicht. Komm nachts wieder.“'); SFX.play('deny'); return; } rewardCityTask(!t.smuggle && S.dayness < 0.35 ? 1.5 : 1); }
function startFollower() { const t = S.city.task; S.follower = { x: t.x, y: t.y, look: npcLook('survivor'), hp: 70, walk: 0, a: 0 }; announce('ÜBERLEBENDE GEFUNDEN', 'Bring sie lebend nach Neu-Eden!', '#7ad7ff'); SFX.play('pickup'); }
function completeRescue() { if (S.follower && S.city.task && S.city.task.type === 'rescue') { S.follower = null; rewardCityTask(1); } }
function cityTaskEvent(ev, type) { const t = S.city.task; if (!t || (t.type !== 'bounty' && t.type !== 'hit')) return; if (t.kind === 'brute' && type !== 'brute') return; t.progress++; if (t.progress >= t.goal) rewardCityTask(1); }
function updateCityTask(dt) { const t = S.city.task; if (!t || !t.time || S.where !== 'main') return; t.left -= dt; if (t.left <= 0) failCityTask('Zeit abgelaufen'); }
function sleepUntilMorning() { if (!aptTier()) return; UI.transition('ZZZ …', 'Du schläfst bis zum Morgen', () => { if (S.time > 0.27) S.day++; S.time = 0.265; S.wasNight = true; S.awayNight = true; S.p.hp = S.p.maxHp; S.p.hunger = Math.max(0, S.p.hunger - 25); UI.closeAll(); }); }
function runElection(done) { const C = S.city, chance = clamp(0.3 + (C.rep - 4000) / 6000 + S.stats.deliveries * 0.004 + Object.keys(C.biz).length * 0.05 + (S.station.owned ? 0.1 : 0), 0.3, 0.92), win = Math.random() < chance; done(win); if (win) { C.mayor = true; C.rank = 5; announce('👑 BÜRGERMEISTER VON NEU-EDEN 👑', 'Steuern, Rabatte und eine Stadtmiliz für deine Basis', '#ffd84a'); SFX.play('jackpot'); S.flash = 0.8; S.flashCol = '255,216,74'; addXp(1000); } else { C.electionDay = S.day + 3; announce('WAHL VERLOREN', 'Neuer Versuch in 3 Tagen.', '#ff5e3a'); SFX.play('lose'); } }

const CityUI = {
  station: null,
  open(station) { this.station = station; UI.overlay = 'city'; UI.show('citymenu'); $('cityBox').className = 'box panel city-' + ({ royal: 'royal', neon: 'neon', bar: 'neon', bar2: 'neon', black: 'neon', fixer: 'neon', radio: 'radio', shipyard: 'space', agency: 'space' }[station] || (station === 'home' && S.where === 'under' ? 'neon' : 'default')); this.render(); SFX.play('door'); },
  header(title, sub) { const C = S.city; return `<div class="row" style="justify-content:space-between;align-items:center"><div><h1>${title}</h1><div class="csub">${sub || ''}</div></div><div style="text-align:right"><div class="money">${fmtMoney(S.res.money)}</div><div class="csub">${RANKS[C.rank].n} · ⭐ ${Math.floor(C.rep)} Bekanntheit</div><button class="btn red" onclick="UI.closeAll()">✖ SCHLIESSEN</button></div></div>`; },
  render() {
    const st = this.station, b = $('cityBody'), C = S.city; let h = '';
    if (st === 'market' || st === 'black') {
      const blk = st === 'black'; h += this.header(blk ? 'SCHWARZMARKT' : 'MARKTHALLE', blk ? 'Hier fragt keiner, woher es kommt.' : 'Preise heute: ' + (C.priceF > 1.08 ? '📈 teuer' : C.priceF < 0.95 ? '📉 günstig' : '➖ normal'));
      const keys = blk ? ['grenades', 'ammo', 'elec', 'mil', 'crystal', 'cells', 'titan'] : Object.keys(MARKET);
      h += '<div class="mgrid"><div class="mhead">WARE</div><div class="mhead">BESITZ</div><div class="mhead">KAUFEN</div><div class="mhead">VERKAUFEN</div>';
      for (const k of keys) { const pk = MARKET[k].pack || 1, buy = Math.ceil(priceBuy(k) * (blk ? (RES[k].rare ? 0.75 : 1.1) : 1)), sell = priceSell(k); h += `<div>${RES[k].ic} <b>${RES[k].n}</b>${pk > 1 ? ' <small>(x' + pk + ')</small>' : ''}</div><div>${Math.floor(S.res[k])}</div><div><button class="btn sm" data-buy="${k}" data-p="${buy}" data-n="${pk}">${fmtMoney(buy)}</button></div><div>${blk ? '<small>—</small>' : `<button class="btn sm" data-sell="${k}" data-p="${sell}" data-n="${pk}" ${S.res[k] >= pk ? '' : 'disabled'}>${fmtMoney(sell)}</button> <button class="btn sm" data-sellall="${k}" data-p="${sell}" data-n="${pk}" ${S.res[k] >= pk ? '' : 'disabled'}>ALLE</button>`}</div>`; }
      h += '</div>';
      if (blk) h += `<div class="row" style="margin-top:12px"><div class="mcard" style="flex:1"><b>🪪 Gefälschter Bürgerpass</b><p>+150 Bekanntheit.</p><button class="btn gold" data-pass ${C.passBought ? 'disabled' : ''}>${C.passBought ? 'GEKAUFT' : fmtMoney(4000)}</button></div><div class="mcard" style="flex:1"><b>📻 Funkfragment</b><p>Ein Teil einer alten Funkkarte.</p><button class="btn gold" data-frag ${S.edenFound || S.res.frags >= 3 ? 'disabled' : ''}>${fmtMoney(900)}</button></div></div>`;
    } else if (st === 'broker') {
      h += this.header('MAKLER VOSSBERG', 'Ein Dach über dem Kopf ist in Neu-Eden ein Statussymbol.') + '<div class="alist" style="grid-template-columns:1fr 1fr">';
      for (const a of APTS) { const own = C.apts[a.id]; h += `<div class="mcard ${own ? 'act' : ''}"><b>${a.pad ? '🚀 ' : ''}${a.n}</b><p>${a.d}</p><small>Miete ${fmtMoney(a.rent)}/Tag · +${a.rep} Bekanntheit/Tag</small><br><br><button class="btn ${own ? '' : 'gold'}" data-apt="${a.id}" ${own ? 'disabled' : ''}>${own ? '✔ DEIN EIGENTUM' : 'KAUFEN · ' + fmtMoney(a.price)}</button></div>`; }
      h += '</div>';
    } else if (st === 'home') {
      h += this.header(S.where === 'under' ? 'KELLERLOCH' : 'DEIN ZUHAUSE', aptTier() ? 'Sicher. Warm. Still.' : 'Du besitzt hier keine Wohnung.');
      h += aptTier() ? `<div class="mcard"><b>😴 Bis zum Morgen schlafen</b><p>Volle Heilung. Aber: Die Nacht vergeht auch für deine Basis.</p><button class="btn gold" data-sleep>SCHLAFEN</button></div>` : `<div class="mcard"><b>Kein Zutritt</b><p>Kauf eine Wohnung beim Makler.</p>${S.where === 'under' ? `<button class="btn gold" data-apt="cellar" ${C.apts.cellar ? 'disabled' : ''}>Kellerloch kaufen · ${fmtMoney(900)}</button>` : ''}</div>`;
    } else if (st === 'jobs') {
      h += this.header('JOBVERMITTLUNG', 'Tageslohn, Beförderungen – und irgendwann der eigene Laden.') + '<div class="alist" style="grid-template-columns:1fr 1fr">';
      for (const [j, J] of Object.entries(JOBS)) { const cur = C.job === j, r = jobRankIdx(j), xp = C.jobXp[j] || 0, nxt = JOB_RANKS[r + 1]; h += `<div class="mcard ${cur ? 'act' : ''}"><b>${J.icon} ${J.n} · ${JOB_RANKS[r].n}</b><p>XP durch: ${J.xpFrom}</p><small>Lohn/Tag: ${J.wage.map(fmtMoney).join(' → ')}</small>`; if (nxt && r < 2) h += `<div class="bar" style="height:8px;margin:6px 0"><div style="width:${Math.min(100, xp / nxt.xp * 100)}%;background:#7ad7ff"></div></div><small>${Math.floor(xp)}/${nxt.xp} bis ${nxt.n}</small>`; h += '<br><br>'; if (!cur) h += `<button class="btn gold" data-job="${j}">ANNEHMEN</button>`; else { h += `<button class="btn" data-shift ${C.shiftDay === S.day ? 'disabled' : ''}>${C.shiftDay === S.day ? 'Schicht erledigt' : '⏱ SCHICHT'}</button> `; if (r === 2 && !C.biz[j]) h += `<button class="btn gold" data-biz="${j}">🏢 ${J.biz} · ${fmtMoney(J.bizPrice)}</button>`; if (C.biz[j]) h += `<small style="color:#ffd84a">👑 BESITZER · +${fmtMoney(J.bizIncome)}/Tag</small>`; } h += '</div>'; }
      h += '</div>';
    } else if (st === 'courier' || st === 'fixer') {
      const fx = st === 'fixer'; if (!(fx ? C.fixer : C.offers).length && !C.task) { if (fx) C.fixer = genCityTasks(true); else C.offers = genCityTasks(false); }
      h += this.header(fx ? 'DER FIXER' : 'KURIER-ZENTRALE', fx ? '„Hoher Lohn. Hohes Risiko. Kein Name.“' : 'Aufträge durch die Todeszone. Die Uhr läuft nur draußen.');
      if (C.task) { const t = C.task; h += `<div class="mcard act"><b>AKTIV: ${t.icon} ${t.n}</b><p>${t.desc}</p>${t.time ? `<small>Restzeit: ${Math.ceil(t.left)}s</small>` : ''}${t.goal ? `<small>Fortschritt: ${t.progress}/${t.goal}</small>` : ''}<br><br>${t.need ? `<button class="btn gold" data-turnin ${canAfford(t.need) ? '' : 'disabled'}>ABGEBEN (${costStr(t.need)})</button> ` : ''}<button class="btn red" data-cancel>Abbrechen (-10 Ruf)</button></div>`; }
      h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);margin-top:12px">';
      for (const t of fx ? C.fixer : C.offers) h += `<div class="mcard"><b>${t.icon} ${t.n}</b><p>${t.desc}</p><small>${t.time ? '⏱ ' + t.time + 's · ' : ''}Lohn: <b style="color:#ffd84a">${fmtMoney(t.reward.money)}</b>${t.reward.rep ? ' · +' + t.reward.rep + ' Ruf' : ''}</small><br><br><button class="btn gold" data-task="${(fx ? C.fixer : C.offers).indexOf(t)}" ${C.task ? 'disabled' : ''}>ANNEHMEN</button></div>`;
      h += '</div>';
    } else if (st === 'townhall') {
      h += this.header('RATHAUS NEU-EDEN', 'Vom Fremden zum Bürgermeister. Der Weg ist lang.') + '<div class="ranks">';
      RANKS.forEach((r, i) => { h += `<div class="rank ${C.rank >= i ? 'done' : ''} ${C.rank + 1 === i ? 'next' : ''}"><b>${i === 5 ? '👑 ' : ''}${r.n}</b><small>${r.d || 'Start'}</small></div>`; });
      h += '</div>'; const R1 = RANKS[C.rank + 1];
      if (R1) { const ok = rankReqMet(C.rank + 1), money = R1.money || 0, cd = R1.election && C.electionDay > S.day; h += `<div class="mcard" style="margin-top:12px"><b>Nächster Rang: ${R1.n}</b><p>${R1.d}</p><small>Bekanntheit ${Math.floor(C.rep)}/${R1.rep} ${R1.apt ? '· Wohnung Stufe ' + aptTier() + '/' + R1.apt : ''} ${R1.biz ? '· Geschäft ' + (hasBiz() ? '✔' : '✖') : ''}</small><br><br>` + (R1.election ? `<button class="btn gold" data-elect ${ok && !cd ? '' : 'disabled'}>${cd ? 'Nächste Wahl in ' + (C.electionDay - S.day) + ' Tag(en)' : '🗳 WAHLKAMPF · ' + fmtMoney(money)}</button>` : `<button class="btn gold" data-rankup ${ok ? '' : 'disabled'}>AUFSTIEG BEANTRAGEN${money ? ' · ' + fmtMoney(money) : ''}</button>`) + '</div><div id="electBox"></div>'; }
      else h += '<div class="mcard act"><b>👑 Du regierst Neu-Eden.</b><p>4.000₵ Steuern täglich, 25% Rabatt, die Stadtmiliz schützt deine Basis.</p></div>';
      h += `<div class="mcard" style="margin-top:12px"><b>Spenden</b><p>1 Bekanntheit je 15₵.</p><div class="row"><button class="btn" data-donate="150">150₵</button><button class="btn" data-donate="1500">1.500₵</button><button class="btn" data-donate="7500">7.500₵</button></div></div>`;
    } else if (st === 'bar' || st === 'bar2') {
      h += this.header(st === 'bar' ? 'BAR »ROSTIGER ANKER«' : 'BAR »LETZTER TROPFEN«', 'Chemdunst und billiger Fusel.') + '<div class="alist" style="grid-template-columns:repeat(4,1fr)">';
      DRINKS.forEach((d, i) => h += `<div class="mcard"><b>🍸 ${d.n}</b><p>${d.d}</p><button class="btn gold" data-drink="${i}">${fmtMoney(d.price)}</button></div>`);
      h += `</div><div class="mcard" style="margin-top:12px"><b>🗣 Gerüchte</b><p id="rumor">${pick(RUMORS)}</p><button class="btn" data-rumor>Noch eins (10₵)</button></div>`;
      if (C.job === 'barkeep') h += `<div class="mcard" style="margin-top:12px"><b>🍸 Schicht hinter der Bar</b><button class="btn gold" data-shift ${C.shiftDay === S.day ? 'disabled' : ''}>${C.shiftDay === S.day ? 'Heute erledigt' : 'SCHICHT STARTEN'}</button></div>`;
    } else if (st === 'royal' || st === 'neon') { Casino.render(st === 'royal' ? 'royal' : 'neon'); return; }
    else if (st === 'shipyard') {
      h += this.header('WERFT »STERNENSCHMIEDE«', 'Raumschiffe für die, die es sich leisten können.');
      if (!S.ship) {
        const can = C.apts.sky;
        h += `<div class="tgrid"><div><canvas id="yardCv" width="520" height="300"></canvas></div><div class="mcard"><b>🚀 Abfangjäger »Sternschnuppe«</b><p>Senkrechtstarter. Fliegt überall über die Wildnis – und wer hoch genug steigt, erreicht den Orbit.</p><small>Voraussetzung: <b style="color:${can ? '#7dff5a' : '#ff8080'}">Himmelsloft mit Landeplattform ${can ? '✔' : '✖'}</b></small><br><br><button class="btn gold big" data-buyship ${can ? '' : 'disabled'}>KAUFEN · ${fmtMoney(SHIP_PRICE)}</button>${can ? '' : '<p class="csub">Erst beim Makler das Himmelsloft kaufen.</p>'}</div></div>`;
      } else h += `<div class="mcard act"><b>🚀 DEIN SCHIFF</b><p>Rumpf ${Math.round(S.ship.hp)}/${shipMaxHp(S.ship)} · Standort: ${S.ship.world === 'main' ? 'Erde' : S.ship.world}</p><button class="btn gold big" data-hangar>🔧 HANGAR: UPGRADES & LACKIERUNG</button></div><div class="mcard" style="margin-top:12px"><b>Flugschule</b><p>WASD fliegen · LEERTASTE steigen · C sinken · SHIFT Boost · Klick = Laser. Über Höhe 520 erreichst du den Orbit. Im All: C halten = Wiedereintritt.</p></div>`;
    } else if (st === 'agency') {
      h += this.header('RAUMFAHRTBEHÖRDE', 'Crew anheuern für Langstreckensprünge.');
      if (!S.station.owned) h += '<div class="mcard"><b>⛔ KEINE STATION</b><p>Die Behörde vermittelt nur an Stationsbesitzer. Im Erdorbit treibt eine verlassene Station …</p></div>';
      else if (C.rank < 3) h += '<div class="mcard"><b>⛔ ZU WENIG AUTORITÄT</b><p>Rang „Angesehen“ erforderlich. Aktuell: ' + RANKS[C.rank].n + '</p></div>';
      else {
        if (!S.crewOffers.length) genCrewOffers();
        h += '<div class="alist" style="grid-template-columns:repeat(4,1fr);max-height:none">';
        S.crewOffers.forEach((c, i) => h += `<div class="mcard"><b>${CREW_ROLES[c.role].icon} ${c.name}</b><p>${CREW_ROLES[c.role].n} · ${'★'.repeat(c.skill)}</p><small>${CREW_ROLES[c.role].d}</small><br><br><button class="btn gold" data-hire="${i}" ${S.crew.length >= 5 ? 'disabled' : ''}>ANHEUERN · ${fmtMoney(c.price)}</button></div>`);
        h += `</div><div class="mcard" style="margin-top:12px"><b>DEINE CREW (${S.crew.length}/5) · Heuer 120₵/Tag pro Person</b>${S.crew.map((c, i) => `<div class="hp-row"><span>${CREW_ROLES[c.role].icon} ${c.name} – ${CREW_ROLES[c.role].n}</span><button class="btn sm red" data-fire="${i}">Entlassen</button></div>`).join('') || '<p>Noch niemand. Für einen Sprung brauchst du mindestens 3.</p>'}</div>`;
      }
    } else if (st === 'radio') {
      h += this.header('📻 FUNKSTATION', 'Rauschen … dann Stimmen.');
      const can = S.radioDropDay !== S.day;
      h += `<div class="alist" style="grid-template-columns:1fr 1fr;max-height:none"><div class="mcard"><b>📦 Versorgungsabwurf anfordern</b><p>Ein Flugzeug wirft eine epische Kiste in deiner Nähe ab. 1× pro Tag.</p><button class="btn gold" data-airdrop ${can ? '' : 'disabled'}>${can ? 'ANFORDERN · ' + fmtMoney(250) : 'Morgen wieder'}</button></div>`;
      h += `<div class="mcard"><b>🛰 Peilsignal</b><p>${S.edenFound ? 'Neu-Eden ist bereits bekannt.' : 'Das Gerät empfängt ein starkes Signal aus dem Südwesten.'}</p><button class="btn" data-ping ${S.edenFound ? 'disabled' : ''}>PEILEN</button></div></div>`;
      h += `<div class="mcard" style="margin-top:12px"><b>🎧 Aufgefangener Funk</b><p id="rumor">${pick(RUMORS)}</p><button class="btn" data-rumor2>Weiter scannen</button></div>`;
    }
    b.innerHTML = h; this.bind();
  },
  bind() {
    const b = $('cityBody'), C = S.city, q = s => b.querySelectorAll(s);
    q('[data-buy]').forEach(e => e.onclick = () => { const k = e.dataset.buy, p = +e.dataset.p, n = +e.dataset.n; if (!spendMoney(p)) return; S.res[k] = (S.res[k] || 0) + n; if (RES[k].cap) S.res[k] = Math.min(S.cap, S.res[k]); this.render(); });
    q('[data-sell]').forEach(e => e.onclick = () => { const k = e.dataset.sell, p = +e.dataset.p, n = +e.dataset.n; if (S.res[k] < n) return; S.res[k] -= n; S.res.money += p; SFX.play('coin'); this.render(); });
    q('[data-sellall]').forEach(e => e.onclick = () => { const k = e.dataset.sellall, p = +e.dataset.p, n = +e.dataset.n, c = Math.floor(S.res[k] / n); if (!c) return; S.res[k] -= c * n; S.res.money += c * p; SFX.play('cash'); UI.toast('+' + fmtMoney(c * p)); this.render(); });
    q('[data-pass]').forEach(e => e.onclick = () => { if (!spendMoney(4000)) return; C.passBought = true; addRep(150); this.render(); });
    q('[data-frag]').forEach(e => e.onclick = () => { if (!spendMoney(900)) return; S.res.frags++; onFragment(); this.render(); });
    q('[data-apt]').forEach(e => e.onclick = () => { const a = APTS.find(x => x.id === e.dataset.apt); if (!spendMoney(a.price)) return; C.apts[a.id] = true; addRep(a.rep * 5); announce('🏠 ' + a.n.toUpperCase(), a.pad ? 'Mit Landeplattform! Die Werft erwartet dich.' : 'Gehört jetzt dir!', '#ffd84a'); SFX.play('jackpot'); this.render(); });
    q('[data-sleep]').forEach(e => e.onclick = () => sleepUntilMorning());
    q('[data-job]').forEach(e => e.onclick = () => { C.job = e.dataset.job; SFX.play('cash'); announce('NEUER JOB: ' + JOBS[C.job].n.toUpperCase(), 'Lohn kommt jeden Morgen', '#7ad7ff'); this.render(); });
    q('[data-biz]').forEach(e => e.onclick = () => { const j = e.dataset.biz; if (!spendMoney(JOBS[j].bizPrice)) return; C.biz[j] = true; addRep(120); announce('🏢 BESITZER!', JOBS[j].biz + ' gehört jetzt dir', '#ffd84a'); SFX.play('jackpot'); this.render(); });
    q('[data-shift]').forEach(e => e.onclick = () => Shift.start());
    q('[data-task]').forEach(e => e.onclick = () => { const list = this.station === 'fixer' ? C.fixer : C.offers; acceptCityTask(list[+e.dataset.task]); this.render(); });
    q('[data-cancel]').forEach(e => e.onclick = () => { cancelCityTask(); this.render(); });
    q('[data-turnin]').forEach(e => e.onclick = () => { const t = C.task; if (!canAfford(t.need)) return; pay(t.need); rewardCityTask(1); this.render(); });
    q('[data-rankup]').forEach(e => e.onclick = () => { const R1 = RANKS[C.rank + 1]; if (R1.money && !spendMoney(R1.money)) return; C.rank++; C.rankHint = false; announce('NEUER RANG: ' + R1.n.toUpperCase(), 'Neu-Eden kennt deinen Namen', '#ffd84a'); SFX.play('level'); addXp(150 * C.rank); this.render(); });
    q('[data-elect]').forEach(e => e.onclick = () => { if (!spendMoney(RANKS[5].money)) return; $('electBox').innerHTML = '<div class="mcard"><b>🗳 AUSZÄHLUNG …</b><div class="bar" style="height:22px;margin-top:8px"><div id="vYou" style="width:0%;background:#ffd84a"></div><span>DU</span></div><div class="bar" style="height:22px"><div id="vThem" style="width:0%;background:#8a8a8a"></div><span>AMTSINHABER</span></div></div>'; runElection(win => { const you = win ? R(51, 72) : R(28, 49); let k = 0; const iv = setInterval(() => { k += 0.04; if ($('vYou')) $('vYou').style.width = Math.min(you, you * k) + '%'; if ($('vThem')) $('vThem').style.width = Math.min(100 - you, (100 - you) * k) + '%'; SFX.play('tick'); if (k >= 1) { clearInterval(iv); setTimeout(() => this.render(), 1400); } }, 70); }); });
    q('[data-donate]').forEach(e => e.onclick = () => { const v = +e.dataset.donate; if (!spendMoney(v)) return; addRep(Math.floor(v / 15)); this.render(); });
    q('[data-drink]').forEach(e => e.onclick = () => { const d = DRINKS[+e.dataset.drink]; if (!spendMoney(d.price)) return; if (d.fx === 'heal') S.p.hp = Math.min(S.p.maxHp, S.p.hp + 20); if (d.fx === 'dmg') C.buffs.dmg = 180; if (d.fx === 'speed') C.buffs.speed = 180; if (d.fx === 'rep') addRep(40); UI.toast('🍸 ' + d.n + ': ' + d.d); this.render(); });
    q('[data-rumor]').forEach(e => e.onclick = () => { if (!spendMoney(10)) return; $('rumor').textContent = pick(RUMORS); });
    q('[data-rumor2]').forEach(e => e.onclick = () => { $('rumor').textContent = pick(RUMORS); SFX.play('tick'); });
    q('[data-buyship]').forEach(e => e.onclick = () => { if (!spendMoney(SHIP_PRICE)) return; S.ship = newShip(); SFX.play('jackpot'); S.flash = 0.6; S.flashCol = '120,220,255'; addXp(400); announce('🚀 RAUMSCHIFF GEKAUFT!', 'Wartet auf der Plattform vor dem Stadttor', '#7ad7ff'); this.render(); });
    q('[data-hangar]').forEach(e => e.onclick = () => { UI.hide('citymenu'); ShipUI.open(); });
    q('[data-hire]').forEach(e => e.onclick = () => { const c = S.crewOffers[+e.dataset.hire]; if (S.crew.length >= 5 || !spendMoney(c.price)) return; S.crew.push(c); S.crewOffers.splice(+e.dataset.hire, 1); SFX.play('cash'); announce('CREW: ' + c.name.toUpperCase(), CREW_ROLES[c.role].n + ' an Bord', '#5fd4ff'); this.render(); });
    q('[data-fire]').forEach(e => e.onclick = () => { S.crew.splice(+e.dataset.fire, 1); SFX.play('click'); this.render(); });
    q('[data-airdrop]').forEach(e => e.onclick = () => { if (!spendMoney(250)) return; S.radioDropDay = S.day; UI.closeAll(); startAirdrop(); });
    q('[data-ping]').forEach(e => e.onclick = () => { revealEdenHint(300); this.render(); });
    if ($('yardCv')) this.yardLoop();
  },
  yardLoop() { const cv = $('yardCv'); if (!cv || UI.overlay !== 'city') return; const g = cv.getContext('2d'), t = performance.now() / 1000; g.clearRect(0, 0, cv.width, cv.height); const sG = G, sV = Object.assign({}, VIEW); G = g; Object.assign(VIEW, { cx: 0, cy: 0, ox: cv.width / 2, oy: cv.height / 2 + 60, zoom: 3.2 }); g.strokeStyle = 'rgba(0,0,0,0.5)'; BOXES = []; addModel(shipParts({ up: { laser: 1 }, paint: 'piltover' }, t, { flying: true, thrust: true }), 0, 0, 14 + Math.sin(t * 2) * 3, t * 0.5, 1); flushBoxes(); G = sG; Object.assign(VIEW, sV); requestAnimationFrame(() => this.yardLoop()); },
};
const Shift = {
  start() {
    const b = $('cityBody'), J = JOBS[S.city.job];
    b.innerHTML = `<h1>${J.icon} SCHICHT: ${J.n.toUpperCase()}</h1><div class="csub">Klicke (oder LEERTASTE), wenn der Zeiger im grünen Feld ist. 6 Runden.</div><div class="shiftbar"><div class="zone" id="shZone"></div><div class="needle" id="shNeedle"></div></div><div class="row" style="justify-content:center"><button class="btn gold big" id="shHit">JETZT!</button></div><div id="shRes" class="money" style="text-align:center;margin-top:10px">0/6</div>`;
    this.round = 0; this.hits = 0; this.t = 0; this.newZone(); $('shHit').onclick = () => this.hit(); this.key = e => { if (e.code === 'Space') { e.preventDefault(); this.hit(); } }; addEventListener('keydown', this.key);
    this.last = performance.now(); this.loop = () => { if (!$('shNeedle')) { removeEventListener('keydown', this.key); return; } const now = performance.now(); this.t += (now - this.last) / 1000 * (1.1 + this.round * 0.25); this.last = now; this.pos = (Math.sin(this.t * 2.6) + 1) / 2; $('shNeedle').style.left = (this.pos * 100) + '%'; requestAnimationFrame(this.loop); }; requestAnimationFrame(this.loop);
  },
  newZone() { this.z0 = R(0.1, 0.75); this.zw = Math.max(0.08, 0.2 - this.round * 0.02); const z = $('shZone'); if (z) { z.style.left = this.z0 * 100 + '%'; z.style.width = this.zw * 100 + '%'; } },
  hit() { if (this.round >= 6) return; const ok = this.pos >= this.z0 && this.pos <= this.z0 + this.zw; this.round++; if (ok) { this.hits++; SFX.play('coin'); } else SFX.play('deny'); $('shRes').textContent = this.hits + '/' + this.round; if (this.round >= 6) { removeEventListener('keydown', this.key); const C = S.city, w = JOBS[C.job].wage[Math.min(2, jobRankIdx(C.job))], pay = Math.round(w * 0.4 + w * this.hits / 6); C.shiftDay = S.day; S.res.money += pay; SFX.play('cash'); jobXp(C.job, this.hits >= 4 ? 1.5 : 0.5); $('shRes').innerHTML = `SCHICHT BEENDET · ${this.hits}/6 · +${fmtMoney(pay)}`; setTimeout(() => CityUI.render(), 1500); } else this.newZone(); },
};
;

// ----------------------------- casino.js -----------------------------

// ===================== CASINO: Slots, Blackjack, Roulette =====================
const SLOT_SYM = ['🍒', '🍒', '🍒', '🍒', '🍒', '🍋', '🍋', '🍋', '🍋', '🍋', '🔔', '🔔', '🔔', '🔔', '⭐', '⭐', '⭐', '💎', '7️⃣', '7️⃣', '🧟', '🧟'];
const SLOT_PAY = { '🍒': 4, '🍋': 5, '🔔': 8, '⭐': 15, '7️⃣': 30, '💎': 60, '🧟': 100 };
const RL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RL_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const Casino = {
  theme: 'neon', game: 'slots', bet: 10, busy: false, bj: null, rlBet: 'rot', rlNum: 17, rlA: 0,
  lim() { return this.theme === 'royal' ? [500, 50000] : [10, 1000]; },
  render(theme) {
    if (theme && theme !== this.theme) { this.theme = theme; this.bet = this.lim()[0]; } this.bet = clamp(this.bet, ...this.lim());
    const royal = this.theme === 'royal', b = $('cityBody');
    let h = CityUI.header(royal ? '♛ ROYAL CASINO ♛' : '⚡ DIE GRUBE ⚡', royal ? 'Einsätze ab 500₵ · Champagner inklusive' : 'Einsätze ab 10₵ · Die Lüftung ist kaputt');
    h += `<div class="tabs">${['slots', 'blackjack', 'roulette'].map(g => `<button class="tab ${this.game === g ? 'act' : ''}" data-game="${g}">${{ slots: '🎰 SLOTS', blackjack: '🃏 BLACKJACK', roulette: '🎡 ROULETTE' }[g]}</button>`).join('')}</div>`;
    h += `<div class="betrow"><span>EINSATZ</span><button class="btn sm" data-bet="0.5">÷2</button><b class="money" id="betV">${fmtMoney(this.bet)}</b><button class="btn sm" data-bet="2">×2</button><button class="btn sm" data-bet="min">MIN</button><button class="btn sm" data-bet="max">MAX</button></div><div id="gameArea"></div>`;
    b.innerHTML = h;
    b.querySelectorAll('[data-game]').forEach(e => e.onclick = () => { if (this.busy) return; this.game = e.dataset.game; SFX.play('click'); this.render(); });
    b.querySelectorAll('[data-bet]').forEach(e => e.onclick = () => { if (this.busy || (this.bj && !this.bj.done)) return; const v = e.dataset.bet, [mn, mx] = this.lim(); this.bet = v === 'min' ? mn : v === 'max' ? mx : clamp(Math.round(this.bet * +v), mn, mx); $('betV').textContent = fmtMoney(this.bet); SFX.play('tick'); });
    this[this.game]();
  },
  pay(won, mult) { if (won > 0) { S.res.money += won; S.stats.casinoWon += won; this.coinRain(mult); } this.updMoney(); },
  take() { if (S.res.money < this.bet) { SFX.play('deny'); UI.toast('Nicht genug Credits!'); return false; } S.res.money -= this.bet; S.stats.casinoLost += this.bet; this.updMoney(); return true; },
  updMoney() { const m = document.querySelector('#cityBody .money'); if (m) m.textContent = fmtMoney(S.res.money); },
  coinRain(mult) { const area = $('gameArea'); if (!area) return; for (let i = 0; i < Math.min(60, 8 + mult * 4); i++) { const c = document.createElement('div'); c.className = 'coin'; c.textContent = this.theme === 'royal' ? '♛' : '₵'; c.style.left = R(0, 100) + '%'; c.style.animationDelay = R(0, 0.6) + 's'; c.style.fontSize = R(16, 30) + 'px'; area.appendChild(c); setTimeout(() => c.remove(), 2200); } SFX.play(mult >= 20 ? 'jackpot' : 'win'); },
  slots() {
    $('gameArea').innerHTML = `<div class="slotm"><div class="reels"><div class="reel" id="r0">🍒</div><div class="reel" id="r1">⭐</div><div class="reel" id="r2">💎</div></div><div class="lever" id="lever"></div></div><div class="row" style="justify-content:center"><button class="btn gold big" id="spin">🎰 DREHEN</button></div><div id="slotMsg" class="gmsg">3 gleiche = Gewinn · 🧟🧟🧟 = ZOMBIE-JACKPOT x100</div><div class="paytab">${Object.entries(SLOT_PAY).map(([s, v]) => `<span>${s}${s}${s} <b>x${v}</b></span>`).join('')}<span>🍒🍒 <b>x2</b></span><span>Paar <b>x1</b></span></div>`;
    $('spin').onclick = () => this.spin();
  },
  spin() {
    if (this.busy || !this.take()) return; this.busy = true; SFX.play('click');
    $('lever').classList.remove('pull'); void $('lever').offsetWidth; $('lever').classList.add('pull');
    const res = [pick(SLOT_SYM), pick(SLOT_SYM), pick(SLOT_SYM)], reels = [0, 1, 2].map(i => $('r' + i));
    reels.forEach(r => { r.classList.add('spin'); r.classList.remove('win'); });
    const iv = setInterval(() => { reels.forEach(r => { if (r.classList.contains('spin')) r.textContent = pick(SLOT_SYM); }); SFX.play('tick'); }, 70);
    [0, 1, 2].forEach(i => setTimeout(() => { reels[i].classList.remove('spin'); reels[i].textContent = res[i]; reels[i].classList.add('stop'); SFX.play('card'); setTimeout(() => reels[i].classList.remove('stop'), 300); if (i === 2) { clearInterval(iv); this.evalSlots(res, reels); } }, 700 + i * 450));
  },
  evalSlots(res, reels) {
    let mult = 0, msg = 'Leider nichts.';
    if (res[0] === res[1] && res[1] === res[2]) { mult = SLOT_PAY[res[0]]; msg = res[0] === '🧟' ? '🧟 ZOMBIE-JACKPOT! 🧟' : res[0] === '💎' ? '💎 DIAMANT-JACKPOT! 💎' : 'DREIER!'; reels.forEach(r => r.classList.add('win')); }
    else if (res.filter(s => s === '🍒').length === 2) { mult = 2; msg = 'Kirschen-Paar!'; } else if (res[0] === res[1] || res[1] === res[2] || res[0] === res[2]) { mult = 1; msg = 'Paar – Einsatz zurück'; }
    const won = this.bet * mult; if (won > 0) this.pay(won, mult); else SFX.play('lose');
    $('slotMsg').innerHTML = mult ? `<b class="money">${msg} +${fmtMoney(won)}</b>` : msg; this.busy = false;
  },
  blackjack() { $('gameArea').innerHTML = `<div class="felt"><div class="lbl">GEBER <span id="dSum"></span></div><div class="hand" id="dHand"></div><div class="lbl" style="margin-top:16px">DU <span id="pSum"></span></div><div class="hand" id="pHand"></div></div><div class="row" style="justify-content:center" id="bjBtns"></div><div id="bjMsg" class="gmsg">Blackjack zahlt 3:2 · Geber steht ab 17</div>`; this.bjButtons(); if (this.bj && !this.bj.done) this.bjDraw(); else this.bj = null; },
  bjButtons() { const bb = $('bjBtns'); if (!bb) return; const live = this.bj && !this.bj.done; bb.innerHTML = live ? `<button class="btn gold" id="bjHit">+ KARTE</button><button class="btn" id="bjStand">STEHEN</button><button class="btn" id="bjDbl" ${this.bj.p.length === 2 && S.res.money >= this.bet ? '' : 'disabled'}>VERDOPPELN</button>` : `<button class="btn gold big" id="bjDeal">🃏 AUSTEILEN</button>`; if (live) { $('bjHit').onclick = () => this.bjHit(); $('bjStand').onclick = () => this.bjStand(); $('bjDbl').onclick = () => this.bjDouble(); } else $('bjDeal').onclick = () => this.bjDeal(); },
  card() { return { r: pick(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K']), s: pick(['♠', '♥', '♦', '♣']) }; },
  val(h) { let v = 0, a = 0; for (const c of h) { if (c.r === 'A') { a++; v += 11; } else if ('BDK'.includes(c.r) || c.r === '10') v += 10; else v += +c.r; } while (v > 21 && a) { v -= 10; a--; } return v; },
  bjDeal() { if (!this.take()) return; this.bj = { p: [this.card(), this.card()], d: [this.card(), this.card()], done: false, bet: this.bet, hide: true }; SFX.play('card'); this.bjDraw(true); if (this.val(this.bj.p) === 21) setTimeout(() => this.bjEnd(), 500); this.bjButtons(); },
  bjDraw(anim) { const bj = this.bj, ch = (c, i, hidden) => `<div class="card ${'♥♦'.includes(c.s) ? 'red' : ''} ${hidden ? 'back' : ''}" style="animation-delay:${anim ? i * 0.12 : 0}s">${hidden ? '' : c.r + '<br>' + c.s}</div>`; $('pHand').innerHTML = bj.p.map((c, i) => ch(c, i)).join(''); $('dHand').innerHTML = bj.d.map((c, i) => ch(c, i, i === 1 && bj.hide)).join(''); $('pSum').textContent = '(' + this.val(bj.p) + ')'; $('dSum').textContent = bj.hide ? '(' + this.val([bj.d[0]]) + ' + ?)' : '(' + this.val(bj.d) + ')'; },
  bjHit() { this.bj.p.push(this.card()); SFX.play('card'); this.bjDraw(); if (this.val(this.bj.p) >= 21) this.bjStand(); else this.bjButtons(); },
  bjDouble() { if (!this.take()) return; this.bj.bet *= 2; this.bj.p.push(this.card()); SFX.play('card'); this.bjDraw(); this.bjStand(); },
  bjStand() { const bj = this.bj; bj.hide = false; this.busy = true; $('bjBtns').innerHTML = ''; const step = () => { this.bjDraw(); if (this.val(bj.p) <= 21 && this.val(bj.d) < 17) setTimeout(() => { bj.d.push(this.card()); SFX.play('card'); step(); }, 550); else setTimeout(() => this.bjEnd(), 400); }; step(); },
  bjEnd() {
    const bj = this.bj; bj.hide = false; this.bjDraw(); const pv = this.val(bj.p), dv = this.val(bj.d), bjN = pv === 21 && bj.p.length === 2; let won = 0, msg;
    if (pv > 21) msg = 'ÜBERKAUFT!'; else if (bjN && !(dv === 21 && bj.d.length === 2)) { won = bj.bet * 2.5; msg = 'BLACKJACK!'; } else if (dv > 21 || pv > dv) { won = bj.bet * 2; msg = 'GEWONNEN!'; } else if (pv === dv) { won = bj.bet; msg = 'UNENTSCHIEDEN'; } else msg = 'Der Geber gewinnt.';
    if (won > bj.bet) this.pay(won, won / bj.bet * 3); else if (won) { S.res.money += won; this.updMoney(); } else SFX.play('lose');
    $('bjMsg').innerHTML = won > bj.bet ? `<b class="money">${msg} +${fmtMoney(won)}</b>` : msg; bj.done = true; this.busy = false; this.bjButtons();
  },
  roulette() {
    const bets = [['rot', 'ROT', 2], ['schwarz', 'SCHWARZ', 2], ['gerade', 'GERADE', 2], ['ungerade', 'UNGERADE', 2], ['low', '1–18', 2], ['high', '19–36', 2], ['zahl', 'ZAHL', 36]], a = $('gameArea');
    a.innerHTML = `<div class="row" style="align-items:center;gap:20px;justify-content:center"><canvas id="rlCv" width="300" height="300"></canvas><div><div class="rlbets">${bets.map(([k, n, m]) => `<button class="btn ${this.rlBet === k ? 'gold' : ''}" data-rl="${k}">${n} <small>x${m}</small></button>`).join('')}</div><div class="betrow" style="margin-top:8px"><span>ZAHL</span><button class="btn sm" data-n="-1">−</button><b class="money" id="rlNum">${this.rlNum}</b><button class="btn sm" data-n="1">+</button></div><div class="row" style="margin-top:12px"><button class="btn gold big" id="rlSpin">🎡 DREHEN</button></div></div></div><div id="rlMsg" class="gmsg">Setze und dreh das Rad.</div>`;
    a.querySelectorAll('[data-rl]').forEach(e => e.onclick = () => { if (this.busy) return; this.rlBet = e.dataset.rl; SFX.play('tick'); this.roulette(); });
    a.querySelectorAll('[data-n]').forEach(e => e.onclick = () => { if (this.busy) return; this.rlNum = (this.rlNum + +e.dataset.n + 37) % 37; $('rlNum').textContent = this.rlNum; this.rlBet = 'zahl'; SFX.play('tick'); });
    $('rlSpin').onclick = () => this.rlSpin(); this.drawWheel(this.rlA, null);
  },
  drawWheel(ang, ball, hl) {
    const cv = $('rlCv'); if (!cv) return; const g = cv.getContext('2d'), c = 150, royal = this.theme === 'royal', seg = 6.283 / 37;
    g.clearRect(0, 0, 300, 300); g.fillStyle = royal ? '#5a3b10' : '#1a2a20'; g.beginPath(); g.arc(c, c, 148, 0, 6.283); g.fill(); g.strokeStyle = royal ? '#e8b923' : '#5fff8a'; g.lineWidth = 5; g.stroke();
    RL_ORDER.forEach((num, i) => { const a0 = ang + i * seg; g.beginPath(); g.moveTo(c, c); g.arc(c, c, 132, a0, a0 + seg); g.closePath(); g.fillStyle = hl === num ? '#ffd84a' : num === 0 ? '#1f8a3a' : RL_RED.has(num) ? '#b3202a' : '#16161a'; g.fill(); g.strokeStyle = royal ? '#c9a227' : '#ff3fa4'; g.lineWidth = 1; g.stroke(); g.save(); g.translate(c, c); g.rotate(a0 + seg / 2); g.fillStyle = '#fff'; g.font = 'bold 10px Arial'; g.textAlign = 'center'; g.fillText(num, 116, 4); g.restore(); });
    g.fillStyle = royal ? '#e8b923' : '#3a2f28'; g.beginPath(); g.arc(c, c, 70, 0, 6.283); g.fill();
    for (let i = 0; i < 4; i++) { g.save(); g.translate(c, c); g.rotate(ang * 1.5 + i * Math.PI / 2); g.fillStyle = royal ? '#ffd84a' : '#5fff8a'; g.fillRect(-4, -66, 8, 48); g.restore(); }
    if (ball) { g.fillStyle = '#fff'; g.beginPath(); g.arc(c + Math.cos(ball.a) * ball.r, c + Math.sin(ball.a) * ball.r, 6, 0, 6.283); g.fill(); }
  },
  rlSpin() {
    if (this.busy || !this.take()) return; this.busy = true;
    const res = Math.floor(Math.random() * 37), idx = RL_ORDER.indexOf(res), seg = 6.283 / 37, dur = 4200, t0 = performance.now(), a0 = this.rlA, bt = -Math.PI / 2, fin = bt - (idx + 0.5) * seg, tot = a0 + 6.283 * 3 + ((fin - a0 - 6.283 * 3) % 6.283 + 6.283) % 6.283; let lt = 0;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3), ang = a0 + (tot - a0) * e; this.rlA = ang; this.drawWheel(ang, { a: bt - (1 - e) * 6.283 * 5, r: 140 - Math.min(1, k * 1.4) * 18 }); if (now - lt > 60 + k * 200) { lt = now; SFX.play('tick'); } if (k < 1) requestAnimationFrame(step); else this.rlEnd(res); };
    requestAnimationFrame(step);
  },
  rlEnd(res) {
    const red = RL_RED.has(res), b = this.rlBet, hit = { rot: red, schwarz: res && !red, gerade: res && res % 2 === 0, ungerade: res % 2 === 1, low: res >= 1 && res <= 18, high: res >= 19, zahl: res === this.rlNum }[b], mult = b === 'zahl' ? 36 : 2;
    this.drawWheel(this.rlA, { a: -Math.PI / 2, r: 122 }, res); const col = res === 0 ? 'GRÜN' : red ? 'ROT' : 'SCHWARZ';
    if (hit) { const won = this.bet * mult; this.pay(won, mult); $('rlMsg').innerHTML = `<b class="money">${res} ${col} – GEWONNEN! +${fmtMoney(won)}</b>`; } else { SFX.play('lose'); $('rlMsg').textContent = res + ' ' + col + ' – verloren.'; }
    this.busy = false;
  },
};
;

// ----------------------------- expedition.js -----------------------------

// ===================== EXPEDITIONEN (Heli) =====================
function genExpOffers() { S.expOffers = Object.keys(BIOMES).map(b => { const danger = RI(1, 3); return { biome: b, danger, dur: 300 + danger * 60, fuel: 15 + danger * 5, seed: RI(1, 1e9) }; }); }
function expBlocker() {
  const h = S.mainW.heli, pad = helipad();
  if (!pad) return 'Baue zuerst eine Landestation (Baumodus · Q).';
  if (!h || h.wreck) return 'Der Helikopter ist noch ein Wrack. Repariere ihn in Rosthafen.';
  if (S.p.inHeli || h.z > 1) return 'Lande zuerst auf der Landestation.';
  if (Math.hypot(h.x - pad.x, h.y - pad.y) > 90) return 'Der Heli muss auf der Landestation stehen.';
  if (S.city.task && S.city.task.time) return 'Erst den laufenden Stadt-Auftrag erledigen.';
  return null;
}
function startExpedition(o) {
  const why = expBlocker(); if (why) { UI.toast(why); SFX.play('deny'); return; }
  const h = S.mainW.heli; if (h.fuel < o.fuel) { UI.toast('Heli braucht ' + o.fuel + '% Sprit.'); SFX.play('deny'); return; }
  h.fuel -= o.fuel; UI.closeAll(); const B = BIOMES[o.biome];
  UI.transition('FLUG ZUM EINSATZGEBIET', B.icon + ' ' + B.n + ' · Gefahr ' + '☠'.repeat(o.danger), () => {
    const W = makeExpWorld(o.seed, o.biome, o.danger); if (S.dayness < 0.35) S.awayNight = true;
    switchWorld('exp', W, W.lz.x + 60, W.lz.y + 40); S.exp = { o, left: o.dur, bag: {}, warned: {} }; S.spawnT = 6;
    announce(B.n.toUpperCase(), 'Sammle ' + RES[B.excl].n + ' · Zurück zum Heli bevor die Zeit abläuft!', '#ff9a3c');
  }, 2200);
}
function updateExpedition(dt) { const e = S.exp; if (!e || S.phase !== 'play') return; e.left -= dt; for (const w of [60, 30, 10]) if (e.left < w && !e.warned[w]) { e.warned[w] = true; announce('EXTRAKTION IN ' + w + 's!', 'Zurück zum Helikopter!', '#ff5e3a'); SFX.play('streak'); } if (e.left <= 0) endExpedition(false, 'ZURÜCKGELASSEN'); }
function endExpedition(success, reason) {
  const e = S.exp; if (!e) return; const lines = Object.entries(e.bag).filter(([k, v]) => v > 0), B = BIOMES[e.o.biome]; S.exp = null; genExpOffers();
  UI.transition(success ? 'EXTRAKTION ERFOLGREICH' : reason, success ? 'Zurück zur Basis' : 'Die gesamte Beute ist verloren', () => {
    const pad = helipad(), h = S.mainW.heli, x = pad ? pad.x + 70 : 64 * TILE, y = pad ? pad.y + 50 : 64 * TILE;
    switchWorld('main', S.mainW, x, y); if (pad && h) { h.x = pad.x; h.y = pad.y; h.z = 0; h.state = 'parked'; } S.phase = 'play';
    if (success) { for (const [k, v] of lines) { if (RES[k].cap) S.res[k] = Math.min(S.cap, S.res[k] + v); else S.res[k] = (S.res[k] || 0) + v; } const xp = 120 + e.o.danger * 80 + lines.reduce((a, [k, v]) => a + (RES[k].rare ? v * 15 : 0), 0); addXp(xp); S.stats.exps++; UI.expReport(true, lines, xp, B); SFX.play('jackpot'); }
    else { S.p.hp = Math.max(25, S.p.maxHp * 0.3); S.p.invuln = 3; UI.expReport(false, lines, 0, B, reason); SFX.play('lose'); }
  }, 1800);
}
;

// ----------------------------- auth.js -----------------------------

// ===================== KONTEN, LOBBY & CHARAKTER-ERSTELLUNG =====================
function cyrb53(str, seed) { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); }
const Auth = {
  user: null, mode: 'login',
  accounts() { try { return JSON.parse(localStorage.getItem('vs10_accounts') || '{}'); } catch (e) { return {}; } },
  saveAccounts(a) { localStorage.setItem('vs10_accounts', JSON.stringify(a)); },
  acc() { return this.accounts()[this.user] || null; },
  updAcc(fn) { const a = this.accounts(); if (!a[this.user]) return; fn(a[this.user]); this.saveAccounts(a); },
  session() { try { return JSON.parse(localStorage.getItem('vs10_session') || sessionStorage.getItem('vs10_session') || 'null'); } catch (e) { return null; } },
  boot() {
    const s = this.session(), a = this.accounts();
    $('aGo').onclick = () => this.submit(); $('aPass').onkeydown = $('aPass2').onkeydown = $('aUser').onkeydown = e => { if (e.key === 'Enter') this.submit(); };
    document.querySelectorAll('#auth .tab').forEach(t => t.onclick = () => this.setMode(t.dataset.at));
    if (s && a[s.user]) { this.login(s.user, !!s.remember, true); return; }
    this.setMode(Object.keys(a).length ? 'login' : 'register'); UI.show('auth'); setTimeout(() => $('aUser').focus(), 50);
  },
  setMode(m) { this.mode = m; document.querySelectorAll('#auth .tab').forEach(t => t.classList.toggle('act', t.dataset.at === m)); $('aPass2').classList.toggle('hidden', m !== 'register'); $('aGo').textContent = m === 'register' ? '✔ KONTO ERSTELLEN' : '▶ ANMELDEN'; $('aErr').textContent = ''; SFX.play('click'); },
  submit() {
    SFX.init(); const u = $('aUser').value.trim(), p = $('aPass').value, a = this.accounts(), err = t => { $('aErr').textContent = t; SFX.play('deny'); const b = $('authBox'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); };
    if (u.length < 3 || !/^[\wäöüÄÖÜß.\-]+$/.test(u)) return err('Benutzername: mind. 3 Zeichen (Buchstaben, Zahlen, _ . -)');
    if (p.length < 4) return err('Passwort: mind. 4 Zeichen');
    const key = u.toLowerCase();
    if (this.mode === 'register') {
      if (a[key]) return err('Dieser Name ist bereits vergeben.');
      if (p !== $('aPass2').value) return err('Passwörter stimmen nicht überein.');
      const salt = Math.random().toString(36).slice(2); a[key] = { name: u, salt, h: cyrb53(p + salt, 7), created: new Date().toLocaleDateString('de-DE'), hasChar: false, char: null };
      if (localStorage.getItem('vs9_save') && !localStorage.getItem('vs10_migrated')) { localStorage.setItem('vs10_save_' + key, localStorage.getItem('vs9_save')); localStorage.setItem('vs10_migrated', key); a[key].hasChar = true; try { a[key].char = JSON.parse(localStorage.getItem('vs9_char') || 'null'); } catch (e) { } }
      this.saveAccounts(a); SFX.play('level'); this.login(key, $('aRemember').checked);
    } else {
      const acc = a[key]; if (!acc || acc.h !== cyrb53(p + acc.salt, 7)) return err('Benutzername oder Passwort falsch.');
      SFX.play('upgrade'); this.login(key, $('aRemember').checked);
    }
  },
  login(key, remember, silent) {
    this.user = key; const s = JSON.stringify({ user: key, remember });
    localStorage.removeItem('vs10_session'); sessionStorage.removeItem('vs10_session'); (remember ? localStorage : sessionStorage).setItem('vs10_session', s);
    const acc = this.acc(); LOOK = Object.assign({}, DEFAULT_LOOK, acc.char || {}, { name: (acc.char && acc.char.name) || acc.name });
    UI.hide('auth'); $('aPass').value = ''; $('aPass2').value = '';
    Lobby.show(); if (!silent) UI.announce('WILLKOMMEN, ' + acc.name.toUpperCase(), 'Angemeldet' + (remember ? ' · bleibt eingeloggt' : ''), '#b8ff6a');
  },
  logout() { localStorage.removeItem('vs10_session'); sessionStorage.removeItem('vs10_session'); this.user = null; UI.hide('menu'); this.setMode('login'); UI.show('auth'); SFX.play('click'); },
  saveKey() { return 'vs10_save_' + (this.user || 'gast'); },
  saveChar() { this.updAcc(a => { a.char = Object.assign({}, LOOK); a.hasChar = true; }); },
};
// ---------- Lobby ----------
const Lobby = {
  tab: 'play', mode: 'continue', rot: -0.6, drag: null, t0: 0,
  show() { UI.show('menu'); this.mode = this.save() ? 'continue' : 'new'; this.refresh(); this.setTab('play', true); const cv = $('lobbyCv'); cv.onmousedown = e => { this.drag = e.clientX; }; addEventListener('mouseup', () => this.drag = null); cv.onmousemove = e => { if (this.drag !== null) { this.rot += (e.clientX - this.drag) * 0.012; this.drag = e.clientX; } }; },
  save() { try { return JSON.parse(localStorage.getItem(Auth.saveKey()) || 'null'); } catch (e) { return null; } },
  refresh() {
    const acc = Auth.acc(); if (!acc) return; const sv = this.save();
    $('lbName').textContent = acc.name; $('lbLvl').textContent = sv ? sv.level : 1; $('lbSub').textContent = sv ? (RANKS[(sv.city && sv.city.rank) || 0].n + ' · ' + fmtMoney(sv.res.money)) : 'Neuer Überlebender';
    $('lbXp').style.width = sv ? Math.min(100, sv.xp / (100 + (sv.level - 1) * 70) * 100) + '%' : '0%';
    $('lbChar').textContent = (LOOK.name || acc.name).toUpperCase();
    $('lbNews').innerHTML = '<div class="lb-h">NEUIGKEITEN</div>' + LOBBY_NEWS.map((n, i) => `<div class="lb-card" style="animation-delay:${i * 0.07}s"><b>${n.t}</b><small>${n.s}</small></div>`).join('');
    if (!sv) this.mode = 'new';
    const m = $('lbMode');
    m.innerHTML = (sv ? `<div class="lb-opt ${this.mode === 'continue' ? 'act' : ''}" data-m="continue"><b>⟳ FORTSETZEN</b><small>Tag ${sv.day} · Level ${sv.level} · ${sv.date || ''}</small></div>` : '') + `<div class="lb-opt ${this.mode === 'new' ? 'act' : ''}" data-m="new"><b>▶ NEUE PARTIE</b><small>${sv ? '⚠ überschreibt den Spielstand' : 'Absprung über der Wildnis'}</small></div>`;
    m.querySelectorAll('[data-m]').forEach(d => d.onclick = () => { this.mode = d.dataset.m; SFX.play('click'); this.refresh(); });
    $('lbPlay').textContent = this.mode === 'continue' ? '▶ WEITERSPIELEN' : '▶ SPIELEN';
  },
  setTab(t, quiet) {
    this.tab = t; document.querySelectorAll('.lb-nav button').forEach(b => b.classList.toggle('act', b.dataset.lt === t)); if (!quiet) SFX.play('click');
    const r = $('lbRight'); r.classList.add('hidden'); $('lbPlayBox').classList.toggle('hidden', t !== 'play');
    if (t === 'locker') { this.setTab('play', true); UI.openEditor('lobby'); return; }
    if (t === 'settings') { this.setTab('play', true); UI.overlay = 'settings'; UI.renderSettings(); UI.show('settings'); return; }
    if (t === 'help') { this.setTab('play', true); UI.overlay = 'help'; UI.show('help'); return; }
    if (t === 'career') {
      const sv = this.save(), acc = Auth.acc(), s = (sv && sv.stats) || {};
      const it = [['LEVEL', sv ? sv.level : 1], ['TAGE', sv ? sv.day : 0], ['MONSTER', s.kills || 0], ['ALIENS', s.aliens || 0], ['BOSSE', s.bosses || 0], ['GEBÄUDE', s.built || 0], ['BÄUME', s.trees || 0], ['KISTEN', s.crates || 0], ['PLANETEN', s.planets || 0], ['FABRIK-GÜTER', s.factory || 0], ['LIEFERUNGEN', s.deliveries || 0], ['SPIELZEIT', Math.floor((s.played || 0) / 60) + ' min']];
      const ach = [['🌲', 'Holzfäller', (s.trees || 0) >= 50], ['☠', 'Monsterjäger', (s.kills || 0) >= 200], ['👑', 'Bürgermeister', sv && sv.city && sv.city.mayor], ['🚀', 'Raumfahrer', (s.planets || 0) >= 1], ['🏭', 'Industrieller', (s.factory || 0) >= 100], ['🌙', 'Überlebender', (s.nights || 0) >= 10]];
      r.innerHTML = `<div class="lb-h">KARRIERE · ${acc.name.toUpperCase()}</div><small class="csub">Konto seit ${acc.created}</small><div class="stats lb-stats">${it.map(([n, v]) => `<div class="stat"><b>${v}</b><small>${n}</small></div>`).join('')}</div><div class="lb-h" style="margin-top:14px">ERFOLGE</div><div class="lb-ach">${ach.map(([i, n, ok]) => `<div class="${ok ? 'ok' : ''}"><span>${i}</span><small>${n}</small></div>`).join('')}</div>`;
      r.classList.remove('hidden');
    }
  },
  play() {
    SFX.init(); const acc = Auth.acc();
    if (this.mode === 'continue' && this.save()) { loadGame(); return; }
    if (!acc.hasChar) { UI.openEditor('create'); return; }
    startNewGame();
  },
  render(dt) {
    const cv = $('lobbyCv'); if (!cv || $('menu').classList.contains('hidden')) return;
    const g = cv.getContext('2d'), t = performance.now() / 1000; g.clearRect(0, 0, cv.width, cv.height);
    const cx = cv.width / 2, cy = cv.height - 150;
    const sp = g.createRadialGradient(cx, cy - 200, 20, cx, cy - 150, 330); sp.addColorStop(0, 'rgba(184,255,106,0.20)'); sp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sp; g.fillRect(0, 0, cv.width, cv.height);
    const sG = G, sV = Object.assign({}, VIEW), sO = OUTLINE; G = g; OUTLINE = true; Object.assign(VIEW, { cx: 0, cy: 0, ox: cx, oy: cy, zoom: 5.4 }); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
    isoEllipse(0, 0, 0, 30, 'rgba(20,40,24,0.85)'); isoEllipse(0, 0, 0, 22, 'rgba(0,0,0,0.45)');
    g.strokeStyle = 'rgba(184,255,106,' + (0.5 + Math.sin(t * 3) * 0.25) + ')'; g.lineWidth = 3; const c0 = P(0, 0, 0); g.beginPath(); g.ellipse(c0.x, c0.y, 31 * IX * 1.414 * 5.4, 31 * IY * 1.414 * 5.4, 0, 0, 6.283); g.stroke(); g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,0.6)';
    BOXES = [];
    if (this.drag === null) this.rot += dt * 0.35;
    addModel(humanParts(LOOK, { walk: t * 2, moving: 0.15, tool: 'rifle', attach: { scope: 1, grip: 1 }, camo: 'gold', t }), 0, 0, 0, this.rot, 1); flushBoxes();
    G = sG; Object.assign(VIEW, sV); OUTLINE = sO;
    for (let i = 0; i < 14; i++) { const a = t * 0.4 + i * 0.45; g.fillStyle = 'rgba(184,255,106,' + (0.25 + Math.sin(t * 2 + i) * 0.2) + ')'; g.fillRect(cx + Math.cos(a) * 190, cy - 40 - ((t * 40 + i * 37) % 420), 3, 3); }
  },
};
// ---------- Editor-Modi ----------
UI.openEditor = function (mode) {
  this.editMode = mode || 'lobby'; this.editLook = Object.assign({}, LOOK); this.show('editor');
  if (mode !== 'hq') this.hide('menu'); else { this.overlay = 'editor'; }
  $('edTitle').textContent = mode === 'create' ? 'ERSTELLE DEINEN CHARAKTER' : mode === 'hq' ? 'GARDEROBE' : 'SPIND';
  $('cSave').textContent = mode === 'create' ? "✔ LOS GEHT'S" : '✔ SPEICHERN'; $('cBack').classList.toggle('hidden', mode === 'create');
  $('cName').value = this.editLook.name || ''; this.renderEditorOpts(); SFX.play('click');
};
UI.closeEditor = function (saved) {
  const mode = this.editMode; this.hide('editor');
  if (saved) { this.editLook.name = $('cName').value.trim() || (Auth.acc() ? Auth.acc().name : 'Survivor'); LOOK = Object.assign({}, this.editLook); Auth.saveChar(); SFX.play('upgrade'); }
  if (mode === 'hq') { this.overlay = null; if (saved && S) { burst(S.p.x, S.p.y, 30, '#ffe066', 40, 200); floater(S.p.x, S.p.y, 'NEUER LOOK!', '#ffd84a', true); } return; }
  if (mode === 'create' && saved) { startNewGame(); return; }
  Lobby.show();
};
;

// ----------------------------- main.js -----------------------------

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
  if (S.build.on && MOUSE.down && !S.wallDrag && (S.build.sel === 'wall' || S.build.sel === 'gate')) tryPlace();
  S.hoverB = S.build.on ? (bldAt(screenToWorld(MOUSE.x, MOUSE.y).x, screenToWorld(MOUSE.x, MOUSE.y).y) || null) : null;
  updateZombies(dt); updateBuildings(dt); updateFactory(dt); updateProjectiles(dt); updateNature(dt); updateEffects(dt); updateCityTask(dt); updateExpedition(dt); checkMission();
  if (inCity()) updateCityLife(dt);
  const h = p.inHeli, sh = p.inShip, tgt = p.inCar || h || sh || p;
  const look = p.inCar ? { x: Math.cos(p.inCar.a) * p.inCar.v * 0.35, y: Math.sin(p.inCar.a) * p.inCar.v * 0.35 } : h ? { x: h.vx * 0.5, y: h.vy * 0.5 } : sh ? { x: sh.vx * 0.4, y: sh.vy * 0.4 } : (() => { const m = screenToWorld(MOUSE.x, MOUSE.y); return { x: (m.x - p.x) * 0.12, y: (m.y - p.y) * 0.12 }; })();
  const ct = camTarget(tgt.x + look.x, tgt.y + look.y, h ? h.z * 0.6 : sh ? (S.where === 'space' ? 30 : sh.z * 0.6) : 0);
  VIEW.cx = lerp(VIEW.cx, ct.x, Math.min(1, dt * 5)); VIEW.cy = lerp(VIEW.cy, ct.y, Math.min(1, dt * 5));
  const base = h ? 0.6 : sh ? (S.where === 'space' ? 0.62 : clamp(0.75 - sh.z / 1200, 0.42, 0.75)) : p.inCar ? 0.72 : S.build.on ? 0.82 : inCity() ? 1.6 : S.where === 'tower' ? 1.3 : S.where === 'station' ? 1.12 : 0.95;
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
;

// ---- V17.1: Brennstoffzellen auch auf der Hauptkarte (Batteriedepots bei den Treibstofftanks der Militärbasis) ----
{
  const _mmwCells = makeMainWorld;
  makeMainWorld = function (seed) {
    const W = _mmwCells(seed);
    try { for (const [x, y] of [[52.4, 86.6], [52.6, 81.4], [55.2, 84.2]]) if (freeAt(W, x * TILE, y * TILE, 18)) { const n = addNode(W, x * TILE, y * TILE, 'cellnode'); if (n) n.sc = 1.15; } } catch (e) { console.warn('Zellen', e); }
    return W;
  };
}
;

// ===================================================== addons.js =====================================================
changeLevel = __changeLevel_addons_1;
curOrder = __curOrder_addons_1;
deliverItem = __deliverItem_addons_1;
genOutput = __genOutput_addons_1;
maxLevel = __maxLevel_addons_1;
rebuildNets = __rebuildNets_addons_1;
recalcCap = __recalcCap_addons_1;
refreshHotbar = __refreshHotbar_addons_1;
updateNeighbors = __updateNeighbors_addons_1;

// ===== ACTIV · addons.js (zusammengeführt aus: v11.js, v12.js, v12b.js, v13.js, v14.js, zones_runtime.js) =====

// ----------------------------- v11.js -----------------------------

// =====================================================================================
// VERDANT SIEGE V11 – Axt-Start, Waffenläden, Industrie überall, Verschmelzen,
// begehbare Schluchten, Treppe, Neonstadt (oben) & Altstadt (unten). Lädt nach main.js.
// =====================================================================================
Object.assign(BUILD, {
  workbench:  { n: 'Werkstatt', icon: '🛠', w: 2, h: 2, cost: { wood: 30, stone: 15, scrap: 10 }, hp: 360, solid: 1, desc: 'E: Munition, Granaten, Medikits & mehr herstellen. Jede Stufe = neue Rezepte.' },
  watchtower: { n: 'Wachturm', icon: '🗼', w: 1, h: 1, cost: { wood: 25, stone: 10 }, hp: 320, light: 190, solid: 1, desc: 'Licht + Späher: Monster im Umkreis auf der Minimap. Mauern verbinden sich. St.3: Suchscheinwerfer.' },
  sawmill:    { n: 'Sägewerk', icon: '🪚', w: 2, h: 2, cost: { wood: 30, scrap: 15, stone: 10 }, hp: 260, planet: 1, use: 5, solid: 1, rot: 1, desc: 'Sägt Holz aus Bäumen in der Nähe (mind. 2) aufs Band (R = Richtung).' },
  ammofab:    { n: 'Munitionsfabrik', icon: '🏭', w: 2, h: 2, cost: { scrap: 40, stone: 20, elec: 3 }, hp: 320, planet: 1, use: 8, solid: 1, rot: 1, desc: 'Schrott per Band rein → je 1 Schrott = 10 Munition raus.' },
  export:     { n: 'Exportrampe', icon: '💰', w: 2, h: 2, cost: { scrap: 30, wood: 20 }, hp: 300, planet: 1, solid: 1, desc: 'Alles, was per Band ankommt, wird sofort verkauft (+10%).' },
});
BUILD.wind.cost = { scrap: 18, stone: 8, elec: 1 }; BUILD.geo.cost = { stone: 30, scrap: 20, elec: 2 }; BUILD.drill.cost = { scrap: 25, stone: 15, elec: 2 };
BUILD.smelter.cost = { scrap: 30, stone: 20, elec: 3 }; BUILD.battery.cost = { scrap: 10, elec: 2 }; BUILD.scanner.cost = { elec: 4, scrap: 15 };
BUILD.drill.desc = 'Fördert Rohstoff aufs Band (R = Richtung). Erde: nächstes Stein/Schrott-Vorkommen. Planeten: Planetenrohstoff.';
const BUILD_CATS = [
  { n: '⚔ VERTEIDIGUNG', list: ['wall', 'gate', 'watchtower', 'turret', 'autogun', 'lamp', 'fire', 'beacon', 'pturret', 'plamp'] },
  { n: '⌂ BASIS', list: ['hq', 'farm', 'storage', 'workbench', 'generator', 'garage', 'helipad'] },
  { n: '⚡ STROM', list: ['pcable', 'solar', 'wind', 'geo', 'reactor', 'battery'] },
  { n: '🏭 INDUSTRIE', list: ['drill', 'belt', 'smelter', 'sawmill', 'ammofab', 'container', 'export', 'scanner', 'sensor', 'analyzer', 'scrubber'] },
];
const BUILD_ONLY = { helipad: 'main', garage: 'main', analyzer: 'planet', scrubber: 'planet' };
function __curOrder_addons_1() { const c = BUILD_CATS[(S && S.buildCat) || 0], where = S ? S.where : 'main'; return c.list.filter(k => BUILD[k] && (!BUILD_ONLY[k] || BUILD_ONLY[k] === where)); }
function setBuildCat(i) { if (!S) return; S.buildCat = (i + BUILD_CATS.length) % BUILD_CATS.length; const o = curOrder(); if (!o.includes(S.build.sel)) S.build.sel = o[0]; SFX.play('click'); UI.buildHotbar(); }
const GUN_SHOP = { rifle: { price: 1800 }, shotgun: { price: 1200 }, sniper: { price: 6500, rank: 2 }, plasma: { price: 32000, rank: 3, station: true } };
const BLACK_GUNS = { shotgun: { price: 950 }, rifle: { price: 1550 }, lmg: { price: 8800 } };
const GUN_DESC = { rifle: 'Der Allrounder. Präzise Dauerfeuer-Waffe.', shotgun: 'Sieben Schrotkugeln. Nahkampf-König.', sniper: 'Durchschlägt bis zu 3 Gegner.', lmg: '100-Schuss-Gurt. Wer braucht Zielen?', plasma: 'Alien-Technologie. Durchschlagende Plasmabolzen.' };
const ITEM_AMT = { ammo: 10 };
const MERGE = { storage: 'LAGERHALLE', farm: 'GROSSFELD', solar: 'SOLARPARK', battery: 'AKKU-BLOCK', container: 'FRACHTTERMINAL', export: 'HANDELSKAI', generator: 'KRAFTWERK', wind: 'WINDPARK', geo: 'THERMALFELD' };
const MERGE_BONUS = { storage: '+25% Lagerplatz je Verbindung', farm: '+20% Wachstum je Verbindung', solar: '+10% Strom je Verbindung', battery: '+10% Kapazität je Verbindung', generator: '+15% Strom je Verbindung', wind: '+10% Strom je Verbindung', geo: '+10% Strom je Verbindung', export: '+5% Erlös je Verbindung', container: 'Ein riesiges Terminal' };
const RECIPES = [
  { n: 'Munition ×30', need: { scrap: 8 }, give: { ammo: 30 }, lvl: 1, icon: '▰' }, { n: 'Granate', need: { scrap: 6, stone: 6 }, give: { grenades: 1 }, lvl: 2, icon: '●' },
  { n: 'Medikit', need: { food: 3, scrap: 4 }, give: { meds: 1 }, lvl: 2, icon: '✚' }, { n: 'Munition ×80', need: { scrap: 14, stone: 4 }, give: { ammo: 80 }, lvl: 3, icon: '▰▰' },
  { n: 'Sprit ×20', need: { wood: 15, food: 1 }, give: { fuel: 20 }, lvl: 3, icon: '⛽' }, { n: 'Elektronik', need: { scrap: 24 }, give: { elec: 1 }, lvl: 4, icon: '🔌' },
];
LOBBY_NEWS.unshift({ t: 'V11 · NUR MIT DER AXT', s: 'Waffen kaufst du in Neu-Eden – oder findest sie ganz selten.' }, { t: 'NEONSTADT & ALTSTADT', s: 'Oben Neon und Regen. Unten Laternen, Holzhäuser und Treppen.' }, { t: 'INDUSTRIE ÜBERALL', s: 'Sägewerk, Munitionsfabrik, Exportrampe – auf Erde & Planeten.' }, { t: 'VERSCHMELZEN', s: 'Gleiche Gebäude nebeneinander werden zu Großanlagen.' });
TIPS.push('Du startest nur mit der Axt. Verkaufe Holz & Stein und kauf dir beim Waffenhändler »Kaliber« eine Knarre.', 'Gleiche Gebäude nebeneinander verschmelzen – und werden stärker!', 'In den Schluchten führen Felspfade hinab. Unten glühen Kristalle.', 'Baumodus: TAB wechselt die Kategorie.');
(() => { const st = document.createElement('style'); st.textContent = `#buildbar{flex-wrap:wrap!important}.bcats{display:flex;gap:6px;flex-basis:100%;width:100%;margin:0 0 6px 0;flex-wrap:wrap;justify-content:center}.bcat{padding:4px 11px;border-radius:7px;background:rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.18);font:900 11px "Trebuchet MS",Arial;color:#d8f0e0;cursor:pointer;user-select:none}.bcat.act{background:linear-gradient(#ffe27a,#e8b923);color:#1a1a1a;border-color:#fff3c0;box-shadow:0 0 12px rgba(255,216,74,.6)}.bcat.hint{opacity:.55;cursor:default}.gunrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.gunrow .mcard{flex:1;min-width:160px}`; document.head.appendChild(st); })();

// ---------- Neonstadt: Umfärben aller Stadt-Modelle + Cyber-Bürger ----------
const _rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function _hsl(h) { let [r, g, b] = _rgb(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s, l]; }
const CYBER_MAP = new Map();
function cyberCol(c) {
  if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return c;
  let v = CYBER_MAP.get(c); if (v) return v;
  const [h, s, l] = _hsl(c), hash = parseInt(c.slice(1), 16) % 3;
  if (s < 0.38 && l > 0.6) v = l > 0.86 ? '#3a4152' : '#2b303c';                       // Creme, Stein, Schnee → Stahl
  else if (h >= 30 && h <= 58 && s > 0.5 && l > 0.72) v = ['#ff3fa4', '#3ff4ff', '#b05cff'][hash]; // warmes Fensterlicht → Neon
  else if (h >= 28 && h <= 58 && s > 0.4 && l > 0.3) v = l > 0.5 ? '#3ff4ff' : '#1fa8c0';  // Gold/Messing → Cyan
  else if (h >= 195 && h <= 250 && l < 0.5) v = '#2a1f45';                              // Schieferdächer → Violett
  else if (s < 0.3 && l < 0.6 && l > 0.2) v = '#1e2229';
  else v = c;
  CYBER_MAP.set(c, v); return v;
}
let CYBER_GEN = false;
{
  const _pp = propParts;
  propParts = function (p) { const out = _pp(p); if (S && (S.where === 'city' || CYBER_GEN) && p.kind !== 'cybertower' && p.kind !== 'hoload' && p.kind !== 'holotree' && p.kind !== 'neonlamp' && p.kind !== 'stairwell' && p.kind !== 'gunshop') for (const q of out) q[6] = cyberCol(q[6]); return out; };
  const _nl = npcLook;
  npcLook = function (kind, rng) { const L = _nl(kind, rng); if (CYBER_GEN && kind === 'rich') { const r = rng || Math.random; Object.assign(L, { coat: ['#14161c', '#1c2029', '#2a1f45'][Math.floor(r() * 3)], trim: '#3ff4ff', shirt: '#22262f', tie: null, neon: ['#ff3fa4', '#3ff4ff', '#b05cff'][Math.floor(r() * 3)], goggles: r() < 0.5 ? '#3ff4ff' : null, hat: r() < 0.2 ? 'Helm' : 'Keine' }); } return L; };
  const _gc = getCityW;
  getCityW = function (level) { CYBER_GEN = level === 'city'; try { return _gc(level); } finally { CYBER_GEN = false; } };
}

// ---------- Start nur mit Axt ----------
{ const _ns = newState; newState = function (seed) { const s = _ns(seed); Object.assign(s.res, { wood: 0, stone: 0, scrap: 0, food: 0, ammo: 0, meds: 0, grenades: 0, fuel: 0, money: 0 }); s.unlocked = { _v11: true }; s.buildCat = 0; s.p.mag = { rifle: 0, shotgun: 0, sniper: 0, lmg: 0, plasma: 0 }; return s; }; }
function hotbarSig() { return GUNS.filter(g => S.unlocked[g]).join(',') + '|' + (S.res.meds > 0 ? 'm' : '') + (S.res.grenades > 0 ? 'g' : ''); }
function __refreshHotbar_addons_1() {
  if (!S.unlocked) S.unlocked = {};
  if (!S.unlocked._v11) { S.unlocked.rifle = true; S.unlocked.shotgun = true; S.unlocked._v11 = true; }
  const cur = HOTBAR[S.p.slot]; HOTBAR = ['axe']; for (const g of GUNS) if (S.unlocked[g]) HOTBAR.push(g);
  if (S.res.meds > 0) HOTBAR.push('medkit'); if (S.res.grenades > 0) HOTBAR.push('grenade');
  const ni = HOTBAR.indexOf(cur); S.p.slot = ni >= 0 ? ni : 0; S.hbSig = hotbarSig(); if (typeof UI !== 'undefined') UI.buildHotbar();
}
function rollWeapon() { const pool = [['rifle', 40], ['shotgun', 34], ['sniper', 12], ['lmg', 10]]; if (S.where === 'planet' || S.where === 'space' || S.where === 'station') pool.push(['plasma', 14]); let r = Math.random() * pool.reduce((a, b) => a + b[1], 0); for (const [g, w] of pool) { r -= w; if (r <= 0) return g; } return 'rifle'; }
function giveWeapon(g, x, y, bought) {
  const p = S.p, W = WEAPONS[g];
  if (S.unlocked[g]) { addRes('ammo', 60, x, y); floater(x, y - 20, 'DOPPELT: ' + W.n.toUpperCase() + ' → +60 MUNI', '#ffe066', true); SFX.play('crate'); return; }
  S.unlocked[g] = true; p.mag[g] = weaponStat(g).mag; if (!bought) S.res.ammo += 30;
  refreshHotbar(); p.slot = Math.max(0, HOTBAR.indexOf(g)); UI.buildHotbar();
  announce('🔫 ' + (bought ? 'GEKAUFT' : 'WAFFE GEFUNDEN') + ': ' + W.n.toUpperCase(), bought ? 'Taste ' + (p.slot + 1) + ' · Voll geladen' : 'Unglaublich selten! Voll geladen + 30 Munition', '#ffb020');
  SFX.play('jackpot'); S.flash = 0.75; S.flashCol = '255,190,60'; shake(10);
  for (let i = 0; i < 4; i++) S.rings.push({ x: p.x, y: p.y, r: 6 + i * 18, max: 260, col: i % 2 ? '255,216,74' : '255,140,60', life: 0.9 + i * 0.18 });
  burst(p.x, p.y, 40, '#ffd84a', 50, 260, { up: 1.8 }); S.particles.push({ x: p.x, y: p.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.6, max: 0.6, col: '#fff', s: 1, beam: true, grav: 0, light: 260 });
  S.weaponShow = { g, t: 2.4 };
}
{ const _oc = openCrate; openCrate = function (c) { _oc(c); let ch = [0.004, 0.02, 0.07, 0.2][c.rarity] || 0; if (c.air) ch *= 1.5; if (S.where === 'exp' && S.W.biome === 'military') ch *= 2.2; if (c.pit) ch *= 1.5; if (Math.random() < ch) setTimeout(() => { if (S) giveWeapon(rollWeapon(), c.x, c.y, false); }, 1000); }; }
{ const _kz = killZombie; killZombie = function (z, src) { const n0 = S.pickups.length; _kz(z, src); for (let i = S.pickups.length - 1; i >= n0; i--) if (Math.random() < 0.55 && !RES[S.pickups[i].kind].rare) S.pickups.splice(i, 1); }; }

// ---------- Höhen: Schluchten & Treppen ----------
let MOVE_FROM_Z = null;
blockedFor = function (x, y, who) {
  const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
  if (gx < 0 || gy < 0 || gx >= MAP || gy >= MAP) return { edge: true };
  const W = S.W, i = gy * MAP + gx; if (W.tiles[i] === 9) return { edge: true };
  if (MOVE_FROM_Z !== null && W.depth && Math.abs(W.depth[i] - MOVE_FROM_Z) > 30) return { edge: true, cliff: true };
  const b = S.grid[i];
  if (b) { if (who === 'player' && PLAYER_PASS[b.type]) return null; if (who === 'car' && (b.type === 'gate' || b.type === 'garage' || b.type === 'farm' || b.type === 'helipad')) return null; if (who === 'zombie' && ZOMBIE_PASS[b.type]) return null; return b; }
  return null;
};
{ const _me = moveEnt; moveEnt = function (e, dx, dy, r, who) { if (!S.W.depth) return _me(e, dx, dy, r, who); MOVE_FROM_Z = groundZ(e.x, e.y); try { return _me(e, dx, dy, r, who); } finally { MOVE_FROM_Z = null; } }; }
{ const _ad = ambientDark; ambientDark = function () { const a = S.W.ambient; if (a === 'cyber') return 0.6; if (a === 'dusk') return 0.4; let d = _ad(); if (S.W.kind === 'main' && S.p && groundZ(S.p.x, S.p.y) < -40 && tileType(S.W, S.p.x, S.p.y) === 11) d = Math.max(d, 0.4); return d; }; }
{ const _cl = collectLights; collectLights = function () { _cl(); const t = performance.now() / 1000; for (const b of S.buildings) if (b.type === 'watchtower' && b.level >= 3) { const a = t * 0.9 + b.id; LIGHTS.push({ x: b.x + Math.cos(a) * 170, y: b.y + Math.sin(a) * 170, r: 120 + b.level * 15, col: '255,250,220', safe: true }); } }; }
function __changeLevel_addons_1(to) {
  SFX.play('door'); for (let i = 0; i < 6; i++) SFX.tone(150 + i * 12, 0.05, 'triangle', 0.05, 0.8, i * 0.12);
  UI.transition(to === 'under' ? 'DIE ALTSTADT' : 'NEONSTADT', to === 'under' ? 'Stufe um Stufe hinab – Holzhäuser, Laternen und Abendlicht' : 'Zurück nach oben – Neon, Regen und Hologramme', () => {
    const W = getCityW(to);
    if (to === 'under') { switchWorld('under', W, W.stairsUp.x, 4 * TILE); S.stairAnim = { t: 0, dur: 0.9, x0: W.stairsUp.x, y0: 4 * TILE, x1: W.spawn.x, y1: W.spawn.y }; }
    else { switchWorld('city', W, 22 * TILE, 4.5 * TILE); S.stairAnim = { t: 0, dur: 0.9, x0: 22 * TILE, y0: 4.5 * TILE, x1: W.spawnTop.x, y1: W.spawnTop.y }; }
  }, 700);
}
function underStairZ(x, y) { const W = S.W; if (!W.stairsUp || Math.abs(x - W.stairsUp.x) > 60) return 0; return clamp((250 - y) / 224, 0, 1) * 114; }

// ---------- Bauen überall + Verschmelzen ----------
placementInfo = function (wx, wy) {
  const bs = S.build, fp = footprint(bs.sel, bs.rot), gx = Math.floor(wx / TILE - fp.w / 2 + 0.5), gy = Math.floor(wy / TILE - fp.h / 2 + 0.5), cx = (gx + fp.w / 2) * TILE, cy = (gy + fp.h / 2) * TILE;
  let ok = true, why = '';
  if (S.where !== 'main' && S.where !== 'planet') { ok = false; why = 'Hier kann nicht gebaut werden'; }
  else if (BUILD_ONLY[bs.sel] && BUILD_ONLY[bs.sel] !== S.where) { ok = false; why = BUILD_ONLY[bs.sel] === 'main' ? 'Nur auf der Erde' : 'Nur auf fremden Planeten sinnvoll'; }
  if (ok && (bs.sel === 'turret' || bs.sel === 'autogun')) { const tg = gridAt(Math.floor(wx / TILE), Math.floor(wy / TILE)); if (tg && tg.type === 'wall') { const cost = buildCost(bs.sel), ok2 = !tg.mount && canAfford(cost) && Math.hypot(tg.x - S.p.x, tg.y - S.p.y) < 460; return { gx: tg.gx, gy: tg.gy, w: 1, h: 1, cx: tg.x, cy: tg.y, ok: ok2, why: tg.mount ? 'Mauer ist schon bewaffnet' : !canAfford(cost) ? 'Material fehlt: ' + costStr(cost) : 'Zu weit weg', cost, mount: tg }; } }
  for (let j = 0; j < fp.h && ok; j++) for (let i = 0; i < fp.w; i++) { const g = gridAt(gx + i, gy + j); if (g === undefined) { ok = false; why = 'Außerhalb'; break; } if (g) { ok = false; why = 'Belegt'; break; } const tt = S.W.tiles[(gy + j) * MAP + gx + i]; if (tt === 9 || tt === 11 || tt === 20 || tt === 21) { ok = false; why = tt === 11 ? 'Schlucht – hier hält kein Fundament' : tt === 21 ? 'Steinbruch – kein ebener Grund' : 'Gesperrt'; break; } }
  if (ok) { const x0 = gx * TILE, y0 = gy * TILE, x1 = x0 + fp.w * TILE, y1 = y0 + fp.h * TILE; staticNear(S.W, cx, cy, o => { if ((o.btype === 'tree' || o.btype === 'node') && o.hp > 0 && o.x > x0 - 6 && o.x < x1 + 6 && o.y > y0 - 6 && o.y < y1 + 6) { ok = false; why = o.btype === 'tree' ? 'Baum im Weg – erst fällen!' : 'Stein im Weg – abbauen!'; return true; } if (o.btype === 'prop' && o.solid && o.hw && Math.abs(o.x - cx) < o.hw + fp.w * TILE / 2 && Math.abs(o.y - cy) < o.hd + fp.h * TILE / 2) { ok = false; why = 'Hindernis im Weg'; return true; } }); for (const c of S.W.cars) if (c.x > x0 - 20 && c.x < x1 + 20 && c.y > y0 - 20 && c.y < y1 + 20) { ok = false; why = 'Fahrzeug im Weg'; } }
  if (ok && Math.hypot(cx - S.p.x, cy - S.p.y) > (S.wallDrag ? 900 : 460)) { ok = false; why = 'Zu weit weg'; }
  if (ok && !PLAYER_PASS[bs.sel]) { const px = S.p.x, py = S.p.y; if (px > gx * TILE - 10 && px < (gx + fp.w) * TILE + 10 && py > gy * TILE - 10 && py < (gy + fp.h) * TILE + 10) { ok = false; why = 'Du stehst im Weg'; } }
  if (ok && BUILD[bs.sel].unique && S.buildings.some(b => b.type === bs.sel)) { ok = false; why = 'Nur eins erlaubt'; }
  const cost = buildCost(bs.sel); if (ok && !canAfford(cost)) { ok = false; why = 'Material fehlt: ' + costStr(cost); }
  let merge = 0; if (ok && MERGE[bs.sel]) for (let j = gy - 1; j <= gy + fp.h; j++) for (let i = gx - 1; i <= gx + fp.w; i++) { const corner = (i === gx - 1 || i === gx + fp.w) && (j === gy - 1 || j === gy + fp.h), inside = i >= gx && i < gx + fp.w && j >= gy && j < gy + fp.h; if (corner || inside) continue; const o = gridAt(i, j); if (o && o.type === bs.sel) merge++; }
  return { gx, gy, w: fp.w, h: fp.h, cx, cy, ok, why, cost, merge };
};
function __updateNeighbors_addons_1(b) { if (b.type !== 'wall' && b.type !== 'gate') return 0; const isW = o => o && (o.type === 'wall' || o.type === 'gate' || o.type === 'hq' || o.type === 'watchtower'); const nb = { e: isW(gridAt(b.gx + 1, b.gy)), w: isW(gridAt(b.gx - 1, b.gy)), s: isW(gridAt(b.gx, b.gy + 1)), n: isW(gridAt(b.gx, b.gy - 1)) }; b.nb = nb; return (nb.e ? 1 : 0) + (nb.w ? 1 : 0) + (nb.s ? 1 : 0) + (nb.n ? 1 : 0); }
function mergeScan(b) {
  if (!MERGE[b.type]) { b.mnb = null; b.mlinks = 0; b.mkey = ''; return 0; }
  const m = { e: false, w: false, s: false, n: false }, same = o => o && o !== b && o.type === b.type;
  for (let j = b.gy; j < b.gy + b.h; j++) { if (same(gridAt(b.gx + b.w, j))) m.e = true; if (same(gridAt(b.gx - 1, j))) m.w = true; }
  for (let i = b.gx; i < b.gx + b.w; i++) { if (same(gridAt(i, b.gy + b.h))) m.s = true; if (same(gridAt(i, b.gy - 1))) m.n = true; }
  b.mnb = m; b.mlinks = (m.e ? 1 : 0) + (m.w ? 1 : 0) + (m.s ? 1 : 0) + (m.n ? 1 : 0); b.mkey = (m.e ? 'e' : '') + (m.w ? 'w' : '') + (m.s ? 's' : '') + (m.n ? 'n' : ''); return b.mlinks;
}
function touching(b) { const set = new Set(); for (let j = b.gy - 1; j <= b.gy + b.h; j++) for (let i = b.gx - 1; i <= b.gx + b.w; i++) { const o = gridAt(i, j); if (o && o !== b) set.add(o); } return [...set]; }
function mergeGroup(b) { const seen = new Set([b]), q = [b]; while (q.length) { const c = q.pop(); for (const o of touching(c)) if (o.type === b.type && !seen.has(o)) { seen.add(o); q.push(o); } } return [...seen]; }
function mergeFx(b) {
  const grp = mergeGroup(b), n = grp.length, name = MERGE[b.type];
  for (const o of touching(b)) if (o.type === b.type) { const jx = (b.x + o.x) / 2, jy = (b.y + o.y) / 2; burst(jx, jy, 10, '#ffe066', 26, 200, { up: 1.6 }); S.rings.push({ x: jx, y: jy, r: 4, max: 90, col: '255,216,74', life: 0.6 }); }
  for (const o of grp) { o.pop = 1; o.shakeT = 0.25; }
  floater(b.x, b.y - 10, '⚡ VERSCHMOLZEN · ' + name + ' ×' + n, n >= 4 ? '#ffd84a' : '#bfff7a', true);
  setTimeout(() => S && floater(b.x, b.y - 4, MERGE_BONUS[b.type] || '', '#7ad7ff'), 350);
  for (let i = 0; i < Math.min(6, n + 1); i++) SFX.tone(440 * Math.pow(1.1225, i * 2), 0.12, 'triangle', 0.1, 1, i * 0.06);
  shake(5 + Math.min(10, n * 1.5)); S.flash = Math.max(S.flash, 0.18 + Math.min(0.3, n * 0.04)); S.flashCol = '255,230,120';
  if (n === 3 || n === 6 || n === 10) { announce('⚡ ' + name + ' ×' + n + '!', MERGE_BONUS[b.type] || 'Großanlage', '#ffd84a'); SFX.play('streak'); addXp(n * 8, b.x, b.y); } else addXp(4 + n * 2);
}
{
  const _pb = placeBuilding;
  placeBuilding = function (info, silentLoad, data) { const b = _pb(info, silentLoad, data); if (!b || (info.mount && !data)) return b; mergeScan(b); for (const o of touching(b)) mergeScan(o); recalcCap(); if (!silentLoad) { b.drop = 1; if (b.mlinks) setTimeout(() => S && S.buildings.includes(b) && mergeFx(b), 260); } return b; };
  const _rb = removeBuilding; removeBuilding = function (b, refund) { const nb = touching(b); _rb(b, refund); for (const o of nb) mergeScan(o); recalcCap(); };
  const _ub = upgradeBuilding;
  upgradeBuilding = function (b) { const l0 = b.level; _ub(b); if (b.level <= l0) return; b.evo = 1.4; S.particles.push({ x: b.x, y: b.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.7, max: 0.7, col: '#fff', s: 1, beam: true, grav: 0, light: 240 }); for (const c of ['#ffd84a', '#7dff5a', '#7ad7ff', '#ff7ad0']) burst(b.x, b.y, 30, c, 10, 220, { up: 2 }); if (b.level >= maxLevel(b.type)) setTimeout(() => { if (!S) return; announce('★ MAX-STUFE ★', BUILD[b.type].n + ' voll ausgebaut', '#7dff5a'); SFX.play('jackpot'); }, 600); };
}
function __maxLevel_addons_1(type) { return (type === 'wall' || type === 'gate' || type === 'hq' || type === 'workbench' || type === 'watchtower') ? 4 : 3; }
{ const _uc = upgradeCost; upgradeCost = function (type, lvl) { const c = _uc(type, lvl); if (type === 'workbench' && lvl >= 2) c.elec = lvl; if (type === 'watchtower' && lvl >= 3) c.elec = 2; if (BUILD[type] && BUILD[type].planet) { delete c.wood; c.scrap = (c.scrap || 0) + 10 * lvl; c.elec = (c.elec || 0) + lvl; } return c; }; }
function __recalcCap_addons_1() { S.cap = 150 + S.mainB.filter(b => b.type === 'storage').reduce((a, b) => a + (150 + (b.level - 1) * 100) * (1 + 0.25 * (b.mlinks || 0)), 0); }

// ---------- Werkstatt & Läden ----------
{
  const _fi = findInteract; findInteract = function () { const p = S.p; if (!p.inCar && !p.inHeli && !p.inShip && (S.where === 'main' || S.where === 'planet')) for (const b of S.buildings) if (b.type === 'workbench' && Math.hypot(b.x - p.x, b.y - p.y) < 76) return { kind: 'craft', b, text: 'E · WERKSTATT (Stufe ' + b.level + ')' }; return _fi(); };
  const _di = doInteract; doInteract = function (it) { if (it.kind === 'craft') { S.craftB = it.b; CityUI.open('craft'); return; } _di(it); };
}
function gunCards(list, black) {
  const C = S.city; let h = '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
  for (const g of Object.keys(list)) { const o = list[g], own = S.unlocked[g], st = WEAPONS[g], price = Math.round(o.price * (black ? 1 : discount())); const why = own ? '' : o.rank && C.rank < o.rank ? 'Rang „' + RANKS[o.rank].n + '“ nötig' : o.station && !S.station.owned ? 'Nur für Stationsbesitzer' : '';
    h += `<div class="mcard ${own ? 'act' : ''}"><b>${st.icon} ${st.n}</b><p>${GUN_DESC[g]}</p><small>Schaden ${st.dmg}${st.pellets > 1 ? '×' + st.pellets : ''} · Magazin ${st.mag} · ${Math.round(60 / st.rate)} Schuss/min</small><br><br><button class="btn ${own || why ? '' : 'gold'}" data-gun="${g}" data-price="${price}" ${own || why ? 'disabled' : ''}>${own ? '✔ IM BESITZ' : why ? '🔒 ' + why : 'KAUFEN · ' + fmtMoney(price)}</button></div>`; }
  return h + '</div>';
}
function bindGunButtons(root) {
  root.querySelectorAll('[data-gun]').forEach(e => e.onclick = () => { const g = e.dataset.gun, pr = +e.dataset.price; if (S.unlocked[g] || !spendMoney(pr)) return; UI.closeAll(); giveWeapon(g, S.p.x, S.p.y, true); });
  root.querySelectorAll('[data-ammo]').forEach(e => e.onclick = () => { const n = +e.dataset.ammo, pr = +e.dataset.price, k = e.dataset.k || 'ammo'; if (!spendMoney(pr)) return; S.res[k] = (S.res[k] || 0) + n; floater(S.p.x, S.p.y, '+' + n + ' ' + RES[k].s, RES[k].col, true); CityUI.render(); });
}
function ammoRow() { const a = priceBuy('ammo'), g = priceBuy('grenades'), m = priceBuy('meds'); return `<div class="gunrow"><div class="mcard"><b>▰ Munition ×30</b><p>Besitz: ${Math.floor(S.res.ammo)}</p><button class="btn" data-ammo="30" data-price="${a}">${fmtMoney(a)}</button></div><div class="mcard"><b>▰▰ Kiste ×150</b><p>10% Rabatt</p><button class="btn" data-ammo="150" data-price="${Math.round(a * 4.5)}">${fmtMoney(Math.round(a * 4.5))}</button></div><div class="mcard"><b>● Granate</b><p>Besitz: ${S.res.grenades}</p><button class="btn" data-ammo="1" data-k="grenades" data-price="${g}">${fmtMoney(g)}</button></div><div class="mcard"><b>✚ Medikit</b><p>Besitz: ${S.res.meds}</p><button class="btn" data-ammo="1" data-k="meds" data-price="${m}">${fmtMoney(m)}</button></div></div>`; }
{
  const _cr = CityUI.render;
  CityUI.render = function () {
    const st = this.station, b = $('cityBody');
    if (st === 'guns') { b.innerHTML = this.header('WAFFENHÄNDLER »KALIBER«', 'Lizenzierte Feuerkraft. Die einzige legale Art, an eine Waffe zu kommen.') + gunCards(GUN_SHOP, false) + ammoRow() + '<div class="csub" style="margin-top:10px">💡 Geld: Holz/Stein/Schrott am Markt verkaufen, Aufträge, Exportrampe.</div>'; bindGunButtons(b); return; }
    if (st === 'craft') { renderCraft.call(this); return; }
    _cr.call(this);
    if (st === 'black') { b.insertAdjacentHTML('beforeend', '<h2 style="margin-top:14px">🔫 UNTER DER THEKE</h2>' + gunCards(BLACK_GUNS, true)); bindGunButtons(b); }
    if (st === 'radio') { const btn = b.querySelector('[data-airdrop]'); if (btn) { const left = 3 - (S.day - (S.radioDropDay || -99)); if (left > 0) { btn.disabled = true; btn.textContent = 'Wieder in ' + left + ' Tag(en)'; } else { btn.disabled = false; btn.textContent = 'ANFORDERN · ' + fmtMoney(600); btn.onclick = () => { if (!spendMoney(600)) return; S.radioDropDay = S.day; UI.closeAll(); startAirdrop(); }; } } }
  };
}
function renderCraft() {
  const wb = S.craftB, L = wb ? wb.level : 1, b = $('cityBody');
  let h = this.header('🛠 WERKSTATT · STUFE ' + L, 'Rohstoffe rein, Nachschub raus. Upgrade (Baumodus · U) = neue Rezepte.') + '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
  RECIPES.forEach((r, i) => { const lock = L < r.lvl, ok = !lock && canAfford(r.need); h += `<div class="mcard ${lock ? '' : 'act'}" style="${lock ? 'opacity:.5' : ''}"><b>${r.icon} ${r.n}</b><p>${lock ? '🔒 Ab Stufe ' + r.lvl : 'Kosten: ' + costStr(r.need)}</p><button class="btn ${ok ? 'gold' : ''}" data-craft="${i}" ${ok ? '' : 'disabled'}>${lock ? 'GESPERRT' : 'HERSTELLEN'}</button> <button class="btn sm" data-craft5="${i}" ${!lock && canAfford(Object.fromEntries(Object.entries(r.need).map(([k, v]) => [k, v * 5]))) ? '' : 'disabled'}>×5</button></div>`; });
  b.innerHTML = h + '</div>';
  const craft = (i, n) => { const r = RECIPES[i]; for (let k = 0; k < n; k++) { if (!canAfford(r.need)) break; pay(r.need); for (const [kk, vv] of Object.entries(r.give)) addRes(kk, vv, S.p.x, S.p.y, true); } SFX.play('upgrade'); if (wb) { burst(wb.x, wb.y, 30, '#ffd84a', 16, 160, { up: 1.5 }); wb.pop = 1; } UI.toast('🛠 Hergestellt: ' + (n > 1 ? n + '× ' : '') + r.n); renderCraft.call(CityUI); };
  b.querySelectorAll('[data-craft]').forEach(e => e.onclick = () => craft(+e.dataset.craft, 1));
  b.querySelectorAll('[data-craft5]').forEach(e => e.onclick = () => craft(+e.dataset.craft5, 5));
}

// ---------- Industrie überall ----------
function countTrees(b) { let n = 0; for (const t of S.W.trees) if (t.hp > 0 && !t.deco && Math.hypot(t.x - b.x, t.y - b.y) < 180) n++; return n; }
function __rebuildNets_addons_1() {
  const list = S.buildings.filter(isPB); S.nets = [];
  for (const b of list) { b.net = -1; if (b.type === 'pcable') { b.cnb = { e: isPB(gridAt(b.gx + 1, b.gy)), w: isPB(gridAt(b.gx - 1, b.gy)), s: isPB(gridAt(b.gx, b.gy + 1)), n: isPB(gridAt(b.gx, b.gy - 1)) }; b.skey = null; } }
  for (const b of list) { if (b.net >= 0) continue; const net = { bs: [], prod: 0, use: 0, stor: 0, cap: 0, ok: false }, q = [b]; b.net = S.nets.length; S.nets.push(net); while (q.length) { const c = q.pop(); net.bs.push(c); for (let j = c.gy - 1; j <= c.gy + c.h; j++) for (let i = c.gx - 1; i <= c.gx + c.w; i++) { const corner = (i === c.gx - 1 || i === c.gx + c.w) && (j === c.gy - 1 || j === c.gy + c.h); if (corner) continue; const n = gridAt(i, j); if (isPB(n) && n.net < 0) { n.net = b.net; q.push(n); } } } }
  const W = S.W;
  for (const b of list) {
    if (b.type === 'drill') { if (W.planet && S.where === 'planet') { b.dres = W.planet.res; b.nearNode = W.nodes.some(n => n.kind === W.planet.node && n.hp > 0 && Math.hypot(n.x - b.x, n.y - b.y) < 110); } else { let best = null, bd = 130; for (const n of W.nodes) { if (n.hp <= 0 || !NODE_YIELD[n.kind]) continue; const d = Math.hypot(n.x - b.x, n.y - b.y); if (d < bd) { bd = d; best = n; } } b.dres = best ? NODE_YIELD[best.kind][0] : 'stone'; b.nearNode = !!best; } }
    if (b.type === 'sawmill') b.trees = countTrees(b);
  }
  S.factoryDirty = false;
}
function __genOutput_addons_1(b, t) { const env = PLANET_ENV[planetId()] || { sun: 1, wind: 1, geo: 1 }, A = atmoHere(), L = (1 + 0.35 * (b.level - 1)) * (1 + 0.1 * (b.mlinks || 0)); switch (BUILD[b.type].gen) { case 'solar': return 7 * env.sun * (0.25 + 0.75 * S.dayness) * (A && A === ATMO.normal ? 1.25 : 1) * L; case 'wind': return (3 + 5 * (0.5 + 0.5 * Math.sin(t * 0.37 + b.id * 1.7) * Math.sin(t * 0.11 + b.id))) * env.wind * L; case 'geo': return 14 * env.geo * L; case 'reactor': return 45 * L; } return 0; }
function __deliverItem_addons_1(t, res) {
  if (!t) return false;
  if (t.type === 'belt') { if (t.item) return false; t.item = { res, p: 0 }; return true; }
  if (t.type === 'container') { const amt = ITEM_AMT[res] || 1; if (RES[res] && RES[res].cap && S.res[res] >= S.cap) return false; S.res[res] = (S.res[res] || 0) + amt; if (RES[res] && RES[res].cap) S.res[res] = Math.min(S.cap, S.res[res]); t.count = (t.count || 0) + 1; t.pop = 1; S.stats.factory = (S.stats.factory || 0) + 1; S.floaters.push({ x: t.x + R(-10, 10), y: t.y, z: 60, text: '+' + amt + ' ' + RES[res].s, col: RES[res].col, life: 1, big: false }); SFX.tone(1200 + Math.random() * 300, 0.05, 'triangle', 0.05); if (t.count % 25 === 0) { announce('📦 ' + t.count + ' GELIEFERT!', 'Deine Fabrik läuft wie geschmiert', '#ffd84a'); SFX.play('cash'); addXp(40); } else addXp(2); return true; }
  if (t.type === 'export') { const m = MARKET[res], v = Math.max(1, Math.round((m ? m.sell * (ITEM_AMT[res] || 1) : 2) * 1.1 * (1 + 0.05 * (t.mlinks || 0)))); S.res.money += v; t.count = (t.count || 0) + 1; t.pop = 1; S.stats.exported = (S.stats.exported || 0) + v; S.floaters.push({ x: t.x + R(-10, 10), y: t.y, z: 70, text: '+' + fmtMoney(v), col: '#ffd84a', life: 1, big: v >= 100 }); SFX.play('coin'); if (t.count % 30 === 0) { announce('💰 ' + t.count + ' VERKAUFT', 'Gesamterlös ' + fmtMoney(S.stats.exported), '#ffd84a'); SFX.play('cash'); addXp(30); } return true; }
  if (t.type === 'smelter') { if ((t.inp || 0) >= 8) return false; t.inp = (t.inp || 0) + 1; t.inRes = res; return true; }
  if (t.type === 'ammofab') { if (res !== 'scrap' || (t.inp || 0) >= 8) return false; t.inp = (t.inp || 0) + 1; return true; }
  return false;
}
{
  const _uf = updateFactory;
  updateFactory = function (dt) {
    if (S.where === 'planet') { _uf(dt); v11Machines(dt); return; }
    if (S.where !== 'main' || !S.buildings.some(isPB)) return;
    // Erde: Planetenlogik ohne Atmosphäre/Wellen
    earthFactory(dt);
  };
}
function earthFactory(dt) {
  if (S.factoryDirty || !S.nets) rebuildNets();
  const t = performance.now() / 1000;
  for (const n of S.nets) { n.prod = 0; n.use = 0; n.stor = 0; n.cap = 0; }
  for (const b of S.buildings) { if (!isPB(b)) continue; const d = BUILD[b.type], n = S.nets[b.net]; if (!n) continue; if (d.gen) { b.out = genOutput(b, t); n.prod += b.out; } if (d.use) n.use += d.use; if (d.store) { b.stor = b.stor || 0; n.cap += d.store * b.level; } }
  for (const n of S.nets) { const diff = n.prod - n.use; if (diff >= 0) { n.ok = true; let ch = diff * dt * 0.6; for (const b of n.bs) if (BUILD[b.type].store && ch > 0) { const add = Math.min(ch, BUILD[b.type].store * b.level - b.stor); b.stor += add; ch -= add; } } else { let need = -diff * dt; for (const b of n.bs) if (BUILD[b.type].store && need > 0) { const tk = Math.min(need, b.stor); b.stor -= tk; need -= tk; } n.ok = need <= 0.0001; } for (const b of n.bs) { if (BUILD[b.type].store) { n.stor += b.stor; b.charge = b.stor / (BUILD[b.type].store * b.level); } const d = BUILD[b.type]; b.powered = d.use ? n.ok : true; if (b.type === 'pcable') b.powered = n.prod > 0; } }
  for (const b of S.buildings) { if (!isPB(b)) continue; b.pop = Math.max(0, (b.pop || 0) - dt * 3);
    switch (b.type) {
      case 'wind': b.rotor = (b.rotor || 0) + dt * (1 + (b.out || 0) * 0.5); break;
      case 'drill': { b.buf = b.buf || []; const res = b.dres || 'stone'; if (b.powered && b.buf.length < 6) { b.prog = (b.prog || 0) + dt * (b.nearNode ? 1.4 : 0.5); if (b.prog >= 6) { b.prog = 0; b.buf.push(res); burst(b.x, b.y, 40, RES[res].col, 6, 90); SFX.play('stone'); } } pushBuffer(b); break; }
      case 'belt': if (b.item && b.powered) { b.item.p += dt / 0.7; if (b.item.p >= 1) { const [fx, fy] = frontTile(b), tb = gridAt(fx, fy); if (tb && tb !== b && deliverItem(tb, b.item.res)) b.item = null; else b.item.p = 1; } } break;
      case 'smelter': b.buf = b.buf || []; if (b.powered && (b.inp || 0) > 0 && b.buf.length <= 4) { b.prog = (b.prog || 0) + dt; if (b.prog >= 3.5) { b.prog = 0; b.inp--; b.buf.push(b.inRes, b.inRes); burst(b.x, b.y, 30, '#ff8a2a', 12, 120); } } pushBuffer(b); break;
      case 'scanner': if (b.powered && !S.W.scanned) { b.prog = (b.prog || 0) + dt; if (b.prog >= 8) { S.W.scanned = true; let n = 0; for (let k = 0; k < 40 && n < 6; k++) { const a = R(0, 6.28), r = R(180, 560), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (!freeAt(S.W, x, y, 20) || gridAt(Math.floor(x / TILE), Math.floor(y / TILE))) continue; const nd = addNode(S.W, x, y, Math.random() < 0.5 ? 'rock' : 'scrap'); if (nd) { nd.sc = 1.45; nd.rich = true; n++; } } announce('📡 ' + n + ' REICHE VORKOMMEN!', 'Bohrturm daneben = schnellere Förderung', '#5fff8a'); MINI_DIRTY = true; S.factoryDirty = true; } } break;
      case 'sensor': if (b.powered) S.sensorOn = true; break;
    }
  }
  v11Machines(dt);
}
function v11Machines(dt) {
  for (const b of S.buildings) {
    if (b.type === 'sawmill') { b.buf = b.buf || []; b.treeT = (b.treeT || 0) - dt; if (b.treeT <= 0) { b.treeT = 5; b.trees = countTrees(b); } if (b.powered && (b.trees || 0) >= 2 && b.buf.length < 6) { b.prog = (b.prog || 0) + dt * (0.7 + 0.1 * Math.min(b.trees, 10)) * (1 + 0.3 * (b.level - 1)); if (Math.random() < dt * 14) burst(b.x + 4, b.y, 28, '#e8c890', 1, 70); if (b.prog >= 4) { b.prog = 0; b.buf.push('wood'); SFX.play('chop'); } } pushBuffer(b); }
    if (b.type === 'ammofab') { b.buf = b.buf || []; if (b.powered && (b.inp || 0) > 0 && b.buf.length <= 4) { b.prog = (b.prog || 0) + dt * (1 + 0.35 * (b.level - 1)); if (b.prog >= 3) { b.prog = 0; b.inp--; b.buf.push('ammo'); burst(b.x, b.y, 30, '#ffe066', 10, 110); SFX.tone(700, 0.08, 'square', 0.05, 1.4); } } pushBuffer(b); }
  }
}
{
  const _fb = factoryBoxes; factoryBoxes = function (t) {
    if (S.where === 'main') for (const b of S.buildings) if (b.type === 'belt' && b.item) { const d = DIRS[b.rot || 0], k = b.item.p - 0.5, c = RES[b.item.res].col; addModel([[0, 0, 0, 12, 12, 10, c], [0, 0, 10, 8, 8, 2, hexShade(c, 1.3)]], b.x + d[0] * k * TILE, b.y + d[1] * k * TILE, 6, t, 1); }
    _fb(t);
    const ws = S.weaponShow; if (ws && S.phase === 'play') { const all = []; weaponParts(ws.g, { attach: {}, camo: 'std', t }, all); const k = Math.min(1, (2.4 - ws.t) * 3); addModel(all, S.p.x, S.p.y, 46 + 40 * k + Math.sin(t * 3) * 4 + groundZ(S.p.x, S.p.y), t * 2.6, 1.6 + k * 0.8, Math.min(1, ws.t * 2), 6000); }
  };
  const _fu = factoryUnderlay; factoryUnderlay = function (t) {
    if (S.where === 'main' && S.build.on) for (const b of S.buildings) if (BUILD[b.type].rot) { const d = DIRS[b.rot || 0], a = P(b.x, b.y, 8), c = P(b.x + d[0] * TILE * 0.7, b.y + d[1] * TILE * 0.7, 8); G.strokeStyle = '#ffd84a'; G.lineWidth = 3; G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(c.x, c.y); G.stroke(); }
    _fu(t);
    const gh = S.ghost; if (S.build.on && gh && gh.ok && gh.merge) { const q = P(gh.cx, gh.cy, 0), r = (gh.w + gh.h) * TILE * 0.42 + Math.sin(t * 8) * 4; G.strokeStyle = 'rgba(255,216,74,0.95)'; G.lineWidth = 3; G.setLineDash([6, 5]); G.beginPath(); G.ellipse(q.x, q.y, r * IX * 1.414 * VIEW.zoom, r * IY * 1.414 * VIEW.zoom, 0, 0, 6.283); G.stroke(); G.setLineDash([]); G.font = '900 13px "Trebuchet MS", Arial'; G.textAlign = 'center'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.75)'; const txt = '⚡ VERSCHMILZT (' + gh.merge + ')'; G.strokeText(txt, q.x, q.y - 70 * VIEW.zoom); G.fillStyle = '#ffd84a'; G.fillText(txt, q.x, q.y - 70 * VIEW.zoom); }
    G.lineWidth = 1;
  };
  const _flab = factoryLabels; factoryLabels = function (t) {
    _flab(t); G.textAlign = 'center'; G.font = '900 11px "Trebuchet MS", Arial';
    for (const b of S.buildings) { if (!onScreen(b.x, b.y)) continue; let txt = '', col = '#ffd84a';
      if (b.type === 'sawmill') { txt = (b.trees || 0) >= 2 ? '🪚 ' + b.trees + ' Bäume · ' + Math.round((b.prog || 0) / 4 * 100) + '%' : '🪚 KEINE BÄUME'; col = (b.trees || 0) >= 2 ? '#d9a86a' : '#ff5e3a'; }
      else if (b.type === 'ammofab') txt = '🏭 ' + (b.inp || 0) + ' Schrott → ' + (b.buf ? b.buf.length : 0) + '×10 Muni';
      else if (b.type === 'export') txt = '💰 ' + (b.count || 0) + ' verkauft';
      else if (S.where === 'main' && b.type === 'drill') txt = '⛏ ' + RES[b.dres || 'stone'].s + ' ' + Math.round((b.prog || 0) / 6 * 100) + '%';
      else if (S.where === 'main' && BUILD[b.type].gen) { txt = '⚡ +' + (b.out || 0).toFixed(1); col = '#5fff8a'; }
      else if (S.where === 'main' && b.type === 'container') txt = '📦 ' + (b.count || 0);
      if (!txt) continue; const q = P(b.x, b.y, 70 + b.h * 14), w = G.measureText(txt).width + 12; G.fillStyle = 'rgba(4,10,16,0.75)'; G.fillRect(q.x - w / 2, q.y - 12, w, 16); G.fillStyle = col; G.fillText(txt, q.x, q.y); }
  };
}

// ---------- Tick ----------
let _stepT = 0;
function v11Tick(dt) {
  if (!S || !S.p) return; const p = S.p;
  if (S.phase === 'play') { S.hbT = (S.hbT || 0) - dt; if (S.hbT <= 0) { S.hbT = 0.3; if (hotbarSig() !== S.hbSig) refreshHotbar(); } }
  if (S.weaponShow) { S.weaponShow.t -= dt; if (S.weaponShow.t <= 0) S.weaponShow = null; }
  for (const b of S.buildings) {
    if (b.drop > 0) { const fast = b.type === 'wall' || b.type === 'gate' || b.type === 'pcable' || b.type === 'belt'; b.drop = Math.max(0, b.drop - dt * (fast ? 4.5 : 2.4)); if (b.drop === 0) { burst(b.x, b.y, 4, '#b8a27a', fast ? 6 : 18, fast ? 90 : 170); if (!fast) { shake(4); SFX.noise(0.14, 0.28, 420); S.rings.push({ x: b.x, y: b.y, r: 6, max: 50 + b.w * 26, col: '230,210,160', life: 0.45 }); } b.pop = Math.max(b.pop || 0, 0.6); } }
    if (b.evo > 0) { b.evo = Math.max(0, b.evo - dt); if (Math.random() < dt * 24) burst(b.x + R(-20, 20), b.y + R(-20, 20), R(10, 60), Math.random() < 0.5 ? '#ffd84a' : '#ffffff', 2, 80, { up: 1.2 }); if (b.evo === 0) { burst(b.x, b.y, 30, '#7dff5a', 24, 200, { up: 1.6 }); SFX.play('pickup'); } }
  }
  for (const bl of S.bullets) if (bl.gz === undefined) bl.gz = groundZ(bl.px, bl.py);
  const a = S.stairAnim;
  if (a) { a.t += dt; const k = Math.min(1, a.t / a.dur); p.x = lerp(a.x0, a.x1, k); p.y = lerp(a.y0, a.y1, k); p.a = Math.atan2(a.y1 - a.y0, a.x1 - a.x0); p.walk += dt * 10; p.moving = 1; _stepT -= dt; if (_stepT <= 0) { _stepT = 0.17; SFX.tone(120 + Math.random() * 30, 0.05, 'triangle', 0.06, 0.7); } if (k >= 1) { const fn = a.done; S.stairAnim = null; p.moving = 0; if (fn) fn(); } }
  else if (S.phase === 'play' && !UI.overlay) {
    if (S.where === 'city' && S.W.stairsDown && tileType(S.W, p.x, p.y) === 20) S.stairAnim = { t: 0, dur: 1.0, x0: p.x, y0: p.y, x1: 22 * TILE, y1: 4.2 * TILE, done: () => changeLevel('under') };
    else if (S.where === 'under' && S.W.stairsUp && Math.abs(p.x - S.W.stairsUp.x) < 56 && p.y < S.W.stairsUp.y) S.stairAnim = { t: 0, dur: 1.25, x0: p.x, y0: p.y, x1: S.W.stairsUp.x, y1: 1.2 * TILE, done: () => changeLevel('city') };
  }
  p.az = S.where === 'under' ? underStairZ(p.x, p.y) : 0;
}
addEventListener('keydown', e => { if (e.code === 'Tab' && S && S.phase === 'play' && S.build.on && !UI.overlay) { e.preventDefault(); setBuildCat((S.buildCat || 0) + (e.shiftKey ? -1 : 1)); } });
;

// ----------------------------- v12.js -----------------------------

// =====================================================================================
// VERDANT SIEGE V12  (wird NACH v11.js geladen – ändert keine anderen Dateien)
//  · Neu-Eden deaktiviert (Code bleibt erhalten) → an ihrer Stelle wächst „Der Alte Wald“
//  · WERKSTATT (5 Stufen): Fahrzeuge reparieren → Waffenbank → Kranhalle → Werft → eigenes Raumschiff
//  · Crew: Überlebende tauchen selten auf, sobald du ein Raumschiff hast (max. 5, Nachschub nur bei Verlust)
//  · Schluchten: unter Brücken hindurchlaufen, ohne auf die Brücke zu „buggen“
//  · Skillbaum (K) mit Skillpunkten pro Level + alle 3 Level eine Talentwahl (1 aus 3)
// =====================================================================================
const CITY_ENABLED = false;      // ← auf true setzen, um Neu-Eden wieder zu aktivieren
const CREW_MAX = 5;

// ------------------------------------------------------------------
// 1) STADT DEAKTIVIEREN → WALD
// ------------------------------------------------------------------
function v12Forestify(W) {
  if (typeof EDEN_RECT === 'undefined') return;
  const N = W.size, T = TILE, inE = (gx, gy) => inRect(gx, gy, EDEN_RECT, 1);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
    if (!inE(gx, gy)) continue; const i = gy * N + gx;
    x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy);
    const t = W.tiles[i]; if (t !== 9 && t !== 11 && t !== 1) W.tiles[i] = 19;
    if (W.roadMark) W.roadMark[i] = 0; if (W.mask) W.mask[i] = 0;
  }
  if (x1 < 0) return;
  const gone = o => o && inE(Math.floor(o.x / T), Math.floor(o.y / T));
  for (const p of W.props) if (gone(p)) { p.solid = false; p.hw = 0; p.hd = 0; p.removed = true; }
  W.props = W.props.filter(p => !p.removed);
  for (const co of W.chunkObjs || []) if (co && co.props) co.props = co.props.filter(p => !p.removed);
  W.lightsStatic = W.lightsStatic.filter(L => !gone(L));
  W.npcs = (W.npcs || []).filter(n => !gone(n));
  W.zones = W.zones.filter(z => !((z.n && /EDEN/i.test(z.n)) || (z.id && /eden/i.test(z.id))));
  W.zones.push({ id: 'oldforest', n: 'DER ALTE WALD', sub: 'Wo einst Mauern standen, wächst jetzt uralter Wald.', x0: x0 * T, y0: y0 * T, x1: (x1 + 1) * T, y1: (y1 + 1) * T, col: '#8fe36a' });
  const rng = W.rng || Math.random, kinds = ['oak', 'pine', 'oak', 'birch', 'pine'], want = Math.round((x1 - x0 + 1) * (y1 - y0 + 1) * 0.5);
  for (let k = 0, made = 0; k < want * 4 && made < want; k++) {
    const x = (x0 + rng() * (x1 - x0 + 1)) * T, y = (y0 + rng() * (y1 - y0 + 1)) * T, gx = Math.floor(x / T), gy = Math.floor(y / T);
    if (!inE(gx, gy) || W.tiles[gy * N + gx] !== 19 || !freeAt(W, x, y, 16)) continue;
    try { addTree(W, x, y, kinds[Math.floor(rng() * kinds.length)], {}); made++; } catch (e) { break; }
  }
  W.edenRemoved = true;
}
// Brücken über Schluchten erkennen (Straßenfelder mit Abgrund auf zwei gegenüberliegenden Seiten)
function v12Bridges(W) {
  if (!W.depth) return; const N = W.size, pit = (x, y) => x >= 0 && y >= 0 && x < N && y < N && W.tiles[y * N + x] === 11;
  W.bridge = new Set();
  for (let gy = 1; gy < N - 1; gy++) for (let gx = 1; gx < N - 1; gx++) { const i = gy * N + gx; if (W.tiles[i] !== 3) continue; if ((pit(gx, gy - 1) && pit(gx, gy + 1)) || (pit(gx - 1, gy) && pit(gx + 1, gy))) W.bridge.add(i); }
}
{
  const _mmw = makeMainWorld;
  makeMainWorld = function (seed) { const W = _mmw(seed); try { if (!CITY_ENABLED) v12Forestify(W); v12Bridges(W); } catch (e) { console.warn('V12 Welt', e); } return W; };
}
if (!CITY_ENABLED) {
  const _ec = enterCity; enterCity = function () { UI.toast('Hier ist nur noch Wald.'); };
  revealEdenHint = function () { };
  const _fi0 = findInteract; findInteract = function () { const it = _fi0(); return it && (it.kind === 'eden') ? null : it; };
  const _dc = dailyCity; dailyCity = function () { const c = S.crew; S.crew = []; try { _dc(); } finally { S.crew = c; } };
  for (let i = TIPS.length - 1; i >= 0; i--) if (/Neu-Eden|Himmelsloft|Behörde|Kaliber|Gassen|Stadt/i.test(TIPS[i])) TIPS.splice(i, 1);
}

// ------------------------------------------------------------------
// 2) UNTER BRÜCKEN HINDURCH
// ------------------------------------------------------------------
const V12_UNDER = new Set(); let V12_UL = [], V12_CUR_UNDER = false;
const v12Key = (x, y) => x + '|' + y;
{
  const _gz = groundZ;
  groundZ = function (x, y) {
    const W = S && S.W; if (!W || !W.bridge || !W.bridge.size) return _gz(x, y);
    const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE), i = gy * W.size + gx;
    if (W.bridge.has(i)) return V12_UNDER.has(v12Key(x, y)) ? -RAVINE_D : 0;
    return _gz(x, y);
  };
  const _bf = blockedFor;
  blockedFor = function (x, y, who) {
    const W = S.W;
    if (W.bridge && W.bridge.size && MOVE_FROM_Z !== null) {
      const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE), i = gy * W.size + gx;
      if (W.bridge.has(i)) { if (MOVE_FROM_Z < -42) return null; const z = MOVE_FROM_Z; MOVE_FROM_Z = null; try { return _bf(x, y, who); } finally { MOVE_FROM_Z = z; } }
    }
    return _bf(x, y, who);
  };
  const _sh = staticHit;
  staticHit = function (x, y, r) { const h = _sh(x, y, r); if (h && V12_CUR_UNDER && h.btype === 'prop' && /bridge/.test(h.kind || '')) return null; return h; };
  const _me = moveEnt;
  moveEnt = function (e, dx, dy, r, who) {
    const W = S.W; if (!W.bridge || !W.bridge.size || !W.depth) return _me(e, dx, dy, r, who);
    const N = W.size, ti = (o) => Math.floor(o.y / TILE) * N + Math.floor(o.x / TILE);
    const i0 = ti(e), was = !!e.under, prevZ = W.bridge.has(i0) ? (was ? -RAVINE_D : 0) : W.depth[i0];
    if (was) V12_UNDER.add(v12Key(e.x, e.y));
    V12_CUR_UNDER = was || prevZ < -42;
    let res; try { res = _me(e, dx, dy, r, who); } finally { V12_CUR_UNDER = false; V12_UNDER.delete(v12Key(e.x, e.y)); }
    const i1 = ti(e);
    e.under = W.bridge.has(i1) ? (W.bridge.has(i0) ? was : prevZ < -42) : W.depth[i1] < -42;
    if (e.under && W.bridge.has(i1)) V12_UNDER.add(v12Key(e.x, e.y));
    return res;
  };
}
function v12RebuildUnder() {
  V12_UNDER.clear(); V12_UL = []; const W = S.W; if (!W || !W.bridge || !W.bridge.size) { if (S.p) S.p.under = false; return; }
  const add = o => { if (o && o.under) { V12_UNDER.add(v12Key(o.x, o.y)); V12_UL.push([o.x, o.y]); } };
  add(S.p); for (const z of S.zombies) add(z); add(S.follower);
}
function v12DrawDecks() {
  const W = S.W; if (!W || !W.bridge || !V12_UL.length) return;
  const T = TILE, N = W.size, set = new Set();
  for (const [x, y] of V12_UL) { const gx = Math.floor(x / T), gy = Math.floor(y / T); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = (gy + j) * N + gx + i; if (W.bridge.has(k)) set.add(k); } }
  for (const k of set) {
    const gx = k % N, gy = (k / N) | 0, horiz = W.tiles[k - N] === 11, c = [P(gx * T, gy * T, 0), P((gx + 1) * T, gy * T, 0), P((gx + 1) * T, (gy + 1) * T, 0), P(gx * T, (gy + 1) * T, 0)];
    G.globalAlpha = 0.8; G.fillStyle = '#7a5a3a'; G.beginPath(); G.moveTo(c[0].x, c[0].y); for (let i = 1; i < 4; i++) G.lineTo(c[i].x, c[i].y); G.closePath(); G.fill();
    G.strokeStyle = 'rgba(40,26,14,0.8)'; G.lineWidth = 1.5;
    for (let s = 1; s < 5; s++) { const f = s / 5, a = horiz ? P((gx + f) * T, gy * T, 0) : P(gx * T, (gy + f) * T, 0), b = horiz ? P((gx + f) * T, (gy + 1) * T, 0) : P((gx + 1) * T, (gy + f) * T, 0); G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(b.x, b.y); G.stroke(); }
    G.globalAlpha = 1; G.strokeStyle = '#3a2614'; G.lineWidth = 3;
    const r1 = horiz ? [c[0], c[1]] : [c[0], c[3]], r2 = horiz ? [c[3], c[2]] : [c[1], c[2]];
    for (const [a, b] of [r1, r2]) { G.beginPath(); G.moveTo(a.x, a.y - 10 * VIEW.zoom); G.lineTo(b.x, b.y - 10 * VIEW.zoom); G.stroke(); }
  }
  G.lineWidth = 1;
}

// ------------------------------------------------------------------
// 3) WERKSTATT (5 Stufen bis zum Raumschiff)
// ------------------------------------------------------------------
Object.assign(BUILD.workbench, { n: 'Werkstatt', icon: '🔧', w: 3, h: 3, cost: { wood: 40, stone: 25, scrap: 15 }, hp: 480, light: 120, desc: 'E: Fahrzeuge reparieren, Munition & Waffen bauen. Ausbauen bis Stufe 5 = eigenes RAUMSCHIFF!' });
const WS_COST = { 1: { wood: 40, stone: 30, scrap: 25 }, 2: { scrap: 55, stone: 40, elec: 3 }, 3: { scrap: 90, elec: 8, mil: 6, fuel: 40 }, 4: { scrap: 160, elec: 16, mil: 14, cells: 6, crystal: 4 } };
const WS_STEPS = [
  { l: 1, n: 'Werkbank', icon: '🛠', d: 'Autos reparieren · Munition & Medikits' },
  { l: 2, n: 'Waffenbank', icon: '🔫', d: 'Schrotflinte & Sturmgewehr bauen · Heli-Reparatur' },
  { l: 3, n: 'Kranhalle', icon: '🏗', d: 'Scharfschützengewehr · Wracks abschleppen · Schiffsreparatur' },
  { l: 4, n: 'Raumschiff-Werft', icon: '🛰', d: 'Der Rumpf wird montiert · Maschinengewehr' },
  { l: 5, n: 'Startrampe', icon: '🚀', d: 'DEIN EIGENES RAUMSCHIFF · Plasmagewehr' },
];
const GUN_CRAFT = { shotgun: { lvl: 2, cost: { scrap: 45, wood: 30, stone: 10 } }, rifle: { lvl: 2, cost: { scrap: 70, mil: 4 } }, sniper: { lvl: 3, cost: { mil: 14, elec: 6, scrap: 40 } }, lmg: { lvl: 4, cost: { mil: 22, cells: 2, scrap: 60 } }, plasma: { lvl: 5, cost: { plasma: 6, xeno: 6, titan: 10 } } };
{
  const _ml = maxLevel; maxLevel = function (type) { return type === 'workbench' ? 5 : _ml(type); };
  const _uc = upgradeCost; upgradeCost = function (type, lvl) { if (type === 'workbench') return Object.assign({}, WS_COST[lvl] || {}); return _uc(type, lvl); };
}
function workshop() { return S.buildings.find(b => b.type === 'workbench'); }
function bestWorkshop() { let best = null; for (const b of S.buildings) if (b.type === 'workbench' && (!best || b.level > best.level)) best = b; return best; }
function mechF() { return 1 - 0.25 * perk('mech'); }
function scaleCost(c, f) { const o = {}; for (const k in c) o[k] = Math.max(1, Math.ceil(c[k] * f)); return o; }

// --- 3D-Modell der Werkstatt ---
workbenchParts = function (b, t) {
  const out = [], push = (...a) => out.push(a), L = b.level, Wd = b.w * TILE, Hd = b.h * TILE, hw = Wd / 2, hd = Hd / 2;
  const steel = L >= 3, hallH = L >= 3 ? 72 : L >= 2 ? 58 : 48, post = steel ? '#4f585e' : L >= 2 ? '#6d7276' : '#6b4a2b', roof = steel ? '#3e4e5a' : L >= 2 ? '#5d666d' : '#8a5a3a';
  push(0, 0, 0, Wd - 4, Hd - 4, 4, steel ? '#5d6266' : '#7d7f7c');
  for (let i = -2; i <= 2; i++) push(i * 22, hd - 12, 4, 10, 2, 0.6, '#e1b12c');
  // Halle (Nordwest)
  const hx = -hw / 2 + 4, hy = -hd / 2 + 4, hW = Wd * 0.58, hD = Hd * 0.58;
  for (const [x, y] of [[hx - hW / 2 + 3, hy - hD / 2 + 3], [hx + hW / 2 - 3, hy - hD / 2 + 3], [hx - hW / 2 + 3, hy + hD / 2 - 3], [hx + hW / 2 - 3, hy + hD / 2 - 3]]) push(x, y, 4, 5, 5, hallH, post);
  push(hx, hy, 4 + hallH, hW + 12, hD + 12, 4, roof);
  for (let k = -3; k <= 3; k++) push(hx + k * hW / 7, hy, 8 + hallH, 2, hD + 12, 1.5, hexShade(roof, 0.75));
  if (L >= 2) {
    push(hx - hW / 2, hy, 4, 3, hD, hallH, steel ? '#6a7680' : '#9a8f84'); push(hx, hy - hD / 2, 4, hW, 3, hallH, steel ? '#76828c' : '#a89c90');
    push(hx, hy + hD / 2, hallH - 18, hW - 10, 2, 18, '#b0b6ba'); for (let z = hallH - 16; z < hallH; z += 4) push(hx, hy + hD / 2 + 1.2, z, hW - 12, 0.4, 0.8, '#7a8288');
    push(hx, hy + hD / 2 + 2, hallH + 6, 62, 3, 14, '#14161c'); push(hx, hy + hD / 2 + 3.6, hallH + 9, 54, 0.4, 8, L >= 4 ? '#3ff4ff' : '#ffb020');
  }
  // Hebebühne mit Auto
  const lift = 12 + Math.max(0, Math.sin(t * 0.7)) * 10;
  push(hx - 14, hy - 4, 4, 4, 4, 30, '#e1b12c'); push(hx + 14, hy - 4, 4, 4, 4, 30, '#e1b12c');
  push(hx, hy - 4, lift, 34, 22, 2, '#3a3f44'); push(hx, hy - 4, lift + 2, 30, 18, 8, '#c0392b'); push(hx - 2, hy - 4, lift + 10, 16, 15, 6, '#8fc8e8'); for (const [x, y] of [[-10, -9], [10, -9], [-10, 9], [10, 9]]) push(hx + x, hy - 4 + y, lift + 1, 6, 3, 6, '#1a1a1a');
  // Werkbank, Werkzeugwand, Reifen, Fässer
  push(hx - hW / 2 + 12, hy + 14, 4, 12, 30, 14, '#8b5e34'); push(hx - hW / 2 + 12, hy + 14, 18, 14, 32, 2, '#6b4423'); push(hx - hW / 2 + 13, hy + 6, 20, 6, 6, 5, '#5d666d');
  push(hx - hW / 2 + 2, hy, 20, 1, 30, 22, '#5b3a22'); for (let i = 0; i < 5; i++) push(hx - hW / 2 + 3, hy - 12 + i * 6, 26 + (i % 2) * 6, 1, 2, 9, i % 2 ? '#9aa6aa' : '#c0392b');
  for (let i = 0; i < 4; i++) push(hw - 14, -hd + 14, 4 + i * 5, 14, 14, 4.5, '#1c1c1c');
  push(hw - 14, -hd + 34, 4, 10, 10, 16, '#c0392b'); push(hw - 26, -hd + 34, 4, 10, 10, 16, '#2e5e8a');
  if (Math.floor(t * 9) % 3 === 0) { push(hx + 10, hy - 4, lift + 4, 2, 2, 2, '#fff6a0'); push(hx + 12, hy - 2, lift + 6, 1.5, 1.5, 1.5, '#ffd84a'); }
  if (L >= 2) { push(hx + hW / 2 - 10, hy + 16, 4, 12, 10, 12, '#3a3f44'); push(hx + hW / 2 - 10, hy + 16, 16, 14, 12, 2, '#d4a017'); }
  // Kranhalle
  if (L >= 3) {
    const cx = hw * 0.38, cy = hd * 0.2;
    for (const y of [-hd + 8, hd - 8]) { push(cx - 30, y, 4, 5, 5, 92, '#e1b12c'); push(cx + 30, y, 4, 5, 5, 92, '#e1b12c'); push(cx, y, 92, 66, 5, 5, '#e1b12c'); }
    const ty = Math.sin(t * 0.5) * (hd - 20); push(cx - 30, 0, 96, 5, Hd - 16, 5, '#c79a14'); push(cx + 30, 0, 96, 5, Hd - 16, 5, '#c79a14'); push(cx, ty, 98, 64, 10, 6, '#3a3f44'); push(cx, ty, 50, 1, 1, 48, '#1a1a1a'); push(cx, ty, 46, 8, 8, 5, '#e1b12c');
    for (const [x, y] of [[hw - 6, hd - 6], [-hw + 6, hd - 6]]) { push(x, y, 4, 3, 3, 60, '#3a3f44'); push(x, y, 62, 10, 6, 6, '#fffbd0'); }
  }
  // Werft: Startrampe + Rumpf in Montage
  if (L >= 4) {
    const px = hw * 0.36, py = hd * 0.22, R0 = 40;
    for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, glow = L >= 5 ? (Math.floor(t * 4 + i) % 4 === 0 ? '#ffffff' : '#3ff4ff') : '#e1b12c'; push(px + Math.cos(a) * R0, py + Math.sin(a) * R0, 4, 7, 3, 1.5, glow, a + Math.PI / 2); }
    push(px, py, 4, 50, 50, 1, L >= 5 ? '#24303a' : '#3a3f44'); push(px, py, 5, 30, 4, 0.5, '#ffffff'); push(px, py, 5, 4, 30, 0.5, '#ffffff');
    for (const s of [-1, 1]) { push(px + s * 46, py, 4, 6, 6, 70, '#5d666d'); for (let z = 14; z < 70; z += 14) push(px + s * 43, py, z, 2, 10, 2, '#e1b12c'); push(px + s * 34, py, 66, 24, 4, 3, '#5d666d'); }
    if (L === 4 && (!S || !S.ship)) {
      let sp = []; try { sp = shipParts({ up: {}, paint: 'white', hp: 100 }, t, { flying: false }); } catch (e) { sp = []; }
      const n = Math.floor(sp.length * (0.45 + 0.1 * Math.sin(t * 0.6)));
      for (let i = 0; i < n; i++) { const q = sp[i].slice(); q[0] += px; q[1] += py; q[2] += 10; if (i % 3 === 0) q[6] = '#8a9aa6'; out.push(q); }
      for (let k = 0; k < 9; k++) { const a = k * 0.7; push(px + Math.cos(a) * 18, py + Math.sin(a) * 10, 14 + (k % 3) * 6, 2, 22, 2, '#5d666d', a); }
      if (Math.floor(t * 10) % 2) { push(px + Math.sin(t * 3) * 14, py + 8, 24, 2, 2, 2, '#ffffff'); push(px - 10, py - 6, 30, 1.5, 1.5, 1.5, '#5ff4ff'); }
    }
    if (L >= 5) { push(-hw + 12, hd - 6, 4, 4, 4, 54, '#2a2f3a'); push(-hw + 12, hd - 6, 58, 44, 3, 14, '#0a0c12'); push(-hw + 12, hd - 4.4, 61, 38, 0.4, 8, Math.floor(t * 2) % 2 ? '#3ff4ff' : '#5fff8a'); }
  }
  return out;
};

// --- Ausbau-Logik, Raumschiff-Endmontage ---
{
  const _ub = upgradeBuilding;
  upgradeBuilding = function (b) {
    const l0 = b.level; _ub(b); if (b.type !== 'workbench' || b.level <= l0) return;
    const st = WS_STEPS[b.level - 1];
    setTimeout(() => { if (!S) return; announce(st.icon + ' WERKSTATT STUFE ' + b.level + ': ' + st.n.toUpperCase(), st.d, b.level >= 4 ? '#5ff4ff' : '#ffd84a'); SFX.play('streak'); }, 450);
    if (b.level === 5) v12BuildShip(b);
  };
  const _pb = placeBuilding;
  placeBuilding = function (info, silentLoad, data) {
    const b = _pb(info, silentLoad, data);
    if (b && !silentLoad && !info.mount) {
      if (S.talents && S.talents.bulwark) { b.max = Math.round(b.max * 1.3); b.hp = b.max; }
      if (b.type === 'workbench') setTimeout(() => S && announce('🔧 WERKSTATT ERRICHTET', 'E: Reparieren & Bauen · Ausbau bis Stufe 5 = eigenes Raumschiff', '#ffd84a'), 500);
    }
    return b;
  };
}
function v12ShipPadFor(b) { return { x: b.x + b.w * TILE * 0.18, y: b.y + b.h * TILE * 0.11 }; }
function v12BuildShip(b) {
  if (S.ship) { setTimeout(() => S && announce('🛰 WERFT BEREIT', 'Dein Raumschiff wird ab jetzt hier gewartet', '#5ff4ff'), 1800); return; }
  const pad = v12ShipPadFor(b);
  setTimeout(() => { if (!S) return; announce('⚙ ENDMONTAGE …', 'Triebwerke · Cockpit · Schilde', '#5ff4ff'); for (let i = 0; i < 6; i++) setTimeout(() => { if (!S) return; burst(pad.x + R(-30, 30), pad.y + R(-30, 30), R(10, 40), i % 2 ? '#ffffff' : '#5ff4ff', 20, 200, { up: 1.5 }); SFX.tone(500 + i * 120, 0.08, 'square', 0.06); shake(3); }, i * 260); }, 1400);
  setTimeout(() => {
    if (!S) return;
    if (S.where === 'main') S.mainW.shipPad = pad;
    S.ship = newShip(); Object.assign(S.ship, { world: S.where === 'planet' ? 'planet' : 'main', x: pad.x, y: pad.y, z: 0, state: 'parked', vx: 0, vy: 0 });
    S.flash = 0.9; S.flashCol = '120,240,255'; shake(18); SFX.play('jackpot');
    for (let i = 0; i < 5; i++) S.rings.push({ x: pad.x, y: pad.y, r: 8 + i * 22, max: 420, col: i % 2 ? '95,244,255' : '255,216,74', life: 1 + i * 0.2 });
    burst(pad.x, pad.y, 20, '#5ff4ff', 60, 320, { up: 2 }); burst(pad.x, pad.y, 30, '#ffd84a', 40, 260, { up: 2 });
    S.particles.push({ x: pad.x, y: pad.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.9, max: 0.9, col: '#fff', s: 1, beam: true, grav: 0, light: 340 });
    announce('🚀 DEIN RAUMSCHIFF IST FERTIG!', 'E = Einsteigen · LEERTASTE steigen · Über Höhe 520 = Orbit', '#5ff4ff'); addXp(500, pad.x, pad.y);
    S.survT = 150; setTimeout(() => S && UI.toast('📡 Für Raumstation & Sprünge brauchst du eine Crew. Halte Ausschau nach Überlebenden!'), 5000);
  }, 3200);
}

// --- Interaktion & Menü der Werkstatt ---
{
  const _fi = findInteract;
  findInteract = function () {
    const p = S.p;
    if (!p.inCar && !p.inHeli && !p.inShip && (S.where === 'main' || S.where === 'planet')) {
      const sv = S.survivor; if (sv && S.where === 'main' && Math.hypot(sv.npc.x - p.x, sv.npc.y - p.y) < 60) return { kind: 'survivor', obj: sv.npc, text: 'E halten · ' + sv.name + ' anheuern (' + CREW_ROLES[sv.role].n + ')', hold: 1.2, can: true };
      for (const b of S.buildings) if (b.type === 'workbench' && Math.hypot(b.x - p.x, b.y - p.y) < b.w * TILE / 2 + 44) return { kind: 'craft', b, text: 'E · WERKSTATT St.' + b.level + ' – ' + WS_STEPS[b.level - 1].n };
    }
    return _fi();
  };
}
function v12Vehicles(b) {
  const out = [], W = S.W, r = 460;
  (W.cars || []).forEach((c, i) => { if (Math.hypot(c.x - b.x, c.y - b.y) < r) out.push({ kind: 'car', o: c, n: (c.n || c.name || 'Fahrzeug') + ' #' + (i + 1) }); });
  if (W.heli && Math.hypot(W.heli.x - b.x, W.heli.y - b.y) < r) out.push({ kind: 'heli', o: W.heli, n: 'Helikopter' });
  if (S.ship && S.ship.world === S.where && Math.hypot(S.ship.x - b.x, S.ship.y - b.y) < r + 100) out.push({ kind: 'ship', o: S.ship, n: 'Raumschiff' });
  return out;
}
function v12RepairCost(v) {
  const o = v.o, f = mechF();
  if (v.kind === 'car') return o.wreck ? scaleCost({ scrap: 12, wood: 6 }, f) : o.hp < o.maxHp ? scaleCost({ scrap: Math.ceil((o.maxHp - o.hp) / 25) }, f) : null;
  if (v.kind === 'heli') return o.wreck ? scaleCost({ scrap: 30, elec: 6, fuel: 15 }, f) : o.hp < o.maxHp ? scaleCost({ scrap: Math.ceil((o.maxHp - o.hp) / 20) }, f) : null;
  const mh = typeof shipMaxHp === 'function' ? shipMaxHp(o) : 200; return o.hp < mh ? scaleCost({ scrap: Math.ceil((mh - o.hp) / 12), elec: 2 }, f) : null;
}
function v12DoRepair(v) {
  const c = v12RepairCost(v); if (!c || !canAfford(c)) return false; pay(c); const o = v.o;
  if (v.kind === 'ship') o.hp = typeof shipMaxHp === 'function' ? shipMaxHp(o) : o.hp; else { o.wreck = false; o.hp = o.maxHp; o.fuel = Math.max(o.fuel || 0, 45); }
  S.stats.repairs++; SFX.play('upgrade'); shake(5); burst(o.x, o.y, 20, '#7ad7ff', 30, 200, { up: 1.4 }); S.rings.push({ x: o.x, y: o.y, r: 8, max: 140, col: '120,220,255', life: 0.7 }); floater(o.x, o.y, '🔧 ' + v.n.toUpperCase() + ' REPARIERT', '#7ad7ff', true); addXp(25, o.x, o.y);
  return true;
}
renderCraft = function () {
  const wb = S.craftB || bestWorkshop(), L = wb ? wb.level : 1, b = $('cityBody'), tab = S.wsTab || 'repair';
  const tabs = [['repair', '🔧 REPARATUR'], ['craft', '▰ HERSTELLEN'], ['guns', '🔫 WAFFENBANK'], ['ship', '🚀 AUSBAU & WERFT']];
  let h = this.header('🔧 WERKSTATT · STUFE ' + L + ' – ' + WS_STEPS[L - 1].n.toUpperCase(), WS_STEPS[L - 1].d);
  h += '<div class="tabs" style="margin:10px 0">' + tabs.map(([k, n]) => `<button class="tab ${k === tab ? 'act' : ''}" data-wstab="${k}">${n}</button>`).join('') + '</div>';
  if (tab === 'repair') {
    const vs = wb ? v12Vehicles(wb) : [];
    h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
    if (!vs.length) h += '<div class="mcard" style="grid-column:1/4"><b>Keine Fahrzeuge in Reichweite</b><p>Fahr ein Auto, den Heli oder dein Raumschiff neben die Werkstatt.</p></div>';
    vs.forEach((v, i) => {
      const o = v.o, c = v12RepairCost(v), lock = (v.kind === 'heli' && L < 2) || (v.kind === 'ship' && L < 3), mh = v.kind === 'ship' && typeof shipMaxHp === 'function' ? shipMaxHp(o) : o.maxHp;
      h += `<div class="mcard ${c ? '' : 'act'}"><b>${v.kind === 'car' ? '🚗' : v.kind === 'heli' ? '🚁' : '🚀'} ${v.n}</b><p>${o.wreck ? '💥 WRACK' : '🛡 ' + Math.round(o.hp) + '/' + Math.round(mh || 0)}${o.fuel !== undefined && v.kind !== 'ship' ? ' · ⛽ ' + Math.round(o.fuel) + '%' : ''}</p>`;
      h += lock ? `<small>🔒 Ab Werkstatt-Stufe ${v.kind === 'heli' ? 2 : 3}</small>` : c ? `<button class="btn ${canAfford(c) ? 'gold' : ''}" data-rep="${i}" ${canAfford(c) ? '' : 'disabled'}>${o.wreck ? 'INSTANDSETZEN' : 'REPARIEREN'} · ${costStr(c)}</button>` : '<small style="color:#7dff5a">✔ Top in Schuss</small>';
      if (v.kind !== 'ship' && !o.wreck && o.fuel < 100 && S.res.fuel > 0) h += ` <button class="btn sm" data-fuel="${i}">⛽ TANKEN</button>`;
      h += '</div>';
    });
    h += '</div>';
    if (L >= 3) { const far = (S.W.cars || []).filter(c => c.wreck && Math.hypot(c.x - wb.x, c.y - wb.y) >= 460); h += `<div class="mcard" style="margin-top:10px"><b>🪝 Abschleppdienst</b><p>Holt das nächste Wrack der Karte zur Werkstatt. ${far.length} Wrack(s) da draußen.</p><button class="btn ${far.length && S.res.fuel >= 15 ? 'gold' : ''}" data-tow ${far.length && S.res.fuel >= 15 ? '' : 'disabled'}>ABSCHLEPPEN · 15 Sprit</button></div>`; }
    if (perk('mech')) h += `<div class="csub" style="margin-top:6px">🔧 Mechaniker-Skill: −${perk('mech') * 25}% Reparaturkosten</div>`;
  } else if (tab === 'craft') {
    h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
    RECIPES.forEach((r, i) => { const lock = L < r.lvl, ok = !lock && canAfford(r.need); h += `<div class="mcard ${lock ? '' : 'act'}" style="${lock ? 'opacity:.5' : ''}"><b>${r.icon} ${r.n}</b><p>${lock ? '🔒 Ab Stufe ' + r.lvl : 'Kosten: ' + costStr(r.need)}</p><button class="btn ${ok ? 'gold' : ''}" data-craft="${i}" ${ok ? '' : 'disabled'}>${lock ? 'GESPERRT' : 'HERSTELLEN'}</button> <button class="btn sm" data-craft5="${i}" ${!lock && canAfford(scaleCost(r.need, 5)) ? '' : 'disabled'}>×5</button></div>`; });
    h += '</div>';
  } else if (tab === 'guns') {
    h += '<div class="alist" style="grid-template-columns:repeat(3,1fr);max-height:none">';
    for (const g of Object.keys(GUN_CRAFT)) { const o = GUN_CRAFT[g], st = WEAPONS[g], own = S.unlocked[g], lock = L < o.lvl, ok = !own && !lock && canAfford(o.cost);
      h += `<div class="mcard ${own ? 'act' : ''}" style="${lock ? 'opacity:.55' : ''}"><b>${st.icon} ${st.n}</b><p>Schaden ${st.dmg}${st.pellets > 1 ? '×' + st.pellets : ''} · Magazin ${st.mag}</p><small>${lock ? '🔒 Ab Werkstatt-Stufe ' + o.lvl : 'Bauteile: ' + costStr(o.cost)}</small><br><br><button class="btn ${ok ? 'gold' : ''}" data-gun="${g}" ${ok ? '' : 'disabled'}>${own ? '✔ IM BESITZ' : lock ? 'GESPERRT' : 'BAUEN'}</button></div>`; }
    h += '</div><div class="csub" style="margin-top:8px">💡 Militärteile, Batterien & Kristalle findest du auf Heli-Expeditionen. Plasma-Rohstoffe nur auf fremden Planeten.</div>';
  } else {
    h += '<div class="v12steps">' + WS_STEPS.map(s => `<div class="v12step ${L >= s.l ? 'done' : ''} ${L + 1 === s.l ? 'next' : ''}"><div class="ic">${s.icon}</div><b>${s.l}. ${s.n}</b><small>${s.d}</small></div>`).join('') + '</div>';
    if (L < 5) { const c = upgradeCost('workbench', L), ok = canAfford(c), nx = WS_STEPS[L]; h += `<div class="mcard ${L === 4 ? 'act' : ''}" style="margin-top:12px"><b>NÄCHSTE STUFE: ${nx.icon} ${nx.n.toUpperCase()}</b><p>${nx.d}</p><small>Kosten: ${costStr(c)}</small><br><br><button class="btn ${ok ? 'gold big' : ''}" data-wsup ${ok ? '' : 'disabled'}>${L === 4 ? '🚀 RAUMSCHIFF FERTIGSTELLEN' : '⬆ AUSBAUEN'}</button></div>`; }
    else h += `<div class="mcard act" style="margin-top:12px"><b>🚀 WERFT VOLL AUSGEBAUT</b><p>${S.ship ? 'Rumpf ' + Math.round(S.ship.hp) + ' · Crew ' + S.crew.length + '/' + CREW_MAX + (S.crew.length < 3 ? ' (mind. 3 für Sprünge)' : ' ✔') : 'Raumschiff wird montiert …'}</p>${S.ship ? '<button class="btn gold big" data-hangar>🔧 HANGAR: UPGRADES & LACKIERUNG</button>' : ''}</div>`;
    if (S.crew.length) h += `<div class="mcard" style="margin-top:10px"><b>👥 CREW (${S.crew.length}/${CREW_MAX})</b>${S.crew.map(c => `<div class="hp-row"><span>${CREW_ROLES[c.role].icon} ${c.name} – ${CREW_ROLES[c.role].n}</span><small>${CREW_ROLES[c.role].d}</small></div>`).join('')}</div>`;
  }
  b.innerHTML = h;
  const q = s => b.querySelectorAll(s), again = () => renderCraft.call(CityUI);
  q('[data-wstab]').forEach(e => e.onclick = () => { S.wsTab = e.dataset.wstab; SFX.play('click'); again(); });
  q('[data-rep]').forEach(e => e.onclick = () => { const v = v12Vehicles(wb)[+e.dataset.rep]; if (v && v12DoRepair(v)) again(); });
  q('[data-fuel]').forEach(e => e.onclick = () => { const v = v12Vehicles(wb)[+e.dataset.fuel]; if (!v) return; const take = Math.min(100 - v.o.fuel, S.res.fuel); v.o.fuel += take; S.res.fuel -= take; SFX.play('pickup'); again(); });
  q('[data-tow]').forEach(e => e.onclick = () => { const far = (S.W.cars || []).filter(c => c.wreck && Math.hypot(c.x - wb.x, c.y - wb.y) >= 460).sort((a, c) => Math.hypot(a.x - wb.x, a.y - wb.y) - Math.hypot(c.x - wb.x, c.y - wb.y)); const c = far[0]; if (!c || S.res.fuel < 15) return; S.res.fuel -= 15; c.x = wb.x - wb.w * TILE * 0.9; c.y = wb.y + wb.h * TILE * 0.85; c.v = 0; SFX.play('car'); burst(c.x, c.y, 10, '#b8a27a', 20, 160); UI.toast('🪝 Wrack abgeschleppt – steht jetzt vor der Werkstatt'); again(); });
  const craft = (i, n) => { const r = RECIPES[i]; for (let k = 0; k < n; k++) { if (!canAfford(r.need)) break; pay(r.need); for (const [kk, vv] of Object.entries(r.give)) addRes(kk, vv, S.p.x, S.p.y, true); } SFX.play('upgrade'); if (wb) { burst(wb.x, wb.y, 30, '#ffd84a', 16, 160, { up: 1.5 }); wb.pop = 1; } UI.toast('🛠 Hergestellt: ' + (n > 1 ? n + '× ' : '') + r.n); again(); };
  q('[data-craft]').forEach(e => e.onclick = () => craft(+e.dataset.craft, 1));
  q('[data-craft5]').forEach(e => e.onclick = () => craft(+e.dataset.craft5, 5));
  q('[data-gun]').forEach(e => e.onclick = () => { const g = e.dataset.gun, o = GUN_CRAFT[g]; if (S.unlocked[g] || !canAfford(o.cost)) return; pay(o.cost); UI.closeAll(); giveWeapon(g, S.p.x, S.p.y, true); });
  q('[data-wsup]').forEach(e => e.onclick = () => { if (!wb) return; UI.closeAll(); upgradeBuilding(wb); });
  q('[data-hangar]').forEach(e => e.onclick = () => { UI.hide('citymenu'); ShipUI.open(); });
};
;

// ----------------------------- v12b.js -----------------------------

// VERDANT SIEGE V12 – Teil 2 (Crew, Skillbaum, Tick). Wird nach v12.js geladen.
// ------------------------------------------------------------------
// 4) CREW: Überlebende finden
// ------------------------------------------------------------------
function v12SpawnSurvivor() {
  const W = S.mainW, p = S.p;
  for (let k = 0; k < 60; k++) {
    const a = R(0, 6.28), d = R(900, 1700), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (x < 200 || y < 200 || x > W.size * TILE - 200 || y > W.size * TILE - 200) continue;
    const t = tileType(W, x, y); if (t === 9 || t === 11 || t === 1 || t === 20) continue;
    if (!freeAt(W, x, y, 18) || blockedFor(x, y, 'player') || bldAt(x, y)) continue;
    const used = new Set(S.crew.map(c => c.role)), roles = Object.keys(CREW_ROLES), free = roles.filter(r => !used.has(r)), role = pick(free.length ? free : roles);
    const name = pick(CREW_FIRST) + ' ' + pick(CREW_LAST);
    const npc = addNpc(W, x, y, R(0, 6.28), npcLook('survivor'), 'survivor', '🆘 ' + name);
    const light = { x, y, r: 150, col: '255,90,60', safe: false }; W.lightsStatic.push(light);
    S.survivor = { npc, name, role, skill: RI(1, 3), light, ambush: false, t: 0 };
    const dir = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'][Math.round(((Math.atan2(y - p.y, x - p.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
    announce('📡 NOTSIGNAL EMPFANGEN', 'Ein/e Überlebende/r im ' + dir + ' (~' + Math.round(d / 10) + ' m) · Rote Rauchfackel', '#ff5e3a'); SFX.play('streak');
    return true;
  }
  return false;
}
function v12RemoveSurvivor() { const sv = S.survivor; if (!sv) return; const W = S.mainW; W.npcs = W.npcs.filter(n => n !== sv.npc); W.lightsStatic = W.lightsStatic.filter(L => L !== sv.light); S.survivor = null; }
function v12Recruit() {
  const sv = S.survivor; if (!sv) return; if (S.crew.length >= CREW_MAX) { v12RemoveSurvivor(); return; }
  S.crew.push({ name: sv.name, role: sv.role, skill: sv.skill, price: 0 });
  const x = sv.npc.x, y = sv.npc.y; v12RemoveSurvivor();
  SFX.play('jackpot'); S.flash = 0.5; S.flashCol = '95,212,255'; shake(8);
  for (let i = 0; i < 3; i++) S.rings.push({ x, y, r: 6 + i * 16, max: 200, col: '95,212,255', life: 0.8 + i * 0.15 });
  burst(x, y, 30, '#5fd4ff', 40, 220, { up: 1.6 }); burst(x, y, 30, '#ffd84a', 24, 180, { up: 1.4 });
  announce('🧑‍🚀 NEUE CREW: ' + sv.name.toUpperCase(), CREW_ROLES[sv.role].icon + ' ' + CREW_ROLES[sv.role].n + ' · ' + CREW_ROLES[sv.role].d + ' · Crew ' + S.crew.length + '/' + CREW_MAX, '#5fd4ff');
  addXp(150, x, y);
  if (S.crew.length === 3) setTimeout(() => S && announce('✔ CREW EINSATZBEREIT', 'Mit 3 Leuten sind Sprünge zu fremden Planeten möglich', '#7dff5a'), 2600);
  if (S.crew.length >= CREW_MAX) setTimeout(() => S && UI.toast('👥 Crew komplett (' + CREW_MAX + '/' + CREW_MAX + ') – keine Notsignale mehr, solange alle leben.'), 4200);
  S.survT = (S.talents && S.talents.beacon ? 0.5 : 1) * R(300, 540);
}
function v12CrewLoss(reason) {
  if (!S.crew.length) return; const i = Math.floor(Math.random() * S.crew.length), c = S.crew.splice(i, 1)[0];
  setTimeout(() => S && announce('☠ CREW-VERLUST: ' + c.name.toUpperCase(), (reason || 'Ist bei der Mission gefallen') + ' · Crew ' + S.crew.length + '/' + CREW_MAX, '#ff5e3a'), 1200);
  S.survT = Math.min(S.survT || 300, (S.talents && S.talents.beacon ? 0.5 : 1) * R(200, 360));
}
{
  const _fh = finishHold; finishHold = function (it) { if (it.kind === 'survivor') { v12Recruit(); return; } _fh(it); };
  const _pd = playerDie;
  playerDie = function () {
    if (S.talents && S.talents.second && S.secondDay !== S.day) { S.secondDay = S.day; S.p.hp = Math.round(S.p.maxHp * 0.35); S.p.invuln = 3; S.flash = 0.7; S.flashCol = '255,240,160'; SFX.play('level'); announce('💫 ZWEITE CHANCE', 'Du stehst wieder auf! (1× pro Tag)', '#ffe066'); burst(S.p.x, S.p.y, 20, '#ffe066', 40, 200, { up: 1.6 }); return; }
    if (S.crew.length && (S.where === 'planet' || S.where === 'station' || S.where === 'space') && Math.random() < 0.4) v12CrewLoss('Hat dich nicht mehr rechtzeitig erreicht');
    _pd();
  };
}

// ------------------------------------------------------------------
// 5) SKILLBAUM + TALENTWAHL
// ------------------------------------------------------------------
const SKILL_TREE = [
  { id: 'kampf', n: '⚔ KAMPF', col: '#ff6a4a', nodes: [
    { id: 'dmg', tier: 0, max: 3, n: 'Präzision', icon: '🎯', d: '+20% Waffenschaden' }, { id: 'melee', tier: 0, max: 3, n: 'Berserker', icon: '💢', d: '+60% Axtschaden' },
    { id: 'rate', tier: 1, max: 3, n: 'Abzugsfinger', icon: '⚡', d: '+15% Feuerrate' }, { id: 'reload', tier: 1, max: 2, n: 'Schnellladen', icon: '⟳', d: '−15% Nachladezeit' },
    { id: 'vamp', tier: 2, max: 2, n: 'Lebensraub', icon: '🩸', d: 'Jeder Kill heilt 3 HP' }, { id: 'ammo', tier: 2, max: 2, n: 'Munitionsjäger', icon: '▰', d: 'Monster lassen öfter Munition fallen' } ] },
  { id: 'surv', n: '❤ ÜBERLEBEN', col: '#7dff5a', nodes: [
    { id: 'hp', tier: 0, max: 3, n: 'Zäh wie Wurzeln', icon: '❤', d: '+25 max. Leben' }, { id: 'speed', tier: 0, max: 2, n: 'Sprinter', icon: '👟', d: '+12% Lauftempo' },
    { id: 'hunger', tier: 1, max: 2, n: 'Asket', icon: '🍖', d: 'Hunger sinkt 40% langsamer' }, { id: 'tough', tier: 1, max: 3, n: 'Eiserne Haut', icon: '🛡', d: '−10% erlittener Schaden' },
    { id: 'regen', tier: 2, max: 2, n: 'Regeneration', icon: '✚', d: '+0,8 HP/s, wenn du 5 s nicht getroffen wurdest' }, { id: 'magnet', tier: 2, max: 2, n: 'Sammler', icon: '🧲', d: 'Beute fliegt aus der Nähe zu dir' } ] },
  { id: 'craft', n: '🔧 HANDWERK', col: '#ffd84a', nodes: [
    { id: 'gather', tier: 0, max: 3, n: 'Holzfäller', icon: '🪓', d: '+50% Holz & Stein' }, { id: 'build', tier: 0, max: 2, n: 'Baumeister', icon: '🏗', d: 'Gebäude −20% Kosten' },
    { id: 'turret', tier: 1, max: 3, n: 'Ingenieur', icon: '⊕', d: '+35% Turmschaden' }, { id: 'mech', tier: 1, max: 2, n: 'Mechaniker', icon: '🔧', d: '−25% Reparaturkosten in der Werkstatt' },
    { id: 'pilot', tier: 2, max: 2, n: 'Pilot', icon: '🚀', d: 'Fahrzeuge schneller & sparsamer' }, { id: 'loot', tier: 2, max: 1, n: 'Plünderer', icon: '💰', d: 'Kisten & Hochhäuser doppelt' } ] },
];
const SKILL_BY_ID = {}; for (const br of SKILL_TREE) for (const n of br.nodes) SKILL_BY_ID[n.id] = Object.assign({ br }, n);
const TALENTS = [
  { id: 'second', n: 'Zweite Chance', icon: '💫', d: '1× pro Tag überlebst du einen tödlichen Treffer mit 35% Leben.', unique: true },
  { id: 'lucky', n: 'Glückspilz', icon: '🍀', d: 'Doppelte Chance, Waffen in Kisten zu finden.', unique: true },
  { id: 'nightowl', n: 'Nachteule', icon: '🦉', d: 'Nächte und Schluchten sind für dich deutlich heller.', unique: true },
  { id: 'scav', n: 'Aasgeier', icon: '🦴', d: 'Jeder Kill: 35% Chance auf 2 Schrott.', unique: true },
  { id: 'bulwark', n: 'Bollwerk', icon: '🏰', d: 'Neu gebaute Gebäude haben +30% Leben.', unique: true },
  { id: 'packrat', n: 'Hamsterer', icon: '🎒', d: '+200 Lagerkapazität für Holz, Stein & Schrott.', unique: true },
  { id: 'beacon', n: 'Signalfeuer', icon: '📡', d: 'Überlebende (Crew) melden sich doppelt so oft.', unique: true },
  { id: 'pts2', n: 'Geistesblitz', icon: '✨', d: 'Sofort +2 Skillpunkte.' },
  { id: 'free', n: 'Naturtalent', icon: '🎁', d: '' },
  { id: 'supply', n: 'Nachschub', icon: '📦', d: 'Sofort: 60 Munition, 2 Medikits, 2 Granaten.' },
];
function skillRank(id) { return (S.skills && S.skills[id]) || 0; }
function branchPts(br) { return br.nodes.reduce((a, n) => a + skillRank(n.id), 0); }
function skillReq(n) { return n.tier * 2; }
function canLearn(n) { return (S.skillPts || 0) > 0 && skillRank(n.id) < n.max && branchPts(SKILL_BY_ID[n.id].br) >= skillReq(n); }
function applySkill(id, free) {
  S.skills[id] = (S.skills[id] || 0) + 1; S.perks[id] = (S.perks[id] || 0) + 1; if (!free) S.skillPts--;
  if (id === 'hp') { S.p.maxHp += 25; S.p.hp += 25; }
}
const V12_CSS = `
.v12box{width:min(1100px,96vw);max-height:92vh;overflow:auto}
.v12tree{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:10px}
.v12br{background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.1);border-radius:14px;padding:10px}
.v12br h2{margin:0 0 4px;font:900 18px "Trebuchet MS",Arial;letter-spacing:1px}
.v12br .bp{font-size:11px;opacity:.75;margin-bottom:8px}
.v12tier{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;position:relative}
.v12tier .tl{grid-column:1/3;font:900 10px Arial;opacity:.6;letter-spacing:1px}
.v12node{background:linear-gradient(160deg,rgba(30,48,36,.95),rgba(12,22,16,.95));border:2px solid rgba(255,255,255,.14);border-radius:12px;padding:8px;cursor:pointer;transition:transform .12s,box-shadow .12s;user-select:none;min-height:94px}
.v12node:hover{transform:translateY(-3px)}
.v12node .ic{font-size:24px}
.v12node b{display:block;font-size:13px;margin:2px 0}
.v12node small{display:block;font-size:11px;opacity:.8;line-height:1.25}
.v12node .pips{margin-top:5px;display:flex;gap:4px}
.v12node .pip{width:14px;height:6px;border-radius:3px;background:rgba(255,255,255,.15)}
.v12node .pip.on{background:var(--c);box-shadow:0 0 8px var(--c)}
.v12node.can{border-color:var(--c);box-shadow:0 0 14px color-mix(in srgb,var(--c) 45%,transparent);animation:v12pulse 1.4s infinite}
.v12node.lock{opacity:.38;filter:grayscale(.7);cursor:not-allowed}
.v12node.max{border-color:#7dff5a}
.v12node.pop{animation:v12pop .45s}
@keyframes v12pulse{50%{box-shadow:0 0 22px color-mix(in srgb,var(--c) 70%,transparent)}}
@keyframes v12pop{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}
.v12card{width:220px;padding:18px 14px;border-radius:16px;cursor:pointer;background:linear-gradient(160deg,rgba(40,30,70,.95),rgba(14,12,26,.95));border:3px solid #b58cff;box-shadow:0 0 22px rgba(181,140,255,.45);transition:transform .15s;text-align:center;display:inline-block;margin:10px;vertical-align:top}
.v12card:hover{transform:translateY(-8px) scale(1.04);box-shadow:0 0 36px rgba(255,216,74,.7);border-color:#ffd84a}
.v12card .ic{font-size:44px;margin-bottom:6px}
.v12card b{display:block;font-size:17px;color:#ffe066;margin-bottom:6px}
.v12card p{font-size:13px;color:#e6e0ff;line-height:1.35}
.v12card .tag{font:900 10px Arial;letter-spacing:1px;color:#b58cff;margin-top:8px}
#v12sp{margin-top:6px;font:900 12px "Trebuchet MS",Arial;color:#ffe066;text-shadow:0 0 8px rgba(255,216,74,.6);cursor:pointer;pointer-events:auto}
#v12sp.pulse{animation:v12pulse2 1s infinite}
@keyframes v12pulse2{50%{opacity:.45}}
.v12steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.v12step{background:rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.12);border-radius:12px;padding:8px;text-align:center;opacity:.55}
.v12step .ic{font-size:26px}.v12step b{display:block;font-size:12px}.v12step small{font-size:10px;opacity:.8}
.v12step.done{opacity:1;border-color:#7dff5a;box-shadow:0 0 10px rgba(125,255,90,.35)}
.v12step.next{opacity:1;border-color:#ffd84a;animation:v12pulse2 1.3s infinite}
`;
(() => {
  const st = document.createElement('style'); st.textContent = V12_CSS; document.head.appendChild(st);
  const ov = document.createElement('div'); ov.id = 'v12skills'; ov.className = 'screen dim hidden';
  ov.innerHTML = '<div class="box panel v12box"><div class="row" style="justify-content:space-between;align-items:center"><h1>🌟 SKILLBAUM</h1><div style="display:flex;gap:12px;align-items:center"><span id="v12pts" class="money"></span><button class="btn red" id="v12close">✖ SCHLIESSEN (K)</button></div></div><div class="csub">1 Skillpunkt pro Level · Höhere Reihen brauchen Punkte im selben Zweig · Alle 3 Level: Talentwahl</div><div id="v12tree" class="v12tree"></div></div>';
  document.body.appendChild(ov);
  $('v12close').onclick = () => SkillUI.close();
  const tl = $('tl'); if (tl) { const sp = document.createElement('div'); sp.id = 'v12sp'; sp.onclick = () => SkillUI.open(); tl.appendChild(sp); }
  const pb = $('pause') && $('pause').querySelector('.box'), help = $('pHelp');
  if (pb && help) { const btn = document.createElement('button'); btn.className = 'mbtn'; btn.textContent = '🌟 SKILLBAUM (K)'; btn.onclick = () => { UI.hide('pause'); UI.overlay = null; SkillUI.open(); }; pb.insertBefore(btn, help); }
})();
const SkillUI = {
  open() { if (!S || S.phase !== 'play') return; UI.overlay = 'skills'; UI.show('v12skills'); this.render(); SFX.play('click'); if (document.pointerLockElement) document.exitPointerLock(); },
  close() { UI.hide('v12skills'); if (UI.overlay === 'skills') UI.overlay = null; SFX.play('click'); },
  render(popId) {
    $('v12pts').textContent = '🌟 ' + (S.skillPts || 0) + ' Skillpunkt' + ((S.skillPts || 0) === 1 ? '' : 'e');
    let h = '';
    for (const br of SKILL_TREE) {
      h += `<div class="v12br" style="--c:${br.col}"><h2 style="color:${br.col}">${br.n}</h2><div class="bp">${branchPts(br)} Punkte investiert</div>`;
      for (let tier = 0; tier < 3; tier++) {
        h += `<div class="v12tier"><div class="tl">REIHE ${tier + 1}${tier ? ' · ab ' + tier * 2 + ' Punkten' : ''}</div>`;
        for (const n of br.nodes.filter(x => x.tier === tier)) {
          const r = skillRank(n.id), locked = branchPts(br) < skillReq(n), max = r >= n.max, can = canLearn(n);
          h += `<div class="v12node ${can ? 'can' : ''} ${locked ? 'lock' : ''} ${max ? 'max' : ''} ${popId === n.id ? 'pop' : ''}" style="--c:${br.col}" data-sk="${n.id}"><div class="ic">${n.icon}</div><b>${n.n}</b><small>${n.d}</small><div class="pips">${Array.from({ length: n.max }, (_, i) => `<div class="pip ${i < r ? 'on' : ''}"></div>`).join('')}</div></div>`;
        }
        h += '</div>';
      }
      h += '</div>';
    }
    $('v12tree').innerHTML = h;
    $('v12tree').querySelectorAll('[data-sk]').forEach(e => e.onclick = () => {
      const n = SKILL_BY_ID[e.dataset.sk];
      if (!canLearn(n)) { SFX.play('deny'); return; }
      applySkill(n.id); SFX.play('upgrade'); SFX.tone(660 + skillRank(n.id) * 110, 0.12, 'triangle', 0.1);
      S.flash = 0.15; S.flashCol = hexToRgbStr(n.br.col); floater(S.p.x, S.p.y, n.icon + ' ' + n.n.toUpperCase() + ' ' + skillRank(n.id) + '/' + n.max, n.br.col, true);
      if (skillRank(n.id) === n.max) SFX.play('streak');
      this.render(n.id);
    });
  },
};
{
  const _ca = UI.closeAll; UI.closeAll = function () { _ca.call(this); const e = $('v12skills'); if (e) e.classList.add('hidden'); };
}
function rollTalents() {
  const own = S.talents || {}, pool = TALENTS.filter(t => !(t.unique && own[t.id]));
  const out = []; while (out.length < 3 && pool.length) { const i = Math.floor(Math.random() * pool.length); out.push(Object.assign({}, pool.splice(i, 1)[0])); }
  for (const t of out) if (t.id === 'free') { const cand = Object.values(SKILL_BY_ID).filter(n => skillRank(n.id) < n.max); const n = cand.length ? pick(cand) : null; t.skill = n ? n.id : null; t.d = n ? '+1 Rang „' + n.n + '“ kostenlos (' + n.d + ')' : 'Sofort +1 Skillpunkt.'; }
  return out;
}
function showTalents() {
  const choices = rollTalents(); if (!choices.length) { S.talentQ = 0; return; }
  UI.overlay = 'perks'; UI.show('perks'); SFX.play('level'); S.flash = 0.35; S.flashCol = '181,140,255';
  const box = $('perks'), h1 = box.querySelector('h1'), sub = h1 && h1.nextElementSibling; if (h1) h1.textContent = '✦ TALENTWAHL ✦'; if (sub) sub.textContent = 'Level ' + S.level + ' · Wähle 1 von 3';
  $('pCards').innerHTML = choices.map((t, i) => `<div class="v12card" data-tal="${i}"><div class="ic">${t.icon}</div><b>${t.n}</b><p>${t.d}</p><div class="tag">${t.unique ? 'DAUERHAFT' : 'SOFORT'}</div></div>`).join('');
  $('pCards').querySelectorAll('[data-tal]').forEach(e => e.onclick = () => {
    const t = choices[+e.dataset.tal]; S.talents = S.talents || {};
    if (t.unique) S.talents[t.id] = true;
    if (t.id === 'pts2') S.skillPts = (S.skillPts || 0) + 2;
    if (t.id === 'free') { if (t.skill) applySkill(t.skill, true); else S.skillPts = (S.skillPts || 0) + 1; }
    if (t.id === 'supply') { S.res.ammo += 60; S.res.meds += 2; S.res.grenades += 2; }
    if (t.id === 'packrat') recalcCap();
    S.talentQ = Math.max(0, (S.talentQ || 1) - 1); UI.hide('perks'); UI.overlay = null;
    SFX.play('jackpot'); shake(6); S.flash = 0.45; S.flashCol = '255,216,74';
    for (let k = 0; k < 3; k++) S.rings.push({ x: S.p.x, y: S.p.y, r: 8 + k * 16, max: 220, col: k % 2 ? '181,140,255' : '255,216,74', life: 0.8 + k * 0.15 });
    burst(S.p.x, S.p.y, 30, '#b58cff', 30, 220, { up: 1.7 }); announce(t.icon + ' ' + t.n.toUpperCase(), t.d, '#ffe066');
    if (S.talentQ > 0) S.talentDelay = 0.8;
  });
}
{
  const _ax = addXp;
  addXp = function (v, x, y) {
    const l0 = S.level; _ax(v, x, y); const g = S.level - l0; if (g <= 0) return;
    S.pendingPerks = Math.max(0, S.pendingPerks - g); S.skillPts = (S.skillPts || 0) + g;
    for (let L = l0 + 1; L <= S.level; L++) if (L % 3 === 0) S.talentQ = (S.talentQ || 0) + 1;
    S.talentDelay = 1.3;
    announce('LEVEL ' + S.level + '!', '+' + g + ' Skillpunkt' + (g > 1 ? 'e' : '') + ' · K = Skillbaum' + (S.talentQ ? ' · ✦ Talentwahl!' : ''), '#ffd84a');
  };
}
// --- Wirkungen der neuen Skills & Talente ---
{
  const _hp = hurtPlayer; hurtPlayer = function (d) { if (S && S.p) S.lastHurt = S.stats.played; _hp(d * Math.max(0.55, 1 - 0.1 * perk('tough'))); };
  const _ws = weaponStat; weaponStat = function (k) { const st = _ws(k); if (st.reload) st.reload *= 1 - 0.15 * perk('reload'); return st; };
  const _ad = ambientDark; ambientDark = function () { const d = _ad(); return S.talents && S.talents.nightowl ? d * 0.62 : d; };
  const _kz = killZombie; killZombie = function (z, src) { _kz(z, src); if (S.talents && S.talents.scav && Math.random() < 0.35) S.pickups.push({ x: z.x + 6, y: z.y, kind: 'scrap', amt: 2, t: 0 }); };
  const _oc = openCrate; openCrate = function (c) { _oc(c); if (S.talents && S.talents.lucky) { let ch = [0.004, 0.02, 0.07, 0.2][c.rarity] || 0; if (Math.random() < ch) setTimeout(() => { if (S) giveWeapon(rollWeapon(), c.x, c.y, false); }, 1600); } };
  const _rc = recalcCap; recalcCap = function () { _rc(); if (S.talents && S.talents.packrat) S.cap += 200; };
}
// --- Waffen-Hinweis im Arsenal (Kaliber gibt es nicht mehr) ---
(() => {
  const tb = $('tBody'); if (!tb || typeof MutationObserver === 'undefined') return;
  new MutationObserver(() => { for (const el of tb.querySelectorAll('.mcard')) if (el.textContent.includes('NICHT IM BESITZ') && el.textContent.includes('Kaliber')) { const nm = el.querySelector('b') ? el.querySelector('b').textContent : ''; el.innerHTML = `<b>${nm}</b><p>Waffen bekommst du jetzt so:<br>• <b style="color:#ffd84a">Bauen</b> in der <b>Werkstatt</b> (Waffenbank ab Stufe 2).<br>• <b style="color:#b05cff">Finden</b> – ganz selten in Kisten.</p>`; } }).observe(tb, { childList: true, subtree: true });
})();

// ------------------------------------------------------------------
// 6) SPEICHERN / LADEN der neuen Daten
// ------------------------------------------------------------------
let V12_LOAD = false;
{
  const _ns = newState; newState = function (seed) { const s = _ns(seed); s.skills = {}; s.skillPts = 0; s.talents = {}; s.talentQ = 0; s.survT = 240; s.survivor = null; if (!CITY_ENABLED) s.res.frags = 3; return s; };
  const _sg = saveGame; saveGame = function (auto) { _sg(auto); try { if (S && S.phase === 'play' && !S.exp) localStorage.setItem(Auth.saveKey() + '_v12', JSON.stringify({ seed: S.seed, skills: S.skills, skillPts: S.skillPts, talents: S.talents, talentQ: S.talentQ, secondDay: S.secondDay })); } catch (e) { } };
  const _lg = loadGame; loadGame = function () { V12_LOAD = true; _lg(); };
}
function v12ApplyLoad() {
  V12_LOAD = false; let d = null; try { d = JSON.parse(localStorage.getItem(Auth.saveKey() + '_v12') || 'null'); } catch (e) { }
  if (d && d.seed === S.seed) { S.skills = d.skills || {}; S.skillPts = d.skillPts || 0; S.talents = d.talents || {}; S.talentQ = d.talentQ || 0; S.secondDay = d.secondDay; }
  else { const used = Object.values(S.perks || {}).reduce((a, b) => a + b, 0); S.skills = {}; S.talents = {}; S.skillPts = Math.max(1, S.level - 1 - used); if (S.skillPts > 0) setTimeout(() => S && UI.toast('🌟 Neu: Skillbaum! Du hast ' + S.skillPts + ' Skillpunkte – drück K.'), 3000); }
  if (!CITY_ENABLED) S.res.frags = Math.max(3, S.res.frags || 0);
  recalcCap();
}

// ------------------------------------------------------------------
// 7) TICK & ZEICHNEN
// ------------------------------------------------------------------
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p) return; const p = S.p;
    if (V12_LOAD && S.phase === 'play') v12ApplyLoad();
    if (S.phase === 'play') {
      // Talentwahl
      if ((S.talentQ || 0) > 0 && !UI.overlay) { S.talentDelay = (S.talentDelay || 0) - dt; if (S.talentDelay <= 0) showTalents(); }
      // Regeneration
      if (perk('regen') && p.hp > 0 && p.hp < p.maxHp && S.stats.played - (S.lastHurt || -99) > 5) p.hp = Math.min(p.maxHp, p.hp + 0.8 * perk('regen') * dt);
      // Beute-Magnet
      const mg = perk('magnet'); if (mg) for (const pk of S.pickups) { const dx = p.x - pk.x, dy = p.y - pk.y, d = Math.hypot(dx, dy); if (d < 120 + 70 * mg && d > 4) { const s = Math.min(d, 380 * dt); pk.x += dx / d * s; pk.y += dy / d * s; } }
      // Werkstatt = Raumschiff-Landeplatz
      if (S.where === 'main') { const ws = S.mainB.find(b => b.type === 'workbench' && b.level >= 5); if (ws) S.mainW.shipPad = v12ShipPadFor(ws); }
      // Überlebende
      if (S.ship && S.where === 'main' && S.crew.length < CREW_MAX && !S.survivor) { S.survT = (S.survT === undefined ? 240 : S.survT) - dt; if (S.survT <= 0) { if (!v12SpawnSurvivor()) S.survT = 20; } }
      const sv = S.survivor;
      if (sv) {
        if (S.crew.length >= CREW_MAX) v12RemoveSurvivor();
        else if (S.where === 'main') {
          sv.t += dt; const n = sv.npc, d = Math.hypot(n.x - p.x, n.y - p.y);
          n.a = Math.atan2(p.y - n.y, p.x - n.x);
          if (Math.random() < dt * 5) S.particles.push({ x: n.x + 14, y: n.y + 10, z: 18, vx: R(-10, 10), vy: R(-10, 10), vz: R(50, 90), life: 2.4, max: 2.4, col: 'rgba(255,80,60,0.55)', s: R(8, 14), smoke: true, grav: 0 });
          if (!sv.ambush && d < 520) { sv.ambush = true; for (let k = 0; k < 3; k++) { const a = R(0, 6.28), x = n.x + Math.cos(a) * 240, y = n.y + Math.sin(a) * 240; if (!staticHit(x, y, 14) && !blockedFor(x, y, 'zombie')) { spawnZombie(pickZType(), x, y); S.zombies[S.zombies.length - 1].alert = 20; } } UI.toast('⚠ Monster umkreisen die/den Überlebende/n!'); }
        }
      }
    }
    v12RebuildUnder();
    const sp = $('v12sp'); if (sp) { const n = S.skillPts || 0; sp.textContent = n ? '🌟 ' + n + ' Skillpunkt' + (n > 1 ? 'e' : '') + ' · K' : '🌟 Skillbaum · K'; sp.classList.toggle('pulse', n > 0); }
  };
}
{
  const _fl = factoryLabels;
  factoryLabels = function (t) {
    try { v12DrawDecks(); } catch (e) { }
    _fl(t);
    const sv = S.survivor; if (!sv || S.where !== 'main' || S.phase !== 'play') return;
    const q = P(sv.npc.x, sv.npc.y, 70 + Math.sin(t * 4) * 6), M = 46, Wv = innerWidth, Hv = innerHeight, d = Math.round(Math.hypot(sv.npc.x - S.p.x, sv.npc.y - S.p.y) / 10);
    G.textAlign = 'center'; G.font = '900 14px "Trebuchet MS", Arial'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.75)';
    if (q.x > M && q.x < Wv - M && q.y > M && q.y < Hv - M) { G.strokeText('🆘 ' + d + ' m', q.x, q.y); G.fillStyle = '#ff5e3a'; G.fillText('🆘 ' + d + ' m', q.x, q.y); return; }
    const cx = Wv / 2, cy = Hv / 2, a = Math.atan2(q.y - cy, q.x - cx), ex = clamp(q.x, M, Wv - M), ey = clamp(q.y, M, Hv - M);
    G.save(); G.translate(ex, ey); G.rotate(a); G.fillStyle = '#ff5e3a'; G.beginPath(); G.moveTo(16, 0); G.lineTo(-10, -11); G.lineTo(-10, 11); G.closePath(); G.fill(); G.strokeStyle = '#fff'; G.lineWidth = 2; G.stroke(); G.restore();
    G.lineWidth = 4; G.strokeText('🆘 ' + d + ' m', ex - Math.cos(a) * 34, ey - Math.sin(a) * 26 + 5); G.fillStyle = '#ffd0c0'; G.fillText('🆘 ' + d + ' m', ex - Math.cos(a) * 34, ey - Math.sin(a) * 26 + 5);
  };
}
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyK' && S && S.phase === 'play') { if (UI.overlay === 'skills') SkillUI.close(); else if (!UI.overlay) SkillUI.open(); }
  else if (e.code === 'Escape' && UI.overlay === 'skills') SkillUI.close();
});
LOBBY_NEWS.unshift({ t: 'V12 · DIE WERKSTATT', s: 'Repariere Fahrzeuge – und bau dir Stufe für Stufe dein eigenes Raumschiff.' }, { t: 'SKILLBAUM', s: 'K drücken: Kampf, Überleben, Handwerk. Alle 3 Level eine Talentwahl.' }, { t: 'CREW', s: 'Überlebende senden Notsignale – sobald du ein Schiff hast.' });
TIPS.push('Die Werkstatt (Baumenü → BASIS) repariert Autos, Heli & Raumschiff.', 'Werkstatt Stufe 5 = dein eigenes Raumschiff!', 'K öffnet den Skillbaum.', 'Rote Rauchfackel? Ein Notsignal! Überlebende werden deine Crew.', 'In Schluchten kannst du unter Brücken hindurchlaufen.');
;

// ----------------------------- v13.js -----------------------------

// =====================================================================================
// VERDANT SIEGE V13  (wird NACH v12b.js geladen)
//  1. Autosave alle 5 Sekunden
//  2. Tore drehbar (R) · ALLES abbaubar (X) & reparierbar (H) im Baumodus
//  3. Skillbaum über Q (K geht weiterhin)
//  4. Talentwahl komplett entfernt
//  5. Mauern verbinden sich mit allen Gebäuden · Gebäude bekommen Verbindungsgänge zueinander
//     · Crew-Mitglieder auf Wachtürme setzen (schießen auf Monster)
//  6. Versorgungsabwürfe (Flugzeug + roter Rauch/Markierung) entfernt
// =====================================================================================

// ------------------------------------------------------------------
// 1) AUTOSAVE
// ------------------------------------------------------------------
const AUTOSAVE_SEC = 5;
setInterval(() => {
  try { if (S && S.phase === 'play' && !S.exp && !S.stairAnim && !UI.overlay) saveGame(true); } catch (e) { console.warn('Autosave', e); }
}, AUTOSAVE_SEC * 1000);
addEventListener('beforeunload', () => { try { if (S && S.phase === 'play' && !S.exp) saveGame(true); } catch (e) { } });

// ------------------------------------------------------------------
// 6) KEINE VERSORGUNGSABWÜRFE MEHR
// ------------------------------------------------------------------
startAirdrop = function () { if (S) S.dropPlane = null; };

// ------------------------------------------------------------------
// 4) TALENTE RAUS
// ------------------------------------------------------------------
showTalents = function () { if (S) S.talentQ = 0; };
{
  const _an = UI.announce;
  UI.announce = function (t, s, c) { if (typeof s === 'string') s = s.replace(' · ✦ Talentwahl!', ''); return _an.call(this, t, s, c); };
}
for (const n of LOBBY_NEWS) if (n.t === 'SKILLBAUM') n.s = 'Q drücken: Kampf, Überleben, Handwerk. 1 Skillpunkt pro Level.';
for (let i = 0; i < TIPS.length; i++) TIPS[i] = TIPS[i].replace('K öffnet den Skillbaum.', 'Q öffnet den Skillbaum.');

// ------------------------------------------------------------------
// 3) SKILLBAUM ÜBER Q
// ------------------------------------------------------------------
(() => {
  const ov = $('v12skills');
  if (ov) {
    const sub = ov.querySelector('.csub'); if (sub) sub.textContent = '1 Skillpunkt pro Level · Höhere Reihen brauchen Punkte im selben Zweig';
    const cl = $('v12close'); if (cl) cl.textContent = '✖ SCHLIESSEN (Q)';
  }
  document.querySelectorAll('.mbtn').forEach(b => { if (b.textContent.includes('SKILLBAUM')) b.textContent = '🌟 SKILLBAUM (Q)'; });
})();
addEventListener('keydown', e => {
  if (e.code !== 'KeyQ' || !S || S.phase !== 'play') return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (S.build && S.build.on) return;                       // im Baumodus bleibt Q wie bisher
  if (UI.overlay === 'skills') { SkillUI.close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (!UI.overlay) { SkillUI.open(); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

// ------------------------------------------------------------------
// 2) TORE DREHEN · ABBAUEN · REPARIEREN
// ------------------------------------------------------------------
BUILD.gate.rot = 1;
try { if (typeof BUILD_SPRITE !== 'undefined' && BUILD_SPRITE.gate) delete BUILD_SPRITE.gate; } catch (e) { }
function v13Hover() {
  if (!S || !S.build || !S.build.on || typeof MOUSE === 'undefined') return null;
  let w; try { w = screenToWorld(MOUSE.x, MOUSE.y); } catch (e) { return null; }
  const b = gridAt(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
  return b || null;
}
function v13RepairCost(b) {
  if (!b || b.hp >= b.max) return null;
  const base = BUILD[b.type].cost || {}, f = (1 - b.hp / b.max) * 0.5 * (1 + 0.6 * (b.level - 1)) * (1 - 0.25 * perk('mech')), c = {};
  for (const k in base) if (base[k] > 0) c[k] = Math.max(1, Math.ceil(base[k] * f));
  if (!Object.keys(c).length) c.scrap = 2;
  return c;
}
function v13Repair(b) {
  const c = v13RepairCost(b);
  if (!c) { floater(b.x, b.y, 'UNBESCHÄDIGT', '#bfff7a'); SFX.play('deny'); return; }
  if (!canAfford(c)) { floater(b.x, b.y, 'FEHLT: ' + costStr(c), '#ff8080'); SFX.play('deny'); return; }
  pay(c); b.hp = b.max; b.pop = 1; S.stats.repairs = (S.stats.repairs || 0) + 1;
  SFX.play('upgrade'); shake(4); burst(b.x, b.y, 20, '#7ad7ff', 22, 170, { up: 1.4 }); S.rings.push({ x: b.x, y: b.y, r: 6, max: 50 + b.w * 30, col: '120,220,255', life: 0.6 });
  floater(b.x, b.y, '🔧 ' + BUILD[b.type].n.toUpperCase() + ' REPARIERT', '#7ad7ff', true);
}
function v13Dismantle(b) {
  if (b.guard) v13Unpost(b, true);
  if (S.ship && b.type === 'workbench' && S.mainW && S.mainW.shipPad && S.where === 'main') { /* Schiff bleibt einfach stehen */ }
  burst(b.x, b.y, 10, '#c8a070', 20, 160); SFX.play('build');
  removeBuilding(b, true);
}
addEventListener('keydown', e => {
  if (!S || S.phase !== 'play' || !S.build || !S.build.on || UI.overlay) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code !== 'KeyX' && e.code !== 'KeyH') return;
  const b = v13Hover();
  e.preventDefault(); e.stopImmediatePropagation();
  if (!b) { SFX.play('deny'); return; }
  if (Math.hypot(b.x - S.p.x, b.y - S.p.y) > 520) { floater(b.x, b.y, 'ZU WEIT WEG', '#ff8080'); SFX.play('deny'); return; }
  if (e.code === 'KeyX') v13Dismantle(b); else v13Repair(b);
}, true);

// ------------------------------------------------------------------
// 5a) MAUERN VERBINDEN SICH MIT ALLEN GEBÄUDEN
// ------------------------------------------------------------------
const V13_FLAT = { pcable: 1, belt: 1, farm: 1, helipad: 1 };
updateNeighbors = function (b) {
  if (b.type !== 'wall' && b.type !== 'gate') return 0;
  const isW = o => !!o && o !== b && !V13_FLAT[o.type];
  const nb = { e: isW(gridAt(b.gx + 1, b.gy)), w: isW(gridAt(b.gx - 1, b.gy)), s: isW(gridAt(b.gx, b.gy + 1)), n: isW(gridAt(b.gx, b.gy - 1)) };
  b.nb = nb; b.skey = null;
  return (nb.e ? 1 : 0) + (nb.w ? 1 : 0) + (nb.s ? 1 : 0) + (nb.n ? 1 : 0);
};

// ------------------------------------------------------------------
// 5b) GEBÄUDE VERBINDEN SICH MIT GEBÄUDEN (überdachte Verbindungsgänge)
// ------------------------------------------------------------------
function v13LinkScan(b) {
  b.lnk = [];
  if (b.type === 'wall' || b.type === 'gate' || V13_FLAT[b.type] || BUILD[b.type].rot) return '';
  const seen = new Set(), add = (dir, o, a0, a1) => { if (!o || o === b || seen.has(o) || o.type === 'wall' || o.type === 'gate' || V13_FLAT[o.type] || BUILD[o.type].rot) return; if (MERGE[b.type] && o.type === b.type) return; seen.add(o); b.lnk.push([dir, (a0 + a1) / 2]); };
  for (let j = b.gy; j < b.gy + b.h; j++) { const e = gridAt(b.gx + b.w, j), w = gridAt(b.gx - 1, j); if (e) add('e', e, Math.max(b.gy, e.gy), Math.min(b.gy + b.h, e.gy + e.h)); if (w) add('w', w, Math.max(b.gy, w.gy), Math.min(b.gy + b.h, w.gy + w.h)); }
  for (let i = b.gx; i < b.gx + b.w; i++) { const s = gridAt(i, b.gy + b.h), n = gridAt(i, b.gy - 1); if (s) add('s', s, Math.max(b.gx, s.gx), Math.min(b.gx + b.w, s.gx + s.w)); if (n) add('n', n, Math.max(b.gx, n.gx), Math.min(b.gx + b.w, n.gx + n.w)); }
  return b.lnk.map(l => l[0] + l[1]).join(',');
}
{
  const _ms = mergeScan;
  mergeScan = function (b) {
    const r = _ms(b), lk = v13LinkScan(b);
    b.mkey = (b.mkey || '') + (lk ? '|L' + lk : '') + (b.guard ? '|G' : '');
    return r;
  };
}
function v13LinkParts(b) {
  const out = [], push = (...a) => out.push(a), Wd = b.w * TILE, Hd = b.h * TILE, L = Math.min(b.level || 1, 4);
  const floor = ['#7a5230', '#7f827e', '#5d666d', '#3d4f63'][L - 1], wall = ['#8b5e34', '#9a9c98', '#6d7276', '#4f585e'][L - 1], roof = ['#6b4423', '#5d666d', '#3e4e5a', '#25303d'][L - 1], glow = L >= 4 ? '#5ff4ff' : '#ffd27a';
  for (const [dir, mid] of b.lnk || []) {
    const horiz = dir === 'e' || dir === 'w', sg = dir === 'e' || dir === 's' ? 1 : -1;
    const off = horiz ? mid * TILE - b.gy * TILE - Hd / 2 : mid * TILE - b.gx * TILE - Wd / 2;
    const cx = horiz ? sg * (Wd / 2 - 7) : off, cy = horiz ? off : sg * (Hd / 2 - 7), lw = horiz ? 14 : 26, ld = horiz ? 26 : 14;
    push(cx, cy, 0, lw, ld, 3, floor);
    push(horiz ? cx : cx - 12, horiz ? cy - 12 : cy, 3, horiz ? 14 : 2, horiz ? 2 : 14, 24, wall);
    push(horiz ? cx : cx + 12, horiz ? cy + 12 : cy, 3, horiz ? 14 : 2, horiz ? 2 : 14, 24, wall);
    push(horiz ? cx : cx + 12.8, horiz ? cy + 12.8 : cy, 12, horiz ? 8 : 0.6, horiz ? 0.6 : 8, 7, glow);
    push(cx, cy, 27, lw + 2, ld + 4, 3, roof); push(cx, cy, 30, horiz ? lw : 6, horiz ? 6 : ld, 2, hexShade(roof, 1.2));
  }
  return out;
}

// ------------------------------------------------------------------
// 5c) CREW AUF WACHTÜRME
// ------------------------------------------------------------------
function v13TowerH(b) { return 54 + b.level * 12; }
function v13FreeCrew() { const used = new Set(S.mainB.filter(b => b.guard).map(b => b.guard)); return S.crew.find(c => !used.has(c.name)); }
function v13Post(b) {
  const c = v13FreeCrew(); if (!c) { UI.toast('Kein freies Crew-Mitglied. Finde Überlebende!'); SFX.play('deny'); return; }
  b.guard = c.name; b.gcd = 0.5; b.gAng = 0; mergeScan(b);
  SFX.play('upgrade'); burst(b.x, b.y, v13TowerH(b), '#5fd4ff', 20, 140, { up: 1.2 });
  floater(b.x, b.y - 20, '🗼 ' + c.name.toUpperCase() + ' HÄLT WACHE', '#5fd4ff', true);
}
function v13Unpost(b, silent) {
  const n = b.guard; b.guard = null; mergeScan(b);
  if (!silent) { SFX.play('click'); floater(b.x, b.y - 20, n + ' kommt runter', '#bff4ff'); }
}
{
  const _fi = findInteract;
  findInteract = function () {
    const p = S.p;
    if (S.where === 'main' && !p.inCar && !p.inHeli && !p.inShip) for (const b of S.buildings) {
      if (b.type !== 'watchtower' || Math.hypot(b.x - p.x, b.y - p.y) > 62) continue;
      if (b.guard) return { kind: 'v13unpost', b, text: 'E · ' + b.guard + ' vom Wachturm holen' };
      const c = v13FreeCrew(); if (c) return { kind: 'v13post', b, text: 'E · ' + c.name + ' (' + CREW_ROLES[c.role].n + ') auf den Wachturm setzen' };
    }
    return _fi();
  };
  const _di = doInteract;
  doInteract = function (it) { if (it.kind === 'v13post') { v13Post(it.b); return; } if (it.kind === 'v13unpost') { v13Unpost(it.b); return; } _di(it); };
}
function v13GuardParts(b) {
  const z = v13TowerH(b) + 4, a = b.gAng || 0, c = Math.cos(a), s = Math.sin(a), out = [];
  const at = (fx, fy) => [fx * c - fy * s, fx * s + fy * c];
  const P2 = (fx, fy, zz, w, d, h, col) => { const [x, y] = at(fx, fy); out.push([x, y, z + zz, w, d, h, col, a]); };
  P2(0, -2.5, 0, 3, 3, 9, '#2d3436'); P2(0, 2.5, 0, 3, 3, 9, '#2d3436');
  P2(0, 0, 9, 5, 9, 10, '#3d5a80'); P2(0, 0, 19, 5, 5, 5, '#e2b48c'); P2(0, 0, 23.5, 6, 6, 2, '#4b5d3a');
  P2(5, 3, 13, 12, 2, 2, '#2a2a2a'); P2(3, 3, 11, 3, 2, 4, '#5b3a22');
  return out;
}
function v13GuardTick(dt) {
  if (S.where !== 'main') return;
  const names = new Set(S.crew.map(c => c.name));
  for (const b of S.buildings) {
    if (b.type !== 'watchtower' || !b.guard) continue;
    if (!names.has(b.guard)) { v13Unpost(b, true); continue; }
    b.gcd = (b.gcd || 0) - dt;
    const R0 = 360 + b.level * 40; let best = null, bd = R0;
    for (const z of S.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - b.x, z.y - b.y); if (d < bd) { bd = d; best = z; } }
    if (!best) continue;
    const ta = Math.atan2(best.y - b.y, best.x - b.x); b.gAng = ta;
    if (b.gcd <= 0) {
      b.gcd = Math.max(0.35, 0.75 - 0.08 * b.level);
      const H = v13TowerH(b) + 16, mx = b.x + Math.cos(ta) * 12, my = b.y + Math.sin(ta) * 12, sp = 950;
      S.bullets.push({ x: mx, y: my, z: H, vx: Math.cos(ta) * sp, vy: Math.sin(ta) * sp, life: 0.55, dmg: 26 + 9 * b.level, src: 'turret', px: mx, py: my });
      burst(mx, my, H, '#ffe066', 3, 60, { nograv: true }); SFX.tone(900 + Math.random() * 200, 0.04, 'square', 0.04, 0.6);
    }
  }
}

// --- Modelle: Verbindungsgänge + Wache ---
{
  const _bp = buildingParts;
  buildingParts = function (b, t) {
    let out = _bp(b, t);
    if (b.lnk && b.lnk.length) out = out.concat(v13LinkParts(b));
    if (b.type === 'watchtower' && b.guard) out = out.concat(v13GuardParts(b));
    return out;
  };
}

// ------------------------------------------------------------------
// SPEICHERN / LADEN (Wachposten)
// ------------------------------------------------------------------
let V13_LOAD = false;
{
  const _sg = saveGame;
  saveGame = function (auto) {
    _sg(auto);
    try { if (S && S.phase === 'play' && !S.exp) localStorage.setItem(Auth.saveKey() + '_v13', JSON.stringify({ seed: S.seed, posts: S.mainB.filter(b => b.guard).map(b => [b.gx, b.gy, b.guard]) })); } catch (e) { }
  };
  const _lg = loadGame; loadGame = function () { V13_LOAD = true; _lg(); };
}
function v13ApplyLoad() {
  V13_LOAD = false;
  let d = null; try { d = JSON.parse(localStorage.getItem(Auth.saveKey() + '_v13') || 'null'); } catch (e) { }
  if (d && d.seed === S.seed) for (const [gx, gy, n] of d.posts || []) { const b = S.mainGrid[gy * 128 + gx]; if (b && b.type === 'watchtower' && S.crew.some(c => c.name === n)) { b.guard = n; mergeScan(b); } }
  for (const b of S.mainB) { mergeScan(b); updateNeighbors(b); }
  S.talents = {}; S.talentQ = 0; recalcCap();
}

// ------------------------------------------------------------------
// TICK + HOVER-ANZEIGE
// ------------------------------------------------------------------
let V13_INIT = false;
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p) return;
    if (S.phase === 'play') {
      if (V13_LOAD) v13ApplyLoad();
      if (!V13_INIT) { V13_INIT = true; S.talents = {}; for (const b of S.mainB) { mergeScan(b); updateNeighbors(b); } }
      S.talentQ = 0; S.dropPlane = null;
      v13GuardTick(dt);
    }
    const sp = $('v12sp'); if (sp) sp.textContent = sp.textContent.replace('· K', '· Q').replace('Skillbaum · K', 'Skillbaum · Q');
  };
}
{
  const _fl = factoryLabels;
  factoryLabels = function (t) {
    _fl(t);
    const b = v13Hover(); if (!b || !onScreen(b.x, b.y)) return;
    const rc = v13RepairCost(b), q = P(b.x, b.y, 74 + b.h * 16);
    const l1 = BUILD[b.type].n.toUpperCase() + ' · St.' + b.level + ' · ❤ ' + Math.round(b.hp) + '/' + Math.round(b.max);
    const l2 = 'X Abbauen (+50%) · ' + (rc ? 'H Reparieren: ' + costStr(rc) : '✔ unbeschädigt') + (BUILD[b.type].rot ? ' · R Drehen' : '') + ' · U Upgrade' + (typeof v17AttList === 'function' && v17AttList(b).length ? ' · N Anbau' : '');
    G.textAlign = 'center'; G.font = '900 12px "Trebuchet MS", Arial';
    const w = Math.max(G.measureText(l1).width, G.measureText(l2).width) + 16;
    G.fillStyle = 'rgba(4,10,16,0.82)'; G.fillRect(q.x - w / 2, q.y - 30, w, 36); G.strokeStyle = rc ? '#ffb020' : '#7dff5a'; G.lineWidth = 2; G.strokeRect(q.x - w / 2, q.y - 30, w, 36);
    G.fillStyle = '#ffffff'; G.fillText(l1, q.x, q.y - 15); G.fillStyle = rc && canAfford(rc) ? '#ffe066' : rc ? '#ff9a80' : '#bfff7a'; G.fillText(l2, q.x, q.y + 1);
    const hb = b.hp / b.max; G.fillStyle = 'rgba(0,0,0,0.6)'; G.fillRect(q.x - w / 2 + 6, q.y + 3, w - 12, 3); G.fillStyle = hb > 0.6 ? '#7dff5a' : hb > 0.3 ? '#ffb020' : '#ff5e3a'; G.fillRect(q.x - w / 2 + 6, q.y + 3, (w - 12) * hb, 3);
    G.lineWidth = 1;
  };
}
TIPS.push('Baumodus: Maus auf ein Gebäude · X = abbauen · H = reparieren.', 'Tore lassen sich jetzt mit R drehen.', 'Setz Crew-Mitglieder auf Wachtürme (E) – sie schießen auf Monster.', 'Dein Spiel speichert automatisch alle paar Sekunden.');
LOBBY_NEWS.unshift({ t: 'V13 · WACHPOSTEN', s: 'Crew auf Wachtürme setzen · Gebäude verbinden sich · Autosave.' });
;

// ----------------------------- v14.js -----------------------------

// =====================================================================================
// ACTIV (V14)  – wird NACH v13.js geladen
//  · Pausenmenü komplett deaktiviert (ESC schließt nur noch offene Fenster)
//  · HUD links oben: nur noch Leben, Hunger, Ausdauer
//  · F = Inventar (Rohstoffe, Level, Crew, Essen, Speichern, Hauptmenü) · G = Essen
//  · Versorgungsabwürfe & ihre Markierungen restlos entfernt
// =====================================================================================

// ------------------------------------------------------------------
// HUD verschlanken
// ------------------------------------------------------------------
(() => {
  const st = document.createElement('style');
  st.textContent = `
  #tl #lvl,#tl #wallet,#tl #res,#tl #buffs,#tl #v12sp{display:none!important}
  #tl{width:240px!important;padding:10px 12px!important}
  #pause{display:none!important}
  #v14inv .box{width:min(980px,96vw)}
  .v14head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .v14lvl{display:flex;align-items:center;gap:10px;margin:10px 0 4px}
  .v14lvl .b{width:46px;height:46px;border-radius:12px;background:linear-gradient(145deg,#ffe066,#e09a12);color:#3a2400;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;border:3px solid #2a1a00}
  .v14grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px;margin-top:12px}
  .v14it{background:rgba(0,0,0,.38);border:2px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 8px;text-align:center;transition:transform .12s}
  .v14it:hover{transform:translateY(-3px)}
  .v14it .n{font-size:22px;font-weight:900}
  .v14it small{display:block;font-size:10px;letter-spacing:.12em;font-weight:900;color:#a8c4ad;margin-top:2px}
  .v14it.rare{border-color:rgba(255,216,74,.45);box-shadow:0 0 12px rgba(255,216,74,.15)}
  .v14sec{margin-top:16px;font-weight:900;letter-spacing:.2em;font-size:11px;color:#ffe066}
  .v14btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
  .v14cap{font-size:11px;color:#a8c4ad;font-weight:900;margin-top:4px}
  .v14cap .bar{height:8px;margin:4px 0}
  `;
  document.head.appendChild(st);
  const ov = document.createElement('div'); ov.id = 'v14inv'; ov.className = 'screen dim hidden';
  ov.innerHTML = '<div class="box panel"><div class="v14head"><h1>🎒 INVENTAR</h1><button class="btn red" id="v14close">✖ SCHLIESSEN (F)</button></div><div id="v14body"></div></div>';
  document.body.appendChild(ov);
  $('v14close').onclick = () => Inv.close();
})();

// ------------------------------------------------------------------
// INVENTAR
// ------------------------------------------------------------------
let V14_PASS = false;
function v14Key(code, key) {   // echten Tastendruck ans Spiel durchreichen
  V14_PASS = true; const ov = UI.overlay; UI.overlay = null;
  try { dispatchEvent(new KeyboardEvent('keydown', { code, key: key || code, bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { code, key: key || code, bubbles: true })); }
  finally { V14_PASS = false; UI.overlay = ov; }
}
const Inv = {
  open() { if (!S || S.phase !== 'play') return; UI.overlay = 'inv'; $('v14inv').classList.remove('hidden'); this.render(); SFX.play('click'); if (document.pointerLockElement) document.exitPointerLock(); },
  close() { $('v14inv').classList.add('hidden'); if (UI.overlay === 'inv') UI.overlay = null; SFX.play('click'); },
  isOpen() { return !$('v14inv').classList.contains('hidden'); },
  render() {
    const r = S.res, p = S.p, need = typeof xpNeed === 'function' ? xpNeed(S.level) : 100;
    let h = `<div class="v14lvl"><div class="b">${S.level}</div><div style="flex:1"><div class="lbl"><span>LEVEL ${S.level} · ERFAHRUNG</span><span>${Math.floor(S.xp || 0)}/${need}</span></div><div class="bar" style="height:10px"><div style="width:${Math.min(100, (S.xp || 0) / need * 100)}%;background:linear-gradient(90deg,#b05cff,#e0a0ff)"></div></div></div><div class="money">${fmtMoney(r.money || 0)}</div></div>`;
    if (S.skillPts) h += `<div class="csub" style="color:#ffe066">🌟 ${S.skillPts} freie Skillpunkte – ab in den Skillbaum!</div>`;
    const cap = S.cap || 150, used = Math.max(r.wood || 0, r.stone || 0, r.scrap || 0, r.food || 0);
    h += `<div class="v14cap">LAGER: max. ${Math.round(cap)} pro Rohstoff (Holz, Stein, Schrott, Nahrung)<div class="bar"><div style="width:${Math.min(100, used / cap * 100)}%;background:${used >= cap ? '#ff5e3a' : '#7dff5a'}"></div></div></div>`;
    const basics = ['wood', 'stone', 'scrap', 'food', 'ammo', 'meds', 'grenades', 'fuel'];
    const keys = basics.concat(Object.keys(RES).filter(k => !basics.includes(k) && k !== 'money' && (r[k] || 0) > 0));
    h += '<div class="v14sec">ROHSTOFFE & VORRÄTE</div><div class="v14grid">';
    for (const k of keys) { const R0 = RES[k]; if (!R0) continue; const v = Math.floor(r[k] || 0); h += `<div class="v14it ${R0.rare ? 'rare' : ''}" style="${v ? '' : 'opacity:.45'}"><div class="n" style="color:${R0.col}">${v}</div><small>${(R0.n || k).toUpperCase()}</small></div>`; }
    h += '</div>';
    if (S.crew && S.crew.length) { h += `<div class="v14sec">CREW ${S.crew.length}/5</div><div class="v14grid">`; for (const c of S.crew) { const post = S.mainB.find(b => b.guard === c.name); h += `<div class="v14it"><div class="n" style="font-size:18px">${CREW_ROLES[c.role] ? CREW_ROLES[c.role].icon : '🧑'}</div><b style="font-size:12px">${c.name}</b><small>${CREW_ROLES[c.role] ? CREW_ROLES[c.role].n.toUpperCase() : ''}${post ? ' · 🗼 WACHE' : ''}</small></div>`; } h += '</div>'; }
    h += `<div class="v14btns"><button class="btn gold" id="v14eat" ${(r.food || 0) > 0 && p.hunger < 100 ? '' : 'disabled'}>🍖 ESSEN (G)</button><button class="btn" id="v14meds" ${(r.meds || 0) > 0 && p.hp < p.maxHp ? '' : 'disabled'}>✚ MEDIKIT</button><button class="btn" id="v14sk">🌟 SKILLBAUM (Q)</button><button class="btn" id="v14save">💾 SPEICHERN</button><button class="btn" id="v14help">? HILFE</button><button class="btn" id="v14set">⚙ EINSTELLUNGEN</button><button class="btn red" id="v14menu">⌂ HAUPTMENÜ</button></div>`;
    h += '<div class="csub" style="margin-top:8px">💾 Das Spiel speichert automatisch alle 5 Sekunden.</div>';
    $('v14body').innerHTML = h;
    $('v14eat').onclick = () => { v14Key('KeyF', 'f'); this.render(); };
    $('v14meds').onclick = () => { const i = HOTBAR.indexOf('medkit'); if (i >= 0) { v14Key('Digit' + (i + 1), String(i + 1)); } this.close(); };
    $('v14sk').onclick = () => { this.close(); SkillUI.open(); };
    $('v14save').onclick = () => { saveGame(false); UI.toast('💾 Gespeichert'); };
    $('v14help').onclick = () => { this.close(); const b = $('pHelp'); if (b) b.click(); };
    $('v14set').onclick = () => { this.close(); const b = $('pSet'); if (b) b.click(); };
    $('v14menu').onclick = () => { saveGame(false); this.close(); const b = $('pMenu'); if (b) b.click(); };
  },
};

// ------------------------------------------------------------------
// TASTEN: F = Inventar, G = Essen, ESC ohne Pause
// ------------------------------------------------------------------
addEventListener('keydown', e => {
  if (V14_PASS || !S) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyF' && S.phase === 'play') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (Inv.isOpen()) Inv.close(); else if (!UI.overlay) Inv.open();
    return;
  }
  if (e.code === 'KeyG' && S.phase === 'play' && !UI.overlay) { e.preventDefault(); e.stopImmediatePropagation(); v14Key('KeyF', 'f'); return; }
  if (e.code === 'Escape') {
    if (Inv.isOpen()) { Inv.close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (S.phase === 'play' && !UI.overlay) { e.preventDefault(); e.stopImmediatePropagation(); return; }  // kein Pausenmenü
  }
}, true);
{
  const _show = UI.show;
  UI.show = function (id) { if (id === 'pause') { if (S && (S.phase === 'pause' || S.phase === 'paused')) S.phase = 'play'; if (UI.overlay === 'pause') UI.overlay = null; return; } return _show.apply(this, arguments); };
  const _ca = UI.closeAll; UI.closeAll = function () { _ca.apply(this, arguments); const e = $('v14inv'); if (e) e.classList.add('hidden'); };
}

// ------------------------------------------------------------------
// ABWÜRFE & MARKIERUNGEN WEG
// ------------------------------------------------------------------
startAirdrop = function () { };
const V14_DROP_KEYS = ['dropPlane', 'airdrop', 'airdrops', 'drop', 'drops', 'dropMark', 'dropMarks', 'supplyDrop', 'supply', 'dropT'];
function v14KillDrops() {
  for (const k of V14_DROP_KEYS) if (S[k]) S[k] = Array.isArray(S[k]) ? [] : null;
  for (const W of [S.W, S.mainW]) {
    if (!W) continue;
    if (W.crates && W.crates.some(c => c.air || c.drop || c.beacon)) { W.crates = W.crates.filter(c => !(c.air || c.drop || c.beacon)); MINI_DIRTY = true; }
    if (W.lightsStatic && W.lightsStatic.some(L => L.drop || L.air || L.crate)) W.lightsStatic = W.lightsStatic.filter(L => !(L.drop || L.air || L.crate));
    if (W.markers) W.markers = []; if (W.dropZones) W.dropZones = [];
  }
  if (S.rings) S.rings = S.rings.filter(r => !r.drop);
}

// ------------------------------------------------------------------
// TICK
// ------------------------------------------------------------------
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p) return;
    v14KillDrops();
    const pz = $('pause'); if (pz && !pz.classList.contains('hidden')) { pz.classList.add('hidden'); if (S.phase === 'pause' || S.phase === 'paused') S.phase = 'play'; if (UI.overlay === 'pause') UI.overlay = null; }
    if (Inv.isOpen()) { S.invT = (S.invT || 0) - dt; if (S.invT <= 0) { S.invT = 0.5; Inv.render(); } }
  };
}
for (const n of LOBBY_NEWS) if (n.t && n.t.indexOf('V13') === 0) n.s = 'Crew auf Wachtürme · Gebäude verbinden sich · Autosave.';
LOBBY_NEWS.unshift({ t: 'ACTIV', s: 'F = Inventar · G = Essen · Q = Skillbaum. Kein Pausenmenü mehr – das Spiel speichert selbst.' });
TIPS.push('F öffnet dein Inventar mit allen Rohstoffen. G = schnell essen.', 'Kein Pausenmenü: Das Spiel speichert automatisch alle 5 Sekunden.');

// ---- V14.1: Kurier-Abwurfpunkte (orange Kisten mit Licht & Beschriftung) restlos entfernen ----
genCityTasks = function () { return []; };
function v14StripDropPoints(W) {
  if (!W || W.kind !== 'main') return;
  const pts = W.props.filter(p => p.kind === 'dropbox');
  W.props = W.props.filter(p => p.kind !== 'dropbox');
  for (const co of W.chunkObjs) co.props = co.props.filter(p => p.kind !== 'dropbox');
  for (const b of W.buckets) for (let i = b.length - 1; i >= 0; i--) if (b[i].kind === 'dropbox') b.splice(i, 1);
  W.lightsStatic = W.lightsStatic.filter(L => !pts.some(p => Math.abs(p.x - L.x) < 1 && Math.abs(p.y - L.y) < 1));
  W.outposts = [];
}
{
  const _mmw14 = makeMainWorld;
  makeMainWorld = function (seed) { const W = _mmw14(seed); try { v14StripDropPoints(W); } catch (e) { console.warn('V14 Abwurfpunkte', e); } return W; };
  const _op14 = UI.openPause; UI.openPause = function () { if (S && S.phase === 'play') return; return _op14.apply(this, arguments); };
  const _t14 = v11Tick; v11Tick = function (dt) { _t14(dt); if (!S) return; if (S.city && S.city.task && S.city.task.type === 'deliver') S.city.task = null; for (const W of [S.W, S.mainW]) if (W && W.outposts && W.outposts.length) { v14StripDropPoints(W); MINI_DIRTY = true; GCACHE.incomplete = true; } };
}
;

// ----------------------------- zones_runtime.js -----------------------------

// ===================== ZONEN-LOGIK: Erze, Höhlen, Militärbasis =====================
Object.assign(NODE_YIELD, { ironvein: ['scrap', 3, 7], coalvein: ['fuel', 2, 5], coppervein: ['elec', 1, 2], milwreck: ['mil', 1, 2] });
function inCaveV16(x, y) { const W = S.W; if (!W || !W.cave || !W.cave.size) return false; const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE); return W.cave.has(gy * W.size + gx); }
{
  const _ad = ambientDark;
  ambientDark = function () { const d = _ad(); return S.W.kind === 'main' && S.p && inCaveV16(S.p.x, S.p.y) ? Math.max(d, S.talents && S.talents.nightowl ? 0.55 : 0.82) : d; };
  const _fb = factoryBoxes;
  factoryBoxes = function (t) {
    _fb(t);
    const W = S.W; if (W.kind !== 'main' || !W.caveRoofs) return;
    const inside = S.p && inCaveV16(S.p.x, S.p.y);
    for (const c of W.caveRoofs) { if (!onScreen(c.x, c.y, 300)) continue; const near = inside && Math.hypot(S.p.x - c.x, S.p.y - c.y) < 420; addSprite(getSprite(c.key, () => c.parts), c.x, c.y, 0, 1, near ? 0.22 : 1, 300); }
  };
}
let V16_ZT = 0;
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p || S.phase !== 'play') return;
    const W = S.W;
    if (S.where === 'main' && W.milFires) for (const f of W.milFires) if (onScreen(f.x, f.y, 300) && Math.random() < dt * 6) {
      S.particles.push({ x: f.x + R(-10, 10), y: f.y + R(-10, 10), z: 20, vx: R(-12, 12), vy: R(-12, 12), vz: R(40, 70), life: R(2, 3.2), max: 3.2, col: 'rgba(40,36,32,0.5)', s: R(8, 14), smoke: true, grav: 0 });
      if (Math.random() < 0.5) S.particles.push({ x: f.x + R(-8, 8), y: f.y + R(-8, 8), z: 14, vx: R(-10, 10), vy: R(-10, 10), vz: R(40, 90), life: 0.6, max: 0.6, col: Math.random() < 0.5 ? '#ffb52e' : '#ff7b1c', s: 3, grav: 0 });
    }
    // Die Militärbasis ist auch tagsüber gefährlich
    if (S.where === 'main' && S.curZone && (S.curZone.id === 'military' || S.curZone.id === 'runway') && !S.p.inHeli && !S.p.inShip) {
      V16_ZT -= dt; if (V16_ZT <= 0 && S.zombies.length < 12) { trySpawn(380, 650, S.curZone); V16_ZT = R(5, 9); }
    }
    if (S.where === 'main' && inCaveV16(S.p.x, S.p.y) && !S.caveSeen) { S.caveSeen = true; announce('🕳 HÖHLE', 'Dunkel & eng · Kristalle und Titanerz im Fels', '#bff4ff'); }
  };
}
TIPS.push('Im Steinbruch Graufels (Norden) gibt es Eisen, Kohle, Kupfer – und Höhlen mit Titan und Kristallen.', 'Die zerstörte Militärbasis Eisenfalke (Südwesten) ist voller Militärteile – aber auch tagsüber gefährlich.');
LOBBY_NEWS.unshift({ t: 'NEU: EISENFALKE & GRAUFELS', s: 'Zerstörte Militärbasis mit Jets, Helis und Panzern · Steinbruch mit Terrassen und Höhlen.' });
;
;

// ===================================================== features.js =====================================================

// =====================================================================================
// ACTIV · features.js (V17) – wird nach addons.js geladen
//  · Tag länger / Nacht kürzer · Hunger-Warnung · Schadensanzeige
//  · Neuer Skillbaum (runde Knoten, Linien, Fortschrittsbalken) + 10 neue Skills + Rucksäcke
//  · Baupläne: Waffen bei jeder Werkstatt-Stufe baubar, aber erst nach Bauplan-Fund
//  · Militärteile seltener · zerstörte Landebahn · Landeplatz im Nirgendwo entfernt
//  · 3 Drohnen (finden, reparieren, upgraden, modden) – „Falke“ aus 3 Bauteilen
//  · Alles verschmilzt · Anbauten für Gebäude
// =====================================================================================

// ------------------------------------------------------------------
// 0) DATEN
// ------------------------------------------------------------------
RES.dpart = { n: 'Drohnen-Bauteil', s: 'D-TEIL', ic: '⚙', col: '#5fd4ff', rare: true };
MARKET.dpart = { buy: 5000, sell: 400 };
NODE_YIELD.milcrate = ['mil', 1, 1]; NODE_YIELD.milwreck = ['mil', 1, 1];
for (const g in GUN_CRAFT) GUN_CRAFT[g].lvl = 1;
const RUNWAY = { x0: 30, x1: 58, y0: 99, y1: 104 };
const DP_POS = [[55.4, 67.0], [26.2, 103.4], [49.5, 103.6]];
const BAGS = [
  { n: 'Kein Rucksack', cap: 0 },
  { n: 'Lederrucksack', cap: 75, cost: { wood: 20, food: 4 }, icon: '🎒' },
  { n: 'Wanderrucksack', cap: 150, cost: { wood: 30, scrap: 30 }, icon: '🎒' },
  { n: 'Militärrucksack', cap: 260, cost: { scrap: 40, mil: 4 }, icon: '🪖' },
  { n: 'Expeditionsrucksack', cap: 420, cost: { titan: 4, mil: 6, elec: 4 }, icon: '🏕' },
];
const BP_WEIGHT = { rifle: 34, shotgun: 34, sniper: 14, lmg: 12, plasma: 6 };

// ------------------------------------------------------------------
// 1) TAG / NACHT · HUNGER · SCHADENSANZEIGE
// ------------------------------------------------------------------
{
  const _uwt = updateWorldTime;
  updateWorldTime = function (dt) {
    const f = S.dayness > 0.35 ? 0.45 : 1.4;     // Tag ~6 Min, Nacht ~1,5 Min
    _uwt(dt); S.time = Math.max(0, S.time + dt / DAY_LEN * (f - 1));
  };
  const _hp = hurtPlayer;
  hurtPlayer = function (d) {
    const before = S.p.hp; _hp(d);
    const lost = before - S.p.hp; if (lost > 0.5) S.floaters.push({ x: S.p.x + R(-6, 6), y: S.p.y, z: 60, text: '-' + Math.round(lost), col: '#ff4d4d', life: 0.9, big: false });
  };
}

// ------------------------------------------------------------------
// 2) SKILLBAUM: neue Skills + neues Design
// ------------------------------------------------------------------
SKILL_TREE[0].nodes.push({ id: 'crit', tier: 3, max: 3, n: 'Kritischer Treffer', icon: '💥', d: '+8% Chance auf doppelten Schaden' });
SKILL_TREE[1].nodes.push({ id: 'stam', tier: 3, max: 2, n: 'Marathon', icon: '🫁', d: 'Ausdauer regeneriert 50% schneller' });
SKILL_TREE[2].nodes.push({ id: 'bpfind', tier: 3, max: 2, n: 'Schatzsucher', icon: '📜', d: '+50% Chance auf Baupläne in Kisten' });
SKILL_TREE.push({ id: 'gear', n: '🎒 AUSRÜSTUNG', col: '#5fd4ff', nodes: [
  { id: 'bag', tier: 0, max: 3, n: 'Großer Rucksack', icon: '🎒', d: '+100 Lagerplatz pro Rang' }, { id: 'drone', tier: 0, max: 3, n: 'Drohnentechnik', icon: '🛸', d: '+20% Drohnenschaden' },
  { id: 'dronehp', tier: 1, max: 2, n: 'Drohnenpanzer', icon: '🛡', d: '+30% Drohnen-Leben' }, { id: 'quick', tier: 1, max: 2, n: 'Flinke Finger', icon: '🖐', d: 'Kisten öffnen 30% schneller' },
  { id: 'bag2', tier: 2, max: 1, n: 'Lastesel', icon: '🐫', d: '+150 Lagerplatz' }, { id: 'fieldrep', tier: 2, max: 2, n: 'Feldreparatur', icon: '🔧', d: 'Gebäude in deiner Nähe reparieren sich (2 HP/s)' },
  { id: 'overdrive', tier: 3, max: 1, n: 'Overdrive', icon: '⚡', d: 'Drohnen feuern 35% schneller' },
] });
for (const br of SKILL_TREE) for (const n of br.nodes) SKILL_BY_ID[n.id] = Object.assign({ br }, n);

(() => {
  const st = document.createElement('style');
  st.textContent = `
  @property --p{syntax:'<number>';inherits:true;initial-value:0}
  .v17box{width:min(1240px,97vw)!important;max-height:94vh;overflow:auto;background:radial-gradient(ellipse at 50% 0%,rgba(40,70,50,.97),rgba(6,12,9,.98) 70%)!important}
  .v17top{display:flex;align-items:center;gap:16px;margin:6px 0 10px}
  .v17orb{width:84px;height:84px;border-radius:50%;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff7c0,#ffd84a 35%,#e09a12 70%,#6a4200);box-shadow:0 0 30px rgba(255,216,74,.6),inset 0 -6px 12px rgba(0,0,0,.35);border:3px solid #2a1a00}
  .v17orb b{font:900 30px "Arial Black",Arial;color:#2a1a00;line-height:1}.v17orb small{font:900 8px Arial;letter-spacing:.1em;color:#3a2400}
  .v17orb.has{animation:v17orb 1.2s ease-in-out infinite}@keyframes v17orb{50%{transform:scale(1.08);box-shadow:0 0 50px rgba(255,216,74,.95),inset 0 -6px 12px rgba(0,0,0,.35)}}
  .v17orb.pop{animation:v17pop .5s}
  .v17bar{flex:1;position:relative;height:30px;border-radius:15px;background:rgba(0,0,0,.55);border:3px solid #050a06;overflow:hidden}
  .v17bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#7dff5a,#ffd84a,#ff7ad0,#5fd4ff);background-size:300% 100%;animation:v17flow 4s linear infinite;transition:width .7s cubic-bezier(.2,1.4,.3,1);box-shadow:0 0 20px rgba(255,216,74,.6)}
  .v17bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.65) 50%,transparent 70%);animation:v17shine 2s infinite}
  .v17bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 13px "Trebuchet MS";letter-spacing:.12em;text-shadow:0 2px 3px #000}
  @keyframes v17flow{to{background-position:300% 0}}@keyframes v17shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
  .v17tree{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:12px}
  .v17br{position:relative;border-radius:18px;padding:10px 8px 14px;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 14%,transparent),rgba(0,0,0,.35));border:2px solid color-mix(in srgb,var(--c) 40%,transparent)}
  .v17bh{text-align:center;font:900 17px "Arial Black",Arial;color:var(--c);text-shadow:0 0 14px var(--c)}
  .v17bh small{display:block;font:900 10px Arial;letter-spacing:.12em;color:#cfe;opacity:.8;margin-top:2px}
  .v17bb{height:7px;margin:6px 10px 2px;border-radius:4px;background:rgba(0,0,0,.5);overflow:hidden}.v17bb i{display:block;height:100%;background:var(--c);box-shadow:0 0 10px var(--c);transition:width .6s}
  .v17col{position:relative;padding-top:4px}
  .v17lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  .v17lines line{stroke:rgba(255,255,255,.12);stroke-width:4;stroke-linecap:round}
  .v17lines line.on{stroke:var(--c);stroke-width:4;filter:drop-shadow(0 0 5px var(--c));stroke-dasharray:8 7;animation:v17dash 1s linear infinite}
  .v17lines line.full{stroke:var(--c);stroke-dasharray:none;opacity:.9}
  @keyframes v17dash{to{stroke-dashoffset:-15}}
  .v17row{display:flex;justify-content:space-around;margin:14px 0 6px;position:relative;z-index:1}
  .v17tl{position:absolute;left:4px;top:-12px;font:900 8px Arial;letter-spacing:.12em;color:#9fb;opacity:.6}
  .v17cell{display:flex;flex-direction:column;align-items:center;width:96px}
  .v17node{--p:0;position:relative;width:66px;height:66px;border-radius:50%;border:0;padding:0;cursor:pointer;background:conic-gradient(var(--c) calc(var(--p)*360deg),rgba(255,255,255,.1) 0);transition:--p .7s cubic-bezier(.2,1.4,.3,1),transform .15s;box-shadow:0 6px 14px rgba(0,0,0,.5)}
  .v17node::before{content:"";position:absolute;inset:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a5a46,#0e1a12 75%);box-shadow:inset 0 -4px 8px rgba(0,0,0,.6)}
  .v17node .ic{position:relative;font-size:26px;line-height:66px;filter:drop-shadow(0 2px 2px #000)}
  .v17node .rk{position:absolute;right:-6px;bottom:-4px;min-width:26px;padding:1px 5px;border-radius:9px;background:#0a140d;border:2px solid var(--c);font:900 10px Arial;color:#fff}
  .v17node:hover{transform:scale(1.1)}
  .v17node.lock{filter:grayscale(1) brightness(.55);cursor:not-allowed}
  .v17node.can{animation:v17can 1.1s ease-in-out infinite}
  @keyframes v17can{50%{box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 40%,transparent),0 0 26px var(--c)}}
  .v17node.max{background:conic-gradient(#ffd84a,#fff3c0,#ffd84a,#ffb020,#ffd84a);box-shadow:0 0 22px rgba(255,216,74,.7)}
  .v17node.max .rk{border-color:#ffd84a;background:#3a2a00}
  .v17node.sel{outline:3px solid #fff;outline-offset:4px}
  .v17node.boom{animation:v17pop .55s}
  @keyframes v17pop{0%{transform:scale(1)}30%{transform:scale(1.35)}60%{transform:scale(.92)}100%{transform:scale(1)}}
  .v17nm{margin-top:6px;font:900 11px "Trebuchet MS";text-align:center;line-height:1.1;color:#e6f5ea;min-height:24px}
  .v17det{display:flex;align-items:center;gap:16px;margin-top:12px;padding:12px 16px;border-radius:16px;background:rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.12);min-height:84px}
  .v17det .ic{font-size:44px}.v17det b{font:900 18px "Arial Black";display:block}.v17det p{margin:4px 0;font-size:13px;color:#d6eadc}.v17det small{font-size:11px;color:#9fb}
  .v17learn{margin-left:auto;font:900 20px "Arial Black";padding:14px 26px;border-radius:14px;border:3px solid #2a1a00;background:linear-gradient(180deg,#ffe066,#ffb020);color:#2a1a00;box-shadow:0 6px 0 #7a4a00,0 0 30px rgba(255,200,60,.5);cursor:pointer;animation:lbp 1.6s infinite}
  .v17learn:disabled{filter:grayscale(1);opacity:.45;animation:none;cursor:default}
  .v17pt{position:fixed;width:9px;height:9px;border-radius:2px;pointer-events:none;z-index:200;animation:v17fly .9s cubic-bezier(.1,.8,.3,1) forwards}
  @keyframes v17fly{to{transform:translate(var(--dx),var(--dy)) rotate(540deg);opacity:0}}
  .v17plus{position:fixed;pointer-events:none;z-index:201;font:900 22px "Arial Black";color:#ffe066;-webkit-text-stroke:1.5px #000;animation:v17up 1s ease-out forwards}
  @keyframes v17up{0%{transform:translate(-50%,0) scale(.6);opacity:0}20%{transform:translate(-50%,-16px) scale(1.3);opacity:1}100%{transform:translate(-50%,-70px) scale(1);opacity:0}}
  .mobile .v17tree{grid-template-columns:repeat(4,200px);overflow-x:auto}
  .mobile .v17cell{width:80px}.mobile .v17node{width:54px;height:54px}.mobile .v17node .ic{line-height:54px;font-size:21px}
  .mobile .v17det{flex-wrap:wrap}.mobile .v17learn{font-size:15px;padding:10px 18px}
  `;
  document.head.appendChild(st);
  const box = $('v12skills') && $('v12skills').querySelector('.box');
  if (box) {
    box.classList.add('v17box');
    box.innerHTML = '<div class="row" style="justify-content:space-between;align-items:center"><h1>🌟 SKILLBAUM</h1><button class="btn red" id="v12close">✖ SCHLIESSEN (Q)</button></div><div class="v17top"><div class="v17orb" id="v17orb"><b id="v12pts">0</b><small>PUNKTE</small></div><div class="v17bar"><i id="v17fill"></i><span id="v17bt"></span></div></div><div id="v12tree" class="v17tree"></div><div class="v17det" id="v17det"></div>';
    $('v12close').onclick = () => SkillUI.close();
  }
})();
function v17Particles(el, col, n) {
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < (n || 22); i++) {
    const s = document.createElement('div'), a = Math.random() * 6.283, d = 60 + Math.random() * 120;
    s.className = 'v17pt'; s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.background = i % 3 ? col : '#fff3a0';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.appendChild(s); setTimeout(() => s.remove(), 950);
  }
  const t = document.createElement('div'); t.className = 'v17plus'; t.textContent = '+1 RANG'; t.style.left = cx + 'px'; t.style.top = (cy - 40) + 'px'; document.body.appendChild(t); setTimeout(() => t.remove(), 1000);
}
SkillUI.sel = null;
SkillUI.render = function (popId) {
  const pts = S.skillPts || 0; let tot = 0, got = 0;
  for (const br of SKILL_TREE) for (const n of br.nodes) { tot += n.max; got += skillRank(n.id); }
  $('v12pts').textContent = pts; $('v17orb').classList.toggle('has', pts > 0);
  $('v17fill').style.width = (got / tot * 100) + '%'; $('v17bt').textContent = 'FORTSCHRITT ' + got + ' / ' + tot + ' · LEVEL ' + S.level;
  let h = '';
  for (const br of SKILL_TREE) {
    const bp = branchPts(br), bmax = br.nodes.reduce((a, n) => a + n.max, 0);
    h += `<div class="v17br" style="--c:${br.col}" data-br="${br.id}"><div class="v17bh">${br.n}<small>${bp} / ${bmax} PUNKTE</small></div><div class="v17bb"><i style="width:${bp / bmax * 100}%"></i></div><div class="v17col"><svg class="v17lines"></svg>`;
    const tiers = Math.max(...br.nodes.map(n => n.tier)) + 1;
    for (let tier = 0; tier < tiers; tier++) {
      h += `<div class="v17row" data-tier="${tier}">${tier ? `<div class="v17tl">AB ${tier * 2} PKT</div>` : ''}`;
      for (const n of br.nodes.filter(x => x.tier === tier)) {
        const r = skillRank(n.id), locked = bp < skillReq(n), max = r >= n.max, can = canLearn(n);
        h += `<div class="v17cell"><button class="v17node ${can ? 'can' : ''} ${locked ? 'lock' : ''} ${max ? 'max' : ''} ${SkillUI.sel === n.id ? 'sel' : ''}" style="--p:${r / n.max}" data-sk="${n.id}" data-t="${tier}"><span class="ic">${n.icon}</span><span class="rk">${r}/${n.max}</span></button><div class="v17nm">${n.n}</div></div>`;
      }
      h += '</div>';
    }
    h += '</div></div>';
  }
  $('v12tree').innerHTML = h;
  // Linien zwischen den Reihen
  requestAnimationFrame(() => {
    for (const col of $('v12tree').querySelectorAll('.v17col')) {
      const svg = col.querySelector('svg'), cr = col.getBoundingClientRect(), brId = col.parentNode.dataset.br, br = SKILL_TREE.find(b => b.id === brId), bp = branchPts(br);
      const pos = {}; col.querySelectorAll('.v17node').forEach(e => { const r = e.getBoundingClientRect(); (pos[e.dataset.t] = pos[e.dataset.t] || []).push([r.left + r.width / 2 - cr.left, r.top + r.height / 2 - cr.top, e.dataset.sk]); });
      let s = '';
      for (let t = 1; pos[t]; t++) for (const a of pos[t - 1]) for (const b of pos[t]) {
        const unlocked = bp >= t * 2, full = unlocked && skillRank(a[2]) > 0 && skillRank(b[2]) > 0;
        s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${full ? 'full' : unlocked ? 'on' : ''}"/>`;
      }
      svg.innerHTML = s;
    }
    if (popId) { const el = $('v12tree').querySelector(`[data-sk="${popId}"]`); if (el) { el.classList.add('boom'); v17Particles(el, SKILL_BY_ID[popId].br.col, 26); } $('v17orb').classList.add('pop'); setTimeout(() => $('v17orb') && $('v17orb').classList.remove('pop'), 500); }
  });
  $('v12tree').querySelectorAll('[data-sk]').forEach(e => {
    e.onclick = () => { if (SkillUI.sel === e.dataset.sk && canLearn(SKILL_BY_ID[e.dataset.sk])) { SkillUI.learn(e.dataset.sk); return; } SkillUI.sel = e.dataset.sk; SFX.play('click'); SkillUI.render(); };
  });
  this.detail();
};
SkillUI.detail = function () {
  const d = $('v17det'), n = SKILL_BY_ID[this.sel];
  if (!n) { d.innerHTML = '<div class="ic">👆</div><div><b>Wähle einen Skill</b><p>Tippe auf einen Knoten. Leuchtende Knoten kannst du sofort lernen.</p></div>'; return; }
  const r = skillRank(n.id), can = canLearn(n), lock = branchPts(n.br) < skillReq(n);
  d.innerHTML = `<div class="ic">${n.icon}</div><div><b style="color:${n.br.col}">${n.n} · ${r}/${n.max}</b><p>${n.d}</p><small>${r >= n.max ? '★ MAXIMAL' : lock ? '🔒 Braucht ' + skillReq(n) + ' Punkte in ' + n.br.n : (S.skillPts || 0) ? 'Nächster Rang: ' + (r + 1) + '/' + n.max : 'Keine Skillpunkte – steig ein Level auf!'}</small></div><button class="v17learn" id="v17learn" ${can ? '' : 'disabled'}>${r >= n.max ? '★ MAX' : '⬆ LERNEN'}</button>`;
  const b = $('v17learn'); if (b) b.onclick = () => SkillUI.learn(n.id);
};
SkillUI.learn = function (id) {
  const n = SKILL_BY_ID[id]; if (!canLearn(n)) { SFX.play('deny'); return; }
  applySkill(id); if (id === 'bag' || id === 'bag2') recalcCap();
  const r = skillRank(id);
  [523, 659, 784, 1046, 1318].slice(0, 2 + r).forEach((f, i) => SFX.tone(f, 0.16, 'triangle', 0.1, 1, i * 0.06)); SFX.play('upgrade');
  S.flash = 0.25; S.flashCol = hexToRgbStr(n.br.col); shake(4);
  if (r >= n.max) { SFX.play('streak'); UI.toast('★ ' + n.n.toUpperCase() + ' GEMEISTERT!'); }
  this.sel = id; this.render(id);
};

// Wirkungen der neuen Skills
{
  const _dz = damageZombie;
  damageZombie = function (z, dmg, src, kx, ky) {
    if (perk('crit') && GUNS.concat(['axe']).includes(src) && Math.random() < 0.08 * perk('crit')) { dmg *= 2; S.floaters.push({ x: z.x, y: z.y, z: 70, text: 'KRIT!', col: '#ff7ad0', life: 0.9, big: true }); }
    if (src === 'drone') dmg *= 1 + 0.2 * perk('drone');
    return _dz(z, dmg, src, kx, ky);
  };
  const _rc = recalcCap;
  recalcCap = function () { _rc(); if (!S) return; S.cap += 100 * perk('bag') + (perk('bag2') ? 150 : 0) + BAGS[S.bag || 0].cap + S.mainB.filter(b => b.att && b.att.silo).length * 200; };
  const _fi = findInteract;
  findInteract = function () { const it = _fi(); if (it && it.kind === 'crate' && perk('quick')) it.hold *= 1 - 0.3 * perk('quick'); return it; };
}

// ------------------------------------------------------------------
// 3) BAUPLÄNE · RUCKSÄCKE · KISTEN
// ------------------------------------------------------------------
function v17InMil(x, y) { const gx = x / TILE, gy = y / TILE; return inRect(gx, gy, MIL_RECT, 0) || inRect(gx, gy, RUNWAY, 1); }
function v17RollBp() {
  const pool = Object.keys(BP_WEIGHT).filter(g => !S.bp[g] && !S.unlocked[g] && (g !== 'plasma' || S.where === 'planet' || S.where === 'space' || S.where === 'station'));
  if (!pool.length) return null; let r = Math.random() * pool.reduce((a, g) => a + BP_WEIGHT[g], 0);
  for (const g of pool) { r -= BP_WEIGHT[g]; if (r <= 0) return g; } return pool[0];
}
function v17GiveBp(g, x, y) {
  S.bp[g] = true; SFX.play('jackpot'); S.flash = 0.6; S.flashCol = '255,216,74'; shake(8);
  announce('📜 BAUPLAN GEFUNDEN: ' + WEAPONS[g].n.toUpperCase(), 'In der Werkstatt (Waffenbank) jetzt baubar – egal welche Stufe', '#ffd84a');
  for (let i = 0; i < 3; i++) S.rings.push({ x, y, r: 6 + i * 16, max: 220, col: '255,216,74', life: 0.8 + i * 0.15 });
  burst(x, y, 40, '#ffd84a', 40, 220, { up: 1.7 }); addXp(60, x, y);
}
function v17GiveBag(t, x, y) {
  if (t <= (S.bag || 0)) return false; S.bag = t; recalcCap(); SFX.play('jackpot'); burst(x, y, 30, '#7ad7ff', 30, 200, { up: 1.6 });
  announce(BAGS[t].icon + ' ' + BAGS[t].n.toUpperCase(), '+' + BAGS[t].cap + ' Lagerplatz · Lager jetzt ' + Math.round(S.cap), '#7ad7ff'); return true;
}
{
  const _gw = giveWeapon;
  giveWeapon = function (g, x, y, bought) {
    if (bought) return _gw(g, x, y, bought);
    if (!S.bp[g] && !S.unlocked[g]) { v17GiveBp(g, x, y); return; }
    addRes('ammo', 40, x, y); floater(x, y - 20, 'MUNITIONSKISTE +40', '#ffe066', true);
  };
  const _oc = openCrate;
  openCrate = function (c) {
    _oc(c); const mil = v17InMil(c.x, c.y);
    if (c.dpart) { const i = DP_POS.findIndex(([px, py]) => Math.hypot(px * TILE - c.x, py * TILE - c.y) < 30); if (i >= 0 && !S.v17.dpTaken.includes(i)) S.v17.dpTaken.push(i); setTimeout(() => { if (!S) return; addRes('dpart', 1, c.x, c.y); announce('⚙ DROHNEN-BAUTEIL ' + (S.res.dpart || 0) + '/3', S.res.dpart >= 3 ? 'Alle Teile! Bring sie zum Drohnenwrack vor dem kaputten Hangar' : 'Für die Kampfdrohne „Falke“', '#5fd4ff'); SFX.play('streak'); }, 700); }
    let ch = ([0.05, 0.12, 0.28, 0.6][c.rarity] || 0) * (1 + 0.5 * perk('bpfind')) * (mil ? 1.6 : 1);
    if (Math.random() < ch) { const g = v17RollBp(); if (g) setTimeout(() => S && v17GiveBp(g, c.x, c.y), 1100); }
    if (Math.random() < ([0.02, 0.05, 0.1, 0.22][c.rarity] || 0)) setTimeout(() => S && v17GiveBag((S.bag || 0) + 1 <= 4 ? (S.bag || 0) + 1 : 0, c.x, c.y), 1500);
  };
  const _mn = mineNode;
  mineNode = function (n, dmg) { _mn(n, dmg); if (n.hp <= 0 && (n.kind === 'milcrate' || n.kind === 'milwreck')) { n.respawn = Math.max(n.respawn, 900); if (n.kind === 'milwreck' && Math.random() < 0.04 && (S.res.dpart || 0) + S.v17.dpTaken.length < 3) addRes('dpart', 1, n.x, n.y); } };
  const _rcft = renderCraft;
  renderCraft = function () {
    _rcft.call(this);
    if ((S.wsTab || 'repair') !== 'guns') return;
    const b = $('cityBody');
    b.querySelectorAll('[data-gun]').forEach(e => { const g = e.dataset.gun; if (S.unlocked[g] || S.bp[g]) return; e.disabled = true; e.className = 'btn'; e.textContent = '📜 BAUPLAN FEHLT'; const sm = e.parentNode.querySelector('small'); if (sm) sm.innerHTML = 'Bauplan in Kisten finden · dann: ' + costStr(GUN_CRAFT[g].cost); e.parentNode.style.opacity = '.6'; });
    const al = b.querySelector('.alist'); if (al) al.insertAdjacentHTML('beforebegin', `<div class="mcard" style="margin-bottom:10px"><b>📜 BAUPLÄNE: ${Object.keys(GUN_CRAFT).filter(g => S.bp[g] || S.unlocked[g]).length} / ${Object.keys(GUN_CRAFT).length}</b><p>Jede Waffe ist auf jeder Werkstatt-Stufe baubar – du brauchst nur ihren Bauplan. Baupläne liegen in Kisten (je seltener, desto besser), in der Militärbasis noch öfter.</p></div>`);
  };
}

// ------------------------------------------------------------------
// 4) WELT: Landebahn, Landeplatz weg, seltener Militär, Drohnenwracks
// ------------------------------------------------------------------
function v17Remove(W, o, list) {
  const i = W[list].indexOf(o); if (i >= 0) W[list].splice(i, 1);
  for (const co of W.chunkObjs) { const j = co[list].indexOf(o); if (j >= 0) co[list].splice(j, 1); }
  for (const b of W.buckets) { const j = b.indexOf(o); if (j >= 0) b.splice(j, 1); }
}
function v17Clear(W, x0, y0, x1, y1) {
  const T = TILE, inR = o => o.x >= x0 * T && o.x <= (x1 + 1) * T && o.y >= y0 * T && o.y <= (y1 + 1) * T;
  for (const t of W.trees.filter(inR)) v17Remove(W, t, 'trees');
  for (const n of W.nodes.filter(inR)) v17Remove(W, n, 'nodes');
  for (const p of W.props.filter(inR)) v17Remove(W, p, 'props');
  for (const b of W.bushes.filter(inR)) v17Remove(W, b, 'bushes');
  W.crates = W.crates.filter(c => !inR(c));
  for (let i = 0; i < W.grassCh.length; i++) W.grassCh[i] = W.grassCh[i].filter(g => !inR(g));
}
function buildRunway(W) {
  const T = TILE, R0 = RUNWAY, rng = mulberry32(W.seed * 11 + 3);
  v17Clear(W, R0.x0 - 4, R0.y0 - 1, R0.x1 + 1, R0.y1 + 1);
  for (let gy = R0.y0; gy <= R0.y1; gy++) for (let gx = R0.x0; gx <= R0.x1; gx++) {
    const edge = gy === R0.y0 || gy === R0.y1, t = wTile(W, gx, gy); if (t === 3) continue;
    setTile(W, gx, gy, edge ? (rng() < 0.6 ? 23 : 2) : rng() < 0.12 ? 23 : 22); if (W.mask) W.mask[gy * W.size + gx] = 0; if (W.depth) W.depth[gy * W.size + gx] = 0;
  }
  for (let gy = R0.y0 - 3; gy < R0.y0; gy++) for (let gx = 24; gx <= 30; gx++) if (wTile(W, gx, gy) !== 3) setTile(W, gx, gy, 22);
  W.runwayY2 = 101;
  // Krater & Brandflecken
  for (const [x, y] of [[34, 101], [41, 102.5], [46.5, 100.6], [53, 101.8], [37.5, 103]]) { addProp(W, 'crater', x * T, y * T, { solid: false, seed: Math.floor(x * 7 + y) }); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (rng() < 0.7) setTile(W, Math.floor(x) + i, Math.floor(y) + j, 23); }
  // Wracks
  addProp(W, 'cargowreck', 47 * T, 101.5 * T, { hw: 120, hd: 80, seed: 9, ang: 0.12 });
  addProp(W, 'jetwreck', 36.5 * T, 100.4 * T, { hw: 88, hd: 60, seed: 12, ang: 2.6, broken: true });
  addProp(W, 'ctower', 27.5 * T, 100.5 * T, { hw: 34, hd: 34, seed: 3 });
  addProp(W, 'miltruck', 31.5 * T, 98.6 * T, { hw: 34, hd: 18, seed: 31, ang: 0.4, broken: true });
  for (let gx = R0.x0 + 1; gx < R0.x1; gx += 3) for (const gy of [R0.y0 + 0.5, R0.y1 + 0.5]) addProp(W, 'rwlight', gx * T, gy * T, { solid: false, seed: gx, broken: rng() < 0.6 });
  for (const [x, y] of [[47, 101.5], [36.5, 100.4]]) { W.lightsStatic.push({ x: x * T, y: y * T, r: 130, col: '255,130,50', safe: false, flick: true }); (W.milFires = W.milFires || []).push({ x: x * T, y: y * T }); }
  let n = 0; for (let k = 0; k < 60 && n < 3; k++) { const x = (R0.x0 + 2 + rng() * (R0.x1 - R0.x0 - 4)) * T, y = (R0.y0 + 1 + rng() * 3) * T; if (!freeAt(W, x, y, 22)) continue; addNode(W, x, y, 'milwreck'); n++; }
  W.crates.push({ x: 33 * T, y: 103.6 * T, rarity: 2, opening: 0, open: false, hold: 0 });
  W.zones.push({ id: 'runway', n: 'ZERSTÖRTE LANDEBAHN', sub: 'Abgestürzter Frachter · Kontrollturm · Hier liegen Drohnen-Bauteile', x0: (R0.x0 - 4) * T, y0: (R0.y0 - 1) * T, x1: (R0.x1 + 1) * T, y1: (R0.y1 + 1) * T, col: '#ff9a3c' });
  W.shipPad = { x: 50 * T, y: 99.6 * T };
}
{
  const _mmw = makeMainWorld;
  makeMainWorld = function (seed) {
    const W = _mmw(seed), T = TILE;
    try {
      // Landeplatz im Nirgendwo (alte Stadt) entfernen
      const sp = W.shipPad; for (const p of W.props.filter(p => p.kind === 'hpad' && Math.hypot(p.x - sp.x, p.y - sp.y) < 8)) v17Remove(W, p, 'props');
      W.lightsStatic = W.lightsStatic.filter(L => Math.hypot(L.x - sp.x, L.y - sp.y) > 8);
      // Militärteile seltener
      const mc = W.nodes.filter(n => n.kind === 'milcrate'); mc.forEach((n, i) => { if (i % 2) v17Remove(W, n, 'nodes'); });
      const mw = W.nodes.filter(n => n.kind === 'milwreck' && n.y < MIL_RECT.y1 * T + T); mw.forEach((n, i) => { if (i % 2) v17Remove(W, n, 'nodes'); });
      buildRunway(W);
      // Drohnen-Bauteil-Kisten
      DP_POS.forEach(([x, y]) => { W.crates.push({ x: x * T, y: y * T, rarity: 3, opening: 0, open: false, hold: 0, dpart: true }); W.lightsStatic.push({ x: x * T, y: y * T, r: 70, col: '95,212,255', safe: false, blink: true }); });
      // Drohnenwracks
      W.droneWrecks = [];
      for (const [id, x, y] of [['scout', (RADIO.gx + 1.5) * T, (RADIO.gy + 4.5) * T], ['miner', (QUARRY.cx + QUARRY.r + 1.5) * T, (QUARRY.cy - 5) * T], ['hawk', 43.5 * T, 72.4 * T]]) {
        const p = addProp(W, 'dronewreck', x, y, { solid: false, did: id, seed: id.length }); W.droneWrecks.push({ id, x, y, p });
        W.lightsStatic.push({ x, y, r: 60, col: id === 'hawk' ? '255,94,58' : id === 'miner' ? '255,216,74' : '95,212,255', safe: false, blink: true });
      }
    } catch (e) { console.warn('V17 Welt', e); }
    return W;
  };
}

// ------------------------------------------------------------------
// 5) DROHNEN
// ------------------------------------------------------------------
const DRONES = {
  scout: { n: 'Späher „Libelle“', icon: '🛰', col: '#5fd4ff', hp: 80, dmg: 9, rate: 0.55, range: 320, where: 'Funkstation (Westen)', fix: { scrap: 25, elec: 4 },
    d: 'Leuchtet eine sichere Lichtzone aus, markiert alle Monster auf der Minimap und schießt einen Laser.', spec: 'Suchlicht', specD: '+60 Lichtradius & durchschlagender Laser' },
  miner: { n: 'Sammler „Hummel“', icon: '🐝', col: '#ffd84a', hp: 110, dmg: 6, rate: 0.75, range: 240, where: 'Steinbruch Graufels (Norden)', fix: { scrap: 30, elec: 3, stone: 20 },
    d: 'Saugt Beute ein und baut Steine & Erze in deiner Nähe automatisch ab.', spec: 'Bohrkopf', specD: '+40% Abbautempo & Reichweite' },
  hawk: { n: 'Kampfdrohne „Falke“', icon: '🦅', col: '#ff5e3a', hp: 170, dmg: 13, rate: 0.13, range: 430, where: 'Militärbasis – vor dem kaputten Hangar', fix: { dpart: 3, mil: 4, elec: 6 },
    d: 'Schnellfeuer-MG und Raketensalven. Muss aus 3 seltenen Bauteilen zusammengebaut werden.', spec: 'Raketenwerfer', specD: '+1 Rakete pro Salve, schnellere Salven' },
};
const DUP = { dmg: { n: 'Waffensystem', icon: '💥', d: '+35% Schaden' }, armor: { n: 'Panzerung', icon: '🛡', d: '+40% Leben' }, eng: { n: 'Triebwerk', icon: '🚀', d: '+20% Reichweite & Tempo' }, spec: { n: 'Spezial', icon: '✦', d: '' } };
const DMODS = { incend: { n: 'Brandmunition', icon: '🔥', cost: { fuel: 30, scrap: 20 }, d: 'Treffer setzen Monster in Brand' }, shield: { n: 'Energieschild', icon: '◎', cost: { elec: 6, cells: 1 }, d: 'Blockt 50% Schaden' }, magnet: { n: 'Beutemagnet', icon: '🧲', cost: { scrap: 30, elec: 3 }, d: 'Zieht Beute aus großer Entfernung an' }, spot: { n: 'Flutlicht', icon: '💡', cost: { elec: 3, scrap: 15 }, d: 'Große sichere Lichtzone' } };
function v17UpCost(id, k, l) { const c = { scrap: 20 * l, elec: 2 * l }; if (k === 'armor') { c.stone = 15 * l; delete c.elec; } if (k === 'eng') c.fuel = 10 * l; if (k === 'spec') { c.elec = 3 * l; c.crystal = l - 1; } if (id === 'hawk' && l >= 2) c.mil = l; return cleanCost(c); }
function v17NewDrones() { const o = {}; for (const id in DRONES) o[id] = { st: 'wreck', on: true, up: { dmg: 0, armor: 0, eng: 0, spec: 0 }, mod: null, mods: {}, hp: DRONES[id].hp, x: 0, y: 0, z: 60, a: 0, cd: 0, rcd: 3, mt: 0, downT: 0, hurtT: 0 }; return o; }
function dStat(id) { const D = DRONES[id], d = S.v17.drones[id], u = d.up; return { maxHp: D.hp * (1 + 0.4 * u.armor) * (1 + 0.3 * perk('dronehp')), dmg: D.dmg * (1 + 0.35 * u.dmg), rate: D.rate / (perk('overdrive') ? 1.35 : 1), range: D.range * (1 + 0.2 * u.eng), spd: 4 * (1 + 0.2 * u.eng) }; }
function v17ActiveDrones() { return Object.keys(DRONES).filter(id => S.v17 && S.v17.drones[id].st !== 'wreck' && S.v17.drones[id].on); }
function v17FixDrone(id) {
  const D = DRONES[id], d = S.v17.drones[id]; if (!canAfford(D.fix)) { UI.toast('Fehlt: ' + costStr(D.fix)); SFX.play('deny'); return; }
  pay(D.fix); d.st = 'active'; d.hp = dStat(id).maxHp;
  const w = S.mainW.droneWrecks.find(w => w.id === id); if (w) { d.x = w.x; d.y = w.y; d.z = 4; if (w.p) { v17Remove(S.mainW, w.p, 'props'); w.p = null; } S.mainW.lightsStatic = S.mainW.lightsStatic.filter(L => !(L.blink && Math.hypot(L.x - w.x, L.y - w.y) < 4)); }
  SFX.play('jackpot'); S.flash = 0.7; S.flashCol = hexToRgbStr(D.col); shake(12);
  for (let i = 0; i < 4; i++) S.rings.push({ x: d.x, y: d.y, r: 6 + i * 16, max: 260, col: hexToRgbStr(D.col), life: 0.9 + i * 0.15 });
  burst(d.x, d.y, 20, D.col, 50, 260, { up: 2 }); burst(d.x, d.y, 20, '#ffffff', 25, 200, { up: 2 });
  announce(D.icon + ' ' + D.n.toUpperCase() + ' ONLINE!', D.d, D.col); addXp(200, d.x, d.y);
  setTimeout(() => S && UI.toast('🛸 Drohnen verwalten & upgraden: Inventar (F) → DROHNEN'), 3500);
}
{
  const _fi = findInteract;
  findInteract = function () {
    const p = S.p;
    if (S.where === 'main' && S.v17 && !p.inCar && !p.inHeli && !p.inShip && S.mainW.droneWrecks) for (const w of S.mainW.droneWrecks) {
      const d = S.v17.drones[w.id]; if (d.st !== 'wreck' || Math.hypot(w.x - p.x, w.y - p.y) > 62) continue; const D = DRONES[w.id], ok = canAfford(D.fix);
      return { kind: 'dronefix', did: w.id, obj: w, hold: 2.5, can: ok, text: ok ? 'E halten · ' + D.n + ' reparieren (' + costStr(D.fix) + ')' : D.n + '-Wrack: braucht ' + costStr(D.fix) };
    }
    return _fi();
  };
  const _fh = finishHold; finishHold = function (it) { if (it.kind === 'dronefix') { v17FixDrone(it.did); return; } _fh(it); };
}
function v17DroneTick(dt) {
  const p = S.p, ids = v17ActiveDrones(); if (!ids.length || inCity()) return;
  ids.forEach((id, i) => {
    const D = DRONES[id], d = S.v17.drones[id], st = dStat(id), t = performance.now() / 1000;
    if (d.st === 'down') { d.downT -= dt; d.z = Math.max(4, d.z - dt * 60); if (Math.random() < dt * 6) S.particles.push({ x: d.x, y: d.y, z: d.z + 6, vx: R(-8, 8), vy: R(-8, 8), vz: R(30, 60), life: 1.5, max: 1.5, col: 'rgba(40,40,40,0.5)', s: 7, smoke: true, grav: 0 }); if (d.downT <= 0) { d.st = 'active'; d.hp = st.maxHp * 0.5; UI.toast(D.icon + ' ' + D.n + ' ist wieder online'); SFX.play('upgrade'); } return; }
    if (Math.hypot(d.x - p.x, d.y - p.y) > 900) { d.x = p.x; d.y = p.y; }
    d.hurtT -= dt; if (d.hurtT <= 0) d.hp = Math.min(st.maxHp, d.hp + dt * 3);
    // Ziel
    let tg = null, bd = st.range;
    for (const z of S.zombies) { if (z.dead) continue; const dd = Math.hypot(z.x - p.x, z.y - p.y); if (dd < bd) { bd = dd; tg = z; } }
    // Position
    let ox = p.x + Math.cos(t * 0.6 + i * 2.1) * 70, oy = p.y + Math.sin(t * 0.6 + i * 2.1) * 70;
    if (id === 'miner' && d.mineT && d.mineT.hp > 0) { ox = d.mineT.x; oy = d.mineT.y; }
    d.x = lerp(d.x, ox, Math.min(1, dt * st.spd * 0.7)); d.y = lerp(d.y, oy, Math.min(1, dt * st.spd * 0.7)); d.z = lerp(d.z, 52 + Math.sin(t * 3 + i) * 5, dt * 2);
    const ta = tg ? Math.atan2(tg.y - d.y, tg.x - d.x) : Math.atan2(oy - d.y, ox - d.x) || d.a; d.a += angDiff(d.a, ta) * Math.min(1, dt * 8);
    // Feuern
    d.cd -= dt;
    if (tg && d.cd <= 0) {
      d.cd = st.rate; const sp = id === 'scout' ? 1300 : 1050, a = ta + R(-0.03, 0.03), gz = d.z + groundZ(d.x, d.y);
      S.bullets.push({ x: d.x, y: d.y, z: gz, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: st.range / sp + 0.1, dmg: st.dmg, src: 'drone', px: d.x, py: d.y, laser: id === 'scout', pierce: id === 'scout' && d.up.spec ? d.up.spec : 0, hitSet: id === 'scout' && d.up.spec ? new Set() : null, fire: d.mod === 'incend' });
      burst(d.x + Math.cos(a) * 14, d.y + Math.sin(a) * 14, gz, id === 'scout' ? '#7ff4ff' : '#ffe066', 2, 60, { nograv: true });
      if (Math.hypot(d.x - p.x, d.y - p.y) < 500) SFX.tone(id === 'scout' ? 1500 : 900 + Math.random() * 200, 0.04, id === 'scout' ? 'sawtooth' : 'square', 0.03, 0.6);
    }
    if (id === 'hawk') {
      d.rcd -= dt;
      if (tg && d.rcd <= 0) {
        d.rcd = Math.max(2.5, 6 - d.up.spec * 1); const n = 2 + d.up.spec;
        for (let k = 0; k < n; k++) setTimeout(() => { if (!S || tg.dead) return; const x = tg.x + R(-30, 30), y = tg.y + R(-30, 30); S.particles.push({ x: d.x, y: d.y, z: d.z, vx: (x - d.x) * 3, vy: (y - d.y) * 3, vz: -d.z * 3, life: 0.33, max: 0.33, col: '#ffb020', s: 5, grav: 0, light: 80 }); setTimeout(() => { if (!S) return; burst(x, y, 10, '#ff9b45', 22, 220, { up: 1.5 }); burst(x, y, 6, '#3b3b3b', 10, 160, { size: 1.4 }); S.rings.push({ x, y, r: 8, max: 100, col: '255,170,80', life: 0.4 }); SFX.noise(0.3, 0.25, 700); shake(3); for (const z of S.zombies) if (!z.dead && Math.hypot(z.x - x, z.y - y) < 80) damageZombie(z, 55 * (1 + 0.35 * d.up.dmg), 'drone', (z.x - x) * 2, (z.y - y) * 2); }, 330); }, k * 160);
        SFX.tone(220, 0.25, 'sawtooth', 0.06, 2.5);
      }
    }
    if (id === 'miner') {
      d.mt -= dt * (1 + 0.4 * d.up.spec);
      if (d.mt <= 0) {
        d.mt = 2.2; d.mineT = null; let best = null, bd2 = 200 + 40 * d.up.spec + 40 * d.up.eng;
        for (const n of S.W.nodes) { if (n.hp <= 0 || n.kind === 'milcrate' || n.kind === 'milwreck' || !NODE_YIELD[n.kind]) continue; const dd = Math.hypot(n.x - p.x, n.y - p.y); if (dd < bd2) { bd2 = dd; best = n; } }
        if (best) { d.mineT = best; if (Math.hypot(d.x - best.x, d.y - best.y) < 60) { mineNode(best, 14); S.particles.push({ x: d.x, y: d.y, z: d.z, vx: 0, vy: 0, vz: 0, life: 0.15, max: 0.15, col: '#fff', s: 1, beam: false, grav: 0, light: 60 }); } }
      }
    }
    // Beute einsaugen
    const mag = id === 'miner' ? 260 : d.mod === 'magnet' ? 340 : 0;
    if (mag) for (const pk of S.pickups) { const dd = Math.hypot(pk.x - d.x, pk.y - d.y); if (dd < mag) { pk.x += (p.x - pk.x) * dt * 4; pk.y += (p.y - pk.y) * dt * 4; } }
    if (id === 'scout') S.uav = Math.max(S.uav, 0.4);
    // Schaden durch Monster
    for (const z of S.zombies) { if (z.dead) continue; if (Math.hypot(z.x - d.x, z.y - d.y) < 34 * z.sc) { d.hp -= ZTYPES[z.type].dmg * 0.5 * dt * (d.mod === 'shield' ? 0.5 : 1); d.hurtT = 4; } }
    if (d.hp <= 0) { d.st = 'down'; d.downT = 25; explode(d.x, d.y, 40, 0, 'none'); UI.toast(D.icon + ' ' + D.n + ' abgeschossen! Neustart in 25 s'); }
  });
}
{
  // Brandmunition
  const _dz = damageZombie;
  damageZombie = function (z, dmg, src, kx, ky) { _dz(z, dmg, src, kx, ky); };
  const _up = updateProjectiles;
  updateProjectiles = function (dt) { for (const b of S.bullets) if (b.fire) for (const z of S.zombies) if (!z.dead && Math.hypot(z.x - b.x, z.y - b.y) < 18) { z.burn = Math.max(z.burn || 0, 1.2); b.fire = false; } _up(dt); };
  const _cl = collectLights;
  collectLights = function () {
    _cl(); if (!S || !S.v17 || S.phase === 'menu') return;
    for (const id of v17ActiveDrones()) { const d = S.v17.drones[id]; if (d.st !== 'active') continue; const r = (id === 'scout' ? 180 + 60 * d.up.spec : 0) + (d.mod === 'spot' ? 160 : 0); if (r) LIGHTS.push({ x: d.x, y: d.y, r, col: '210,240,255', safe: true }); }
    for (const b of S.buildings) if (b.att) { if (b.att.flood) LIGHTS.push({ x: b.x, y: b.y, r: 340, col: '255,245,210', safe: true }); if (b.att.spot) LIGHTS.push({ x: b.x, y: b.y, r: 300, col: '255,250,220', safe: true }); if (b.att.worklight) LIGHTS.push({ x: b.x, y: b.y, r: 240, col: '255,230,170', safe: true }); }
  };
}
function v17DroneParts(id, d, t) {
  const out = [], push = (...a) => out.push(a), down = d.st === 'down', sp = down ? 0 : t * 40;
  const rotor = (x, y, z, r, col) => { push(x, y, z, 6, 6, 3, '#2a2f34'); push(x, y, z + 3, r * 2, 2.4, 0.6, col || '#c8d0d4', sp); push(x, y, z + 3, r * 2, 2.4, 0.6, col || '#c8d0d4', sp + 1.57); push(x, y, z + 2, r * 2 + 2, r * 2 + 2, 0.3, 'rgba' === 1 ? '' : '#3a3f44'); };
  if (id === 'scout') {
    push(0, 0, 0, 18, 12, 7, '#d8dde3'); push(2, 0, 7, 12, 8, 4, '#a8b4bc'); push(9.4, 0, 2, 0.8, 6, 4, down ? '#333' : '#5ff4ff'); push(10, 0, 3, 2, 3, 2, '#ffffff');
    for (const [x, y] of [[9, -9], [9, 9], [-9, -9], [-9, 9]]) { push(x / 2, y / 2, 4, 12, 3, 2, '#7a8288', Math.atan2(y, x)); rotor(x, y, 6, 6, '#e8eef2'); }
    push(-4, 0, -4, 6, 6, 4, '#2a2f34'); push(-1, 0, -6, 3, 3, 2, down ? '#333' : '#fffbd0');
    if (d.up.spec) push(4, 0, 11, 6, 2, 2, '#5ff4ff');
  } else if (id === 'miner') {
    push(0, 0, 0, 22, 18, 10, '#e1b12c'); push(0, 0, 10, 16, 14, 4, '#b88a14'); push(11.4, 0, 3, 0.8, 8, 5, down ? '#333' : '#5fff8a');
    for (const s of [-1, 1]) { push(0, s * 12, 5, 4, 10, 3, '#5a5e62'); rotor(0, s * 18, 7, 10, '#3a3f44'); }
    push(6, 0, -6, 4, 4, 8, '#5a5e62'); push(6, 0, -12, 6, 6, 5, '#9aa6aa'); push(6, 0, -15, 3, 3, 3, '#c8d0d4', sp * 0.3);
    push(-8, 0, -6, 12, 12, 6, '#5a3b20'); push(-8, 0, 0, 10, 10, 1, '#8a867c');
  } else {
    push(0, 0, 0, 30, 14, 8, '#3a3f44'); push(8, 0, 8, 12, 9, 4, '#2a2f34'); push(14, 0, 6, 4, 4, 2, down ? '#333' : '#ff3b30');
    push(-4, -14, 2, 16, 18, 2, '#4a4f55', -0.3); push(-4, 14, 2, 16, 18, 2, '#4a4f55', 0.3);
    for (const s of [-1, 1]) { push(10, s * 7, -2, 16, 2.4, 2.4, '#16191b'); push(-2, s * 20, -2, 12, 5, 5, '#5a3a2a'); push(4.4, s * 20, -2, 1, 4, 4, '#ffb020'); }
    for (const [x, y] of [[10, -16], [10, 16], [-12, -16], [-12, 16]]) { push(x, y, 2, 14, 14, 4, '#2a2f34'); rotor(x, y, 4, 6, '#9aa6aa'); }
    push(-14, 0, 8, 8, 2, 8, '#3a3f44'); push(-14, 0, 16, 3, 3, 2, Math.floor(t * 4) % 2 ? '#ff3b30' : '#661111');
  }
  if (d.mod === 'shield' && !down) push(0, 0, -2, 34, 34, 0.4, 'rgba' === 1 ? '' : '#8a7cff');
  if (d.up.armor >= 2) push(0, 0, -1, 14, 10, 1, '#59656c');
  return out;
}
{
  const _fb = factoryBoxes;
  factoryBoxes = function (t) {
    _fb(t); if (!S.v17 || inCity()) return;
    for (const id of v17ActiveDrones()) { const d = S.v17.drones[id]; if (!onScreen(d.x, d.y, 200)) continue; addModel(v17DroneParts(id, d, t), d.x, d.y, d.z + groundZ(d.x, d.y), d.a, 1.5, 1, 60); }
  };
  const _fl = factoryLabels;
  factoryLabels = function (t) {
    _fl(t); if (!S.v17 || inCity()) return;
    for (const id of v17ActiveDrones()) { const d = S.v17.drones[id], st = dStat(id); if (d.hp >= st.maxHp && d.st === 'active') continue; if (!onScreen(d.x, d.y)) continue; const q = P(d.x, d.y, d.z + 28); G.fillStyle = 'rgba(0,0,0,0.6)'; G.fillRect(q.x - 16, q.y, 32, 4); G.fillStyle = d.st === 'down' ? '#777' : DRONES[id].col; G.fillRect(q.x - 16, q.y, 32 * Math.max(0, d.hp / st.maxHp), 4); }
    // Lichtbögen beim Verschmelzen
    if (S.v17arcs) { S.v17arcs = S.v17arcs.filter(a => (a.t -= 1 / 60) > 0); for (const a of S.v17arcs) { const p1 = P(a.x1, a.y1, 30), p2 = P(a.x2, a.y2, 30); G.strokeStyle = 'rgba(255,240,140,' + Math.min(1, a.t * 2) + ')'; G.lineWidth = 3; G.beginPath(); G.moveTo(p1.x, p1.y); for (let k = 1; k < 8; k++) G.lineTo(lerp(p1.x, p2.x, k / 8) + R(-8, 8), lerp(p1.y, p2.y, k / 8) + R(-8, 8)); G.lineTo(p2.x, p2.y); G.stroke(); G.strokeStyle = 'rgba(255,255,255,' + Math.min(1, a.t * 2) + ')'; G.lineWidth = 1; G.stroke(); } G.lineWidth = 1; }
  };
}
{
  const _pp = propParts;
  propParts = function (p) {
    const out = [], push = (...a) => out.push(a), rng = mulberry32(p.seed || 1);
    switch (p.kind) {
      case 'dronewreck': {
        const d = { st: 'down', up: { spec: 0, armor: 0 }, mod: null }, parts = v17DroneParts(p.did, d, 0);
        for (const q of parts) { const c = q.slice(); c[2] += 4; c[6] = typeof c[6] === 'string' && c[6][0] === '#' ? hexShade(c[6], 0.6) : c[6]; c[7] = (c[7] || 0) + 0.4; out.push(c); }
        push(0, 0, 0, 40, 34, 1, '#1c1a18'); for (let i = 0; i < 5; i++) push(R(-18, 18), R(-14, 14), 0, 4, 3, 2, i % 2 ? '#5a5e62' : '#2a2f34', i);
        push(-18, 14, 0, 3, 3, 26, '#5b4a30'); push(-14, 14, 22, 8, 1, 6, p.did === 'hawk' ? '#ff5e3a' : '#ffd84a');
        return out;
      }
      case 'cargowreck': {
        const rot = (q, ox, oy, a, dz) => { const c = Math.cos(a), s = Math.sin(a), x = q[0] * c - q[1] * s + ox, y = q[0] * s + q[1] * c + oy; return [x * 0.75, y * 0.75, Math.max(0, q[2] + dz) * 0.75, q[3] * 0.75, q[4] * 0.75, q[5] * 0.75, typeof q[6] === 'string' && q[6][0] === '#' ? hexShade(q[6], 0.75) : q[6], (q[7] || 0) + a]; };
        for (const q of planeParts(0)) { if (q[0] < -10) out.push(rot(q, -40, 30, 0.35, -6)); else if (q[0] > 100) out.push(rot(q, 20, 0, -0.15, -10)); else if (Math.abs(q[1]) > 120 && q[1] > 0) out.push(rot(q, 0, 40, 0.5, -24)); else out.push(rot(q, 0, 0, 0, -6)); }
        for (let i = 0; i < 9; i++) push(R(-120, 120), R(-80, 80), 0, 8 + rng() * 16, 6 + rng() * 10, 2 + rng() * 4, rng() < 0.5 ? '#3a3e42' : '#1c1a18', rng() * 3);
        push(0, 0, 0, 220, 60, 1, '#141210'); push(-30, 10, 0, 40, 30, 10, '#6b4a2a'); push(-34, 20, 10, 20, 20, 10, '#4b5d3a');
        return out;
      }
      case 'rwlight': push(0, 0, 0, 6, 6, 3, '#3a3a3a'); push(0, 0, 3, 3, 3, p.broken ? 4 : 10, '#5a5e62'); if (!p.broken) push(0, 0, 13, 5, 5, 3, '#ffd27a'); else push(5, 3, 0, 6, 2, 2, '#5a5e62', 0.7); return out;
      case 'ctower': {
        push(0, 0, 0, 64, 64, 4, '#55585a'); push(0, 0, 4, 34, 34, 90, '#8a8e92'); for (let z = 14; z < 90; z += 18) { push(17.4, 0, z, 0.6, 20, 8, '#2a3038'); push(0, 17.4, z, 20, 0.6, 8, '#2a3038'); }
        push(0, 0, 94, 54, 54, 4, '#5a5e62'); push(0, 0, 98, 48, 48, 22, '#3a4048'); for (const s of [-1, 1]) { push(24.4, s * 10, 102, 0.8, 16, 14, '#1a2228'); push(s * 10, 24.4, 102, 16, 0.8, 14, '#1a2228'); }
        push(-8, -8, 98, 18, 14, 14, '#1c1a18'); push(0, 0, 120, 52, 52, 4, '#3a3e42'); push(10, 10, 124, 3, 3, 30, '#9aa6aa'); push(10, 10, 154, 5, 5, 3, '#ff3b30');
        push(-10, 6, 124, 14, 4, 10, '#c8d0d4', 0.6); push(26, -20, 0, 20, 14, 18, '#4b5d3a'); push(-24, 26, 0, 22, 4, 12, '#b5a27a');
        return out;
      }
    }
    return _pp(p);
  };
}

// ------------------------------------------------------------------
// 6) ALLES VERSCHMILZT + ANBAUTEN
// ------------------------------------------------------------------
const V17_MERGE_NO = { wall: 1, gate: 1, pcable: 1, belt: 1, hq: 1, helipad: 1 };
for (const k in BUILD) if (!V17_MERGE_NO[k] && !MERGE[k]) { MERGE[k] = (BUILD[k].n + '-KOMPLEX').toUpperCase(); MERGE_BONUS[k] = '+10% Leben je Verbindung'; MERGE_COL[k] = BUILD[k].light ? '#ffe7a0' : BUILD[k].planet ? '#5fd4ff' : '#ffd84a'; }
const V17_ATT = {
  workbench: [{ id: 'pad', n: 'Landeplattform', icon: '🛬', cost: { stone: 40, scrap: 30, elec: 4 }, d: 'Heli & Raumschiff landen, tanken, reparieren & starten Expeditionen hier.' }, { id: 'crane', n: 'Lastkran', icon: '🏗', cost: { scrap: 40, stone: 20 }, d: '−20% Reparaturkosten für Fahrzeuge.' }, { id: 'worklight', n: 'Arbeitslicht', icon: '💡', cost: { scrap: 15, elec: 2 }, d: 'Große sichere Lichtzone um die Werkstatt.' }],
  hq: [{ id: 'radar', n: 'Radarmast', icon: '📡', cost: { scrap: 30, elec: 6 }, d: 'Nachts siehst du alle Monster auf der Minimap.' }, { id: 'flood', n: 'Flutlichtturm', icon: '🔦', cost: { scrap: 25, stone: 20, elec: 3 }, d: 'Riesige sichere Lichtzone.' }, { id: 'sandbags', n: 'Sandsackwall', icon: '🧱', cost: { stone: 40, wood: 20 }, d: '+300 Leben.' }],
  storage: [{ id: 'silo', n: 'Silo', icon: '🛢', cost: { stone: 40, scrap: 20 }, d: '+200 Lagerplatz.' }, { id: 'vault', n: 'Tresor', icon: '🔐', cost: { scrap: 40, elec: 4 }, d: 'Beim Tod verlierst du nur 10% statt 25% Rohstoffe.' }],
  farm: [{ id: 'greenhouse', n: 'Gewächshaus', icon: '🏡', cost: { wood: 30, scrap: 10 }, d: '+60% Wachstum.' }, { id: 'sprinkler', n: 'Bewässerung', icon: '💧', cost: { scrap: 15, stone: 10 }, d: '+30% Wachstum.' }],
  watchtower: [{ id: 'spot', n: 'Suchscheinwerfer', icon: '🔦', cost: { scrap: 15, elec: 2 }, d: 'Große sichere Lichtzone.' }, { id: 'mgnest', n: 'MG-Nest', icon: '⊕', cost: { scrap: 30, mil: 2 }, d: 'Schießt automatisch auf Monster (braucht Munition).' }],
  garage: [{ id: 'lift', n: 'Hebebühne', icon: '🔧', cost: { scrap: 25, stone: 15 }, d: 'Fahrzeuge in der Nähe reparieren sich von selbst.' }],
};
const V17_PLATE = { id: 'plating', n: 'Panzerplatten', icon: '🛡', cost: { scrap: 25, stone: 25 }, d: '+50% Leben.' };
function v17AttList(b) { if (!b || V17_MERGE_NO[b.type] && b.type !== 'hq') return []; const l = (V17_ATT[b.type] || []).slice(); if (b.w * b.h >= 4 || b.type === 'watchtower') l.push(V17_PLATE); return l; }
function v17Recalc(b) {
  if (!b || !BUILD[b.type]) return;
  const ratio = b.max ? b.hp / b.max : 1, a = b.att || {};
  let m = BUILD[b.type].hp * Math.pow(1.6, (b.level || 1) - 1) + (b.mount ? 160 : 0);
  m = m * (1 + 0.1 * (b.mlinks || 0)) * (a.plating ? 1.5 : 1) + (a.sandbags ? 300 : 0);
  b.max = Math.round(m); b.hp = Math.min(b.max, Math.max(1, ratio * b.max));
}
{
  const _ms = mergeScan;
  mergeScan = function (b) { const r = _ms(b); const a = b.att ? Object.keys(b.att).sort().join('') : ''; if (a) b.mkey = (b.mkey || '') + '|A' + a; v17Recalc(b); return r; };
  const _mfx = mergeFx;
  mergeFx = function (b) {
    _mfx(b); S.v17arcs = S.v17arcs || [];
    for (const o of touching(b)) if (o.type === b.type) { S.v17arcs.push({ x1: b.x, y1: b.y, x2: o.x, y2: o.y, t: 1 }); S.particles.push({ x: (b.x + o.x) / 2, y: (b.y + o.y) / 2, z: 0, vx: 0, vy: 0, vz: 0, life: 0.5, max: 0.5, col: '#fff', s: 1, beam: true, grav: 0, light: 200 }); }
    for (let i = 0; i < 3; i++) setTimeout(() => S && burst(b.x + R(-30, 30), b.y + R(-30, 30), 40, i % 2 ? '#ffd84a' : '#ffffff', 14, 180, { up: 1.8 }), i * 120);
  };
  const _ub = upgradeBuilding; upgradeBuilding = function (b) { _ub(b); mergeScan(b); };
  const _hpad = helipad;
  helipad = function () { const r = _hpad(); if (r) return r; const wb = S.mainB.find(b => b.att && b.att.pad); return wb ? { x: wb.x + wb.w * TILE / 2 + 44, y: wb.y, level: Math.max(2, wb.level), type: 'helipad', fake: true } : null; };
  const _mf = mechF; mechF = function () { return _mf() * (S.mainB.some(b => b.att && b.att.crane) ? 0.8 : 1); };
  const _rsp = respawn;
  respawn = function () { const keep = {}; const vault = S.mainB.some(b => b.att && b.att.vault); if (vault) for (const k of ['wood', 'stone', 'scrap', 'food']) keep[k] = S.res[k]; _rsp(); if (vault) { for (const k in keep) S.res[k] = Math.floor(keep[k] * 0.9); UI.toast('🔐 Tresor: Nur 10% Rohstoffe verloren'); } };
}
function v17AttParts(b, t) {
  const out = [], push = (...a) => out.push(a), a = b.att || {}, Wd = b.w * TILE, Hd = b.h * TILE, hw = Wd / 2, hd = Hd / 2;
  if (a.pad) { const x = hw + 44; for (const [dx, dy] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) push(x + dx, dy, 0, 5, 5, 10, '#5d666d'); push(x, 0, 10, 76, 76, 4, '#4d5960'); push(x, 0, 14, 40, 6, 0.6, '#f2f2f2', Math.PI / 2); push(x, -12, 14, 6, 30, 0.6, '#f2f2f2'); push(x, 12, 14, 6, 30, 0.6, '#f2f2f2'); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; push(x + Math.cos(an) * 30, Math.sin(an) * 30, 14, 3, 3, 2, Math.floor(t * 3 + i) % 2 ? '#5fff8a' : '#2a5a2a'); } push(hw + 4, 0, 6, 10, 20, 3, '#5d666d'); }
  if (a.crane) { push(-hw + 10, hd - 10, 0, 6, 6, 110, '#e1b12c'); for (let z = 10; z < 110; z += 14) push(-hw + 10, hd - 10, z, 8, 1, 1, '#c79a14', 0.785); push(-hw + 30, hd - 10, 110, 60, 4, 4, '#e1b12c'); push(-hw - 6, hd - 10, 106, 14, 8, 8, '#3a3f44'); push(-hw + 52, hd - 10, 70, 1, 1, 40, '#1a1a1a'); push(-hw + 52, hd - 10, 64, 8, 8, 6, '#3a3f44'); }
  if (a.worklight) for (const [x, y] of [[-hw + 6, -hd + 6], [hw - 6, hd - 6]]) { push(x, y, 0, 4, 4, 70, '#3a3f44'); push(x, y, 70, 14, 6, 8, '#2a2a2a'); push(x + 7.2, y, 71, 0.6, 5, 6, '#fffbd0'); }
  if (a.radar) { const r = t * 1.6; push(hw - 20, -hd + 20, 50, 4, 4, 50, '#9aa6aa'); push(hw - 20, -hd + 20, 100, 10, 10, 4, '#5a5e62'); push(hw - 20 + Math.cos(r) * 4, -hd + 20 + Math.sin(r) * 4, 104, 4, 30, 16, '#c8d0d4', r); push(hw - 20, -hd + 20, 120, 3, 3, 3, Math.floor(t * 2) % 2 ? '#ff3b30' : '#661111'); }
  if (a.flood) { push(-hw + 14, hd - 14, 0, 8, 8, 120, '#5a5e62'); for (const s of [-1, 1]) { push(-hw + 14 + s * 10, hd - 14, 114, 10, 8, 10, '#2a2a2a'); push(-hw + 14 + s * 10 + 5.2, hd - 14, 116, 0.6, 7, 7, '#fffbd0'); } }
  if (a.sandbags) for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283, rx = hw + 14, ry = hd + 14; push(Math.cos(an) * rx, Math.sin(an) * ry, 0, 16, 10, 9, i % 2 ? '#b5a27a' : '#a8956c', an + Math.PI / 2); }
  if (a.silo) for (const s of [-1, 1]) { push(hw + 2, s * 18, 0, 22, 22, 70, '#9aa0a6'); push(hw + 2, s * 18, 70, 18, 18, 8, '#7a8288'); push(hw + 2, s * 18, 78, 6, 6, 6, '#5a5e62'); }
  if (a.vault) { push(-hw + 14, -hd + 14, 0, 22, 22, 22, '#4a4f55'); push(-hw + 25.4, -hd + 14, 6, 0.6, 12, 12, '#2a2f34'); push(-hw + 25.8, -hd + 14, 11, 0.4, 4, 4, '#ffd84a'); }
  if (a.greenhouse) { push(0, -hd / 2, 0, Wd - 10, hd - 6, 2, '#7a8288'); for (const [x, y] of [[-hw + 6, -hd + 6], [hw - 6, -hd + 6], [-hw + 6, -4], [hw - 6, -4]]) push(x, y, 0, 3, 3, 34, '#c8d0d4'); push(0, -hd / 2, 34, Wd - 6, hd, 3, '#bfe8e8'); push(0, -hd / 2, 37, Wd * 0.6, hd * 0.6, 4, '#cfeeee'); }
  if (a.sprinkler) { push(0, 0, 3, Wd - 16, 2, 2, '#7a8288'); push(0, 0, 3, 2, Hd - 16, 2, '#7a8288'); for (const [x, y] of [[-hw / 2, 0], [hw / 2, 0], [0, -hd / 2], [0, hd / 2]]) { push(x, y, 3, 3, 3, 10, '#7a8288'); push(x, y, 13, 10, 10, 1, (Math.floor(t * 4) % 2) ? '#9fe6ff' : '#5ac8e8'); } }
  if (a.spot) { const H = 54 + b.level * 12, r = t * 0.8; push(Math.cos(r) * 4, Math.sin(r) * 4, H + 16, 14, 10, 9, '#2a2f34', r); push(Math.cos(r) * 11, Math.sin(r) * 11, H + 18, 1, 8, 7, '#fffbd0', r); }
  if (a.mgnest) { const H = 54 + b.level * 12, an = b.mgAng || 0; for (let i = 0; i < 6; i++) { const q = i / 6 * 6.283; push(Math.cos(q) * 14, Math.sin(q) * 14, H + 4, 10, 6, 6, '#b5a27a', q + Math.PI / 2); } push(0, 0, H + 8, 8, 8, 6, '#3a3f44'); push(Math.cos(an) * 10, Math.sin(an) * 10, H + 13, 22, 3, 3, '#16191b', an); }
  if (a.lift) { push(hw - 14, 0, 0, 4, 4, 30, '#e1b12c'); push(-hw + 14, 0, 0, 4, 4, 30, '#e1b12c'); push(0, 0, 18 + Math.sin(t) * 6, Wd - 30, 26, 3, '#3a3f44'); }
  if (a.plating) { const c = '#59656c'; push(hw + 1.5, 0, 4, 2, Hd - 12, 26, c); push(0, hd + 1.5, 4, Wd - 12, 2, 26, c); for (let i = -2; i <= 2; i++) { push(hw + 2.6, i * Hd / 6, 6, 0.6, 2, 22, '#3a4048'); push(i * Wd / 6, hd + 2.6, 6, 2, 0.6, 22, '#3a4048'); } }
  return out;
}
{
  const _bp = buildingParts;
  buildingParts = function (b, t) { const out = _bp(b, t); return b.att && Object.keys(b.att).length ? out.concat(v17AttParts(b, t || 0)) : out; };
}
// Anbau-Menü
(() => {
  const ov = document.createElement('div'); ov.id = 'v17att'; ov.className = 'screen dim hidden';
  ov.innerHTML = '<div class="box panel" style="width:min(760px,96vw)"><div class="row" style="justify-content:space-between;align-items:center"><h1 id="v17attH">🧩 ANBAUTEN</h1><button class="btn red" id="v17attX">✖ SCHLIESSEN</button></div><div id="v17attB"></div></div>';
  document.body.appendChild(ov); $('v17attX').onclick = () => AttUI.close();
})();
const AttUI = {
  b: null,
  open(b) { if (!b) return; const l = v17AttList(b); if (!l.length) { UI.toast('Für ' + BUILD[b.type].n + ' gibt es keine Anbauten.'); SFX.play('deny'); return; } this.b = b; UI.overlay = 'att'; $('v17att').classList.remove('hidden'); this.render(); SFX.play('holo'); },
  close() { $('v17att').classList.add('hidden'); if (UI.overlay === 'att') UI.overlay = null; },
  render() {
    const b = this.b, l = v17AttList(b); $('v17attH').textContent = '🧩 ANBAUTEN · ' + BUILD[b.type].n.toUpperCase();
    $('v17attB').innerHTML = '<div class="csub">Anbauteile werden direkt an dein Gebäude geschweißt – mit eigenen Effekten.</div><div class="alist" style="grid-template-columns:repeat(2,1fr);max-height:none;margin-top:10px">' + l.map(a => { const own = b.att && b.att[a.id], ok = canAfford(a.cost); return `<div class="mcard ${own ? 'act' : ''}"><b>${a.icon} ${a.n}</b><p>${a.d}</p><small>${own ? '✔ ANGEBAUT' : costStr(a.cost)}</small><br><br><button class="btn ${!own && ok ? 'gold' : ''}" data-att="${a.id}" ${own || !ok ? 'disabled' : ''}>${own ? '✔ VORHANDEN' : '🔩 ANBAUEN'}</button></div>`; }).join('') + '</div>';
    $('v17attB').querySelectorAll('[data-att]').forEach(e => e.onclick = () => {
      const a = l.find(x => x.id === e.dataset.att); if (!canAfford(a.cost)) return; pay(a.cost); b.att = b.att || {}; b.att[a.id] = 1; mergeScan(b); recalcCap();
      if (a.id === 'pad') announce('🛬 LANDEPLATTFORM ANGEBAUT', 'Ersetzt die Landestation: Heli & Schiff landen an deiner Werkstatt', '#7ad7ff');
      SFX.play('upgrade'); SFX.play('streak'); shake(10); S.flash = 0.4; S.flashCol = '255,216,74'; b.pop = 1; b.evo = 1.2;
      for (let i = 0; i < 3; i++) S.rings.push({ x: b.x, y: b.y, r: 6 + i * 16, max: 120 + b.w * 40, col: '255,216,74', life: 0.8 + i * 0.15 });
      burst(b.x, b.y, 40, '#ffd84a', 40, 240, { up: 1.8 }); floater(b.x, b.y, a.icon + ' ' + a.n.toUpperCase() + ' ANGEBAUT!', '#ffd84a', true); addXp(40, b.x, b.y); this.render();
    });
  },
};
addEventListener('keydown', e => {
  if (!S || S.phase !== 'play' || (e.target && e.target.tagName === 'INPUT')) return;
  if (e.code === 'KeyN' && S.build && S.build.on && !UI.overlay) { e.preventDefault(); e.stopImmediatePropagation(); AttUI.open(v13Hover()); }
  if (e.code === 'KeyJ' && !UI.overlay) DroneUI.open();
  if (e.code === 'Escape') { if (UI.overlay === 'att') { AttUI.close(); e.stopImmediatePropagation(); } else if (UI.overlay === 'drones') { DroneUI.close(); e.stopImmediatePropagation(); } }
}, true);

// ------------------------------------------------------------------
// 7) DROHNEN-MENÜ
// ------------------------------------------------------------------
(() => {
  const st = document.createElement('style');
  st.textContent = `.v17dg{display:grid;grid-template-columns:360px 1fr;gap:14px}.v17dtabs{display:flex;gap:6px;margin:8px 0}.v17dtab{flex:1;padding:10px;border-radius:12px;border:2px solid rgba(255,255,255,.15);background:rgba(0,0,0,.35);color:#fff;font:900 13px "Trebuchet MS";cursor:pointer}.v17dtab.act{border-color:var(--c);box-shadow:0 0 16px var(--c);background:color-mix(in srgb,var(--c) 25%,transparent)}
  #v17dcv{width:100%;height:240px;border-radius:16px;background:radial-gradient(ellipse at 50% 60%,#1c3a44,#061014 70%);border:2px solid #0a2a35}
  .v17up{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;border-radius:12px;background:rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.08)}.v17up .pp{display:flex;gap:3px}.v17up .pp i{width:16px;height:8px;border-radius:3px;background:rgba(255,255,255,.15)}.v17up .pp i.on{background:var(--c);box-shadow:0 0 8px var(--c)}
  .v17up b{flex:1;font-size:13px}.v17up small{display:block;font-size:10px;color:#9fc4d0}.mobile .v17dg{grid-template-columns:1fr}`;
  document.head.appendChild(st);
  const ov = document.createElement('div'); ov.id = 'v17dr'; ov.className = 'screen dim hidden';
  ov.innerHTML = '<div class="box panel" style="width:min(1060px,96vw)"><div class="row" style="justify-content:space-between;align-items:center"><h1>🛸 DROHNEN-HANGAR</h1><button class="btn red" id="v17drX">✖ SCHLIESSEN</button></div><div class="v17dtabs" id="v17dtabs"></div><div id="v17drB"></div></div>';
  document.body.appendChild(ov); $('v17drX').onclick = () => DroneUI.close();
})();
const DroneUI = {
  sel: 'scout', rot: 0, fx: 0,
  open() { if (!S || !S.v17) return; if (Inv.isOpen()) Inv.close(); UI.overlay = 'drones'; $('v17dr').classList.remove('hidden'); this.render(); SFX.play('holo'); this.loop(); },
  close() { $('v17dr').classList.add('hidden'); if (UI.overlay === 'drones') UI.overlay = null; },
  render() {
    $('v17dtabs').innerHTML = Object.keys(DRONES).map(id => { const D = DRONES[id], d = S.v17.drones[id]; return `<button class="v17dtab ${this.sel === id ? 'act' : ''}" style="--c:${D.col}" data-d="${id}">${D.icon} ${D.n.split(' ')[0]}<br><small>${d.st === 'wreck' ? '🔧 WRACK' : d.st === 'down' ? '💤 NEUSTART' : d.on ? '✔ AKTIV' : '⏸ GEPARKT'}</small></button>`; }).join('');
    $('v17dtabs').querySelectorAll('[data-d]').forEach(e => e.onclick = () => { this.sel = e.dataset.d; SFX.play('click'); this.render(); });
    const id = this.sel, D = DRONES[id], d = S.v17.drones[id], st = dStat(id);
    let h = `<div class="v17dg" style="--c:${D.col}"><div><canvas id="v17dcv" width="360" height="240"></canvas><div class="mcard" style="margin-top:8px"><b style="color:${D.col}">${D.icon} ${D.n}</b><p>${D.d}</p>`;
    if (d.st === 'wreck') h += `<small>📍 Wrack: ${D.where}<br>Reparatur: ${costStr(D.fix)}${id === 'hawk' ? '<br>⚙ Bauteile: ' + (S.res.dpart || 0) + '/3 (Kisten in Militärbasis & Landebahn)' : ''}</small>`;
    else h += `<small>❤ ${Math.round(d.hp)}/${Math.round(st.maxHp)} · 💥 ${st.dmg.toFixed(1)} · ⟳ ${(1 / st.rate).toFixed(1)}/s · 🎯 ${Math.round(st.range)}</small><br><br><button class="btn ${d.on ? '' : 'gold'}" id="v17don">${d.on ? '⏸ PARKEN' : '▶ AKTIVIEREN'}</button>`;
    h += '</div></div><div>';
    if (d.st === 'wreck') h += '<div class="mcard"><b>🔧 Noch ein Wrack</b><p>Finde das Wrack und halte E, um die Drohne zu reparieren. Danach kannst du sie hier aufrüsten.</p></div>';
    else {
      h += '<div class="v14sec">UPGRADES</div>';
      for (const k of Object.keys(DUP)) {
        const lv = d.up[k], mx = 3, c = v17UpCost(id, k, lv + 1), ok = lv < mx && canAfford(c), nm = k === 'spec' ? D.spec : DUP[k].n, dd = k === 'spec' ? D.specD : DUP[k].d;
        h += `<div class="v17up"><span style="font-size:22px">${k === 'spec' ? '✦' : DUP[k].icon}</span><b>${nm}<small>${dd}</small></b><div class="pp">${[0, 1, 2].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div><button class="btn sm ${ok ? 'gold' : ''}" data-up="${k}" ${ok ? '' : 'disabled'}>${lv >= mx ? 'MAX' : costStr(c)}</button></div>`;
      }
      h += '<div class="v14sec">MODIFIKATION (1 aktiv)</div><div class="alist" style="grid-template-columns:1fr 1fr;max-height:none">';
      for (const [k, m] of Object.entries(DMODS)) { const own = d.mods[k], act = d.mod === k; h += `<div class="mcard ${act ? 'act' : ''}"><b>${m.icon} ${m.n}</b><p>${m.d}</p><button class="btn sm ${act ? '' : own || canAfford(m.cost) ? 'gold' : ''}" data-mod="${k}" ${act || (!own && !canAfford(m.cost)) ? 'disabled' : ''}>${act ? '✔ AKTIV' : own ? 'AUSRÜSTEN' : costStr(m.cost)}</button></div>`; }
      h += '</div>';
    }
    h += '</div></div>';
    $('v17drB').innerHTML = h;
    const on = $('v17don'); if (on) on.onclick = () => { d.on = !d.on; if (d.on) { d.x = S.p.x; d.y = S.p.y; } SFX.play('click'); this.render(); };
    $('v17drB').querySelectorAll('[data-up]').forEach(e => e.onclick = () => { const k = e.dataset.up, c = v17UpCost(id, k, d.up[k] + 1); if (!canAfford(c)) return; pay(c); d.up[k]++; if (k === 'armor') d.hp = dStat(id).maxHp; this.fx = 1; SFX.play('upgrade'); [660, 880, 1100].forEach((f, i) => SFX.tone(f, 0.12, 'triangle', 0.08, 1, i * 0.07)); addXp(40); this.render(); });
    $('v17drB').querySelectorAll('[data-mod]').forEach(e => e.onclick = () => { const k = e.dataset.mod; if (!d.mods[k]) { if (!canAfford(DMODS[k].cost)) return; pay(DMODS[k].cost); d.mods[k] = 1; } d.mod = k; this.fx = 1; SFX.play('crate'); this.render(); });
  },
  loop() {
    const cv = $('v17dcv'); if (UI.overlay !== 'drones') return;
    if (cv) {
      const g = cv.getContext('2d'), t = performance.now() / 1000, id = this.sel, d = S.v17.drones[id];
      g.clearRect(0, 0, cv.width, cv.height); this.rot += 0.012; this.fx = Math.max(0, this.fx - 0.03);
      const sG = G, sV = Object.assign({}, VIEW), sO = OUTLINE; G = g; OUTLINE = true; Object.assign(VIEW, { cx: 0, cy: 0, ox: cv.width / 2, oy: cv.height / 2 + 40, zoom: 4.2 }); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1;
      isoEllipse(0, 0, 0, 30, 'rgba(95,212,255,0.12)'); BOXES = []; addModel(v17DroneParts(id, d.st === 'wreck' ? { st: 'down', up: d.up, mod: null } : d, t), 0, 0, 12 + Math.sin(t * 2) * 3, this.rot, 1); flushBoxes();
      G = sG; Object.assign(VIEW, sV); OUTLINE = sO;
      if (this.fx > 0) { g.fillStyle = 'rgba(255,240,150,' + this.fx * 0.5 + ')'; g.fillRect(0, 0, cv.width, cv.height); }
    }
    requestAnimationFrame(() => this.loop());
  },
};
{ const _ca = UI.closeAll; UI.closeAll = function () { _ca.apply(this, arguments); const a = $('v17att'), d = $('v17dr'); if (a) a.classList.add('hidden'); if (d) d.classList.add('hidden'); }; }

// ------------------------------------------------------------------
// 8) INVENTAR-ERWEITERUNG (Baupläne, Rucksack, Drohnen)
// ------------------------------------------------------------------
{
  const _ir = Inv.render;
  Inv.render = function () {
    _ir.call(this); if (!S.v17) return;
    const b = $('v14body'), nb = (S.bag || 0) + 1, next = BAGS[nb];
    let h = `<div class="v14sec">🎒 RUCKSACK: ${BAGS[S.bag || 0].n.toUpperCase()} (+${BAGS[S.bag || 0].cap})</div>`;
    h += next ? `<div class="mcard" style="margin-top:6px"><b>${next.icon} ${next.n}</b><p>+${next.cap} Lagerplatz insgesamt · Kosten: ${costStr(next.cost)}</p><button class="btn ${canAfford(next.cost) ? 'gold' : ''}" id="v17bag" ${canAfford(next.cost) ? '' : 'disabled'}>🧵 HERSTELLEN</button></div>` : '<div class="csub">Bester Rucksack ausgerüstet ✔</div>';
    h += `<div class="v14sec">📜 BAUPLÄNE</div><div class="v14grid">` + Object.keys(GUN_CRAFT).map(g => `<div class="v14it ${S.bp[g] || S.unlocked[g] ? 'rare' : ''}" style="${S.bp[g] || S.unlocked[g] ? '' : 'opacity:.4'}"><div class="n">${WEAPONS[g].icon}</div><small>${WEAPONS[g].n.toUpperCase()}</small><small>${S.unlocked[g] ? '✔ GEBAUT' : S.bp[g] ? '📜 BAUBAR' : '🔒 FEHLT'}</small></div>`).join('') + '</div>';
    h += `<div class="v14btns"><button class="btn gold" id="v17dro">🛸 DROHNEN (${v17ActiveDrones().length}/3)</button></div>`;
    b.insertAdjacentHTML('beforeend', h);
    const bb = $('v17bag'); if (bb) bb.onclick = () => { if (!canAfford(next.cost)) return; pay(next.cost); v17GiveBag(nb, S.p.x, S.p.y); this.render(); };
    $('v17dro').onclick = () => DroneUI.open();
  };
}

// ------------------------------------------------------------------
// 9) SPIELER-RUCKSACK-MODELL
// ------------------------------------------------------------------
{
  const _hp = humanParts;
  humanParts = function (L, A) {
    const out = _hp(L, A);
    if (!S || A.zombie || A.npc || !S.bag || S.phase === 'menu' || !L || L.name !== LOOK.name || L.skin !== LOOK.skin) return out;
    const t = S.bag;
    out.push([-9.5, 0, 16, 6, 13, 15, t >= 3 ? '#4b5d3a' : '#6b4f2a'], [-12.6, 0, 18, 0.8, 9, 8, hexShade(t >= 3 ? '#4b5d3a' : '#6b4f2a', 0.7)]);
    if (t >= 1) out.push([-8, 0, 31, 6, 14, 5, '#8a3a2a'], [-8, 0, 31, 6.4, 2, 5.4, '#3a2a1a']);
    if (t >= 2) out.push([-9, -8, 16, 5, 3, 8, '#5b4a30'], [-9, 8, 16, 5, 3, 8, '#5b4a30']);
    if (t >= 3) out.push([-12.8, -3, 20, 0.6, 3, 6, '#2a2a2a'], [-12.8, 3, 20, 0.6, 3, 6, '#2a2a2a'], [-9, 0, 36, 4, 10, 3, '#3e4e30']);
    if (t >= 4) out.push([-12, -7, 10, 2, 2, 34, '#9aa0a6'], [-12, 7, 10, 2, 2, 34, '#9aa0a6'], [-12, 0, 44, 2, 16, 2, '#9aa0a6'], [-13, 0, 40, 4, 4, 5, '#ffd27a']);
    return out;
  };
}

// ------------------------------------------------------------------
// 10) SPEICHERN / LADEN / TICK
// ------------------------------------------------------------------
let V17_LOAD = false;
{
  const _ns = newState;
  newState = function (seed) { const s = _ns(seed); s.v17 = { drones: v17NewDrones(), dpTaken: [] }; s.bp = {}; s.bag = 0; return s; };
  const _sg = saveGame;
  saveGame = function (auto) {
    _sg(auto);
    try { if (S && S.phase === 'play' && !S.exp && S.v17) localStorage.setItem(Auth.saveKey() + '_v17', JSON.stringify({ seed: S.seed, bp: S.bp, bag: S.bag, dpTaken: S.v17.dpTaken, drones: Object.fromEntries(Object.entries(S.v17.drones).map(([k, d]) => [k, { st: d.st === 'down' ? 'active' : d.st, on: d.on, up: d.up, mod: d.mod, mods: d.mods }])), att: S.mainB.filter(b => b.att).map(b => [b.gx, b.gy, b.att]) })); } catch (e) { }
  };
  const _lg = loadGame; loadGame = function () { V17_LOAD = true; _lg(); };
}
function v17ApplyLoad() {
  V17_LOAD = false; let d = null; try { d = JSON.parse(localStorage.getItem(Auth.saveKey() + '_v17') || 'null'); } catch (e) { }
  if (!S.v17) S.v17 = { drones: v17NewDrones(), dpTaken: [] };
  if (d && d.seed === S.seed) {
    S.bp = d.bp || {}; S.bag = d.bag || 0; S.v17.dpTaken = d.dpTaken || [];
    for (const k in d.drones || {}) Object.assign(S.v17.drones[k], d.drones[k]);
    for (const [gx, gy, att] of d.att || []) { const b = S.mainGrid[gy * 128 + gx]; if (b) { b.att = att; mergeScan(b); } }
  }
  const W = S.mainW;
  for (const k in S.v17.drones) { const dr = S.v17.drones[k]; if (dr.st !== 'wreck') { dr.hp = dStat(k).maxHp; dr.x = S.p.x; dr.y = S.p.y; const w = W.droneWrecks && W.droneWrecks.find(w => w.id === k); if (w && w.p) { v17Remove(W, w.p, 'props'); w.p = null; W.lightsStatic = W.lightsStatic.filter(L => !(L.blink && Math.hypot(L.x - w.x, L.y - w.y) < 4)); } } }
  DP_POS.forEach(([x, y], i) => { const c = W.crates.find(c => Math.hypot(c.x - x * TILE, c.y - y * TILE) < 6); if (S.v17.dpTaken.includes(i)) { if (c) W.crates.splice(W.crates.indexOf(c), 1); } else if (c) c.dpart = true; else W.crates.push({ x: x * TILE, y: y * TILE, rarity: 3, opening: 0, open: false, hold: 0, dpart: true }); });
  for (const b of S.mainB) mergeScan(b);
  recalcCap();
}
let V17_HT = 0;
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p) return;
    if (!S.v17) S.v17 = { drones: v17NewDrones(), dpTaken: [] }; if (!S.bp) S.bp = {};
    if (S.phase !== 'play') return;
    if (V17_LOAD) v17ApplyLoad();
    const p = S.p;
    // Hunger-Warnung
    V17_HT -= dt; if (p.hunger <= 15 && V17_HT <= 0) { V17_HT = 12; UI.toast(p.hunger <= 0 ? '🍖 DU VERHUNGERST! Iss etwas (G / Inventar)' : '🍖 Du hast Hunger – iss bald etwas!'); SFX.play('deny'); }
    v17DroneTick(dt);
    // Anbauten & Skills
    if (S.where === 'main') for (const b of S.buildings) {
      const a = b.att; if (!a) continue;
      if (b.type === 'farm' && (a.greenhouse || a.sprinkler)) b.grow = Math.min(1, b.grow + dt / 75 * ((a.greenhouse ? 0.6 : 0) + (a.sprinkler ? 0.3 : 0)));
      if (a.radar && S.dayness < 0.4) S.uav = Math.max(S.uav, 0.3);
      if (a.lift) for (const c of S.W.cars) if (!c.wreck && c.hp < c.maxHp && Math.hypot(c.x - b.x, c.y - b.y) < 180) c.hp = Math.min(c.maxHp, c.hp + dt * 5);
      if (a.mgnest) { b.mgCd = (b.mgCd || 0) - dt; let best = null, bd = 380; for (const z of S.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - b.x, z.y - b.y); if (d < bd) { bd = d; best = z; } } if (best) { const ta = Math.atan2(best.y - b.y, best.x - b.x); b.mgAng = ta; if (b.mgCd <= 0 && S.res.ammo > 0) { b.mgCd = 0.22; b.mgShots = (b.mgShots || 0) + 1; if (b.mgShots % 5 === 0) S.res.ammo--; const H = 54 + b.level * 12 + 14; S.bullets.push({ x: b.x, y: b.y, z: H, vx: Math.cos(ta) * 1000, vy: Math.sin(ta) * 1000, life: 0.45, dmg: 14 + 3 * b.level, src: 'turret', px: b.x, py: b.y }); } } }
    }
    if (perk('fieldrep') && S.where === 'main') for (const b of S.buildings) if (b.hp < b.max && Math.hypot(b.x - p.x, b.y - p.y) < 260) b.hp = Math.min(b.max, b.hp + dt * 2 * perk('fieldrep'));
    if (perk('stam') && p.stamina < 100) p.stamina = Math.min(100, p.stamina + dt * 9 * perk('stam'));
  };
}
LOBBY_NEWS.unshift({ t: 'V17 · DROHNEN & BAUPLÄNE', s: '3 Drohnen finden & aufrüsten · Waffen nur mit Bauplan · Anbauten · neuer Skillbaum.' }, { t: 'ZERSTÖRTE LANDEBAHN', s: 'Südlich der Militärbasis: Frachter-Wrack, Kontrollturm, Drohnen-Bauteile.' });
TIPS.push('Baupläne für Waffen findest du in Kisten – dann kannst du die Waffe in jeder Werkstatt bauen.', 'Baumodus: Maus auf ein Gebäude + N = Anbauten (z. B. Landeplattform an der Werkstatt).', 'Drohnen-Wracks: Funkstation, Steinbruch und vor dem kaputten Hangar der Militärbasis.', 'J öffnet den Drohnen-Hangar.');
;

// ===================================================== fix.js =====================================================

// ===== ACTIV · fix.js (v3) – Werkstatt: E = Raumschiff · Computer neben der Werkstatt = Werkstatt-Menü =====
// Muss NACH features.js geladen werden.
function fixPcPos(b) { return { x: b.x + b.w * TILE / 2 + 26, y: b.y + b.h * TILE / 2 - 30 }; }

// ---- Interaktion ----
{
  const _fi = findInteract;
  findInteract = function () {
    const p = S.p, sh = S.ship;
    if (!p.inCar && !p.inHeli && !p.inShip && (S.where === 'main' || S.where === 'planet')) {
      for (const b of S.buildings) {
        if (b.type !== 'workbench') continue;
        const pc = fixPcPos(b);
        if (Math.hypot(pc.x - p.x, pc.y - p.y) < 48) return { kind: 'fixPc', b, text: 'E · 🖥 WERKSTATT-COMPUTER' };
      }
      if (sh && sh.state === 'parked' && sh.world === S.where) {
        const nearShip = Math.hypot(sh.x - p.x, sh.y - p.y) < 110;
        const nearWs = S.buildings.some(b => b.type === 'workbench' && Math.hypot(b.x - p.x, b.y - p.y) < b.w * TILE / 2 + 70 && Math.hypot(b.x - sh.x, b.y - sh.y) < b.w * TILE);
        if (nearShip || nearWs) return { kind: 'fixBoard', text: 'E · 🚀 INS RAUMSCHIFF EINSTEIGEN' };
      }
      // Werkstatt-Menü nur noch am Computer
      const it = _fi();
      if (it && it.kind === 'craft') return { kind: 'fixHint', text: '🖥 Werkstatt-Menü: zum Computer an der Werkstatt-Ecke gehen' };
      return it;
    }
    return _fi();
  };
  const _di = doInteract;
  doInteract = function (it) {
    if (it.kind === 'fixPc') { S.craftB = it.b; CityUI.open('craft'); return; }
    if (it.kind === 'fixBoard') { boardShip(); return; }
    if (it.kind === 'fixHint') return;
    _di(it);
  };
}

// ---- Computer-Modell an der Werkstatt ----
function fixPcParts(t) {
  const blink = Math.floor(t * 2) % 2;
  return [
    [0, 0, 0, 22, 18, 4, '#3a3f44'], [0, 0, 4, 14, 12, 22, '#4a4f55'], [0, 0, 26, 20, 16, 3, '#2a2f34'],
    [2, 0, 29, 4, 4, 10, '#2a2f34'], [2, 0, 38, 4, 22, 16, '#14161c'], [4.2, 0, 40, 0.4, 18, 12, blink ? '#5ff4ff' : '#3ac8e0'],
    [4.4, -4, 44, 0.3, 6, 2, '#ffffff'], [4.4, 3, 42, 0.3, 4, 4, '#ffd84a'], [7.2, 0, 26, 6, 14, 1.5, '#1a1a1a'],
    [-6, 6, 26, 2, 2, 20, '#5a5e62'], [-6, 6, 46, 3, 3, 3, blink ? '#5fff8a' : '#2a5a2a'],
  ];
}
{
  const _fb = factoryBoxes;
  factoryBoxes = function (t) {
    _fb(t);
    if (S.where !== 'main' && S.where !== 'planet') return;
    for (const b of S.buildings) if (b.type === 'workbench') { const pc = fixPcPos(b); if (onScreen(pc.x, pc.y)) addModel(fixPcParts(t), pc.x, pc.y, 0, Math.PI, 1.3); }
  };
}

// ---- Spieler steckt nach dem Aussteigen in einem Gebäude → raus ----
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt);
    if (!S || !S.p || S.phase !== 'play') return;
    const p = S.p;
    if (p.inCar || p.inHeli || p.inShip) return;
    const b = blockedFor(p.x, p.y, 'player');
    if (!b || b.edge || !b.type) return;
    for (let r = 20; r < 400; r += 12) for (let a = 0; a < 6.283; a += 0.4) {
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (!blockedFor(x, y, 'player') && !staticHit(x, y, 10)) { p.x = x; p.y = y; return; }
    }
  };
}

// ===== Expeditionen: immer alle 4 Einsatzgebiete (auch bei alten Spielständen) =====
genExpOffers = function () { S.expOffers = Object.keys(BIOMES).map(b => { const danger = RI(1, 3); return { biome: b, danger, dur: 300 + danger * 60, fuel: 15 + danger * 5, seed: RI(1, 1e9) }; }); };
{
  const _ee = endExpedition; endExpedition = function (s, r) { _ee(s, r); genExpOffers(); };
  const _t2 = v11Tick; v11Tick = function (dt) { _t2(dt); if (S && S.phase === 'play' && !S.exp && (!S.expOffers || S.expOffers.length < Object.keys(BIOMES).length)) genExpOffers(); };
}
// ===== Brennstoffzellen auf der Hauptkarte (Batteriedepots in der Militärbasis, neues Spiel) =====
{
  const _mmwC = makeMainWorld;
  makeMainWorld = function (seed) {
    const W = _mmwC(seed);
    try { if (!W.nodes.some(n => n.kind === 'cellnode')) for (const [x, y] of [[52.4, 86.6], [52.6, 81.4], [55.2, 84.2]]) if (freeAt(W, x * TILE, y * TILE, 18)) { const n = addNode(W, x * TILE, y * TILE, 'cellnode'); if (n) n.sc = 1.15; } } catch (e) { console.warn('Zellen', e); }
    return W;
  };
}
;

// ===================================================== v18.js =====================================================

// =====================================================================================
// ACTIV V18 · Teil 1 – Welt & Bauen
//  · Hochhäuser in Rosthafen: begehbar (ohne Ladebildschirm), mehrere Etagen, Kisten looten
//  · Basis: gepflasterter Boden innerhalb der Mauern · eingemauerte Basis = keine Spawns
//  · Alles verschmilzt: Fundament-Nähte zwischen Gebäuden, Mauer-Pfeiler an Gebäuden
//  · Gebäude verschmelzen mit dem Boden (Fundament, Kies, Grasrand)
//  · Mauern ziehen: gedrückt halten = ganze Mauerwand
//  · Mausrad = Waffe wechseln · STRG + Mausrad = Zoom
//  · Ehemaliges Stadtgebiet = Wiese
// =====================================================================================

// ------------------------------------------------------------------
// 0) HILFEN: nahtlose Übergänge (kein Ladebildschirm)
// ------------------------------------------------------------------
(() => {
  const st = document.createElement('style');
  st.textContent = `#v18fade{position:fixed;inset:0;z-index:58;pointer-events:none;opacity:0;background:#000}
  #v18floor{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:6;pointer-events:none;font:900 13px "Trebuchet MS",Arial;letter-spacing:.14em;color:#ffe2a8;text-shadow:0 2px 4px #000;padding:6px 14px;border-radius:10px;background:rgba(20,14,8,.6);border:2px solid rgba(255,200,120,.35);display:none}
  .mobile #v18floor{top:calc(44px + env(safe-area-inset-top));font-size:10px;padding:3px 10px}`;
  document.head.appendChild(st);
  const f = document.createElement('div'); f.id = 'v18fade'; document.body.appendChild(f);
  const fl = document.createElement('div'); fl.id = 'v18floor'; document.body.appendChild(fl);
})();
function v18Fade(fn, col, tin, tout) {
  if (S && S.v18fade) return false;
  if (S) S.v18fade = true;
  const el = $('v18fade'); tin = tin === undefined ? 0.16 : tin; tout = tout === undefined ? 0.3 : tout;
  el.style.background = col || '#000'; el.style.transition = 'opacity ' + tin + 's ease-in'; el.style.opacity = '1';
  setTimeout(() => {
    try { fn(); } catch (e) { showErr(e); }
    el.style.transition = 'opacity ' + tout + 's ease-out'; el.style.opacity = '0';
    setTimeout(() => { if (S) S.v18fade = false; }, tout * 1000);
  }, tin * 1000);
  return true;
}

// ------------------------------------------------------------------
// 1) EHEMALIGE STADT → WIESE
// ------------------------------------------------------------------
function v18Meadow(W) {
  const R0 = EDEN_RECT, T = TILE, N = W.size, rng = mulberry32(W.seed * 13 + 7);
  const x0 = R0.x0 - 1, y0 = R0.y0 - 1, x1 = R0.x1 + 1, y1 = R0.y1 + 1;
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
    const i = gy * N + gx, t = W.tiles[i];
    if (t === 9 || t === 19) { W.tiles[i] = 0; if (W.mask) W.mask[i] = 1; if (W.depth) W.depth[i] = 0; }
  }
  // Bäume/Props im Kern entfernen (Waldreste am Rand dürfen bleiben)
  const inCore = o => o.x > (R0.x0 + 1) * T && o.x < R0.x1 * T && o.y > (R0.y0 + 1) * T && o.y < R0.y1 * T;
  for (const t of W.trees.filter(inCore)) if (rng() < 0.85) v17Remove(W, t, 'trees');
  for (const p of W.props.filter(inCore)) v17Remove(W, p, 'props');
  // Wiese: hohes Gras, Blumen, Büsche, ein paar Solitärbäume, Felsen
  for (let i = 0; i < 2600; i++) {
    const x = (x0 + rng() * (x1 - x0 + 1)) * T, y = (y0 + rng() * (y1 - y0 + 1)) * T;
    if (tileType(W, x, y) !== 0) continue;
    W.grassCh[chunkIdx(W, x, y)].push({ x, y, h: 14 + rng() * 18, c: Math.floor(rng() * 4), ph: rng() * 6 });
  }
  for (let i = 0; i < 160; i++) { const x = (x0 + rng() * (x1 - x0 + 1)) * T, y = (y0 + rng() * (y1 - y0 + 1)) * T; if (tileType(W, x, y) === 0) addBush(W, x, y, true); }
  for (let i = 0; i < 14; i++) { const x = (x0 + 1 + rng() * (x1 - x0 - 1)) * T, y = (y0 + 1 + rng() * (y1 - y0 - 1)) * T; if (freeAt(W, x, y, 40)) addTree(W, x, y, rng() < 0.5 ? 'oak' : 'birch'); }
  for (let i = 0; i < 6; i++) { const x = (x0 + 1 + rng() * (x1 - x0 - 1)) * T, y = (y0 + 1 + rng() * (y1 - y0 - 1)) * T; if (freeAt(W, x, y, 30)) addNode(W, x, y, 'rock'); }
  W.zones = W.zones.filter(z => z.id !== 'oldforest' && z.id !== 'eden');
  W.zones.push({ id: 'bigmeadow', n: 'DIE WEITE WIESE', sub: 'Wo früher Mauern standen, wiegt jetzt hohes Gras im Wind.', x0: x0 * T, y0: y0 * T, x1: (x1 + 1) * T, y1: (y1 + 1) * T, col: '#d8ff7a' });
}
{
  const _mmw18 = makeMainWorld;
  makeMainWorld = function (seed) { const W = _mmw18(seed); try { v18Meadow(W); } catch (e) { console.warn('V18 Wiese', e); } return W; };
}

// ------------------------------------------------------------------
// 2) NEUE BODEN-KACHELN: 24 Parkett · 25 Pflaster (Basis) · 9 dunkel innen
// ------------------------------------------------------------------
{
  const _tc = tileColor;
  tileColor = function (W, t, n, r) {
    if (t === 24) return hsl2hex(28, 34, 30 + n * 3);
    if (t === 26) return '#6a665c';
    if (t === 25) return '#4e4740';
    if (t === 9 && (W.kind === 'tower' || W.kind === 'station')) return W.kind === 'station' ? '#03050a' : '#0b0a09';
    return _tc(W, t, n, r);
  };
  const _dtd = drawTileDetail;
  drawTileDetail = function (g, W, t, gx, gy, rng) {
    if (t !== 24 && t !== 25 && t !== 26) return _dtd(g, W, t, gx, gy, rng);
    const T = TILE, quad = (ax, ay, bx, by, col) => { const a = P(ax * T, ay * T, 0), b = P(bx * T, ay * T, 0), c = P(bx * T, by * T, 0), d = P(ax * T, by * T, 0); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = col; g.fill(); };
    if (t === 26) { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) quad(gx + i / 2 + 0.015, gy + j / 2 + 0.015, gx + (i + 1) / 2 - 0.015, gy + (j + 1) / 2 - 0.015, (i + j) % 2 ? hsl2hex(40, 8, 52 + rng() * 5) : hsl2hex(40, 10, 60 + rng() * 5)); if (rng() < 0.25) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(30,24,18,0.3)'; g.beginPath(); g.ellipse(p.x, p.y, 8 + rng() * 10, 3 + rng() * 4, 0, 0, 6.283); g.fill(); } return true; }
    if (t === 24) {
      // Parkett / Dielen mit Abnutzung
      for (let k = 0; k < 4; k++) { const off = (k % 2) * 0.5; for (let s = -1; s < 2; s++) { const a0 = Math.max(0, s + off), a1 = Math.min(1, s + 1 + off); if (a1 - a0 < 0.05) continue; quad(gx + a0 + 0.01, gy + k / 4 + 0.012, gx + a1 - 0.01, gy + (k + 1) / 4 - 0.012, hsl2hex(26 + rng() * 8, 30 + rng() * 10, 30 + rng() * 9)); } }
      if (rng() < 0.3) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.fillStyle = 'rgba(20,14,8,0.35)'; g.beginPath(); g.ellipse(p.x, p.y, 10 + rng() * 14, 4 + rng() * 5, 0, 0, 6.283); g.fill(); }
      return true;
    }
    // Pflaster: versetzte Steine, Fugen, Randsteine & Grasübergang
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const o = (j % 2) * 0.17, a = gx + i / 3 + o - (i === 2 && o ? 0.17 : 0), b = Math.min(gx + 1, gx + (i + 1) / 3 + o);
      if (b - a < 0.06) continue;
      quad(a + 0.02, gy + j / 3 + 0.025, b - 0.02, gy + (j + 1) / 3 - 0.025, hsl2hex(30 + rng() * 14, 7 + rng() * 9, 47 + rng() * 13));
    }
    if (rng() < 0.18) { const p = P((gx + rng()) * T, (gy + rng()) * T, 0); g.strokeStyle = 'rgba(70,110,50,0.75)'; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(p.x + k * 2, p.y); g.lineTo(p.x + k * 2 + (rng() - 0.5) * 3, p.y - 3 - rng() * 4); } g.stroke(); }
    const nb = (dx, dy) => wTile(W, gx + dx, gy + dy), soft = tt => tt === 0 || tt === 2 || tt === 19 || tt === 23;
    const edge = (dx, dy) => {
      const n = nb(dx, dy); if (n === 25) return;
      const x0 = dx === 1 ? gx + 0.84 : gx, x1 = dx === -1 ? gx + 0.16 : gx + 1, y0 = dy === 1 ? gy + 0.84 : gy, y1 = dy === -1 ? gy + 0.16 : gy + 1;
      quad(x0, y0, x1, y1, '#b9b2a4'); quad(x0 + (dx ? 0 : 0.02), y0 + (dy ? 0 : 0.02), x1 - (dx ? 0 : 0.02), y1 - (dy ? 0 : 0.02), '#a49d90');
      if (soft(n)) { g.strokeStyle = 'rgba(80,140,60,0.9)'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k < 7; k++) { const f = rng(), px = dx ? (dx > 0 ? gx + 1 : gx) : gx + f, py = dy ? (dy > 0 ? gy + 1 : gy) : gy + f, p = P(px * T, py * T, 0); g.moveTo(p.x, p.y); g.lineTo(p.x + (rng() - 0.5) * 4, p.y - 4 - rng() * 6); } g.stroke(); }
    };
    edge(1, 0); edge(-1, 0); edge(0, 1); edge(0, -1);
    g.lineWidth = 1; return true;
  };
}

// ------------------------------------------------------------------
// 3) BASIS-PFLASTER (innerhalb der Mauern) · eingemauert = keine Spawns
// ------------------------------------------------------------------
const V18_SOFT = { 0: 1, 2: 1, 19: 1, 23: 1 };
function v18ComputeBase() {
  const W = S.mainW, N = W.size, grid = S.mainGrid, h = S.mainB.find(b => b.type === 'hq'), want = new Set(); let enclosed = false;
  if (h) {
    const cx = h.gx + 1, cy = h.gy + 1, RMAX = 26;
    const pass = i => { const t = W.tiles[i]; if (t === 9 || t === 11 || t === 21) return false; const b = grid[i]; return !(b && (b.type === 'wall' || b.type === 'gate')); };
    const seen = new Uint8Array(N * N), q = [cy * N + cx], cells = []; seen[cy * N + cx] = 1; let leak = false;
    while (q.length) {
      const i = q.pop(), x = i % N, y = (i / N) | 0; cells.push(i);
      if (Math.hypot(x - cx, y - cy) > RMAX) { leak = true; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) { leak = true; continue; } const j = ny * N + nx; if (seen[j]) continue; seen[j] = 1; if (pass(j)) q.push(j); }
    }
    if (!leak) {
      enclosed = true; for (const i of cells) want.add(i);
      for (const b of S.mainB) if (b.type === 'wall' || b.type === 'gate') { const i = b.gy * N + b.gx; for (const d of [1, -1, N, -N]) if (want.has(i + d)) { want.add(i); break; } }
    } else {
      for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) if (Math.hypot(i, j) <= 4.6 + (W.noise(cx + i, cy + j) + 1) * 0.6) { const x = cx + i, y = cy + j; if (x >= 0 && y >= 0 && x < N && y < N) want.add(y * N + x); }
      for (const b of S.mainB) if (Math.hypot(b.gx - cx, b.gy - cy) < 16 && b.type !== 'wall' && b.type !== 'gate') for (let j = b.gy - 1; j <= b.gy + b.h; j++) for (let i = b.gx - 1; i <= b.gx + b.w; i++) if (i >= 0 && j >= 0 && i < N && j < N) want.add(j * N + i);
    }
  }
  const paved = W.v18paved || (W.v18paved = new Map()), chunks = new Set(), mark = i => { const x = i % N, y = (i / N) | 0, ccx = Math.floor(x / CH), ccy = Math.floor(y / CH); for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const X = ccx + a, Y = ccy + b; if (X >= 0 && Y >= 0 && X < W.NC && Y < W.NC) chunks.add(Y * W.NC + X); } };
  for (const i of want) { if (paved.has(i)) continue; const t = W.tiles[i]; if (!V18_SOFT[t]) continue; paved.set(i, t); W.tiles[i] = 25; mark(i);
    const x = i % N, y = (i / N) | 0, ci = chunkIdx(W, (x + 0.5) * TILE, (y + 0.5) * TILE), inC = o => Math.floor(o.x / TILE) === x && Math.floor(o.y / TILE) === y;
    W.grassCh[ci] = W.grassCh[ci].filter(o => !inC(o)); for (const bu of W.chunkObjs[ci].bushes.filter(inC)) v17Remove(W, bu, 'bushes'); }
  for (const [i, t] of [...paved]) if (!want.has(i)) { W.tiles[i] = t; paved.delete(i); mark(i); }
  if (chunks.size) { for (const k of chunks) W.chunks.delete(k); if (S.W === W) GCACHE.incomplete = true; MINI_DIRTY = true; }
  const was = !!W.v18enclosed; W.v18enclosed = enclosed;
  if (enclosed && !was && S.phase === 'play' && S.v18baseInit) { announce('🏰 BASIS GESICHERT', 'Innerhalb deiner Mauern ist gepflastert · Dort entstehen keine Monster mehr', '#7dff5a'); SFX.play('streak'); const hb = h; for (let k = 0; k < 4; k++) S.rings.push({ x: hb.x, y: hb.y, r: 8 + k * 30, max: 700, col: '200,190,170', life: 1 + k * 0.2 }); }
  else if (!enclosed && was && S.phase === 'play' && S.v18baseInit) UI.toast('⚠ Die Basismauer hat eine Lücke – Monster können wieder innen entstehen');
  if (h && !enclosed && !S.v18baseHint && S.phase === 'play' && S.mainB.filter(b => b.type === 'wall').length >= 6) { S.v18baseHint = true; UI.toast('💡 Umschließe dein HQ komplett mit Mauern & Toren – dann wird die ganze Basis gepflastert'); }
  S.v18baseInit = true;
}
{
  const _pb18 = placeBuilding; placeBuilding = function (info, silent, data) { const b = _pb18(info, silent, data); if (S && S.buildings === S.mainB) S.v18baseDirty = 0.25; return b; };
  const _rb18 = removeBuilding; removeBuilding = function (b, refund) { _rb18(b, refund); if (S && S.buildings === S.mainB) S.v18baseDirty = 0.25; };
  const _safe18 = isSafe;
  isSafe = function (x, y) { if (S.where === 'main' && S.mainW.v18enclosed && S.mainW.v18paved) { const i = Math.floor(y / TILE) * S.mainW.size + Math.floor(x / TILE); if (S.mainW.v18paved.has(i)) return true; } return _safe18(x, y); };
}

// ------------------------------------------------------------------
// 4) VERSCHMELZEN: Fundament-Nähte zwischen Gebäuden, Pfeiler an Mauern
// ------------------------------------------------------------------
const V18_FLAT = { wall: 1, gate: 1, pcable: 1, belt: 1 };
function v18SeamScan(b) {
  b.v18seam = []; b.v18pil = '';
  if (b.type === 'wall') { const nb = b.nb || {}; for (const [k, dx, dy] of [['e', 1, 0], ['w', -1, 0], ['s', 0, 1], ['n', 0, -1]]) { if (!nb[k]) continue; const o = gridAt(b.gx + dx, b.gy + dy); if (o && !V18_FLAT[o.type]) b.v18pil += k; } return b.v18pil ? '|P' + b.v18pil : ''; }
  if (V18_FLAT[b.type]) return '';
  const add = (dir, o, a0, a1) => { if (!o || o === b || V18_FLAT[o.type]) return; b.v18seam.push([dir, a0, a1]); };
  let lastE = null, lastS = null;
  for (let j = b.gy; j < b.gy + b.h; j++) { const e = gridAt(b.gx + b.w, j); if (e && e !== lastE) { lastE = e; add('e', e, Math.max(b.gy, e.gy), Math.min(b.gy + b.h, e.gy + e.h)); } }
  for (let i = b.gx; i < b.gx + b.w; i++) { const s = gridAt(i, b.gy + b.h); if (s && s !== lastS) { lastS = s; add('s', s, Math.max(b.gx, s.gx), Math.min(b.gx + b.w, s.gx + s.w)); } }
  return b.v18seam.length ? '|N' + b.v18seam.map(s => s.join('')).join(',') : '';
}
{
  const _ms18 = mergeScan;
  mergeScan = function (b) { const r = _ms18(b); const k = v18SeamScan(b); if (k) b.mkey = (b.mkey || '') + k; return r; };
  const _bp18 = buildingParts;
  buildingParts = function (b, t) {
    const out = _bp18(b, t);
    if (b.type === 'wall' && b.v18pil) {
      const C = wallColorSet(b.level), H = 30 + b.level * 4;
      for (const k of b.v18pil) { const dx = k === 'e' ? 1 : k === 'w' ? -1 : 0, dy = k === 's' ? 1 : k === 'n' ? -1 : 0; out.push([dx * 21, dy * 21, 0, 9, 9, H + 10, C.post], [dx * 21, dy * 21, H + 10, 12, 12, 3, C.top], [dx * 21, dy * 21, 0, 13, 13, 4, C.dark]); }
    }
    if (b.v18seam && b.v18seam.length) {
      const Wd = b.w * TILE, Hd = b.h * TILE, L = Math.min(b.level || 1, 4), base = ['#6e675c', '#7a7d78', '#5d666d', '#3d4f63'][L - 1], cap = ['#8a8274', '#9a9c98', '#7a8288', '#5a6e84'][L - 1];
      for (const [dir, a0, a1] of b.v18seam) {
        const len = (a1 - a0) * TILE - 6; if (len <= 4) continue;
        if (dir === 'e') { const cy = (a0 + a1) / 2 * TILE - b.gy * TILE - Hd / 2; out.push([Wd / 2, cy, 0, 16, len, 7, base], [Wd / 2, cy, 7, 18, len + 2, 1.6, cap], [Wd / 2, cy, 8.6, 4, len - 6, 0.8, '#c9a36b']); for (let k = -1; k <= 1; k += 2) out.push([Wd / 2, cy + k * (len / 2 - 4), 0, 10, 6, 14, base]); }
        else { const cx = (a0 + a1) / 2 * TILE - b.gx * TILE - Wd / 2; out.push([cx, Hd / 2, 0, len, 16, 7, base], [cx, Hd / 2, 7, len + 2, 18, 1.6, cap], [cx, Hd / 2, 8.6, len - 6, 4, 0.8, '#c9a36b']); for (let k = -1; k <= 1; k += 2) out.push([cx + k * (len / 2 - 4), Hd / 2, 0, 6, 10, 14, base]); }
      }
    }
    return out;
  };
}

// ------------------------------------------------------------------
// 5) GEBÄUDE ↔ BODEN: Fundament, Kiesrand, Gras
// ------------------------------------------------------------------
function v18Apron(t) {
  if (S.where !== 'main' && S.where !== 'planet') return;
  const W = S.W, k = VIEW.zoom, dia = (x0, y0, x1, y1) => { const a = P(x0 * TILE, y0 * TILE, 0), b = P(x1 * TILE, y0 * TILE, 0), c = P(x1 * TILE, y1 * TILE, 0), d = P(x0 * TILE, y1 * TILE, 0); G.beginPath(); G.moveTo(a.x, a.y); G.lineTo(b.x, b.y); G.lineTo(c.x, c.y); G.lineTo(d.x, d.y); G.closePath(); };
  for (const b of S.buildings) {
    if (b.type === 'pcable' || b.type === 'belt' || !onScreen(b.x, b.y, 160)) continue;
    const paved = wTile(W, b.gx, b.gy) === 25, wall = b.type === 'wall' || b.type === 'gate', e1 = wall ? 0.14 : 0.32, e2 = wall ? 0.06 : 0.15;
    dia(b.gx - e1, b.gy - e1, b.gx + b.w + e1, b.gy + b.h + e1); G.fillStyle = paved ? 'rgba(40,34,28,0.22)' : 'rgba(52,40,26,0.30)'; G.fill();
    dia(b.gx - e2, b.gy - e2, b.gx + b.w + e2, b.gy + b.h + e2); G.fillStyle = paved ? 'rgba(160,154,142,0.55)' : 'rgba(128,116,96,0.62)'; G.fill();
    if (wall) continue;
    const rng = mulberry32(b.id * 977 + 13);
    for (let i = 0; i < 10; i++) { const s = rng(), side = Math.floor(rng() * 4), off = -e2 + rng() * (e2 - 0.02), px = side === 0 ? b.gx + s * b.w : side === 1 ? b.gx + b.w - off : side === 2 ? b.gx + s * b.w : b.gx + off, py = side === 0 ? b.gy + off : side === 1 ? b.gy + s * b.h : side === 2 ? b.gy + b.h - off : b.gy + s * b.h, p = P(px * TILE, py * TILE, 0); G.fillStyle = rng() < 0.5 ? 'rgba(200,192,176,0.85)' : 'rgba(80,72,62,0.8)'; G.fillRect(p.x - 1.5 * k, p.y - 1 * k, 3 * k, 2 * k); }
    if (!paved) { G.strokeStyle = 'rgba(78,140,58,0.85)'; G.lineWidth = 1.4; G.beginPath(); for (let i = 0; i < 14; i++) { const s = rng(), side = Math.floor(rng() * 4), px = side === 0 ? b.gx - e1 + s * (b.w + 2 * e1) : side === 1 ? b.gx + b.w + e1 : side === 2 ? b.gx - e1 + s * (b.w + 2 * e1) : b.gx - e1, py = side === 0 ? b.gy - e1 : side === 1 ? b.gy - e1 + s * (b.h + 2 * e1) : side === 2 ? b.gy + b.h + e1 : b.gy - e1 + s * (b.h + 2 * e1), p = P(px * TILE, py * TILE, 0); G.moveTo(p.x, p.y); G.lineTo(p.x + (rng() - 0.5) * 4 * k, p.y - (5 + rng() * 7) * k); } G.stroke(); G.lineWidth = 1; }
  }
}

// ------------------------------------------------------------------
// 6) MAUERN ZIEHEN
// ------------------------------------------------------------------
let V18_LASTWALL = null;
function v18WallLine(a, b) {
  const dx = b.gx - a.gx, dy = b.gy - a.gy, out = [];
  if (Math.abs(dx) >= Math.abs(dy)) { const s = Math.sign(dx) || 1; for (let i = 0; i <= Math.min(40, Math.abs(dx)); i++) out.push([a.gx + i * s, a.gy]); }
  else { const s = Math.sign(dy) || 1; for (let i = 0; i <= Math.min(40, Math.abs(dy)); i++) out.push([a.gx, a.gy + i * s]); }
  return out;
}
function v18MouseTile() { const m = screenToWorld(MOUSE.x, MOUSE.y); return { gx: Math.floor(m.x / TILE), gy: Math.floor(m.y / TILE) }; }
addEventListener('mousedown', e => {
  if (!S || S.phase !== 'play' || UI.overlay || !S.build || !S.build.on || e.button !== 0) return;
  if (S.build.sel !== 'wall' && S.build.sel !== 'gate') return;
  if (e.target !== $('game')) return;
  e.stopImmediatePropagation(); SFX.init(); MOUSE.x = e.clientX; MOUSE.y = e.clientY; MOUSE.down = true;
  let st = v18MouseTile();
  if (ACTIV_MOBILE && V18_LASTWALL && performance.now() - V18_LASTWALL.t < 8000 && (st.gx === V18_LASTWALL.gx || st.gy === V18_LASTWALL.gy) && (st.gx !== V18_LASTWALL.gx || st.gy !== V18_LASTWALL.gy)) st = { gx: V18_LASTWALL.gx, gy: V18_LASTWALL.gy };
  S.wallDrag = st;
}, true);
addEventListener('mouseup', e => {
  if (!S || !S.wallDrag) return;
  MOUSE.down = false; const a = S.wallDrag, b = v18MouseTile(), line = v18WallLine(a, b); let n = 0, last = null, why = '';
  for (const [gx, gy] of line) {
    const ex = gridAt(gx, gy); if (ex && (ex.type === 'wall' || ex.type === 'gate')) { last = [gx, gy]; continue; }
    const info = placementInfo((gx + 0.5) * TILE, (gy + 0.5) * TILE);
    if (info.ok) { placeBuilding(info); n++; last = [gx, gy]; } else if (!why) why = info.why;
    if (!info.ok && /Material/.test(info.why || '')) break;
  }
  S.wallDrag = null; S.build.lastTile = -1;
  if (last) V18_LASTWALL = { gx: last[0], gy: last[1], t: performance.now() };
  if (n >= 3) { floater((last[0] + 0.5) * TILE, (last[1] + 0.5) * TILE, '▥ MAUER ×' + n, '#ffd84a', true); SFX.play('streak'); }
  else if (!n) { SFX.play('deny'); if (why) UI.toast(why); }
}, true);
function v18WallGhost(t) {
  if (!S.wallDrag || !S.build.on) return;
  const line = v18WallLine(S.wallDrag, v18MouseTile()), cost = buildCost(S.build.sel); let ok = 0;
  const have = {}; for (const k in cost) have[k] = S.res[k] || 0;
  for (const [gx, gy] of line) {
    const ex = gridAt(gx, gy), already = ex && (ex.type === 'wall' || ex.type === 'gate'); let good = !already && !ex && wTile(S.W, gx, gy) !== 9 && wTile(S.W, gx, gy) !== 11 && wTile(S.W, gx, gy) !== 21;
    if (good) { for (const k in cost) if (have[k] < cost[k]) good = false; if (good) { for (const k in cost) have[k] -= cost[k]; ok++; } }
    tileDiamond(gx, gy, 1, 1); G.fillStyle = already ? 'rgba(255,255,255,0.12)' : good ? 'rgba(109,255,90,' + (0.35 + Math.sin(t * 8) * 0.1) + ')' : 'rgba(255,69,69,0.4)'; G.fill();
    G.strokeStyle = good ? '#d8ffb0' : '#ffb0b0'; G.lineWidth = 1.5; G.stroke();
  }
  const [lx, ly] = line[line.length - 1], q = P((lx + 0.5) * TILE, (ly + 0.5) * TILE, 70), txt = '▥ ×' + ok + (ok ? ' · ' + costStr(Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, v * ok]))) : ' · Material fehlt');
  G.font = '900 13px "Trebuchet MS", Arial'; G.textAlign = 'center'; G.lineWidth = 4; G.strokeStyle = 'rgba(0,0,0,0.8)'; G.strokeText(txt, q.x, q.y); G.fillStyle = ok ? '#ffd84a' : '#ff8080'; G.fillText(txt, q.x, q.y); G.lineWidth = 1;
}
{
  const _fu18 = factoryUnderlay;
  factoryUnderlay = function (t) { try { v18Apron(t); } catch (e) { } _fu18(t); try { v18WallGhost(t); } catch (e) { } };
}

// ------------------------------------------------------------------
// 7) MAUSRAD: Waffe wechseln · STRG + Rad = Zoom
// ------------------------------------------------------------------
let V18_WHEEL = 0;
addEventListener('wheel', e => {
  if (!S || S.phase !== 'play' || UI.overlay) return;
  if (e.target !== $('game')) return;
  e.stopImmediatePropagation();
  if (e.ctrlKey) { e.preventDefault(); S.userZoom = clamp(S.userZoom * (e.deltaY > 0 ? 0.88 : 1.14), 0.45, 2.4); return; }
  V18_WHEEL += e.deltaY; if (Math.abs(V18_WHEEL) < 40 && Math.abs(e.deltaY) < 40) return; const dir = V18_WHEEL > 0 ? 1 : -1; V18_WHEEL = 0;
  if (S.build.on) { const O = curOrder(), i = Math.max(0, O.indexOf(S.build.sel)); S.build.sel = O[(i + dir + O.length) % O.length]; }
  else { S.p.slot = (S.p.slot + dir + HOTBAR.length) % HOTBAR.length; S.p.reload = 0; }
  SFX.play('click');
}, { capture: true, passive: false });
for (let i = 0; i < TIPS.length; i++) if (/Mausrad zoomt/.test(TIPS[i])) TIPS[i] = 'Mausrad wechselt die Waffe. STRG + Mausrad zoomt.';

// ------------------------------------------------------------------
// 8) HOCHHÄUSER: begehbar, mehrere Etagen
// ------------------------------------------------------------------
const V18_ROOMS = ['office', 'apartment', 'storage', 'kitchen', 'office', 'apartment', 'lab', 'clinic'];
function v18RollFloorLoot() {
  const loot = [['scrap', RI(5, 12)]];
  if (Math.random() < 0.38) loot.push(['elec', RI(1, 3)]); if (Math.random() < 0.4) loot.push(['ammo', RI(10, 25)]); if (Math.random() < 0.13) loot.push(['meds', 1]);
  if (Math.random() < 0.3) loot.push(['fuel', RI(10, 25)]); if (Math.random() < 0.25) loot.push(['food', RI(1, 3)]); if (Math.random() < 0.35) loot.push(['money', RI(15, 70)]); if (Math.random() < 0.08) loot.push(['mil', 1]);
  return loot;
}
function v18TState(T) {
  if (!T.done) { T.done = []; for (let i = 0; i < T.looted; i++) T.done[i] = true; T.open = {}; T.loot = {}; T.spawned = {}; }
  if (T.looted === 0 && T.done.some(Boolean)) { T.done = []; T.open = {}; T.loot = {}; T.spawned = {}; }
}
function v18IWall(W, gx0, gy0, gx1, gy1, o) {
  const T = TILE;
  if (gy0 === gy1) { const len = (gx1 - gx0) * T + 10; if (len < 12) return; addProp(W, 'iwall', (gx0 + gx1) / 2 * T, gy0 * T, Object.assign({ len, hw: len / 2, hd: 6, ang: 0 }, o)); }
  else { const len = (gy1 - gy0) * T + 10; if (len < 12) return; addProp(W, 'iwall', gx0 * T, (gy0 + gy1) / 2 * T, Object.assign({ len, hw: len / 2, hd: 6, ang: Math.PI / 2 }, o)); }
}
function v18TowerWorld(T, f) {
  v18TState(T);
  const N = 16, W = baseWorld('tower', N, ((T.seed * 31 + f * 977) >>> 0) + 1), rng = W.rng, TT = TILE, top = f === T.floors - 1;
  W.name = T.name.toUpperCase() + ' · ETAGE ' + (f + 1) + '/' + T.floors; W.ambient = 'indoor'; W.tower = T; W.floor = f;
  for (let i = 0; i < N * N; i++) W.tiles[i] = 9;
  const plaster = rpick(rng, ['#d8cfbd', '#c9c2b0', '#b9b2a2', '#cfc6b4', '#a8b0b4']), ruined = T.ruined;
  for (let gy = 2; gy <= 13; gy++) for (let gx = 2; gx <= 13; gx++) setTile(W, gx, gy, (gy === 7 || gy === 8) ? 26 : (gx >= 9 && gy <= 4) ? 18 : 24);
  // Außenwände: Rückwände hoch mit Fenstern, Vorderwände niedrig (Schnitt-Ansicht)
  v18IWall(W, 2, 2, 14, 2, { h: 66, face: 1, win: 1, col: plaster, seed: 1 });
  if (f === 0) { v18IWall(W, 2, 2, 2, 7, { h: 66, face: -1, win: 1, col: plaster, seed: 2 }); v18IWall(W, 2, 9, 2, 14, { h: 66, face: -1, win: 1, col: plaster, seed: 3 }); }
  else v18IWall(W, 2, 2, 2, 14, { h: 66, face: -1, win: 1, col: plaster, seed: 2 });
  v18IWall(W, 2, 14, 14, 14, { h: 12, face: -1, col: plaster, seed: 4 }); v18IWall(W, 14, 2, 14, 14, { h: 12, face: 1, col: plaster, seed: 5 });
  // Innenwände (Flur in der Mitte, 4 Räume)
  for (const y of [7, 9]) { v18IWall(W, 2, y, 4, y, { h: 30, face: y === 7 ? 1 : -1, col: plaster, seed: 6 + y }); v18IWall(W, 5.3, y, 10.4, y, { h: 30, face: y === 7 ? 1 : -1, col: plaster, seed: 7 + y }); v18IWall(W, 11.7, y, 14, y, { h: 30, face: y === 7 ? 1 : -1, col: plaster, seed: 8 + y }); }
  v18IWall(W, 8, 2, 8, 7, { h: 30, face: -1, col: plaster, seed: 20 }); v18IWall(W, 8, 9, 8, 14, { h: 30, face: -1, col: plaster, seed: 21 });
  // Treppen
  W.stUp = top ? null : { x: 12.6 * TT, y: 3.1 * TT }; W.stDn = f > 0 ? { x: 10.1 * TT, y: 3.1 * TT } : null;
  if (W.stUp) addProp(W, 'istairs', W.stUp.x, W.stUp.y, { solid: false, up: 1 });
  if (W.stDn) addProp(W, 'istairs', W.stDn.x, W.stDn.y, { solid: false, up: 0 });
  if (top) addProp(W, 'roofhatch', 12.6 * TT, 3.1 * TT, { hw: 22, hd: 22 });
  if (f === 0) { W.exit = { x: 2.2 * TT, y: 8 * TT }; addProp(W, 'exitdoor', 2.1 * TT, 8 * TT, { solid: false }); W.lightsStatic.push({ x: 2.8 * TT, y: 8 * TT, r: 120, col: '120,255,140', safe: false }); }
  // Räume einrichten
  const rooms = [{ id: 'NW', x0: 2, y0: 2, x1: 8, y1: 7 }, { id: 'SW', x0: 2, y0: 9, x1: 8, y1: 14 }, { id: 'SE', x0: 8, y0: 9, x1: 14, y1: 14 }, { id: 'NE', x0: 8, y0: 4.6, x1: 14, y1: 7 }];
  const put = (kind, x, y, o) => addProp(W, kind, x * TT, y * TT, Object.assign({ seed: Math.floor(rng() * 1e5) }, o));
  const spots = [];
  for (const r of rooms) {
    const th = r.id === 'NE' ? 'office' : rpick(rng, V18_ROOMS), cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2; r.theme = th;
    if (r.id !== 'NE') put('rug', cx, cy, { solid: false, col: rpick(rng, ['#7a3a3a', '#3a5a7a', '#5a6a3a', '#6a4a7a']) });
    if (th === 'office') { put('desk', cx - 1.2, cy - 0.3, { hw: 22, hd: 13 }); put('desk', cx + 1.2, cy + 0.6, { hw: 22, hd: 13 }); put('shelf', r.x0 + 0.6, cy, { hw: 8, hd: 22, ang: Math.PI / 2 }); spots.push([r.x1 - 0.7, r.y0 + 0.8, 'cabinet']); }
    else if (th === 'apartment') { put('bed', r.x0 + 1.3, r.y0 + 1.2, { hw: 26, hd: 15 }); put('sofa', cx + 0.8, r.y1 - 0.9, { hw: 24, hd: 11 }); put('ilamp', r.x1 - 0.6, r.y0 + 0.6, { hw: 5, hd: 5, light: 1 }); spots.push([r.x1 - 0.8, cy, 'locker']); }
    else if (th === 'storage') { for (let k = 0; k < 3; k++) put('shelf', r.x0 + 1 + k * 1.6, r.y0 + 0.6, { hw: 22, hd: 8 }); put('boxes', cx, cy + 0.6, { hw: 16, hd: 14 }); spots.push([r.x1 - 0.8, r.y1 - 0.8, 'chest']); spots.push([r.x0 + 0.8, r.y1 - 0.8, 'chest']); }
    else if (th === 'kitchen') { put('counter', cx, r.y0 + 0.5, { hw: 50, hd: 10 }); put('fridge', r.x1 - 0.6, r.y0 + 0.6, { hw: 10, hd: 10 }); put('table', cx, cy + 0.7, { hw: 18, hd: 18 }); spots.push([r.x0 + 0.7, r.y0 + 0.7, 'cabinet']); }
    else if (th === 'lab') { put('labbench', cx, r.y0 + 0.6, { hw: 46, hd: 12 }); put('server', r.x1 - 0.6, cy, { hw: 10, hd: 12 }); put('server', r.x1 - 0.6, cy + 1.1, { hw: 10, hd: 12 }); spots.push([r.x0 + 0.8, r.y1 - 0.8, 'safe']); }
    else if (th === 'clinic') { put('bed', cx - 1, cy, { hw: 26, hd: 15, med: 1 }); put('medcab', r.x1 - 0.6, r.y0 + 0.7, { hw: 10, hd: 8 }); spots.push([r.x0 + 0.8, r.y0 + 0.8, 'medbox']); }
    put('plant', r.x0 + 0.5, r.y1 - 0.5, { hw: 7, hd: 7 });
    if (ruined || rng() < 0.4) put('debris', r.x0 + 1 + rng() * (r.x1 - r.x0 - 2), r.y0 + 0.8 + rng() * (r.y1 - r.y0 - 1.6), { solid: false });
    W.lightsStatic.push({ x: cx * TT, y: cy * TT, r: 190, col: rpick(rng, ['255,226,170', '255,240,210', '230,240,255']), safe: false, flick: ruined || rng() < 0.3 });
  }
  for (let x = 3; x < 14; x += 3.5) W.lightsStatic.push({ x: x * TT, y: 8 * TT, r: 120, col: '255,230,180', safe: false, flick: rng() < 0.3 });
  // Kisten (Ertrag wie vorher: die Etagen-Beute wird auf die Kisten verteilt)
  const sel = spots.sort(() => rng() - 0.5).slice(0, Math.max(2, Math.min(3, spots.length)));
  if (!T.loot[f] || T.done[f]) { const all = v18RollFloorLoot(); T.loot[f] = sel.map(() => []); all.forEach((it, i) => T.loot[f][i % sel.length].push(it)); T.open[f] = sel.map(() => false); }
  if (!T.done[f]) sel.forEach(([x, y, look], i) => { if (!T.open[f][i]) W.crates.push({ x: x * TT, y: y * TT, rarity: look === 'safe' ? 2 : look === 'medbox' ? 1 : 0, opening: 0, open: false, hold: 0, look, tl: { T, f, i } }); });
  W.spawn = { x: 2.9 * TT, y: 8 * TT };
  finishWorld(W);
  return W;
}
function v18FloorDone(T, f) {
  T.done[f] = true; T.looted = T.done.filter(Boolean).length; S.stats.floors++;
  const p = S.p; floater(p.x, p.y - 20, 'ETAGE ' + (f + 1) + '/' + T.floors + ' DURCHSUCHT', '#ffb020', true); addXp(15 + f * 2, p.x, p.y); SFX.play('streak');
  if (T.looted >= T.floors) { announce('DACH ERREICHT!', T.name + ' komplett geplündert · Legendäre Kiste am Eingang', '#ffb020'); const d = towerDoor(T); S.mainW.crates.push({ x: d.x + 30, y: d.y + 30, rarity: 3, opening: 0, open: false, hold: 0 }); T.restock = S.day + 3; }
  checkMission();
}
{
  const _oc18 = openCrate;
  openCrate = function (c) {
    if (!c.tl) return _oc18(c);
    const { T, f, i } = c.tl, m = perk('loot') ? 2 : 1, loot = (T.loot[f] && T.loot[f][i]) || [['scrap', RI(2, 5)]];
    c.open = true; c.opening = 0.001; S.stats.crates++; SFX.play('crate'); shake(3);
    S.rings.push({ x: c.x, y: c.y, r: 5, max: 90, col: hexToRgbStr(RARITY[c.rarity].col), life: 0.8 }); burst(c.x, c.y, 18, RARITY[c.rarity].col, 18, 180, { up: 1.4 });
    loot.forEach(([k, v], n) => setTimeout(() => { if (S) addRes(k, k === 'frags' ? 1 : Math.round(v * m), c.x, c.y - n * 5); }, 120 + n * 140));
    addXp(6, c.x, c.y);
    T.open[f][i] = true; if (T.open[f].every(Boolean)) v18FloorDone(T, f);
  };
  const _cp18 = crateParts;
  crateParts = function (c) {
    if (!c.look) return _cp18(c);
    const o = c.opening ? Math.min(1, c.opening * 1.5) : 0, out = [], rc = RARITY[c.rarity].col;
    switch (c.look) {
      case 'locker': out.push([0, 0, 0, 14, 16, 40, '#6d7a84'], [0, 0, 40, 15, 17, 2, '#4f5a63'], [7.4, 0, 4, 0.6, 14, 32, '#7f8c96'], [7.8, -5, 22, 0.6, 2, 6, '#c8d0d4']); for (let k = 0; k < 4; k++) out.push([7.8, 3, 30 - k * 3, 0.4, 6, 1, '#3a4248']); if (o) out.push([7 + o * 8, -8 + o * 6, 4, 1, 14, 32, '#7f8c96', o * 1.2]); break;
      case 'cabinet': out.push([0, 0, 0, 16, 16, 30, '#8a8f84'], [0, 0, 30, 17, 17, 2, '#6a6e66']); for (let k = 0; k < 3; k++) out.push([8.2 + (k === 1 ? o * 10 : 0), 0, 3 + k * 9, 0.8, 13, 7, '#9fa59a'], [8.8 + (k === 1 ? o * 10 : 0), 0, 6 + k * 9, 0.4, 5, 1.4, '#c8d0d4']); break;
      case 'safe': out.push([0, 0, 0, 18, 18, 20, '#2f353b'], [9.3, 0, 2, 0.6, 15, 16, '#3d454c'], [9.8, 0, 9, 0.6, 5, 5, '#c8a040'], [0, 0, 20, 19, 19, 2, '#23282d']); if (o) out.push([9 + o * 6, -9 + o * 7, 2, 2, 16, 16, '#3d454c', o * 1.3]); break;
      case 'medbox': out.push([0, 0, 0, 18, 12, 12, '#f2f2f2'], [9.2, 0, 3, 0.6, 3, 7, '#e03030'], [9.2, 0, 5, 0.6, 8, 3, '#e03030'], [0, 0, 12 + o * 10, 19, 13, 2, '#dcdcdc']); break;
      default: out.push([0, 0, 0, 24, 18, 14, '#8b5e34'], [-9, 0, 0, 2.6, 18.6, 14, '#5a3b20'], [9, 0, 0, 2.6, 18.6, 14, '#5a3b20'], [0, 0, 14 + o * 26, 25, 19, 3, '#7a5230']);
    }
    if (!c.open) out.push([0, 0, (c.look === 'locker' ? 44 : c.look === 'cabinet' ? 34 : 24) + Math.sin(performance.now() / 300) * 2, 3, 3, 3, rc]);
    return out;
  };
}
function v18EnterTower(T) {
  if (S.v18fade) return; const p = S.p; if (p.inCar || p.inHeli || p.inShip) return;
  SFX.play('door'); v18Fade(() => v18GoFloor(T, 0, 'in'), '#000', 0.14, 0.32);
}
function v18GoFloor(T, f, how) {
  const W = v18TowerWorld(T, f), from = S.where;
  if (from === 'main') S.v18towerRet = { x: towerDoor(T).x, y: towerDoor(T).y + 36 };
  const sp = how === 'up' ? { x: W.stDn.x, y: W.stDn.y + 66 } : how === 'down' ? { x: W.stUp.x, y: W.stUp.y + 66 } : W.spawn;
  switchWorld('tower', W, sp.x, sp.y); S.v18cd = 0.6; S.zoom = 1.25;
  if (!T.done[f] && !T.spawned[f]) {
    T.spawned[f] = true; const n = 1 + Math.floor(f / 4) + (S.dayness < 0.35 ? 1 : 0);
    for (let k = 0; k < n; k++) for (let tries = 0; tries < 20; tries++) { const x = (2.8 + Math.random() * 10.4) * TILE, y = (2.8 + Math.random() * 10.4) * TILE; if (Math.hypot(x - sp.x, y - sp.y) < 220 || staticHit(x, y, 12) || blockedFor(x, y, 'zombie')) continue; spawnZombie(Math.random() < 0.35 ? 'runner' : 'walker', x, y); S.zombies[S.zombies.length - 1].alert = 12; S.zombies[S.zombies.length - 1].rise = 0; break; }
  }
  const el = $('v18floor'); el.textContent = '🏢 ' + T.name.toUpperCase() + ' · ETAGE ' + (f + 1) + ' / ' + T.floors; el.style.display = 'block';
  if (how === 'in') announce(T.name.toUpperCase(), T.floors + ' Etagen · Treppe im Nordosten · ' + (T.looted ? T.looted + ' schon durchsucht' : 'Kisten öffnen (E halten)'), '#ffb020');
}
function v18ExitTower() {
  const r = S.v18towerRet || { x: 64 * TILE, y: 64 * TILE };
  SFX.play('door');
  v18Fade(() => { switchWorld('main', S.mainW, r.x, r.y); S.v18cd = 0.8; $('v18floor').style.display = 'none'; }, '#000', 0.14, 0.32);
}
function v18TowerTick(dt) {
  S.v18cd = Math.max(0, (S.v18cd || 0) - dt);
  if (S.where !== 'tower' && $('v18floor').style.display !== 'none') $('v18floor').style.display = 'none';
  if (S.phase !== 'play' || S.v18fade || S.v18cd > 0 || UI.overlay) return;
  const p = S.p, W = S.W;
  if (S.where === 'main' && !p.inCar && !p.inHeli && !p.inShip && p.moving > 0.4) {
    for (const pr of neighborProps(W, p.x, p.y)) { if (pr.kind !== 'tower') continue; const d = towerDoor(pr.tower); if (Math.hypot(d.x - p.x, d.y - p.y) < 18) { v18EnterTower(pr.tower); return; } }
  }
  if (S.where === 'tower') {
    const T = W.tower, f = W.floor;
    if (W.exit && Math.hypot(W.exit.x - p.x, W.exit.y - p.y) < 30) { v18ExitTower(); return; }
    if (W.stUp && Math.hypot(W.stUp.x - p.x, W.stUp.y - p.y) < 24) { SFX.play('click'); v18Fade(() => v18GoFloor(T, f + 1, 'up'), '#000', 0.12, 0.26); return; }
    if (W.stDn && Math.hypot(W.stDn.x - p.x, W.stDn.y - p.y) < 24) { SFX.play('click'); v18Fade(() => v18GoFloor(T, f - 1, 'down'), '#000', 0.12, 0.26); return; }
  }
}
{
  const _fi18 = findInteract;
  findInteract = function () {
    const p = S.p;
    if (S.where === 'main' && !p.inCar && !p.inHeli && !p.inShip) for (const pr of neighborProps(S.W, p.x, p.y)) {
      if (pr.kind !== 'tower') continue; const T = pr.tower, d = towerDoor(T); if (Math.hypot(d.x - p.x, d.y - p.y) > 54) continue;
      v18TState(T); return { kind: 'v18tower', T, text: '🚪 E · ' + T.name + ' betreten · ' + T.looted + '/' + T.floors + ' Etagen durchsucht' + (T.looted >= T.floors ? ' (füllt sich in ' + Math.max(1, T.restock - S.day) + ' Tag(en))' : '') };
    }
    if (S.where === 'tower' && !p.inCar) {
      const it = _fi18(); if (it) return it; const W = S.W, T = W.tower, f = W.floor, left = T.open[f] ? T.open[f].filter(x => !x).length : 0;
      return { kind: 'none', text: T.done[f] ? '✔ Etage durchsucht · ' + (W.stUp ? 'Treppe ▲ im Nordosten' : 'oberste Etage') : '📦 Noch ' + left + ' Versteck(e) auf dieser Etage' };
    }
    return _fi18();
  };
  const _di18 = doInteract;
  doInteract = function (it) { if (it.kind === 'v18tower') { v18EnterTower(it.T); return; } _di18(it); };
  const _ad18 = ambientDark;
  ambientDark = function () { if (S.W && S.W.kind === 'tower') return 0.38 + (1 - S.dayness) * 0.3; return _ad18(); };
  const _sg18 = saveGame;
  saveGame = function (auto) {
    if (S && S.where === 'tower' && S.v18towerRet) { const sx = S.p.x, sy = S.p.y, sw = S.where; S.where = 'main'; S.p.x = S.v18towerRet.x; S.p.y = S.v18towerRet.y; try { _sg18(auto); } finally { S.where = sw; S.p.x = sx; S.p.y = sy; } return; }
    _sg18(auto);
  };
}

// ---------- Modelle: Innenräume ----------
{
  const _pp18 = propParts;
  propParts = function (p) {
    const out = [], push = (...a) => out.push(a), rng = mulberry32(p.seed || 1);
    switch (p.kind) {
      case 'iwall': {
        const len = p.len, h = p.h || 30, f = p.face || 1, c = p.col || '#d0c8b8';
        push(0, 0, 0, len, 12, h, c); push(0, 0, h, len + 2, 14, 3, hexShade(c, 0.72)); push(0, f * 6.2, 0, len, 0.8, 4, hexShade(c, 0.55));
        if (h > 40) {
          push(0, f * 6.3, h - 10, len, 0.6, 2, hexShade(c, 0.8));
          if (p.win) for (let x = -len / 2 + 34; x < len / 2 - 20; x += 62) { push(x, f * 6.3, 20, 34, 0.8, 30, '#2a3a4a'); push(x, f * 6.5, 22, 30, 0.5, 26, rng() < 0.3 ? '#6a88a0' : '#9fc4dc'); push(x, f * 6.7, 34, 30, 0.4, 1.4, '#e8e8e8'); push(x, f * 6.6, 19, 38, 2.4, 2, hexShade(c, 0.6)); if (rng() < 0.25) push(x + 6, f * 6.8, 26, 8, 0.4, 12, '#1a2028'); }
          for (let k = 0; k < Math.floor(len / 90); k++) if (rng() < 0.45) { const x = -len / 2 + 30 + rng() * (len - 60); push(x, f * 6.4, 30 + rng() * 10, 18, 0.6, 14, rpick(rng, ['#8a5a3a', '#3a5a7a', '#7a3a3a', '#d9b35a'])); }
          if (rng() < 0.5) { const x = -len / 2 + 20 + rng() * (len - 40); push(x, f * 6.3, 8 + rng() * 30, 3 + rng() * 6, 0.5, 6 + rng() * 10, '#4a4038'); }
        }
        break;
      }
      case 'istairs': {
        const up = p.up;
        if (up) { for (let k = 0; k < 7; k++) push(-18 + k * 6, 0, 0, 6, 34, 4 + k * 5, k % 2 ? '#8a8274' : '#9a9284'); for (const s of [-1, 1]) { push(0, s * 18, 0, 44, 2, 4, '#5a5048'); for (let k = 0; k < 7; k += 2) push(-18 + k * 6, s * 18, 4 + k * 5, 2, 2, 22, '#3a3f44'); push(0, s * 18, 30, 46, 2, 2, '#c8a040', -0.08); } push(26, 0, 36, 3, 30, 10, '#2e8a3e'); push(26.6, 0, 38, 0.4, 24, 6, '#7dff9a'); }
        else { push(0, 0, 0, 44, 38, 0.6, '#14100c'); for (let k = 0; k < 5; k++) push(18 - k * 7, 0, 0.6, 6, 30, 1, k % 2 ? '#3a342c' : '#2a241c'); for (const s of [-1, 1]) push(0, s * 19, 0, 44, 2, 22, '#3a3f44'); push(-24, 0, 26, 3, 30, 10, '#8a3a2a'); push(-24.6, 0, 28, 0.4, 24, 6, '#ffb080'); }
        break;
      }
      case 'roofhatch': push(0, 0, 0, 40, 40, 6, '#5a5e62'); push(0, 0, 6, 30, 30, 2, '#3a3f44'); for (let k = 0; k < 6; k++) push(-12, -15 + k * 6, 8, 2, 2, 30, '#7a7f86'); push(10, 0, 8, 10, 22, 26, '#4a4f55'); break;
      case 'exitdoor': push(0, -26, 0, 6, 6, 52, '#5b3a22'); push(0, 26, 0, 6, 6, 52, '#5b3a22'); push(0, 0, 50, 8, 58, 6, '#5b3a22'); push(4, 0, 56, 4, 30, 9, '#1a2a1a'); push(6.2, 0, 57.5, 0.4, 24, 6, '#5fff8a'); push(14, 0, 0, 26, 34, 0.6, '#6a3a2a'); break;
      case 'rug': push(0, 0, 0, 90 + rng() * 30, 60 + rng() * 20, 0.6, p.col || '#7a3a3a'); push(0, 0, 0.6, 70, 42, 0.3, hexShade(p.col || '#7a3a3a', 1.25)); break;
      case 'desk': push(0, 0, 14, 44, 24, 3, '#8a6a4a'); for (const [x, y] of [[-19, -9], [19, -9], [-19, 9], [19, 9]]) push(x, y, 0, 3, 3, 14, '#5a4a3a'); push(-6, -4, 17, 14, 3, 10, '#1a1a1a'); push(-6, -2.2, 18.5, 12, 0.4, 7, rng() < 0.5 ? '#3fa8e0' : '#1a2a3a'); push(-6, -4, 17, 4, 4, 2, '#2a2a2a'); push(8, 4, 17, 10, 6, 1, '#d8d8d8'); push(0, 18, 0, 12, 12, 10, '#3a4048'); push(0, 22, 10, 12, 3, 12, '#3a4048'); if (rng() < 0.4) push(12, -6, 17, 5, 5, 6, '#e8e0d0'); break;
      case 'shelf': push(0, 0, 0, 44, 14, 2, '#6a6e72'); for (const x of [-21, 21]) push(x, 0, 0, 2, 14, 52, '#5a5e62'); for (let z = 14; z < 52; z += 13) { push(0, 0, z, 44, 14, 1.5, '#7a7f86'); for (let k = 0; k < 4; k++) if (rng() < 0.7) push(-16 + k * 10, 0, z + 1.5, 7 + rng() * 2, 10, 4 + rng() * 6, rpick(rng, ['#8b5e34', '#c0392b', '#3a6a9a', '#d9b35a', '#5a7a3a', '#e8e0d0'])); } break;
      case 'sofa': { const c = rpick(rng, ['#6a3a3a', '#3a4a6a', '#5a5a3a', '#7a5a3a']); push(0, 0, 0, 48, 22, 10, c); push(0, -9, 10, 48, 5, 14, hexShade(c, 0.85)); for (const x of [-22, 22]) push(x, 0, 10, 5, 22, 7, hexShade(c, 0.9)); push(-11, 2, 10, 20, 15, 3, hexShade(c, 1.15)); push(11, 2, 10, 20, 15, 3, hexShade(c, 1.15)); break; }
      case 'bed': { const c = p.med ? '#e8f0f4' : rpick(rng, ['#5a7a9a', '#9a5a5a', '#6a8a5a', '#d9c8a4']); push(0, 0, 0, 52, 30, 8, '#6a4a2a'); push(0, 0, 8, 50, 28, 5, '#e8e4dc'); push(6, 0, 13, 36, 29, 3, c); push(-19, 0, 13, 10, 20, 4, '#ffffff'); push(-26, 0, 0, 3, 30, 22, '#5a3a22'); if (p.med) { push(26, 0, 0, 3, 30, 18, '#c8d0d4'); push(20, 14, 0, 2, 2, 40, '#c8d0d4'); push(20, 14, 38, 8, 3, 8, '#9fe0ff'); } break; }
      case 'ilamp': push(0, 0, 0, 10, 10, 2, '#3a3a3a'); push(0, 0, 2, 2, 2, 46, '#5a5a5a'); push(0, 0, 44, 14, 14, 10, '#f2e0b0'); break;
      case 'boxes': for (let k = 0; k < 5; k++) push(-10 + (k % 3) * 10, -6 + Math.floor(k / 3) * 12, k > 2 ? 12 : 0, 11, 11, 11, rpick(rng, ['#a87a48', '#8b5e34', '#c09060'])); break;
      case 'counter': push(0, 0, 0, 100, 20, 22, '#c8c0b0'); push(0, 0, 22, 102, 22, 3, '#3a3a3a'); for (let k = -4; k <= 4; k += 2) push(k * 10, 10.4, 6, 8, 0.6, 12, '#a8a090'); push(-30, 0, 25, 14, 12, 2, '#9aa0a6'); push(20, 0, 25, 10, 8, 4, '#4a4a4a'); break;
      case 'fridge': push(0, 0, 0, 20, 20, 50, '#e8ecee'); push(10.2, 0, 4, 0.6, 18, 26, '#dfe4e6'); push(10.2, 0, 32, 0.6, 18, 16, '#dfe4e6'); push(10.6, -6, 24, 0.6, 2, 12, '#9aa0a6'); break;
      case 'table': push(0, 0, 14, 36, 36, 3, '#8a6a4a'); push(0, 0, 0, 4, 4, 14, '#5a4a3a'); for (const [x, y] of [[0, -22], [0, 22], [-22, 0], [22, 0]]) { push(x, y, 0, 10, 10, 9, '#6a4a2a'); push(x * 1.2, y * 1.2, 9, 10, 10, 12, '#6a4a2a'); } if (rng() < 0.6) push(4, -3, 17, 6, 6, 5, '#e8e0d0'); break;
      case 'labbench': push(0, 0, 0, 92, 22, 20, '#d8dde0'); push(0, 0, 20, 94, 24, 3, '#2a3a44'); push(-28, 0, 23, 8, 8, 12, '#5fffc0'); push(-16, 0, 23, 5, 5, 8, '#9fe0ff'); push(10, -4, 23, 18, 12, 10, '#3a4048'); push(10, 2.2, 25, 14, 0.4, 6, '#5ff4ff'); push(32, 0, 23, 10, 10, 14, '#b05cff'); break;
      case 'server': push(0, 0, 0, 20, 24, 50, '#1e2228'); for (let z = 6; z < 48; z += 6) { push(10.3, 0, z, 0.6, 20, 4, '#2a3038'); push(10.6, -6, z + 1.5, 0.4, 2, 1.5, rng() < 0.5 ? '#5fff8a' : '#ff5e3a'); } break;
      case 'medcab': push(0, 0, 0, 20, 16, 40, '#f2f2f2'); push(10.2, 0, 22, 0.6, 3, 10, '#e03030'); push(10.2, 0, 25.5, 0.6, 10, 3, '#e03030'); break;
      case 'plant': push(0, 0, 0, 12, 12, 10, '#a0522d'); push(0, 0, 10, 8, 8, 8, '#3f8a3a'); push(2, -2, 16, 10, 6, 10, '#5cb04a', 0.6); push(-2, 2, 16, 6, 10, 12, '#4a9a3e', -0.5); break;
      case 'debris': for (let k = 0; k < 7; k++) push((rng() - 0.5) * 50, (rng() - 0.5) * 40, 0, 6 + rng() * 14, 4 + rng() * 10, 2 + rng() * 5, rpick(rng, ['#8a8274', '#6a6258', '#b0a898', '#5a4a3a']), rng() * 3); push(0, 0, 0, 50, 36, 0.4, '#3a3228'); break;
    }
    if (out.length) return out;
    return _pp18(p);
  };
}
// Hochhaus-Tür von außen: Eingang mit Licht
{
  const _tp18 = towerParts;
  towerParts = function (T) { const out = _tp18(T), d = T.fh * TILE / 2; out.push([0, d + 2, 0, 34, 4, 40, '#3a2a1a'], [0, d + 4.4, 2, 26, 0.6, 34, '#1a1410'], [0, d + 5, 30, 18, 0.6, 5, '#5fff8a'], [0, d + 10, 0, 40, 16, 1, '#6a5a4a']); return out; };
}

// ------------------------------------------------------------------
// 9) TICK
// ------------------------------------------------------------------
{
  const _t18 = v11Tick;
  v11Tick = function (dt) {
    _t18(dt); if (!S || !S.p) return;
    if (S.phase === 'play') {
      if (S.v18baseDirty !== undefined) { S.v18baseDirty -= dt; if (S.v18baseDirty <= 0) { S.v18baseDirty = undefined; try { v18ComputeBase(); } catch (e) { console.warn('Basis', e); } } }
      else if (!S.v18baseInit && S.mainB.length) S.v18baseDirty = 0.1;
      v18TowerTick(dt);
    }
  };
}
TIPS.push('Hochhäuser in Rosthafen kannst du jetzt betreten – Treppe im Nordosten führt nach oben.', 'Umschließe dein HQ komplett mit Mauern: Die Basis wird gepflastert und innen entstehen keine Monster mehr.', 'Mauern: gedrückt halten und ziehen = ganze Mauerwand.', 'Mausrad = Waffe wechseln · STRG + Mausrad = Zoom.');
;

// ===================================================== v18b.js =====================================================

// =====================================================================================
// ACTIV V18 · Teil 2 – Weltraum
//  · Planet ↔ Orbit ohne Ladebildschirm (Wolkendurchflug, weiche Blende)
//  · Orbit: Bojen-Anflugschneise, Satelliten, Wrackfeld, Eis-Asteroiden, Raumverkehr,
//    Kometen, Meteoritenschauer
//  · Andocken: Traktorstrahl, Autopilot, Countdown, Fanfare – dann nahtlos an Bord
//  · Station »Aurora« komplett neu: enge Gänge, Hangar, Brücke, Reaktor, Quartiere,
//    Messe, Technik
// =====================================================================================

// ------------------------------------------------------------------
// 1) NAHTLOSE ÜBERGÄNGE
// ------------------------------------------------------------------
function v18NoLoad(fn, col, tin, tout) {
  return function () {
    if (S && S.v18fade) return;
    const _tr = UI.transition;
    UI.transition = (title, sub, f) => { v18Fade(f, col, tin, tout); };
    try { return fn.apply(this, arguments); } finally { UI.transition = _tr; }
  };
}
goToSpace = v18NoLoad(goToSpace, '#eaf6ff', 0.4, 1.1);
leaveSpace = v18NoLoad(leaveSpace, '#ffc890', 0.35, 1.0);
undockStation = v18NoLoad(undockStation, '#05070c', 0.3, 0.8);

// Wolken beim Steigen/Sinken (über allem, unter dem HUD)
const V18_CLOUDS = []; for (let i = 0; i < 26; i++) V18_CLOUDS.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.2, v: 0.4 + Math.random() * 0.8 });
{
  const _rl18 = renderLighting;
  renderLighting = function (t) {
    _rl18(t);
    const sh = S.ship, p = S.p;
    if (!sh || p.inShip !== sh || S.where === 'space' || S.where === 'station') return;
    const k = clamp((sh.z - 230) / 260, 0, 1); if (k <= 0) return;
    const W = innerWidth, H = innerHeight, vy = (sh.vx + sh.vy) * 0.0004, climb = (KEYS.Space ? 1 : KEYS.KeyC ? -1 : 0);
    for (const c of V18_CLOUDS) {
      c.y += (0.0025 + climb * 0.006) * c.v + vy * 0.2; c.x += (sh.vx - sh.vy) * 0.00012 * c.v;
      if (c.y > 1.2) { c.y = -0.2; c.x = Math.random(); } if (c.y < -0.25) { c.y = 1.15; c.x = Math.random(); } if (c.x > 1.2) c.x = -0.2; if (c.x < -0.2) c.x = 1.2;
      const x = c.x * W, y = c.y * H, r = 160 * c.s * (1 + k);
      const gr = G.createRadialGradient(x, y, r * 0.1, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,' + 0.55 * k + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      G.fillStyle = gr; G.beginPath(); G.ellipse(x, y, r * 1.6, r * 0.7, 0, 0, 6.283); G.fill();
    }
    if (k > 0.6) { G.fillStyle = 'rgba(150,200,255,' + (k - 0.6) * 0.4 + ')'; G.fillRect(0, 0, W, H); }
  };
}

// ------------------------------------------------------------------
// 2) ORBIT INTERESSANTER
// ------------------------------------------------------------------
NODE_YIELD.iceroid = ['fuel', 3, 6];
ANIM_PROPS.satellite = 1; ANIM_PROPS.buoy = 1;
{
  const _rp18 = rockParts;
  rockParts = function (n) {
    if (n.kind === 'iceroid') return [[0, 0, 0, 26, 22, 18, '#bcdcec'], [-5, 4, 14, 14, 12, 10, '#e4f4fc'], [6, -5, 4, 10, 10, 14, '#9fc8e0'], [8, 6, 0, 8, 8, 8, '#ffffff'], [-2, -2, 24, 6, 6, 4, '#ffffff']];
    return _rp18(n);
  };
}
function v18SpaceExtras(W) {
  const st = W.station, T = TILE, N = W.size, rng = mulberry32(W.seed * 7 + 5), far = (x, y, d) => Math.hypot(x - st.x, y - st.y) > d;
  // Anflugschneise mit Bojen (Osten)
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const x = st.x + 280 + i * 120, y = st.y + s * 80; addProp(W, 'buoy', x, y, { solid: false, seed: i, ph: i * 0.4 }); W.lightsStatic.push({ x, y, r: 70, col: i % 2 ? '95,212,255' : '255,216,74', safe: false, blink: true }); }
  // Satelliten
  for (let k = 0, m = 0; k < 40 && m < 5; k++) { const x = rng() * N * T, y = rng() * N * T; if (!far(x, y, 800) || !freeAt(W, x, y, 60)) continue; addProp(W, 'satellite', x, y, { hw: 34, hd: 34, seed: k, ph: rng() * 6 }); W.lightsStatic.push({ x, y, r: 60, col: '255,80,60', safe: false, blink: true }); m++; }
  // Wrackfeld
  for (let k = 0; k < 40; k++) { const x = rng() * N * T, y = rng() * N * T; if (!far(x, y, 1300) || !freeAt(W, x, y, 160)) continue;
    addProp(W, 'derelict', x, y, { hw: 110, hd: 60, seed: k, ang: rng() * 3 });
    for (let c = 0; c < 4; c++) { const a = rng() * 6.28, d = 150 + rng() * 120; W.crates.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, rarity: c === 0 ? 3 : rng() < 0.5 ? 2 : 1, opening: 0, open: false, hold: 0, space: true }); }
    for (let c = 0; c < 10; c++) { const a = rng() * 6.28, d = 140 + rng() * 260; addNode(W, x + Math.cos(a) * d, y + Math.sin(a) * d, rng() < 0.5 ? 'titanrock' : 'asteroid'); }
    W.lightsStatic.push({ x, y, r: 160, col: '255,110,60', safe: false, flick: true });
    W.zones.push({ id: 'derelict', n: 'WRACK DER »MERIDIAN«', sub: 'Treibende Fracht · Titan im Trümmerfeld · Drohnen in der Nähe', x0: x - 500, y0: y - 500, x1: x + 500, y1: y + 500, col: '#ff9a3c' });
    break; }
  // Eis-Asteroiden (Sprit) und ein Asteroidengürtel
  for (let k = 0, m = 0; k < 200 && m < 18; k++) { const x = rng() * N * T, y = rng() * N * T; if (!far(x, y, 700) || !freeAt(W, x, y, 30)) continue; addNode(W, x, y, 'iceroid'); m++; }
  const a0 = rng() * 6.28; for (let k = 0; k < 46; k++) { const a = a0 + k * 0.045, d = 1250 + Math.sin(k * 0.7) * 80 + rng() * 60, x = st.x + Math.cos(a) * d, y = st.y + Math.sin(a) * d; if (x < 100 || y < 100 || x > N * T - 100 || y > N * T - 100 || !freeAt(W, x, y, 26)) continue; addNode(W, x, y, rng() < 0.25 ? 'titanrock' : 'asteroid'); }
  W.zones.push({ id: 'lane', n: 'ANFLUGSCHNEISE AURORA', sub: 'Den Bojen folgen · E an der Station = Andocken', x0: st.x + 220, y0: st.y - 160, x1: st.x + 1150, y1: st.y + 160, col: '#5fd4ff' });
  // Raumverkehr
  W.traffic = []; for (let k = 0; k < 3; k++) W.traffic.push({ x: rng() * N * T, y: rng() * N * T, a: rng() * 6.28, sp: 120 + rng() * 120, paint: rpick(rng, ['crimson', 'zaun', 'piltover', 'void']), turn: (rng() - 0.5) * 0.1 });
  W.v18met = 60 + rng() * 60;
}
{
  const _msw18 = makeSpaceWorld;
  makeSpaceWorld = function (at) { const W = _msw18(at); try { v18SpaceExtras(W); } catch (e) { console.warn('Orbit', e); } return W; };
  const _ds18 = drawSpace;
  drawSpace = function (W) {
    _ds18(W);
    const sw = innerWidth, sh = innerHeight, t = performance.now() / 1000;
    // Kometen
    for (let k = 0; k < 3; k++) {
      const ph = (t * (0.03 + k * 0.011) + k * 0.37) % 1, x = -200 + ph * (sw + 400), y = sh * (0.1 + k * 0.22) + ph * 160, len = 140 + k * 40;
      const gr = G.createLinearGradient(x, y, x - len, y - len * 0.35); gr.addColorStop(0, 'rgba(220,240,255,0.9)'); gr.addColorStop(1, 'rgba(120,180,255,0)');
      G.strokeStyle = gr; G.lineWidth = 3 - k * 0.6; G.beginPath(); G.moveTo(x, y); G.lineTo(x - len, y - len * 0.35); G.stroke();
      G.fillStyle = '#ffffff'; G.beginPath(); G.arc(x, y, 2.5, 0, 6.283); G.fill();
    }
    // Ferne Schiffe mit Triebwerksspur
    for (let k = 0; k < 4; k++) { const ph = (t * (0.012 + k * 0.004) + k * 0.29) % 1, x = sw * (1.1 - ph * 1.3), y = sh * (0.18 + k * 0.17) - ph * 40; G.fillStyle = 'rgba(200,210,230,0.75)'; G.fillRect(x - 3, y - 1, 6, 2); G.fillStyle = 'rgba(120,220,255,' + (0.5 + Math.sin(t * 9 + k) * 0.3) + ')'; G.fillRect(x + 3, y - 0.5, 8 + Math.sin(t * 7 + k) * 3, 1); }
    // Zweiter Mond
    const mx = sw * 0.12 - (VIEW.cx - VIEW.cy) * 0.006, my = sh * 0.2 - (VIEW.cx + VIEW.cy) * 0.004, mr = 34;
    const mg = G.createRadialGradient(mx - 10, my - 10, 2, mx, my, mr); mg.addColorStop(0, '#f0ece4'); mg.addColorStop(1, '#6a6660'); G.fillStyle = mg; G.beginPath(); G.arc(mx, my, mr, 0, 6.283); G.fill();
    G.fillStyle = 'rgba(80,76,70,0.5)'; for (const [dx, dy, r] of [[-8, 6, 6], [10, -4, 4], [4, 12, 3]]) { G.beginPath(); G.arc(mx + dx, my + dy, r, 0, 6.283); G.fill(); }
    G.lineWidth = 1;
  };
}
function v18SpaceTick(dt) {
  const W = S.W; if (S.where !== 'space') return;
  if (W.traffic) for (const s of W.traffic) { s.a += s.turn * dt; s.x += Math.cos(s.a) * s.sp * dt; s.y += Math.sin(s.a) * s.sp * dt; const L = W.size * TILE; if (s.x < -300 || s.y < -300 || s.x > L + 300 || s.y > L + 300) { s.x = L / 2 - Math.cos(s.a) * L * 0.6; s.y = L / 2 - Math.sin(s.a) * L * 0.6; } if (Math.random() < dt * 20) S.particles.push({ x: s.x - Math.cos(s.a) * 50, y: s.y - Math.sin(s.a) * 50, z: 40, vx: -Math.cos(s.a) * 60, vy: -Math.sin(s.a) * 60, vz: 0, life: 0.5, max: 0.5, col: '#7ff4ff', s: 3, grav: 0 }); }
  // Meteoritenschauer
  W.v18met = (W.v18met || 90) - dt;
  if (W.v18met <= 0 && !S.v18metT) { S.v18metT = 9; W.v18met = 80 + Math.random() * 70; announce('☄ METEORITENSCHAUER', 'Neue Titan-Brocken treiben heran · Schild hoch!', '#ff9a3c'); SFX.play('streak'); }
  if (S.v18metT > 0) {
    S.v18metT -= dt; const p = S.p;
    if (Math.random() < dt * 14) { const x = p.x + R(-600, 600) + 500, y = p.y + R(-600, 600) - 500; S.particles.push({ x, y, z: 260, vx: -620, vy: 620, vz: -180, life: 1.3, max: 1.3, col: Math.random() < 0.5 ? '#ffb040' : '#ff7030', s: 6, grav: 0, light: 90 }); }
    if (Math.random() < dt * 1.2 && S.ship && S.ship === p.inShip && Math.random() < 0.3) damageShip(6);
    if (S.v18metT <= 0) { S.v18metT = 0; for (let k = 0; k < 4; k++) { const a = Math.random() * 6.28, d = 260 + Math.random() * 300, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; const n = addNode(W, x, y, Math.random() < 0.6 ? 'titanrock' : 'iceroid'); if (n) { n.sc = 1.3; W.lightsStatic.push({ x, y, r: 90, col: '255,170,90', safe: false, node: n }); burst(x, y, 30, '#ffb040', 20, 200); } } UI.toast('☄ Frische Brocken in deiner Nähe – abbauen mit dem Bordlaser!'); }
  }
  // Andock-Leitlichter pulsieren, wenn man nah ist
  if (W.station && S.p.inShip && Math.hypot(W.station.x - S.p.x, W.station.y - S.p.y) < 900 && !S.v18dock) { S.v18pulse = (S.v18pulse || 0) - dt; if (S.v18pulse <= 0) { S.v18pulse = 0.9; S.rings.push({ x: W.station.x + 250, y: W.station.y, r: 10, max: 90, col: '95,212,255', life: 0.8 }); } }
}
{
  const _fb18 = factoryBoxes;
  factoryBoxes = function (t) {
    _fb18(t);
    if (S.where === 'space' && S.W.traffic) for (const s of S.W.traffic) if (onScreen(s.x, s.y, 200)) addModel(shipParts({ up: { laser: 1, wings: 1 }, paint: s.paint, hp: 300 }, t, { flying: true, thrust: true }), s.x, s.y, 40 + Math.sin(t + s.x) * 4, s.a, 1.05, 1, 400);
  };
  const _pp18b = propParts;
  propParts = function (p) {
    const out = [], push = (...a) => out.push(a), rng = mulberry32(p.seed || 1), t = p.t || 0;
    switch (p.kind) {
      case 'buoy': { const bl = Math.floor(t * 2 + (p.ph || 0)) % 2; push(0, 0, 0, 10, 10, 18, '#5a626a'); push(0, 0, 18, 6, 6, 8, '#3a4048'); push(0, 0, 26, 8, 8, 4, bl ? '#5fd4ff' : '#1a3a4a'); for (let k = 0; k < 3; k++) { const a = k * 2.09; push(Math.cos(a) * 8, Math.sin(a) * 8, 6, 8, 2, 2, '#8a929a', a); } return out; }
      case 'satellite': { const a = t * 0.15 + (p.ph || 0); push(0, 0, 0, 22, 22, 22, '#c8d0d4'); push(0, 0, 22, 18, 18, 3, '#8a929a'); push(11.2, 0, 6, 0.6, 14, 12, '#3a3f44'); for (const s of [-1, 1]) { const cx = Math.cos(a) * s * 42, cy = Math.sin(a) * s * 42; push(cx * 0.45, cy * 0.45, 10, 30, 3, 3, '#8a929a', a); push(cx, cy, 8, 46, 22, 2, '#1e3a6a', a); for (let k = -2; k <= 2; k++) push(cx + Math.cos(a) * k * 9, cy + Math.sin(a) * k * 9, 10, 1, 22, 0.4, '#9fc8e8', a); } push(0, 0, 25, 3, 3, 16, '#9aa6aa'); push(-6, 0, 38, 16, 16, 3, '#e8eef2', 0.4); push(0, 0, 42, 3, 3, 3, Math.floor(t * 2) % 2 ? '#ff3b30' : '#661111'); return out; }
      case 'derelict': { const hull = '#6a7078', dark = '#3a3f44', burn = '#1c1a18'; push(-40, 0, 0, 120, 50, 40, hull, 0); push(-40, 0, 40, 100, 40, 6, dark); for (let k = 0; k < 6; k++) push(-90 + k * 20, 0, 46, 4, 48, 14, '#8a929a'); push(40, 20, 0, 60, 30, 26, hull, 0.4); push(70, 30, 26, 20, 20, 8, burn); push(-110, 0, 6, 30, 40, 30, dark); for (const s of [-1, 1]) push(-110, s * 14, 10, 10, 10, 20, '#2a2f34'); push(-10, -26, 10, 40, 4, 20, burn); push(10, 0, 40, 24, 30, 2, burn); for (let k = 0; k < 8; k++) push((rng() - 0.5) * 220, (rng() - 0.5) * 120, rng() * 30, 6 + rng() * 14, 4 + rng() * 10, 2 + rng() * 4, rng() < 0.5 ? hull : dark, rng() * 3); push(-20, 25.4, 18, 30, 0.6, 8, '#ff9a3c'); return out; }
      case 'swall': {
        const len = p.len, f = p.face || 1, own = p.owned, lc = own ? '#5fd4ff' : '#ff5e3a', hull = '#4a525c', dark = '#2f353d';
        if (!p.tall) { push(0, 0, 0, len, 12, 14, hull); push(0, 0, 14, len + 2, 14, 2, dark); push(0, f * 6.4, 8, len - 6, 0.6, 1.4, lc); return out; }
        push(0, 0, 0, len, 12, 72, hull); push(0, 0, 72, len + 4, 16, 5, dark); push(0, f * 6.2, 0, len, 1, 5, dark);
        push(0, f * 7.2, 52, len, 3, 3, '#7a828a'); push(0, f * 7.8, 58, len, 2.4, 2.4, '#5a626a'); push(0, f * 6.4, 30, len - 4, 0.6, 2, lc);
        for (let x = -len / 2 + 24; x < len / 2 - 8; x += 48) push(x, f * 6.8, 0, 4, 2, 70, '#5a626a');
        if (p.win) for (let x = -len / 2 + 48; x < len / 2 - 30; x += 72) { push(x, f * 6.4, 14, 54, 0.8, 34, '#05070e'); for (let k = 0; k < 4; k++) push(x - 22 + rng() * 44, f * 6.9, 16 + rng() * 30, 1.2, 0.3, 1.2, '#ffffff'); push(x, f * 6.9, 13, 58, 2, 2, '#8a929a'); push(x, f * 6.9, 48, 58, 2, 2, '#8a929a'); }
        else for (let k = 0; k < Math.floor(len / 70); k++) if (rng() < 0.5) { const x = -len / 2 + 30 + rng() * (len - 60); push(x, f * 6.8, 18, 18, 1, 22, '#3a4048'); push(x, f * 7.4, 22, 14, 0.4, 14, own ? '#1f5a7a' : '#5a1f1f'); push(x - 4, f * 7.6, 26, 3, 0.3, 3, lc); }
        return out;
      }
      case 'hangardoor': for (let k = 0; k < 9; k++) push(0, -170 + k * 42, 0, 14, 40, 90, k % 2 ? '#e1b12c' : '#2a2a2a'); push(0, 0, 90, 18, 380, 10, '#3a4048'); push(8, 0, 2, 2, 360, 3, '#ff9a3c'); return out;
      case 'cargo': for (let k = 0; k < 4; k++) push((k % 2) * 30 - 15, Math.floor(k / 2) * 26 - 13, 0, 28, 24, 22, rpick(rng, ['#3a6a9a', '#9a5a3a', '#5a6a3a', '#7a7f86'])); push(-15, -13, 22, 28, 24, 18, '#b84a2a'); return out;
      case 'cchair': push(0, 0, 0, 10, 10, 8, '#3a3f44'); push(0, 0, 8, 22, 20, 6, '#2a2f34'); push(-9, 0, 14, 5, 20, 20, '#2a2f34'); for (const s of [-1, 1]) push(0, s * 11, 14, 18, 3, 6, '#3a4048'); push(6, -11, 20, 6, 2, 1, '#5fd4ff'); return out;
      case 'mtable': push(0, 0, 0, 6, 6, 14, '#5a626a'); push(0, 0, 14, 60, 26, 3, '#8a929a'); for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) push(k * 12, s * 22, 0, 8, 8, 10, '#3a4048'); push(-10, 0, 17, 6, 6, 4, '#e8e0d0'); push(14, 4, 17, 4, 4, 6, '#5fd4ff'); return out;
      case 'dispenser': push(0, 0, 0, 24, 18, 52, '#3a4048'); push(12.2, 0, 26, 0.6, 14, 14, '#1a2a3a'); push(12.6, 0, 30, 0.4, 10, 8, '#7dff9a'); push(12.4, 0, 10, 0.6, 12, 8, '#1a1a1a'); return out;
      case 'genunit': push(0, 0, 0, 40, 30, 34, '#4a525c'); push(0, 0, 34, 42, 32, 3, '#2f353d'); for (let k = -1; k <= 1; k++) push(20.4, k * 8, 8, 0.6, 5, 20, '#5fd4ff'); push(-10, 0, 37, 8, 8, 12, '#7a828a'); push(-10, 0, 49, 10, 10, 2, '#ff9a3c'); return out;
      case 'pipes': for (let k = 0; k < 3; k++) push(0, -10 + k * 10, 0, 8, 8, 60, rpick(rng, ['#7a828a', '#5a6a7a', '#8a7a5a'])); push(0, 0, 60, 10, 32, 6, '#5a626a'); return out;
      case 'slocker': for (let k = 0; k < 3; k++) { push(0, -14 + k * 14, 0, 12, 13, 46, '#5a6a7a'); push(6.2, -14 + k * 14, 26, 0.4, 2, 6, '#c8d0d4'); } return out;
    }
    return _pp18b(p);
  };
}

// ------------------------------------------------------------------
// 3) RAUMSTATION »AURORA« – NEU
// ------------------------------------------------------------------
makeStationWorld = function (owned) {
  const N = 40, W = baseWorld('station', N, 3131), T = TILE, R = {};
  W.name = owned ? 'STATION »AURORA« (DEINE)' : 'VERLASSENE STATION'; W.ambient = 'station'; W.owned = owned;
  for (let i = 0; i < N * N; i++) W.tiles[i] = 9;
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) W.tiles[y * N + x] = t; };
  const room = (id, x0, y0, x1, y1, t) => { R[id] = { x0, y0, x1, y1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 }; fill(x0, y0, x1, y1, t); };
  room('hangar', 3, 24, 15, 36, 8); room('bridge', 16, 3, 28, 9, 10); room('core', 18, 15, 26, 23, 10); room('quarters', 30, 13, 37, 21, 10); room('mess', 30, 26, 37, 33, 10); room('eng', 4, 12, 12, 19, 10);
  const cor = [[16, 29, 22, 30], [21, 24, 22, 28], [21, 10, 22, 14], [27, 18, 29, 19], [33, 22, 34, 25], [13, 18, 17, 19], [7, 20, 8, 23]];
  for (const c of cor) fill(c[0], c[1], c[2], c[3], 18);
  W.rooms = R; W.corridors = cor;
  // Wände automatisch aus dem Grundriss (Rückwände hoch, Vorderwände niedrig)
  const floor = (x, y) => x >= 0 && y >= 0 && x < N && y < N && W.tiles[y * N + x] !== 9;
  const inBridge = (x, y) => x >= R.bridge.x0 && x <= R.bridge.x1 && y >= R.bridge.y0 && y <= R.bridge.y1;
  const runs = (get, along, across) => { for (let a = 0; a < N; a++) { let s = -1; for (let b = 0; b <= N; b++) { const on = b < N && get(a, b); if (on && s < 0) s = b; if (!on && s >= 0) { along(a, s, b - 1); s = -1; } } } };
  runs((y, x) => floor(x, y) && !floor(x, y - 1), (y, x0, x1) => { const len = (x1 - x0 + 1) * T + 10; addProp(W, 'swall', (x0 + x1 + 1) / 2 * T, y * T - 5, { len, hw: len / 2, hd: 6, tall: 1, face: 1, owned, win: inBridge(x0, y) || inBridge(x1, y) ? 1 : 0, seed: x0 * 7 + y }); });
  runs((y, x) => floor(x, y) && !floor(x, y + 1), (y, x0, x1) => { const len = (x1 - x0 + 1) * T + 10; addProp(W, 'swall', (x0 + x1 + 1) / 2 * T, (y + 1) * T + 5, { len, hw: len / 2, hd: 6, tall: 0, face: -1, owned, seed: x0 * 3 + y }); });
  runs((x, y) => floor(x, y) && !floor(x - 1, y), (x, y0, y1) => { const len = (y1 - y0 + 1) * T + 10; addProp(W, 'swall', x * T - 5, (y0 + y1 + 1) / 2 * T, { len, hw: len / 2, hd: 6, ang: Math.PI / 2, tall: 1, face: -1, owned, seed: y0 * 5 + x }); });
  runs((x, y) => floor(x, y) && !floor(x + 1, y), (x, y0, y1) => { const len = (y1 - y0 + 1) * T + 10; addProp(W, 'swall', (x + 1) * T + 5, (y0 + y1 + 1) / 2 * T, { len, hw: len / 2, hd: 6, ang: Math.PI / 2, tall: 0, face: 1, owned, seed: y0 * 9 + x }); });
  const put = (k, x, y, o) => addProp(W, k, x * T, y * T, Object.assign({ owned }, o || {}));
  const lc = owned ? '180,220,255' : '255,110,80';
  // Hangar
  W.shipPad = { x: R.hangar.cx * T - 20, y: R.hangar.cy * T }; put('shipdock', W.shipPad.x / T, W.shipPad.y / T, { solid: false, light: 260, lcol: owned ? '255,210,140' : '255,140,90', safe: false });
  put('hangardoor', 3.25, R.hangar.cy, { solid: false }); put('cargo', 5, 25.4, { hw: 30, hd: 26 }); put('cargo', 13.6, 35.2, { hw: 30, hd: 26, seed: 4 }); put('fueltank', 5, 35, { hw: 22, hd: 22, seed: 31 }); put('fueltank', 6.2, 33.6, { hw: 22, hd: 22, seed: 33 });
  // Brücke
  W.holo = put('holo', R.bridge.cx, 6, { hw: 45, hd: 45, light: 220, lcol: '95,212,255', safe: false });
  for (const [x, y, a] of [[18, 5, 0], [26.2, 5, Math.PI], [18.6, 8.2, 0.4], [25.6, 8.2, Math.PI - 0.4], [20, 3.7, Math.PI / 2], [24.6, 3.7, Math.PI / 2]]) put('console', x, y, { hw: 15, hd: 9, ang: a, light: 70, lcol: owned ? '95,212,255' : '255,120,80', safe: false });
  put('cchair', R.bridge.cx, 8.6, { hw: 10, hd: 10, ang: -Math.PI / 2 });
  // Reaktor
  W.core = put('core', R.core.cx, R.core.cy, { hw: 35, hd: 35, light: 280, lcol: owned ? '95,212,255' : '255,94,58', safe: false });
  for (const [x, y] of [[18.6, 15.6], [26.4, 15.6], [18.6, 23.4], [26.4, 23.4]]) put('genunit', x, y, { hw: 20, hd: 15 });
  put('pipes', 18.4, 19.5, { hw: 6, hd: 16 }); put('pipes', 26.6, 19.5, { hw: 6, hd: 16, seed: 3 });
  // Quartiere
  for (const [x, y] of [[31.3, 14.3], [31.3, 16.6], [31.3, 18.9], [36.6, 14.3], [36.6, 16.6]]) put('bunk', x, y, { hw: 25, hd: 11 });
  put('slocker', 37.4, 20.2, { hw: 8, hd: 22 }); put('table', 34, 19.8, { hw: 18, hd: 18 });
  // Messe
  put('mtable', 32.6, 28.6, { hw: 30, hd: 14 }); put('mtable', 32.6, 31.4, { hw: 30, hd: 14, seed: 2 }); put('dispenser', 37.4, 27.2, { hw: 12, hd: 9 }); put('counter', 35.6, 33.4, { hw: 50, hd: 10 }); put('plant', 30.5, 26.5, { hw: 7, hd: 7 });
  // Technik
  put('genunit', 5.4, 13.4, { hw: 20, hd: 15 }); put('genunit', 5.4, 16.6, { hw: 20, hd: 15, seed: 4 }); put('server', 11.6, 13, { hw: 10, hd: 12 }); put('server', 11.6, 14.2, { hw: 10, hd: 12, seed: 2 }); put('labbench', 9, 19.4, { hw: 46, hd: 12 });
  if (owned && S && S.station && S.station.up && S.station.up.lab) put('labbench', 9, 12.6, { hw: 46, hd: 12, seed: 9 });
  // Licht: Räume + Gänge
  for (const k in R) { const r = R[k]; W.lightsStatic.push({ x: r.cx * T, y: r.cy * T, r: 300, col: lc, safe: false }); }
  for (const c of cor) for (let y = c[1]; y <= c[3]; y += 2) for (let x = c[0]; x <= c[2]; x += 3) W.lightsStatic.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, r: 110, col: lc, safe: false, blink: !owned && (x + y) % 4 === 0 });
  if (!owned) for (const [x, y, r] of [[4.5, 13, 2], [36.5, 20.5, 1], [36.5, 32.5, 2], [17, 4, 3], [25.5, 22.5, 1], [14.5, 25, 1], [8, 18.5, 2]]) W.crates.push({ x: x * T, y: y * T, rarity: r, opening: 0, open: false, hold: 0, space: true });
  W.spawn = { x: 14.2 * T, y: 29.8 * T };
  finishWorld(W); return W;
};
function v18StationCrew(W) {
  const R = W.rooms, spots = [[R.quarters.cx, R.quarters.cy], [R.mess.cx, R.mess.cy], [R.bridge.cx - 2, 7.6], [R.eng.cx, R.eng.cy], [R.core.cx + 2, R.core.cy + 2.5]];
  S.crew.forEach((c, i) => { if (!c.look) c.look = npcLook('spacer'); const [x, y] = spots[i % spots.length]; addNpc(W, x * TILE, y * TILE, 0, c.look, null, c.name, { wander: true, crew: c.role }); });
  for (const n of W.npcs) n.home = { x: n.x, y: n.y };
}
function v18DockArrive() {
  const sh = S.ship, W = makeStationWorld(S.station.owned);
  sh.z = 0; sh.state = 'parked'; sh.vx = sh.vy = 0; S.p.inShip = null; sh.world = 'station'; sh.x = W.shipPad.x; sh.y = W.shipPad.y; sh.a = 0;
  switchWorld('station', W, W.spawn.x, W.spawn.y); sh.world = 'station'; S.v18dock = null;
  if (!S.station.owned) {
    const R = W.rooms, spawn = [['core', 'xbrute'], ['core', 'xeno'], ['core', 'xeno'], ['bridge', 'xeno'], ['bridge', 'xeno'], ['quarters', 'xeno'], ['quarters', 'xeno'], ['mess', 'xeno'], ['mess', 'xbrute'], ['eng', 'xeno'], ['eng', 'xeno']];
    for (const [r, t] of spawn) { const rm = R[r]; spawnZombie(t, (rm.x0 + 1 + Math.random() * (rm.x1 - rm.x0 - 1)) * TILE, (rm.y0 + 1 + Math.random() * (rm.y1 - rm.y0 - 1)) * TILE); }
    announce('STATION BESETZT', 'Kämpf dich durch die Gänge zum Reaktor · Kern hacken (E halten)', '#ff5e3a');
  } else { v18StationCrew(W); announce('STATION »AURORA«', 'Brücke im Norden: Kontrollzentrum · Orbit ' + PLANETS.find(p => p.id === S.station.at).n, '#5fd4ff'); }
}
takeoverStation = function () {
  const near = S.zombies.filter(z => !z.dead && Math.hypot(z.x - S.W.core.x, z.y - S.W.core.y) < 700).length;
  if (near) { UI.toast('⚠ Noch ' + near + ' Xenos in der Nähe des Kerns!'); SFX.play('deny'); return; }
  S.station.owned = true; SFX.play('jackpot'); S.flash = 0.7; S.flashCol = '95,212,255'; shake(12);
  for (let i = 0; i < 4; i++) S.rings.push({ x: S.W.core.x, y: S.W.core.y, r: 10 + i * 30, max: 600, col: '95,212,255', life: 1 + i * 0.2 });
  addXp(600); announce('STATION ÜBERNOMMEN!', 'Sie gehört dir · Die Brücke im Norden steuert die Sprünge', '#5fd4ff');
  setTimeout(() => { if (S && S.where === 'station') v18Fade(() => { const sh = S.ship, W = makeStationWorld(true); switchWorld('station', W, S.p.x, S.p.y); sh.world = 'station'; sh.x = W.shipPad.x; sh.y = W.shipPad.y; v18StationCrew(W); }, '#cfefff', 0.3, 0.8); }, 2200);
};

// ------------------------------------------------------------------
// 4) ANDOCKEN MIT FANFARE
// ------------------------------------------------------------------
dockStation = function () {
  if (S.v18dock || S.v18fade) return; const sh = S.ship, st = S.W.station; if (!st) return;
  S.v18dock = { t: 0, x0: sh.x, y0: sh.y, tx: st.x + 250, ty: st.y, cnt: 3 }; sh.vx = sh.vy = 0;
  SFX.play('holo'); SFX.tone(300, 1.2, 'sine', 0.08, 2.5);
  announce('🛰 ANDOCKVORGANG', 'Traktorstrahl erfasst · Autopilot übernimmt', '#5fd4ff');
};
{
  const _usf18 = updateShipFlight;
  updateShipFlight = function (dt, sh) {
    const d = S.v18dock; if (!d || S.where !== 'space') return _usf18(dt, sh);
    const st = S.W.station; d.t += dt; const k = smoothstep(0, 3.2, d.t);
    sh.x = lerp(d.x0, d.tx, k); sh.y = lerp(d.y0, d.ty, k); sh.a += angDiff(sh.a, Math.PI) * Math.min(1, dt * 3); sh.thrust = d.t < 3.2; sh.vx = sh.vy = 0;
    S.p.x = sh.x; S.p.y = sh.y; S.p.a = sh.a; S.prompt = '🛰 ANDOCKEN …';
    for (let i = 0; i < 3; i++) { const f = Math.random(); S.particles.push({ x: lerp(st.x + 130, sh.x, f) + R(-8, 8), y: lerp(st.y, sh.y, f) + R(-8, 8), z: 30, vx: (sh.x - st.x) * 0.3, vy: (sh.y - st.y) * 0.3, vz: 0, life: 0.35, max: 0.35, col: i ? '#5fd4ff' : '#ffffff', s: 4, grav: 0, light: 50 }); }
    d.pul = (d.pul || 0) - dt; if (d.pul <= 0) { d.pul = 0.35; S.rings.push({ x: d.tx, y: d.ty, r: 10, max: 110, col: '95,212,255', life: 0.5 }); }
    const marks = [0.8, 1.6, 2.4]; for (let i = 0; i < 3; i++) if (d.t >= marks[i] && d.cnt === 3 - i) { d.cnt--; floater(sh.x, sh.y - 40, String(3 - i), '#7ff4ff', true); SFX.tone(600 + i * 200, 0.15, 'square', 0.1); shake(2); }
    if (d.t >= 3.3 && !d.done) {
      d.done = true; S.flash = 0.9; S.flashCol = '160,240,255'; shake(12); SFX.play('dock'); SFX.play('jackpot');
      for (let i = 0; i < 6; i++) S.rings.push({ x: sh.x, y: sh.y, r: 8 + i * 20, max: 420, col: i % 2 ? '255,216,74' : '95,212,255', life: 0.9 + i * 0.15 });
      burst(sh.x, sh.y, 30, '#5fd4ff', 40, 260, { up: 1.5, nograv: true }); burst(sh.x, sh.y, 30, '#ffd84a', 30, 220, { nograv: true });
      announce('✔ ANGEDOCKT!', S.station.owned ? 'Willkommen zurück an Bord, Kommandant' : 'Warnung: Lebenszeichen an Bord …', '#7dff5a');
    }
    if (d.t >= 4.2 && !d.fin) { d.fin = true; SFX.play('door'); v18Fade(v18DockArrive, '#cfefff', 0.35, 0.9); }
  };
}

// ------------------------------------------------------------------
// 5) TICK
// ------------------------------------------------------------------
{
  const _t18b = v11Tick;
  v11Tick = function (dt) { _t18b(dt); if (!S || !S.p || S.phase !== 'play') return; v18SpaceTick(dt); };
}
TIPS.push('Im Orbit: Folge den Bojen zur Station – E = Andocken mit Autopilot.', 'Eis-Asteroiden im All geben Sprit, Titan findest du im Wrackfeld der »Meridian«.', 'Die Station »Aurora« hat eine Brücke im Norden – dort steht das Kontrollzentrum.');
;

// ===================================================== v18c.js =====================================================

// =====================================================================================
// ACTIV V18 · Teil 3 – Icons & Inventar
//  · Jedes Item hat ein eigenes 3D-Icon im Spielstil (auch Waffen, Baupläne, Rucksäcke, Drohnen)
//  · Neues Inventar: Charakter (3D, drehend) · alle Items mit Icons & Infos · Drohnen · Crew
//  · Hotbar mit Waffen-Icons
// =====================================================================================

// ------------------------------------------------------------------
// 1) ICON-MODELLE
// ------------------------------------------------------------------
const V18_ICON = {
  wood: () => [[0, -7, 0, 28, 8, 8, '#8b5e34'], [0, 7, 0, 28, 8, 8, '#7a5230'], [0, 0, 7, 28, 8, 8, '#9a6a3a'], [14.3, -7, 0, 0.6, 7, 7, '#e8c890'], [14.3, 7, 0, 0.6, 7, 7, '#e8c890'], [14.3, 0, 7, 0.6, 7, 7, '#f0d4a0'], [14.6, 0, 10, 0.3, 3, 1, '#a87a48']],
  stone: () => [[0, 0, 0, 20, 18, 12, '#9aa0a6'], [-4, 3, 10, 13, 11, 9, '#b4bac0'], [7, -6, 0, 10, 9, 9, '#7f868c'], [-2, -1, 18, 6, 6, 4, '#c8ced4']],
  scrap: () => { const o = [[0, 0, 0, 24, 18, 3, '#8a8f94'], [3, -3, 3, 14, 12, 3, '#a0522d', 0.4], [0, 0, 6, 11, 11, 3, '#9aa6aa'], [0, 0, 9, 4, 4, 0.5, '#2a2a2a']]; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; o.push([Math.cos(a) * 7.5, Math.sin(a) * 7.5, 6, 4, 4, 3, '#c8d0d4', a]); } return o; },
  food: () => [[0, 0, 0, 18, 14, 10, '#a0522d'], [-1, 0, 10, 13, 10, 3, '#c06a3a'], [11, 0, 4, 10, 4, 4, '#f2ead8'], [16, -2, 3, 4, 4, 6, '#fff8e8'], [16, 2, 3, 4, 4, 6, '#fff8e8']],
  ammo: () => { const o = [[0, 0, 0, 22, 12, 3, '#5a4a3a']]; for (let i = 0; i < 4; i++) o.push([-7.5 + i * 5, 0, 3, 4, 4, 11, '#d4a017'], [-7.5 + i * 5, 0, 14, 3, 3, 4, '#c0703a']); return o; },
  meds: () => [[0, 0, 0, 22, 16, 13, '#f2f2f2'], [0, 0, 13, 13, 3, 0.6, '#e03030'], [0, 0, 13, 3, 11, 0.6, '#e03030'], [11.2, 0, 3, 0.6, 3, 8, '#e03030'], [11.2, 0, 5.5, 0.6, 9, 3, '#e03030'], [0, 0, 13.6, 9, 3, 3, '#5a5e62']],
  grenades: () => [[0, 0, 0, 11, 11, 13, '#556b2f'], [0, 0, 3.5, 12, 12, 1.5, '#3e4e22'], [0, 0, 8, 12, 12, 1.5, '#3e4e22'], [0, 0, 13, 6, 6, 3, '#7a7f86'], [3, 0, 14, 2, 7, 1.5, '#9aa6aa', 0.3], [-3.5, 0, 15, 4, 0.8, 4, '#c8d0d4']],
  fuel: () => [[0, 0, 0, 20, 9, 22, '#c0392b'], [10.2, 0, 4, 0.6, 7, 14, '#a5302a'], [10.4, 0, 9, 0.4, 2, 6, '#e05040', 0.8], [0, 0, 22, 11, 5, 3, '#a5302a'], [7, 0, 22, 3, 3, 5, '#3a3a3a']],
  elec: () => { const o = [[0, 0, 0, 24, 20, 2, '#1f7a3a'], [0, 0, 2, 11, 11, 3, '#1a1a1a'], [0, 0, 5, 5, 5, 0.4, '#3a3a3a']]; for (let i = 0; i < 4; i++) o.push([-6 + i * 4, 6.5, 2, 1.5, 2.5, 1, '#e1b12c'], [-6 + i * 4, -6.5, 2, 1.5, 2.5, 1, '#e1b12c']); o.push([8, 6, 2, 6, 0.8, 0.4, '#e1b12c'], [-8, -7, 2, 0.8, 6, 0.4, '#e1b12c']); return o; },
  mil: () => [[0, 0, 0, 24, 15, 13, '#556b2f'], [0, 0, 13, 25, 16, 2, '#4b5d3a'], [12.2, 0, 4, 0.6, 6, 6, '#d4c27a'], [12.4, 0, 5.5, 0.4, 3, 3, '#556b2f'], [-12.2, 0, 4, 0.6, 4, 6, '#3e4e22'], [0, 0, 15, 4, 12, 1.5, '#2a2a2a']],
  crystal: () => [[0, 0, 0, 16, 14, 2, '#5a4a6a'], [0, 0, 2, 6, 6, 20, '#d68cff', 0.3], [4, 3, 2, 4, 4, 13, '#b05cff', 0.7], [-4, -2, 2, 4, 4, 11, '#e8b0ff', -0.4], [-1, 4, 2, 3, 3, 8, '#f0d0ff', 0.2]],
  cells: () => [[0, 0, 0, 11, 11, 22, '#2d2d2d'], [0, 0, 9, 11.6, 11.6, 3, '#ffb020'], [0, 0, 22, 5, 5, 2, '#c8d0d4'], [5.9, 0, 14, 0.6, 6, 4, '#ffd84a']],
  titan: () => [[0, 0, 0, 18, 15, 10, '#6a7a86'], [-3, 2, 8, 11, 9, 8, '#9fc8e8'], [5, -3, 4, 6, 6, 9, '#c8e6ff'], [-6, -5, 0, 5, 5, 6, '#8aa8bc']],
  xeno: () => [[0, 0, 0, 11, 11, 3, '#2a3a34'], [0, 0, 3, 9, 9, 15, '#5fffc0'], [0, 0, 18, 10, 10, 3, '#3a4a44'], [1, 1, 8, 3, 3, 3, '#c0ffe8'], [-2, -1, 13, 2, 2, 2, '#c0ffe8']],
  plasma: () => { const o = [[0, 0, 0, 15, 15, 2, '#3a3f44'], [0, 0, 17, 15, 15, 2, '#3a3f44'], [0, 0, 4, 9, 9, 10, '#ff5ef0'], [0, 0, 6, 5, 5, 5, '#ffd0fa']]; for (const [x, y] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) o.push([x, y, 2, 2, 2, 15, '#5a5e62']); return o; },
  void: () => [[0, 0, 0, 14, 12, 2, '#2a2050'], [0, 0, 2, 6, 6, 22, '#8a7cff', 0.5], [3, -2, 2, 4, 4, 14, '#b8b0ff', -0.3], [-3, 3, 2, 3, 3, 10, '#d8d0ff', 0.8]],
  relic: () => [[0, 0, 0, 11, 11, 3, '#b8922a'], [0, 0, 3, 15, 15, 10, '#d9b35a'], [0, 0, 13, 8, 8, 5, '#e8c86a'], [0, 0, 18, 12, 12, 2, '#b8922a'], [7.8, 0, 6, 0.6, 9, 3, '#5fffc0'], [0, 7.8, 6, 9, 0.6, 3, '#5fffc0']],
  money: () => { const o = []; for (let i = 0; i < 5; i++) o.push([-4, 0, i * 2.4, 14, 14, 2.4, i % 2 ? '#e8b923' : '#ffd84a']); for (let i = 0; i < 3; i++) o.push([8, 5, i * 2.4, 12, 12, 2.4, i % 2 ? '#e8b923' : '#ffd84a']); o.push([-4, 0, 12, 6, 2, 0.5, '#b8922a']); return o; },
  frags: () => [[0, 0, 0, 18, 9, 13, '#5a4a3a'], [9.2, -2, 3, 0.6, 6, 7, '#2a2a2a'], [-5, 0, 13, 1.5, 1.5, 14, '#c8d0d4'], [9.2, 4, 9, 0.6, 2, 2, '#ff9a3c'], [9.2, 4, 4, 0.6, 2, 2, '#ffd84a']],
  dpart: () => [[0, 0, 4, 24, 3, 2, '#3a3f44'], [11, 0, 0, 6, 6, 7, '#2a2f34'], [11, 0, 7, 18, 2.4, 0.6, '#9aa6aa', 0.6], [-7, 0, 0, 9, 9, 6, '#5fd4ff'], [-7, 0, 6, 6, 6, 2, '#2a5a7a']],
  blueprint: () => [[0, 0, 0, 22, 16, 1, '#3a6fb8'], [0, -3, 1, 14, 0.6, 0.3, '#e8f2ff'], [0, 1, 1, 14, 0.6, 0.3, '#e8f2ff'], [-4, 4, 1, 6, 4, 0.3, '#e8f2ff'], [11, 0, 1, 3, 17, 3, '#2e5e9a'], [-11, 0, 1, 3, 17, 3, '#2e5e9a']],
  axe: () => { const o = []; weaponParts('axe', { attach: {}, camo: 'std', t: 0 }, o); return o; },
};
function v18BagIcon(t) { const col = ['#6b4f2a', '#6b4f2a', '#8a6a3a', '#4b5d3a', '#3a5a6a'][t] || '#6b4f2a', o = [[0, 0, 0, 14, 18, 20, col], [-1, 0, 16, 15, 18, 5, hexShade(col, 0.75)], [7.3, 0, 4, 0.6, 12, 9, hexShade(col, 0.7)], [7.6, 0, 8, 0.4, 4, 1.5, '#c8a040'], [-7.5, -5, 2, 1, 3, 16, '#3a2a1a'], [-7.5, 5, 2, 1, 3, 16, '#3a2a1a']]; if (t >= 2) o.push([0, -9.5, 4, 8, 1.5, 8, hexShade(col, 0.85)], [0, 9.5, 4, 8, 1.5, 8, hexShade(col, 0.85)]); if (t >= 3) o.push([0, 0, 21, 12, 14, 3, '#8a3a2a']); if (t >= 4) o.push([-7, -8, 0, 2, 2, 28, '#9aa0a6'], [-7, 8, 0, 2, 2, 28, '#9aa0a6'], [-7, 0, 26, 2, 16, 2, '#9aa0a6']); return o; }
const V18_ICACHE = new Map();
function v18IconURL(key) {
  if (V18_ICACHE.has(key)) return V18_ICACHE.get(key);
  let parts = null, ang = -0.55;
  try {
    if (V18_ICON[key]) parts = V18_ICON[key]();
    else if (key.startsWith('w:')) { parts = []; weaponParts(key.slice(2), { attach: {}, camo: 'std', t: 0 }, parts); ang = -0.75; }
    else if (key.startsWith('bag:')) parts = v18BagIcon(+key.slice(4));
    else if (key.startsWith('dr:')) parts = v17DroneParts(key.slice(3), { st: 'active', up: { dmg: 0, armor: 0, eng: 0, spec: 0 }, mod: null }, 0.4);
  } catch (e) { parts = null; }
  if (!parts || !parts.length) parts = [[0, 0, 0, 16, 16, 16, '#7a7f86']];
  const sO = OUTLINE; OUTLINE = true;
  let sp = makeSprite(parts, ang);
  const s = Math.min(170 / sp.cv.width, 170 / sp.cv.height);
  sp = makeSprite(parts.map(q => { const c = q.slice(); for (let i = 0; i < 6; i++) c[i] *= s; return c; }), ang);
  OUTLINE = sO;
  let x0 = 0, y0 = 0, x1 = sp.cv.width, y1 = sp.cv.height;
  try { const d = sp.cv.getContext('2d').getImageData(0, 0, sp.cv.width, sp.cv.height).data; x0 = 1e9; y0 = 1e9; x1 = -1; y1 = -1; for (let y = 0; y < sp.cv.height; y++) for (let x = 0; x < sp.cv.width; x++) if (d[(y * sp.cv.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 < 0) { x0 = 0; y0 = 0; x1 = sp.cv.width; y1 = sp.cv.height; } else { x1++; y1++; } } catch (e) { }
  const cw = x1 - x0, ch = y1 - y0, k = Math.min(58 / cw, 58 / ch);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(sp.cv, x0, y0, cw, ch, (64 - cw * k) / 2, (64 - ch * k) / 2, cw * k, ch * k);
  let url = ''; try { url = cv.toDataURL(); } catch (e) { url = ''; }
  V18_ICACHE.set(key, url); return url;
}
function v18Img(key, sz) { const u = v18IconURL(key); return u ? `<img class="v18ico" src="${u}" width="${sz || 44}" height="${sz || 44}" alt="">` : ''; }

// ------------------------------------------------------------------
// 2) ITEM-INFOS
// ------------------------------------------------------------------
const V18_INFO = {
  wood: 'Baumaterial. Bäume mit der Axt fällen.', stone: 'Baumaterial. Steine und Felsen abbauen.', scrap: 'Für Werkstatt, Munition und Upgrades. Ruinen, Wracks, Eisenadern.',
  food: 'Essen mit G. Farmen, Beerensträucher, Kisten.', ammo: 'Für alle Feuerwaffen. Werkstatt oder Munitionsfabrik.', meds: 'Heilt 55 Leben (Medikit in der Hotbar).',
  grenades: 'Wurfgranate mit großem Explosionsradius.', fuel: 'Treibstoff für Auto & Heli. Kohleadern, Eis-Asteroiden.', elec: 'Elektronik für Technik & Upgrades. Hochhäuser, Kupferadern, Labor-Expedition.',
  mil: 'Militärteile für Waffen. Militärbasis Eisenfalke, Landebahn.', crystal: 'Wurzelkristall. Schluchten, Höhlen, Sumpf-Expedition.', cells: 'Brennstoffzelle. Ölfeld-Expedition, Batteriedepots der Militärbasis.',
  titan: 'Titanerz für Raumschiff & Station. Höhlen, Asteroiden, Wrackfeld.', xeno: 'Xenobiomasse vom Planeten Vyr-7.', plasma: 'Plasmakern vom Vulkanplaneten Korrax.',
  void: 'Leerenkristall von Nimbara.', relic: 'Alien-Relikt von Aurum Prime. Sehr wertvoll.', money: 'Credits.', frags: 'Funkfragment – ein Teil einer alten Funkkarte.', dpart: 'Drohnen-Bauteil für die Kampfdrohne »Falke«.',
};
const V18_CAT = { basic: ['wood', 'stone', 'scrap', 'food', 'fuel'], use: ['ammo', 'meds', 'grenades'], rare: ['elec', 'mil', 'crystal', 'cells', 'titan', 'xeno', 'plasma', 'void', 'relic', 'dpart', 'frags'] };

// ------------------------------------------------------------------
// 3) NEUES INVENTAR
// ------------------------------------------------------------------
(() => {
  const st = document.createElement('style');
  st.textContent = `
  #v14inv .box.v18box{width:min(1280px,97vw);max-height:94vh;overflow:auto;background:radial-gradient(ellipse at 30% 0%,rgba(40,64,48,.97),rgba(6,12,9,.98) 72%)}
  .v18ih{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.v18ih h1{margin:0}
  .v18tabs{display:flex;gap:6px;flex:1;flex-wrap:wrap}.v18tab{padding:7px 12px;border-radius:10px;border:2px solid rgba(255,255,255,.15);background:rgba(0,0,0,.35);color:#d8f0e0;font:900 12px "Trebuchet MS";cursor:pointer}
  .v18tab.act{background:linear-gradient(#ffe27a,#e8b923);color:#1a1a1a;border-color:#fff3c0;box-shadow:0 0 12px rgba(255,216,74,.5)}
  .v18g3{display:grid;grid-template-columns:250px 1fr 270px;gap:14px;margin-top:10px}
  .v18card{background:rgba(0,0,0,.32);border:2px solid rgba(255,255,255,.08);border-radius:16px;padding:10px}
  #v18cv{width:230px;height:270px;display:block;margin:0 auto;border-radius:12px;background:radial-gradient(circle at 50% 70%,#2d5a36,#0e1c12 70%)}
  .v18nm{text-align:center;font:900 18px "Arial Black";margin-top:-34px;position:relative;text-shadow:0 2px 4px #000}
  .v18st{display:grid;grid-template-columns:auto 1fr;gap:3px 8px;font-size:12px;margin-top:10px}.v18st b{color:#ffe066;text-align:right}
  .v18bar{height:7px;border-radius:4px;background:rgba(0,0,0,.5);overflow:hidden;grid-column:1/3;margin-bottom:4px}.v18bar i{display:block;height:100%}
  .v18items{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;align-content:start;max-height:56vh;overflow:auto;padding-right:4px}
  .v18it{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(0,0,0,.25));border:2px solid rgba(255,255,255,.08);border-radius:14px;padding:6px 4px 6px;text-align:center;cursor:default;transition:transform .12s,border-color .12s}
  .v18it:hover{transform:translateY(-3px);border-color:#ffe066}.v18it.zero{opacity:.38;filter:grayscale(.7)}.v18it.rare{border-color:rgba(214,140,255,.45);box-shadow:inset 0 0 18px rgba(176,92,255,.15)}
  .v18it.own{border-color:#7dff5a}.v18it.bp{border-color:#5fd4ff}.v18it.sel{outline:3px solid #ffe066}
  .v18it img{display:block;margin:0 auto;image-rendering:auto;filter:drop-shadow(0 3px 3px rgba(0,0,0,.5))}
  .v18it .c{position:absolute;right:6px;top:4px;font:900 13px "Arial Black";color:#fff;text-shadow:0 1px 2px #000,0 0 6px rgba(0,0,0,.8)}
  .v18it small{display:block;font:900 10px "Trebuchet MS";letter-spacing:.06em;color:#cfe0d3;margin-top:2px;line-height:1.1}
  #v18tip{margin-top:10px;min-height:64px;display:flex;gap:12px;align-items:center;padding:10px;border-radius:14px;background:rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.1);font-size:13px}
  #v18tip b{font:900 16px "Arial Black";display:block}#v18tip p{margin:2px 0;color:#d6eadc}
  .v18dr{display:flex;gap:8px;align-items:center;padding:6px;border-radius:12px;background:rgba(0,0,0,.3);margin-bottom:6px;cursor:pointer;border:2px solid transparent}
  .v18dr:hover{border-color:#5fd4ff}.v18dr canvas{width:96px;height:70px;border-radius:10px;background:radial-gradient(circle at 50% 60%,#1c3a44,#061014 75%)}
  .v18dr b{display:block;font-size:12px}.v18dr small{font-size:10px;color:#9fc4d0}
  .v18cr{display:flex;align-items:center;gap:8px;font-size:12px;padding:4px 6px;border-radius:8px;background:rgba(255,255,255,.04);margin-bottom:4px}
  .v18ico{vertical-align:middle}
  .slot .ic img{width:38px;height:38px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))}.mobile .slot .ic img{width:30px;height:30px}
  .mobile .v18g3{grid-template-columns:1fr}.mobile #v18cv{width:160px;height:180px}.mobile .v18items{max-height:none;grid-template-columns:repeat(auto-fill,minmax(70px,1fr))}
  .mobile .v18it small{font-size:8px}.mobile #v14inv .box.v18box{padding:10px!important}
  `;
  document.head.appendChild(st);
})();
Inv.tab = 'all'; Inv.sel = null; Inv._built = false;
Inv.open = function () {
  if (!S || S.phase !== 'play') return;
  UI.overlay = 'inv'; $('v14inv').classList.remove('hidden'); this._built = false; this.render(); SFX.play('click');
  if (document.pointerLockElement) document.exitPointerLock(); this.loop();
};
Inv.items = function () {
  const r = S.res, out = [], add = (k, o) => out.push(Object.assign({ k }, o));
  const tab = this.tab;
  if (tab === 'all' || tab === 'basic') for (const k of V18_CAT.basic) add(k, { icon: k, n: RES[k].n, c: Math.floor(r[k] || 0), cap: RES[k].cap });
  if (tab === 'all' || tab === 'use') for (const k of V18_CAT.use) add(k, { icon: k, n: RES[k].n, c: Math.floor(r[k] || 0) });
  if (tab === 'all' || tab === 'rare') for (const k of V18_CAT.rare) if (RES[k]) add(k, { icon: k, n: RES[k].n, c: Math.floor(r[k] || 0), rare: true });
  if (tab === 'all' || tab === 'gear') {
    add('w:axe', { icon: 'axe', n: 'Axt', c: '✔', own: true, d: 'Deine treue Axt. Fällen, abbauen, zuschlagen – und Gebäude reparieren.' });
    for (const g of GUNS) { const own = S.unlocked[g], bp = S.bp && S.bp[g]; add('w:' + g, { icon: 'w:' + g, n: WEAPONS[g].n, c: own ? (S.p.mag[g] || 0) + '/' + weaponStat(g).mag : bp ? '📜' : '🔒', own, bp: !own && bp, zero: !own && !bp, d: own ? 'Schaden ' + Math.round(weaponStat(g).dmg) + ' · Magazin ' + weaponStat(g).mag + ' · Klick = ausrüsten' : bp ? 'Bauplan vorhanden – in der Werkstatt (Waffenbank) bauen: ' + costStr(GUN_CRAFT[g].cost) : 'Bauplan fehlt – Kisten durchsuchen (Militärbasis = höhere Chance).' }); }
    for (const g of Object.keys(GUN_CRAFT)) if (S.bp && S.bp[g] && !S.unlocked[g]) add('bp:' + g, { icon: 'blueprint', n: 'Bauplan ' + WEAPONS[g].n, c: '📜', bp: true, d: 'In der Werkstatt baubar: ' + costStr(GUN_CRAFT[g].cost) });
    const b = S.bag || 0; add('bag', { icon: 'bag:' + Math.max(1, b), n: BAGS[b].n, c: '+' + BAGS[b].cap, own: b > 0, zero: !b, d: b ? 'Ausgerüstet · +' + BAGS[b].cap + ' Lagerplatz' : 'Kein Rucksack – unten herstellen oder in Kisten finden.' });
    if (BAGS[b + 1]) add('bagnext', { icon: 'bag:' + (b + 1), n: BAGS[b + 1].n, c: '🧵', zero: !canAfford(BAGS[b + 1].cost), d: 'Herstellen (Klick): ' + costStr(BAGS[b + 1].cost) + ' · +' + BAGS[b + 1].cap + ' Lagerplatz' });
    for (const id of Object.keys(DRONES)) { const d = S.v17.drones[id]; add('dr:' + id, { icon: 'dr:' + id, n: DRONES[id].n.split(' ')[0], c: d.st === 'wreck' ? '🔧' : d.on ? '✔' : '⏸', own: d.st !== 'wreck', zero: d.st === 'wreck', d: DRONES[id].d + (d.st === 'wreck' ? ' · Wrack: ' + DRONES[id].where : ' · Klick = Drohnen-Hangar') }); }
  }
  return out;
};
Inv.render = function () {
  const host = $('v14inv'); if (!host || host.classList.contains('hidden')) return;
  if (!this._built) this.build(); else this.refresh();
};
Inv.build = function () {
  const box = $('v14inv').querySelector('.box'); box.classList.add('v18box');
  const tabs = [['all', 'ALLES'], ['basic', '🪵 ROHSTOFFE'], ['use', '✚ VERBRAUCH'], ['rare', '💎 SELTEN'], ['gear', '⚔ AUSRÜSTUNG']];
  box.innerHTML = `<div class="v18ih"><h1>🎒 INVENTAR</h1><div class="v18tabs">${tabs.map(([k, n]) => `<button class="v18tab ${this.tab === k ? 'act' : ''}" data-it="${k}">${n}</button>`).join('')}</div><button class="btn red" id="v14close">✖ SCHLIESSEN</button></div>
   <div class="v18g3"><div class="v18card"><canvas id="v18cv" width="230" height="270"></canvas><div class="v18nm" id="v18nm"></div><div class="v18st" id="v18st"></div></div>
   <div class="v18card"><div class="v18items" id="v18il"></div><div id="v18tip"></div></div>
   <div class="v18card"><div class="v14sec" style="margin-top:0">🛸 DROHNEN</div><div id="v18dr"></div><div class="v14sec">👥 CREW</div><div id="v18crew"></div></div></div>
   <div class="v14btns" id="v18btns"></div>`;
  $('v14close').onclick = () => Inv.close();
  box.querySelectorAll('[data-it]').forEach(e => e.onclick = () => { this.tab = e.dataset.it; SFX.play('click'); this._built = false; this.render(); });
  // Items
  const list = this.items();
  $('v18il').innerHTML = list.map(it => `<div class="v18it ${it.rare ? 'rare' : ''} ${it.own ? 'own' : ''} ${it.bp ? 'bp' : ''} ${(it.zero || it.c === 0) ? 'zero' : ''}" data-k="${it.k}">${v18Img(it.icon, 48)}<span class="c" data-c="${it.k}">${it.c}</span><small>${it.n.toUpperCase()}</small></div>`).join('');
  this.list = list;
  $('v18il').querySelectorAll('[data-k]').forEach(e => {
    e.onmouseenter = () => this.tip(e.dataset.k); e.onclick = () => this.use(e.dataset.k);
    e.addEventListener('touchstart', () => this.tip(e.dataset.k), { passive: true });
  });
  this.tip(this.sel || (list[0] && list[0].k));
  // Drohnen
  $('v18dr').innerHTML = Object.keys(DRONES).map(id => `<div class="v18dr" data-dr="${id}"><canvas width="96" height="70" id="v18dc_${id}"></canvas><div><b style="color:${DRONES[id].col}">${DRONES[id].icon} ${DRONES[id].n}</b><small id="v18ds_${id}"></small><div class="v18bar" style="margin-top:4px"><i id="v18dh_${id}"></i></div></div></div>`).join('');
  $('v18dr').querySelectorAll('[data-dr]').forEach(e => e.onclick = () => { DroneUI.sel = e.dataset.dr; DroneUI.open(); });
  // Buttons
  const r = S.res, p = S.p;
  $('v18btns').innerHTML = `<button class="btn gold" id="v14eat">🍖 ESSEN (G)</button><button class="btn" id="v14meds">✚ MEDIKIT</button><button class="btn" id="v14sk">🌟 SKILLBAUM (Q)</button><button class="btn" id="v18dro">🛸 DROHNEN (J)</button><button class="btn" id="v14save">💾 SPEICHERN</button><button class="btn" id="v14help">? HILFE</button><button class="btn" id="v14set">⚙ EINSTELLUNGEN</button><button class="btn red" id="v14menu">⌂ HAUPTMENÜ</button>`;
  $('v14eat').onclick = () => { v14Key('KeyF', 'f'); this.refresh(); };
  $('v14meds').onclick = () => { if (S.res.meds > 0 && S.p.hp < S.p.maxHp) { S.res.meds--; S.p.hp = Math.min(S.p.maxHp, S.p.hp + 55); floater(S.p.x, S.p.y, '+55 HP', '#7dff8a', true); SFX.play('pickup'); this.refresh(); } else SFX.play('deny'); };
  $('v14sk').onclick = () => { this.close(); SkillUI.open(); };
  $('v18dro').onclick = () => DroneUI.open();
  $('v14save').onclick = () => { saveGame(false); UI.toast('💾 Gespeichert'); };
  $('v14help').onclick = () => { this.close(); const b = $('pHelp'); if (b) b.click(); };
  $('v14set').onclick = () => { this.close(); const b = $('pSet'); if (b) b.click(); };
  $('v14menu').onclick = () => { saveGame(false); this.close(); const b = $('pMenu'); if (b) b.click(); };
  this._built = true; this.refresh();
};
Inv.tip = function (k) {
  if (!k) return; this.sel = k; const it = (this.list || []).find(x => x.k === k); if (!it) return;
  document.querySelectorAll('#v18il .v18it').forEach(e => e.classList.toggle('sel', e.dataset.k === k));
  const d = it.d || V18_INFO[k] || '', capTxt = it.cap ? ` · Lager max. ${Math.round(S.cap)}` : '';
  $('v18tip').innerHTML = `${v18Img(it.icon, 56)}<div><b>${it.n}</b><p>${d}</p><small style="color:#ffe066">Bestand: ${it.c}${capTxt}</small></div>`;
};
Inv.use = function (k) {
  if (k.startsWith('w:')) { const g = k.slice(2), i = HOTBAR.indexOf(g); if (i >= 0) { S.p.slot = i; SFX.play('click'); UI.toast('⚔ ' + WEAPONS[g].n + ' ausgerüstet'); } else SFX.play('deny'); return; }
  if (k === 'bagnext') { const nb = (S.bag || 0) + 1, nx = BAGS[nb]; if (!nx || !canAfford(nx.cost)) { SFX.play('deny'); return; } pay(nx.cost); v17GiveBag(nb, S.p.x, S.p.y); this._built = false; this.render(); return; }
  if (k.startsWith('dr:')) { DroneUI.sel = k.slice(3); DroneUI.open(); return; }
  if (k === 'food') { v14Key('KeyF', 'f'); this.refresh(); return; }
  if (k === 'meds') { $('v14meds').click(); }
};
Inv.refresh = function () {
  if (!this._built) return; const r = S.res, p = S.p, need = xpNeed();
  for (const it of this.list || []) { if (!RES[it.k]) continue; const v = Math.floor(r[it.k] || 0); const e = document.querySelector(`[data-c="${it.k}"]`); if (e && e.textContent !== String(v)) { e.textContent = v; if (e.parentNode) e.parentNode.classList.toggle('zero', !v); } }
  $('v18nm').textContent = (LOOK.name || 'Survivor').toUpperCase();
  const bar = (v, m, c) => `<div class="v18bar"><i style="width:${clamp(v / m * 100, 0, 100)}%;background:${c}"></i></div>`;
  $('v18st').innerHTML = `<span>❤ Leben</span><b>${Math.ceil(p.hp)}/${p.maxHp}</b>${bar(p.hp, p.maxHp, '#ff6b6b')}<span>🍖 Hunger</span><b>${Math.round(p.hunger)}</b>${bar(p.hunger, 100, '#ffb020')}<span>⭐ Level ${S.level}</span><b>${Math.floor(S.xp)}/${need}</b>${bar(S.xp, need, '#c9a0ff')}<span>₵ Credits</span><b>${fmtMoney(r.money || 0)}</b><span>🌟 Skillpunkte</span><b>${S.skillPts || 0}</b><span>🎒 Lager</span><b>${Math.round(S.cap)}</b><span>☠ Kills</span><b>${S.stats.kills}</b><span>📅 Tag</span><b>${S.day}</b>`;
  for (const id of Object.keys(DRONES)) { const d = S.v17.drones[id], el = $('v18ds_' + id), hb = $('v18dh_' + id); if (!el) continue; const st = dStat(id); el.textContent = d.st === 'wreck' ? '🔧 Wrack · ' + DRONES[id].where : d.st === 'down' ? '💤 Neustart …' : (d.on ? '✔ aktiv' : '⏸ geparkt') + ' · Stufe ' + (d.up.dmg + d.up.armor + d.up.eng + d.up.spec); hb.style.width = (d.st === 'wreck' ? 0 : clamp(d.hp / st.maxHp * 100, 0, 100)) + '%'; hb.style.background = DRONES[id].col; }
  $('v18crew').innerHTML = S.crew.length ? S.crew.map(c => { const post = S.mainB.find(b => b.guard === c.name); return `<div class="v18cr">${CREW_ROLES[c.role] ? CREW_ROLES[c.role].icon : '🧑'} <b>${c.name}</b><small style="margin-left:auto;color:#9fc4d0">${CREW_ROLES[c.role] ? CREW_ROLES[c.role].n : ''}${post ? ' · 🗼' : ''}</small></div>`; }).join('') : '<small class="csub">Noch keine Crew. Notsignale (rote Rauchfackel) erscheinen, sobald du ein Raumschiff hast.</small>';
  const eat = $('v14eat'); if (eat) eat.disabled = !((r.food || 0) > 0 && p.hunger < 100); const md = $('v14meds'); if (md) md.disabled = !((r.meds || 0) > 0 && p.hp < p.maxHp);
};
Inv.loop = function () {
  if (!this.isOpen() || !this._built) { if (this.isOpen()) requestAnimationFrame(() => this.loop()); return; }
  const t = performance.now() / 1000, cv = $('v18cv');
  const sG = G, sV = Object.assign({}, VIEW), sO = OUTLINE;
  try {
    if (cv) {
      const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); G = g; OUTLINE = true; Object.assign(VIEW, { cx: 0, cy: 0, ox: cv.width / 2, oy: cv.height - 70, zoom: 4.4 }); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
      isoEllipse(0, 0, 0, 20, 'rgba(0,0,0,0.35)'); BOXES = []; const tool = currentTool();
      addModel(humanParts(LOOK, { walk: t * 2, moving: 0.12, tool, attach: S.attach[tool] || {}, camo: S.camo[tool] || 'std', t }), 0, 0, 0, t * 0.6, 1); flushBoxes();
    }
    for (const id of Object.keys(DRONES)) { const c = $('v18dc_' + id); if (!c) continue; const g = c.getContext('2d'), d = S.v17.drones[id]; g.clearRect(0, 0, c.width, c.height); G = g; Object.assign(VIEW, { cx: 0, cy: 0, ox: c.width / 2, oy: c.height / 2 + 10, zoom: 1.9 }); g.strokeStyle = 'rgba(0,0,0,0.55)'; BOXES = []; addModel(v17DroneParts(id, d.st === 'wreck' ? { st: 'down', up: d.up, mod: null } : d, t), 0, 0, 8 + Math.sin(t * 2 + id.length) * 2, t * 0.7, 1, d.st === 'wreck' ? 0.55 : 1); flushBoxes(); }
  } catch (e) { }
  G = sG; Object.assign(VIEW, sV); OUTLINE = sO;
  requestAnimationFrame(() => this.loop());
};

// ------------------------------------------------------------------
// 4) HOTBAR-ICONS
// ------------------------------------------------------------------
{
  const _bh18 = UI.buildHotbar;
  UI.buildHotbar = function () {
    _bh18.apply(this, arguments);
    const hb = $('hotbar'); if (!hb || !hb.children) return;
    HOTBAR.forEach((k, i) => { const s = hb.children[i]; if (!s || !s.querySelector) return; const ic = s.querySelector('.ic'); if (!ic) return; const key = k === 'axe' ? 'axe' : k === 'medkit' ? 'meds' : k === 'grenade' ? 'grenades' : 'w:' + k; const u = v18IconURL(key); if (u) ic.innerHTML = `<img src="${u}" alt="">`; });
  };
}
// Drohnen-Hangar: zuletzt gewählte Drohne direkt öffnen
{ const _do18 = DroneUI.open; DroneUI.open = function () { if (Inv.isOpen()) $('v14inv').classList.add('hidden'); _do18.apply(this, arguments); }; }
;

if (ACTIV_MOBILE) {

// ===================================================== mobile.js =====================================================

// ===== ACTIV · mobile.js (zusammengeführt aus: v14m.js, v15m.js) =====

// ----------------------------- v14m.js -----------------------------

// =====================================================================================
// ACTIV MOBILE (iPhone) – Touch-Steuerung. Wird nur von mobile.html geladen (nach v14.js).
//  Linker Stick = laufen · Rechter Stick = zielen + schießen · Tippen im Baumodus = platzieren
//  Alle Tasten als Knöpfe. Simuliert Tastatur- und Mausereignisse für die bestehende Spiellogik.
// =====================================================================================
const IS_MOBILE = true;
document.documentElement.classList.add('mobile');

// ---------------- Eingabe-Simulation ----------------
const MK = {
  down: new Set(),
  key(code, on) {
    if (on === this.down.has(code)) return;
    if (on) this.down.add(code); else this.down.delete(code);
    const key = code.startsWith('Key') ? code.slice(3).toLowerCase() : code.startsWith('Digit') ? code.slice(5) : code === 'Space' ? ' ' : code;
    V14_PASS = true;
    try { dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key, bubbles: true, cancelable: true, shiftKey: this.down.has('ShiftLeft') })); }
    finally { V14_PASS = false; }
  },
  tap(code) { this.key(code, true); setTimeout(() => this.key(code, false), 70); },
  canvas() { return $('game'); },
  mouse(type, x, y, button) {
    const c = this.canvas(); if (!c) return;
    const ev = new MouseEvent(type, { clientX: x, clientY: y, button: button || 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true });
    c.dispatchEvent(ev);
    if (typeof MOUSE !== 'undefined' && MOUSE) { MOUSE.x = x; MOUSE.y = y; }
  },
  wheel(dy) { const c = this.canvas(); if (c) c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, ctrlKey: true, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true, cancelable: true })); },
};
// Echte Tastenereignisse vom Inventar (v14Key) laufen weiter wie gehabt.

// ---------------- UI aufbauen ----------------
(() => {
  const meta = (n, c) => { const m = document.createElement('meta'); m.name = n; m.content = c; document.head.appendChild(m); };
  meta('apple-mobile-web-app-capable', 'yes'); meta('mobile-web-app-capable', 'yes'); meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  const st = document.createElement('style');
  st.textContent = `
  html,body{touch-action:none;-webkit-user-select:none;-webkit-touch-callout:none;overscroll-behavior:none}
  canvas#game{cursor:default}
  /* ---- HUD kompakter ---- */
  .mobile #tl{left:calc(8px + env(safe-area-inset-left))!important;top:calc(6px + env(safe-area-inset-top))!important;width:170px!important;padding:6px 9px!important;border-radius:12px!important;transform-origin:left top}
  .mobile #tl .lbl{font-size:8px}.mobile #tl .bar{height:9px;margin:2px 0 4px}
  .mobile #tr{right:calc(8px + env(safe-area-inset-right))!important;top:calc(6px + env(safe-area-inset-top))!important;gap:4px}
  .mobile #mini{width:96px!important;height:96px!important}
  .mobile #clock{min-width:0!important;padding:4px 8px!important}.mobile #clock .big{font-size:13px}.mobile #clock .sm{font-size:9px}
  .mobile #killfeed{display:none}
  .mobile #mission{left:calc(8px + env(safe-area-inset-left));top:auto;bottom:auto;width:170px;font-size:10px;padding:6px 9px;top:118px}
  .mobile #hotbar{bottom:calc(6px + env(safe-area-inset-bottom))!important;padding:4px;gap:4px;pointer-events:auto}
  .mobile .slot{width:44px;height:44px;border-radius:9px;border-width:2px}.mobile .slot .ic{font-size:17px;line-height:18px}.mobile .slot .nm{display:none}.mobile .slot .k{font-size:8px}.mobile .slot .am{font-size:8px}
  .mobile .slot.act{transform:translateY(-4px) scale(1.06)}
  .mobile #mode,.mobile #streak{display:none}
  .mobile #prompt{bottom:calc(64px + env(safe-area-inset-bottom));font-size:12px;padding:6px 12px;pointer-events:auto}
  .mobile #buildbar{bottom:calc(62px + env(safe-area-inset-bottom));max-width:calc(100vw - 300px);overflow-x:auto;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch}
  .mobile .bcats{flex-wrap:nowrap!important;overflow-x:auto}
  .mobile .bslot{width:54px;flex:0 0 auto}.mobile .bslot .nm{font-size:8px}.mobile .bslot .c{display:none}
  .mobile #buildinfo{bottom:calc(150px + env(safe-area-inset-bottom));font-size:10px;white-space:normal;max-width:70vw}
  .mobile #announce .t{font-size:26px;-webkit-text-stroke:2px #000}.mobile #announce .s{font-size:12px}
  .mobile #toast{top:56px;font-size:12px;padding:6px 14px}
  .mobile #combo{font-size:20px}
  .mobile .box{padding:14px 14px!important;max-height:88vh!important;width:94vw!important}
  .mobile .box h1{font-size:22px!important}
  .mobile .alist{grid-template-columns:1fr 1fr!important;max-height:52vh}
  .mobile .tgrid,.mobile .holo-grid,.mobile #editor .box{grid-template-columns:1fr!important}
  .mobile .tabs{overflow-x:auto;flex-wrap:nowrap}.mobile .tab{flex:0 0 auto;padding:8px 10px;font-size:11px}
  .mobile .btn{padding:10px 14px;font-size:13px}
  .mobile .v12tree{grid-template-columns:1fr!important}
  .mobile .v12steps{grid-template-columns:repeat(5,minmax(80px,1fr));overflow-x:auto}
  .mobile #introHint .t{font-size:18px}
  /* Lobby */
  .mobile .lb-left,.mobile .lb-tip,.mobile .lb-right{display:none!important}
  .mobile .lb-top{height:52px;gap:8px;padding:0 10px}.mobile .lb-logo{font-size:16px}.mobile .lb-nav button{font-size:11px;padding:8px 6px}.mobile .lb-user .lb-uinfo{display:none}
  .mobile .lb-center{top:44px}.mobile #lobbyCv{width:min(70vw,300px)!important;height:auto!important}
  .mobile .lb-name{font-size:20px;margin-top:-30px}
  .mobile .lb-play{width:220px;right:calc(14px + env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom))}.mobile .lb-btn{font-size:22px;padding:12px}
  .mobile .auth-box{width:min(380px,92vw)}
  /* ---- Steuerung ---- */
  #mc{position:fixed;inset:0;z-index:15;pointer-events:none}
  #mc.hidden{display:none}
  .stick{position:absolute;width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.08),rgba(255,255,255,.03));border:2px solid rgba(255,255,255,.22);pointer-events:auto;touch-action:none}
  .stick .nub{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.55),rgba(160,200,170,.35));border:2px solid rgba(255,255,255,.5);box-shadow:0 4px 14px rgba(0,0,0,.45)}
  #stL{left:calc(22px + env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom))}
  #stR{right:calc(22px + env(safe-area-inset-right));bottom:calc(30px + env(safe-area-inset-bottom))}
  #stR .nub{background:radial-gradient(circle at 35% 35%,rgba(255,140,110,.75),rgba(200,60,40,.45))}
  #stR::after{content:"🎯";position:absolute;left:50%;top:-22px;transform:translateX(-50%);font-size:14px;opacity:.75}
  .mb{position:absolute;width:52px;height:52px;border-radius:50%;pointer-events:auto;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;background:rgba(10,22,14,.72);border:2px solid rgba(255,255,255,.28);box-shadow:0 4px 12px rgba(0,0,0,.45);-webkit-tap-highlight-color:transparent;transition:transform .08s}
  .mb small{font-size:7px;letter-spacing:.06em;line-height:8px;margin-top:1px;opacity:.85}
  .mb.on,.mb:active{transform:scale(.9);background:rgba(255,224,102,.85);color:#2a1a00;border-color:#fff3c0}
  .mb.lit{border-color:#ffe066;box-shadow:0 0 14px rgba(255,224,102,.7)}
  .mb.big{width:62px;height:62px;font-size:24px}
  #mbTop{position:absolute;top:calc(6px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:6px;pointer-events:auto}
  #mbTop .mb{position:relative;width:40px;height:40px;font-size:16px}
  #mbBuild{position:absolute;right:calc(170px + env(safe-area-inset-right));bottom:calc(30px + env(safe-area-inset-bottom));display:none;flex-direction:column;gap:6px;pointer-events:auto}
  #mbBuild .mb{position:relative}
  .bmode #mbBuild{display:flex}
  .bmode #stR{opacity:.25;pointer-events:none}
  #mbHint{position:absolute;left:50%;top:calc(52px + env(safe-area-inset-top));transform:translateX(-50%);font-size:11px;font-weight:900;color:#ffe066;text-shadow:0 1px 3px #000;display:none;pointer-events:none}
  .bmode #mbHint{display:block}
  #rotHint{position:fixed;inset:0;z-index:100;background:#0b160f;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#b8ff6a;font-weight:900;font-size:20px;text-align:center;padding:30px}
  @media (orientation:portrait){#rotHint{display:flex}}
  `;
  document.head.appendChild(st);

  const rot = document.createElement('div'); rot.id = 'rotHint'; rot.innerHTML = '<div style="font-size:64px">📱↻</div>Bitte iPhone quer halten<br><small style="color:#a8c4ad;font-size:13px">Tipp: In Safari „Teilen → Zum Home-Bildschirm“ für Vollbild</small>';
  document.body.appendChild(rot);

  const mc = document.createElement('div'); mc.id = 'mc'; mc.className = 'hidden';
  mc.innerHTML = `
    <div class="stick" id="stL"><div class="nub"></div></div>
    <div class="stick" id="stR"><div class="nub"></div></div>
    <div class="mb big" id="bE"  style="right:calc(168px + env(safe-area-inset-right));bottom:calc(118px + env(safe-area-inset-bottom))">E<small>AKTION</small></div>
    <div class="mb"     id="bR"  style="right:calc(178px + env(safe-area-inset-right));bottom:calc(52px + env(safe-area-inset-bottom))">⟳<small>LADEN</small></div>
    <div class="mb"     id="bSl" style="right:calc(118px + env(safe-area-inset-right));bottom:calc(172px + env(safe-area-inset-bottom))">⇄<small>WAFFE</small></div>
    <div class="mb"     id="bSp" style="right:calc(56px + env(safe-area-inset-right));bottom:calc(178px + env(safe-area-inset-bottom))">⤒<small>SPRUNG</small></div>
    <div class="mb"     id="bC"  style="right:calc(4px + env(safe-area-inset-right));bottom:calc(178px + env(safe-area-inset-bottom));display:none">⤓<small>SINKEN</small></div>
    <div class="mb"     id="bSh" style="left:calc(160px + env(safe-area-inset-left));bottom:calc(36px + env(safe-area-inset-bottom))">»<small>SPRINT</small></div>
    <div class="mb"     id="bG"  style="left:calc(160px + env(safe-area-inset-left));bottom:calc(96px + env(safe-area-inset-bottom))">🍖<small>ESSEN</small></div>
    <div id="mbTop">
      <div class="mb" id="bF">🎒</div><div class="mb" id="bB">🔨</div><div class="mb" id="bQ">🌟</div>
      <div class="mb" id="bZi">＋</div><div class="mb" id="bZo">－</div><div class="mb" id="bEsc">✖</div>
    </div>
    <div id="mbBuild">
      <div class="mb" id="bbR">⟳<small>DREHEN</small></div>
      <div class="mb" id="bbT">⇥<small>KATEG.</small></div>
      <div class="mb" id="bbU">⬆<small>UPGRADE</small></div>
      <div class="mb" id="bbH">🔧<small>REPAR.</small></div>
      <div class="mb" id="bbX">✖<small>ABBAU</small></div>
      <div class="mb" id="bbN">🧩<small>ANBAU</small></div>
    </div>
    <div id="mbHint">Tippen = platzieren · Gebäude antippen = auswählen</div>`;
  document.body.appendChild(mc);
})();

// ---------------- Knöpfe ----------------
function mbHold(id, code) {
  const el = $(id); if (!el) return;
  const on = e => { e.preventDefault(); el.classList.add('on'); MK.key(code, true); };
  const off = e => { e.preventDefault(); el.classList.remove('on'); MK.key(code, false); };
  el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off, { passive: false }); el.addEventListener('touchcancel', off, { passive: false });
  el.addEventListener('mousedown', on); el.addEventListener('mouseup', off);
}
function mbTap(id, fn) {
  const el = $(id); if (!el) return;
  const go = e => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 120); fn(); };
  el.addEventListener('touchstart', go, { passive: false }); el.addEventListener('mousedown', go);
}
mbHold('bE', 'KeyE'); mbHold('bSp', 'Space'); mbHold('bC', 'KeyC');
mbTap('bR', () => MK.tap('KeyR'));
mbTap('bG', () => v14Key('KeyF', 'f'));
let SPRINT = false;
mbTap('bSh', () => { SPRINT = !SPRINT; $('bSh').classList.toggle('lit', SPRINT); MK.key('ShiftLeft', SPRINT); });
mbTap('bSl', () => { if (!S || typeof HOTBAR === 'undefined' || !HOTBAR.length) return; const n = (S.p.slot + 1) % HOTBAR.length; MK.tap('Digit' + (n + 1)); });
mbTap('bF', () => { if (!S) return; if (Inv.isOpen()) Inv.close(); else if (UI.overlay) UI.closeAll(); else Inv.open(); });
mbTap('bB', () => MK.tap('KeyB'));
mbTap('bQ', () => { if (!S) return; if (UI.overlay === 'skills') SkillUI.close(); else if (!UI.overlay) SkillUI.open(); });
mbTap('bZi', () => MK.wheel(-120)); mbTap('bZo', () => MK.wheel(120));
mbTap('bEsc', () => { if (!S) return; if (Inv.isOpen()) Inv.close(); else if (UI.overlay === 'skills') SkillUI.close(); else if (UI.overlay) UI.closeAll(); else if (S.build && S.build.on) MK.tap('KeyB'); });
mbTap('bbR', () => MK.tap('KeyR')); mbTap('bbT', () => MK.tap('Tab')); mbTap('bbU', () => MK.tap('KeyU'));
mbTap('bbH', () => MK.tap('KeyH')); mbTap('bbX', () => MK.tap('KeyX')); mbTap('bbN', () => MK.tap('KeyN'));

// ---------------- Sticks ----------------
function makeStick(id, onMove, onEnd) {
  const el = $(id), nub = el.querySelector('.nub'); let tid = null, cx = 0, cy = 0;
  const R0 = 52;
  const pos = t => { let dx = t.clientX - cx, dy = t.clientY - cy; const d = Math.hypot(dx, dy); if (d > R0) { dx *= R0 / d; dy *= R0 / d; } nub.style.transform = `translate(${dx}px,${dy}px)`; onMove(dx / R0, dy / R0); };
  el.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; tid = t.identifier; const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; pos(t); }, { passive: false });
  el.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === tid) pos(t); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === tid) { tid = null; nub.style.transform = ''; onEnd(); } };
  el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
}
// Linker Stick → WASD
makeStick('stL', (x, y) => {
  const T = 0.32; MK.key('KeyW', y < -T); MK.key('KeyS', y > T); MK.key('KeyA', x < -T); MK.key('KeyD', x > T);
  if (!FIRE && !(S && S.build && S.build.on) && Math.hypot(x, y) > 0.3) { const c = playerScreen(), d = Math.hypot(x, y); MK.mouse('mousemove', c.x + x / d * 170, c.y + y / d * 170); }
}, () => { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) MK.key(k, false); });
// Rechter Stick → Zielen + Feuer
let FIRE = false;
function playerScreen() { try { if (S && S.p && typeof P === 'function') { const q = P(S.p.x, S.p.y, 30); if (isFinite(q.x) && isFinite(q.y)) return q; } } catch (e) { } return { x: innerWidth / 2, y: innerHeight / 2 }; }
makeStick('stR', (x, y) => {
  const c = playerScreen(), d = Math.hypot(x, y), r = 170, mx = c.x + x / (d || 1) * r, my = c.y + y / (d || 1) * r;
  MK.mouse('mousemove', mx, my);
  if (d > 0.45 && !FIRE) { FIRE = true; MK.mouse('mousedown', mx, my); }
  else if (d <= 0.3 && FIRE) { FIRE = false; MK.mouse('mouseup', mx, my); }
}, () => { if (FIRE) { FIRE = false; const c = playerScreen(); MK.mouse('mouseup', c.x, c.y); } });

// ---------------- Tippen auf die Spielwelt (Baumodus / Zielen auf Objekte) ----------------
(() => {
  const c = $('game'); if (!c) return;
  let t0 = null;
  c.addEventListener('touchstart', e => {
    if (!S || S.phase !== 'play') return;
    e.preventDefault(); const t = e.changedTouches[0]; t0 = { id: t.identifier, x: t.clientX, y: t.clientY, tm: performance.now() };
    MK.mouse('mousemove', t.clientX, t.clientY);
  }, { passive: false });
  c.addEventListener('touchmove', e => { if (!t0) return; e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === t0.id) MK.mouse('mousemove', t.clientX, t.clientY); }, { passive: false });
  c.addEventListener('touchend', e => {
    if (!t0) return; e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === t0.id) {
      const moved = Math.hypot(t.clientX - t0.x, t.clientY - t0.y), quick = performance.now() - t0.tm < 450;
      if (S && S.build && S.build.on && moved < 18 && quick) { MK.mouse('mousedown', t.clientX, t.clientY); setTimeout(() => MK.mouse('mouseup', t.clientX, t.clientY), 40); }
      t0 = null;
    }
  }, { passive: false });
})();

// ---------------- Sichtbarkeit / Kontext ----------------
setInterval(() => {
  const mc = $('mc'); if (!mc) return;
  const hud = $('hud'), playing = S && (S.phase === 'play' || S.phase === 'dead') && hud && !hud.classList.contains('hidden');
  mc.classList.toggle('hidden', !playing || !!UI.overlay);
  if (!S) return;
  document.body.classList.toggle('bmode', !!(S.build && S.build.on));
  const flying = S.p && (S.p.inHeli || S.p.inShip);
  $('bC').style.display = flying ? 'flex' : 'none';
  $('bSp').querySelector('small').textContent = flying ? 'STEIGEN' : 'SPRUNG';
  const pr = $('prompt'); $('bE').classList.toggle('lit', !!(pr && !pr.classList.contains('hidden')));
  const g = S.res && S.res.food > 0 && S.p && S.p.hunger < 100; $('bG').style.opacity = g ? 1 : 0.4;
}, 150);
// Hotbar-Slots direkt antippbar
setInterval(() => {
  const hb = $('hotbar'); if (!hb) return;
  [...hb.children].forEach((el, i) => { if (el._mb) return; el._mb = true; el.addEventListener('touchstart', e => { e.preventDefault(); MK.tap('Digit' + (i + 1)); }, { passive: false }); });
}, 500);
// Kein Zoom durch Doppeltippen / Gesten
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
// Hilfetext anpassen
(() => {
  const h = $('help'); if (!h) return; const k = h.querySelector('.keys');
  if (k) k.innerHTML = '<kbd>LINKER STICK</kbd><span>Laufen / Fahren / Fliegen</span><kbd>RECHTER STICK</kbd><span>Zielen & schießen / schlagen</span><kbd>E</kbd><span>Aktion (gedrückt halten bei Kisten)</span><kbd>⟳</kbd><span>Nachladen</span><kbd>⇄</kbd><span>Waffe wechseln (oder Slot antippen)</span><kbd>» </kbd><span>Sprint an/aus</span><kbd>🍖</kbd><span>Essen</span><kbd>🎒</kbd><span>Inventar</span><kbd>🔨</kbd><span>Baumodus · Tippen = platzieren</span><kbd>🌟</kbd><span>Skillbaum</span><kbd>＋ －</kbd><span>Zoom</span><kbd>✖</kbd><span>Fenster schließen</span>';
})();
TIPS.push('Mobile: Linker Stick laufen, rechter Stick zielen & schießen. 🔨 = bauen, Tippen = platzieren.');
;

// ----------------------------- v15m.js -----------------------------

// =====================================================================================
// ACTIV MOBILE – Feinschliff (wird NACH v14m.js geladen, nur in mobile.html)
//  · Weniger Text: PC-Tastenhinweise raus, kleinere/weniger Einblendungen
//  · Neues Knopf-Layout: Bogen um den rechten Stick, Sprint automatisch (Stick ganz drücken)
//  · Absprung aus dem Flugzeug per Tippen · Landung mit dem linken Stick steuern
//  · Bauen: 1. Tippen = Vorschau, 2. Tippen auf dieselbe Stelle = bauen · kompakte Gebäude-Info
// =====================================================================================

// ---------------- Layout & weniger Text ----------------
(() => {
  const st = document.createElement('style');
  st.textContent = `
  /* --- HUD schlanker --- */
  .mobile #tl{width:132px!important;padding:5px 8px!important}
  .mobile #tl .lbl span:last-child{display:none}
  .mobile #tl .lbl{font-size:7px;letter-spacing:.08em}
  .mobile #tl .bar{height:7px!important;margin:1px 0 3px!important}
  .mobile #mini{width:84px!important;height:84px!important}
  .mobile #clock{padding:2px 7px!important}.mobile #clock .big{font-size:11px}.mobile #clkS,.mobile #clkP{display:none}.mobile #clkW{font-size:8px!important;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mobile #mission,.mobile #report,.mobile #killfeed,.mobile #streak,.mobile #mode,.mobile #buildinfo,.mobile #bSh{display:none!important}
  .mobile #toast{top:calc(50px + env(safe-area-inset-top))!important;font-size:11px!important;padding:5px 12px!important;max-width:46vw!important}
  .mobile #announce{top:16%!important}.mobile #announce .t{font-size:20px!important;-webkit-text-stroke:1.5px #000!important}.mobile #announce .s{font-size:10px!important;max-width:60vw;margin:4px auto 0}
  .mobile #combo{font-size:16px!important}
  .mobile #prompt{font-size:11px!important;padding:5px 12px!important;bottom:calc(60px + env(safe-area-inset-bottom))!important;max-width:44vw;white-space:normal;text-align:center}
  /* --- Hotbar --- */
  .mobile .slot .k{display:none}
  .mobile .slot{width:40px!important;height:40px!important}
  /* --- Baumodus --- */
  .bmode #hotbar,.bmode #prompt,.bmode #bE,.bmode #bR,.bmode #bSl,.bmode #bSp,.bmode #bC,.bmode #stR{display:none!important}
  .mobile #buildbar{bottom:calc(6px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 330px)!important;padding:4px!important;gap:3px!important}
  .mobile .bcats{gap:3px!important;margin-bottom:3px!important}.mobile .bcat{padding:3px 7px!important;font-size:9px!important}.mobile .bcat.hint{display:none}
  .mobile .bslot{width:46px!important;padding:3px 1px!important}.mobile .bslot .k{display:none}.mobile .bslot .ic{font-size:15px}.mobile .bslot .nm{font-size:7px!important;line-height:8px}
  .mobile .bslot.act{transform:translateY(-3px)!important}
  #mbBuild{right:calc(12px + env(safe-area-inset-right))!important;bottom:calc(20px + env(safe-area-inset-bottom))!important;display:none;flex-direction:row!important;flex-wrap:wrap;width:122px;gap:6px!important;justify-content:flex-end}
  .bmode #mbBuild{display:flex!important}
  #mbBuild .mb{width:56px;height:56px}
  #mbHint{font-size:10px!important;top:calc(46px + env(safe-area-inset-top))!important;background:rgba(0,0,0,.45);padding:3px 10px;border-radius:8px}
  /* --- Knöpfe im Bogen um den rechten Stick --- */
  #bE{right:calc(166px + env(safe-area-inset-right))!important;bottom:calc(58px + env(safe-area-inset-bottom))!important}
  #bR{right:calc(150px + env(safe-area-inset-right))!important;bottom:calc(140px + env(safe-area-inset-bottom))!important}
  #bSl{right:calc(80px + env(safe-area-inset-right))!important;bottom:calc(180px + env(safe-area-inset-bottom))!important}
  #bSp{right:calc(14px + env(safe-area-inset-right))!important;bottom:calc(226px + env(safe-area-inset-bottom))!important}
  #bC{right:calc(14px + env(safe-area-inset-right))!important;bottom:calc(168px + env(safe-area-inset-bottom))!important}
  body:not(.flying) #bSp,body:not(.flying) #bC{display:none!important}
  #stL,#stR{width:124px!important;height:124px!important}
  #stL{bottom:calc(24px + env(safe-area-inset-bottom))!important}#stR{bottom:calc(24px + env(safe-area-inset-bottom))!important}
  #stR::after{display:none}
  #stL.sprint{border-color:#ffe066!important;box-shadow:0 0 18px rgba(255,224,102,.55)}
  #stL.sprint .nub{background:radial-gradient(circle at 35% 35%,#fff3c0,#ffb020)!important}
  #mbTop .mb{width:38px!important;height:38px!important;font-size:15px!important}
  #mbTop small{display:none}
  /* --- Intro / Absprung --- */
  .phase-intro #introHint .t,.phase-fall #introHint .t{font-size:18px!important}
  .phase-intro #introHint,.phase-fall #introHint{padding:8px 18px!important;bottom:auto!important;top:calc(14px + env(safe-area-inset-top))!important}
  .phase-intro #introHint .s,.phase-fall #introHint .s{font-size:10px!important}
  .phase-fall #mc.hidden{display:block!important}
  .phase-fall #mc > :not(#stL){display:none!important}
  `;
  document.head.appendChild(st);
  // Essen-Knopf in die obere Leiste
  const g = $('bG'), top = $('mbTop');
  if (g && top) { g.removeAttribute('style'); top.insertBefore(g, $('bB')); }
  const hint = $('mbHint'); if (hint) hint.textContent = 'Tippen = Vorschau · nochmal tippen = bauen · Gebäude antippen = auswählen';
})();

// ---------------- PC-Tastenhinweise aus allen Texten entfernen ----------------
const V15_RX = [
  [/LEERTASTE · ABSPRINGEN/g, 'TIPPEN · ABSPRINGEN'], [/WASD · LANDUNG STEUERN/g, 'LINKER STICK · LANDUNG STEUERN'],
  [/\bE halten · /g, '👆 '], [/(^|\s)E · /g, '$1👆 '], [/\s*\((?:F|G|Q|K|ESC|U|X|H|R|B|E|Klick)\)/g, ''],
  [/\b(?:B|E|F|G|Q|R|U|X|H|K|C|TAB|SHIFT|ESC) = /g, ''], [/LEERTASTE /g, '⤒ '], [/\bC halten/g, '⤓ halten'],
  [/\s*·\s*(?:K|Q|TAB ⇄|TAB Kategorie|Shift\+Rad wechseln|R Drehen)(?=\s|$|·)/g, ''], [/Taste \d+ · /g, ''], [/TAB ⇄/g, ''],
];
function v15Clean(s) { let o = s; for (const [r, w] of V15_RX) o = o.replace(r, w); return o; }
function v15Walk(node) {
  if (node.nodeType === 3) { const t = node.nodeValue, c = v15Clean(t); if (c !== t) node.nodeValue = c; return; }
  if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'CANVAS') return;
  for (const ch of node.childNodes) v15Walk(ch);
}
(() => {
  v15Walk(document.body);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') v15Walk(m.target); else for (const n of m.addedNodes) v15Walk(n); } })
    .observe(document.body, { subtree: true, childList: true, characterData: true });
})();

// ---------------- Absprung per Tippen ----------------
document.addEventListener('touchstart', e => {
  if (!S || S.phase !== 'intro' || UI.overlay) return;
  if (e.target && e.target.closest && e.target.closest('.screen,.mb,.stick')) return;
  e.preventDefault(); if (typeof jump === 'function') jump();
}, { passive: false, capture: true });

// ---------------- Sprint automatisch: linken Stick ganz durchdrücken ----------------
(() => {
  const el = $('stL'); if (!el) return; let tid = null;
  const chk = t => { const r = el.getBoundingClientRect(), d = Math.hypot(t.clientX - (r.left + r.width / 2), t.clientY - (r.top + r.height / 2)) / (r.width / 2 - 10); const on = d > 0.95; el.classList.toggle('sprint', on); MK.key('ShiftLeft', on); };
  el.addEventListener('touchstart', e => { tid = e.changedTouches[0].identifier; chk(e.changedTouches[0]); }, { passive: true });
  el.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === tid) chk(t); }, { passive: true });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === tid) { tid = null; el.classList.remove('sprint'); MK.key('ShiftLeft', false); } };
  el.addEventListener('touchend', end, { passive: true }); el.addEventListener('touchcancel', end, { passive: true });
})();

// ---------------- Bauen: Vorschau-Tippen, dann Bestätigen ----------------
let V15_LAST = null;
(() => {
  const c = $('game'); if (!c) return; let t0 = null;
  document.addEventListener('touchstart', e => { if (!S || !S.build || !S.build.on || e.target !== c) return; const t = e.changedTouches[0]; t0 = { id: t.identifier, x: t.clientX, y: t.clientY, tm: performance.now() }; }, { passive: true, capture: true });
  document.addEventListener('touchend', e => {
    if (!S || !S.build || !S.build.on || e.target !== c || !t0) return;
    e.stopPropagation();                                // altes „sofort bauen“ aus v14m verhindern
    for (const t of e.changedTouches) if (t.identifier === t0.id) {
      const moved = Math.hypot(t.clientX - t0.x, t.clientY - t0.y), quick = performance.now() - t0.tm < 450;
      t0 = null; if (moved > 18 || !quick) return;
      MK.mouse('mousemove', t.clientX, t.clientY);
      const now = performance.now(), same = V15_LAST && Math.hypot(t.clientX - V15_LAST.x, t.clientY - V15_LAST.y) < 34 && now - V15_LAST.tm < 4000;
      let onBld = false; try { const w = screenToWorld(t.clientX, t.clientY); onBld = !!gridAt(Math.floor(w.x / TILE), Math.floor(w.y / TILE)); } catch (er) { }
      if (same && !onBld) { MK.mouse('mousedown', t.clientX, t.clientY); setTimeout(() => MK.mouse('mouseup', t.clientX, t.clientY), 40); V15_LAST = null; }
      else { V15_LAST = { x: t.clientX, y: t.clientY, tm: now }; SFX.play('click'); }
    }
  }, { passive: false, capture: true });
})();

// ---------------- Kompakte Gebäude-Info statt großem Textkasten ----------------
{
  const _h = v13Hover; let SUP = false;
  v13Hover = function () { return SUP ? null : _h(); };
  const _fl = factoryLabels;
  factoryLabels = function (t) {
    SUP = true; try { _fl(t); } finally { SUP = false; }
    const b = _h(); if (!b || !onScreen(b.x, b.y)) return;
    const q = P(b.x, b.y, 70 + b.h * 14), txt = BUILD[b.type].icon + ' St.' + b.level, w = 74, hb = b.hp / b.max;
    G.fillStyle = 'rgba(4,10,16,0.78)'; G.fillRect(q.x - w / 2, q.y - 16, w, 20);
    G.textAlign = 'center'; G.font = '900 11px "Trebuchet MS", Arial'; G.fillStyle = '#fff'; G.fillText(txt, q.x, q.y - 3);
    G.fillStyle = 'rgba(0,0,0,0.6)'; G.fillRect(q.x - w / 2 + 4, q.y, w - 8, 3); G.fillStyle = hb > 0.6 ? '#7dff5a' : hb > 0.3 ? '#ffb020' : '#ff5e3a'; G.fillRect(q.x - w / 2 + 4, q.y, (w - 8) * hb, 3);
  };
}

// ---------------- Zustand, weniger schwebende Texte ----------------
setInterval(() => {
  const B = document.body; if (!S) return;
  B.classList.toggle('phase-intro', S.phase === 'intro'); B.classList.toggle('phase-fall', S.phase === 'fall');
  B.classList.toggle('flying', !!(S.p && (S.p.inHeli || S.p.inShip)));
  if (S.floaters && S.floaters.length > 5) { const small = S.floaters.filter(f => !f.big); while (small.length > 4) { const f = small.shift(); const i = S.floaters.indexOf(f); if (i >= 0) S.floaters.splice(i, 1); } }
  if (S.build && !S.build.on) V15_LAST = null;
}, 120);
;
;

}
