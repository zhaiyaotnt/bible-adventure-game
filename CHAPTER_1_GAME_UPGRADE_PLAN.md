# Chapter 1 game upgrades — implementation plan

## Purpose and order

Improve clarity, challenge, replayability, and player feedback across the five Noah chapter games. Implement in this order, completing and reviewing each game before moving to the next:

1. **Game 1 — Supply Hunt** (start now)
2. **Game 2 — Build the Ark**
3. **Game 3 — Ark Mystery**
4. **Game 4 — Rising Flood**
5. **Game 5 — The Dove’s Journey**

**Current status:** Games 1–5 upgrade changes are implemented in the working tree and awaiting in-game review. The existing test suite and production build pass. The exhaustive Ark Mystery subset test takes about 43 seconds. Full in-game review remains outstanding.

The upgrade sequence prioritizes making rules and visual distinctions clear before increasing difficulty. Random setups must use authored, solvable candidates and persist while a run is active. Do not introduce timers or mandatory fail states as a substitute for challenge. Keep story progression, Bible references, saved rewards, and touch/keyboard support intact.

## Shared implementation requirements

- Teach each new action when it first becomes useful; use concise instructions and immediate, local feedback.
- Let players retry without losing chapter progress. Offer optional graduated hints where deduction or search is central.
- Persist a run’s random seed and generated setup so leaving and returning does not change the puzzle. A fresh run gets a new setup.
- Prefer curated, validated variants over unconstrained procedural placement. Do not allow overlapping targets, unreachable items, ambiguous clues, or unsolvable boards.
- Increase difficulty through choices, inference, and planning. Do not rely on smaller targets, poor contrast, hidden rules, or arbitrary time pressure.
- Respect reduced-motion settings and retain accessible inputs.

## Game 1 — Supply Hunt

### Current baseline

The meadow quest asks for three pieces of wood, two coils of rope, a hammer, and pitch. Six targets are selected from small location pools and saved in local storage for the active quest; one wood pickup sits behind a movable fallen log. The visible items currently emit glints and expose precise location names through nearby prompts, so the search is easy despite the randomized positions.

### Player experience

Explore the meadow, read Noah’s field notes for fair area clues, search for supplies hidden among the landscape, and interact with each item to collect it. The field notes orient the player without pinpointing every object. The fallen log remains a memorable, physical discovery.

### Implementation requirements

1. Expand each randomized supply pool to at least five curated meadow locations, using recognizable nearby landmarks and enough separation to prevent two targets from feeling like one pickup.
2. Choose one eligible location per supply key on a fresh quest. Randomize the fallen log among at least three authored, reachable positions and move its hidden wood with it. Store the complete setup and location clues under the existing scratch key; reuse it unchanged until the quest ends. Keep the log reveal as a consistent authored beat.
3. Give each candidate location a short, age-appropriate clue that points to its surrounding landmark or terrain. A clue must remain true for the selected candidate and must not name the exact screen coordinate.
4. Add an in-world field-notes interaction near Noah. It lists remaining supplies and their clues. Keep the list available throughout the hunt; it is optional and does not show markers on the meadow.
5. Remove persistent sparkle/glint markers from supplies. Give targets distinct silhouettes and modest camouflage against the existing meadow art. Keep the hidden wood concealed until the log is moved.
6. Replace exact target names in proximity prompts with a neutral interaction label (for example, “Search the grass”). Interacting while in range collects the item and gives clear feedback. Do not collect items just by walking nearby.
7. Keep the existing inventory counts and quest flags authoritative. Collected items remain collected after reload; the active spot roll remains stable. Clear scratch only when the supply quest completes or a new adventure starts.
8. Confirm all location candidates are inside the walkable meadow and do not overlap the log, water, major interactables, or one another. If no valid layout can be generated, use a known valid authored setup.

### Game 1 acceptance criteria

- A fresh adventure can produce visibly different locations for every pickup, including the hidden wood and its log, while preserving the log reveal beat.
- Reloading or leaving and returning during the hunt preserves every target location and collected state.
- Every target can be found from its clue without a screen marker; nearby interaction text does not reveal the precise target name/location.
- A collected item gives immediate feedback and increments the correct inventory count exactly once.
- Moving the log reveals its hidden wood and remains possible by touch and mouse.
- Completing the supply list clears the run setup and keeps the existing build progression intact.

### Visual and interaction direction

Visual thesis: keep the painterly meadow as the main surface; supplies should read through their silhouettes and partial exposure, while a compact parchment field note provides the only explicit guidance. The log remains the primary tactile discovery. Avoid adding an always-visible map overlay or a dense quest panel.

Reference: *Hidden Folks* demonstrates interactive, clue-led searching in miniature scenes. Borrow its readable target clues and environmental discovery loop, without copying its art direction or requiring pixel-perfect taps: [Hidden Folks](https://hiddenfolks.com/press/hidden-folks-1).

## Game 2 — Build the Ark

**Implementation status:** Complete for this pass. Decks now sag back unless both support posts are set first, stage setups remain stable even before the first placement, rain-test leaks use saved authored coordinates, and a stage reset clears only the current build stage. In-game review is still needed to tune the added order constraint and reset control.

### Player experience

Build a structure through three short experiments: assemble the frame, support and place the decks, then seal and test the hull. Players should understand why a piece works or fails and get a satisfying visible result from each test.

### Implementation requirements

1. Retain the current three-stage structure and existing piece identities, but make each stage require a meaningful decision, not only matching or dragging.
2. Frame stage: show alignment marks and require the keel and ribs to form the stable frame. Give incorrect orientation a visible, reversible consequence.
3. Deck stage: require supports before the decks; test placements with a visible sag/settle response and explain which span lacks support.
4. Sealing stage: use a rain test to expose leaking seams. Select a varied, validated subset of leak points for each fresh sealing attempt; let the player inspect and patch the failures.
5. Make reset/undo available during construction. Do not consume supplies or chapter progress on a failed test.
6. Keep per-stage randomness seeded and stable while the stage is in progress.

### Game 2 acceptance criteria

- A player can explain the purpose of the alignment marks, support posts, and rain test from the game’s feedback.
- Each stage requires at least one choice that cannot be solved by dropping all pieces onto obvious outlines.
- A failed test identifies the relevant structural issue and supports an immediate retry.
- Stage setup survives leaving/re-entering and changes only on a new attempt after stage completion.

Reference: *Poly Bridge* makes construction rewarding through a build-test-revise loop and increasing constraints: [Poly Bridge](https://store.steampowered.com/app/367450/Poly_Bridge/).

## Game 3 — Ark Mystery

**Implementation status:** Complete for this pass. A saved seed selects a room-identity permutation, transforming the authored clue text and final check while preserving the verified logical structure and unique solution. New adventures clear the active puzzle seed and board scratch. In-game review is still needed to check clue phrasing and discovery flow.

### Player experience

Find clues around the ark, record them, and use them to deduce a nine-room arrangement. The solution should change between new puzzle runs, while every clue set remains fair and uniquely solvable.

### Implementation requirements

1. Build a deterministic puzzle generator from the nine room definitions and valid 3×3 arrangements. Generate candidate clue statements from the existing relationship types (above, beside, deck, corner, column, and other authored rules).
2. Select a clue subset only when exhaustive validation shows it has exactly one solution. Reject unsolvable, multi-solution, contradictory, or trivially disclosed arrangements.
3. Persist the selected layout, clues, and seed for the active puzzle. Replay/new puzzle creates a fresh validated case without changing chapter completion or rewards.
4. Vary clue placement among decks and props, while maintaining discoverability and avoiding multiple clues hidden behind one mandatory interaction.
5. Add player-facing pencil marks/elimination controls and a graduated hint ladder. Hints should model one deduction at a time rather than disclose the final arrangement.
6. Preserve the distinction between fictional room-layout details and the biblical description of the ark.

### Game 3 acceptance criteria

- Every generated case has exactly one solution, verified by the same pure solver used by runtime validation.
- At least several distinct room layouts and clue configurations can be produced from different seeds.
- The saved case does not reshuffle after reload or deck changes.
- Hints remain consistent with that case and do not reveal unsupported biblical claims.

Reference: *The Case of the Golden Idol* centers investigation on observing evidence and constructing a theory: [The Case of the Golden Idol](https://store.steampowered.com/app/1677770/The_Case%20of%20the%20Golden%20Idol/).

## Game 4 — Rising Flood

**Implementation status:** Complete for this pass. Elevation now uses distinct rock, grass, and gravel patterns, channels use wave marks, and forecast cells show safe/wading/unsafe symbols. Each stage selects a saved base or mirrored layout for a fresh run; all six stage layouts pass the existing solver.

### Player experience

Read the terrain and forecast, then choose a route and sequence of actions before the water changes. The challenge comes from planning around elevation, crates, the plank, gates, and switches—not from guessing what colors mean.

### Implementation requirements

1. Give each terrain type a distinct silhouette, texture/pattern, and outline as well as color. Use symbols or labels for water stage, gaps, gates, switches, crates, plank, and checkpoints.
2. Add a compact legend and show the next forecast directly on affected cells. Clearly distinguish “never floods,” “wades at this level,” and “unsafe.”
3. Standardize icon shapes and semantic labels across instruction screens and gameplay. Avoid color-only instructions.
4. After visual clarity is established, add authored alternate maps with different route choices and object/switch placements. Validate every setup with the existing solver before making it playable.
5. Make the first encounter with each rule safe and observable. Keep the timed finale as a clearly signaled escalation, with checkpoint recovery.
6. Add optional mastery goals (such as fewer storm advances) without blocking the main path.

### Game 4 acceptance criteria

- Terrain and objects remain distinguishable in grayscale and at small-screen scale.
- The forecast indicates exactly which cells will be safe, wading, or flooded after an advance.
- Every alternate board has a solver-verified route and stable persisted setup.
- A player can recover from a failed route without losing puzzle objects or chapter progress.

Reference: *Into the Breach* telegraphs threats before a turn, letting players plan a response to visible danger: [Into the Breach](https://subsetgames.com/itb.html).

## Game 5 — The Dove’s Journey

**Implementation status:** Complete for this pass. Each flight selects an authored vertical mirror or the base route, saves the variant through retries, and clears it on success. The briefing now spells out whether to gather signs, return with the leaf, or land and stay. Both route orientations are checked against the existing pure flight model. In-game review is still needed to assess route readability and difficulty.

### Player experience

Learn to steer, read the wind, and manage stamina in a safe practice flight. Then use those skills to search and complete three unmistakable objectives: return after surveying signs; return with the olive leaf; land in the green grove and stay there.

### Implementation requirements

1. Add a short safe control lesson for steering, boost, wind direction, stamina, and updraft recovery. Teach one concept at a time with visible feedback.
2. Keep the objective visible during flight and update it at the exact event that changes the goal (evidence found, leaf collected, landing reached).
3. Use clear, persistent destination cues for the ark, olive tree, and grove. State whether to return or remain at the destination in both briefing and HUD.
4. Add several curated wind-route variants per flight and choose one per fresh attempt. Persist the route for retries/reloads; validate each route with the pure flight model before shipping it.
5. Increase challenge through route planning and meaningful tailwind/updraft choices. Keep retries forgiving and explain failure causes in player-facing terms.
6. Preserve the three biblical story beats, including the seven-day intervals and Noah waiting for God’s command. Keep invented flight mechanics framed as gameplay.

### Game 5 acceptance criteria

- Before movement begins, players can state the flight’s objective and whether the dove returns.
- The first flight teaches all controls safely; wind and stamina changes are visible before they become dangerous.
- Each curated route is reachable, completable, and stable on retry.
- Completing or replaying a flight preserves the existing narrative order, rewards, and completion flags.

Reference: *A Short Hike* uses flight as a satisfying way to move through and discover a world: [A Short Hike](https://store.steampowered.com/app/1055540/AShortHike/).

## Delivery and review gates

For each game, implement only that game’s section, review the player flow in the local game, then update this document with shipped behavior and any deferred requirements before moving to the next game. Keep the working change focused; do not batch later-game rewrites into an earlier milestone.
