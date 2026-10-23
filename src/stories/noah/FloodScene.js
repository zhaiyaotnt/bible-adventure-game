import Phaser from 'phaser';
import { character, label, renderScale } from '../../scenes/art.js';
import {
  STAGES, WATER, FLOOD_SCRATCH_KEY, clearFloodScratch, normalizeFloodScratch,
  successors, standable, cellClass, canAdvance, isGoal, key as cellKey,
} from './flood.js';

// Game 4 · The Rising Flood. A grid puzzle scene driven entirely by the
// pure model in flood.js (the same successors() the solver tests use), so
// what the player can do is exactly what the tests proved solvable.
// Movement is tap-a-cell: a BFS over move/push actions walks Aaron there
// step by step. Water only rises when the player presses Advance Storm
// (or on its own timer in the stage-3 finale) — no surprise deaths; a
// rise that floods Aaron's cell sends him back to the last checkpoint.

const CELL = 64;

const INTROS = {
  stage1: ['Stage 1 · Broken Crossing', 'THE GOAL: get Aaron across the stream to the golden square ✦. The bridge is broken in the middle — a crate pushed into the gap becomes the missing piece.', 'HOW WATER WORKS: pale squares are high ground (they never flood). Green squares are low banks (they go under when the water reaches HIGH). Dark blue is deep water — Aaron can never enter it.', 'THE PLAN: 1) Push a crate along the bank and into the bridge gap. 2) Stand on the pale bridge row and press 🌧 Raise the water twice. 3) Cross. Use 🔭 Forecast any time to preview the next two water states. Tap a square to walk; tap a crate beside Aaron to push it. Keyboard: arrows or WASD move one square; E, Space, or Enter picks up an adjacent plank.'],
  stage2: ['Stage 2 · Flooded Maze', 'YOUR GOAL: reach the golden square ✦ on the EAST side of this valley. Two grey stone gates (marked ✕) block the way out. Each gate is opened by a 🟡 golden switch — walk onto the switch to flip it.', 'NEW THINGS: the 🪵 PLANK — step on it to carry it, then tap a dark-blue gap next to Aaron to lay it down as a bridge. The ▼ cliff arrows — you can DROP down in the arrow’s direction, but you can never climb back up.', 'WARNING: the first golden switch sits on a knob in the north-middle. The moment you step on it, the storm SURGES — the low stream behind you floods, and there is no walking back. Carry the plank BEFORE you climb up there. (The pale ridge along the far north never floods… and something glitters on it.)'],
  stage3: ['Stage 3 · Final Crossing', 'YOUR GOAL: cross this last valley to the golden square ✦ in the south-east. THREE ways across: the pale causeway in the WEST (long, but it never floods), the island chain in the MIDDLE (short, but only safe before HIGH water), and the east channel (needs the 🪵 plank).', 'The 🟡 golden switch on the north-east knob is a DRAIN: step on it and the water drops one level everywhere — it can save a crossing the storm is about to ruin.', 'Once Aaron steps into the river, the storm rises BY ITSELF every few seconds. River movement becomes one square at a time, so choose each step deliberately. On the far side, the ark is waiting.'],
};
const HINTS = {
  stage1: ['Look at the forecast before you move anything heavy.', 'Crates can be pushed along the bank — and into the broken bridge gap.', 'Set the crate in the gap, stand on the high start stone, advance the storm twice, then cross the raised bridge.'],
  stage2: ['The high ridge along the north is dry in every storm state.', 'Climb the knob switch only when you are carrying the plank — the surge cuts the way back.', 'Switch 2 hides east of the deep channel. Bridge the channel at its south end, then return north over the stone bridge to reach the exit gate.'],
  stage3: ['Three ways across: causeway (always safe), island shallows (cross before HIGH water), or the plank over the east channel.', 'The sluice wheel lowers the effective water by one level — with it open, the shallows stay crossable one state longer.', 'River movement is one square at a time. If the water catches you, you wash back to the last safe bank — your objects stay where they are.'],
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
    try { scratch = normalizeFloodScratch(JSON.parse(localStorage.getItem(FLOOD_SCRATCH_KEY) || 'null'), f); } catch { scratch = null; }
    if (f.flood_complete) { scratch = null; this.replay = true; }
    if (scratch) {
      this.stageIdx = scratch.stage; this.s = scratch.s;
      this.checkpoint = scratch.checkpoint;
      this.hintsUsed = scratch.hintsUsed; this.nookFound = scratch.nook;
    } else {
      clearFloodScratch();
      this.stageIdx = !f.flood_stage1_done ? 0 : !f.flood_stage2_done ? 1 : 2;
      this.s = STAGES[this.stageIdx].initial();
      this.checkpoint = [...STAGES[this.stageIdx].start];
      this.hintsUsed = 0; this.nookFound = !!f.flood_nook;
    }
    this.stage = STAGES[this.stageIdx];
    this.forecast = 0; this.busy = false; this.finaleArmed = false; this.finaleDone = false; this.walkToken = 0;
    this.lastBank = [...this.stage.start];
    this.offX = (960 - this.stage.w * CELL) / 2; this.offY = (640 - this.stage.h * CELL) / 2;
    this.cameras.main.centerOn(480, 320);
    this.cameras.main.setBackgroundColor(0x44543c);
    this.fitCamera = () => {
      const fit = Phaser.Math.Clamp((this.scale.parentSize.width / Math.max(1, this.scale.parentSize.height)) / 1.5, 0.2, 1);
      this.cameras.main.setZoom(fit * renderScale(this));
      this.cameras.main.centerOn(480, 320);
    };
    this.fitCamera();
    this.scale.on('resize', this.fitCamera);
    this.rain = this.add.rectangle(480, 320, 1600, 1200, 0x274b63, 0).setDepth(40);
    if (!this.textures.exists('rainstreak')) { const rg = this.add.graphics(); rg.lineStyle(2, 0xcfe4f7, 0.9); rg.lineBetween(3, 0, 0, 14); rg.generateTexture('rainstreak', 4, 16); rg.destroy(); }
    this.rainFx = this.add.particles(480, 20, 'rainstreak', { emitZone: { source: new Phaser.Geom.Rectangle(-820, -30, 1640, 16) }, speedY: { min: 430, max: 660 }, speedX: { min: -80, max: -45 }, lifespan: { min: 650, max: 1050 }, quantity: 2, frequency: 45, scale: { min: 0.7, max: 1.2 }, alpha: { start: 0.55, end: 0.08 } }).setDepth(41).setVisible(false);
    this.player = this.add.image(0, 0, 'aaron-down-0').setOrigin(.5, .85).setDepth(10).setScale(.35);
    this.buildControls();
    this.render();
    this.placePlayer(false);
    this.input.on('pointerdown', p => this.onTap(p));
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,ESC');
    const directions = { W: 'N', UP: 'N', D: 'E', RIGHT: 'E', S: 'S', DOWN: 'S', A: 'W', LEFT: 'W' };
    this.keyHandlers = [];
    for (const [name, direction] of Object.entries(directions)) {
      const handler = () => this.stepDirection(direction);
      this.keys[name].on('down', handler); this.keyHandlers.push([this.keys[name], handler]);
    }
    this.interactHandler = () => this.takeAdjacentPlank();
    for (const name of ['E', 'SPACE', 'ENTER']) this.keys[name].on('down', this.interactHandler);
    this.escapeHandler = () => this.app.dismiss(); this.keys.ESC.on('down', this.escapeHandler);
    this.events.once('shutdown', () => {
      this.controlsEl?.remove(); this.stormEvent?.remove(false); this.scale.off('resize', this.fitCamera);
      for (const [key, handler] of this.keyHandlers) key.off('down', handler);
      for (const name of ['E', 'SPACE', 'ENTER']) this.keys[name].off('down', this.interactHandler);
      this.keys.ESC.off('down', this.escapeHandler);
      this.stopBoardTweens(); this.playerTween?.stop();
    });
    app.showHUD(`The Rising Flood · ${this.stage.name}`, '', 'CHAPTER 1 · GAME 4');
    this.updateHUD();
    if (!scratch) { if (this.stageIdx === 0 && !this.replay) this.showHowTo(); else this.showIntro(); }
    if (this.replay) app.toast('You already completed The Rising Flood — replaying for fun.');
  }

  // ------------------------------------------------------------ scratch
  saveScratch() {
    try { localStorage.setItem(FLOOD_SCRATCH_KEY, JSON.stringify({ stage: this.stageIdx, s: this.s, checkpoint: this.checkpoint, hintsUsed: this.hintsUsed, nook: this.nookFound })); } catch { /* storage unavailable */ }
  }
  clearScratch() { clearFloodScratch(); }

  // ------------------------------------------------------------ controls
  buildControls() {
    const el = document.createElement('div');
    el.className = 'flood-controls';
    el.innerHTML = `<button data-a="how">❓ How to play</button><button data-a="advance">🌧 Raise the water</button><button data-a="forecast">🔭 Forecast: off</button><button data-a="hint">💡 Hint (${this.hintsUsed}/3)</button><button data-a="reset">↺ Reset stage</button>`;
    document.getElementById('play').appendChild(el);
    this.controlsEl = el;
    el.querySelector('[data-a="how"]').onclick = () => { if (!this.busy) this.showHowTo(); };
    el.querySelector('[data-a="advance"]').onclick = () => this.advanceStorm();
    el.querySelector('[data-a="forecast"]').onclick = () => { this.forecast = (this.forecast + 1) % 3; this.render(); this.updateHUD(); };
    el.querySelector('[data-a="hint"]').onclick = () => this.useHint();
    el.querySelector('[data-a="reset"]').onclick = () => this.resetStage();
  }
  objectiveText() {
    const s = this.s, st = this.stage;
    if (st.id === 'stage1') {
      const bridged = s.crates.some(([x, y]) => x === 5 && y === 3);
      if (!bridged) return 'Step 1 of 3 — push a crate into the broken bridge gap (middle of the stream)';
      if (s.water < 2) return 'Step 2 of 3 — stand on the pale bridge row, then press 🌧 Raise the water until it is HIGH';
      return 'Step 3 of 3 — cross the raised bridge to the golden goal ✦';
    }
    if (st.id === 'stage2') {
      const inEast = s.x >= 9, hasPlank = s.plank === 'carry' || s.plank === 'placed';
      if ((s.gatesOpen & 2) === 2) return inEast ? 'Both gates are open — head north up the east side, through the gate, to the golden goal ✦' : 'Both gates are open — return north over the stone bridge (top row) and out through the second gate ✦';
      if (inEast) return 'You are across the first gate. Lay the plank over a dark-blue gap (tap the gap beside you) and find the second 🟡 switch';
      if ((s.gatesOpen & 1) === 1) return 'The first gate (✕, east wall) is open — go through it. The plank goes with you!';
      if (hasPlank) return 'Cross the low stream while the water is LOW, climb the north-middle knob and step on the 🟡 golden switch';
      return 'Step 1 — step on the 🪵 plank (west side) to carry it. You will need it over two waters';
    }
    return 'Three ways across: WEST pale causeway (never floods) · MIDDLE islands (cross before HIGH water) · EAST 🪵 plank channel. The 🟡 DRAIN buys more time';
  }
  updateHUD() {
    const nxt = [1, 2].map(d => WATER[Math.min(2, this.s.water + d)]).join(', ');
    this.app.showHUD(`The Rising Flood · ${this.stage.name}`, `${this.objectiveText()} · Water: ${WATER[this.s.water]} · Next: ${nxt}`, 'CHAPTER 1 · GAME 4');
    const adv = this.controlsEl?.querySelector('[data-a="advance"]');
    if (adv) adv.disabled = this.s.water >= 2 || this.busy;
    const fc = this.controlsEl?.querySelector('[data-a="forecast"]');
    if (fc) { fc.textContent = `🔭 Forecast: ${['off', 'next', 'next +1'][this.forecast]}`; fc.classList.toggle('active', this.forecast > 0); }
    const hb = this.controlsEl?.querySelector('[data-a="hint"]');
    if (hb) hb.textContent = `💡 Hint (${this.hintsUsed}/3)`;
  }
  showIntro() {
    const [title, ...lines] = INTROS[this.stage.id];
    this.app.dialogue('Guide', lines, { fiction: false, reference: 'Genesis 6–7' });
    this.app.toast(title);
  }
  showHowTo() {
    this.app.openModal(`<p class="overline">HOW TO PLAY</p><h2>The Rising Flood</h2>
      <p class="reading"><b>🎯 Your goal:</b> walk Aaron to the pulsing golden square ✦ across the water. Tap any square and he walks there by himself.</p>
      <p class="reading"><b>🎨 The squares:</b> PALE = high ground — it never floods. GREEN = low ground — it floods when the water reaches HIGH. DARK BLUE = deep water — Aaron can never step into it. A square tinted light blue is shallow water: he can wade through it.</p>
      <p class="reading"><b>💧 The water:</b> it has three levels — LOW, RISING, HIGH — shown in the banner at the top. It rises only when YOU press 🌧 Raise the water (in Stage 3 it also rises by itself once Aaron is in the river). If the water rises over the square Aaron is standing on, he washes back to the last ⚑ checkpoint flag — or the last safe bank in the final crossing. His crates and plank stay where they are.</p>
      <p class="reading"><b>🔭 Forecast:</b> this button PRE-VIEWS the future. Press once = how the board will look at the NEXT water level. Press again = the level after that. In the preview, squares tinted blue will be UNDERWATER. Always check the forecast before raising the water.</p>
      <p class="reading"><b>🧱 Things in the squares:</b><br>📦 <b>Crate</b> — stand next to it and tap it to push it. A crate pushed into water becomes a platform you can stand on.<br>🪵 <b>Plank</b> — step on it to pick it up and carry it. Then tap a dark-blue gap next to Aaron to lay it down as a bridge.<br>🟡 <b>Golden switch</b> — step on it to flip it. It opens a stone gate somewhere. (In Stage 3 the switch is a DRAIN — it lowers the water one level.)<br>⬛ <b>Stone gate</b> (marked ✕) — a closed door. Only a golden switch opens it.<br>▼ <b>Cliff arrow</b> — you may DROP down in the arrow’s direction. You can never climb back up.<br>⚑ <b>Flag</b> — a checkpoint. Wash away, and you return here.</p>
      <p class="reading"><b>🔘 The buttons:</b> 🌧 <b>Raise the water</b> — the water goes up one level. Only press it while Aaron stands somewhere that will stay dry! 🔭 <b>Forecast</b> — preview the next levels. 💡 <b>Hint</b> — up to 3 hints per stage. ↺ <b>Reset stage</b> — start this stage over. ❓ <b>How to play</b> — this page.</p>
      <p class="reading"><b>⌨️ Keyboard:</b> use the arrow keys or WASD to move one square at a time. Moving toward a crate pushes it; moving toward an empty gap while carrying the plank places it. Press E, Space, or Enter beside a placed plank to pick it back up.</p>
      <p class="reading">The banner at the top always tells you the next step. Follow it, stage by stage.</p>
      <button id="flood-how-close" class="primary">Got it — play →</button>`, 'reading');
    document.getElementById('flood-how-close').onclick = () => this.app.closeModal();
  }
  useHint() {
    const list = HINTS[this.stage.id];
    if (this.hintsUsed >= list.length) { this.app.toast('No more hints for this stage — the rest is yours to reason out.'); return; }
    this.app.toast(`Hint ${this.hintsUsed + 1}: ${list[this.hintsUsed]}`);
    this.hintsUsed++; this.saveScratch(); this.updateHUD();
  }
  resetStage() {
    if (this.busy) return;
    this.walkToken++; this.stormEvent?.remove(false); this.stormEvent = null; this.finaleArmed = false;
    this.s = this.stage.initial(); this.checkpoint = [...this.stage.start];
    this.forecast = 0; this.rain.setAlpha(0);
    this.render(); this.placePlayer(true); this.saveScratch(); this.updateHUD();
    this.app.toast('Stage reset — the valley is as it was.');
  }

  // ------------------------------------------------------------ rendering
  cellXY(cx, cy) { return { x: this.offX + cx * CELL + CELL / 2, y: this.offY + cy * CELL + CELL / 2 }; }
  syncRain() { if (this.rainFx) this.rainFx.setVisible((this.s.water === 2 || this.finaleArmed) && !this.app.save.settings.reducedMotion); }
  stopBoardTweens() {
    for (const tween of this.boardTweens || []) tween.stop();
    this.boardTweens = [];
  }
  boardTween(config) {
    const tween = this.tweens.add(config);
    this.boardTweens.push(tween);
    return tween;
  }
  render() {
    this.stopBoardTweens();
    this.boardLayer?.destroy();
    const layer = this.add.container(0, 0).setDepth(0); this.boardLayer = layer;
    const st = this.stage, s = this.s;
    const hash = (x, y, n) => { let h = (x * 73856093) ^ (y * 19349663) ^ (this.stageIdx * 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % n; };
    const fcState = this.forecast ? { ...s, water: Math.min(2, s.water + this.forecast) } : null;
    const clsAt = (x, y) => (x < 0 || y < 0 || x >= st.w || y >= st.h) ? 'wall' : cellClass(st, s, x, y);
    // Pass 1 — terrain: continuous ground (no spreadsheet gaps), textured.
    const g = this.add.graphics(); layer.add(g);
    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const X = this.offX + x * CELL, Y = this.offY + y * CELL;
      const info = st.cells.get(cellKey(x, y));
      if (!info || info.wall) {
        g.fillStyle(0x51564b, 1); g.fillRect(X, Y, CELL, CELL);
        g.fillStyle(0x6a6f63, 0.5);
        for (let i = 0; i < 3; i++) g.fillCircle(X + 10 + hash(x + i * 7, y, 44), Y + 10 + hash(x, y + i * 5, 44), 2.5);
        continue;
      }
      if (info.gap) { g.fillStyle(0x8a7a56, 1); g.fillRect(X, Y, CELL, CELL); }
      else {
        g.fillStyle([0xb3a077, 0x7fae5f, 0xd8c08d][info.elev], 1); g.fillRect(X, Y, CELL, CELL);
        if (info.elev === 1) {
          g.lineStyle(2, 0x5d8a49, 0.8);
          for (let i = 0; i < 3; i++) { const tx = X + 10 + hash(x + i * 3, y + 1, 42), ty = Y + 14 + hash(x + 2, y + i * 4, 38); g.lineBetween(tx, ty + 5, tx + 2, ty); }
        } else {
          g.fillStyle(info.elev === 2 ? 0xbfa26c : 0x9c8a64, 0.55);
          for (let i = 0; i < 3; i++) g.fillCircle(X + 8 + hash(x + i * 11, y + 3, 46), Y + 8 + hash(x + 5, y + i * 7, 46), 2);
        }
        if (info.elev === 2) {
          const below = st.cells.get(cellKey(x, y + 1));
          if (!below || below.gap || below.elev < 2) { g.fillStyle(0xa8895a, 1); g.fillRect(X, Y + CELL - 11, CELL, 11); g.fillStyle(0x8a6f42, 1); g.fillRect(X, Y + CELL - 4, CELL, 4); }
        }
      }
      const ledge = st.ledges.get(cellKey(x, y));
      if (ledge) {
        g.fillStyle(0x8a6f42, 0.9);
        if (ledge === 'S') g.fillRect(X, Y + CELL - 8, CELL, 8);
        if (ledge === 'N') g.fillRect(X, Y, CELL, 8);
        if (ledge === 'E') g.fillRect(X + CELL - 8, Y, 8, CELL);
        if (ledge === 'W') g.fillRect(X, Y, 8, CELL);
      }
    }
    // Pass 2 — water (shimmering layer) and built-in stone bridges.
    const wg = this.add.graphics(); layer.add(wg);
    const placedAt = s.plank === 'placed' && s.plankAt ? cellKey(s.plankAt[0], s.plankAt[1]) : null;
    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const X = this.offX + x * CELL, Y = this.offY + y * CELL;
      const cls = cellClass(st, s, x, y);
      if (cls === 'bridge' && placedAt !== cellKey(x, y)) {
        wg.fillStyle(0x99a0a4, 1); wg.fillRect(X + 4, Y + 15, CELL - 8, 34);
        wg.fillStyle(0x7d838a, 1); wg.fillRect(X + 4, Y + 43, CELL - 8, 6);
        wg.lineStyle(2, 0x6f757b, 1); wg.lineBetween(X + 25, Y + 16, X + 25, Y + 48); wg.lineBetween(X + 43, Y + 16, X + 43, Y + 48);
      }
      // Water: gap cells are the stream itself (their class stays 'gap' at
      // every level — they just run deeper); floor cells flood by level;
      // a crate standing on flooded ground still stands IN water.
      let wFill = 0, wAlpha = 0;
      if (cls === 'gap') [wFill, wAlpha] = [[0x6ea9dd, 0.66], [0x4a86c8, 0.8], [0x2a5d9e, 0.92]][s.water];
      else if (cls === 'deep') { wFill = 0x2a5d9e; wAlpha = 0.9; }
      else if (cls === 'wade') { wFill = 0x6ea9dd; wAlpha = 0.5; }
      else if (cls === 'crate') {
        const under = st.cells.get(cellKey(x, y));
        if (under?.gap) [wFill, wAlpha] = [[0x6ea9dd, 0.66], [0x4a86c8, 0.8], [0x2a5d9e, 0.92]][s.water];
        else if (under && s.water > under.elev) { wFill = 0x2a5d9e; wAlpha = 0.9; }
        else if (under && s.water === under.elev) { wFill = 0x6ea9dd; wAlpha = 0.5; }
      }
      if (wFill) {
        wg.fillStyle(wFill, wAlpha);
        wg.fillRect(X, Y, CELL, CELL);
        wg.lineStyle(2, 0x9fc8ee, 0.35);
        const o1 = hash(x, y, 18), o2 = hash(x + 9, y + 4, 18);
        wg.lineBetween(X + 8, Y + 18 + o1, X + 30, Y + 16 + o1); wg.lineBetween(X + 34, Y + 40 + o2, X + 56, Y + 38 + o2);
        const n = clsAt(x, y - 1);
        if (n !== 'wade' && n !== 'deep' && n !== 'gap') { wg.lineStyle(2, 0xffffff, 0.3); wg.lineBetween(X + 3, Y + 2, X + CELL - 3, Y + 2); }
      }
    }
    if (!this.app.save.settings.reducedMotion) this.boardTween({ targets: wg, alpha: 0.93, duration: 1500, yoyo: true, repeat: -1 });
    // Pass 3 — forecast ghost water (unchanged semantics, on top of water).
    if (fcState) for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const { x: px, y: py } = this.cellXY(x, y);
      const cls = cellClass(st, s, x, y), fc = cellClass(st, fcState, x, y);
      if (fc === 'deep' && cls !== 'deep') layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, 0x2c5f9e, 0.32));
      else if (fc === 'wade' && cls === 'dry') layer.add(this.add.rectangle(px, py, CELL - 2, CELL - 2, 0x5b8fd6, 0.15));
    }
    // Pass 4 — props as drawn objects: barred gates, levers, drain wheel,
    // checkpoint flags, the goal.
    const pg = this.add.graphics(); layer.add(pg);
    for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) {
      const { x: px, y: py } = this.cellXY(x, y);
      const cls = cellClass(st, s, x, y);
      if (cls === 'gate') {
        pg.fillStyle(0x767b81, 1); pg.fillRect(px - 27, py - 25, 13, 50); pg.fillRect(px + 14, py - 25, 13, 50);
        pg.fillStyle(0x5d6167, 1); pg.fillRect(px - 27, py - 25, 13, 7); pg.fillRect(px + 14, py - 25, 13, 7);
        pg.fillStyle(0x3f434a, 1); for (let b = 0; b < 3; b++) pg.fillRect(px - 15, py - 15 + b * 13, 30, 5);
        pg.fillStyle(0xd9b23a, 1); pg.fillCircle(px, py - 2, 5);
        layer.add(label(this, px, py - 38, 'GATE', '#e8e4da', 11));
      }
      const ledge = st.ledges.get(cellKey(x, y));
      if (ledge) layer.add(label(this, px, py + (ledge === 'S' ? 18 : ledge === 'N' ? -18 : 14), { N: '▲', S: '▼', E: '▶', W: '◀' }[ledge], '#8a6d1f', 15));
      if (st.switches.has(cellKey(x, y))) {
        const sw = st.switches.get(cellKey(x, y));
        const on = sw.sluice ? s.sluice : (s.gatesOpen & (1 << Math.max(0, [...st.gates.keys()].indexOf(sw.gate)))) !== 0;
        pg.fillStyle(0x8f9494, 1); pg.fillCircle(px, py, 16); pg.lineStyle(2, 0x5d6167, 1); pg.strokeCircle(px, py, 16);
        if (sw.sluice) {
          pg.lineStyle(4, 0xd9b23a, 1); pg.strokeCircle(px, py, 11);
          for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3 + (on ? Math.PI / 6 : 0); pg.lineStyle(3, 0xd9b23a, 1); pg.lineBetween(px - Math.cos(t) * 10, py - Math.sin(t) * 10, px + Math.cos(t) * 10, py + Math.sin(t) * 10); }
          pg.fillStyle(0x8a6d1f, 1); pg.fillCircle(px, py, 3.5);
        } else {
          pg.fillStyle(0xd9b23a, 1); pg.fillCircle(px, py, 10);
          const t = on ? 0.9 : -0.9;
          pg.lineStyle(4, 0x6e4c2e, 1); pg.lineBetween(px, py, px + Math.sin(t) * 15, py - Math.cos(t) * 15);
          pg.fillStyle(on ? 0x4e9a51 : 0xb8452e, 1); pg.fillCircle(px + Math.sin(t) * 16, py - Math.cos(t) * 16, 4.5);
        }
        layer.add(label(this, px, py + 27, sw.sluice ? 'DRAIN' : 'SWITCH', '#fff3c4', 11));
      }
      if (st.checkpoints?.some(([cx, cy]) => cx === x && cy === y)) {
        pg.lineStyle(3, 0x6e4c2e, 1); pg.lineBetween(px - 16, py + 14, px - 16, py - 16);
        pg.fillStyle(0xb8452e, 1); pg.fillTriangle(px - 16, py - 16, px - 16, py - 5, px - 2, py - 10.5);
      }
      if (x === st.exit[0] && y === st.exit[1]) {
        pg.fillStyle(0xf2d38a, 0.18); pg.fillCircle(px, py, 31);
        const glow = this.add.rectangle(px, py, CELL - 8, CELL - 8, 0xf2d38a, 0.55).setStrokeStyle(3, 0xd9a441);
        layer.add(glow);
        if (!this.app.save.settings.reducedMotion) this.boardTween({ targets: glow, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });
        layer.add(label(this, px, py, '✦', '#8a6d1f', 24));
        layer.add(label(this, px, py - 26, 'GOAL', '#8a6d1f', 12));
      }
      if (st.nook && x === st.nook[0] && y === st.nook[1] && !this.nookFound) {
        const sp = label(this, px, py - 6, '✦', '#ffeab0', 22); layer.add(sp);
        if (!this.app.save.settings.reducedMotion) this.boardTween({ targets: sp, y: py - 12, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1 });
      }
    }
    // Pass 5 — crates and the loose / placed plank.
    for (const [cx, cy] of s.crates) {
      const { x: px, y: py } = this.cellXY(cx, cy);
      layer.add(this.add.rectangle(px, py, 44, 44, 0x9a6b3f).setStrokeStyle(3, 0x6e4c2e));
      const cg = this.add.graphics(); layer.add(cg);
      cg.lineStyle(2, 0x6e4c2e, 0.8); cg.lineBetween(px - 20, py - 8, px + 20, py - 8); cg.lineBetween(px - 20, py + 8, px + 20, py + 8);
      layer.add(label(this, px, py, '✕', '#6e4c2e', 18));
      if (st.cells.get(cellKey(cx, cy))?.gap) {
        layer.add(this.add.rectangle(px, py + 13, 46, 12, 0x2a5d9e, 0.45));
        cg.fillStyle(0xffffff, 0.5); cg.fillCircle(px - 14, py + 19, 2); cg.fillCircle(px + 10, py + 20, 2);
      }
    }
    if (s.plank === 'rest' && s.plankAt) {
      const { x: px, y: py } = this.cellXY(s.plankAt[0], s.plankAt[1]);
      layer.add(this.add.rectangle(px, py + 10, 46, 14, 0xb68a59).setStrokeStyle(2, 0x6e4c2e));
      layer.add(label(this, px, py - 16, 'PLANK', '#fff3c4', 11));
    }
    if (s.plank === 'placed' && s.plankAt) {
      const { x: px, y: py } = this.cellXY(s.plankAt[0], s.plankAt[1]);
      const pg2 = this.add.graphics(); layer.add(pg2);
      pg2.fillStyle(0xb68a59, 1); pg2.fillRect(px - 30, py - 11, 60, 22);
      pg2.lineStyle(2, 0x6e4c2e, 1); pg2.strokeRect(px - 30, py - 11, 60, 22); pg2.lineBetween(px - 30, py, px + 30, py);
      pg2.fillStyle(0x6e4c2e, 1); pg2.fillCircle(px - 24, py - 5, 1.8); pg2.fillCircle(px + 24, py + 5, 1.8);
    }
    if (s.plank === 'carry') layer.add(label(this, this.cellXY(s.x, s.y).x, this.cellXY(s.x, s.y).y - 34, '🪵', '#fff', 15));
    this.syncRain();
  }
  placePlayer(animate) {
    const { x, y } = this.cellXY(this.s.x, this.s.y);
    this.playerTween?.stop();
    if (animate && !this.app.save.settings.reducedMotion) this.playerTween = this.tweens.add({ targets: this.player, x, y, duration: 100 });
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
        // Route-finding may walk across passive floor objects and switches,
        // but puzzle decisions (push/place/take/advance) stay with the player.
        if (!act.startsWith('move:')) continue;
        const k = `${ns.x},${ns.y},${ns.water},${ns.gatesOpen},${ns.sluice},${ns.plank},${ns.plankAt},${ns.crates.map(c => c.join(',')).sort().join(';')}`;
        if (seen.has(k)) continue; seen.add(k);
        queue.push({ s: ns, actions: [...actions, act] });
      }
    }
    return null;
  }
  stepDirection(dir) {
    if (this.busy || this.app.isBlocked()) return;
    const options = successors(this.stage, this.s);
    const hit = options.find(([, action]) => action === `move:${dir}`)
      || options.find(([, action]) => action === `push:${dir}`)
      || options.find(([, action]) => action === `place:${dir}`);
    if (!hit) { this.app.toast('Aaron cannot move that way.'); return; }
    const [next, action] = hit;
    if (action.startsWith('move:')) { this.walkPath([action]); return; }
    this.s = next;
    this.afterAction(action.startsWith('push:') ? 'Crate moved.' : 'Plank set across the gap.');
  }
  takeAdjacentPlank() {
    if (this.busy || this.app.isBlocked()) return;
    const hit = this.successorsFiltered(['takePlank'])[0];
    if (!hit) return;
    this.s = hit[0]; this.afterAction('Plank picked up.');
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
    if (cx === st.exit[0] && cy === st.exit[1] && st.exitWater !== undefined && s.water < st.exitWater) {
      const prepared = !st.advanceAfterCrateAt || s.crates.some(([x, y]) => x === st.advanceAfterCrateAt[0] && y === st.advanceAfterCrateAt[1]);
      this.app.toast(prepared ? `The crossing is prepared, but the lesson is not finished — raise the water to ${WATER[st.exitWater]} first.` : 'The bridge is still broken — push a crate into its middle gap first.');
      return;
    }
    const path = this.findPath(cx, cy);
    if (!path) { this.app.toast('Aaron cannot get there — not in this water.'); return; }
    this.walkPath(path);
  }
  walkPath(actions) {
    const token = ++this.walkToken;
    this.busy = true; this.updateHUD();
    const step = (i) => {
      if (token !== this.walkToken) return;
      if (i >= actions.length) { this.busy = false; this.afterAction(); return; }
      const act = actions[i];
      const hit = successors(this.stage, this.s).find(([, a]) => a === act);
      if (!hit) { this.busy = false; this.afterAction(); return; }
      const prevWater = this.s.water;
      this.s = hit[0];
      this.render(); this.placePlayer(true);
      if (this.s.water > prevWater) this.pendingSurge = true;
      this.time.delayedCall(this.app.save.settings.reducedMotion ? 30 : 110, () => {
        if (token !== this.walkToken || this.checkTriggers()) return;
        if (this.pendingSurge) { this.busy = false; this.afterAction(); return; }
        // The finale is intentionally deliberate: once Aaron enters the
        // river, each tap/key press commits exactly one square while the
        // independent storm clock keeps running.
        if (this.stage.finale && this.stage.riverRows.includes(this.s.y)) {
          this.busy = false; this.afterAction(); return;
        }
        step(i + 1);
      });
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
    if (isGoal(st, s)) { this.completeStage(); return true; }
    this.saveScratch();
    return false;
  }
  advanceStorm() {
    if (this.busy || this.app.isBlocked() || this.s.water >= 2) return;
    if (!canAdvance(this.stage, this.s)) {
      this.app.toast('Set a crate into the broken bridge first — then the flood lesson can begin.');
      return;
    }
    const ns = { ...this.s, water: this.s.water + 1 };
    this.s = ns;
    if (!standable(this.stage, this.s, this.s.x, this.s.y)) { this.rescue('The water rose over your footing!'); return; }
    this.cameras.main.flash(200, 90, 130, 180);
    this.afterAction(`The storm advances — water: ${WATER[this.s.water]}.`);
  }
  rescue(why) {
    this.walkToken++; this.busy = false;
    this.cameras.main.flash(300, 44, 79, 110);
    const toBank = !!this.stage.finale;
    if (toBank) {
      this.stormEvent?.remove(false); this.stormEvent = null; this.finaleArmed = false;
    }
    const [cx, cy] = toBank ? this.lastBank : this.checkpoint;
    this.s = { ...this.s, x: cx, y: cy };
    this.render(); this.placePlayer(false); this.saveScratch(); this.updateHUD();
    this.app.toast(`${why} Washed back to the ${toBank ? 'last safe bank' : 'checkpoint'} — your crates and plank stay where they are.`);
  }

  // ------------------------------------------------------------ finale & flow
  armFinale() {
    this.finaleArmed = true;
    this.app.toast('The storm is rising on its own now — keep moving!');
    this.rain.setAlpha(0.12);
    this.syncRain();
    this.stormEvent = this.time.addEvent({
      delay: 6000, loop: true, callback: () => {
        if (this.finaleDone || this.app.isBlocked()) return;
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
    this.walkToken++; this.busy = true;
    const f = this.flags(), st = this.stage;
    this.stormEvent?.remove(false); this.stormEvent = null;
    if (st.id === 'stage1') f.flood_stage1_done = true;
    if (st.id === 'stage2') f.flood_stage2_done = true;
    this.app.persist();
    if (st.id !== 'stage3') {
      this.app.dialogue('Guide', [`${st.name} — crossed. The valley opens ahead, and the storm is still gathering.`], {
        fiction: false, reference: 'Genesis 6–7', onComplete: () => {
          this.stageIdx++; this.stage = STAGES[this.stageIdx];
          this.s = this.stage.initial(); this.checkpoint = [...this.stage.start];
          this.hintsUsed = 0; this.forecast = 0; this.finaleArmed = false; this.lastBank = [...this.stage.start]; this.walkToken++;
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
