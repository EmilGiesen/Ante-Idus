# PLAN.md – Roma Vivit

Lebenssimulation im Rom Caesars. Start: Kalenden des April 46 v. Chr. (708 a.u.c.) – Caesar kämpft noch in Afrika
(Thapsus, April 46), Rom wartet auf seine Rückkehr. Höhepunkt: Iden des März 44 v. Chr. Danach Weiterspielen.

## Grundsatzentscheidungen
- **Zeitkompression:** Ein gespielter Tag (≈ 11 min) entspricht einer *Marktwoche* (Nundinum, 8 Kalendertage).
  Der Kalender springt beim Schlafen um 8 Tage weiter. Konfigurierbar in `src/core/config.js` (`DAYS_PER_PLAYED_DAY`).
  Ab Phase 4 kann man zusätzlich zu Hause „bis zum nächsten Ereignis ruhen“ (Kapitel-Zeitsprung), damit die
  Iden des März nach ca. 6–10 Stunden Spielzeit erreichbar sind.
- **Jahreszeiten:** Der Kalender war 46 v. Chr. rund drei Monate „vorgelaufen“. Das Spiel zeigt das korrekte
  römische Datum, Licht/Wetter folgen aber der astronomischen Jahreszeit (im Lexikon erklärt).
- **Karte:** Eine Außenkarte „Rom“ (200 × 170 Tiles à 16 px) mit festen Layern in `src/data/map_rom.json`,
  entworfen in `tools/build_map.mjs` nach dem Plan in `docs/karte_uebersicht.md`; Chunk-Rendering (nur sichtbare
  32×32-Blöcke). Innenräume sind eigene kleine Karten aus ASCII-Layouts.
- **UI:** DOM-Overlays über einem pixeligen Canvas (scharfe Schrift, einfache Bedienung, auch Touch).

## Phase 1 – Spielbarer Kern ✅ (dieser Stand)
- Titelbildschirm, Charakterwahl (Adel / Plebejer / Sklave), Name, Geschlecht
- Außenkarte mit Forum Romanum, Forum Iulium (Baustelle), Palatin, Subura, Circus Maximus (Kulisse),
  Velabrum/Forum Boarium, Tiber (Kulisse); Innenräume: zwei Domus, Insula-Zimmer, Bäckerei
- Bewegung (4 Richtungen, Laufanimation), Sprinten, Kollision, Kamera, Zonenanzeige
- NPCs mit Tagesroutinen und Dialogen (Auswahlmöglichkeiten, Bedingungen, Effekte), Tiere
- Tag-Nacht-Zyklus (12 Horae + 4 Vigiliae), Licht, Gefahr bei Nacht (Diebe)
- Bedürfnisse: Sättigung, Energie, Gesundheit, Hygiene; Schlafen, Essen, Waschen am Brunnen
- Geld (As/Sesterz/Denar), Läden, Inventar, Missions-Logbuch, Lexikon (Freischaltung)
- Je Klasse 3 Missionen; Minispiele: Brot backen, Wasser schöpfen, Feilschen; Automatisierung nach 3 Erfolgen
- Klassen-Einschränkung Sklave (Palatin nur mit Auftrag verlassen), Miete für Plebejer
- Speichern/Laden (localStorage, try/catch), Touch-Steuerung (Basis)

## Zwischenschritt – Neue Stadtkarte ✅
- Ganz Rom stark verkleinert, aber lagerichtig: Tiber mit Biegung, Tiberinsel, Trans Tiberim, Ianiculum, Ager Vaticanus,
  Marsfeld (Theater des Pompeius, Curia Pompeia, Saepta, Circus Flaminius), alle sieben Hügel, Servianische Mauer mit 9 Toren,
  Forum mit allen Hauptbauten, Forum Iulium, Macellum, Märkte, Emporium, Via Appia mit Gräbern, drei Brücken
- Straßennetz (Via Sacra, Argiletum, Clivus Suburanus, Vicus Tuscus/Iugarius, Via Flaminia …), Treppen auf die Hügel
- Minikarte, Stadtplan (M), Viertel-Einblendung, aufgemalte Wegweiser, Sänften-Schnellreise an 12 Plätzen
- Vorbereitete Türen (Innenräume folgen): Taverne, Töpferladen, Balneum (Subura), Tempel des Saturn, Basilica Aemilia, Curia Pompeia
- Curia Cornelia steht; Phase 4: Ereignis 44 v. Chr. macht sie zur Baustelle der Curia Iulia

## Phase 2 – Die ganze Stadt
- Karte erweitern: Marsfeld, Theater des Pompeius mit Curia Pompeia, Tiberhafen (Emporium/Lagerhallen),
  Tiberinsel, Kapitol begehbar (Jupitertempel), Carinae/Esquilin
- Öffentliche Bäder (Balneae), Thermopolia, Tavernen, Lararium/Compitum-Schreine
- Schnellreise: Sänfte (Adel kostenlos, sonst gegen Geld), Mietsänften an Plätzen
- Weitere NPC-Typen mit Routinen (Priester, Soldaten, Kinder, Wasserträger), dichtere Menschenmengen
- Minispiele: Würfelspiel (Tali/Tesserae) in der Taverne, Wagenrennen mit Wetten (vier *factiones*)

## Phase 3 – Lebenswege vertiefen
- **Adel:** Salutatio täglich, Senatssitzungen mit Folgen, Convivium ausrichten (Gäste, Sitzordnung, Menü),
  Wahlkampf in der *toga candida*, Spiele finanzieren, politische Ehe; Ressourcen Dignitas, Verbündete, Fraktionen
- **Plebejer:** Berufe (Bäcker, Töpfer, Lastenträger, Händler) mit Stufen, Patron & Sportula, eigener Laden,
  Familie gründen/versorgen, Insula-Brand-Mission
- **Sklave:** Tagesplan des Herrn, Vertrauen, Peculium, Thermen begleiten, Gastmahl bedienen,
  Freilassung (*manumissio*) → Weiterspielen als Freigelassene(r) mit Pflichten gegenüber dem Patron
- Beziehungssystem zu NPCs und Gruppen (Caesarianer, Optimaten, Nachbarschaft, Collegia)

## Phase 4 – Geschichte & Ereignisse
- Zeitachse: Nachricht von Thapsus (Apr. 46), Caesars Rückkehr (Quintilis 46), vier Triumphzüge und Weihung
  des Forum Iulium / Venus-Genetrix-Tempels (Sept. 46), Kalenderreform & Jahr der Verwirrung, Spanienfeldzug
  (Munda, März 45), *dictator perpetuo* (Feb. 44), Lupercalia (15. Feb. 44), **Iden des März 44** in der
  Curia Pompeia, Leichenrede & Unruhen, Zeit danach (Antonius, Octavian) – Weiterspielen
- Ereignisse verändern die Stadt (Dekoration, NPC-Dialoge, Preise, Zugänge)
- Zufallsereignisse: Insula-Brand, Tiberhochwasser, Sommerfieber, Diebe, Gladiatorenspiele (Forum/Holzarenen)
- Kapitel-Zeitsprung „bis zum nächsten Ereignis ruhen“

## Phase 5 – Feinschliff
- Lexikon vollständig (Orte, Berufe, Essen, Preise, Politik, Alltag, Religion) mit Quellen
- Balancing (Geld, Bedürfnisse, Belohnungsrhythmus), Erfolge/Meilensteine
- Bessere Touch-Steuerung, Einstellungen (Textgeschwindigkeit, Tageslänge), Barrierefreiheit
- Performance (Chunk-Rendering), mehrere Speicherstände
