'use strict';
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
