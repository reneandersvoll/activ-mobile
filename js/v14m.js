'use strict';
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
  wheel(dy) { const c = this.canvas(); if (c) c.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true, cancelable: true })); },
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
mbTap('bbH', () => MK.tap('KeyH')); mbTap('bbX', () => MK.tap('KeyX'));

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
