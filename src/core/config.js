// Zentrale Spielkonstanten. Spielspaß vor Realismus: alle Zeiten/Wege stark komprimiert.
export const TILE = 16;

// Ein Ingame-Tag ≈ 11 min: 12 Horae Tageslicht (8 min) + 4 Vigiliae Nacht (3 min)
export const DAY_REAL_SECONDS = 480;
export const NIGHT_REAL_SECONDS = 180;

// Ein gespielter Tag entspricht einer Marktwoche (Nundinum, 8 Kalendertage)
export const DAYS_PER_PLAYED_DAY = 8;

export const WALK_SPEED = 5.5 * TILE; // px pro Sekunde
export const SPRINT_SPEED = 9 * TILE;

export const SAVE_KEY = 'romavivit.save.v1';
export const TARGET_VIEW_WIDTH = 440; // virtuelle Pixelbreite der Ansicht

// Plebejer: Miete alle 4 gespielten Tage (≈ ein Monat)
export const RENT_INTERVAL = 4;

// Nach so vielen erfolgreichen Durchgängen wird ein Minispiel automatisierbar
export const AUTOMATE_AFTER = 3;
