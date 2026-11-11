'use strict';
// =====================================================================================
// ACTIV (V14.1)  – wird NACH v13.js geladen
//  · Pausenmenü komplett deaktiviert (ESC schließt nur noch offene Fenster)
//  · HUD links oben: nur noch Leben, Hunger, Ausdauer
//  · F = Inventar (Rohstoffe, Level, Crew, Essen, Speichern, Hauptmenü) · G = Essen
//  · Versorgungsabwürfe UND die orangen Kurier-„Abwurfpunkte“ auf der Karte entfernt
// =====================================================================================

// ------------------------------------------------------------------
// HUD verschlanken + Inventar-Fenster
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
    const keys = basics.concat(Object.keys(RES).filter(k => !basics.includes(k) && k !== 'money' && k !== 'frags' && (r[k] || 0) > 0));
    h += '<div class="v14sec">ROHSTOFFE & VORRÄTE</div><div class="v14grid">';
    for (const k of keys) { const R0 = RES[k]; if (!R0) continue; const v = Math.floor(r[k] || 0); h += `<div class="v14it ${R0.rare ? 'rare' : ''}" style="${v ? '' : 'opacity:.45'}"><div class="n" style="color:${R0.col}">${v}</div><small>${(R0.n || k).toUpperCase()}</small></div>`; }
    h += '</div>';
    if (S.crew && S.crew.length) { h += `<div class="v14sec">CREW ${S.crew.length}/5</div><div class="v14grid">`; for (const c of S.crew) { const post = S.mainB.find(b => b.guard === c.name); h += `<div class="v14it"><div class="n" style="font-size:18px">${CREW_ROLES[c.role] ? CREW_ROLES[c.role].icon : '🧑'}</div><b style="font-size:12px">${c.name}</b><small>${CREW_ROLES[c.role] ? CREW_ROLES[c.role].n.toUpperCase() : ''}${post ? ' · 🗼 WACHE' : ''}</small></div>`; } h += '</div>'; }
    h += `<div class="v14btns"><button class="btn gold" id="v14eat" ${(r.food || 0) > 0 && p.hunger < 100 ? '' : 'disabled'}>🍖 ESSEN (G)</button><button class="btn" id="v14meds" ${(r.meds || 0) > 0 && p.hp < p.maxHp ? '' : 'disabled'}>✚ MEDIKIT</button><button class="btn" id="v14sk">🌟 SKILLBAUM (Q)</button><button class="btn" id="v14save">💾 SPEICHERN</button><button class="btn" id="v14help">? HILFE</button><button class="btn" id="v14set">⚙ EINSTELLUNGEN</button><button class="btn red" id="v14menu">⌂ HAUPTMENÜ</button></div>`;
    h += '<div class="csub" style="margin-top:8px">💾 Das Spiel speichert automatisch alle 5 Sekunden.</div>';
    $('v14body').innerHTML = h;
    $('v14eat').onclick = () => { v14Key('KeyF', 'f'); this.render(); };
    $('v14meds').onclick = () => { const i = HOTBAR.indexOf('medkit'); if (i >= 0) v14Key('Digit' + (i + 1), String(i + 1)); this.close(); };
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
  UI.show = function (id) { if (id === 'pause') { if (UI.overlay === 'pause') UI.overlay = null; return; } return _show.apply(this, arguments); };
  const _op = UI.openPause; UI.openPause = function () { if (S && S.phase === 'play') return; return _op.apply(this, arguments); };
  const _ca = UI.closeAll; UI.closeAll = function () { _ca.apply(this, arguments); const e = $('v14inv'); if (e) e.classList.add('hidden'); };
}

// ------------------------------------------------------------------
// ABWÜRFE + ABWURFPUNKTE (orange Kisten mit Licht auf der Karte) WEG
// ------------------------------------------------------------------
startAirdrop = function () { };
genCityTasks = function () { return []; };          // Kurieraufträge brauchten die Abwurfpunkte
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
  const _mmw = makeMainWorld;
  makeMainWorld = function (seed) { const W = _mmw(seed); try { v14StripDropPoints(W); } catch (e) { console.warn('V14 Abwurfpunkte', e); } return W; };
}
function v14KillDrops() {
  S.dropPlane = null;
  if (S.city && S.city.task) S.city.task = null;
  for (const W of [S.W, S.mainW]) {
    if (!W) continue;
    if (W.crates && W.crates.some(c => c.air)) { W.crates = W.crates.filter(c => !c.air); MINI_DIRTY = true; }
    if (W.outposts && W.outposts.length) { v14StripDropPoints(W); MINI_DIRTY = true; GCACHE.incomplete = true; }
  }
}

// ------------------------------------------------------------------
// TICK
// ------------------------------------------------------------------
{
  const _t = v11Tick;
  v11Tick = function (dt) {
    _t(dt); if (!S || !S.p) return;
    v14KillDrops();
    const pz = $('pause'); if (pz && !pz.classList.contains('hidden')) { pz.classList.add('hidden'); if (UI.overlay === 'pause') UI.overlay = null; }
    if (Inv.isOpen()) { S.invT = (S.invT || 0) - dt; if (S.invT <= 0) { S.invT = 0.5; Inv.render(); } }
  };
}
for (const n of LOBBY_NEWS) if (n.t && n.t.indexOf('V13') === 0) n.s = 'Crew auf Wachtürme · Gebäude verbinden sich · Autosave.';
LOBBY_NEWS.unshift({ t: 'ACTIV', s: 'F = Inventar · G = Essen · Q = Skillbaum. Kein Pausenmenü mehr – das Spiel speichert selbst.' });
TIPS.push('F öffnet dein Inventar mit allen Rohstoffen. G = schnell essen.', 'Kein Pausenmenü: Das Spiel speichert automatisch alle 5 Sekunden.');
