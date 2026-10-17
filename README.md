# Ante Idus – Ein Leben im Rom Caesars

*Ante Idus* heißt „vor den Iden“. Das Spiel beginnt im Frühjahr 46 v. Chr. und läuft auf die Iden des März 44 v. Chr. zu,
den Tag, an dem Caesar ermordet wird.

Eine Lebenssimulation im Browser: Top-Down-Pixelgrafik (komplett im Code gezeichnet), drei Lebenswege
(Adel, Plebejer, Sklave/Sklavin), Tag-Nacht-Zyklus, Missionen, Minispiele, freie Aktivitäten
(Arbeiten, Fischen, Kochen, Handeln, Wetten, Wohnung einrichten, Freundschaften …) und ein Lexikon mit Quellenangaben.

## ⚠️ Ehrlicher Hinweis: Dieses Projekt ist zu 100 % „vibe-coded“

Ich hatte einfach Lust auf ein **realistisches Spiel aus der Römerzeit, das auf echten historischen Daten beruht**,
und habe es komplett von einer KI (Claude) bauen lassen. Ich habe nur beschrieben, was ich haben will, und das Ergebnis
gespielt.

Das heißt konkret:

- **Den Code habe ich nicht gelesen oder geprüft.** Keine einzige Zeile.
- **Die historischen Angaben habe ich nicht überprüft.** Orte, Daten, Preise, Namen, Lexikontexte und Quellenangaben
  stammen von der KI. Sie sollen dem Forschungsstand entsprechen, aber es können Fehler, Vereinfachungen oder
  falsche Quellenangaben dabei sein. Für Referate, Hausarbeiten oder Ähnliches bitte **nicht** als Quelle verwenden,
  sondern selbst nachschlagen.
- Einiges ist bewusst zugunsten des Spielspaßes vereinfacht (z. B. kurze Wege, Wandinschriften als Auftragsbrett,
  ein Wettstand im Circus). Das Lexikon im Spiel weist meistens darauf hin.

Es ist ein Spaßprojekt. Wenn dir etwas auffällt, das historisch oder technisch falsch ist: gern melden.

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
| I / L / K / M / C | Inventar / Logbuch / Lexikon / Stadtplan / Charakter |
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
  systems/    Regeln, Missionen, Bedürfnisse, Inventar, Lexikon, Aktivitäten, Handel, Beziehungen …
  minigames/  Backen, Wasser schöpfen, Feilschen, Lasten tragen, Bauen, Fischen, Kochen, Würfeln, Wagenrennen
  ui/         HUD, Dialoge, Fenster, Titel/Charakterwahl, Touch
  data/       Inhalte als JSON: Karte, Innenräume, NPCs, Dialoge, Missionen, Lexikon, Gegenstände, Läden …
tools/        build_map.mjs, validate.mjs, smoke.mjs
```

Die Regeln, nach denen die KI das Projekt weiterentwickelt, stehen in `CLAUDE.md`, der Phasenplan in `PLAN.md`.
