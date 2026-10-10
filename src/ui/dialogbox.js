// Dialogbox mit Porträt, Schreibmaschinen-Text und Antwortoptionen. Logik folgt den Dialogdaten.
import { el, clear } from './dom.js';
import { G } from '../core/ctx.js';
import { checkCond, applyEffects } from '../systems/rules.js';
import { fmt } from '../systems/text.js';
import { getPortrait } from '../gfx/sprites.js';

export class DialogBox {
  constructor(root) {
    this.portrait = el('canvas', { class: 'portrait px', width: 16, height: 15 });
    this.who = el('div', { class: 'dlg-who' });
    this.text = el('div', { class: 'dlg-text' });
    this.opts = el('div', { class: 'dlg-opts' });
    this.more = el('div', { class: 'dlg-more' }, 'E ▸');
    this.box = el('div', { class: 'dialog hidden', onclick: (e) => { if (e.target === this.box || e.target === this.text) this.click(); } },
      this.portrait, el('div', { class: 'dlg-body' }, this.who, this.text, this.opts), this.more);
    root.append(this.box);
    this.open = false;
  }

  // Startet einen Dialog ab einem Knoten der Dialogdaten
  start(nodeId, npc) {
    this.npc = npc || null;
    if (npc) npc.talking = true;
    this.open = true;
    this.box.classList.remove('hidden');
    this.rootId = npc && npc.kind === 'named' ? nodeId : null;
    this.openNode(nodeId);
  }

  // Einfache Textfolge ohne Datenknoten (z. B. Passanten, Infotafeln)
  say(npc, pages, who) {
    this.npc = npc || null;
    if (npc) npc.talking = true;
    this.open = true;
    this.box.classList.remove('hidden');
    this.node = { text: pages, who };
    this.nodeId = null;
    this.pages = Array.isArray(pages) ? pages : [pages];
    this.page = 0;
    this.pending = null;
    this.optList = [];
    this.showPage();
  }

  // Dialog aus Code (z. B. Aktivitäten): Optionen dürfen eine Funktion fn haben
  custom(node, npc) {
    this.npc = npc || null;
    if (npc) npc.talking = true;
    this.open = true;
    this.box.classList.remove('hidden');
    this.node = node;
    this.nodeId = null;
    this.pages = Array.isArray(node.text) ? node.text : [node.text];
    this.page = 0;
    this.pending = null;
    this.optList = node.opts || [];
    this.showPage();
  }

  openNode(id) {
    const D = G.data.dialogues;
    const origId = id;
    let node = D[id];
    for (let guard = 0; node && node.switch && guard < 12; guard++) {
      const br = node.switch.find((b) => checkCond(b.if));
      if (!br) { node = null; break; }
      id = br.go;
      node = D[id];
    }
    if (!node) { console.warn('Dialogknoten fehlt:', id); this.close(); return; }
    this.node = node;
    this.nodeId = id;
    this.pages = Array.isArray(node.text) ? node.text : [node.text || ''];
    this.page = 0;
    this.pending = applyEffects(node.do).after || null;
    this.optList = (node.opts || []).filter((o) => checkCond(o.if));
    // Beim ersten Knoten eines NPC-Gesprächs: Aufträge, Geschenke usw. anbieten
    if (this.rootId === origId && this.npc && !this.pending && !node.next) {
      this.rootId = null;
      const extra = G.game.npcExtraOpts(this.npc);
      if (extra.length) {
        const last = this.optList[this.optList.length - 1];
        if (!this.optList.length) this.optList = [{ t: 'Leb wohl.' }, ...extra]; // E schließt wie bisher
        else if (last && !last.go && !last.do && !last.fn) this.optList = [...this.optList.slice(0, -1), ...extra, last];
        else this.optList = [...this.optList, ...extra];
      }
    }
    this.showPage();
  }

  speaker() {
    const who = this.node.who;
    if (who === 'narr') return { name: '', app: null };
    if (who === 'player') return { name: G.state.name, app: G.game.player.app };
    if (who && G.game.npcs.byId[who]) { const n = G.game.npcs.byId[who]; return { name: n.name, app: n.app }; }
    if (this.node.name) return { name: fmt(this.node.name), app: this.npc ? this.npc.app : null };
    if (this.npc) return { name: this.npc.name, app: this.npc.app };
    return { name: '', app: null };
  }

  showPage() {
    const sp = this.speaker();
    this.who.textContent = sp.name;
    this.who.classList.toggle('hidden', !sp.name);
    this.box.classList.toggle('narr', !sp.app);
    const pc = this.portrait.getContext('2d');
    pc.clearRect(0, 0, 16, 15);
    if (sp.app) pc.drawImage(getPortrait(sp.app), 0, 0);
    this.full = fmt(this.pages[this.page]);
    this.typed = 0;
    this.text.textContent = '';
    clear(this.opts);
    this.sel = 0;
    this.more.classList.add('hidden');
  }

  isLastPage() { return this.page >= this.pages.length - 1; }

  renderOpts() {
    clear(this.opts);
    this.optList.forEach((o, i) => {
      const b = el('button', { class: `opt${i === this.sel ? ' sel' : ''}`, onclick: () => this.choose(i) }, `${i + 1}. ${fmt(o.t)}`);
      this.opts.append(b);
    });
  }

  update(dt, input) {
    if (this.typed < this.full.length) {
      this.typed = Math.min(this.full.length, this.typed + dt * 75);
      this.text.textContent = this.full.slice(0, Math.floor(this.typed));
      if (input.confirmPressed()) this.typed = this.full.length;
      if (this.typed >= this.full.length) {
        this.text.textContent = this.full;
        if (this.isLastPage() && this.optList.length) this.renderOpts();
        else this.more.classList.remove('hidden');
      }
      return;
    }
    if (this.isLastPage() && this.optList.length) {
      if (input.wasPressed('up')) { this.sel = (this.sel + this.optList.length - 1) % this.optList.length; this.renderOpts(); }
      if (input.wasPressed('down')) { this.sel = (this.sel + 1) % this.optList.length; this.renderOpts(); }
      for (let i = 0; i < 5; i++) if (input.wasPressed(`opt${i + 1}`) && this.optList[i]) return this.choose(i);
      if (input.confirmPressed()) this.choose(this.sel);
      return;
    }
    if (input.confirmPressed() || input.wasPressed('menu')) this.advance();
  }

  click() {
    if (this.typed < this.full.length) { this.typed = this.full.length; return; }
    if (!(this.isLastPage() && this.optList.length)) this.advance();
  }

  advance() {
    if (!this.isLastPage()) { this.page++; this.showPage(); return; }
    if (this.pending) { this.close(this.pending); return; }
    if (this.node.next) { this.openNode(this.node.next); return; }
    this.close();
  }

  choose(i) {
    const o = this.optList[i];
    if (!o) return;
    if (o.fn) { this.close(); o.fn(); return; }
    const after = applyEffects(o.do).after;
    if (after) { this.close(after); return; }
    if (o.go) this.openNode(o.go);
    else this.close();
  }

  close(after) {
    this.open = false;
    this.box.classList.add('hidden');
    const npc = this.npc;
    if (npc) npc.talking = false;
    this.npc = null;
    G.input.endFrame();
    if (after) G.game.runAfter(after, npc);
  }
}
