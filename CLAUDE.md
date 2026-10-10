# CLAUDE.md – Projektregeln „Roma Vivit“

Browser-Lebenssimulation im Rom Caesars (Frühjahr 46 v. Chr. bis nach den Iden des März 44 v. Chr.).
Diese Regeln gelten für **alle** Sitzungen. Den Phasenplan findest du in `PLAN.md`.

## 1. Spielspaß vor Realismus
- Kein Weg länger als ca. 20–30 s Echtzeit (Gehen ≈ 5,5 Tiles/s, Sprinten ≈ 9 Tiles/s).
- Ein Ingame-Tag ≈ 11 min Echtzeit (Tag 8 min, Nacht 3 min); Schlafen überspringt die Nacht.
- Wiederkehrende Tätigkeiten sind Minispiele (15–45 s) und werden nach einigen erfolgreichen Durchgängen automatisierbar.
- Bedürfnisse sinken langsam und strafen mild (Ohnmacht → Aufwachen zu Hause, kleiner Verlust). Nie nervig.
- Missionen sind Angebote, kein Zwang. Ständig kleine Belohnungen (Geld, Lexikon-Einträge, Ansehen).
- Historische Infos im Spiel max. 1–2 Sätze; Ausführliches gehört ins Lexikon.

## 2. Historische Genauigkeit
- Aktueller Forschungsstand. Unsichere Zahlen als **Schätzung** im Lexikon kennzeichnen (`"estimate": true`).
- Jeder Lexikon-Eintrag nennt Quellen (antik: Sueton, Cicero, Plutarch, Cassius Dio, Varro …; modern: Forschung).
- Caesar ist **Diktator**, nie „Kaiser“. Es gibt keinen Kaiser, keinen Prinzipat.
- **Verbotene Anachronismen** (Auswahl): Kolosseum, Kaiserthermen (Agrippa-, Trajans-, Caracallathermen), Pantheon,
  Kaiserfora (außer Forum Iulium), Tempel des Divus Iulius, Augustusforum, Marcellustheater, Ara Pacis,
  Apollontempel auf dem Palatin, Obelisk im Circus Maximus (erst 10 v. Chr.), Delfine als Rundenzähler (33 v. Chr.),
  Vigiles (erst 6 n. Chr.), Prätorianergarde in Rom, Aquädukte nach 33 v. Chr. (Aqua Iulia, Virgo, Claudia …),
  Monatsname „Augustus“; „Iulius“ erst ab 44 v. Chr. (vorher Quintilis). Keine Kartoffeln, Tomaten, Mais, Zucker.
- Erlaubte Aquädukte: Aqua Appia, Anio Vetus, Aqua Marcia, Aqua Tepula.
- Stand 46 v. Chr.: Forum Iulium im Bau (Weihung 26. Sept. 46), Basilica Iulia im Bau (Weihung 46, unvollendet).
  Die Curia brannte 52 v. Chr. ab und wurde neu gebaut; 44 v. Chr. wird ein Neubau beschlossen. Der Senat tagt oft auch
  in Tempeln (z. B. Concordia). Theater des Pompeius mit Curia Pompeia existiert (55 v. Chr.).
- Kalender: vorjulianisch bis Ende 46 v. Chr. (46 = „Jahr der Verwirrung“, 445 Tage), julianisch ab 1. Jan. 45 v. Chr.
- Geld: 1 Denar = 4 Sesterzen = 16 Asse. Intern wird **immer in Assen** gerechnet.
- Sklaverei ernsthaft und respektvoll darstellen: Härte, Abhängigkeit und Unfreiheit zeigen, nichts verharmlosen,
  keine explizite Gewalt. Sklavinnen/Sklaven sind Menschen mit Namen, Herkunft und Zielen.
- Personen: Historische Figuren (Caesar, Cicero, Brutus …) nur in belegten Rollen; erfundene NPCs tragen
  plausible römische / griechische / andere Namen.

## 3. Code-Struktur
- Vanilla JavaScript (ES-Module), HTML, CSS, Canvas 2D. Vite nur als Dev-Server/Bundler, keine Laufzeit-Abhängigkeiten.
- **Keine externen Assets**: alle Grafiken werden im Code gezeichnet (`src/gfx/`), keine Bilder, Sounds, Webfonts.
- Inhalte sind **Daten** in `src/data/*.json` (NPCs, Dialoge, Missionen, Lexikon, Items, Karten, Klassen).
- **Stadtkarte:** `src/data/map_rom.json` (200 × 170 Tiles) enthält feste Layer: `ground` (ein Zeichen pro Tile,
  Legende in `src/world/tiles.js`), `buildings`, `deco`, optional `collision`, dazu Zonen, Bereiche, Anker
  (benannte NPC-Positionen, in `npcs.json` als `"@name"`), Sänftenplätze. Die Datei wird von `tools/build_map.mjs`
  erzeugt (`npm run map`) – Kartenänderungen dort vornehmen, nie zur Laufzeit zufällig generieren.
- Lagebeziehungen der Karte folgen `docs/karte_uebersicht.md` (freigegebener Plan).
- Türen zu noch nicht gebauten Innenräumen tragen `"planned": true`; der Innenraum kommt später in `interiors.json`.
  Neue Inhalte möglichst nur dort hinzufügen; Code nur ändern, wenn ein neuer *Mechanismus* nötig ist.
- JSON wird per `fetch(new URL('./data/x.json', import.meta.url))` geladen (funktioniert mit Vite und jedem Static-Server).
- Ordner:
  - `src/core/` – Spielschleife, Eingabe, Zeit/Kalender, Zustand, Speichern, Event-Bus
  - `src/world/` – Tiles, Kartengenerator, Kollision, Zonen
  - `src/entities/` – Spieler, NPCs, Tiere
  - `src/gfx/` – Sprite-Generator, Gebäude-/Tile-Zeichnung, Licht
  - `src/systems/` – Bedürfnisse, Geld, Inventar, Missionen, Dialoge, Lexikon, Ereignisse
  - `src/minigames/` – je Minispiel eine Datei, gemeinsame Schnittstelle `start(ctx) → Promise<result>`
  - `src/ui/` – DOM-Overlays (HUD, Dialogbox, Inventar, Logbuch, Lexikon, Menüs)
- Spiellogik-Zustand liegt zentral in `state` (serialisierbar). Keine Spiel-Logik in UI-Dateien.
- localStorage immer in `try/catch`; das Spiel muss ohne Speicher laufen.
- UI-Texte auf Deutsch; lateinische Fachbegriffe kursiv/mit Erklärung.
- Kommentare knapp, auf Deutsch oder Englisch – im Projekt einheitlich Deutsch.

## 4. Arbeitsweise
- Nach jeder Phase: `npm run map` (falls Karte geändert, 0 Warnungen), `npm run validate` (Datenprüfung),
  `npm run build` und `npm run smoke` (Headless-Chrome, spielt alle Missionen durch) müssen fehlerfrei laufen, dann Git-Commit.
- Neue Missionen in `tools/smoke.mjs` (Abschnitt „Alle Missionen …“) mit einem Durchlauf absichern.
- Steuerung: WASD/Pfeile laufen, Shift sprinten, E interagieren, I Inventar, L Logbuch, K Lexikon, M Stadtplan, Esc Menü.
