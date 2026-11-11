'use strict';
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
