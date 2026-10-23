# Chapter 1, Game 6 — The Rainbow Prism

## Implementation specification and chapter-finale handoff

- **Status:** Approved direction; not implemented in this checkout
- **Owner:** Next implementation agent
- **Runtime:** Phaser 3.90, JavaScript ES modules, Vite 6, browser DOM, Node's built-in test runner
- **Target:** Desktop and mobile browsers
- **Expected play time:** 7–11 minutes across three boards
- **Biblical source:** Genesis 8:15–22; 9:8–17
**Fiction boundary:** The optical garden and every puzzle device are fictional educational gameplay. The covenant and its sign are God's action in the separate finale.

This file replaces the earlier high-level draft. It is specific enough that another agent can implement Game 6 without inventing the puzzle rules, board topology, controls, persistence format, narrative sequence, or integration contract.

---

## 1. Product decision

Game 6 is the chapter finale: a deterministic light-routing puzzle followed by the biblical covenant scene.

The player manipulates a small number of mirrors, shutters, blockers, and prisms on a full-canvas observation board. Light updates instantly after every legal action. The player reads the whole system, tests a theory, undoes mistakes, and solves increasingly interdependent boards.

The game is **not**:

- a seven-item scavenger hunt;
- a physics sandbox with pixel-perfect angles;
- a timing challenge;
- a quiz about rainbow facts;
- a claim that Aaron created, summoned, or caused God's rainbow.

The optical activity and covenant scene must remain visually and narratively separate. Solving Stage 3 reveals a small local spectrum in mist. The screen then fades out, Aaron returns to Noah, and God appoints the great rainbow as the covenant sign in a distinct story sequence.

### Visual thesis

A rain-washed valley becomes a luminous outdoor instrument: warm sunlight crosses cool stone and mist, white beams remain dominant, and restrained spectral color appears only where the optics justify it. The final biblical rainbow is larger, softer, and compositionally unlike any puzzle effect.

### Content plan

1. A two-line fictional setup establishes the optical garden as an educational interlude.
2. Three full-canvas boards teach reflection, color-channel planning, and simultaneous relay constraints.
3. A short science note explains that the model is simplified.
4. A full-screen story transition returns to Noah after his offering.
5. God establishes the covenant; the chapter badge and journal entry unlock.

### Interaction thesis

- Every adjustment produces one crisp mechanical movement and a beam redraw in under 100 ms.
- Solved circuits illuminate in a readable chain rather than exploding into particles.
- Board chrome stays sparse: selected object, objective, Undo, Reset, Hint, and Trace Paths are enough.
- Decorative mist and glints respect Reduced Motion; information-bearing beam direction never disappears.

---

## 2. Canonical story boundary and Game 5 handoff

Game 5 is already implemented outside this checkout. Its ending must be changed when that code is available.

Game 5 must end in this order:

1. The third dove does not return (Genesis 8:12).
2. Noah continues to wait for God's instruction.
3. God tells Noah and the living creatures to leave the ark (Genesis 8:15–19).
4. Noah builds an altar and worships (Genesis 8:20–22).
5. Game 5 sets `dove_complete`, awards only its dove memento, and returns to Noah or launches the Game 6 invitation.

Game 5 must **not**:

- reveal the covenant rainbow;
- set the Noah story status to `completed`;
- award `rainbow_covenant`;
- display “Complete Noah's chapter”; or
- use its existing `dove_covenant` / covenant-reflection content as the final outcome.

Game 6 alone owns the next canonical beat:

6. God establishes the covenant with Noah, his descendants, and every living creature.
7. God appoints the rainbow as its sign (Genesis 9:8–17).

The optical activity is inserted between steps 5 and 6 as a clearly labeled fictional learning interlude. It does not add an event to Genesis or imply that God needed the puzzle to establish the covenant.

### Required update to the Game 5 specification

This document supersedes these parts of `CHAPTER_1_GAME_5_THE_DOVES_JOURNEY.md`:

- Section 1's content plan ends after Noah leaves the ark and worships.
- Section 12 must not award `rainbow_covenant` or complete the story.
- Section 12 no longer requires `dove_covenant`; `dove_done` becomes the handoff invitation.
- Section 13 ends after the offering and a short “the story continues” handoff.
- The Game 5 primary CTA becomes `Continue to the sunlit valley →`.
- The Game 5 definition-of-done item about showing the rainbow becomes “No rainbow is shown before Game 6.”

Do not delete old narrative keys during migration if a saved/released build may reference them. Stop calling them, then remove them only in a later cleanup.

---

## 3. Repository constraints

Do not install another rendering engine, ray-tracing library, physics engine, UI framework, state manager, animation package, or test framework.

Use:

- `phaser` `^3.90.0` for the scene, camera, pointer hit areas, graphics, particles, and tweens;
- plain JavaScript ES modules;
- Vite's existing asset pipeline;
- `node:test` and `node:assert/strict` for pure-model tests;
- existing app services from `src/main.js`: `showHUD`, `dialogue`, `openModal`, `toast`, `persist`, `router`, and `isBlocked`;
- the current 960×640 logical-world convention and `renderScale(scene)` helper;
- a pure grid tracer implemented locally in fewer than a few hundred lines.

Do not use Matter.js, Phaser Arcade Physics, a continuous-angle optics library, React, Vue, a drag-and-drop package, random puzzle generation, remote runtime assets, or CSS filters for the principal rainbow effect.

The optical model is deliberately discrete. Accuracy comes from deterministic, visible rules rather than simulated refraction angles.

---

## 4. Required files and integration points

Create:

```text
src/stories/noah/
  RainbowPrismScene.js   # Phaser scene, phases, rendering, DOM controls, narrative
  prism.js               # pure puzzle state/actions/ray tracer; no Phaser or DOM
  prismLevels.js         # immutable board data and known solutions
  prismArt.js            # generated prototype textures and rendering helpers
tests/
  prism.test.mjs         # tracer, persistence validation, and board-solution tests
```

Optional final assets:

```text
src/assets/prism/
  light-garden.webp        # 1920×1280 board surround, no baked puzzle pieces
  mirror.png               # transparent, neutral orientation
  crystal-prism.png
  mist-nozzle.png
  covenant-valley.webp     # finale landscape without baked rainbow
  covenant-rainbow.png     # large transparent layered rainbow
  noah-family.png          # optional transparent finale figures
```

Keep grid pieces, beam paths, receivers, shutters, and selection states rendered at runtime. Never bake a solved configuration into the background.

### Application integration

Update together:

1. `src/data/stories/noah.json`
   - Add `"rainbow_prism"` after `"doves_journey"` in `scenes`.
   - Add the narrative keys in section 16.
2. `src/main.js`
   - Import `RainbowPrismScene` and `clearPrismScratch`.
   - Register `noahs_ark/rainbow_prism` → `RainbowPrism`.
   - Add the scene to the Phaser scene array.
   - Clear prism scratch on new adventure, reset, and successful save import.
3. `src/stories/noah/MeetNoahScene.js`
   - Preserve the branch that starts Game 5 after `flood_complete`.
   - If `dove_complete && !prism_complete`, present `prism_invite` and launch Game 6.
   - If `prism_complete`, use `prism_done`; this branch represents chapter completion.
   - Put these branches before any generic `flood_complete` dialogue.
4. Game 5 implementation
   - Apply the handoff rules in section 2.
5. Tests
   - Add the tests in section 20 and keep every existing test green.

No `SaveManager` schema change is necessary. Durable progress uses boolean quest flags; unfinished board configuration uses separately validated scratch storage.

---

## 5. Fictional setting and art-direction guardrails

Do not call the location an “abandoned observation garden.” That wording implies an unexplained pre-flood institution surviving the flood. Use **sunlit valley** in story copy and **light garden** only as a UI/location label.

The playable space is a stylized, explicitly fictional teaching environment discovered by Aaron. It contains flat water-polished reflective plates on timber pivots, a clear mineral prism, stone channels, wooden shutters, shallow rain pools, drifting mist, and small mounting sockets that make discrete positions believable.

The device materials should feel hand-made, not modern laboratory equipment. Do not show lasers, electrical wiring, LEDs, modern glass mounts, scientific readouts, or a pre-flood ruin.

The opening fiction label must say:

> This light garden is an imagined learning activity. Genesis does not describe Aaron or these optical devices.

The science note must say, in substance:

> The puzzle simplifies light into grid paths and three gameplay channels. Real rainbows form when sunlight is refracted, internally reflected, and dispersed by water droplets.

The final reflection must distinguish scientific description from covenant meaning without framing them as competitors.

---

## 6. Pure model contract (`prism.js`)

`prism.js` must not import Phaser, access the DOM, use `localStorage`, read time, or call random functions.

Export at least:

```js
export const DIR = Object.freeze({ N: 0, E: 1, S: 2, W: 3 });
export const COLOR = Object.freeze({ RED: 1, GREEN: 2, BLUE: 4, WHITE: 7 });

export function initialPrismState(level);
export function applyPrismAction(level, state, action);
export function evaluateBoard(level, state);
export function isStageSolved(level, state, evaluation);
export function snapshotPrismState(state);
export function restorePrismState(level, value);
export function validateLevel(level);
export function enumerateSolutions(level, options = {});
export function readPrismScratch(storage);
export function writePrismScratch(storage, scratch);
export function clearPrismScratch(storage);
```

### State shape

Keep model state JSON-serializable:

```js
{
  levelId: 'stage1',
  orientations: { mirrorA: '/', mirrorB: '\\' },
  placements: { sharedMirror: 'redMount', blocker: 'greenBlockMount' },
  chargedReceivers: [],       // Stage 2 only; stable IDs
  selectedPieceId: null,
  moveMode: null,             // null or { pieceId, mountIndex }
  actionCount: 0
}
```

The scene owns the undo stack because it is session UI state. Store complete model snapshots, capped at 40. A snapshot pushed before a legal action includes orientations, placements, charged receivers, and action count. Selection/move-mode changes do not create undo entries.

### Action contract

Support exactly:

```js
{ type: 'rotate', pieceId: 'mirrorA' }
{ type: 'move', pieceId: 'sharedMirror', mountId: 'blueMount' }
{ type: 'toggle', pieceId: 'shutterA' } // only manually operable shutters
```

`applyPrismAction` returns `{ state, changed, reason }` and never mutates its arguments. Invalid actions return the original state with `changed: false` and a stable reason such as `locked`, `incompatible_mount`, `occupied`, or `unknown_piece`.

After each changed action:

1. evaluate the new configuration;
2. union newly active latching receiver IDs into `chargedReceivers` for Stage 2;
3. evaluate once more if the charged state changes;
4. increment `actionCount` once;
5. emit no scene/audio side effects from the model.

---

## 7. Grid and entity conventions

Coordinates are integer cells with `(0, 0)` at the upper-left. Beams occupy cell centers and move one cell per trace step. Directions use `N/E/S/W`; a source's direction is the direction light leaves its cell.

### Mirrors

Mirrors have two orientations:

```text
/ : N→E, E→N, S→W, W→S
\ : N→W, W→N, S→E, E→S
```

A mirror reflects from either side. Rotation toggles `/` and `\`. There are no continuous angles.

### Colors

Use bit masks internally:

```text
RED   = 001
GREEN = 010
BLUE  = 100
WHITE = 111
```

Mechanical gameplay uses only red, green, and blue groups. Rendering a white beam leaving a prism may show seven narrow decorative bands, but hit-testing and win conditions remain three-channel. UI copy must call them “three gameplay color groups,” not seven physically exact rays.

### Prism

A prism has one authored input direction. When a white beam enters from that direction, red turns left relative to travel, green continues forward, and blue turns right. A colored beam or beam entering another face is absorbed and marked `blocked: 'prism_back'`.

### Walls, blockers, shutters, and receivers

- `wall` is fixed and absorbs every beam.
- `blocker` occupies one compatible mount and absorbs every beam.
- `shutter` is either open or closed; closed absorbs and open passes through.
- Beam crossing in an empty cell is allowed; beams do not collide or mix.
- A receiver activates only when the incoming color contains its required color.
- Receivers absorb the beam after activation.
- A wrong color is visibly rejected and recorded in the evaluation.
- `latch: true` persists activation in `chargedReceivers` until reset or undo.
- `relayFor: ['shutterId']` means current activation powers those shutters.
- Mist zones are receivers with a rainbow rendering treatment.

Stage 2 receivers latch. Stage 1 and Stage 3 receivers do not.

---

## 8. Deterministic ray-tracing algorithm

`evaluateBoard` returns:

```js
{
  segments: [{ from: {x, y}, to: {x, y}, dir: 1, color: 7, termination: null }],
  activeReceivers: ['redReceiver'],
  wrongColorReceivers: [],
  openShutters: ['gateA'],
  blocked: [{ x, y, reason: 'wall', color: 7 }],
  loops: [],
  solved: false
}
```

Trace rules:

1. Enqueue one ray per enabled source.
2. Advance each ray by one cell in stable source/list order.
3. Stop at bounds, wall, blocker, closed shutter, receiver, or invalid prism face.
4. Reflect immediately at a mirror.
5. Split white into red/green/blue at a correctly entered prism.
6. Record merged adjacent steps of the same color/direction as one render segment.
7. Track `(x,y,dir,color)` per branch. Repetition terminates that branch as a loop.
8. Cap work at `width × height × 4 × 4 × sourceCount`; exceeding it is a validation error.

### Controlled-shutter fixed point

Controlled shutters are derived, never written into state.

For every evaluation:

1. Start with all controlled shutters closed.
2. Trace the board.
3. Open shutters whose controller receivers are currently active.
4. Retrace from the beginning.
5. Repeat until no additional shutter opens, at most `controlledShutterCount + 1` passes.

Only opening is allowed within one evaluation. Authored relay topology must be monotonic. `validateLevel` rejects a shutter controlling itself or a controller downstream of the shutter it opens.

The pure result is immediate. The scene may animate newly added segments over 180–260 ms and relay steps 220 ms apart. Logic must not depend on animation completion.

---

## 9. Level data schema (`prismLevels.js`)

Export frozen plain data:

```js
{
  id: 'stage1',
  title: 'Find the Light',
  grid: { cols: 9, rows: 7 },
  objective: { type: 'simultaneous', receiverIds: ['mist'] },
  sources: [{ id: 'sun', x: 0, y: 5, dir: DIR.E, color: COLOR.WHITE }],
  prisms: [],
  fixed: [{ type: 'wall', x: 4, y: 3 }],
  mounts: [],
  pieces: [
    { id: 'mirrorA', type: 'mirror', fixedAt: {x: 2, y: 5},
      orientations: ['/', '\\'], initialOrientation: '\\' }
  ],
  receivers: [
    { id: 'mist', type: 'mist', x: 8, y: 1, color: COLOR.WHITE, latch: false }
  ],
  knownSolutions: [{ orientations: { mirrorA: '/', mirrorB: '/' }, placements: {} }],
  hints: []
}
```

All arrays/nested objects should be frozen in development or treated as immutable. `validateLevel` verifies IDs, coordinates, mount compatibility, initial occupancy, prism directions, relay references, known solutions, and objective receiver references.

---

## 10. Stage 1 — Find the Light

- **Grid:** 9 × 7
- **Expected time:** 1–2 minutes
- **Objective:** Illuminate one mist zone with white light.
- **New rules:** rotate a mirror; beams stop at stone; two reflections can go around an obstacle.

### Exact layout

```text
    0 1 2 3 4 5 6 7 8
0   . . . . # . . . .
1   . . B . . . . . T
2   . . . . # . . . .
3   . . . . # . . . .
4   . . . . # . . . .
5   S . A . # . . . .
6   . . . . # . . . .

S = white source facing east
A = mirrorA at (2,5)
B = mirrorB at (2,1)
# = stone wall
T = white mist receiver
```

Wall cells are `(4,0)`, `(4,2)`, `(4,3)`, `(4,4)`, `(4,5)`, `(4,6)`. The opening at `(4,1)` is the only route across.

Initial: `mirrorA = '\'`, `mirrorB = '\'`.
Known solution: `mirrorA = '/'`, `mirrorB = '/'`.

Solution path:

```text
(0,5) east → mirrorA → north → mirrorB → east → mist (8,1)
```

There are no movable pieces, shutters, or prism.

### Tutorial behavior

- On first entry, select `mirrorA` and label it “Mirror A · turns light at a right angle.”
- The first interaction prompt is `Rotate mirror`, not a paragraph.
- After the first ineffective rotation, show “Follow the bright line. Where does it stop?”
- Once light reaches `mirrorB`, softly outline it; do not auto-select or rotate it.
- On solve, animate a small 2.2-second mist arc and enable `Continue`.

Hints:

1. “The wall has one opening near the top.”
2. “Mirror A must send the beam upward before it reaches the wall.”
3. “Turn Mirror A so the beam travels toward Mirror B.”

---

## 11. Stage 2 — Three Color Groups

- **Grid:** 13 × 9
- **Expected time:** 2–3 minutes
- **Objective:** Charge red, green, and blue receivers. Charged receivers stay lit.
- **New rules:** prism splitting, color receivers, movable mirror/blocker, order dependency.

### Exact layout

```text
    0 1 2 3 4 5 6 7 8 9 10 11 12
0   . . . . . . . . . .  .  .  .
1   . . r . . . . . . .  R  .  .
2   . . . . . . . . . .  .  .  .
3   . . . . . . . . . .  .  .  .
4   S . P . . . . g . .  .  G  .
5   . . . . . . . . . .  .  .  .
6   . . . . . . . . . .  .  .  .
7   . . u . . . . b . .  B  .  .
8   . . . . . . . . . .  .  .  .

S = source facing east; P = prism at (2,4), input west
r/u = red/blue mirror mounts at (2,1)/(2,7)
g/b = green/blue blocker mounts at (7,4)/(7,7)
R/G/B = latching receivers
```

One `sharedMirror` is compatible with `redMount` and `blueMount`. One `channelBlocker` is compatible with `greenBlockMount` and `blueBlockMount`.

Initial state:

```js
placements: {
  sharedMirror: 'redMount',
  channelBlocker: 'greenBlockMount'
},
orientations: { sharedMirror: '\\' },
chargedReceivers: []
```

Receivers are red `(10,1)`, green `(11,4)`, and blue `(10,7)`, each requiring its color and using `latch: true`.

One intended sequence:

1. Rotate the mirror at `redMount` to `/`; charge red.
2. Move the blocker to `blueBlockMount`; charge green.
3. Move the blocker back to `greenBlockMount`; green remains charged.
4. Move the mirror to `blueMount`, rotate to `\`; charge blue.

The reverse red/green ordering is legal. Blue cannot charge while the blocker occupies `blueBlockMount`; green cannot charge while it occupies `greenBlockMount`.

Selecting a movable piece highlights compatible mounts. Moving preserves mirror orientation. Charged receivers use a stable colored center plus distinct check/glyph, not color alone.

Hints:

1. “The mirror can serve the red path or blue path, but not both at once.”
2. “A charged receiver stays charged. You can reuse the shared mirror.”
3. “Charge red before moving the shared mirror to the lower mount.”

---

## 12. Stage 3 — The Rainbow Bridge

- **Grid:** 15 × 11
- **Expected time:** 3–5 minutes
- **Objective:** Keep all three mist zones illuminated simultaneously.
- **New rules:** second source, non-latching relays, two controlled shutters, constrained mounting.

### Exact layout

```text
    0 1 2 3 4 5 6 7 8 9 10 11 12 13 14
0   . . . . . . . S . .  .  .  .  .  .
1   . . . . . . . c . .  .  .  C  .  .
2   . . . r . . . . . .  .  .  .  R  .
3   . . . . . . . . . .  .  .  .  .  .
4   . . . . . . . . . .  .  .  .  .  .
5   S . . P . . . . 1 .  .  .  .  G  .
6   . . . . . . . . . .  .  .  .  .  .
7   . . . . . . . . . .  .  .  .  .  .
8   . . . b . . . . 2 .  .  .  .  B  .
9   . . . . . . . . . .  d  .  .  .  .
10  . . . . . . . . . .  .  d  .  .  .

left S = spectrum source (0,5), east
top S = relay source (7,0), south
P = prism (3,5), input west
c = control mirror mount (7,1)
C = control receiver (12,1), opens shutter 1
r/b = red/blue mirror mounts (3,2)/(3,8)
1/2 = controlled shutters (8,5)/(8,8)
R/G/B = non-latching mist receivers
d = decoy mounts
```

Pieces:

- `controlMirror`, compatible only with `controlMount` and `controlDecoyMount (11,10)`;
- `spectrumMirrorA` and `spectrumMirrorB`, each compatible with `redMount`, `blueMount`, and `decoyMount (10,9)`.

Initial:

```js
placements: {
  controlMirror: 'controlDecoyMount',
  spectrumMirrorA: 'redMount',
  spectrumMirrorB: 'decoyMount'
},
orientations: {
  controlMirror: '/',
  spectrumMirrorA: '\\',
  spectrumMirrorB: '/'
}
```

Relay chain:

- `controlReceiver` requires white and has `relayFor: ['shutterOne']`.
- Green mist `(13,5)` requires green and has `relayFor: ['shutterTwo']`.
- Red `(13,2)` and blue `(13,8)` mist have no relay outputs.
- No Stage 3 receiver latches.

Known final solution:

```js
placements: {
  controlMirror: 'controlMount',
  spectrumMirrorA: 'redMount',
  spectrumMirrorB: 'blueMount'
},
orientations: {
  controlMirror: '\\',
  spectrumMirrorA: '/',
  spectrumMirrorB: '\\'
}
```

Final evaluation:

1. Top source turns east at `controlMirror` and powers `controlReceiver`.
2. `shutterOne` opens.
3. Green passes through to green mist.
4. Green mist powers `shutterTwo`.
5. Blue passes through to blue mist.
6. Red is already routed to red mist.
7. All three are active simultaneously; the stage solves.

If control power is removed, shutter one closes on the next evaluation. If green loses light, shutter two closes. `chargedReceivers` must remain empty in this stage.

On the final action, lock piece input for about 2.5 seconds and animate the relay chain in order. End with three small local arcs over water and `Return to Noah`. Do not fill the sky or use covenant art here.

Hints:

1. “The upper white receiver controls the first shutter.”
2. “The green mist must stay lit to hold the lower shutter open.”
3. “Place the control mirror under the upper source and turn its beam east.”

---

## 13. Scene state machine (`RainbowPrismScene.js`)

Use one scene for all three stages:

```text
opening_briefing
  → board_intro
  → playing
  → relay_animation
  → stage_solved
  → board_intro (next stage)
  → science_note
  → covenant_transition
  → covenant_reveal
  → reflection
  → chapter_complete
  → return_to_meadow
```

All input is gated by phase plus `app.isBlocked()`.

`init({ story, replayStage = null })`

- Read flags and validated scratch.
- Replay loads that stage without changing rewards.
- Otherwise start the first unfinished stage.
- If complete, default to replay selection instead of replaying the finale.

`create()`

- Build background, board, grid, pieces, beam graphics, selection, mist, and DOM toolbar.
- Register pointer/keyboard controls, resize, and shutdown cleanup.
- Enter the appropriate phase.

`update()`

- Do not ray-trace per frame.
- Animate only existing beam flow offsets, mist, selection, and solve effects.
- Never regenerate board Graphics/text/hit areas every frame.

`shutdown()`

- Remove DOM controls/live regions and every registered listener.
- Stop/destroy repeating tweens, particles, timers, and owned generated textures.
- Clear pending hint/solve callbacks.

Actions compute the complete evaluation synchronously, then render it. Tween progress is never source of truth.

---

## 14. Input and accessibility

### Pointer/touch

- Tap a piece to select.
- Tap the selected mirror again or use `Rotate`.
- Tap `Move`, then a highlighted compatible mount.
- Tapping an empty board cell exits move mode but keeps selection.
- Dragging is optional sugar; all movement must work with taps.
- Fit the whole board; no pan/zoom.
- Canvas hit areas are at least 52×52 logical pixels; DOM targets at least 44 CSS pixels.

### Keyboard

- `[` / `]`: previous/next interactive piece.
- `R` or Space: rotate the selected mirror.
- `M`: enter/exit move mode.
- Arrow keys in move mode: move the highlighted mount to a compatible mount in that direction.
- Enter: place at the highlighted mount.
- `U`: undo.
- `X`: reset confirmation.
- `H`: next hint.
- `T`: toggle direction markers on current paths.
- Escape: cancel move mode first, then existing menu behavior.

### DOM toolbar

Use real buttons:

```text
Previous | Piece selector | Next | Rotate | Move | Undo | Reset | Hint | Trace paths
```

Hide Move for fixed pieces and disable impossible actions. On narrow phones, let the toolbar wrap while preserving the button order and minimum touch-target height.

### Accessible state

- Use `aria-live="polite"` for selection/outcomes.
- Example: “Shared mirror selected. Red mount. Orientation slash. Two compatible mounts.”
- Receivers use color plus glyph: red triangle, green circle, blue square, white star.
- Trace Paths repeats arrowheads along beams.
- Wrong-color contact uses shape shake/outline, not red-only feedback.
- Full completion must work with keyboard and without distinguishing hues.

Reduced Motion preserves shutter state and direction arrows but replaces flowing dashes, pulses, drifting mist, and camera movement with crossfades.

---

## 15. Layout, rendering, and art

- Logical viewport remains 960×640.
- Reserve about 74 logical px for top HUD and 70 for controls.
- Center the grid and calculate `cellSize = floor(min(availableWidth/cols, availableHeight/rows))`, clamped to 42–68.
- Board backing is one irregular stone/water plane, not boxed tiles.
- Show alignment marks only at mounts/intersections needed for readability.

Layer order:

```text
-20 valley painting / pools
-10 board stone and water channels
  0 fixed walls and mounts
  5 inactive devices
  8 blocked-beam termination marker
 10 active beams
 12 mirrors, prism, blocker, shutters
 16 receivers and mist
 20 selection and mount overlay
 30 solve effects
 40 transition veil
```

Beam treatment:

- White: warm ivory core with pale-gold halo.
- Color groups: saturated core with restrained translucent halo.
- Crossing beams remain readable; no interaction.
- Mirrors show a bright contact point.
- Blocked paths end with a perpendicular cap and two fading motes.
- Wrong color visibly stops at the receiver rim.
- Trace Paths only annotates current paths; it never previews inactive routes.

Use Phaser Graphics and small additive sprites, not a full-screen bloom pipeline.

Phase A uses procedural art. Final art may replace backdrop/devices while geometry stays data-driven. Use WebP for opaque paintings and PNG for alpha sprites; keep the upper-left calm for HUD text.

Motion targets:

- mirror rotation 120–160 ms;
- piece move 180–240 ms;
- shutter opening 200–260 ms;
- beam redraw 160–240 ms;
- mist drift 5–7 seconds;
- finale rainbow 1.6–2.2 seconds.

Track/stop every repeating tween before board rebuild and shutdown.

---

## 16. Narrative keys and responsibilities

Add to `noah.json`:

```text
prism_invite
prism_opening
prism_stage1_intro
prism_stage1_done
prism_stage2_intro
prism_stage2_done
prism_stage3_intro
prism_stage3_done
prism_science_note
prism_return_to_noah
prism_covenant
prism_reflection
prism_done
```

Major theological/story copy belongs in JSON. Utility copy may live in the scene.

- `prism_invite`: Noah has left the ark and worshiped; invite Aaron to explore; label the activity imagined.
- `prism_opening`: explain that the light garden explores colors and cannot create God's covenant sign.
- `prism_science_note`: explain grid/RGB simplification plus refraction, internal reflection, and dispersion in 80–120 words; skippable/revisitable.
- `prism_return_to_noah`: leave the fictional activity and return to the post-flood landscape.
- `prism_covenant`: accurately summarize Genesis 9:8–17; God initiates the covenant and appoints the rainbow. Do not invent quotations from God.
- `prism_reflection`: title `A Promise That Endures`, required truths below, local-flood clarification, optional question.
- `prism_done`: offer replay/reflection revisit after completion without duplicate rewards.

---

## 17. Finale, reflection, flags, and rewards

### Covenant reveal

After Stage 3 and the science note:

1. Fade the puzzle out completely.
2. Show a renewed landscape with ark, Noah, family, and animals.
3. Establish that Noah already left the ark and worshiped.
4. Summarize God's covenant from Genesis 9:8–17.
5. Reveal the great rainbow across the full valley.
6. Hold at least 2.5 seconds before completion UI.
7. Unlock journal entry, badge, and `Noah's Ark Complete`.

The finale rainbow spans at least 70% of screen width, uses soft atmospheric bands, has no mechanical source/grid/receiver, and is introduced by narration about God's covenant—never “You made a rainbow.”

### Reflection

Title: **A Promise That Endures**

Reference: **Genesis 9:8–17**

Required truths:

- God initiates the covenant with Noah, descendants, and every living creature.
- God is faithful to his word.
- The rainbow is God's appointed sign that never again will a flood destroy all flesh; this does not mean local floods never occur.

Question:

> Why is it important that the promise comes from God rather than from something Noah accomplished?

Science connection:

> Science describes how sunlight and water droplets can produce a rainbow. Genesis gives the rainbow covenant meaning as the sign God appoints.

Primary CTA: `Complete Noah's chapter →`

Secondary: `Replay a light puzzle`

Tertiary: `Read the reflection again`

### Flags and rewards

```text
prism_stage1_done
prism_stage2_done
prism_stage3_done
prism_complete
```

Persist after each stage. On final reflection acknowledgment:

- set `prism_complete = true`;
- add `rainbow_prism` to `completedScenes` once;
- add `rainbow_covenant` to `save.badges` once;
- add `rainbow_prism_illustration` to `save.mementos` once;
- set Noah story `status = 'completed'`;
- clear prism scratch;
- call `app.persist()` after the complete mutation.

Game 5 keeps `doves_journey_illustration`; Game 6 owns `rainbow_covenant`. Replay never changes flags, rewards, or story status.

---

## 18. Scratch persistence

Use separate local storage because quest flags remain booleans:

```text
aaron-bible-adventure:rainbow-prism:v1
```

Shape:

```js
{
  version: 1,
  stageId: 'stage2',
  state: {
    levelId: 'stage2',
    orientations: { sharedMirror: '/' },
    placements: {
      sharedMirror: 'redMount',
      channelBlocker: 'blueBlockMount'
    },
    chargedReceivers: ['redReceiver', 'greenReceiver'],
    selectedPieceId: null,
    moveMode: null,
    actionCount: 6
  }
}
```

Validate exact version/stage, matching level, known IDs, allowed orientations, compatible/distinct in-bounds mounts, valid latching receiver IDs, safe nonnegative action count, and JSON under 20 KB. Discard selection/move mode on restore. Missing/malformed/stale/impossible data loads the first unfinished stage's initial state; never partially trust it.

Write after every changed action and stage transition. Catch storage errors and continue; warn at most once per session.

Clear scratch on new adventure, reset all progress, successful save import, final completion, and explicit `Reset all light puzzles`. Undo history is session-only.

---

## 19. Undo, reset, hints, and replay

- Undo restores orientation, placement, and Stage 2 charges; cap at 40 snapshots.
- New stages clear undo. Disable undo once solved transition begins.
- Reset confirms, affects only current stage, preserves completed stage flags, and restores authored initial state.
- Hints advance Observation → Reasoning → Next move, session-only, and never perform actions.
- Replays always start from authored initial state, not scratch.

After completion, offer:

- `Find the Light`;
- `Three Color Groups`;
- `The Rainbow Bridge`;
- `Revisit covenant finale`;
- `Return to meadow`.

---

## 20. Automated verification (`tests/prism.test.mjs`)

Tests exercise pure model/data, never Phaser rendering.

Minimum tests:

1. Both mirror reflection tables are correct for all incoming directions.
2. Correct white prism input produces red-left, green-forward, blue-right.
3. Colored/reverse-face prism input terminates safely.
4. Wall, blocker, and closed shutter terminate at the correct cell.
5. Open shutter passes the beam.
6. Correct receiver activates; wrong color does not.
7. Beam crossings neither mix nor block.
8. Mirror loops terminate through visited-state detection.
9. Controlled shutters reach a stable fixed point.
10. Removing relay power closes derived shutters next evaluation.
11. Actions are immutable and reject illegal mounts/occupancy.
12. Undo snapshots restore orientation, placement, and charges.
13. Stage 2 latching persists after its beam moves away.
14. Stage 3 ignores latching and requires simultaneity.
15. Scratch round-trips valid state.
16. Scratch rejects unknown IDs, duplicate occupancy, incompatible mounts, bad orientations, impossible charges, oversized input, and wrong versions.
17. Every level passes `validateLevel`.
18. Every known solution solves.
19. Every authored initial state is unsolved.

### Anti-triviality checks

- Stage 1: enumerate all four orientation combinations and assert exactly one solves.
- Stage 2: breadth-first search legal actions; solution exists within 8 changed actions; blue/green blockers work; all colors required.
- Stage 3: enumerate legal placements/orientations; no solution without control power or persistent green power; all three mists active simultaneously; known solution opens both shutters.

If enumeration finds an easier unintended solution, fix board data instead of weakening tests.

---

## 21. Performance and responsive budgets

- Re-evaluate rays only after action/reset/undo/restore/stage load.
- Fewer than 300 merged beam segments per board.
- Mist particles below 70 desktop / 35 mobile; at most two emitters.
- No per-frame Graphics/text/array recreation.
- DOM labels update only on meaningful state changes.
- Opaque backgrounds under about 1.3 MB each.
- Test 390×844, 844×390, 768×1024, and 1440×900.
- Resize redraws from model state without restarting.
- Hidden tabs cancel pointer/move mode and pause decoration.
- Reduce glow/particles before reducing beam clarity.

The entire board fits without panning. In portrait, reduce cell size and collapse toolbar; never crop the board.

---

## 22. Implementation sequence

### Phase A — pure model and Stage 1

1. Add model, level data, and tests.
2. Implement directions, mirrors, blockers, receivers, loop protection, actions, validation.
3. Add Stage 1 and exhaustive test.
4. Build procedural scene with selection, rotation, Undo, Reset, hints.
5. Verify keyboard/touch completion.

### Phase B — Stage 2 and persistence

1. Add prism colors, mounts, movement, and latching.
2. Add Stage 2 and breadth-first viability checks.
3. Implement mount highlighting/move mode.
4. Add validated scratch and all clear paths.
5. Verify reload preserves charges/placements.

### Phase C — Stage 3 relays

1. Add controlled-shutter fixed point.
2. Add Stage 3 and simultaneous enumeration.
3. Animate evaluation differences.
4. Verify loss of relay power closes downstream paths.

### Phase D — progression and Game 5 ending

1. Pull/inspect completed Game 5 before editing.
2. Move/remove its covenant reveal and final completion mutation per section 2.
3. Add Game 6 route, manifest, Noah branches, narrative, flags, rewards.
4. Test reload at every boundary.
5. Old saves with `dove_complete` but no prism flags begin Game 6.
6. Preserve already-completed saves/rewards; never revoke them.

### Phase E — finale presentation

1. Replace prototype art as needed.
2. Add mist/beam/device polish and Reduced Motion.
3. Build distinct covenant landscape/rainbow.
4. Add reflection, replay, memento, completion.
5. Profile cleanup/mobile memory.

### Phase F — verification

```sh
node --test
node node_modules/vite/bin/vite.js build
git diff --check
```

Manually test keyboard-only, touch portrait/landscape, Reduced Motion, reload mid-Stage 2/3, malformed scratch, new/reset/import clears, replay rewards, and return/resume after completion.

---

## 23. Definition of done

- [ ] Game 6 is reachable only after `dove_complete` normally.
- [ ] Game 5 stops after Noah leaves the ark and worships.
- [ ] Game 5 no longer reveals covenant, completes story, or awards rainbow badge.
- [ ] All boards match topology and have tested solutions.
- [ ] Stage 1 teaches two-reflection routing without auto-solving.
- [ ] Stage 2 requires color planning, latching, and shared-piece reuse.
- [ ] Stage 3 requires simultaneous light and both live relay dependencies.
- [ ] Evaluation is deterministic, immediate, loop-safe, animation-independent.
- [ ] Undo/reset/hints/Trace Paths work.
- [ ] Keyboard/touch complete every stage without precision drag.
- [ ] Color is never the only indicator.
- [ ] Validated scratch survives reload and clears on required paths.
- [ ] Puzzle arcs cannot be mistaken for God's covenant rainbow.
- [ ] Genesis 8–9 order and reflection are accurate.
- [ ] Final rewards/story completion occur once, in Game 6 only.
- [ ] Replay never duplicates or revokes rewards.
- [ ] Tests/build/diff check pass.
- [ ] Repeated entry/exit leaves no orphan DOM, listeners, timers, particles, or tweens.

---

## 24. Historical handoff

**Historical note — superseded.** This section records the state of the repository when the initial Game 6 specification was drafted. It is not a current implementation checklist.

At that time:

- Game 6 existed only as a 146-line high-level draft.
- The local checkout was at commit `581b0fc` and contained no Game 5 implementation files.
- The user confirmed Game 5 is implemented elsewhere and authorized changing its ending.
- A remote fetch was attempted, but the execution approval service rejected it because its usage limit was reached. No fetch, pull, Game 5 code edit, commit, or push occurred.

Game 5 and Game 6 have since been integrated in the current repository. Do not use the old synchronization instructions above as current work.

The final product decision is: **Game 5 ends after Noah's offering; Game 6 owns the covenant rainbow and Chapter 1 completion.**
