// Bodentypen. Außen 0–19, Innenräume 20+.
export const T = {
  grass: 0, hill: 1, dirt: 2, paved: 3, forum: 4, sand: 5, water: 6, cliff: 7, garden: 8, cobble: 9,
  plaza: 10, field: 11, rim: 12, stairs: 13, bridge: 14, marble: 15, mud: 16, slope: 17, citywall: 18,
  wall: 20, mosaic: 21, terracotta: 22, plain: 23, wood: 24, pool: 25, igrass: 26, void: 27, exit: 28,
};

export const SOLID_GROUND = new Set([T.water, T.cliff, T.rim, T.wall, T.pool, T.void, T.citywall]);

// Zeichen im Boden-Layer der Kartendatei (map_rom.json → "ground")
export const GROUND_CHARS = {
  '.': 'grass', ',': 'hill', ':': 'field', 'd': 'dirt', 'p': 'paved', 'f': 'forum', 's': 'sand', '~': 'water',
  'C': 'cliff', 'R': 'rim', 'g': 'garden', 'c': 'cobble', 'z': 'plaza', 'S': 'stairs', 'B': 'bridge',
  'm': 'marble', 'u': 'mud', 'l': 'slope', 'W': 'citywall', 'w': 'wood',
};

export function tileId(name) {
  const id = T[name];
  if (id === undefined) throw new Error(`Unbekannter Tile-Typ: ${name}`);
  return id;
}
