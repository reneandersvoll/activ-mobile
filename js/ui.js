'use strict';
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
