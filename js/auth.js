'use strict';
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
