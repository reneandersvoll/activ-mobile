'use strict';
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
