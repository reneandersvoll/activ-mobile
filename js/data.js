'use strict';
// ===================== DATEN =====================
const RES = {
  wood:    { n: 'Holz',        s: 'HOLZ',    ic: '🪵', col: '#ffcf7a', cap: true },
  stone:   { n: 'Stein',       s: 'STEIN',   ic: '🪨', col: '#d6e0e4', cap: true },
  scrap:   { n: 'Schrott',     s: 'SCHROTT', ic: '⚙', col: '#ffa64d', cap: true },
  food:    { n: 'Nahrung',     s: 'ESSEN',   ic: '🍖', col: '#9cff6a' },
  ammo:    { n: 'Munition',    s: 'MUNI',    ic: '▰', col: '#ffe066' },
  meds:    { n: 'Medikit',     s: 'MEDS',    ic: '✚', col: '#ff7a7a' },
  grenades:{ n: 'Granate',     s: 'GRANATE', ic: '●', col: '#a6ff7a' },
  fuel:    { n: 'Sprit',       s: 'SPRIT',   ic: '⛽', col: '#7ad7ff' },
  elec:    { n: 'Elektronik',  s: 'ELEKTRO', ic: '🔌', col: '#5ff4ff', rare: true },
  mil:     { n: 'Militärteile', s: 'MILITÄR', ic: '🎖', col: '#b5c46a', rare: true },
  crystal: { n: 'Wurzelkristall', s: 'KRISTALL', ic: '💎', col: '#d68cff', rare: true },
  cells:   { n: 'Brennstoffzelle', s: 'ZELLEN', ic: '🔋', col: '#ffb020', rare: true },
  titan:   { n: 'Titanerz',    s: 'TITAN',   ic: '◆', col: '#9fc8e8', rare: true },
  xeno:    { n: 'Xenobiomasse', s: 'XENO',   ic: '🧬', col: '#5fffc0', rare: true },
  plasma:  { n: 'Plasmakern',  s: 'PLASMA',  ic: '☄', col: '#ff5ef0', rare: true },
  void:    { n: 'Leerenkristall', s: 'LEERE', ic: '✧', col: '#8a7cff', rare: true },
  relic:   { n: 'Alien-Relikt', s: 'RELIKT', ic: '⚱', col: '#ffd27a', rare: true },
  money:   { n: 'Credits',     s: '₵',       ic: '₵', col: '#ffd84a' },
  frags:   { n: 'Funkfragment', s: 'FUNK',   ic: '📻', col: '#ff9a3c' },
};
const HUD_RES = ['wood', 'stone', 'scrap', 'food', 'ammo', 'meds', 'grenades', 'fuel', 'elec', 'mil', 'crystal', 'cells', 'titan', 'xeno', 'plasma', 'void', 'relic'];

const BUILD = {
  wall:      { n: 'Mauer',       icon: '▥', w: 1, h: 1, cost: { wood: 6 },               hp: 220, solid: 1, desc: 'Verbindet sich automatisch. Ziehen zum Bauen.' },
  gate:      { n: 'Tor',         icon: '⛩', w: 1, h: 1, cost: { wood: 12, stone: 4 },     hp: 260, solid: 2, desc: 'Du kommst durch, Monster nicht.' },
  fire:      { n: 'Lagerfeuer',  icon: '🔥', w: 1, h: 1, cost: { wood: 10, stone: 3 },     hp: 80, light: 150, desc: 'Billiges Licht ohne Strom.' },
  hq:        { n: 'HQ',          icon: '⌂', w: 3, h: 3, cost: { wood: 40, stone: 25 },    hp: 900, light: 360, power: 10, unique: true, solid: 1, desc: 'Basis mit Kommando-PC. Großes Licht.' },
  farm:      { n: 'Farm',        icon: '🌾', w: 2, h: 2, cost: { wood: 18, stone: 2 },     hp: 160, desc: 'Baut Nahrung an. Regen beschleunigt.' },
  lamp:      { n: 'Flutlicht',   icon: '💡', w: 1, h: 1, cost: { wood: 8, stone: 6, scrap: 4 }, hp: 120, light: 230, power: -2, solid: 1, desc: 'Lichtzone: hier spawnt nichts.' },
  turret:    { n: 'Geschützturm', icon: '⊕', w: 1, h: 1, cost: { wood: 15, stone: 15, scrap: 12 }, hp: 260, light: 60, power: -3, solid: 1, desc: 'Schießt automatisch. Braucht Strom.' },
  storage:   { n: 'Lager',       icon: '▣', w: 2, h: 2, cost: { wood: 30, stone: 10 },    hp: 300, solid: 1, desc: '+150 Kapazität für Holz/Stein/Schrott.' },
  generator: { n: 'Generator',   icon: '⚡', w: 2, h: 1, cost: { wood: 15, stone: 20, scrap: 10 }, hp: 280, light: 50, power: 12, solid: 1, desc: '+12 Strom.' },
  garage:    { n: 'Garage',      icon: '🔧', w: 2, h: 3, cost: { wood: 35, stone: 20, scrap: 15 }, hp: 400, desc: 'Schaltet Fahrzeug-Upgrades am PC frei.' },
  helipad:   { n: 'Landestation', icon: '🚁', w: 3, h: 3, cost: { stone: 40, scrap: 30, elec: 6 }, hp: 600, light: 140, unique: true, desc: 'Tankt & repariert Heli/Raumschiff. Startet Expeditionen.' },
  beacon:    { n: 'Kristallfeuer', icon: '💎', w: 1, h: 1, cost: { stone: 20, crystal: 5 }, hp: 320, light: 480, solid: 1, desc: 'Riesige Lichtzone ohne Strom.' },
};
const BUILD_ORDER = ['wall', 'gate', 'fire', 'hq', 'farm', 'lamp', 'turret', 'storage', 'generator', 'garage', 'helipad', 'beacon'];
const BUILD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'T'];
const LEVEL_NAMES = ['', 'Holz', 'Stein', 'Stahl', 'Titan'];
function upgradeCost(type, lvl) {
  const base = BUILD[type].cost, m = lvl + 0.5, c = {};
  c.wood = Math.ceil((base.wood || 5) * m); c.stone = Math.ceil(((base.stone || 0) + 6) * m);
  if (lvl >= 2) c.scrap = Math.ceil(8 * lvl);
  if (type === 'turret' && lvl >= 2) c.mil = 4 * lvl;
  if (type === 'generator' && lvl >= 2) c.cells = 3;
  if (type === 'hq' && lvl >= 2) c.elec = 4 * lvl;
  if ((type === 'wall' || type === 'gate') && lvl >= 3) c.titan = 2;
  if (type === 'helipad') { delete c.wood; c.elec = 8 * lvl; if (lvl >= 2) { c.mil = 12; c.cells = 4; } }
  if (type === 'beacon') { delete c.wood; c.crystal = 4 * lvl; }
  return c;
}

const WEAPONS = {
  axe:     { n: 'Axt',     icon: '🪓', melee: true, dmg: 34, rate: 0.42 },
  rifle:   { n: 'Sturmgewehr', icon: '▰', dmg: 22, rate: 0.11, mag: 30, reload: 1.6, spread: 0.05, speed: 1100, life: 0.75, pellets: 1, sfx: 'rifle' },
  shotgun: { n: 'Schrotflinte', icon: '▬', dmg: 15, rate: 0.75, mag: 6, reload: 2.1, spread: 0.32, speed: 950, life: 0.4, pellets: 7, sfx: 'shotgun' },
  sniper:  { n: 'Scharfschütze', icon: '━', dmg: 130, rate: 1.1, mag: 5, reload: 2.4, spread: 0.006, speed: 2000, life: 0.9, pellets: 1, pierce: 3, sfx: 'sniper', unlock: { mil: 14, elec: 6, scrap: 30 } },
  lmg:     { n: 'Maschinengewehr', icon: '▤', dmg: 19, rate: 0.065, mag: 100, reload: 3.6, spread: 0.09, speed: 1100, life: 0.7, pellets: 1, sfx: 'rifle', unlock: { mil: 22, cells: 2, scrap: 40 } },
  plasma:  { n: 'Plasmagewehr', icon: '☄', dmg: 48, rate: 0.22, mag: 24, reload: 1.8, spread: 0.02, speed: 900, life: 0.9, pellets: 1, pierce: 1, sfx: 'laser', energy: true, unlock: { plasma: 6, xeno: 6, titan: 10 } },
  medkit:  { n: 'Medikit',  icon: '✚', item: 'meds' },
  grenade: { n: 'Granate',  icon: '●', item: 'grenades' },
};
const GUNS = ['rifle', 'shotgun', 'sniper', 'lmg', 'plasma'];
let HOTBAR = ['axe', 'rifle', 'shotgun', 'medkit', 'grenade'];

const ATTACH = {
  scope:     { n: '4x Zielfernrohr',   icon: '◉', cost: { scrap: 15, stone: 10 }, d: '+30% Schaden, größere Reichweite' },
  suppressor:{ n: 'Schalldämpfer',     icon: '▭', cost: { scrap: 12, wood: 10 },  d: 'Schüsse locken kaum Monster an' },
  grip:      { n: 'Vertikalgriff',     icon: '┻', cost: { scrap: 10, wood: 12 },  d: '-40% Streuung, weniger Rückstoß' },
  extmag:    { n: 'Erweitertes Magazin', icon: '▮', cost: { scrap: 14, stone: 6 }, d: '+60% Magazingröße' },
  laser:     { n: 'Taktischer Laser',  icon: '✦', cost: { scrap: 10, stone: 10 }, d: 'Ziellaser, -30% Streuung' },
  stock:     { n: 'Taktischer Schaft', icon: '◣', cost: { scrap: 12, wood: 15 },  d: 'Volles Tempo beim Schießen' },
  drum:      { n: 'Schnellladung',     icon: '⟳', cost: { scrap: 18, stone: 12 }, d: '-45% Nachladezeit' },
  hollow:    { n: 'Hohlspitz-Munition', icon: '◆', cost: { mil: 6, scrap: 10 },   d: '+25% Schaden' },
  thermal:   { n: 'Wärmebild-Optik',   icon: '◎', cost: { elec: 6, crystal: 2 },  d: 'Monster nachts auf Minimap' },
  xenocore:  { n: 'Xeno-Kern',         icon: '🧬', cost: { xeno: 4, relic: 1 },    d: '+40% Schaden, Treffer heilen 1 HP' },
};
const CAMOS = [
  { id: 'std', n: 'Standard', kills: 0, col: '#2d3538' }, { id: 'forest', n: 'Waldtarn', kills: 25, col: '#3f6b3a' },
  { id: 'desert', n: 'Wüste', kills: 60, col: '#b49660' }, { id: 'urban', n: 'Urban', kills: 120, col: '#7b8790' },
  { id: 'gold', n: 'GOLD', kills: 220, col: '#e8b923' }, { id: 'diamond', n: 'DIAMANT', kills: 400, col: '#8de9ff', anim: true },
  { id: 'verdant', n: 'VERDANT', kills: 700, col: '#7dff5a', anim: true },
];
const PERKS = [
  { id: 'dmg', n: 'Scharfschütze', icon: '🎯', d: '+20% Waffenschaden' }, { id: 'hp', n: 'Zäh wie Wurzeln', icon: '❤', d: '+25 maximale Lebenspunkte' },
  { id: 'gather', n: 'Holzfäller', icon: '🪓', d: '+50% Ertrag bei Bäumen & Steinen' }, { id: 'speed', n: 'Sprinter', icon: '👟', d: '+12% Laufgeschwindigkeit' },
  { id: 'rate', n: 'Abzugsfinger', icon: '⚡', d: '+15% Feuerrate' }, { id: 'vamp', n: 'Lebensraub', icon: '🩸', d: 'Jeder Kill heilt 3 HP' },
  { id: 'turret', n: 'Ingenieur', icon: '🔧', d: '+35% Turmschaden' }, { id: 'loot', n: 'Plünderer', icon: '💰', d: 'Kisten & Hochhäuser geben doppelt so viel' },
  { id: 'ammo', n: 'Munitionsjäger', icon: '▰', d: 'Monster lassen öfter Munition fallen' }, { id: 'melee', n: 'Berserker', icon: '💢', d: '+60% Nahkampfschaden' },
  { id: 'hunger', n: 'Asket', icon: '🍖', d: 'Hunger sinkt 40% langsamer' }, { id: 'build', n: 'Baumeister', icon: '🏗', d: 'Gebäude kosten 20% weniger' },
  { id: 'haggle', n: 'Feilscher', icon: '₵', d: '+15% Verkaufspreise, -10% Einkauf' }, { id: 'pilot', n: 'Pilot', icon: '🚀', d: 'Fahrzeuge schneller & sparsamer' },
];
const CAR_UP = {
  engine:  { n: 'Motor', icon: '⚙', max: 3, cost: l => ({ scrap: 15 * l, stone: 8 * l }), d: '+Höchstgeschwindigkeit' },
  armor:   { n: 'Panzerung', icon: '🛡', max: 3, cost: l => ({ scrap: 18 * l, stone: 10 * l }), d: '+Fahrzeug-HP, Stahlplatten' },
  ram:     { n: 'Rammbock', icon: '▼', max: 1, cost: () => ({ scrap: 25, wood: 20 }), d: 'Doppelter Überfahrschaden' },
  lights:  { n: 'Flutlichtbalken', icon: '💡', max: 1, cost: () => ({ scrap: 20, stone: 10 }), d: 'Riesiger Lichtkegel = sichere Zone' },
  gun:     { n: 'Dachgeschütz', icon: '⊕', max: 1, cost: () => ({ scrap: 30, mil: 8 }), d: 'Automatisches MG auf dem Dach' },
  nitro:   { n: 'Nitro', icon: '🔥', max: 1, cost: () => ({ scrap: 20, cells: 2 }), d: 'SHIFT = Boost mit Flammen' },
};
const HELI_UP = {
  light:  { n: 'Suchscheinwerfer', icon: '💡', cost: { elec: 8, scrap: 20 }, d: 'Lichtkegel unter dem Heli = sichere Zone' },
  gun:    { n: 'Bordkanone', icon: '⊕', cost: { mil: 15, scrap: 30 }, d: 'Automatisches Doppel-MG' },
  armor:  { n: 'Panzerung', icon: '🛡', cost: { mil: 10, stone: 25 }, d: '+150 Heli-HP' },
  tank:   { n: 'Zusatztank', icon: '⛽', cost: { cells: 4, scrap: 15 }, d: 'Halber Spritverbrauch' },
  engine: { n: 'Turbine', icon: '⚙', cost: { elec: 6, cells: 2 }, d: '+40% Fluggeschwindigkeit' },
};

// ---------- Raumschiff ----------
const SHIP_PRICE = 40000;
const SHIP_UP = {
  hull:   { n: 'Titan-Panzerung', icon: '🛡', max: 3, cost: l => ({ titan: 6 * l, scrap: 30 * l }), d: '+120 Rumpf-HP pro Stufe' },
  laser:  { n: 'Pulslaser', icon: '✦', max: 3, cost: l => ({ elec: 6 * l, plasma: l > 1 ? 2 * l : 0, titan: 3 * l }), d: '+Kanonen, +Schaden' },
  shield: { n: 'Deflektorschild', icon: '◎', max: 2, cost: l => ({ void: 3 * l, elec: 8 }), d: 'Regenerierender Energieschild' },
  boost:  { n: 'Nachbrenner', icon: '🔥', max: 2, cost: l => ({ cells: 3 * l, titan: 4 * l }), d: '+35% Tempo, SHIFT = Boost' },
  mining: { n: 'Bergbaulaser', icon: '⛏', max: 1, cost: () => ({ titan: 8, elec: 6 }), d: 'Doppelter Ertrag beim Asteroidenabbau' },
  wings:  { n: 'Goldene Schwingen', icon: '✈', max: 1, cost: () => ({ relic: 2, titan: 6 }), d: 'Wendiger. Sieht absurd gut aus.' },
  cargo:  { n: 'Frachtmodul', icon: '▣', max: 1, cost: () => ({ titan: 10, scrap: 40 }), d: '+50% Ertrag aus Raumkisten' },
  tractor:{ n: 'Traktorstrahl', icon: '⇊', max: 1, cost: () => ({ void: 4, plasma: 3 }), d: 'Zieht Beute aus großer Entfernung an' },
};
const SHIP_PAINTS = [
  { id: 'white', n: 'Polarweiß', col: '#d8dde3', acc: '#3a6fb8', price: 0 }, { id: 'piltover', n: 'Piltover-Gold', col: '#efe3c8', acc: '#c9952a', price: 2500 },
  { id: 'zaun', n: 'Zaun-Chem', col: '#3a4a40', acc: '#5fff8a', price: 2500 }, { id: 'crimson', n: 'Karmesin', col: '#a3242c', acc: '#1c1c22', price: 4000 },
  { id: 'void', n: 'Leerenstrom', col: '#241c4a', acc: '#a58cff', price: 9000 }, { id: 'gold', n: 'Reines Gold', col: '#e8b923', acc: '#fff3c0', price: 20000 },
];
const STATION_UP = {
  engine: { n: 'Warp-Antrieb', icon: '🌀', max: 3, cost: l => ({ titan: 12 * l, plasma: 3 * (l - 1), void: 2 * (l - 1) }), d: '+1 Sprungreichweite' },
  armor:  { n: 'Hüllenverstärkung', icon: '🛡', max: 2, cost: l => ({ titan: 15 * l }), d: 'Weniger Enterkommandos' },
  lab:    { n: 'Xeno-Labor', icon: '🧬', max: 1, cost: () => ({ xeno: 8, elec: 10 }), d: 'Wandelt täglich Xenobiomasse in Credits' },
};
const CREW_ROLES = {
  pilot: { n: 'Pilot/in', icon: '🧑‍✈️', d: '+20% Schiffstempo' }, engineer: { n: 'Ingenieur/in', icon: '🔧', d: 'Schiff repariert sich langsam' },
  navigator: { n: 'Navigator/in', icon: '🧭', d: '+1 Sprungreichweite' }, medic: { n: 'Sanitäter/in', icon: '✚', d: 'Heilt dich auf Planeten' },
  gunner: { n: 'Schütze/in', icon: '🎯', d: '+25% Schiffsschaden' },
};
const CREW_FIRST = ['Mira', 'Taro', 'Jonas', 'Vex', 'Ilka', 'Bram', 'Sana', 'Odo', 'Lenka', 'Kip', 'Ruva', 'Hesh', 'Nova', 'Grit', 'Ada', 'Zed'];
const CREW_LAST = ['Kovač', 'Rostfeld', 'Ambrose', 'Vandermeer', 'Okafor', 'Lindqvist', 'Stahl', 'Moreau', 'Hex', 'Ferro', 'Klee', 'Varga'];
const PLANETS = [
  { id: 'earth', n: 'ERDE', sub: 'Die überwucherte Heimat', dist: 0, col: ['#3f8a3a', '#2e6fa8', '#e9f2f5'], res: null },
  { id: 'vyr', n: 'VYR-7', sub: 'Biolumineszente Pilzwelt', dist: 1, danger: 1, res: 'xeno', col: ['#2fd6b0', '#1c6f8a', '#a6ffe6'], ground: [170, 40, 22], dirt: [190, 35, 16], trees: ['shroom', 'shroom', 'shroomtall'], node: 'xenonode', dark: 0.4, light: '90,255,200', zskin: '#5fd6b0' },
  { id: 'korrax', n: 'KORRAX', sub: 'Vulkanwelt der Obsidiantürme', dist: 2, danger: 2, res: 'plasma', col: ['#ff6a2a', '#3a1a14', '#ffd27a'], ground: [10, 30, 16], dirt: [20, 60, 22], trees: ['lavaspire', 'obelisk'], node: 'plasmanode', dark: 0.3, light: '255,120,60', zskin: '#c0503a' },
  { id: 'nimbara', n: 'NIMBARA', sub: 'Kristallsteppe im ewigen Zwielicht', dist: 2, danger: 2, res: 'void', col: ['#8a7cff', '#2a2050', '#e6ddff'], ground: [255, 25, 24], dirt: [265, 30, 18], trees: ['crystaltree'], node: 'voidnode', dark: 0.5, light: '160,140,255', zskin: '#9a8cff' },
  { id: 'aurum', n: 'AURUM PRIME', sub: 'Ruinen der Alten', dist: 3, danger: 3, res: 'relic', col: ['#e8b923', '#7a5a14', '#fff3c0'], ground: [42, 40, 40], dirt: [38, 45, 30], trees: ['goldspire', 'obelisk'], node: 'relicnode', dark: 0.15, light: '255,220,120', zskin: '#d9b35a' },
];

const ZTYPES = {
  walker: { n: 'Wucherer', hp: 60, sp: 48, dmg: 10, sc: 1, skin: '#6f9a4c', xp: 10 },
  runner: { n: 'Sprinter', hp: 40, sp: 105, dmg: 8, sc: 0.9, skin: '#8bb35a', xp: 14 },
  brute:  { n: 'Koloss', hp: 320, sp: 34, dmg: 28, sc: 1.6, skin: '#557a3c', xp: 45, bldg: 2.5 },
  boss:   { n: 'WURZELKÖNIG', hp: 2600, sp: 40, dmg: 40, sc: 2.6, skin: '#4a6b2e', xp: 400, bldg: 3 },
  xeno:   { n: 'Xeno-Jäger', hp: 90, sp: 80, dmg: 14, sc: 1.05, skin: '#7a5cff', xp: 22, alien: true },
  xbrute: { n: 'Xeno-Behemoth', hp: 520, sp: 40, dmg: 34, sc: 1.8, skin: '#5a3cc0', xp: 80, alien: true },
  xdrone: { n: 'Kampfdrohne', hp: 70, sp: 150, dmg: 12, sc: 1, skin: '#3a4048', xp: 25, drone: true },
};
const MISSION_POOL = [
  { id: 'kill', n: 'Säuberung', d: n => `Erledige ${n} Monster`, goal: [15, 25, 40], stat: 'kills', reward: { scrap: 20, ammo: 60 } },
  { id: 'chop', n: 'Rodung', d: n => `Fälle ${n} Bäume`, goal: [6, 10, 15], stat: 'trees', reward: { stone: 25, scrap: 10 } },
  { id: 'build', n: 'Festungsbau', d: n => `Errichte ${n} Gebäude`, goal: [6, 10, 16], stat: 'built', reward: { wood: 40, scrap: 15 } },
  { id: 'crates', n: 'Plünderzug', d: n => `Öffne ${n} Kisten`, goal: [2, 4, 6], stat: 'crates', reward: { ammo: 80, meds: 2 } },
  { id: 'brute', n: 'Großwildjagd', d: n => `Erledige ${n} Kolosse`, goal: [1, 3, 5], stat: 'brutes', reward: { grenades: 3, scrap: 25 } },
  { id: 'tower', n: 'Hochhaus-Raid', d: n => `Durchsuche ${n} Etagen in Rosthafen`, goal: [3, 6, 10], stat: 'floors', reward: { elec: 3, scrap: 30 } },
  { id: 'night', n: 'Durchhalten', d: n => `Überlebe ${n} Nacht${n > 1 ? 'e' : ''}`, goal: [1, 2, 3], stat: 'nights', reward: { wood: 50, stone: 40, meds: 1 } },
];
const BIOMES = {
  military: { n: 'Militärbasis Echo', icon: '🎖', desc: 'Verlassene Kaserne. Bunker, Panzerwracks, Waffenkisten.', excl: 'mil', node: 'milcrate', trees: ['pine', 'oak'], treeN: 160, grass: [78, 22, 34], dirt: [38, 18, 42], dark: 0, zMix: { walker: 0.5, runner: 0.25, brute: 0.25 }, shirt: '#4b5d3a', props: ['bunker', 'tank', 'sandbag', 'sandbag', 'tower', 'container'] },
  swamp: { n: 'Verseuchter Sumpf', icon: '💎', desc: 'Giftiger Nebel, leuchtende Wurzelkristalle.', excl: 'crystal', node: 'crystal', trees: ['dead', 'jungle'], treeN: 340, grass: [150, 30, 20], dirt: [100, 20, 18], dark: 0.5, fog: true, zMix: { walker: 0.4, runner: 0.5, brute: 0.1 }, shirt: '#3a4a3a', props: ['hut', 'skull'] },
  desert: { n: 'Ölfeld Sahra', icon: '🔋', desc: 'Glühender Sand, Ölpumpen, Batteriedepots.', excl: 'cells', node: 'cellnode', trees: ['cactus'], treeN: 120, grass: [40, 52, 60], dirt: [30, 45, 50], dark: 0, zMix: { walker: 0.6, runner: 0.2, brute: 0.2 }, shirt: '#b49660', props: ['pump', 'pump', 'container', 'skull'] },
  lab: { n: 'Forschungslabor Nord', icon: '🔌', desc: 'Eis und Schnee. Serverschränke voller Elektronik.', excl: 'elec', node: 'server', trees: ['snowpine'], treeN: 240, grass: [205, 18, 86], dirt: [210, 12, 72], dark: 0.15, snow: true, zMix: { walker: 0.45, runner: 0.35, brute: 0.2 }, shirt: '#dfe6e9', props: ['labbox', 'antenna', 'container'] },
};

// ---------- Stadt Neu-Eden ----------
const RANKS = [
  { n: 'Fremder', rep: 0 }, { n: 'Einwohner', rep: 60, d: '60 Bekanntheit' }, { n: 'Bürger', rep: 200, apt: 1, d: '200 Bekanntheit + eine Wohnung' },
  { n: 'Angesehen', rep: 600, apt: 2, d: '600 Bekanntheit + Wohnung in der Oberstadt' },
  { n: 'Ratsmitglied', rep: 1500, money: 20000, biz: 1, d: '1500 Bekanntheit + eigenes Geschäft + 20.000₵ Spende' },
  { n: 'Bürgermeister', rep: 4000, money: 60000, apt: 4, biz: 1, election: true, d: '4000 Bekanntheit + Villa + Geschäft + Wahlkampf 60.000₵' },
];
const APTS = [
  { id: 'cellar', n: 'Kellerloch (Unterstadt)', price: 900, rent: 15, rep: 1, tier: 1, d: 'Feucht, laut, aber deins. Schlafen & Spawnpunkt.' },
  { id: 'flat', n: 'Stadtwohnung (Oberstadt)', price: 6000, rent: 60, rep: 3, tier: 2, d: 'Sauber, sicher, mit Ausblick.' },
  { id: 'pent', n: 'Penthouse', price: 24000, rent: 180, rep: 8, tier: 3, d: 'Dachterrasse über der Stadt. +10% XP.' },
  { id: 'sky', n: 'Himmelsloft mit Landeplattform', price: 45000, rent: 300, rep: 12, tier: 3, pad: true, d: 'Private Landeplattform. Voraussetzung für ein Raumschiff!' },
  { id: 'villa', n: 'Villa am Park', price: 70000, rent: 450, rep: 15, tier: 4, d: 'Das Zuhause eines Bürgermeisters.' },
];
const JOBS = {
  courier: { n: 'Kurier', icon: '📦', wage: [60, 140, 300], xpFrom: 'Lieferungen über die Zone', biz: 'Kurierdienst "Schneller Spross"', bizPrice: 22000, bizIncome: 1100 },
  guard: { n: 'Stadtwache', icon: '🛡', wage: [80, 170, 340], xpFrom: 'Monster-Kills (je 15 = 1 XP)', biz: 'Söldnerfirma "Eiserne Wurzel"', bizPrice: 30000, bizIncome: 1500 },
  mech: { n: 'Mechaniker', icon: '🔧', wage: [70, 150, 320], xpFrom: 'Reparaturen & Upgrades', biz: 'Werkstatt "Rostlöser"', bizPrice: 26000, bizIncome: 1300 },
  barkeep: { n: 'Barkeeper', icon: '🍸', wage: [50, 120, 260], xpFrom: 'Schichten in der Bar', biz: 'Bar "Zum Rostigen Anker"', bizPrice: 18000, bizIncome: 1000 },
};
const JOB_RANKS = [{ n: 'Lehrling', xp: 0 }, { n: 'Geselle', xp: 5 }, { n: 'Meister', xp: 14 }, { n: 'Besitzer', xp: 999 }];
const MARKET = {
  wood: { buy: 3, sell: 1 }, stone: { buy: 4, sell: 1.5 }, scrap: { buy: 9, sell: 3 }, food: { buy: 14, sell: 4 },
  ammo: { buy: 1.6, sell: 0.4, pack: 30 }, meds: { buy: 140, sell: 40 }, grenades: { buy: 170, sell: 50 }, fuel: { buy: 4, sell: 1.2, pack: 20 },
  elec: { buy: 130, sell: 45 }, mil: { buy: 170, sell: 60 }, crystal: { buy: 260, sell: 95 }, cells: { buy: 210, sell: 75 },
  titan: { buy: 320, sell: 120 }, xeno: { buy: 600, sell: 230 }, plasma: { buy: 750, sell: 290 }, void: { buy: 900, sell: 340 }, relic: { buy: 2400, sell: 950 },
};
const DRINKS = [
  { n: 'Rostiger Nagel', price: 25, d: '+20 HP', fx: 'heal' }, { n: 'Schimmer-Shot', price: 60, d: '3 Min: +25% Schaden', fx: 'dmg' },
  { n: 'Wurzelschnaps', price: 90, d: '3 Min: +15% Tempo', fx: 'speed' }, { n: 'Goldener Eden', price: 400, d: '+40 Bekanntheit', fx: 'rep' },
];
const RUMORS = [
  'In der alten Funkstation im Westen soll das Funkgerät noch funktionieren – mit etwas Elektronik.',
  'Die Hochhäuser in Rosthafen sind noch voller Elektronik. Aber jedes Geräusch weckt die Toten.',
  'Alle sieben Nächte färbt sich der Mond rot. Dann kommen doppelt so viele.',
  'Wer ein Himmelsloft besitzt, darf bei der Sternenschmiede ein Raumschiff kaufen.',
  'Da oben im Orbit treibt eine tote Station. Angeblich ist sie nicht ganz so tot.',
  'Die Raumfahrtbehörde heuert nur für Leute mit Rang an. Ohne Crew kein Sprung.',
  'Auf Aurum Prime liegen Relikte, die mehr wert sind als dein Leben.',
  'Im Royal-Casino oben lassen sie nur Angesehene rein. Hier unten nimmt jeder dein Geld.',
  'Wenn du nachts nicht bei deiner Basis bist, kommen sie trotzdem. Bau Türme.',
];
const CHAR_OPTS = {
  skin: ['#f1d0b0', '#e2b48c', '#c68b5e', '#8d5a3b', '#5e3b26', '#9fd28a'], hair: ['#2a1d14', '#5b3a1e', '#b07a3c', '#e8d17a', '#d0d0d0', '#c0392b', '#2e86de', '#8e44ad'],
  hairStyle: ['Kurz', 'Lang', 'Irokese', 'Glatze', 'Afro', 'Zopf'], hat: ['Keine', 'Cap', 'Helm', 'Bandana', 'Beanie', 'Pilotenhaube'],
  shirt: ['#3d5a80', '#5b7f3a', '#8a3a3a', '#d9a441', '#2d3436', '#e17055', '#6c5ce7', '#dfe6e9'], pants: ['#2d3436', '#4a3b2a', '#3b4d61', '#556b2f', '#7f8c8d'],
  pack: ['#6b4f2a', '#3f5a36', '#2d3436', '#a0522d', '#c0392b'], beard: ['Nein', 'Stoppeln', 'Vollbart'], build: ['Normal', 'Schmal', 'Breit'],
};
