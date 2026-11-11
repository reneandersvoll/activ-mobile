'use strict';
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
