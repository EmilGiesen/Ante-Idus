// Smoke-Test: startet den Dev-Server, öffnet das Spiel in Headless-Chrome, spielt alle Klassen kurz an,
// macht Screenshots (smoke-out/) und schlägt bei JavaScript-Fehlern fehl.
// Chrome/Edge wird automatisch gesucht oder über die Umgebungsvariable CHROME_PATH angegeben.
// Optionen: --dist (testet den Produktions-Build aus dist/), --mobile (Handy-Ansicht mit Touch)
import { createServer, preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) { console.error('Kein Chrome/Edge gefunden. Setze CHROME_PATH.'); process.exit(2); }

const OUT = new URL(`../smoke-out/${process.argv.includes('--mobile') ? 'mobile/' : ''}`, import.meta.url);
mkdirSync(OUT, { recursive: true });
const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, OUT)) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DIST = process.argv.includes('--dist');
const MOBILE = process.argv.includes('--mobile');
const server = DIST
  ? await preview({ preview: { port: 5199, open: false }, logLevel: 'error' })
  : await createServer({ server: { port: 5199, open: false }, logLevel: 'error' });
if (!DIST) await server.listen();
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport(MOBILE ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });

const press = async (code, n = 1, wait = 120) => { for (let i = 0; i < n; i++) { await page.keyboard.press(code); await sleep(wait); } };
const hold = async (code, ms) => { await page.keyboard.down(code); await sleep(ms); await page.keyboard.up(code); };
const closeDialogs = async () => {
  for (let i = 0; i < 25; i++) {
    const open = await page.evaluate(() => window.__rv.G.ui.dialog.open);
    if (!open) return;
    await press('KeyE', 1, 160);
  }
};
const ev = (fn, ...a) => page.evaluate(fn, ...a);

try {
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__rv && window.__rv.game.mode === 'title', { timeout: 20000 });
  await sleep(800);
  await shot(page, '01-titel');
  await ev(() => window.__rv.game.showCharSelect());
  await sleep(500);
  await shot(page, '02-charakterwahl');

  for (const cls of ['plebs', 'nobilis', 'servus']) {
    await ev((c) => window.__rv.game.newGame(c, c === 'nobilis' ? 'f' : 'm', 'Testa'), cls);
    await sleep(1200);
    await shot(page, `10-${cls}-intro`);
    await closeDialogs();
    await hold('KeyS', 400); await hold('KeyD', 400); await hold('KeyW', 300);
    await shot(page, `11-${cls}-start`);
    await press('KeyI'); await sleep(200); await shot(page, `12-${cls}-inventar`); await press('Escape');
    await press('KeyL'); await sleep(200); await shot(page, `13-${cls}-logbuch`); await press('Escape');
    await press('KeyK'); await sleep(200); await shot(page, `14-${cls}-lexikon`); await press('Escape');
  }

  // Erste Aufgabe des Plebejers über die echte Dialogkette spielen
  await ev(() => window.__rv.game.newGame('plebs', 'm', 'Marcus'));
  await sleep(1000);
  await closeDialogs();
  const talk = async (id) => {
    await ev((npcId) => {
      const g = window.__rv.game;
      const n = g.npcs.byId[npcId];
      g.player.x = n.x; g.player.y = n.y + 14; g.player.dir = 'up';
    }, id);
    await sleep(150);
    await press('KeyE', 1, 250);
  };
  await talk('tertia');
  await shot(page, '20-dialog-tertia');
  await press('Digit1', 1, 300);
  await closeDialogs();
  await talk('hilarus');
  await closeDialogs();
  const step = await ev(() => window.__rv.G.state.missions.frumentatio_1);
  if (!step || step.step !== 1) problems.push(`Mission frumentatio_1 nicht wie erwartet: ${JSON.stringify(step)}`);

  // Stadtansichten
  const views = [['30-forum', 128, 90, 4], ['31-subura', 157, 70, 5], ['32-palatin', 125, 110, 3], ['33-circus', 130, 122, 6],
    ['34-forum-iulium', 117, 70, 2], ['35-kapitol', 99, 71, 7], ['36-forum-boarium', 82, 95, 4], ['37-macellum', 140, 72, 3],
    ['38a-marsfeld', 70, 50, 3], ['38b-emporium', 78, 140, 5], ['38c-trans-tiberim', 36, 100, 4], ['38d-via-appia', 168, 150, 6],
    ['38e-forum-holitorium', 76, 71, 2], ['38f-porta-capena', 156, 136, 3], ['38g-forum-west', 110, 86, 3], ['38h-aventin', 112, 156, 4]];
  for (const [name, x, y, h] of views) {
    await ev((a) => { const g = window.__rv.game; g.state.time.hour = a[3]; g.debugTeleport('rom', a[1], a[2]); }, [name, x, y, h]);
    await sleep(900);
    await shot(page, name);
  }
  await ev(() => { const g = window.__rv.game; g.state.time.hour = 16; g.debugTeleport('rom', 157, 70); });
  await sleep(900);
  await shot(page, '38-subura-nacht');
  await ev(() => { const g = window.__rv.game; g.state.time.hour = 11.2; g.debugTeleport('rom', 128, 90); });
  await sleep(900);
  await shot(page, '39-forum-abend');
  await hold('KeyA', 1500);
  // Stadtplan, Schnellreise, vorbereitete Tür
  await press('KeyM'); await sleep(400); await shot(page, '39b-stadtplan'); await press('Escape');
  const travel = await ev(() => {
    const g = window.__rv.game; g.state.money = 100; g.state.time.hour = 3;
    g.fastTravel('subura');
    return new Promise((r) => setTimeout(() => r({ map: g.map.id, x: Math.floor(g.player.x / 16), y: Math.floor(g.player.y / 16), money: g.state.money }), 1500));
  });
  if (travel.map !== 'rom' || Math.hypot(travel.x - 152, travel.y - 69) > 8 || travel.money !== 92) problems.push(`Schnellreise fehlgeschlagen: ${JSON.stringify(travel)}`);
  await shot(page, '39c-nach-schnellreise');
  await ev(() => { const g = window.__rv.game; g.debugTeleport('rom', 109, 96); g.player.dir = 'up'; });
  await sleep(300);
  await hold('KeyW', 500);
  const blocked = await ev(() => window.__rv.game.map.id);
  if (blocked !== 'rom') problems.push('Vorbereitete Tür hat einen Innenraum geöffnet');
  for (const id of ['domus_valeria', 'insula_arria', 'pistrinum', 'domus_fabia']) {
    await ev((m) => { const g = window.__rv.game; g.state.time.hour = 3; const e = window.__rv.G.data.interiors[m].spawns.entry; g.debugTeleport(m, e[0], e[1] - 1); }, id);
    await sleep(700);
    await shot(page, `40-innen-${id}`);
  }

  // Minispiele
  for (const mg of ['baking', 'water', 'haggle', 'carry', 'build', 'fishing', 'cooking', 'dice']) {
    await ev((m) => { window.__rv.mg = null; window.__rv.game.playMinigame(m, { fair: 12, label: 'Testware', money: 20 }).then((r) => { window.__rv.mg = r; }); }, mg);
    await sleep(600);
    if (mg === 'water') { await hold('Space', 1300); await sleep(900); } else await press('Space', 3, 900);
    await shot(page, `50-minispiel-${mg}`);
    for (let i = 0; i < 40; i++) {
      const done = await ev(() => !!window.__rv.mg);
      if (done) break;
      if (mg === 'water') await hold('Space', 1200); else await press(mg === 'haggle' ? 'ArrowRight' : 'Space', 1, 200);
      if (mg === 'haggle') await press('KeyE', 1, 200);
      await press('KeyE', 1, 300);
    }
    const r = await ev(() => window.__rv.mg);
    if (!r) problems.push(`Minispiel ${mg} wurde nicht beendet`);
    await closeDialogs();
  }

  // ---------- Alle Missionen über die echten Dialoge durchspielen ----------
  await page.evaluate(() => {
    const { G, game } = window.__rv;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // Führt einen Dialog aus; choices: Teilstrings der gewünschten Optionen. Minispiele werden automatisch abgeschlossen.
    window.__rv.talk = async (start, choices = [], mg = {}) => {
      const d = G.ui.dialog;
      if (typeof start === 'string' && game.npcs.byId[start]) { const n = game.npcs.byId[start]; d.start(n.def.dialogue, n); }
      else d.start(start);
      for (let guard = 0; guard < 80; guard++) {
        await wait(10);
        if (G.ui.mini.open) {
          G.ui.mini.finished = { done: true, success: true, score: 10, max: 12, pay: 16, price: 8, fair: 11, text: 'Test', ...mg };
          G.ui.mini.finish();
          await wait(30);
          continue;
        }
        if (!d.open) { await wait(30); if (!d.open && !G.ui.mini.open) return; continue; }
        d.typed = d.full.length;
        d.text.textContent = d.full;
        if (d.isLastPage() && d.optList.length) {
          const want = choices.shift();
          const idx = want === undefined ? 0 : d.optList.findIndex((o) => o.t.includes(want));
          if (idx < 0) throw new Error(`Option „${want}“ fehlt in ${d.nodeId}: ${d.optList.map((o) => o.t).join(' | ')}`);
          d.choose(idx);
        } else d.advance();
      }
      throw new Error('Dialog endet nicht');
    };
    window.__rv.status = (id) => { const m = G.state.missions[id]; return m ? `${m.status}:${m.step}:${m.count}` : 'none'; };
  });
  const runScenario = async (cls, script) => {
    await ev((c) => window.__rv.game.newGame(c, 'm', 'Testus'), cls);
    await sleep(900);
    await closeDialogs();
    const res = await page.evaluate(script).catch((e) => `Fehler: ${e.message}`);
    if (res !== true) problems.push(`Durchlauf ${cls}: ${res}`);
  };
  await runScenario('plebs', async () => {
    const { G, game, talk, status } = window.__rv;
    G.state.time.hour = 2;
    await talk('tertia', ['sofort']);
    await talk('hilarus');
    await talk('frumentarius');
    await talk('tertia');
    if (status('frumentatio_1') !== 'done:3:1') return `frumentatio_1 ${status('frumentatio_1')}`;
    await talk('vettia', ['Natürlich']);
    await talk('fountain_subura', ['Krug füllen']);
    await talk('vettia');
    if (status('aqua_1') !== 'done:2:1') return `aqua_1 ${status('aqua_1')}`;
    const before = G.state.money;
    await talk('felix', ['Ich fange an']);
    if (status('pistor_1') !== 'done:1:1' || G.state.money <= before) return `pistor_1 ${status('pistor_1')} Geld ${before}->${G.state.money}`;
    const m1 = G.state.money;
    await talk('felix', ['An den Ofen']);
    await new Promise((r) => setTimeout(r, 300));
    if (G.state.money <= m1) return `zweite Schicht (Aktivität) ohne Lohn: ${m1} -> ${G.state.money}`;
    const Act = await import('/src/systems/activities.js');
    for (const id of ['lasten_emporium', 'bau_basilica', 'bau_forum_iulium']) {
      G.state.time.hour = 2; G.state.needs.energy = 100;
      const before = G.state.money;
      if (Act.blockReason(id)) return `${id} blockiert: ${Act.blockReason(id)}`;
      Act.run(id, false);
      for (let i = 0; i < 30 && !G.ui.mini.open; i++) await new Promise((r) => setTimeout(r, 20));
      G.ui.mini.finished = { done: true, success: true, score: 5, max: 6, text: 'Test' }; G.ui.mini.finish();
      await new Promise((r) => setTimeout(r, 100));
      if (G.state.money <= before) return `${id} ohne Lohn`;
    }
    G.state.time.day = G.state.rent.due;
    G.state.money = 200;
    await talk('hilarus', ['Hier ist das Geld']);
    if (G.state.rent.due <= G.state.time.day) return 'Miete nicht bezahlt';
    return true;
  });
  await runScenario('nobilis', async () => {
    const { G, game, talk, status } = window.__rv;
    G.state.time.hour = 1;
    await talk('hermes', ['Wer ist heute da']);
    await talk('cliens_lucius', ['Advokaten']);
    await talk('cliens_gnaeus', ['Ohren offen']);
    await talk('cliens_aulus', ['Gern']);
    if (status('salutatio_1') !== 'done:4:1') return `salutatio_1 ${status('salutatio_1')}`;
    await talk('hermes', ['Ich gehe hin']);
    game.debugTeleport('rom', 111, 85);
    await new Promise((r) => setTimeout(r, 300));
    G.state.time.hour = 3;
    await talk('door_concordia');
    await talk('rubrius', ['hinter Caesar']);
    if (status('senatus_1') !== 'done:3:1') return `senatus_1 ${status('senatus_1')}`;
    if (G.state.stats.caesariani <= 0) return 'Fraktionswert nicht gesetzt';
    game.debugTeleport('domus_valeria', 10, 16);
    await talk('syra', ['Ich besorge es']);
    G.state.inv.garum = 1;
    game.update(0.016);
    G.state.inv.vinum_bonum = 1;
    game.update(0.016);
    await talk('syra');
    if (status('convivium_1') !== 'done:3:1') return `convivium_1 ${status('convivium_1')}`;
    return true;
  });
  await runScenario('servus', async () => {
    const { G, game, talk, status } = window.__rv;
    G.state.time.hour = 1;
    await talk('philo', ['Ja, Philo']);
    await talk('fountain_palatin', ['Krug füllen']);
    await talk('lyde');
    if (status('servus_aqua') !== 'done:2:1') return `servus_aqua ${status('servus_aqua')}`;
    await talk('philo', ['Macellum']);
    game.debugTeleport('rom', 140, 72);
    await new Promise((r) => setTimeout(r, 300));
    if (G.state.map !== 'rom' || status('servus_mercatus') !== 'active:1:0') return `Markt nicht erreicht: ${status('servus_mercatus')} ${G.state.map}`;
    await talk('phileros', [], { price: 9, fair: 11 });
    await talk('philo');
    if (status('servus_mercatus') !== 'done:3:1') return `servus_mercatus ${status('servus_mercatus')}`;
    G.state.time.hour = 1;
    await talk('fabius', ['Ja, Herr']);
    await talk('argentarius');
    await talk('fabius');
    if (status('servus_nuntius') !== 'done:2:1') return `servus_nuntius ${status('servus_nuntius')}`;
    if (G.state.stats.fides <= 20) return 'Vertrauen nicht gestiegen';
    return true;
  });

  // ---------- Freiwillige Aktivitäten ----------
  await runScenario('plebs', async () => {
    const { G, game, talk } = window.__rv;
    const Act = await import('/src/systems/activities.js');
    G.state.time.hour = 2;
    G.state.sk.schreiben = 80;
    const m0 = G.state.money, xp0 = G.state.sk.schreiben;
    if (Act.blockReason('abschreiben')) return `Abschreiben blockiert: ${Act.blockReason('abschreiben')}`;
    Act.run('abschreiben', false);
    await new Promise((r) => setTimeout(r, 900));
    if (G.state.money <= m0 || G.state.sk.schreiben <= xp0) return `Abschreiben ohne Wirkung (Geld ${m0}->${G.state.money})`;
    G.state.time.hour = 2;
    Act.run('unterricht', false);
    await new Promise((r) => setTimeout(r, 900));
    if (!G.state.lex.schule) return 'Unterricht hat kein Lexikon freigeschaltet';
    G.state.time.hour = 2; G.state.sk.schreiben = 0;
    if (!Act.blockReason('abschreiben')) return 'Abschreiben trotz fehlender Fertigkeit möglich';
    return true;
  });
  // Fischen und Kochen
  await runScenario('plebs', async () => {
    const { G, game } = window.__rv;
    const Act = await import('/src/systems/activities.js');
    const Cook = await import('/src/systems/cooking.js');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    G.state.time.hour = 2;
    if (!Act.blockReason('fischen_insula')) return 'Fischen ohne Angel möglich';
    G.state.inv.harundo = 1;
    Act.run('fischen_insula', false);
    for (let i = 0; i < 30 && !G.ui.mini.open; i++) await wait(20);
    G.ui.mini.finished = { done: true, success: true, score: 2, items: ['piscis', 'anguilla'], text: 'Test' }; G.ui.mini.finish();
    await wait(100);
    if (!G.state.inv.piscis || !G.state.inv.anguilla) return 'Fang nicht im Inventar';
    G.state.inv.oleum = 1;
    G.state.sk.kochen = 30;
    Cook.cook('piscis_assus');
    for (let i = 0; i < 30 && !G.ui.mini.open; i++) await wait(20);
    G.ui.mini.finished = { done: true, success: true, score: 3, quality: 3, text: 'Test' }; G.ui.mini.finish();
    await wait(100);
    if ((G.state.inv.piscis_assus || 0) < 2) return `Kochen fehlgeschlagen: ${G.state.inv.piscis_assus}`;
    const Inv = await import('/src/systems/inventory.js');
    G.state.inv.moretum = 1; Inv.useItem('moretum');
    const B = await import('/src/systems/buffs.js');
    if (!B.activeBuffs().some((b) => b.id === 'moretum')) return 'Bonus nach Moretum fehlt';
    return true;
  });
  // Handel: Preise und Sättigung
  await runScenario('plebs', async () => {
    const { G } = window.__rv;
    const Mk = await import('/src/systems/market.js');
    const cheap = Mk.marketPrice('emporium', 'garum', 'buy'), dear = Mk.marketPrice('macellum', 'garum', 'sell');
    if (!(cheap < dear)) return `Garum am Emporium (${cheap}) nicht billiger als Verkauf im Macellum (${dear})`;
    const first = Mk.marketPrice('macellum', 'garum', 'sell');
    for (let i = 0; i < 5; i++) Mk.noteTrade('macellum', 'garum', 'sell');
    if (!(Mk.marketPrice('macellum', 'garum', 'sell') < first)) return 'Keine Sättigung beim Verkaufen';
    for (const m of ['emporium', 'macellum', 'holitorium', 'boarium', 'subura']) for (const g of Mk.marketDef(m).board) {
      const b = Mk.marketPrice(m, g, 'buy'), se = Mk.marketPrice(m, g, 'sell');
      if (se > b || (b > 1 && se >= b)) return `${m}/${g}: Verkauf ${se} >= Einkauf ${b}`;
    }
    G.ui.panels.show('prices', { market: 'emporium' });
    await new Promise((r) => setTimeout(r, 200));
    return true;
  });
  await shot(page, '61-preistafel'); await press('Escape');
  // Taverne, Gerüchte, Würfeln, Ring, Bad, Opfer
  await runScenario('plebs', async () => {
    const { G, game, talk, status } = window.__rv;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const Act = await import('/src/systems/activities.js');
    const B = await import('/src/systems/buffs.js');
    G.state.time.hour = 5;
    game.debugTeleport('taberna_subura', 7, 7);
    await wait(300);
    await talk('hermeros', ['Erzähl']);
    if (!(G.state.vars.rumors || []).length) return 'Kein Gerücht gehört';
    G.state.money = 20;
    Act.run('wuerfeln', false);
    for (let i = 0; i < 30 && !G.ui.mini.open; i++) await wait(20);
    G.ui.mini.finished = { done: true, success: true, net: 3, score: 2, text: 'Test' }; G.ui.mini.finish();
    await wait(100);
    if (G.state.money !== 23) return `Würfelgewinn falsch verbucht: ${G.state.money}`;
    const R = await import('/src/systems/rules.js');
    if (!G.state.missions.ring_asellina) R.applyEffects([{ start: 'ring_asellina' }]);
    await talk('fountain_subura', ['Brunnenrand']);
    await talk('asellina');
    if (status('ring_asellina') !== 'done:2:1') return `Ring-Auftrag: ${status('ring_asellina')}`;
    game.debugTeleport('balneum_subura', 8, 7);
    await wait(300);
    G.state.needs.hygiene = 10;
    Act.run('baden', false);
    await wait(900);
    if (G.state.needs.hygiene < 99) return `Baden ohne Wirkung: ${G.state.needs.hygiene}`;
    game.debugTeleport('tempel_saturn', 5, 5);
    await wait(300);
    const O = await import('/src/systems/offerings.js');
    O.offer('saturn');
    await wait(50);
    G.ui.dialog.typed = G.ui.dialog.full.length;
    G.ui.dialog.page = G.ui.dialog.pages.length - 1;
    G.ui.dialog.choose(0);
    await wait(900);
    if (!B.activeBuffs().some((b) => b.id === 'saturn')) return 'Opfer ohne Bonus';
    return true;
  });
  await ev(() => { const g = window.__rv.game; g.state.time.hour = 6; g.debugTeleport('taberna_subura', 7, 7); });
  await sleep(500); await shot(page, '62-taverne');
  await ev(() => { const g = window.__rv.game; g.debugTeleport('balneum_subura', 8, 7); });
  await sleep(500); await shot(page, '63-balneum');
  await ev(() => { const g = window.__rv.game; g.debugTeleport('tempel_saturn', 5, 5); });
  await sleep(500); await shot(page, '64-saturntempel');
  await runScenario('nobilis', async () => {
    const Act = await import('/src/systems/activities.js');
    return Act.blockReason('abschreiben') ? true : 'Adel darf nicht abschreiben';
  });
  await runScenario('servus', async () => {
    const { G } = window.__rv;
    const Act = await import('/src/systems/activities.js');
    G.state.time.hour = 3;
    if (!Act.blockReason('reden_hoeren')) return 'Sklave hat tagsüber ohne Auftrag frei';
    G.state.time.hour = 10;
    const r = Act.blockReason('reden_hoeren');
    return r && r.includes('keine Zeit') ? 'Sklave hat abends keine freie Zeit' : true;
  });
  await press('KeyC'); await sleep(300); await shot(page, '60-charakter'); await press('Escape');

  // Schlafen & Speichern
  await ev(() => { const g = window.__rv.game; g.state.time.hour = 10; g.sleep(); });
  await sleep(2000);
  const saved = await ev(() => { try { return !!localStorage.getItem('romavivit.save.v1'); } catch (e) { return 'n/a'; } });
  if (saved !== true) problems.push('Spielstand wurde nach dem Schlafen nicht gespeichert');
  const errs = await ev(() => window.__errors);
  problems.push(...errs.map((e) => `Spielfehler: ${e}`));
} catch (e) {
  problems.push(`Testabbruch: ${e.stack || e}`);
  try { await shot(page, '99-abbruch'); } catch { /* ignorieren */ }
}

await browser.close();
if (DIST) await new Promise((r) => server.httpServer.close(r)); else await server.close();
if (problems.length) {
  console.log('PROBLEME:\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('Smoke-Test bestanden. Screenshots in smoke-out/');
