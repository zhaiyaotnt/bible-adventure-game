import { ExploreScene } from '../../scenes/ExploreScene.js';
import { rect, label, sparkle, character } from '../../scenes/art.js';
import { CLUES, createMysteryRun, loadMysteryState } from './mystery.js';
import { openArkBlueprint } from './BlueprintUI.js';

// Inside the finished ark (Chapter 1 · Game 3: The Ark Mystery).
// Three decks, one room each, joined by stairs. Aaron explores for the
// eleven clues to Noah's nine-room plan, then solves the layout on the
// blueprint (DOM UI) at the planning table or via the Blueprint button.
export class ArkInteriorScene extends ExploreScene {
  constructor() { super('ArkInterior'); }
  init({ story, deck, spawnX }) { this.story = story; this.deck = deck || 'middle'; this.spawnX = spawnX; }
  flags() { return this.app.save.stories[this.story.id].questFlags; }
  clueFound(id) { return !!this.flags()[`mx_clue_${id}`]; }
  foundCount() { return this.mysteryRun.clues.filter(c => this.clueFound(c.id)).length; }

  create() {
    const app = this.game.registry.get('app');
    this.app = app;
    this.mysteryRun = createMysteryRun(loadMysteryState().seed);
    // Interior shell: timber walls, a plank floor, heavy beams. The shell
    // is drawn well past the room's edges because the camera (below) now
    // frames a closer view that can pan beyond the 960x640 room.
    rect(this, -700, -400, 2360, 1440, 0x4a3826);
    rect(this, -700, -400, 2360, 700, 0x5d4630);
    for (let x = -676; x < 1660; x += 118) rect(this, x, -400, 7, 700, 0x4a3826);
    rect(this, -700, 288, 2360, 14, 0x3a2b1c);
    rect(this, -700, 302, 2360, 738, 0x77572f);
    for (let y = 338; y < 1040; y += 34) rect(this, -700, y, 2360, 3, 0x654a28);
    for (const bx of [150, 480, 810]) { rect(this, bx, 288, 16, 240, 0x543d24); rect(this, bx - 8, 288, 32, 14, 0x3a2b1c); }
    label(this, 480, 60, this.deck === 'upper' ? '· UPPER DECK ·' : this.deck === 'middle' ? '· MIDDLE DECK ·' : '· LOWER DECK ·', '#e8cf9f', 22);
    this.setup(app, { x: this.spawnX ?? 480, y: 486 });
    this.bounds = { left: 62, right: 898, top: 408, bottom: 566 };
    // Closer default framing than the whole-room fit view: at fit zoom
    // the interior art and its labels shrank to a blur on phones. Use the
    // meadow's proven base zoom and follow Aaron; pinch can still pull
    // back out to the full-room fit level.
    this.cameraManagedByScene = true;
    this.baseZoom = window.innerHeight > window.innerWidth ? 0.62 : 1.0;
    this.minZoom = this.computeFitZoom();
    this.userZoom = 1; this.applyZoom();
    const cam = this.cameras.main;
    cam.setBounds(-460, -340, 960 + 920, 640 + 680);
    cam.startFollow(this.player, true, .12, .12);
    this.blueprintButton();
    if (this.deck === 'upper') this.drawUpper();
    else if (this.deck === 'lower') this.drawLower();
    else this.drawMiddle();
    this.updateObjective();
    this.events.once('shutdown', () => this.blueprintBtn?.remove());
  }

  blueprintButton() {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ark-blueprint-open'; btn.textContent = '📐 Blueprint';
    btn.addEventListener('click', () => { if (!this.app.isBlocked()) this.openBlueprint(); });
    document.getElementById('play')?.appendChild(btn);
    this.blueprintBtn = btn;
  }
  openBlueprint() {
    openArkBlueprint(this.app, { run: this.mysteryRun,
      onAllSatisfied: () => {
        const f = this.flags(); f.mx_solved = true; this.app.persist(); this.updateObjective();
        this.app.toast('Every condition on the plan is satisfied. Noah wants one final check — talk to him on the middle deck.');
      },
      onFinalSubmitted: () => {
        const f = this.flags(), p = this.app.save.stories[this.story.id];
        f.mx_complete = true; f.master_architect = true;
        if (!p.completedScenes.includes('ark_mystery')) p.completedScenes.push('ark_mystery');
        this.app.persist(); this.updateObjective();
        this.app.dialogue('Noah', this.story.content.mystery_congrats, { fiction: true, reference: 'Genesis 6:22', onComplete: () => this.showReflection() });
      },
    });
  }
  showReflection() {
    const r = this.story.content.reflection_mystery, esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.app.openModal(`<p class="overline">BIBLE REFLECTION · GENESIS 6:14–22</p><h2>${esc(r.title)}</h2><p class="reading">“${esc(r.verse)}”</p>${r.lessons.map(l => `<p class="save-note">${esc(l)}</p>`).join('')}<p class="footnote">${esc(r.fictionNote)}</p><div class="button-row"><button id="reflection-done" class="primary">Back to the ark</button></div>`, 'discovery');
    document.getElementById('reflection-done').onclick = () => { this.app.closeModal(); this.app.toast('🏆 Master Architect — the Ark Mystery is complete.'); };
  }
  updateObjective() {
    const f = this.flags();
    let objective;
    if (f.mx_complete) objective = f.flood_complete ? 'The chapter is complete — the flood came, and God shut the door.' : 'The Ark Mystery is complete! Leave the ark and find Noah in the meadow — dark clouds are gathering.';
    else if (f.mx_solved && !f.mx_final_given) objective = 'The plan satisfies every clue! Talk to Noah on the middle deck for his final check.';
    else if (f.mx_solved) objective = 'Open the blueprint and submit the final plan to Noah.';
    else objective = `Explore all three decks for clues to the nine-room plan. Clues found: ${this.foundCount()} of ${CLUES.length}. The blueprint is on the planning table (middle deck).`;
    this.app.showHUD(`Inside the Ark · ${this.deck[0].toUpperCase() + this.deck.slice(1)} Deck`, objective, 'THE ARK MYSTERY · GENESIS 6');
  }
  grantClue(id) {
    const clue = this.mysteryRun.clues.find(c => c.id === id), f = this.flags();
    if (this.clueFound(id)) { this.app.dialogue('Already in your notes', [clue.text], { fiction: false, reference: clue.source }); return; }
    f[`mx_clue_${id}`] = true; this.app.persist(); this.updateObjective();
    this.app.dialogue(`Clue found · ${this.foundCount()} of ${CLUES.length}`, [clue.text], { fiction: false, reference: clue.source, onComplete: () => this.app.toast('Clue added to the blueprint notes. 📐') });
  }
  grantTorn(which) {
    const f = this.flags();
    if (f[`mx_torn_${which}`]) { this.app.toast('You already have this half of the diagram.'); return; }
    f[`mx_torn_${which}`] = true; this.app.persist();
    if (f.mx_torn_a && f.mx_torn_b) {
      this.app.dialogue('The torn diagram, pieced together', ['The two halves fit! Drawn on the back is a note about where the birds belong…'], { fiction: false, reference: 'Torn blueprint', onComplete: () => this.grantClue(11) });
    } else {
      this.app.toast('Half of a torn diagram. The writing is cut off — the other half is somewhere in the ark.');
    }
  }
  goDeck(deck, spawnX) { this.scene.restart({ story: this.story, deck, spawnX }); }
  stairs(x, dir, target, spawnX) {
    for (let i = 0; i < 4; i++) rect(this, x - 34 + i * 4, 430 - i * 16, 76, 13, 0x8a6a44);
    this.hotspot(x, 452, dir === 'up' ? 'Climb the stairs up' : 'Climb the stairs down', () => this.goDeck(target, spawnX), 84);
  }

  drawMiddle() {
    // Planning table with the unfinished blueprint.
    rect(this, 196, 330, 250, 20, 0x9a7648); rect(this, 206, 350, 14, 62, 0x6e5136); rect(this, 416, 350, 14, 62, 0x6e5136);
    rect(this, 226, 318, 190, 15, 0xe9dcbc); label(this, 321, 326, 'THE PLAN', '#7a6749', 13);
    sparkle(this, 321, 300);
    this.hotspot(321, 420, 'Open the ark blueprint', () => this.openBlueprint(), 105);
    // Carpenter's workbench + notebook + tool wall.
    rect(this, 596, 336, 220, 16, 0x8a6238); rect(this, 606, 352, 12, 58, 0x5f422a); rect(this, 794, 352, 12, 58, 0x5f422a);
    rect(this, 640, 322, 52, 13, 0xd9cba6); label(this, 706, 372, 'WORKBENCH', '#e8cf9f', 13);
    this.hotspot(666, 420, 'Read the carpenter’s notebook', () => this.grantClue(7), 92);
    rect(this, 836, 318, 64, 74, 0x54381f); label(this, 868, 300, 'TOOLS', '#e8cf9f', 13);
    this.hotspot(868, 420, 'Study the tool wall chart', () => this.grantClue(8), 84);
    // Feed chart and sacks, left side.
    rect(this, 66, 318, 92, 66, 0xd9cba6); label(this, 112, 300, 'FEEDING', '#e8cf9f', 13);
    this.hotspot(112, 420, 'Read the feed chart', () => this.grantClue(4), 86);
    rect(this, 66, 442, 54, 42, 0xa8905c); rect(this, 128, 450, 46, 34, 0x967c4e);
    this.hotspot(120, 500, 'Check the feed sack tag', () => this.grantClue(10), 84);
    // Noah.
    character(this, 'noah', 0xd9c8a9, 0x658580);
    const noah = this.add.image(500, 478, 'noah-down-0').setOrigin(.5, .85).setDepth(478).setScale(.45);
    label(this, 500, 394, 'NOAH', '#f9e7ba', 15);
    this.hotspot(500, 462, 'Talk to Noah', () => this.talkNoah(), 92);
    // Door back to the meadow + stairs.
    rect(this, 30, 330, 52, 150, 0x3a2b1c); rect(this, 38, 338, 36, 100, 0x7c5a34);
    this.hotspot(66, 470, 'Leave the ark', () => this.app.router.story(this.story.id, 'meet_noah', { x: 980, y: 550 }), 82);
    this.stairs(872, 'up', 'upper', 796);
    this.stairs(112, 'down', 'lower', 190);
    noah.setDepth(479);
  }
  talkNoah() {
    const f = this.flags(), c = this.story.content;
    if (!f.mx_intro) { this.app.dialogue('Noah', c.mystery_intro, { fiction: true, reference: 'Genesis 6:14–16', onComplete: () => { f.mx_intro = true; this.app.persist(); this.updateObjective(); } }); return; }
    if (f.mx_complete) {
      if (f.flood_complete) { this.app.dialogue('Noah', c.mystery_done, { fiction: true, reference: 'Genesis 6:22' }); return; }
      this.app.dialogue('Noah', [...c.mystery_done, 'But do not stay below deck admiring it, Aaron. Go out and find me beside the ark — look at the sky. The rain God promised is almost here, and the valley will flood.'], { fiction: true, reference: 'Genesis 7:10' });
      return;
    }
    if (f.mx_solved && !f.mx_final_given) {
      this.app.dialogue('Noah', c.mystery_final, { fiction: true, reference: 'Genesis 6', onComplete: () => { f.mx_final_given = true; this.app.persist(); this.updateObjective(); this.app.toast('Final check noted on the blueprint. Open it and submit the plan. 📐'); } });
      return;
    }
    if (f.mx_solved) { this.app.toast('Open the blueprint 📐 and submit the final plan.'); return; }
    this.app.dialogue('Noah', c.mystery_status.map(line => line.replace('{found}', String(this.foundCount()))), { fiction: true, reference: 'Genesis 6:14–16' });
  }

  drawUpper() {
    // Window light from the roof opening.
    const light = this.add.graphics(); light.fillStyle(0xfff3b0, .16); light.fillPoints([{ x: 430, y: 0 }, { x: 560, y: 0 }, { x: 660, y: 430 }, { x: 330, y: 430 }], true); light.setDepth(1);
    rect(this, 452, 6, 96, 16, 0x2e2119);
    // Deck diagram on a post.
    rect(this, 250, 312, 110, 84, 0xe9dcbc); label(this, 305, 296, 'DIAGRAM', '#e8cf9f', 13);
    for (let r = 0; r < 3; r++) for (let cI = 0; cI < 3; cI++) rect(this, 262 + cI * 30, 324 + r * 22, 24, 16, 0xcbb27f);
    sparkle(this, 305, 288);
    this.hotspot(305, 420, 'Study the deck diagram', () => this.grantClue(1), 92);
    // Family bunks in the corner.
    rect(this, 690, 356, 180, 44, 0x7c5a34); rect(this, 690, 336, 180, 20, 0xd9cba6); rect(this, 700, 342, 44, 12, 0xf0dfb6);
    label(this, 780, 318, 'FAMILY BUNKS', '#e8cf9f', 13);
    this.hotspot(780, 430, 'Read the note carved by the bunks', () => this.grantClue(5), 95);
    // Water barrels.
    for (const bx of [520, 566]) { rect(this, bx, 366, 40, 52, 0x7a5c36); rect(this, bx, 380, 40, 6, 0x543d24); rect(this, bx, 402, 40, 6, 0x543d24); }
    label(this, 563, 348, 'WATER', '#e8cf9f', 13);
    this.hotspot(563, 440, 'Read the stencil on the barrels', () => this.grantClue(6), 90);
    // Empty bird cages (flavour).
    for (const cx of [120, 168]) { rect(this, cx, 356, 42, 56, 0x000000); rect(this, cx, 356, 42, 56, 0x9a7648); for (let b = 0; b < 4; b++) rect(this, cx + 6 + b * 10, 356, 3, 56, 0x6e5136); }
    label(this, 165, 338, 'BIRD CAGES', '#e8cf9f', 13);
    this.hotspot(165, 440, 'Look at the empty bird cages', () => this.app.dialogue('Empty cages', ['The cages are built and waiting, sized for birds of every kind. Where the birds will live in the ark is part of the mystery — their room needs light and air.'], { fiction: true, reference: 'Genesis 6:20' }), 86);
    // Torn paper, first half.
    if (!this.flags().mx_torn_a) {
      rect(this, 392, 512, 34, 22, 0xe9dcbc); label(this, 409, 500, 'TORN PAPER', '#e8cf9f', 12);
      this.hotspot(409, 516, 'Pick up the torn paper', () => this.grantTorn('a'), 72);
    }
    this.stairs(872, 'down', 'middle', 796);
  }

  drawLower() {
    // Animal pens (flavour) on the left.
    for (let p = 0; p < 5; p++) rect(this, 84 + p * 26, 360, 8, 108, 0x8a6238);
    rect(this, 76, 372, 140, 9, 0x6e5136); rect(this, 76, 428, 140, 9, 0x6e5136);
    label(this, 146, 342, 'ANIMAL PENS', '#e8cf9f', 13);
    this.hotspot(146, 470, 'Look at the animal pens', () => this.app.dialogue('The pens', ['The pens are heavy-built, with deep hoof scratches already in the timber from practice runs. Whatever lives down here will be big — and its weight belongs low in the ark.'], { fiction: true, reference: 'Genesis 6:20' }), 92);
    // Crates hiding a note and the second torn half.
    const f = this.flags();
    this.noteSpot = this.add.container(430, 496); this.noteSpot.add(rect(this, -24, -14, 48, 28, 0xe9dcbc)); this.noteSpot.setVisible(!!f.mx_crates);
    if (!f.mx_crates) label(this, 430, 462, 'CRATES', '#e8cf9f', 13);
    this.crates = [];
    const cratePos = f.mx_crates ? [[300, 540], [560, 540]] : [[398, 486], [466, 492]];
    cratePos.forEach(([cx, cy], i) => {
      const crate = this.add.container(cx, cy).setDepth(cy);
      crate.add(rect(this, -30, -26, 60, 52, 0x9a7648)); crate.add(rect(this, -30, -26, 60, 8, 0x77572f)); crate.add(rect(this, -4, -26, 8, 52, 0x77572f));
      crate.setSize(64, 56).setInteractive(new Phaser.Geom.Rectangle(-32, -28, 64, 56), Phaser.Geom.Rectangle.Contains);
      this.crates.push(crate);
    });
    this.draggableObjects = [...(this.draggableObjects ?? []), ...this.crates];
    if (!f.mx_crates) {
      let dragCrate = null, dragOff = { x: 0, y: 0 };
      this.input.on('pointerdown', p => { const c = this.crates.find(c => c.getBounds().contains(p.worldX, p.worldY)); if (c) { dragCrate = c; dragOff = { x: c.x - p.worldX, y: c.y - p.worldY }; this.draggingLog = true; this.velocity = { x: 0, y: 0 }; } });
      this.input.on('pointermove', p => { if (dragCrate && p.isDown) dragCrate.setPosition(Phaser.Math.Clamp(p.worldX + dragOff.x, 240, 720), Phaser.Math.Clamp(p.worldY + dragOff.y, 430, 580)); });
      this.input.on('pointerup', () => {
        if (!dragCrate) return; dragCrate = null; this.draggingLog = false;
        if (this.flags().mx_crates) return;
        const spread = Math.abs(this.crates[0].x - this.crates[1].x);
        if (spread > 120 || Math.abs(this.crates[0].y - 486) > 50 || Math.abs(this.crates[1].y - 492) > 50) this.revealCrates();
      });
    } else this.registerNoteHotspots();
    // Half-finished storage label.
    rect(this, 640, 330, 130, 56, 0xd9cba6); label(this, 705, 312, 'STORAGE LABEL', '#e8cf9f', 13);
    this.hotspot(705, 420, 'Read the unfinished storage label', () => this.grantClue(9), 92);
    // Water barrels (flavour) far right.
    for (const bx of [806, 850]) rect(this, bx, 380, 38, 48, 0x7a5c36);
    this.stairs(112, 'up', 'middle', 190);
  }
  revealCrates() {
    const f = this.flags(); f.mx_crates = true; this.app.persist();
    this.noteSpot.setVisible(true);
    this.registerNoteHotspots();
    this.app.toast('Behind the crates: a folded note — and half of a torn diagram!');
  }
  registerNoteHotspots() {
    this.hotspot(430, 496, 'Read the note behind the crates', () => this.grantClue(3), 80);
    if (!this.flags().mx_torn_b) this.hotspot(486, 520, 'Pick up the torn paper', () => { this.grantTorn('b'); }, 72);
  }
}
