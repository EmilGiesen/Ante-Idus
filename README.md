# Roma Vivit – Ein Leben im Rom Caesars

Browser-Lebenssimulation im Rom der Jahre 46–44 v. Chr. Top-Down-Pixelgrafik (komplett im Code gezeichnet),
drei Lebenswege (Adel, Plebejer, Sklave/Sklavin), Tag-Nacht-Zyklus, Missionen, Minispiele und ein Lexikon mit Quellen.

## Spiel starten

Voraussetzung: **Node.js** (LTS-Version, mindestens 20.19). Unter Windows z. B. per
`winget install OpenJS.NodeJS.LTS` oder über https://nodejs.org.

```bash
npm install      # einmalig: installiert Vite (Dev-Server)
npm run dev      # startet den Dev-Server und öffnet http://localhost:5173
```

**Einfachste Variante unter Windows:** Doppelklick auf `start.bat`.

Hinweis für PowerShell: Meldet `npm` „Ausführung von Skripts … deaktiviert“, verwende `npm.cmd install` und
`npm.cmd run dev` – oder erlaube Skripte einmalig mit `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Ohne Node.js geht es auch mit jedem statischen Webserver, z. B. mit Python im Projektordner:
`python -m http.server 8000` → http://localhost:8000

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | laufen |
| Shift | sprinten |
| E | sprechen, untersuchen, benutzen |
| Leertaste / Enter | bestätigen, Minispiel-Aktion |
| 1–5 | Dialogantwort wählen |
| I / L / K / M | Inventar / Logbuch / Lexikon / Stadtplan |
| Esc | Menü, Fenster schließen |

Auf Touch-Geräten erscheinen Steuerkreuz und Knöpfe.

## Weitere Befehle

```bash
npm run map        # erzeugt die Stadtkarte src/data/map_rom.json aus tools/build_map.mjs
npm run validate   # prüft die JSON-Daten (Querverweise, Erreichbarkeit aller Orte und NPCs)
npm run smoke      # Browser-Test mit Headless-Chrome (spielt alle Missionen durch, Screenshots in smoke-out/)
npm run build      # Produktions-Build nach dist/
```

## Projektstruktur

```
src/
  core/       Spielschleife-Helfer, Eingabe, Zeit & römischer Kalender, Zustand, Speichern
  world/      Tiles, Kartengenerator, Wegfindung
  entities/   Spieler, NPCs (Tagesroutinen), Tiere, Diebe
  gfx/        Prozedurale Grafik: Böden, Gebäude, Figuren, Icons, Licht
  systems/    Regeln (Bedingungen/Effekte), Missionen, Bedürfnisse, Inventar, Lexikon
  minigames/  Brot backen, Wasser schöpfen, Feilschen
  ui/         HUD, Dialoge, Fenster, Titel/Charakterwahl, Touch
  data/       Inhalte als JSON: Karte, Innenräume, NPCs, Dialoge, Missionen, Lexikon, Gegenstände, Läden
tools/        validate.mjs, smoke.mjs
```

Regeln für die Weiterentwicklung stehen in `CLAUDE.md`, der Phasenplan in `PLAN.md`.
