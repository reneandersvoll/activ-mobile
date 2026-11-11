'use strict';
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
