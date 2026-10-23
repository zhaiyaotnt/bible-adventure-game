# Chapter 1, Game 5 — The Dove's Journey

## Implementation specification and session handoff

**Status:** Approved direction; not implemented  
**Owner:** Next implementation agent  
**Runtime:** Phaser 3.90, JavaScript ES modules, Vite 6, browser DOM, Node's built-in test runner  
**Target:** Desktop and mobile browsers  
**Expected play time:** 8–12 minutes across three flights  
**Biblical source:** Genesis 8:1, 8:8–12, 8:15–22, 9:8–17

This file supersedes the earlier high-level draft. It is intentionally specific enough that another agent can implement the game without inventing architecture, controls, save semantics, level rules, or biblical sequencing.

---

## 1. Product decision

The player controls the dove in real time. The ark is the visible launch/return anchor and should rock and drift subtly with the water, but the player does **not** steer the ark. Genesis describes the waters bearing the ark; it does not describe Noah piloting it.

The game is about route planning under wind and stamina constraints:

> Preview the wind, choose a route, fly responsively, read the changing air, and preserve enough stamina for the correct story outcome.

The game must not become a marker-following exercise or a collectible course. Every flight needs at least two understandable routes with different tradeoffs.

### Visual thesis

A painterly aerial landscape gradually emerges from slate-blue floodwater; the dove is a crisp warm-white focal point, wind is shown as restrained translucent ribbons, and land—not interface chrome—communicates progression.

### Content plan

Each flight uses the same four-beat structure:

1. One short Noah story line and a wind-map preview.
2. Full-canvas flight with a compact stamina/wind HUD.
3. Immediate story-specific outcome: return, leaf return, or landing.
4. A brief seven-day transition before the next flight.

After Flight 3, show the later sequence through Noah's offering: Noah waits for God's command, leaves the ark, and worships (Genesis 8:12–22). Game 5 then hands off to the fictional light garden. Game 6 alone presents God's covenant and its sign.

### Interaction thesis

- Land movement feels smooth and deliberate through light inertia, not twitchy simulation.
- Wind is always visible before it materially affects the dove.
- The only strong HUD motion is a restrained stamina pulse below 25%; decorative motion must respect Reduced Motion.

---

## 2. Repository constraints the implementation must follow

The current project already provides the needed stack. Do **not** install another game engine, physics library, joystick package, state manager, animation framework, or test framework.

Use:

- `phaser` `^3.90.0` for the scene, camera, input, particles, tweens, geometry, and rendering.
- Plain JavaScript ES modules.
- Vite's existing asset imports for PNG/WebP/JPG files.
- `node:test` and `node:assert/strict` for pure-model tests.
- Existing app services from `src/main.js`: `showHUD`, `dialogue`, `openModal`, `toast`, `persist`, `router`, and `isBlocked`.
- The existing 960×640 logical world convention and `renderScale(scene)` supersampling helper.

Do not use:

- Matter.js or Phaser Arcade Physics. A small deterministic vector integrator is easier to test and tune.
- React, Vue, Framer Motion, or a DOM component library.
- A virtual joystick dependency. Direct drag steering is consistent with the rest of this project and avoids extra screen chrome.
- Random wind generation. Authored, deterministic wind fields are essential for fairness and route tests.

### Existing integration points

The next agent must update all of these together:

1. `src/data/stories/noah.json`
   - Add `"doves_journey"` after `"rising_flood"` in `scenes`.
   - Add the narrative keys specified in section 12.
2. `src/main.js`
   - Import `DoveJourneyScene`.
   - Register route `noahs_ark/doves_journey` → `DoveJourney`.
   - Add the scene class to the Phaser scene array.
3. `src/stories/noah/MeetNoahScene.js`
   - When `f.flood_complete && !f.dove_complete`, Noah starts the dove game.
   - When `f.dove_complete`, use the final chapter-complete dialogue.
   - Do not leave the current `flood_done` branch ahead of the new branch or Game 5 will be unreachable.
4. `src/core/SaveManager.js`
   - No schema change is required if progress remains boolean quest flags plus existing arrays.
5. Tests
   - Add the model tests in section 15 and keep all existing tests green.

---

## 3. Required file/module layout

Create the following files:

```text
src/stories/noah/
  DoveJourneyScene.js     # Phaser scene, UI, scene state machine, narrative flow
  dove.js                 # pure deterministic movement/stamina/wind model; no Phaser import
  doveLevels.js           # immutable authored level definitions
  doveArt.js              # procedural prototype art and sprite/background helpers
tests/
  dove.test.mjs           # physics, objective, and route-viability tests
```

Optional art files, when replacing prototype shapes:

```text
src/assets/dove/
  dove-flight.png         # transparent sprite sheet, 8 frames
  dove-carrying-leaf.png  # transparent sprite sheet, 8 frames
  ark-aerial.webp         # transparent or tightly cropped ark
  flood-flight-1.webp     # 1920×1080 or tiled equivalent
  flood-flight-2.webp
  flood-flight-3.webp
  olive-tree.webp
  renewed-land.webp
```

Do not block the prototype on finished art. Phase A must use Phaser Graphics and generated textures so movement can be validated first.

---

## 4. Pure model contract (`dove.js`)

`dove.js` must not import Phaser or touch the DOM/localStorage. Export at least:

```js
export const FLIGHT_DT = 1 / 60;
export function initialFlightState(level);
export function sampleWind(level, x, y, elapsed);
export function stepFlight(level, state, input, dt = FLIGHT_DT);
export function staminaCost(level, state, input, wind, dt);
export function objectiveStatus(level, state);
export function flightFailure(level, state);
export function simulateRoute(level, route, options = {});
```

### State shape

Keep the model JSON-serializable even though mid-flight persistence is not required:

```js
{
  x, y,                 // world position in logical pixels
  vx, vy,               // velocity in pixels/second
  facing,               // radians, for rendering only
  stamina,              // 0..100
  elapsed,              // seconds
  boost,                // boolean from the last step
  carryingLeaf,         // Flight 2 only
  explored: [],         // stable landmark IDs already visited
  destinationReached,   // Flight 3 only
  returnedToArk,        // Flights 1 and 2
  failure: null         // null | 'exhausted' | 'out_of_bounds'
}
```

Never put Phaser vectors, Maps, Sets, game objects, timers, or callbacks in this state.

### Input shape

```js
{
  steerX, steerY,       // each -1..1; normalize diagonals
  boost                 // boolean
}
```

### Fixed-step update

The scene should accumulate real frame time and call `stepFlight` in fixed `1/60` second increments. Clamp a single rendered frame to 50 ms and run at most four catch-up steps. This prevents a backgrounded tab from consuming all stamina on resume.

Recommended starting equations, to be tuned through tests and play:

```text
steer acceleration = 255 px/s²
linear drag         = 2.35 /s
normal max speed    = 175 px/s
boost max speed     = 225 px/s
wind velocity       = authored zone vector in px/s
air velocity        = air velocity + steerAcceleration × dt
air damping         = air velocity × exp(-drag × dt), then clamp to max speed
ground velocity     = air velocity + wind velocity
position            = position + ground velocity × dt
```

Clamp the dove's own airspeed before adding the local wind effect. A strong tailwind should visibly increase ground speed; a headwind should slow progress without reversing a player who is steering correctly on the tutorial route.

### Stamina

Start every flight at 100.

Recommended cost per second:

```text
base flight cost        1.15
boost surcharge         3.75
headwind surcharge      max(0, -dot(normalizedVelocity, normalizedWind))
                        × windStrengthNormalized × 2.4
idle/hover surcharge    0.45 when input magnitude < 0.15
updraft recovery        1.8 to 2.5, authored per zone
```

Clamp to 0..100. An updraft can slow or reverse stamina loss but should never refill more than 18 points during one pass.

Do not show decimal stamina values in the HUD.

### Bounds and collision

- Treat the world as an authored rectangle with a 40 px soft warning margin.
- Crossing the actual boundary fails the flight as `out_of_bounds`.
- Islands and trees are not hard walls. The dove flies above them.
- Only the ark return zone, olive-tree interaction zone, exploration zones, destination landing zone, and updrafts require geometry checks.
- Use circles or axis-aligned rectangles in data; do not introduce polygon collision until a real level demands it.

---

## 5. Scene state machine (`DoveJourneyScene.js`)

Use one Phaser scene with explicit phases. Do not create three nearly duplicated scene classes.

```text
briefing
  → wind_preview
  → flying
  → flight_outcome
  → seven_day_transition (after Flights 1 and 2)
  → briefing (next flight)
  → final_transition (after Flight 3)
  → reflection
  → return_to_meadow
```

All input and timers must be gated by the phase plus `app.isBlocked()`.

### Scene lifecycle

`init({ story, replayFlight = null })`

- Read quest flags.
- If replaying, use `replayFlight` 0..2 without changing already-earned rewards.
- Otherwise start the first unfinished flight.

`create()`

- Generate/load art.
- Create the world layers, dove, camera, wind renderer, HUD DOM, and keyboard input.
- Register resize and shutdown cleanup.
- Enter `briefing`.

`update(time, delta)`

- Return immediately unless phase is `flying` and the app is unblocked.
- Convert keyboard/pointer state to normalized model input.
- Advance the fixed-step model.
- Synchronize sprite/camera/HUD.
- Evaluate failure and objective transitions once per rendered frame.

`shutdown`

- Remove DOM controls.
- Remove scale listeners and key listeners.
- Stop looping tweens/particles/timers.
- Clear pointer state.

Follow the explicit cleanup pattern now used by `FloodScene`; do not leave repeating tweens attached to destroyed targets.

---

## 6. Input specification

### Desktop

- WASD or arrow keys: continuous directional steering.
- Space: boost while held.
- `M`: open/close the wind preview only while not in a critical outcome transition.
- Escape: existing app dismissal/menu behavior.

Normalize diagonal steering so it is not faster.

### Touch/pointer

Use direct drag steering on the canvas:

1. Pointer down stores a steering origin.
2. Pointer movement creates a vector from origin to current pointer.
3. Full input magnitude occurs at 72 CSS pixels; clamp beyond that.
4. Pointer up/cancel/lost capture eases steering to zero over 120 ms rather than snapping.
5. A second pointer is ignored; do not implement pinch zoom during flights.

Add one DOM boost button at the lower-right, 72–84 CSS pixels depending on viewport. It must use pointer capture so boost always releases on pointer-up/cancel.

Do not render a permanent joystick base. While dragging, show only a faint origin ring and direction line on the canvas. Hide them under Reduced Motion if their animation is distracting.

### Accessibility fallback

- The game must be fully completable with keyboard only.
- Wind preview, restart, and continue controls must be real DOM buttons with focus styles.
- `aria-live` outcome text should be concise: “Olive leaf found. Return to the ark.”
- Never encode wind direction only by color; arrows and particle motion must convey it.

---

## 7. Camera and world rendering

- Logical viewport remains 960×640.
- Each level world is larger than the viewport; camera follows the dove with lerp around `0.08`.
- Compute fit zoom from `scale.parentSize` using the same aspect-ratio method as `ExploreScene`/`FloodScene`, multiplied by `renderScale(this)`.
- Register `scale.on('resize', fitCamera)` and remove it at shutdown.
- Clamp the camera inside the level bounds with 100 px padding.

### Layer order

```text
0   background water/land painting
2   distant foam/current texture
4   authored wind ribbons
6   landmarks and ark
8   local wind particles
10  dove shadow
11  dove
20  objective glows/landing indicator
40  weather tint or transition veil
```

The HUD stays in the DOM, not inside the canvas.

### Art requirements

- Non-pixel-art rendering; preserve current supersampling and antialiasing.
- Prototype dove: generated 96×72 transparent texture, rendered around 46×34 logical pixels.
- Final dove sheet: 8 frames in one horizontal row, each frame 192×144 source pixels for crisp retina downscaling.
- Use WebP for opaque full-scene paintings and PNG for alpha sprites.
- Keep each large background under roughly 1.2 MB compressed; the current bundle already contains several 1 MB meadow images.
- Do not create a separate full-size painting for every wind variation. Wind is a runtime overlay.

### Required motion

- Dove wing cycle varies subtly with speed; no faster than 8–10 fps.
- Wind ribbons translate along authored curves and fade at their boundaries.
- The ark rocks 1.2–1.8 degrees and drifts 4–7 px on a 4–6 second loop. This is the approved use of the “moving boat” idea.
- Reduced Motion: no rocking, no pulsing, half as many wind particles, static direction arrows remain.

---

## 8. Wind-field data model

Define levels as immutable plain objects in `doveLevels.js`.

```js
{
  id: 'flight1',
  title: 'No Place to Rest',
  world: { width: 1600, height: 900 },
  start: { x: 250, y: 450 },
  arkZone: { type: 'circle', x: 220, y: 450, r: 82 },
  startFacing: 0,
  windZones: [
    {
      id: 'west-tailwind',
      shape: { type: 'rect', x: 300, y: 220, w: 520, h: 250 },
      wind: { x: 42, y: 4 },
      feather: 90,
      visual: { color: 0xb9d9e8, arrows: 5 }
    }
  ],
  updrafts: [],
  landmarks: [],
  objective: { ... },
  tuning: { ... }
}
```

`sampleWind` must blend overlapping zones using feathered edge weights; do not snap from full wind to zero at a rectangle boundary. For a rectangle, weight should rise smoothly across `feather` pixels. Clamp total wind magnitude to the level's `maxWind`.

Timed wind changes must be deterministic data:

```js
changes: [
  { afterSeconds: 18, zoneId: 'north-crosswind', wind: { x: -20, y: 46 }, transition: 3 }
]
```

Interpolate over the declared transition. Always show a visible ribbon-direction change before the full force is reached.

---

## 9. Authored level specifications

Coordinates below are starting values, not optional prose. Preserve the topology even if art moves landmarks slightly.

### Flight 1 — No Place to Rest

**World:** 1600×900  
**Ark:** (220, 450)  
**Goal:** inspect two of three evidence regions, then return to the ark with at least 1 stamina.  
**Failure:** stamina 0 or world exit.  
**Expected duration:** 2–3 minutes.

Evidence regions:

- `floating-branches`: (690, 275), radius 95.
- `submerged-ridge`: (980, 500), radius 110.
- `distant-water`: (670, 690), radius 95.

Once two are inspected, show: “No dry resting place. Return to the ark.”

Routes:

1. **Northern tailwind:** fast outbound path through `(450,330) → (760,285) → (980,500)`, but the return is a headwind. The player must turn back promptly.
2. **Southern loop:** slower outbound through `(470,610) → (700,690)` with a clockwise current that helps the return.

The visually tempting far-east glint around `(1320,300)` is reachable but leaves too little stamina for a direct return. It must not be required. Use it to teach restraint, not to trick the player without warning: the wind-map preview should show the return headwind.

Tutorial sequence:

- First 5 seconds: steering only; boost disabled.
- At 5 seconds: explain visible wind ribbons in one toast.
- When stamina first drops below 75: explain return planning.
- After the first evidence region: enable boost and explain its cost.

Do not automatically turn the dove around. The player must choose to return.

### Flight 2 — The Olive Leaf

**World:** 1900×1050  
**Ark:** (220, 560)  
**Olive tree:** (1540, 445), interaction radius 90.  
**Goal:** reach the correct olive tree, collect one leaf automatically within its radius, and return to the ark.  
**Expected duration:** 3–4 minutes.

Visual clues shown in briefing and world:

- The correct tree is on a narrow south-facing green shelf.
- It has silver-green leaves and a split pale trunk.
- Two nearer dark trees are decoys and must not accept interaction.

Routes:

1. **Northern ridge/updraft route:** `(480,350) → updraft (820,290) → (1210,330) → tree`. Longer distance, lowest stamina risk.
2. **Southern tailwind route:** `(520,720) → (1020,730) → (1390,570) → tree`. Faster outbound, stronger crosswind on return.

Optional shortcut:

- A narrow calm corridor between exposed rocks from `(1030,550)` to `(1300,485)`.
- It saves about 12% distance but is harder to line up with; it must remain optional.

Carrying the leaf:

- Swap to the carrying sprite/texture.
- Reduce max speed by only 4%; do not make return control feel worse.
- Do not allow the leaf to be dropped.
- Objective text becomes “Fresh olive leaf found — return to the ark.”

### Flight 3 — A New Beginning

**World:** 2300×1200  
**Ark:** (190, 610)  
**Destination grove:** center (2050, 650), landing radius 125.  
**Goal:** land in the viable grove; do not return to the ark.  
**Expected duration:** 3–4 minutes.

Routes:

1. **Central exposed-land route:** shorter, with a crosswind change around 18 seconds. It requires adapting direction but includes one modest updraft.
2. **Northern mountain shoulder:** longer and visually obvious, with stable tailwind and no updraft.

The southern mudflat is a visible false destination. It should look wet and lack trees; entering its observation radius produces “The ground is exposed, but there is no safe place to settle.” It does not fail the flight.

At 18 seconds, rotate the central wind from eastward to northeast over 3 seconds. The preview should label this zone “changeable air,” and nearby ribbons must visibly bend before the full change.

Landing behavior:

- Entering the grove radius begins a 1.2 second assisted glide.
- Disable steering during the final 0.5 seconds.
- Land on the authored branch point `(2075,600)`.
- Pan the camera 180 px east and zoom out about 8% to reveal the renewed landscape.
- Do not show a rainbow yet.

---

## 10. HUD and wind-map preview

Keep the flight view sparse.

### Persistent HUD

- Existing top HUD: location/title plus one-sentence objective.
- Stamina bar: lower-left, 180×12 CSS pixels desktop and 140×10 mobile.
- Small text below it: `STAMINA 74`.
- Distance indicator: `ARK ◀ 620` for Flights 1/2; `GROVE ▶ 740` for Flight 3.
- Local wind indicator: one arrow and `TAILWIND`, `CROSSWIND`, `HEADWIND`, `UPDRAFT`, or `CALM`.
- DOM buttons: `Wind map`, `Restart flight`; mobile also shows `Boost`.

Do not add minimap dots, collectible counters, score, combo, timer, or route breadcrumbs.

### Wind-map modal

Use the app's existing modal system. Show:

- Simplified level silhouette.
- Ark and goal/evidence regions.
- Broad wind-zone arrows.
- Approximate route distance bands, not a recommended path.
- Flight-specific reminder: “Plan the return too.” / “Bring the leaf back.” / “This time, find a place to stay.”

Opening the map pauses model updates and stamina consumption because `app.isBlocked()` is true.

---

## 11. Failure, retry, hints, and replay

Failure must be quick and non-punitive.

### Failure flow

1. Freeze model input.
2. Fade the dove down over 250 ms; never depict injury or drowning.
3. Toast the reason: “The dove is too tired to continue.” or “The wind carried the dove beyond the search area.”
4. Show two buttons: `Retry flight` and `Review wind map`.
5. Reset only the current flight. Previously completed flights and rewards remain saved.

### Hints

After two failures on the same flight, add one contextual hint to the outcome panel:

- Flight 1: “The southern current bends back toward the ark.”
- Flight 2: “The northern updraft makes the return safer.”
- Flight 3: “The mountain route is longer but its wind stays steady.”

Failure counts are session-only and do not need save persistence.

### Replay

After completion, Noah's dialogue should offer a small replay modal with Flight 1, Flight 2, and Flight 3 buttons. Replay must not duplicate rewards or unset completion flags.

---

## 12. Narrative data and exact save flags

Add these `questFlags` booleans:

```text
dove_flight1_done
dove_flight2_done
dove_flight3_done
dove_complete
```

On completion:

- Add `doves_journey` to `completedScenes` once.
- Add `doves_journey_illustration` to `save.mementos` once.
- Add `rainbow_covenant` to `save.badges` once.
- Set story `status = 'completed'` only after the final reflection is acknowledged.
- Call `app.persist()` immediately after each flight flag and after final rewards.

Do not persist mid-flight position. Resume at the first unfinished flight; the longest lost progress is only one short flight.

Add these content keys to `noah.json` rather than hard-coding major narrative copy in the scene. `dove_covenant` remains only for compatibility with older saves/builds and must no longer be called:

```text
dove_invite
dove_flight1_briefing
dove_flight1_return
dove_seven_days_1
dove_flight2_briefing
dove_flight2_return
dove_seven_days_2
dove_flight3_briefing
dove_flight3_landing
dove_wait_for_command
dove_leave_ark
dove_offering
dove_covenant
dove_done
```

Required canonical sequence:

1. Noah sends the dove; it finds no resting place and returns (Genesis 8:8–9).
2. Noah waits seven days.
3. The dove returns in the evening with a freshly plucked olive leaf (Genesis 8:10–11).
4. Noah waits seven more days.
5. The dove does not return (Genesis 8:12).
6. Noah still waits for God's instruction to leave (Genesis 8:15–19).
7. Noah builds an altar and worships (Genesis 8:20–22).
8. Game 5 ends after the offering; Game 6 presents God's covenant and the rainbow sign (Genesis 9:8–17).

Every flight briefing or reflection that discusses authored routes/wind must include a concise fiction label. Do not present the game's geography, stamina, weather routes, or olive-tree location as details recorded by Scripture.

---

## 13. Ending and handoff

After Flight 3, use short dialogue/crossfades rather than another playable task:

1. Dove lands; renewed-land camera reveal.
2. Fade back to ark interior/exterior and state that Noah continued to wait.
3. God's instruction to leave is summarized with Genesis 8:15–19 reference.
4. Show Noah's offering with Genesis 8:20–22 reference.
5. Show a short handoff panel after Noah's offering. Do not show a rainbow, covenant reflection, chapter-complete message, or Game 6 reward here.

Primary CTA: `Continue to the sunlit valley →`

The CTA returns to Noah's meadow. When `dove_complete && !prism_complete`, Noah's meadow invites Aaron into Game 6. Game 6 owns the covenant reveal, reflection, badge, and chapter completion. Keep the old `dove_covenant` and reflection content keys during migration, but stop calling them.

---

## 14. Art and audio delivery plan

### Phase A art

- Procedural water background using large color fields and sparse foam strokes.
- Dove, ark, islands, trees, and landmarks generated with Phaser Graphics.
- Wind zones rendered with curved line segments and small arrowheads.
- No generated raster assets are required to prove gameplay.

### Final art

- Three separate landscape paintings so recession is unmistakable.
- Reuse the same ark asset and camera-relative scale across flights.
- Create small landmark overlays independently so collision/objective coordinates can be tuned without repainting backgrounds.
- Maintain a calm area behind the HUD in the upper-left.

### Audio

The current game describes itself as quiet and has no audio system. Do not add an audio library solely for Game 5. If audio is added later, use Phaser's built-in sound manager and authored local files; never fetch remote audio at runtime.

---

## 15. Automated verification (`tests/dove.test.mjs`)

Tests must exercise the pure model, not Phaser rendering.

Minimum unit tests:

1. Zero input in calm air reduces speed toward zero.
2. A tailwind increases ground progress compared with calm air.
3. A headwind costs more stamina than an equal tailwind.
4. Boost increases speed and stamina cost.
5. Updraft recovery respects the per-pass cap and total 100 cap.
6. Fixed-step simulation produces nearly equal results for equivalent elapsed time split into different render-frame chunks.
7. Boundary exit produces `out_of_bounds`.
8. Stamina reaching zero produces `exhausted`.
9. Flight 1 cannot complete without enough evidence plus an ark return.
10. Flight 2 cannot complete before leaf pickup and ark return.
11. Flight 3 completes at the grove and does not require ark return.

### Route viability tests

Represent each intended route as timestamped steering waypoints:

```js
[
  { x: 480, y: 350, boost: false },
  { x: 820, y: 290, boost: false },
  { x: 1210, y: 330, boost: true },
  { x: 1540, y: 445, boost: false }
]
```

`simulateRoute` should use a simple proportional steering controller toward each waypoint. These tests are tuning guardrails, not an AI player.

For every advertised route:

- It must complete the intended objective.
- It must finish with at least 12 stamina under nominal input.
- Minor steering noise of ±5 degrees should not make it fail consistently.

Also verify:

- Flight 1's far-east temptation followed by a direct return is not safely completable without turning back early.
- Flight 2's two main routes both complete; the shortcut is not required.
- Flight 3's central and northern routes both complete after the authored wind change.

Avoid exact floating-point equality. Compare positions within 1 px and stamina within 0.25 where appropriate.

---

## 16. Performance and mobile budget

- Keep continuously active wind particles below 120 desktop / 60 mobile.
- Pool particles or use one/two Phaser emitters; do not create/destroy particles per frame.
- No full-screen alpha texture larger than the viewport unless it is the background.
- Track and stop every repeating tween at scene shutdown and whenever its target is rebuilt.
- Avoid regenerating text or Graphics objects in `update`; mutate existing objects.
- HUD updates should occur only when the displayed integer stamina, wind label, or distance changes.
- Test at 390×844 portrait, 844×390 landscape, 768×1024 tablet, and 1440×900 desktop.
- On phone rotation, recompute camera fit and DOM control placement without restarting the flight.
- On `visibilitychange` hidden, clear input and pause simulation. Resume without applying hidden elapsed time.

---

## 17. Implementation sequence

Do the work in this order. Do not start final art before Phase A passes route tests.

### Phase A — pure model and one greybox flight

1. Add `dove.js`, `doveLevels.js`, and `tests/dove.test.mjs`.
2. Implement deterministic wind, movement, stamina, objectives, and simulation.
3. Implement only Flight 1 data and both route tests.
4. Create `DoveJourneyScene` with procedural shapes, keyboard input, drag steering, boost, restart, and map preview.
5. Verify failure/retry and mobile resizing.

### Phase B — all three authored flights

1. Add Flight 2 and Flight 3 level data.
2. Add leaf pickup/carrying and final landing states.
3. Add every route viability test.
4. Tune stamina until every intended route has 12–30 stamina margin.
5. Conduct manual keyboard and touch playthroughs.

### Phase C — narrative/save integration

1. Add manifest scene and main route registration.
2. Add `MeetNoahScene` progression branches.
3. Add all narrative data and seven-day transitions.
4. Add flags, rewards, replay, reflection, and story completion.
5. Verify import/export and reload between flights.

### Phase D — presentation

1. Replace greybox visuals with final assets.
2. Add wind ribbons, ark rocking, dove animation, weather tint, and landscape transitions.
3. Apply Reduced Motion behavior.
4. Profile iOS Safari memory and confirm no repeating-tween leaks.

### Phase E — release verification

Run:

```sh
node --test
node node_modules/vite/bin/vite.js build
git diff --check
```

Use the bundled Codex Node runtime if `/usr/local/bin/node` reports a CPU architecture mismatch.

---

## 18. Definition of done

- [ ] Game 5 is reachable only after `flood_complete`.
- [ ] All three flights follow the Genesis 8 sequence.
- [ ] Keyboard and touch controls both complete every flight.
- [ ] Wind visibly and mechanically changes route cost.
- [ ] Two tested routes exist per flight.
- [ ] Flight 1 requires evidence plus return and no landing.
- [ ] Flight 2 requires olive leaf plus return.
- [ ] Flight 3 requires landing and no return.
- [ ] Failure retries only the current flight.
- [ ] Reload resumes the first unfinished flight.
- [ ] Replay does not duplicate rewards.
- [ ] Ark motion is environmental only; the player does not steer it.
- [ ] Game 5 ends after Noah's offering and shows no rainbow before Game 6.
- [ ] Game 5 awards only `doves_journey_illustration`; it does not set story status to completed or award `rainbow_covenant`.
- [ ] Fictional wind/geography is clearly labeled.
- [ ] All tests and production build pass.
- [ ] No console errors, orphan DOM controls, timers, particles, or repeating tweens remain after scene exit.

---

## 19. Session handoff — Game 4 and the moving-ark idea

The current session fixed Game 4, **The Rising Flood**, but did not redesign it around a controllable boat.

### Completed Game 4 changes in the working tree

- Automatic pathfinding now performs movement only; it no longer solves crate/plank decisions for the player.
- Stage 1 requires the crate to fill the bridge gap before water can be raised, and requires HIGH water before the goal opens.
- Stage 3 now has exactly three advertised crossing topologies: high causeway, drain-assisted middle route, and plank channel.
- River movement becomes one square per input while the independent six-second storm continues.
- Manual unsafe water rises now commit the raised water state before rescue.
- Rescue returns to the last safe bank in the finale.
- Repeating board tweens are explicitly stopped before rebuild/shutdown.
- Flood scratch data is versioned, structurally validated, and cleared for new/reset/imported adventures.
- Keyboard movement, keyboard plank interaction, and resize-aware camera fitting were added.
- Flood solver tests now require both Stage 1 water rises, isolate every Stage 3 route, and reject malformed scratch data.

### Verification already completed

- All 13 repository tests passed.
- Production Vite build passed.
- `git diff --check` passed.

### Moving ark recommendation

Do not replace Aaron with a steerable ark inside the current crossing puzzle as a quick follow-up. That would invalidate the existing crate/plank/elevation model, require new collision and current mechanics, and create a biblical presentation problem because Genesis does not describe Noah steering the ark.

Use the idea in one of these two ways:

1. **Approved/easy:** In Game 5, make the ark a visibly moving environmental anchor. It rocks and drifts subtly, launches the dove, and receives it on Flights 1 and 2. This is already specified above and requires only rendering/tween work.
2. **Possible future redesign:** Build a separate pure-current ark interlude where the waters, not player steering, move the ark. The player's choices could be limited to reading the next current or securing cargo before impact. This is a new game mechanic and should receive its own design/test pass; it is not part of Game 5 acceptance.

The next agent should implement Game 5 from Phase A and leave the current Game 4 mechanics intact unless the user explicitly requests the larger redesign.
