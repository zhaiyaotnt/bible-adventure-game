import Phaser from 'phaser';
import { character, label, renderScale, sparkle } from '../../scenes/art.js';
import { STAGES, WATER, successors, standable, cellClass, key as cellKey } from './flood.js';

// Game 4 · The Rising Flood. A grid puzzle scene driven entirely by the
// pure model in flood.js (the same successors() the solver tests use), so
// what the player can do is exactly what the tests proved solvable.
// Movement is tap-a-cell: a BFS over move/push actions walks Aaron there
// step by step. Water only rises when the player presses Advance Storm
// (or on its own timer in the stage-3 finale) — no surprise deaths; a
// rise that floods Aaron's cell sends him back to the last checkpoint.

const CELL = 64;
const SCRATCH_KEY = 'aaronAdventure.flood.v1';

const INTROS = {
  stage1: ['Stage 1 · Broken Crossing', 'The bridge over the stream is broken, and the storm is coming. Tap a square to walk there. Tap a crate next to Aaron to push it — a crate pushed into the broken gap becomes the missing piece of the bridge.', 'Use 🔭 Forecast to preview the next two water states, and 🌧 Advance Storm when you are ready to test your crossing at high water.'],
  stage2: ['Stage 2 · Flooded Maze', 'Two gates, two switches, one plank — and low ground that looks like a shortcut floods first. Read the forecast before you commit: once you climb the knob switch, the storm surges and the way back across the low channel is gone.', 'Take everything you need with you. The high ridge in the north stays dry in every state… and something glitters up there.'],
  stage3: ['Stage 3 · Final Crossing', 'Three ways across the valley: the long high causeway, the island shallows, or one plank over the east channel. The sluice wheel on the north-east knob can drain the river by one level.', 'Once you step into the river, the storm rises on its own every few seconds. Plan the whole crossing before you wade in. The ark is waiting — and God Himself will shut its door.'],
};
const HINTS = {
  stage1: ['Look at the forecast before you move anything heavy.', 'Crates can be pushed along the bank — and into the broken bridge gap.', 'Set the crate in the gap, stand on the high start stone, advance the storm twice, then cross the raised bridge.'],
  stage2: ['The high ridge along the north is dry in every storm state.', 'Climb the knob switch only when you are carrying the plank — the surge cuts the way back.', 'Switch 2 hides east of the deep channel. Bridge the channel at its south end, then return north over the stone bridge to reach the exit gate.'],
  stage3: ['Three ways across: causeway (always dry), island shallows (needs low water), or the plank over the east channel.', 'The sluice wheel lowers the effective water by one level — with it open, the shallows stay crossable one state longer.', 'Do not stop mid-river. If the water catches you, you wash back to the bank — your objects stay where they are.'],
};

export class FloodScene extends Phaser.Scene {
  constructor() { super('Flood'); }
  init({ story, spawn }) { this.story = story; this.savedSpawn = spawn; }
  flags() { return this.app.save.stories[this.story.id].questFlags; }

  create() {
    this.app = this.game.registry.get('app');
    const app = this.app, f = this.flags();
    character(this, 'aaron', 0xc67b4a, 0x4d3e32);
    // Resume the in-progress run, or start at the first unfinished stage.
    let scratch = null;
    try { scratch = JSON.parse(localStorage.getItem(SCRATCH_KEY) || 'null'); } catch { scratch = null; }
    if (f.flood_complete) { scratch = null; this.replay = true; }
    if (scratch && Number.isInteger(scratch.stage) && scratch.s) {
      this.stageIdx = scratch.stage; this.s = scratch.s;
      this.checkpoint = scratch.checkpoint || [...STAGES[this.stageIdx].start];
      this.hintsUsed = scratch.hintsUsed || 0; this.nookFound = !!scratch.nook;
    } else {
      this.stageIdx = !f.flood_stage1_done ? 0 : !f.flood_stage2_done ? 1 : 2;
      this.s = STAGES[this.stageIdx].initial();
      this.checkpoint = [...STAGES[this.stageIdx].start];
      this.hintsUsed = 0; this.nookFound = !!f.flood_nook;
    }
    this.stage = STAGES[this.stageIdx];
    this.forecast = 0; this.busy = false; this.finaleArmed = false; this.finaleDone = false;
    this.lastBank = [...this.stage.start];
    this.offX = (960 - this.stage.w * CELL) / 2; this.offY = (640 - this.stage.h * CELL) / 2;
    this.cameras.main.centerOn(480, 320);
    const fit = Phaser.Math.Clamp((this.scale.parentSize.width / Math.max(1, this.scale.parentSize.height)) / 1.5, 0.2, 1);
    this.cameras.main.setZoom(fit * renderScale(this));
    this.rain = this.add.rectangle(480, 320, 1600, 1200, 0x274b63, 0).setDepth(40);
    this.player = this.add.image(0, 0, 'aaron-down-0').setOrigin(.5, .85).setDepth(10).setScale(.35);
    this.buildControls();
    this.render();
    this.placePlayer(false);
    this.input.on('pointerdown', p => this.onTap(p));
    this.events.once('shutdown', () => { this.controlsEl?.remove(); this.stormEvent?.remove(false); });
    app.showHUD(`The Rising Flood · ${this.stage.name}`, '', 'CHAPTER 1 · GAME 4');
    this.updateHUD();
    if (!scratch) this.showIntro();
    if (this.replay) app.toast('You already completed The Rising Flood — replaying for fun.');
  }

  // ------------------------------------------------------------ scratch
  saveScratch() {
    try { localStorage.setItem(SCRATCH_KEY, JSON.stringify({ stage: this.stageIdx, s: this.s, checkpoint: this.checkpoint, hintsUsed: this.hintsUsed, nook: this.nookFound })); } catch { /* storage unavailable */ }
  }
  clearScratch() { try { localStorage.removeItem(SCRATCH_KEY); } catch { /* ignore */ } }

  // ------------------------------------------------------------ controls
  buildControls() {
    const el = document.createElement('div');
    el.className = 'flood-controls';
    el.innerHTML = `<button data-a="advance">🌧 Advance storm</button><button data-a="forecast">🔭 Forecast: off</button><button data-a="hint">❓ Hint (${this.hintsUsed}/3)</button><button data-a="reset">↺ Reset stage</button>`;
    document.getElementById('play').appendChild(el);
    this.controlsEl = el;
    el.querySelector('[data-a="advance"]').onclick = () => this.advanceStorm();
    el.querySelector('[data-a="forecast"]').onclick = () => { this.forecast = (this.forecast + 1) % 3; this.render(); };
    el.querySelector('[data-a="hint"]').onclick = () => this.useHint();
    el.querySelector('[data-a="reset"]').onclick = () => this.resetStage();
  }
  updateHUD() {
    const nxt = [1, 2].map(d => WATER[Math.min(2, this.s.water + d)]).join(', ');
    this.app.showHUD(`The Rising Flood · ${this.stage.name}`, `Water: ${WATER[this.s.water]} · Next: ${nxt} — reach the golden goal ✦`, 'CHAPTER 1 · GAME 4');
    const adv = this.controlsEl?.querySelector('[data-a="advance"]');
    if (adv) adv.disabled = this.s.water >= 2 || this.busy;
    const fc = this.controlsEl?.querySelector('[data-a="forecast"]');
    if (fc) { fc.textContent = `🔭 Forecast: ${['off', 'next', 'next +1'][this.forecast]}`; fc.classList.toggle('active', this.forecast > 0); }
    const hb = this.controlsEl?.querySelector('[data-a="hint"]');
    if (hb) hb.textContent = `❓ Hint (${this.hintsUsed}/3)`;
  }
  showIntro() {
    const [title, ...lines] = INTROS[this.stage.id];
    this.app.dialogue('Guide', lines, { fiction: false, reference: 'Genesis 6–7' });
    this.app.toast(title);
  }
  useHint() {
    const list = HINTS[this.stage.id];
    if (this.hintsUsed >= list.length) { this.app.toast('No more hints for this stage — the rest is yours to reason out.'); return; }
    this.app.toast(`Hint ${this.hintsUsed + 1}: ${list[this.hintsUsed]}`);
    this.hintsUsed++; this.saveScratch(); this.updateHUD();
  }
  resetStage() {
    if (this.busy) return;
    this.stormEvent?.remove(false); this.finaleArmed = false;
    this.s = this.stage.initial(); this.checkpoint = [...this.stage.start];
    this.forecast = 0; this.rain.setAlpha(0);
    this.render(); this.placePlayer(true); this.saveScratch(); this.updateHUD();
    this.app.toast('Stage reset — the valley is as it was.');
  }

  // ------------------------------------------------------------ rendering
  cellXY(cx, cy) { return { x: this.offX + cx * CELL + CELL / 2, y: this.offY + cy * CELL + CELL / 2 }; }
  render() {
    this.boardLayer?.destroy();
    const layer = this.add.container(0, 0).setDepth(0); this.boardLayer = layer;
    const st = this.stage, s = this.s;
    const fcState = this.forecast ? { ...s, water: Math.min(2, s.water + this.forecast) } : null;
    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const { x: px, y: py } = this.cellXY(x, y);
      const info = st.cells.get(cellKey(x, y));
      let base = 0x6d7a52;
      if (!info || info.wall) base = 0x4a4f45;
      else if (info.gap) base = 0x274b63;
      else base = [0xc2b280, 0x7fae5f, 0xd7e6b0][info.elev] || 0x7fae5f;
      layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, base));
      const cls = cellClass(st, s, x, y);
      if (cls === 'wade') layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, 0x5b8fd6, 0.35));
      if (cls === 'deep') layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, 0x2c5f9e, 0.8));
      if (cls === 'gate') { layer.add(this.add.rectangle(px, py, CELL - 10, CELL - 6, 0x6b6f75).setStrokeStyle(3, 0x3f434a)); layer.add(label(this, px, py, '✕', '#e8e4da', 20)); }
      if (cls === 'bridge') layer.add(this.add.rectangle(px, py, CELL - 6, 26, 0x9a6b3f).setStrokeStyle(2, 0x6e4c2e));
      // Forecast: what this cell becomes in the previewed state.
      if (fcState) {
        const fc = cellClass(st, fcState, x, y);
        if (fc === 'deep' && cls !== 'deep') layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, 0x2c5f9e, 0.45).setStrokeStyle(2, 0xd96a5a));
        else if (fc === 'wade' && cls === 'dry') layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, 0x5b8fd6, 0.25));
      }
      const ledge = st.ledges.get(cellKey(x, y));
      if (ledge) layer.add(label(this, px, py + 14, { N: '▲', S: '▼', E: '▶', W: '◀' }[ledge], '#8a6d1f', 15));
      if (st.switches.has(cellKey(x, y))) { layer.add(this.add.circle(px, py, 13, 0xd9b23a).setStrokeStyle(3, 0x8a6d1f)); layer.add(label(this, px, py, '≡', '#5c4712', 16)); }
      if (st.checkpoints?.some(([cx, cy]) => cx === x && cy === y)) layer.add(label(this, px - 20, py - 20, '⚑', '#b8452e', 16));
      if (x === st.exit[0] && y === st.exit[1]) {
        layer.add(this.add.rectangle(px, py, CELL - 8, CELL - 8, 0xf2d38a, 0.55).setStrokeStyle(3, 0xd9a441));
        layer.add(label(this, px, py, '✦', '#8a6d1f', 24));
      }
      if (st.nook && x === st.nook[0] && y === st.nook[1] && !this.nookFound) { const sp = sparkle(this, px, py - 6); layer.add(sp); }
    }
    for (const [cx, cy] of s.crates) {
      const { x: px, y: py } = this.cellXY(cx, cy);
      layer.add(this.add.rectangle(px, py, 44, 44, 0x9a6b3f).setStrokeStyle(3, 0x6e4c2e));
      layer.add(label(this, px, py, '✕', '#6e4c2e', 18));
    }
    if (s.plank === 'rest' && s.plankAt) {
      const { x: px, y: py } = this.cellXY(s.plankAt[0], s.plankAt[1]);
      layer.add(this.add.rectangle(px, py + 10, 46, 14, 0xb68a59).setStrokeStyle(2, 0x6e4c2e));
    }
    if (s.plank === 'carry') layer.add(label(this, this.cellXY(s.x, s.y).x, this.cellXY(s.x, s.y).y - 34, '🪵', '#fff', 15));
  }
  placePlayer(animate) {
    const { x, y } = this.cellXY(this.s.x, this.s.y);
    if (animate && !this.app.save.settings.reducedMotion) this.tweens.add({ targets: this.player, x, y, duration: 150 });
    else this.player.setPosition(x, y);
  }

  // ------------------------------------------------------------ actions
  successorsFiltered(acts) { return successors(this.stage, this.s).filter(([, a]) => acts.some(p => a.startsWith(p))); }
  findPath(tx, ty) {
    const st = this.stage, start = this.s;
    const k0 = `${start.x},${start.y},${start.water},${start.gatesOpen},${start.sluice},${start.plank},${start.plankAt},${start.crates.map(c => c.join(',')).sort().join(';')}`;
    const seen = new Set([k0]); const queue = [{ s: start, actions: [] }];
    while (queue.length) {
      const { s, actions } = queue.shift();
      if (s.x === tx && s.y === ty) return actions;
      for (const [ns, act] of successors(st, s)) {
        if (!act.startsWith('move:') && !act.startsWith('push:')) continue;
        const k = `${ns.x},${ns.y},${ns.water},${ns.gatesOpen},${ns.sluice},${ns.plank},${ns.plankAt},${ns.crates.map(c => c.join(',')).sort().join(';')}`;
        if (seen.has(k)) continue; seen.add(k);
        queue.push({ s: ns, actions: [...actions, act] });
      }
    }
    return null;
  }
  onTap(pointer) {
    if (this.busy || this.app.isBlocked()) return;
    const cx = Math.floor((pointer.worldX - this.offX) / CELL), cy = Math.floor((pointer.worldY - this.offY) / CELL);
    if (cx < 0 || cy < 0 || cx >= this.stage.w || cy >= this.stage.h) return;
    const s = this.s, st = this.stage;
    const adjacent = Math.abs(cx - s.x) + Math.abs(cy - s.y) === 1;
    const dir = cx > s.x ? 'E' : cx < s.x ? 'W' : cy > s.y ? 'S' : 'N';
    // Place the plank on an adjacent gap.
    if (adjacent && s.plank === 'carry' && st.cells.get(cellKey(cx, cy))?.gap && !s.crates.some(([x, y]) => x === cx && y === cy)) {
      const hit = this.successorsFiltered(['place:']).find(([, a]) => a === 'place:' + dir);
      if (hit) { this.s = hit[0]; this.afterAction(`Plank set across the gap.`); return; }
    }
    // Take an adjacent plank back.
    if (adjacent && s.plank && s.plank !== 'carry' && s.plankAt && s.plankAt[0] === cx && s.plankAt[1] === cy) {
      const hit = this.successorsFiltered(['takePlank']);
      if (hit.length) { this.s = hit[0][0]; this.afterAction('Plank picked up.'); return; }
    }
    // Push an adjacent crate.
    if (adjacent && s.crates.some(([x, y]) => x === cx && y === cy)) {
      const hit = this.successorsFiltered(['push:']).find(([, a]) => a === 'push:' + dir);
      if (hit) { this.s = hit[0]; this.render(); this.saveScratch(); this.updateHUD(); }
      else this.app.toast('The crate cannot move that way.');
      return;
    }
    if (cx === s.x && cy === s.y) return;
    const path = this.findPath(cx, cy);
    if (!path) { this.app.toast('Aaron cannot get there — not in this water.'); return; }
    this.walkPath(path);
  }
  walkPath(actions) {
    this.busy = true; this.updateHUD();
    const step = (i) => {
      if (i >= actions.length) { this.busy = false; this.afterAction(); return; }
      const act = actions[i];
      const hit = successors(this.stage, this.s).find(([, a]) => a === act);
      if (!hit) { this.busy = false; this.afterAction(); return; }
      const prevWater = this.s.water;
      this.s = hit[0];
      this.render(); this.placePlayer(true);
      if (this.s.water > prevWater) this.pendingSurge = true;
      this.time.delayedCall(this.app.save.settings.reducedMotion ? 30 : 160, () => { if (this.checkTriggers()) return; step(i + 1); });
    };
    step(0);
  }
  afterAction(message) {
    if (message) this.app.toast(message);
    this.render(); this.saveScratch(); this.updateHUD();
    if (this.pendingSurge) {
      this.pendingSurge = false;
      this.cameras.main.flash(250, 90, 130, 180);
      this.app.dialogue('The Storm', ['The knob turns — and the storm answers. The water surges to RISING, and the low channel behind you is gone.', 'No way back now. Forward, through the gate.'], { fiction: true, reference: 'Genesis 7:11' });
    }
  }
  // Returns true if the walk should stop (stage ended / rescue happened).
  checkTriggers() {
    const st = this.stage, s = this.s, f = this.flags();
    if (st.nook && s.x === st.nook[0] && s.y === st.nook[1] && !this.nookFound) {
      this.nookFound = true; f.flood_nook = true; this.app.persist();
      this.app.toast('✦ A smooth stone from the ridge — a memento of the high road.');
      this.render();
    }
    if (st.checkpoints?.some(([cx, cy]) => cx === s.x && cy === s.y)) {
      if (this.checkpoint[0] !== s.x || this.checkpoint[1] !== s.y) { this.checkpoint = [s.x, s.y]; this.app.toast('⚑ Checkpoint reached.'); }
    }
    if (st.finale) {
      if (st.riverRows.includes(s.y)) { if (!this.finaleArmed) this.armFinale(); }
      else this.lastBank = [s.x, s.y];
    }
    if (s.x === st.exit[0] && s.y === st.exit[1]) { this.completeStage(); return true; }
    this.saveScratch();
    return false;
  }
  advanceStorm() {
    if (this.busy || this.app.isBlocked() || this.s.water >= 2) return;
    const ns = { ...this.s, water: this.s.water + 1 };
    if (!standable(this.stage, ns, this.s.x, this.s.y)) { this.rescue('The water rose over your footing!'); return; }
    this.s = ns;
    this.cameras.main.flash(200, 90, 130, 180);
    this.afterAction(`The storm advances — water: ${WATER[this.s.water]}.`);
  }
  rescue(why) {
    this.busy = false;
    this.cameras.main.flash(300, 44, 79, 110);
    const [cx, cy] = this.checkpoint;
    this.s = { ...this.s, x: cx, y: cy };
    this.render(); this.placePlayer(false); this.saveScratch(); this.updateHUD();
    this.app.toast(`${why} Washed back to the checkpoint — your crates and plank stay where they are.`);
  }

  // ------------------------------------------------------------ finale & flow
  armFinale() {
    this.finaleArmed = true;
    this.app.toast('The storm is rising on its own now — keep moving!');
    this.rain.setAlpha(0.12);
    this.stormEvent = this.time.addEvent({
      delay: 9000, loop: true, callback: () => {
        if (this.finaleDone || this.busy || this.app.isBlocked()) return;
        if (!this.stage.riverRows.includes(this.s.y)) return;
        if (this.s.water < 2) {
          this.s = { ...this.s, water: this.s.water + 1 };
          this.rain.setAlpha(0.12 + this.s.water * 0.1);
          this.render(); this.updateHUD();
          if (!standable(this.stage, this.s, this.s.x, this.s.y)) { this.rescue('The flood caught you mid-river!'); return; }
          this.app.toast(`The water rises — ${WATER[this.s.water]}!`);
        }
      },
    });
  }
  completeStage() {
    this.busy = true;
    const f = this.flags(), st = this.stage;
    this.stormEvent?.remove(false);
    if (st.id === 'stage1') f.flood_stage1_done = true;
    if (st.id === 'stage2') f.flood_stage2_done = true;
    this.app.persist();
    if (st.id !== 'stage3') {
      this.app.dialogue('Guide', [`${st.name} — crossed. The valley opens ahead, and the storm is still gathering.`], {
        fiction: false, reference: 'Genesis 6–7', onComplete: () => {
          this.stageIdx++; this.stage = STAGES[this.stageIdx];
          this.s = this.stage.initial(); this.checkpoint = [...this.stage.start];
          this.hintsUsed = 0; this.forecast = 0; this.finaleArmed = false; this.lastBank = [...this.stage.start];
          this.offX = (960 - this.stage.w * CELL) / 2; this.offY = (640 - this.stage.h * CELL) / 2;
          this.busy = false;
          this.render(); this.placePlayer(false); this.saveScratch(); this.updateHUD(); this.showIntro();
        },
      });
      return;
    }
    // Stage 3: the scripted flood — God shuts the door (Genesis 7:16).
    this.finaleDone = true;
    this.rain.setAlpha(0.3);
    this.cameras.main.flash(400, 200, 220, 240);
    this.app.dialogue('Noah', ['You made it across, Aaron — just as the waters rose over the valley.', 'Look at the ark. I did not shut that door. No human hand could have held it against this flood.', 'God shut it. He judged the wickedness of the world — and in His grace, He kept His promise to preserve Noah and his family.'], {
      fiction: true, reference: 'Genesis 7:16', onComplete: () => this.showReflection(),
    });
  }
  showReflection() {
    const f = this.flags(); f.flood_complete = true;
    const storyState = this.app.save.stories[this.story.id];
    if (!storyState.completedScenes.includes('rising_flood')) storyState.completedScenes.push('rising_flood');
    this.app.persist(); this.clearScratch();
    this.app.openModal(`<p class="overline">BIBLE DISCOVERY · GENESIS 6–7</p><h2>The Flood: Judgment and Preservation</h2>
      <p class="reading">The flood reveals God’s righteous judgment against human wickedness — “the earth was corrupt in God’s sight, and the earth was filled with violence.”</p>
      <p class="reading">Yet God graciously preserved Noah and his family, according to His promise and His instructions. Noah was not saved because he was fast or clever; he was saved because God made a way — and because Noah believed and obeyed.</p>
      <p class="reading">Scripture says that after Noah, his family, and the animals entered, <b>God shut the door of the ark</b> (Genesis 7:16). Aaron did not earn rescue by crossing well. Neither do we.</p>
      <p class="footnote">Historical clarity: Aaron’s valley crossing is a fictional game challenge set before the flood. Genesis does not record it. What Genesis does record is God’s judgment, His promise, and His shut door.</p>
      <button id="flood-done" class="primary">Complete the chapter →</button>`, 'reading');
    document.getElementById('flood-done').onclick = () => { this.app.closeModal(); this.app.router.story(this.story.id, 'meet_noah'); };
  }
}
