// Lädt alle Inhaltsdaten (JSON). Funktioniert mit Vite und jedem statischen Server.
const FILES = {
  classes: new URL('../data/classes.json', import.meta.url),
  items: new URL('../data/items.json', import.meta.url),
  npcs: new URL('../data/npcs.json', import.meta.url),
  dialogues: new URL('../data/dialogues.json', import.meta.url),
  missions: new URL('../data/missions.json', import.meta.url),
  lexicon: new URL('../data/lexicon.json', import.meta.url),
  shops: new URL('../data/shops.json', import.meta.url),
  map_rom: new URL('../data/map_rom.json', import.meta.url),
  interiors: new URL('../data/interiors.json', import.meta.url),
};

export async function loadData() {
  const data = {};
  await Promise.all(Object.entries(FILES).map(async ([key, url]) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Daten konnten nicht geladen werden: ${key}.json (${res.status})`);
    data[key] = await res.json();
  }));
  return data;
}
