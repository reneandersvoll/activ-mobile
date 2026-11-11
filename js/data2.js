'use strict';
// ===================== DATEN V10: Planeten-Industrie, Atmosphären, Fauna, Mauer-Geschütze =====================
Object.assign(BUILD, {
  autogun: { n: 'Selbstschussanlage', icon: '⁂', w: 1, h: 1, cost: { scrap: 18, stone: 10, ammo: 30 }, hp: 220, solid: 1, desc: 'Schnellfeuer, frisst Munition. Auf eine MAUER setzen = VERSCHMELZEN!' },
});
BUILD.turret.desc = 'Schießt automatisch (Strom). Auf eine MAUER setzen = VERSCHMELZEN zum Wehrturm!';
const MAIN_ORDER = BUILD_ORDER.concat(['autogun']);
// ---------- Planeten-Gebäude ----------
Object.assign(BUILD, {
  pcable:   { n: 'Stromkabel', icon: '〰', w: 1, h: 1, cost: { scrap: 2 }, hp: 60, planet: 1, desc: 'Leitet Strom. Alles was sich berührt, bildet ein Netz.' },
  solar:    { n: 'Solarfeld', icon: '☀', w: 2, h: 2, cost: { scrap: 12, elec: 2 }, hp: 160, planet: 1, gen: 'solar', solid: 1, desc: 'Strom aus Sternenlicht. Schwankt mit Tageszeit & Planet.' },
  wind:     { n: 'Windturbine', icon: '✇', w: 1, h: 1, cost: { scrap: 15, titan: 2 }, hp: 180, planet: 1, gen: 'wind', solid: 1, desc: 'Böen-abhängig. Auf stürmischen Welten stark.' },
  geo:      { n: 'Geothermie', icon: '♨', w: 2, h: 2, cost: { titan: 6, scrap: 10 }, hp: 260, planet: 1, gen: 'geo', solid: 1, desc: 'Konstanter Strom aus der Kruste. Auf Vulkanwelten doppelt.' },
  reactor:  { n: 'Plasma-Reaktor', icon: '☢', w: 3, h: 3, cost: { plasma: 4, titan: 12, elec: 6 }, hp: 500, planet: 1, gen: 'reactor', solid: 1, light: 220, desc: 'Gigantische 45 ⚡. Das Herz jeder Kolonie.' },
  battery:  { n: 'Akkubank', icon: '🔋', w: 1, h: 1, cost: { cells: 2, scrap: 6 }, hp: 160, planet: 1, store: 240, solid: 1, desc: 'Speichert Überschuss, puffert Engpässe.' },
  analyzer: { n: 'Atmo-Analysator', icon: '⚗', w: 1, h: 1, cost: { elec: 3, scrap: 8 }, hp: 140, planet: 1, use: 4, solid: 1, desc: 'MESSGERÄT: Bestimmt die Atmosphäre (toxisch/normal/alkalisch).' },
  scanner:  { n: 'Seismo-Scanner', icon: '📡', w: 2, h: 2, cost: { elec: 4, titan: 3 }, hp: 200, planet: 1, use: 6, solid: 1, desc: 'MESSGERÄT: Findet reiche Erzadern & zeigt sie auf der Karte.' },
  sensor:   { n: 'Bio-Sensor', icon: '👁', w: 1, h: 1, cost: { elec: 2, scrap: 6 }, hp: 120, planet: 1, use: 3, solid: 1, desc: 'MESSGERÄT: Zählt Lebensformen, warnt vor Angriffswellen.' },
  drill:    { n: 'Bohrturm', icon: '⛏', w: 2, h: 2, cost: { titan: 5, scrap: 15 }, hp: 260, planet: 1, use: 8, solid: 1, rot: 1, desc: 'Fördert Planeten-Rohstoff aufs Band (R = Richtung). Neben Erzader doppelt.' },
  belt:     { n: 'Fließband', icon: '➤', w: 1, h: 1, cost: { scrap: 3 }, hp: 80, planet: 1, use: 1, rot: 1, walk: 1, desc: 'Transportiert Güter (R = Richtung). Braucht Strom.' },
  smelter:  { n: 'Raffinerie', icon: '🏭', w: 2, h: 2, cost: { titan: 8, elec: 4 }, hp: 300, planet: 1, use: 10, solid: 1, rot: 1, desc: 'Veredelt: 1 Rohstoff rein → 2 raus.' },
  container:{ n: 'Frachtcontainer', icon: '📦', w: 2, h: 2, cost: { scrap: 20 }, hp: 320, planet: 1, solid: 1, desc: 'Endstation. Alles was ankommt, landet in deinem Inventar.' },
  scrubber: { n: 'Atmo-Filter', icon: '🫧', w: 2, h: 2, cost: { elec: 6, titan: 6, xeno: 2 }, hp: 300, planet: 1, use: 14, solid: 1, light: 280, power: -1, desc: 'Atembare Kuppel: schützt dich & Gebäude vor der Atmosphäre.' },
  pturret:  { n: 'Plasmaturm', icon: '✸', w: 1, h: 1, cost: { plasma: 2, titan: 4 }, hp: 300, planet: 1, use: 6, solid: 1, desc: 'Plasma-Geschütz. Zerlegt Alien-Fauna.' },
  plamp:    { n: 'Biolumen-Laterne', icon: '🍄', w: 1, h: 1, cost: { scrap: 6, xeno: 1 }, hp: 90, planet: 1, use: 2, solid: 1, light: 200, power: -1, desc: 'Licht = keine Spawns.' },
});
const PLANET_ORDER = ['wall', 'gate', 'pcable', 'solar', 'wind', 'geo', 'reactor', 'battery', 'analyzer', 'scanner', 'sensor', 'drill', 'belt', 'smelter', 'container', 'scrubber', 'pturret', 'plamp'];
const KEYSET = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'T', 'G', 'H', 'J', 'K', 'L', 'N'];
function curOrder() { return S && S.where === 'planet' ? PLANET_ORDER : MAIN_ORDER; }
// ---------- Atmosphären ----------
const ATMO = {
  toxisch:   { n: 'TOXISCH', icon: '☣', col: '#7dff5a', haze: '90,255,90', ph: [2.1, 4.6], dmg: 1.4, bdmg: 0, desc: 'Giftige Sporen in der Luft. Ohne Atmo-Filter verlierst du Leben.' },
  alkalisch: { n: 'ALKALISCH', icon: '⚗', col: '#9fe8ff', haze: '210,240,255', ph: [10.4, 13.2], dmg: 0.7, bdmg: 0.5, desc: 'Ätzende Laugennebel. Schadet dir UND zerfrisst Gebäude.' },
  normal:    { n: 'NORMAL', icon: '✓', col: '#ffd84a', haze: null, ph: [6.6, 7.6], dmg: 0, bdmg: 0, desc: 'Atembar! Solarfelder liefern +25%.' },
};
const PLANET_ENV = { vyr: { sun: 0.6, wind: 0.5, geo: 1 }, korrax: { sun: 0.9, wind: 0.7, geo: 2 }, nimbara: { sun: 0.35, wind: 1.7, geo: 0.8 }, aurum: { sun: 1.3, wind: 0.9, geo: 1 } };
const PLANET_FAUNA = { vyr: ['sporeling', 'sporeling', 'myco'], korrax: ['magmahound', 'magmahound', 'obsidian'], nimbara: ['wraith', 'shardspider', 'shardspider'], aurum: ['sentinel', 'sentinel', 'colossus'] };
Object.assign(ZTYPES, {
  sporeling:   { n: 'Sporling', hp: 50, sp: 72, dmg: 9, sc: 1, skin: '#5fd6b0', xp: 16, alien: true, creature: 'spore', spores: true },
  myco:        { n: 'Myzel-Golem', hp: 620, sp: 32, dmg: 30, sc: 1.7, skin: '#2fa890', xp: 90, alien: true, creature: 'golem', acc: '#a6ffe6', bldg: 2.5 },
  magmahound:  { n: 'Magmahund', hp: 85, sp: 135, dmg: 12, sc: 1, skin: '#3a1e18', xp: 24, alien: true, creature: 'hound', acc: '#ff6a2a' },
  obsidian:    { n: 'Obsidian-Titan', hp: 950, sp: 28, dmg: 42, sc: 1.9, skin: '#1e1418', xp: 120, alien: true, creature: 'golem', acc: '#ff6a2a', bldg: 3 },
  wraith:      { n: 'Kristall-Phantom', hp: 75, sp: 62, dmg: 13, sc: 1, skin: '#8a7cff', xp: 26, alien: true, creature: 'wraith', blink: true },
  shardspider: { n: 'Splitterspinne', hp: 120, sp: 98, dmg: 14, sc: 1, skin: '#3a3060', xp: 28, alien: true, creature: 'spider', acc: '#c8c0ff' },
  sentinel:    { n: 'Goldwächter', hp: 170, sp: 48, dmg: 14, sc: 1.1, skin: '#d9b35a', xp: 34, alien: true, creature: 'sentinel', ranged: true },
  colossus:    { n: 'Relikt-Koloss', hp: 1400, sp: 30, dmg: 46, sc: 2, skin: '#8a6a2a', xp: 160, alien: true, creature: 'golem', acc: '#5fffc0', bldg: 3 },
});
const LOBBY_NEWS = [
  { t: 'V10 · SPIEL-UPDATE', s: 'Konto-System, neue Lobby, Spind & Karriere.' },
  { t: 'PLANETEN-INDUSTRIE', s: 'Strom, Kabel, Fließbänder, Messgeräte & Atmosphären.' },
  { t: 'NEUE FAUNA', s: 'Jeder Planet hat jetzt eigene Monster.' },
  { t: 'MAUERN VERSCHMELZEN', s: 'Setz Geschütze direkt auf deine Mauern.' },
  { t: 'NEU-EDEN 2.0', s: 'Verschneite Prachtstraßen & die neue Unterstadt.' },
  { t: 'DIE ZONE', s: 'Wiesen, Dunkelwälder und tiefe Schluchten.' },
];
