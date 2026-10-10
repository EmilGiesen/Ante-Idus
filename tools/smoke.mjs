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
  const views = [['30-forum', 58, 42, 4], ['31-subura', 100, 30, 5], ['32-palatin', 60, 66, 3], ['33-circus', 60, 86, 6],
    ['34-forum-iulium', 50, 24, 2], ['35-kapitol', 28, 34, 7], ['36-velabrum', 20, 61, 4], ['37-macellum', 63, 26, 3]];
  for (const [name, x, y, h] of views) {
    await ev((a) => { const g = window.__rv.game; g.state.time.hour = a[3]; g.debugTeleport('rom', a[1], a[2]); }, [name, x, y, h]);
    await sleep(900);
    await shot(page, name);
  }
  await ev(() => { const g = window.__rv.game; g.state.time.hour = 16; g.debugTeleport('rom', 100, 31); });
  await sleep(900);
  await shot(page, '38-subura-nacht');
  await ev(() => { const g = window.__rv.game; g.state.time.hour = 11.2; g.debugTeleport('rom', 60, 44); });
  await sleep(900);
  await shot(page, '39-forum-abend');
  await hold('KeyA', 1500);
  for (const id of ['domus_valeria', 'insula_arria', 'pistrinum', 'domus_fabia']) {
    await ev((m) => { const g = window.__rv.game; g.state.time.hour = 3; const e = window.__rv.G.data.interiors[m].spawns.entry; g.debugTeleport(m, e[0], e[1] - 1); }, id);
    await sleep(700);
    await shot(page, `40-innen-${id}`);
  }

  // Minispiele
  for (const mg of ['baking', 'water', 'haggle']) {
    await ev((m) => { window.__rv.mg = null; window.__rv.game.playMinigame(m, { fair: 12, label: 'Testware' }).then((r) => { window.__rv.mg = r; }); }, mg);
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
    await talk('felix', ['An den Ofen']);
    await talk('felix', ['Bis morgen']);
    if (status('pistor_1') !== 'done:1:2') return `pistor_1 zweite Schicht ${status('pistor_1')}`;
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
    game.debugTeleport('rom', 46, 37);
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
    game.debugTeleport('rom', 63, 26);
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
