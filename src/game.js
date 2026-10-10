// Spielablauf: Szenen, Kartenwechsel, Interaktion, Zeit, Schlaf, Ohnmacht, Diebe, Zielmarkierungen
import { G } from './core/ctx.js';
import { TILE, RENT_INTERVAL, AUTOMATE_AFTER } from './core/config.js';
import { newState, saveGame, loadGame, tileToPx, migrateState } from './core/state.js';
import { advanceClock, advanceHours, ambientLight, isNight } from './core/time.js';
import { dateOfPlayedDay, formatRoman, formatGerman } from './core/calendar.js';
import { formatMoney } from './core/util.js';
import { buildExterior, buildInterior } from './world/mapgen.js';
import { prepareMap } from './gfx/maprender.js';
import { Renderer } from './gfx/renderer.js';
import { Player } from './entities/player.js';
import { NpcManager } from './entities/npcs.js';
import { updateNeeds } from './systems/needs.js';
import * as M from './systems/missions.js';
import * as Inv from './systems/inventory.js';
import { checkCond, changeMoney, changeStat } from './systems/rules.js';
import { unlockLex } from './systems/lexicon.js';
import { MINIGAMES, AUTO_RESULTS } from './minigames/index.js';
import * as Act from './systems/activities.js';
import * as Rumors from './systems/rumors.js';
import * as Offer from './systems/offerings.js';
import { buffFx, addBuff as addBuffDirect } from './systems/buffs.js';
import { festivalOf, isRaceDay } from './systems/festivals.js';
import * as Home from './systems/home.js';
import * as Social from './systems/social.js';
import * as Tasks from './systems/tasks.js';
import * as Estate from './systems/estate.js';
import { level as levelOf } from './systems/skills.js';

const GLYPH = {
  '!': ['1', '1', '1', '0', '1'],
  '?': ['111', '001', '011', '000', '010'],
  E: ['111', '100', '110', '100', '111'],
};

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.maps = {};
    this.mode = 'boot';
    this.t = 0;
    this.titleT = 0;
    this.player = null;
    this.focus = null;
    this.markerT = 0;
    this.slaveWarnT = 0;
    this.lastZone = null;
    this.mapById('rom');
  }

  // ---------- Karten ----------
  mapById(id) {
    if (this.maps[id]) return this.maps[id];
    let map;
    if (id === 'rom') map = buildExterior(G.data.map_rom);
    else {
      const def = G.data.interiors[id];
      if (!def) throw new Error(`Unbekannte Karte: ${id}`);
      map = buildInterior(id, def);
    }
    prepareMap(map);
    this.maps[id] = map;
    return map;
  }

  isInside() { return !!this.map && this.map.interior; }

  enterMap(id, x, y, dir) {
    const s = this.state;
    this.map = this.mapById(id);
    s.map = id;
    this.player.x = x; this.player.y = y;
    if (dir) this.player.dir = dir;
    this.npcs.enterMap(this.map);
    Home.applyHome(this.map);
    this.renderer.follow(this.map, x, y, true);
    this.lastZone = null;
    if (this.map.interior) {
      const def = G.data.interiors[id];
      if (def.lex) unlockLex(def.lex);
      if (s.home.map === id) this.save(false);
    }
    this.focus = null;
  }

  // ---------- Szenen ----------
  showTitle() {
    this.mode = 'title';
    G.ui.setInGame(false);
    G.ui.screens.title({
      hasSave: !!loadGame(),
      onNew: () => this.showCharSelect(),
      onContinue: () => this.loadSaved(),
      onHelp: () => { G.ui.screens.hide(); this.mode = 'titlehelp'; G.ui.panels.onClose = () => this.showTitle(); G.ui.panels.show('help'); },
    });
  }

  showCharSelect() {
    G.ui.screens.charSelect({
      onBack: () => this.showTitle(),
      onStart: (cls, gender, name) => this.newGame(cls, gender, name),
    });
  }

  setupState(state) {
    migrateState(state, G.data);
    this.state = state;
    G.state = state;
    const cls = G.data.classes[state.cls];
    this.player = new Player(cls.app[state.gender]);
    this.player.dir = state.dir || 'down';
    this.npcs = new NpcManager();
    this.map = null;
    G.ui.screens.hide();
    G.ui.setInGame(true);
    this.mode = 'play';
  }

  newGame(cls, gender, name) {
    this.setupState(newState(cls, gender, name, G.data));
    const s = this.state;
    G.ui.fade(() => this.enterMap(s.map, s.x, s.y, 'down')).then(() => {
      const d = dateOfPlayedDay(0);
      G.ui.showBanner(formatRoman(d), formatGerman(d));
      G.ui.dialog.start(G.data.classes[cls].intro);
    });
  }

  loadSaved() {
    const saved = loadGame();
    if (!saved) { G.ui.toast('Kein Spielstand gefunden.', 'warn'); return; }
    this.setupState(saved);
    G.ui.fade(() => this.enterMap(saved.map, saved.x, saved.y, saved.dir)).then(() => {
      G.ui.toast('Spielstand geladen.');
    });
  }

  save(manual) {
    const ok = saveGame(this.state);
    if (manual) G.ui.toast(ok ? 'Spiel gespeichert.' : 'Speichern nicht möglich (Browser-Speicher gesperrt).', ok ? '' : 'warn');
    return ok;
  }

  toTitle() {
    G.ui.fade(() => { this.mode = 'title'; this.showTitle(); });
  }

  // ---------- Hauptschleife ----------
  frame(dt) {
    this.t += dt;
    if (this.mode === 'title' || this.mode === 'titlehelp') {
      G.ui.update(dt, G.input);
      this.drawTitle(dt);
      return;
    }
    if (this.mode !== 'play' || !this.map) return;
    if (G.ui.isBlocking()) G.ui.update(dt, G.input);
    else this.update(dt);
    G.ui.hud.update(dt);
    G.ui.syncTouch();
    this.draw();
  }

  update(dt) {
    const s = this.state, input = G.input, p = this.player;
    s.playSeconds += dt;
    if (input.wasPressed('menu')) { G.ui.panels.show('menu'); return; }
    if (input.wasPressed('inventory')) { G.ui.panels.show('inventory'); return; }
    if (input.wasPressed('log')) { G.ui.panels.show('log'); return; }
    if (input.wasPressed('lexicon')) { G.ui.panels.show('lexicon'); return; }
    if (input.wasPressed('map')) { G.ui.panels.show('map'); return; }
    if (input.wasPressed('char')) { G.ui.panels.show('char'); return; }

    const { gained, newDay } = advanceClock(s.time, dt);
    if (updateNeeds(gained, p.sprinting)) { this.faint(); return; }
    if (newDay) this.onNewDay();

    const map = this.map;
    const px = p.x, py = p.y;
    p.update(dt, input, map, s.needs.energy > 3, (x, y) => this.npcBlock(x, y, px, py));

    const tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 3) / TILE);
    // Sklaven: Palatin nur mit Auftrag verlassen (wer schon draußen ist, darf zurücklaufen)
    if (!map.interior && s.cls === 'servus' && !s.flags.freed && !M.hasPermit()) {
      const z = map.zoneAt(tx, ty);
      const pz = map.zoneAt(Math.floor(px / TILE), Math.floor((py - 3) / TILE));
      const inside = (zz) => zz && zz.id === 'palatin';
      if (inside(pz) && !inside(z)) {
        p.x = px; p.y = py;
        if (this.t > this.slaveWarnT) {
          this.slaveWarnT = this.t + 4;
          G.ui.toast('Ohne Auftrag darfst du den Palatin nicht verlassen. Der Verwalter Philo vergibt die Aufträge.', 'warn');
          unlockLex('sklaverei');
        }
      } else if (!inside(z) && this.t > this.slaveWarnT) {
        this.slaveWarnT = this.t + 12;
        G.ui.toast('Dein Auftrag ist erledigt – kehr zum Haus auf dem Palatin zurück.', 'warn');
      }
    }
    // Türen
    const door = map.doors.get(map.key(Math.floor(p.x / TILE), Math.floor((p.y - 3) / TILE)));
    if (door) { this.useDoor(door, px, py); return; }
    // Viertel
    if (!map.interior) {
      const z = map.zoneAt(tx, ty);
      if (z && z !== this.lastZone) {
        if (this.lastZone) G.ui.showBanner(z.name, z.sub || '');
        this.lastZone = z;
        if (z.lex) unlockLex(z.lex);
        if (Social.repOf(z.id) >= 40 && s.flags[`greet_${z.id}`] !== s.time.day) {
          s.flags[`greet_${z.id}`] = s.time.day;
          G.ui.toast(`In ${z.name} kennt man dich – ${Social.repTitle(Social.repOf(z.id))}.`, 'stat');
        }
      }
    }
    M.checkAuto(map.id, tx, ty);
    this.npcs.update(dt, p);
    this.focus = this.findFocus();
    if (input.wasPressed('interact') || input.wasPressed('action')) this.interact();
    this.renderer.follow(map, p.x, p.y);
    this.markerT -= dt;
    if (this.markerT <= 0) {
      this.markerT = 0.5;
      for (const n of this.npcs.named) if (n.map === map.id) n.marker = M.npcMarker(n.id) || Tasks.marker(n.id);
    }
    s.x = p.x; s.y = p.y; s.dir = p.dir;
  }

  npcBlock(x, y, px, py) {
    for (const n of this.npcs.talkable()) {
      if (n.moving && !n.talking) continue;
      const d = Math.hypot(x - n.x, y - n.y);
      if (d < 9 && d < Math.hypot(px - n.x, py - n.y)) return true;
    }
    return false;
  }

  useDoor(door, px, py) {
    const s = this.state, p = this.player;
    if (door.exit) {
      const back = s.lastDoor && s.lastDoor.from === this.map.id ? s.lastDoor : null;
      const tgt = back || this.doorFront(this.map.id);
      if (!tgt) { p.x = px; p.y = py; return; }
      G.ui.fade(() => this.enterMap(tgt.map || 'rom', tgt.x, tgt.y, 'down'));
      return;
    }
    if (door.if && !checkCond(door.if)) {
      p.x = px; p.y = py + 4;
      if (door.deny) G.ui.dialog.start(door.deny);
      else G.ui.toast('Die Tür bleibt dir verschlossen.', 'warn');
      return;
    }
    const alt = door.alt && door.alt.find((a) => checkCond(a.if));
    const target = alt ? alt.to : door.to;
    const def = G.data.interiors[target];
    if (door.planned || !def) {
      // Übergang ist vorbereitet, der Innenraum folgt in einem späteren Schritt
      p.x = px; p.y = py + 4;
      if (this.t > (this.plannedT || 0)) {
        this.plannedT = this.t + 3;
        G.ui.toast(`${door.label || door.building?.name || 'Dieses Gebäude'}: Der Innenraum ist noch in Arbeit und folgt in einem späteren Schritt.`, 'warn');
      }
      if (door.building?.lex) unlockLex(door.building.lex);
      return;
    }
    const spawn = def.spawns[door.spawn || 'entry'];
    s.lastDoor = { from: target, map: this.map.id, ...tileToPx(door.x, door.y + 1) };
    G.ui.fade(() => this.enterMap(target, spawn[0] * TILE + 8, spawn[1] * TILE + 14, 'up'));
  }

  // Vorplatz der Außentür, die zu einem Innenraum führt
  doorFront(interiorId) {
    const rom = this.mapById('rom');
    for (const d of rom.doors.values()) if (d.to === interiorId || (d.alt && d.alt.some((a) => a.to === interiorId))) return { map: 'rom', ...tileToPx(d.x, d.y + 1) };
    return null;
  }

  // Schnellreise mit der Sänfte (lectica)
  travelCost() {
    const s = this.state;
    if (s.cls === 'nobilis') return 0;
    return 8;
  }

  canTravel() {
    const s = this.state;
    if (s.cls === 'servus' && !s.flags.freed) return 'Sklaven werden nicht getragen – sie tragen. Die Sänftenträger sind selbst meist Sklaven.';
    if (s.money < this.travelCost()) return 'Dafür reicht dein Geld nicht.';
    return null;
  }

  fastTravel(stationId) {
    const map = this.mapById('rom');
    const st = map.stations.find((x) => x.id === stationId);
    if (!st) return;
    const why = this.canTravel();
    if (why) { G.ui.toast(why, 'warn'); return; }
    const cost = this.travelCost();
    G.ui.fade(() => {
      if (cost) changeMoney(-cost);
      this.passHours(0.4);
      const pos = tileToPx(st.arrive[0], st.arrive[1]);
      this.enterMap('rom', pos.x, pos.y, 'down');
      unlockLex('lectica');
    }, 450).then(() => G.ui.showBanner(st.name, 'mit der Sänfte angekommen'));
  }

  // ---------- Interaktion ----------
  findFocus() {
    const p = this.player, map = this.map;
    const dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
    let best = null, bestD = 31;
    for (const n of this.npcs.talkable()) {
      const dx = n.x - p.x, dy = n.y - 4 - (p.y - 4);
      const d = Math.hypot(dx, dy);
      if (d >= bestD || d < 1) continue;
      if ((dx * dv[0] + dy * dv[1]) / d < 0.55) continue;
      best = n; bestD = d;
    }
    if (best) return { kind: 'npc', npc: best, x: best.x, y: best.y - 24 };
    const fx = Math.floor((p.x + dv[0] * 10) / TILE), fy = Math.floor((p.y - 4 + dv[1] * 11) / TILE);
    const it = map.interacts.get(map.key(fx, fy));
    if (it && map.inside(fx, fy)) return { kind: 'obj', it, x: fx * TILE + 8, y: fy * TILE - 4 };
    const b = map.buildingAt(fx, fy);
    if (b && (b.info || b.dialogue)) return { kind: 'info', b, x: fx * TILE + 8, y: fy * TILE - 4 };
    return null;
  }

  interact() {
    const f = this.focus;
    if (!f) return;
    const dlg = G.ui.dialog;
    if (f.kind === 'npc') {
      const n = f.npc;
      n.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[this.player.dir];
      if (n.kind === 'named') { dlg.start(n.def.dialogue, n); Social.talked(n.id); }
      else dlg.say(n, this.ambientLine(n));
      return;
    }
    if (f.kind === 'obj') {
      const it = f.it;
      if (it.type === 'door') {
        const d = it.door;
        if (d.dialogue) dlg.start(d.dialogue);
        else dlg.say(null, d.text || 'Die Tür ist verschlossen.', 'narr');
        if (d.lex) unlockLex(d.lex);
        return;
      }
      if (it.type === 'sign') { dlg.say(null, ['Aufgemalter Hinweis (Spielhilfe – echte Straßenschilder gab es in Rom nicht):', it.text], 'narr'); unlockLex('orientierung'); return; }
      if (it.type === 'travel') { G.ui.panels.show('travel', { from: it.station }); return; }
      if (it.type === 'activity') { Act.offer(it.id); return; }
      if (it.type === 'offer') { Offer.offer(it.id); return; }
      if (it.type === 'board') { G.ui.panels.show('board', { id: it.id }); unlockLex('dipinti'); return; }
      if (it.type === 'myshop') {
        if (this.state.flags.myshop) G.ui.panels.show('myshop');
        else dlg.say(null, ['Auf die Wand gemalt: „Locantur tabernae“ – Läden zu vermieten. Auskunft beim Verwalter der Insula.', 'So ähnlich stand es tatsächlich an einer Insula in Pompeji.'], 'narr');
        return;
      }
      if (it.type === 'slot') { G.ui.panels.show('furnish', { slot: it.slot }); return; }
      if (it.type === 'furniture') { this.useFurniture(it); return; }
      if (it.type === 'plant') { this.usePlant(it.slot); return; }
      if (it.type === 'altar' && G.data.interiors[this.map.id]?.temple) { Offer.offer(G.data.interiors[this.map.id].temple); return; }
      if (it.type === 'prices') { G.ui.panels.show('prices', { market: it.market }); unlockLex('handel'); return; }
      const node = it.dialogue || `obj_${it.type}`;
      if (G.data.dialogues[node]) dlg.start(node);
      return;
    }
    if (f.kind === 'info') {
      const b = f.b;
      if (b.dialogue) dlg.start(b.dialogue);
      else dlg.say(null, [`${b.name}`, b.info], 'narr');
      if (b.lex) unlockLex(b.lex);
    }
  }

  ambientLine(n) {
    const greet = Social.greeting();
    if (greet) return greet;
    const pools = G.data.dialogues._ambient;
    const night = isNight(this.state.time.hour);
    const pool = [].concat(
      night ? pools.night || [] : [],
      pools[n.role] || [],
      n.zone ? pools[n.zone.id] || [] : [],
      pools[`${this.state.cls}_hears`] || [],
    );
    const list = pool.length ? pool : pools.default;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Aktion nach einem Dialog (Minispiel, Laden, Schlaf)
  runAfter(after, npc) {
    if (after.type === 'shop') { G.ui.panels.show('shop', { id: after.id, npc }); return; }
    if (after.type === 'sleep') { this.sleep(); return; }
    if (after.type === 'activity') { Act.offer(after.id, npc); return; }
    if (after.type === 'panel') { G.ui.panels.show(after.id); return; }
    if (after.type === 'rumor') { Rumors.tellRumor(after.source, npc); return; }
    if (after.type === 'offer') { Offer.offer(after.id); return; }
    if (after.type === 'minigame') {
      const opts = { ...after.opts };
      if (!opts.app && npc) opts.app = npc.app;
      this.playMinigame(after.game, opts).then((r) => {
        if (after.then && !r.aborted) G.ui.dialog.start(after.then, npc && npc.map === this.map.id ? npc : null);
      });
    }
  }

  playMinigame(name, opts = {}) {
    const game = MINIGAMES[name];
    return new Promise((resolve) => G.ui.mini.start(game, opts, resolve)).then((r) => {
      if (!r.aborted) this.applyMinigameResult(name, r, opts);
      return r;
    });
  }

  applyMinigameResult(name, r, opts) {
    const s = this.state;
    s.vars.mg_score = r.score || 0;
    s.vars.mg_pay = Math.round((r.pay || 0) * (opts.payMul || 1));
    s.vars.mg_success = r.success ? 1 : 0;
    if (r.price !== undefined) {
      s.vars.mg_price = r.price;
      s.vars.mg_saved = (opts.budget || r.fair) - r.price;
    }
    s.mg[name] ||= { wins: 0, plays: 0 };
    s.mg[name].plays++;
    if (r.success) {
      s.mg[name].wins++;
      if (s.mg[name].wins === AUTOMATE_AFTER && AUTO_RESULTS[name]) G.ui.toast('Du hast Routine! Künftig kannst du diese Arbeit auch „routiniert erledigen“.', 'stat');
    }
    if (opts.hours !== 0) this.passHours(opts.hours ?? 0.75);
    s.needs.energy = Math.max(0, s.needs.energy - (opts.energy ?? 6));
    s.needs.hygiene = Math.max(0, s.needs.hygiene - (opts.dirt ?? 4));
  }

  autoMinigame(name, opts = {}) {
    const r = AUTO_RESULTS[name];
    this.applyMinigameResult(name, { ...r, success: false }, { ...opts, hours: (opts.hours ?? 0.75) * 1.5 });
    G.ui.toast('Routiniert erledigt – die Zeit vergeht.', '');
  }

  haggleBuy(shopId, itemId, price, npc) {
    const def = Inv.itemDef(itemId);
    this.playMinigame('haggle', { patience: (levelOf('handel') >= 4 ? 0.7 : 1) * (1 - buffFx('haggle')), fair: price, label: def.name, app: npc ? npc.app : null, hours: 0.15, energy: 0, dirt: 0 }).then((r) => {
      if (r.aborted) return;
      if (this.state.money < r.price) { G.ui.toast('Dafür reicht dein Geld nicht.', 'cost'); return; }
      changeMoney(-r.price);
      Inv.add(itemId, 1);
      unlockLex('preise');
    });
  }

  // ---------- Zeit, Schlaf, Tageswechsel ----------
  passHours(h) {
    const newDay = advanceHours(this.state.time, h);
    updateNeeds(h, false);
    if (newDay) this.onNewDay();
  }

  onNewDay() {
    const s = this.state;
    const d = dateOfPlayedDay(s.time.day);
    const fest = festivalOf(s.time.day);
    G.ui.showBanner(formatRoman(d), fest ? `${formatGerman(d)} · ${fest.name}` : formatGerman(d));
    unlockLex('kalender');
    if (isRaceDay(s.time.day)) G.ui.toast(`Heute Wagenrennen im Circus Maximus (Hora VI–X)${fest && fest.circus ? ` – ${fest.name}` : ''}!`, 'mission');
    if (s.rent) {
      if (s.time.day === s.rent.due) G.ui.toast(`Heute ist die Miete fällig: ${formatMoney(s.rent.amount)}. Zahle beim Verwalter Hilarus in der Insula.`, 'warn');
      else if (s.time.day > s.rent.due + 1) { G.ui.toast('Deine Miete ist überfällig! Die Nachbarn reden schon.', 'warn'); changeStat('vicinia', -2); }
    }
    if (s.cls === 'plebs' && Home.comfort() >= 3 && s.time.day % 2 === 0) changeStat('familia', 1, true);
    Tasks.newDay();
    Estate.dailyIncome();
    Estate.dailySales();
    Social.spouseMorning();
    for (const [id, m] of Object.entries(s.missions)) {
      const def = M.mdef(id);
      if (m.status === 'active' && def.daily) M.abandonMission(id);
    }
  }

  sleep() {
    const s = this.state;
    G.ui.fade(() => {
      const h = s.time.hour;
      this.passHours(24 - h + 0.3);
      s.needs.energy = 100;
      const comfort = Home.comfort();
      s.needs.health = Math.min(100, s.needs.health + 15 + comfort);
      if (comfort >= 4) addBuffDirect('schlaf', 'Gut geschlafen: weniger müde', 8, { tired: -0.15 });
      s.needs.satiety = Math.max(5, s.needs.satiety - 10);
      s.needs.hygiene = Math.max(0, s.needs.hygiene - 4);
      s.light = null;
      this.npcs.enterMap(this.map);
      this.save(false);
    }, 600).then(() => G.ui.toast('Du hast geschlafen. Ein neuer Tag beginnt. (Gespeichert)'));
  }

  faint() {
    const s = this.state;
    const lost = s.cls === 'servus' ? 0 : Math.floor(s.money * 0.1);
    G.ui.fade(() => {
      const home = s.home;
      const pos = tileToPx(home.at[0], home.at[1]);
      this.passHours(24 - s.time.hour + 0.5);
      s.needs.energy = 70; s.needs.health = 45; s.needs.satiety = Math.max(s.needs.satiety, 35); s.needs.hygiene = Math.max(s.needs.hygiene, 25);
      s.money -= lost;
      if (s.cls === 'servus') changeStat('fides', -3, true);
      this.enterMap(home.map, pos.x, pos.y, 'down');
    }, 800).then(() => {
      G.ui.dialog.say(null, [
        'Dir wird schwarz vor Augen …',
        `Du kommst zu Hause wieder zu dir.${lost ? ` Jemand hat dir ${formatMoney(lost)} abgenommen.` : ''} Achte auf Essen, Schlaf und Gesundheit!`,
      ], 'narr');
    });
  }

  payRent() {
    const s = this.state;
    if (!s.rent) return;
    if (s.money < s.rent.amount) { G.ui.toast('Du hast nicht genug Geld für die Miete.', 'warn'); return; }
    changeMoney(-s.rent.amount);
    s.rent.due = Math.max(s.rent.due, s.time.day) + RENT_INTERVAL;
    changeStat('vicinia', 1);
  }

  // ---------- Diebe ----------
  onThiefSpawn() {
    if (!this.state.flags.thiefWarned) {
      this.state.flags.thiefWarned = true;
      G.ui.toast('Ein Schatten löst sich aus einer Gasse … Lauf weg (Shift)! Nachts ist Rom gefährlich.', 'warn');
      unlockLex('nacht');
    }
  }

  onThiefCatch() {
    const s = this.state;
    if (s.money <= 0) { G.ui.toast('Ein Dieb durchsucht dich – und findet nichts.', 'warn'); return; }
    const amount = Math.max(1, Math.floor(s.money * 0.2));
    s.money -= amount;
    G.ui.toast(`Ein Dieb hat dir ${formatMoney(amount)} gestohlen!`, 'cost');
  }

  // ---------- Zeichnen ----------
  draw() {
    const s = this.state;
    const map = this.map;
    const light = map.interior ? interiorLight(s.time.hour) : ambientLight(s.time.hour);
    const lights = [...map.lights, ...(map.extraLights || [])];
    const pr = s.light ? (G.data.items[s.light].light || 40) : map.interior ? 34 : 26;
    lights.push({ x: this.player.x, y: this.player.y - 8, r: pr, warm: !!s.light, flicker: !!s.light });
    const ents = [...this.npcs.list(), this.player];
    this.renderer.draw(map, ents, light, lights, this.t, s.time.hour, (ctx, cam) => this.drawMarkers(ctx, cam));
  }

  drawMarkers(ctx, cam) {
    const t = this.t;
    for (const n of this.npcs.named) {
      if (n.map !== this.map.id || !n.marker) continue;
      bubble(ctx, n.x - cam.x, n.y - cam.y - 30 + Math.round(Math.sin(t * 4) * 1.5), n.marker, n.marker === '!' ? '#f2c14e' : '#7fd0ff');
    }
    if (map_isHome(this)) {
      for (const sl of Home.slotsOf(this.map.id)) {
        const hs = Home.homeState(this.map.id);
        if (hs.furniture[sl.id] || sl.builtin) continue;
        const sx = sl.at[0] * 16 + 8 - cam.x, sy = sl.at[1] * 16 + 6 - cam.y;
        ctx.fillStyle = 'rgba(242,193,78,0.55)';
        ctx.fillRect(sx - 3, sy, 7, 1); ctx.fillRect(sx, sy - 3, 1, 7);
      }
    }
    if (this.focus) bubble(ctx, this.focus.x - cam.x, this.focus.y - cam.y - (this.focus.kind === 'npc' && this.focus.npc.marker ? 18 : 0), 'E', '#f4eedc');
    this.drawObjectiveArrow(ctx, cam);
  }

  drawObjectiveArrow(ctx, cam) {
    const s = this.state;
    if (!s.tracked) return;
    let tgt = M.targetOf(s.tracked);
    if (!tgt) return;
    const map = this.map;
    let lift = 30;
    if (tgt.map === map.id && Math.hypot(tgt.x - this.player.x, tgt.y - this.player.y) < 24) return;
    if (tgt.map === map.id && M.currentStep(s.tracked).target.npc) lift = 46;
    if (tgt.map !== map.id) {
      if (map.interior) {
        const k = [...map.doors.keys()][0];
        if (k === undefined) return;
        tgt = { x: (k % map.w) * 16 + 8, y: Math.floor(k / map.w) * 16 + 8 };
      } else {
        const door = [...map.doors.values()].find((d) => d.to === tgt.map);
        if (!door) return;
        tgt = { x: door.x * 16 + 8, y: door.y * 16 + 10 };
      }
    }
    const { vw, vh } = this.renderer;
    const sx = tgt.x - cam.x, sy = tgt.y - cam.y - lift;
    const t = this.t;
    if (sx > 8 && sx < vw - 8 && sy > 8 && sy < vh - 8) {
      const bob = Math.round(Math.sin(t * 5) * 2);
      arrowDown(ctx, Math.round(sx), Math.round(sy - 6 + bob));
      return;
    }
    const cx = vw / 2, cy = vh / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const r = Math.min(vw, vh) / 2 - 14;
    const ex = cx + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
    ctx.save();
    ctx.translate(Math.round(ex), Math.round(ey));
    ctx.rotate(ang);
    ctx.fillStyle = '#2b1b12';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-1, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawTitle(dt) {
    const map = this.mapById('rom');
    this.titleT += dt;
    const path = [[126, 90], [146, 66], [128, 112], [130, 130], [84, 96], [70, 48], [100, 66]];
    const seg = (this.titleT / 14) % path.length;
    const i = Math.floor(seg), f = seg - i;
    const a = path[i], b = path[(i + 1) % path.length];
    const e = f * f * (3 - 2 * f);
    const x = (a[0] + (b[0] - a[0]) * e) * 16, y = (a[1] + (b[1] - a[1]) * e) * 16;
    this.renderer.follow(map, x, y, true);
    this.renderer.draw(map, [], ambientLight(10.9), map.lights, this.t, 10.9);
  }

  isSlaveFree() { return Act.slaveFreeTime() || M.hasPermit(); }

  // Zusätzliche Antworten bei benannten NPCs: Aufträge, Geschenke, Heiratsantrag
  npcExtraOpts(npc) {
    const id = npc.id;
    const opts = [...Tasks.npcOpts(id)];
    if (!G.data.social.noRel.includes(id) && !Social.giftedToday(id) && Social.giftable().length) {
      opts.push({ t: 'Ein Geschenk geben', fn: () => G.ui.panels.show('gift', { npc: id, ent: npc }) });
    }
    if (Social.canPropose(id)) {
      const word = this.state.cls === 'servus' ? 'Um eine Verbindung bitten (contubernium)' : 'Um die Ehe bitten';
      opts.push({ t: word, fn: () => G.ui.dialog.custom({ text: Social.propose(id) }, npc) });
    }
    return opts;
  }

  // ---------- Zuhause ----------
  useFurniture(it) {
    const def = G.data.items[it.item];
    const opts = [];
    if (def.special === 'cook') opts.push({ t: 'Kochen', fn: () => G.ui.panels.show('cook') });
    if (def.special === 'bed') opts.push({ t: 'Schlafen', fn: () => G.ui.dialog.start('obj_bed') });
    if (def.special === 'lar') opts.push({ t: 'Den Laren opfern', fn: () => G.ui.dialog.start('obj_lararium') });
    opts.push({ t: 'Umstellen / wegräumen', fn: () => G.ui.panels.show('furnish', { slot: it.slot }) });
    opts.push({ t: 'Nichts' });
    G.ui.dialog.custom({ text: def.desc, opts, name: def.name });
  }

  usePlant(slotId) {
    const hs = Home.homeState(this.map.id);
    const p = hs.plants[slotId];
    if (!p) {
      const seeds = Inv.list().filter((x) => x.def.seed);
      if (!seeds.length) { G.ui.dialog.custom({ text: 'Ein leeres Beet. Saatgut gibt es bei der Gemüsehändlerin am Forum Holitorium.', name: 'Pflanzplatz' }); return; }
      G.ui.dialog.custom({ text: 'Was willst du pflanzen?', name: 'Pflanzplatz',
        opts: [...seeds.map((x) => ({ t: `${x.def.name} (${x.n}×)`, fn: () => Home.sow(slotId, x.id) })), { t: 'Nichts' }] });
      return;
    }
    const st = Home.plantStage(p);
    const name = G.data.items[p.seed].name;
    if (st >= 3) { G.ui.dialog.custom({ text: `${name}: reif!`, name: 'Pflanze', opts: [{ t: 'Ernten', fn: () => Home.harvest(slotId) }, { t: 'Später' }] }); return; }
    G.ui.dialog.custom({ text: `${name}: ${st === 1 ? 'gerade aufgegangen' : 'wächst kräftig'}.`, name: 'Pflanze',
      opts: [{ t: 'Gießen', fn: () => Home.water(slotId) }, { t: 'Später' }] });
  }

  // ---------- Debug/Test-Schnittstelle ----------
  debugTeleport(mapId, tx, ty) {
    const p = tileToPx(tx, ty);
    this.enterMap(mapId, p.x, p.y, 'down');
  }
}

const map_isHome = (g) => g.map && g.map.interior && Home.isHome(g.map.id);

function interiorLight(h) {
  const l = ambientLight(h);
  return { dark: l.dark * 0.6, tint: l.tint ? [l.tint[0], l.tint[1], l.tint[2], l.tint[3] * 0.6] : [255, 200, 140, 0.05] };
}

function bubble(ctx, x, y, glyph, color) {
  x = Math.round(x); y = Math.round(y);
  const g = GLYPH[glyph];
  const w = g[0].length, bw = w + 4, left = x - Math.ceil(bw / 2);
  ctx.fillStyle = '#2b1b12';
  ctx.fillRect(left - 1, y - 4, bw + 2, 11);
  ctx.fillStyle = color;
  ctx.fillRect(left, y - 3, bw, 9);
  ctx.fillStyle = '#2b1b12';
  const ox = x - Math.floor(w / 2);
  g.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === '1') ctx.fillRect(ox + rx, y - 1 + ry, 1, 1); }));
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y + 6, 3, 1);
  ctx.fillRect(x, y + 7, 1, 1);
}

function arrowDown(ctx, x, y) {
  ctx.fillStyle = '#2b1b12';
  ctx.fillRect(x - 4, y - 5, 9, 4);
  ctx.fillRect(x - 6, y - 1, 13, 2);
  ctx.fillRect(x - 4, y + 1, 9, 2);
  ctx.fillRect(x - 2, y + 3, 5, 2);
  ctx.fillRect(x - 1, y + 5, 3, 1);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(x - 3, y - 4, 7, 3);
  ctx.fillRect(x - 5, y - 1, 11, 1);
  ctx.fillRect(x - 3, y, 7, 2);
  ctx.fillRect(x - 1, y + 2, 3, 2);
  ctx.fillRect(x, y + 4, 1, 1);
}

