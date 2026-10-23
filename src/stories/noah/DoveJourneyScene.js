import Phaser from 'phaser';
import { label, renderScale } from '../../scenes/art.js';
import { FLIGHT_DT, initialFlightState, sampleWind, stepFlight, objectiveStatus, flightFailure, updraftAt } from './dove.js';
import { FLIGHTS } from './doveLevels.js';
import { makeDoveTextures, paintWorld } from './doveArt.js';

// Game 5 · The Dove's Journey (Genesis 8). One scene, three authored
// flights, explicit phase machine (spec §5):
// briefing → wind_preview → flying → flight_outcome → seven_day_transition
// → … → final_transition → reflection → return_to_meadow.
// All flight physics/wind/stamina live in the pure model (dove.js).

const OBJECTIVES = {
  explore: n => `Find signs that the water is going down — ${n}/2 found. Then bring the news back to the ark.`,
  return: () => 'No dry resting place — return to the ark.',
  toTree: () => 'Find the olive tree: silver-green leaves, a split pale trunk. The dark trees are not it.',
  leafReturn: () => 'Fresh olive leaf found — return to the ark.',
  toGrove: () => 'Fly east and find a green grove where the dove can stay. This time, do not return.',
};
const HINTS = [
  'Hint: the southern current bends back toward the ark.',
  'Hint: the northern updraft makes the return safer.',
  'Hint: the mountain route is longer, but its wind stays steady.',
];
const REMINDERS = [
  'Plan the return too.',
  'Bring the leaf back.',
  'This time, find a place to stay.',
];
const REFERENCES = ['Genesis 8:8–9', 'Genesis 8:10–11', 'Genesis 8:12'];
const BRANCH_POINT = { x: 2075, y: 600 };

export class DoveJourneyScene extends Phaser.Scene {
  constructor() { super('DoveJourney'); }
  flags() { return this.app.save.stories[this.story.id].questFlags; }

  init({ story, replayFlight = null }) {
    this.story = story;
    // SceneRouter passes only {story, spawn}; MeetNoahScene hands a replay
    // request over through the app object instead.
    const app = this.game.registry.get('app');
    if (replayFlight == null && app.doveReplayFlight != null) { replayFlight = app.doveReplayFlight; }
    app.doveReplayFlight = null;
    this.replayFlight = replayFlight;
  }

  create() {
    this.app = this.game.registry.get('app');
    const f = this.flags();
    makeDoveTextures(this);
    this.failures = {};
    this.replayMode = this.replayFlight != null;
    this.flightIdx = this.replayMode ? this.replayFlight
      : !f.dove_flight1_done ? 0 : !f.dove_flight2_done ? 1 : 2;
    this.phase = 'briefing';
    this.acc = 0;
    this.boostHeld = false;
    this.drag = null;
    this.releaseLeft = 0;
    this.lastSteer = { x: 0, y: 0 };
    this.tut = {};
    this.warnedEdge = false;
    this.lastHud = {};
    this.worldObjs = [];
    this.arrows = [];
    this.rings = [];
    this.updraftFx = [];

    // persistent actors
    this.shadow = this.add.ellipse(0, 0, 30, 10, 0x1c2f38, 0.3).setDepth(10);
    this.arkImg = this.add.image(0, 0, 'ark-top').setDepth(6).setScale(0.85);
    this.doveImg = this.add.image(0, 0, 'dove-a').setDepth(11).setDisplaySize(48, 36);
    this.dragG = this.add.graphics().setDepth(30);
    this.fitCamera = () => {
      const fit = Phaser.Math.Clamp((this.scale.parentSize.width / Math.max(1, this.scale.parentSize.height)) / 1.5, 0.2, 1);
      this.cameras.main.setZoom(fit * renderScale(this));
    };
    this.fitCamera();
    this.scale.on('resize', this.fitCamera);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,M');
    this.buildDom();
    this.onVis = () => { if (document.hidden) { this.drag = null; this.boostHeld = false; } };
    document.addEventListener('visibilitychange', this.onVis);
    this.input.on('pointerdown', p => this.pointerDown(p));
    this.input.on('pointermove', p => this.pointerMove(p));
    this.input.on('pointerup', p => this.pointerUp(p));
    this.input.on('pointerupoutside', p => this.pointerUp(p));
    this.events.once('shutdown', () => this.cleanup());
    this.setupFlight();
    this.briefing();
  }

  cleanup() {
    this.hudEl?.remove();
    this.scale.off('resize', this.fitCamera);
    document.removeEventListener('visibilitychange', this.onVis);
    this.arkTween?.stop(); this.arkTweenY?.stop();
    this.cameras.main.stopFollow();
  }

  // ------------------------------------------------------------ flight setup
  setupFlight() {
    const level = FLIGHTS[this.flightIdx];
    this.level = level;
    for (const o of this.worldObjs) o.destroy();
    this.worldObjs = []; this.arrows = []; this.rings = []; this.updraftFx = [];
    const bg = paintWorld(this, level).setDepth(0);
    this.worldObjs.push(bg);
    // landmarks
    for (const lm of level.landmarks) {
      if (lm.kind === 'oliveTree' || lm.kind === 'decoyTree') {
        const img = this.add.image(lm.x, lm.y, lm.kind === 'oliveTree' ? 'tree-olive' : 'tree-dark').setDepth(6).setScale(0.9);
        this.worldObjs.push(img);
      }
      if (lm.kind === 'grove') {
        for (const [dx, dy, s] of [[-70, -30, 1.1], [40, -55, 1.25], [85, 25, 1.0], [-30, 55, 0.95], [10, 5, 1.15]]) {
          const img = this.add.image(lm.x + dx, lm.y + dy, 'tree-grove').setDepth(6).setScale(s);
          this.worldObjs.push(img);
        }
        if (!this.app.save.settings.reducedMotion) {
          const ring = this.add.circle(lm.x, lm.y, lm.r, 0xf2d38a, 0.06).setStrokeStyle(2, 0xf2d38a, 0.7).setDepth(20);
          this.tweens.add({ targets: ring, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1 });
          this.worldObjs.push(ring); this.rings.push(ring);
        }
      }
      if (lm.kind === 'evidence') {
        const ring = this.add.circle(lm.x, lm.y, lm.r, 0xf2d38a, 0.05).setStrokeStyle(2, 0xf2d38a, 0.55).setDepth(20);
        ring.datasetId = lm.id;
        this.worldObjs.push(ring); this.rings.push(ring);
        const tag = label(this, lm.x, lm.y, lm.id === 'floating-branches' ? '🪵' : lm.id === 'submerged-ridge' ? '⛰' : '🌊', '#fff1cf', 20).setDepth(20);
        this.worldObjs.push(tag);
      }
      if (lm.kind === 'glint') {
        const sp = label(this, lm.x, lm.y, '✦', '#ffeab0', 22).setDepth(20);
        this.worldObjs.push(sp);
      }
    }
    // updraft spirals
    for (const up of level.updrafts ?? []) {
      const ring = this.add.circle(up.x, up.y, up.r, 0xffffff, 0.04).setStrokeStyle(2, 0xffffff, 0.4).setDepth(6);
      this.worldObjs.push(ring);
      const dots = [];
      for (let i = 0; i < 3; i++) { const d = this.add.circle(up.x, up.y, 4, 0xffffff, 0.55).setDepth(6); dots.push(d); this.worldObjs.push(d); }
      this.updraftFx.push({ up, dots });
    }
    // wind arrows
    level.windZones.forEach((zone, zi) => {
      const n = zone.visual?.arrows ?? 0;
      for (let i = 0; i < n; i++) {
        const spr = this.add.image(0, 0, 'wind-arrow').setDepth(4).setTint(zone.visual?.color ?? 0xb9d9e8).setAlpha(0.5).setScale(1.3);
        spr.__zone = zone; spr.__seed = zi * 10 + i; spr.__dist = 0;
        this.placeArrow(spr, true);
        this.arrows.push(spr); this.worldObjs.push(spr);
      }
    });
    // ark + dove home
    this.arkImg.setPosition(level.arkZone.x, level.arkZone.y);
    this.arkTween?.stop(); this.arkTweenY?.stop();
    if (!this.app.save.settings.reducedMotion) {
      this.arkImg.setRotation(-0.014);
      this.arkTween = this.tweens.add({ targets: this.arkImg, rotation: 0.014, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.arkTweenY = this.tweens.add({ targets: this.arkImg, y: level.arkZone.y + 5, duration: 4600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.s = initialFlightState(level);
    this.placeDove(false);
    const cam = this.cameras.main;
    cam.setBounds(-100, -100, level.world.width + 200, level.world.height + 200);
    cam.stopFollow();
    cam.centerOn(this.s.x, this.s.y);
    cam.startFollow(this.doveImg, true, 0.08, 0.08);
    this.tut = {};
    this.warnedEdge = false;
    this.acc = 0;
    this.lastHud = {};
  }

  placeArrow(spr, scatter) {
    const { x, y, w, h } = spr.__zone.shape;
    const k = (spr.__seed * 37 + (spr.__respawns ?? 0) * 91) % 100 / 100;
    const k2 = (spr.__seed * 53 + (spr.__respawns ?? 0) * 47) % 100 / 100;
    spr.setPosition(x + 20 + k * (w - 40), y + 20 + k2 * (h - 40));
    spr.__dist = scatter ? k * 200 : 0;
  }

  placeDove(sync = true) {
    this.doveImg.setPosition(this.s.x, this.s.y);
    this.doveImg.setRotation(this.s.facing);
    this.shadow.setPosition(this.s.x + 8, this.s.y + 15);
    if (sync) this.syncDoveTexture();
  }
  syncDoveTexture() {
    const speed = Math.hypot(this.s.vx, this.s.vy);
    const frame = Math.floor(this.s.elapsed * (this.s.boost ? 9 : 7)) % 2 === 0 ? 'a' : 'b';
    const key = `dove-${this.s.carryingLeaf ? 'leaf-' : ''}${frame}`;
    if (this.doveImg.texture.key !== key) this.doveImg.setTexture(key);
    this.doveImg.setAlpha(speed < 4 && this.phase === 'flying' ? 0.95 : 1);
  }

  // ------------------------------------------------------------ DOM HUD
  buildDom() {
    const el = document.createElement('div');
    el.className = 'dove-hud';
    el.innerHTML = `
      <div class="dove-stamina"><div class="dove-stamina-top"><span>STAMINA</span><span class="dove-stamina-num">100</span></div>
      <div class="dove-bar"><div class="dove-fill"></div></div>
      <div class="dove-status"><span class="dove-wind-arrow">➤</span> <span class="dove-wind-label">CALM</span> · <span class="dove-dist"></span></div></div>
      <div class="dove-buttons"><button data-a="map">🗺 Wind map</button><button data-a="restart">↺ Restart flight</button></div>
      <button class="dove-boost" data-a="boost">BOOST</button>
      <div class="dove-live" aria-live="polite"></div>`;
    document.getElementById('play').appendChild(el);
    this.hudEl = el;
    el.querySelector('[data-a="map"]').onclick = () => { if (this.phase === 'flying') this.openWindMap(false); };
    el.querySelector('[data-a="restart"]').onclick = () => { if (this.phase === 'flying') this.startFlying(); };
    const boost = el.querySelector('[data-a="boost"]');
    const on = e => { e.preventDefault(); this.boostHeld = true; };
    const off = () => { this.boostHeld = false; };
    boost.addEventListener('pointerdown', on);
    boost.addEventListener('pointerup', off);
    boost.addEventListener('pointercancel', off);
    boost.addEventListener('pointerleave', off);
  }
  live(text) { const n = this.hudEl?.querySelector('.dove-live'); if (n) n.textContent = text; }

  // ------------------------------------------------------------ narrative flow
  content(key) { return this.story.content[key] ?? []; }
  briefing() {
    this.phase = 'briefing';
    const key = ['dove_flight1_briefing', 'dove_flight2_briefing', 'dove_flight3_briefing'][this.flightIdx];
    this.app.showHUD(`The Dove's Journey · ${this.level.title}`, 'Listen to Noah, then study the wind.', 'CHAPTER 1 · GAME 5');
    this.app.dialogue('Noah', this.content(key), {
      fiction: true, reference: REFERENCES[this.flightIdx],
      onComplete: () => this.openWindMap(true),
    });
  }

  openWindMap(fromBriefing, fromFailure = false) {
    if (!fromBriefing && !fromFailure) this.phase = 'wind_preview';
    const level = this.level, W = level.world.width, H = level.world.height;
    const sx = 560 / W, sy = 340 / H, sc = Math.min(sx, sy);
    const px = (x) => (x * sc).toFixed(0), py = (y) => (y * sc).toFixed(0);
    const arrows = level.windZones.filter(z => !z.calm && (z.wind.x || z.wind.y)).map(z => {
      const cx = z.shape.x + z.shape.w / 2, cy = z.shape.y + z.shape.h / 2;
      const m = Math.hypot(z.wind.x, z.wind.y) || 1, ux = z.wind.x / m, uy = z.wind.y / m, L = 26;
      const changed = (level.changes ?? []).some(c => c.zoneId === z.id);
      return `<line x1="${px(cx - ux * L)}" y1="${py(cy - uy * L)}" x2="${px(cx + ux * L)}" y2="${py(cy + uy * L)}" stroke="#b9d9e8" stroke-width="3" marker-end="url(#ah)"/>${changed ? `<text x="${px(cx)}" y="${py(cy) + 22}" fill="#f2d38a" font-size="11" text-anchor="middle">changeable air</text>` : ''}`;
    }).join('');
    const marks = [
      `<circle cx="${px(level.arkZone.x)}" cy="${py(level.arkZone.y)}" r="7" fill="#b68a59"/><text x="${px(level.arkZone.x) + 10}" y="${py(level.arkZone.y) + 4}" fill="#fff1cf" font-size="12">ARK</text>`,
      ...level.landmarks.map(lm => lm.kind === 'evidence'
        ? `<circle cx="${px(lm.x)}" cy="${py(lm.y)}" r="${Math.max(6, lm.r * sc)}" fill="none" stroke="#f2d38a" stroke-width="1.5" stroke-dasharray="4 3"/>`
        : lm.kind === 'oliveTree' ? `<circle cx="${px(lm.x)}" cy="${py(lm.y)}" r="6" fill="#9db38a"/><text x="${px(lm.x) + 9}" y="${py(lm.y) + 4}" fill="#fff1cf" font-size="12">OLIVE TREE</text>`
        : lm.kind === 'grove' ? `<circle cx="${px(lm.x)}" cy="${py(lm.y)}" r="${Math.max(8, lm.r * sc)}" fill="#6fae5f" fill-opacity="0.5" stroke="#6fae5f"/><text x="${px(lm.x) - 16}" y="${py(lm.y) + 4}" fill="#fff1cf" font-size="12">GROVE</text>` : ''),
    ].join('');
    const btnLabel = fromBriefing ? 'Start flight →' : fromFailure ? 'Back' : 'Close';
    this.app.openModal(`<p class="overline">WIND MAP · FLIGHT ${this.flightIdx + 1} OF 3</p><h2>${level.title}</h2>
      <svg viewBox="0 0 ${px(W)} ${py(H)}" style="width:100%;background:#2c4657;border-radius:10px"><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#b9d9e8"/></marker></defs>${arrows}${marks}</svg>
      <p class="reading">Arrows show the authored wind — it is the same wind you will feel. Dashed circles and labels mark what matters. <b>${REMINDERS[this.flightIdx]}</b></p>
      <p class="reading">Drag on the sky (or WASD / arrow keys) to steer. Hold SPACE — or the BOOST button — to fly faster at extra stamina cost. If the dove tires out, you simply try the flight again.</p>
      <button id="dove-map-go" class="primary">${btnLabel}</button>`, 'reading');
    document.getElementById('dove-map-go').onclick = () => {
      this.app.closeModal();
      if (fromBriefing) this.startFlying();
      else if (fromFailure) this.showFailure();
      else this.phase = 'flying';
    };
  }

  // ------------------------------------------------------------ flying
  startFlying() {
    this.s = initialFlightState(this.level);
    this.doveImg.setAlpha(1);
    this.placeDove(false);
    this.cameras.main.centerOn(this.s.x, this.s.y);
    this.phase = 'flying';
    this.acc = 0;
    this.lastHud = {};
    this.updateObjective(true);
    this.app.toast(`Flight ${this.flightIdx + 1} · ${this.level.title}`);
  }

  updateObjective(force = false) {
    const st = objectiveStatus(this.level, this.s);
    if (!force && st.stage === this.lastHud.stage) return;
    this.lastHud.stage = st.stage;
    let text;
    if (st.stage === 'explore') text = OBJECTIVES.explore(st.exploredCount);
    else if (st.stage === 'return') text = this.level.objective.type === 'leafReturn' ? OBJECTIVES.leafReturn() : OBJECTIVES.return();
    else if (st.stage === 'toTree') text = OBJECTIVES.toTree();
    else if (st.stage === 'toGrove') text = OBJECTIVES.toGrove();
    else text = '';
    if (text) {
      this.app.showHUD(`The Dove's Journey · ${this.level.title}`, text, 'CHAPTER 1 · GAME 5');
      this.live(text);
    }
  }

  pointerDown(p) {
    if (this.phase !== 'flying' || this.app.isBlocked() || this.drag) return;
    this.drag = { id: p.id, ox: p.x, oy: p.y, cx: p.x, cy: p.y };
  }
  pointerMove(p) {
    if (this.drag && p.id === this.drag.id) { this.drag.cx = p.x; this.drag.cy = p.y; }
  }
  pointerUp(p) {
    if (this.drag && p.id === this.drag.id) { this.drag = null; this.releaseLeft = 0.12; }
  }

  readInput() {
    const k = this.keys;
    let sx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let sy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (this.drag) {
      const css = this.scale.displaySize.width / Math.max(1, this.scale.gameSize.width);
      const dx = (this.drag.cx - this.drag.ox) * css, dy = (this.drag.cy - this.drag.oy) * css;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const mag = Math.min(1, d / 72);
        sx = dx / d * mag; sy = dy / d * mag;
        this.lastSteer = { x: sx, y: sy };
      }
    } else if (this.releaseLeft > 0 && sx === 0 && sy === 0) {
      const f = this.releaseLeft / 0.12;
      sx = this.lastSteer.x * f; sy = this.lastSteer.y * f;
    }
    let boost = k.SPACE.isDown || this.boostHeld;
    if (this.level.id === 'flight1' && this.s.explored.length === 0) boost = false; // tutorial: boost unlocks at the first sign
    return { steerX: sx, steerY: sy, boost };
  }

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.M) && this.phase === 'flying' && !this.app.isBlocked()) { this.openWindMap(false); return; }
    if (this.phase !== 'flying' || this.app.isBlocked() || document.hidden) return;
    const frameDt = Math.min(delta, 50) / 1000;
    if (this.releaseLeft > 0) this.releaseLeft = Math.max(0, this.releaseLeft - frameDt);
    const prevExplored = this.s.explored, prevObserved = this.s.observed, prevLeaf = this.s.carryingLeaf;
    this.acc += Math.min(delta, 50);
    let steps = 0;
    while (this.acc >= 1000 / 60 && steps < 4) {
      this.s = stepFlight(this.level, this.s, this.readInput(), FLIGHT_DT);
      this.acc -= 1000 / 60;
      steps++;
      if (this.s.failure || objectiveStatus(this.level, this.s).done) break;
    }
    this.onFlightEvents(prevExplored, prevObserved, prevLeaf);
    this.placeDove();
    this.animateWorld(frameDt);
    this.syncHud();
    this.updateObjective();
    this.tutorial();
    // soft edge warning (40 px margin, spec §4)
    const { width: W, height: H } = this.level.world;
    const inMargin = this.s.x < 40 || this.s.y < 40 || this.s.x > W - 40 || this.s.y > H - 40;
    if (inMargin && !this.warnedEdge) { this.warnedEdge = true; this.app.toast('The search area ends soon — turn back toward the ark side.'); }
    if (!inMargin) this.warnedEdge = false;
    if (this.s.failure) { this.doFailure(); return; }
    if (objectiveStatus(this.level, this.s).done) this.doOutcome();
  }

  onFlightEvents(prevExplored, prevObserved, prevLeaf) {
    for (const id of this.s.explored) {
      if (!prevExplored.includes(id)) {
        const lm = this.level.landmarks.find(l => l.id === id);
        this.app.toast(`A sign! ${lm?.label ?? ''} (${this.s.explored.length}/2)`);
        this.live(`Sign found. ${this.s.explored.length} of 2.`);
      }
    }
    for (const ring of this.rings) if (ring.datasetId && this.s.explored.includes(ring.datasetId)) ring.setVisible(false);
    for (const id of this.s.observed) {
      if (prevObserved.includes(id)) continue;
      if (id === 'far-glint') this.app.toast('Something glints far to the east — but the wind home blows against you.');
      else if (id === 'mudflat') this.app.toast('The ground is exposed, but there is no safe place to settle.');
      else this.app.toast('Dark leaves and a dark trunk — this is not the olive tree.');
    }
    if (this.s.carryingLeaf && !prevLeaf) {
      this.app.toast('The dove plucks a fresh olive leaf.');
      this.live('Olive leaf found. Return to the ark.');
    }
  }

  tutorial() {
    if (this.level.id !== 'flight1') return;
    if (this.s.elapsed >= 5 && !this.tut.wind) { this.tut.wind = true; this.app.toast('See the pale arrows drifting? That is the wind. It pushes the dove as it flies.'); }
    if (this.s.stamina < 75 && !this.tut.stamina) { this.tut.stamina = true; this.app.toast('Stamina is precious. Always keep enough to get back to the ark.'); }
    if (this.s.explored.length > 0 && !this.tut.boost) { this.tut.boost = true; this.app.toast('Boost unlocked: hold SPACE or BOOST to fly faster — it costs extra stamina.'); }
  }

  animateWorld(frameDt) {
    const t = this.s?.elapsed ?? 0;
    for (const spr of this.arrows) {
      const w = sampleWind(this.level, spr.x, spr.y, t);
      const m = Math.hypot(w.x, w.y);
      if (m < 2) { spr.setAlpha(0.15); continue; }
      spr.setAlpha(0.5);
      spr.setRotation(Math.atan2(w.y, w.x) - Math.PI / 2);
      spr.x += w.x / m * 26 * frameDt;
      spr.y += w.y / m * 26 * frameDt;
      spr.__dist += 26 * frameDt;
      const { x, y, w: zw, h: zh } = spr.__zone.shape;
      if (spr.__dist > 280 || spr.x < x - 30 || spr.x > x + zw + 30 || spr.y < y - 30 || spr.y > y + zh + 30) { spr.__respawns = (spr.__respawns ?? 0) + 1; this.placeArrow(spr, false); }
    }
    for (const { up, dots } of this.updraftFx) {
      dots.forEach((d, i) => {
        const a = t * 1.6 + i * (Math.PI * 2 / 3);
        d.setPosition(up.x + Math.cos(a) * up.r * 0.55, up.y + Math.sin(a) * up.r * 0.55);
      });
    }
    // drag steering guide
    this.dragG.clear();
    if (this.drag && !this.app.save.settings.reducedMotion) {
      const cam = this.cameras.main;
      const o = cam.getWorldPoint(this.drag.ox, this.drag.oy), c = cam.getWorldPoint(this.drag.cx, this.drag.cy);
      this.dragG.lineStyle(2, 0xffffff, 0.4); this.dragG.strokeCircle(o.x, o.y, 16);
      this.dragG.lineBetween(o.x, o.y, c.x, c.y);
    }
  }

  syncHud() {
    if (!this.hudEl) return;
    const stam = Math.max(0, Math.round(this.s.stamina));
    if (stam !== this.lastHud.stam) {
      this.lastHud.stam = stam;
      this.hudEl.querySelector('.dove-stamina-num').textContent = stam;
      const fill = this.hudEl.querySelector('.dove-fill');
      fill.style.width = `${stam}%`;
      fill.classList.toggle('low', stam < 25);
    }
    const wind = sampleWind(this.level, this.s.x, this.s.y, this.s.elapsed);
    const up = updraftAt(this.level, this.s.x, this.s.y);
    const wMag = Math.hypot(wind.x, wind.y);
    let wLabel = 'CALM';
    if (up) wLabel = 'UPDRAFT';
    else if (wMag >= 6) {
      let vx = this.s.vx, vy = this.s.vy;
      if (Math.hypot(vx, vy) < 10) { vx = Math.cos(this.s.facing); vy = Math.sin(this.s.facing); }
      const dot = (vx * wind.x + vy * wind.y) / (Math.hypot(vx, vy) * wMag);
      wLabel = dot > 0.5 ? 'TAILWIND' : dot < -0.5 ? 'HEADWIND' : 'CROSSWIND';
    }
    if (wLabel !== this.lastHud.wLabel) {
      this.lastHud.wLabel = wLabel;
      this.hudEl.querySelector('.dove-wind-label').textContent = wLabel;
      this.hudEl.querySelector('.dove-wind-arrow').style.transform = `rotate(${wMag >= 6 ? Math.round(Math.atan2(wind.y, wind.x) * 180 / Math.PI) : 0}deg)`;
    }
    const target = this.level.objective.type === 'land' ? this.level.landmarks.find(l => l.kind === 'grove') : this.level.arkZone;
    const dist = Math.round(Math.hypot(this.s.x - target.x, this.s.y - target.y));
    if (dist !== this.lastHud.dist) {
      this.lastHud.dist = dist;
      const ang = Math.atan2(target.y - this.s.y, target.x - this.s.x);
      const chars = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
      const arrow = chars[Math.round(((ang * 180 / Math.PI) + 360) % 360 / 45) % 8];
      this.hudEl.querySelector('.dove-dist').textContent = `${this.level.objective.type === 'land' ? 'GROVE' : 'ARK'} ${arrow} ${dist}`;
    }
  }

  // ------------------------------------------------------------ outcomes
  doFailure() {
    this.phase = 'flight_outcome';
    this.failures[this.flightIdx] = (this.failures[this.flightIdx] ?? 0) + 1;
    this.tweens.add({ targets: this.doveImg, alpha: 0, duration: 250 });
    this.showFailure();
  }
  showFailure() {
    const reason = this.s.failure === 'out_of_bounds'
      ? 'The wind carried the dove beyond the search area.'
      : 'The dove is too tired to continue.';
    const hint = this.failures[this.flightIdx] >= 2 ? `<p class="reading">${HINTS[this.flightIdx]}</p>` : '';
    this.app.openModal(`<p class="overline">FLIGHT ${this.flightIdx + 1} · ${this.level.title.toUpperCase()}</p><h2>The flight ends</h2>
      <p class="reading">${reason} Noah is waiting — a dove that comes back empty is never scolded. Try the flight again.</p>${hint}
      <button id="dove-retry" class="primary">Retry flight</button> <button id="dove-review">Review wind map</button>`, 'reading');
    this.live(reason);
    document.getElementById('dove-retry').onclick = () => { this.app.closeModal(); this.doveImg.setAlpha(1); this.startFlying(); };
    document.getElementById('dove-review').onclick = () => this.openWindMap(false, true);
  }

  doOutcome() {
    this.phase = 'flight_outcome';
    if (this.replayMode) {
      this.app.openModal(`<p class="overline">REPLAY</p><h2>Flight complete</h2><p class="reading">The dove's flight is flown again, just for the joy of it. Nothing about Noah's story changes.</p><button id="dove-back" class="primary">Back to Noah →</button>`, 'reading');
      document.getElementById('dove-back').onclick = () => { this.app.closeModal(); this.app.router.story(this.story.id, 'meet_noah'); };
      return;
    }
    const f = this.flags();
    f[`dove_flight${this.flightIdx + 1}_done`] = true;
    if (this.flightIdx === 2) f.dove_complete = true;
    this.app.persist();
    if (this.flightIdx === 0) {
      this.app.dialogue('Noah', this.content('dove_flight1_return'), { fiction: false, reference: 'Genesis 8:9', onComplete: () => this.sevenDays('dove_seven_days_1') });
    } else if (this.flightIdx === 1) {
      this.app.dialogue('Noah', this.content('dove_flight2_return'), { fiction: false, reference: 'Genesis 8:11', onComplete: () => this.sevenDays('dove_seven_days_2') });
    } else {
      this.landingSequence();
    }
  }

  sevenDays(key) {
    this.phase = 'seven_day_transition';
    const lines = this.content(key).map(l => `<p class="reading">${l}</p>`).join('');
    this.app.openModal(`<p class="overline">SEVEN DAYS PASS</p><h2>Noah waits</h2>${lines}<button id="dove-next" class="primary">Continue →</button>`, 'reading');
    document.getElementById('dove-next').onclick = () => {
      this.app.closeModal();
      this.flightIdx++;
      this.setupFlight();
      this.briefing();
    };
  }

  // ------------------------------------------------------------ flight 3 ending
  landingSequence() {
    this.phase = 'final_transition';
    const cam = this.cameras.main;
    cam.stopFollow();
    // Assisted glide to the authored branch point; steering is done.
    this.tweens.add({
      targets: this.doveImg, x: BRANCH_POINT.x, y: BRANCH_POINT.y, duration: 1200, ease: 'Sine.easeInOut',
      onUpdate: () => this.shadow.setPosition(this.doveImg.x + 8, this.doveImg.y + 15),
    });
    cam.pan(BRANCH_POINT.x + 150, BRANCH_POINT.y + 30, 1500, 'Sine.easeInOut');
    cam.zoomTo(cam.zoom * 0.92, 1500, 'Sine.easeInOut');
    this.time.delayedCall(1700, () => {
      this.app.dialogue('Guide', this.content('dove_flight3_landing'), {
        fiction: false, reference: 'Genesis 8:12',
        onComplete: () => this.app.dialogue('Guide', this.content('dove_wait_for_command'), {
          fiction: false, reference: 'Genesis 8:15',
          onComplete: () => this.app.dialogue('Guide', this.content('dove_leave_ark'), {
            fiction: false, reference: 'Genesis 8:15–19',
            onComplete: () => this.app.dialogue('Guide', this.content('dove_offering'), {
              fiction: false, reference: 'Genesis 8:20–22',
              onComplete: () => this.covenantModal(),
            }),
          }),
        }),
      });
    });
  }

  covenantModal() {
    const lines = this.content('dove_covenant').map(l => `<p class="reading">${l}</p>`).join('');
    const rainbow = `<svg viewBox="0 0 300 130" style="width:100%"><path d="M20 125 A130 130 0 0 1 280 125" fill="none" stroke="#e86a5a" stroke-width="11"/><path d="M38 125 A112 112 0 0 1 262 125" fill="none" stroke="#f2a541" stroke-width="11"/><path d="M56 125 A94 94 0 0 1 244 125" fill="none" stroke="#f2d38a" stroke-width="11"/><path d="M74 125 A76 76 0 0 1 226 125" fill="none" stroke="#7fae5f" stroke-width="11"/><path d="M92 125 A58 58 0 0 1 208 125" fill="none" stroke="#5b8fd6" stroke-width="11"/></svg>`;
    this.app.openModal(`<p class="overline">GENESIS 9:8–17</p><h2>The Covenant Sign</h2>${rainbow}${lines}<button id="dove-cov-next" class="primary">Continue →</button>`, 'reading');
    document.getElementById('dove-cov-next').onclick = () => { this.app.closeModal(); this.reflectionModal(); };
  }

  reflectionModal() {
    this.app.openModal(`<p class="overline">BIBLE DISCOVERY · GENESIS 8–9</p><h2>God Remembers, God Keeps His Promise</h2>
      <p class="reading">🌈 God <b>remembered</b> Noah and every living thing with him in the ark — He was never forgotten, even in the long months on the water.</p>
      <p class="reading">🕊 The dove brought back evidence that the waters were going down — yet Noah still <b>waited</b> until God Himself told him to come out.</p>
      <p class="reading">✝️ God's covenant was with Noah, his descendants, and <b>every living creature</b>. The rainbow in the clouds is the sign of that promise.</p>
      <p class="reading">The dove's routes, winds and resting places in this game are imagined — the waiting, the leaf, and the promise are Scripture's own.</p>
      <button id="dove-finish" class="primary">Complete Noah's chapter →</button>`, 'reading');
    document.getElementById('dove-finish').onclick = () => {
      const save = this.app.save, st = save.stories[this.story.id];
      if (!st.completedScenes.includes('doves_journey')) st.completedScenes.push('doves_journey');
      if (!save.mementos.includes('doves_journey_illustration')) save.mementos.push('doves_journey_illustration');
      if (!save.badges.includes('rainbow_covenant')) save.badges.push('rainbow_covenant');
      st.status = 'completed';
      this.app.persist();
      this.app.closeModal();
      this.app.router.story(this.story.id, 'meet_noah');
    };
  }
}
