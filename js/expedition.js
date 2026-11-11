'use strict';
// ===================== EXPEDITIONEN (Heli) =====================
function genExpOffers() { S.expOffers = Object.keys(BIOMES).sort(() => Math.random() - 0.5).slice(0, 3).map(b => { const danger = RI(1, 3); return { biome: b, danger, dur: 300 + danger * 60, fuel: 15 + danger * 5, seed: RI(1, 1e9) }; }); }
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
  const e = S.exp; if (!e) return; const lines = Object.entries(e.bag).filter(([k, v]) => v > 0), B = BIOMES[e.o.biome]; S.exp = null;
  UI.transition(success ? 'EXTRAKTION ERFOLGREICH' : reason, success ? 'Zurück zur Basis' : 'Die gesamte Beute ist verloren', () => {
    const pad = helipad(), h = S.mainW.heli, x = pad ? pad.x + 70 : 64 * TILE, y = pad ? pad.y + 50 : 64 * TILE;
    switchWorld('main', S.mainW, x, y); if (pad && h) { h.x = pad.x; h.y = pad.y; h.z = 0; h.state = 'parked'; } S.phase = 'play';
    if (success) { for (const [k, v] of lines) { if (RES[k].cap) S.res[k] = Math.min(S.cap, S.res[k] + v); else S.res[k] = (S.res[k] || 0) + v; } const xp = 120 + e.o.danger * 80 + lines.reduce((a, [k, v]) => a + (RES[k].rare ? v * 15 : 0), 0); addXp(xp); S.stats.exps++; UI.expReport(true, lines, xp, B); SFX.play('jackpot'); }
    else { S.p.hp = Math.max(25, S.p.maxHp * 0.3); S.p.invuln = 3; UI.expReport(false, lines, 0, B, reason); SFX.play('lose'); }
  }, 1800);
}
