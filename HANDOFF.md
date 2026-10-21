# Handoff — Aaron’s Bible Adventure

Updated: October 21, 2026.

## User intent and stopping point

Read `VISUAL_DESIGN.md` and `AARON_BIBLE_ADVENTURE_GAMEPLAY_EDUCATION.md` before continuing. The user asked for the Noah scene to become a more immersive 2D RPG and specifically requested this design-led rework. Phase A only is implemented: Noah’s meadow proof of concept plus the ark blueprint learning loop. Do not add further chapters or later gameplay phases without direction.

Animal tracking, flood, covenant and the full 10–15 minute story remain unimplemented. Do not describe this slice as a complete Noah adventure or MVP.

## Implemented

- Vite + Phaser 3 project with an original pixel-art room and a hand-painted Noah meadow proof of concept.
- Boot and DOM main menu: New Adventure, Continue when a save exists, Settings.
- Playable Home Base: Bible, glowing timeline portal, memento shelf interaction.
- Four-direction Aaron and Noah character art, two idle frames and two walking frames; collision with room boundaries and props.
- WASD/arrows, tap-to-walk, visible pointer-based directional controls, Explore button, E/Space/Enter interactions.
- Data-driven Bible Timeline: playable Noah preview; Creation, Abraham, and Exodus marked Coming Soon.
- Noah meadow: explore a natural painted map, meet Noah, inspect the ark, find the blueprint clue, and return home.
- Story-local `ark_blueprint` scene: a rotatable hull-beam drag puzzle followed by a three-deck placement puzzle, with Genesis 6:14–16 teaching, feedback, and save-backed stage progress.
- Expanded Noah meadow with forest path, tree/rock collision, blocked river with stepping-stone crossing, and draggable fallen log that reveals hidden wood.
- Save-backed Noah supply quest: gather 3 wood, 2 rope, and 1 hammer; objective counts update as inventory changes; return to Noah to complete the preview quest. Blueprint progress is stored beside the supply-quest flags.
- Story-local `Inventory` helpers; saved player position resumes through `SceneRouter`; old two-interaction preview completion is reopened while preserving Noah/ark discoveries.
- Dialogue advance/skip/replay, nearby interaction prompts, objective updates, Scripture-summary panel, Help.
- Noah dialogue and story text stored as structured data; fictional dialogue explicitly labeled.
- Versioned localStorage saves, Continue, quest persistence, periodic/visibility saves, defensive storage handling.
- Validated save import/export, size cap, confirmed new-game/reset actions.
- Reduced-motion setting and mute preference. There is **no audio yet**.
- Relative production asset paths and GitHub Pages Actions workflow.
- README, asset credits, content-review checklist, smoke-test record, eight core tests.

## Architecture and important files

- `src/main.js`: Phaser composition/Boot, DOM menu, timeline, dialogue, settings, lifecycle wiring.
- `src/core/StoryRegistry.js`: validates explicit manifests; generates chronological timeline data.
- `src/core/SceneRouter.js`: generic story routing, resume, unknown-story home fallback.
- `src/core/SaveManager.js`: schema v1, validation, bounded import, localStorage error handling.
- `src/core/Inventory.js`: small reusable save-friendly inventory helpers.
- `src/core/InputManager.js`: held directional controls and cancellation cleanup.
- `src/scenes/ExploreScene.js`: shared movement, collision, interaction, tap targets, player animation.
- `src/scenes/HomeBaseScene.js`: original playable room.
- `src/scenes/art.js`: reusable code-drawn graphics and smooth character textures.
- `src/stories/noah/MeetNoahScene.js`: Noah exploration map, clue, and material quest.
- `src/stories/noah/ArkBlueprintScene.js`: rotatable, touch-draggable blueprint puzzle and saved completion.
- `src/assets/noah-meadow-concept.jpg`: generated painted environment proof of concept.
- `src/data/stories/noah.json`: Noah manifest and dialogue/objective/reference data.
- `src/data/stories/index.js`: explicit manifest registration.
- `src/data/stories/future.json`: unpublished timeline entries.
- `tests/core.test.js`: core save, registry, and routing tests.
- `.github/workflows/deploy.yml`: build/test/deploy to Pages from `main`.

Generic navigation, timeline, and persistence do not contain Noah-specific conditional branches. New scene classes and `storyId/sceneId` route mappings are registered at composition time in `src/main.js`. Keep future story behavior and content isolated in story-local modules.

The Noah meadow painting is generated project art. Remaining maps, props, HUD and portraits are project-authored. No third-party art, sounds or fonts are distributed. See `ASSET_CREDITS.md`. The visual proof of concept does not mean all scenes have been converted to final art; there is still no audio.

## Progress semantics

Save key: `aaron-bible-adventure:save:v1`.

Noah progress lives under `save.stories.noahs_ark`:

- `questFlags.met_noah`
- `questFlags.blueprint_discovered`, `blueprint_stage_one`, `blueprint_stage_two`, `blueprint_complete`, beam-rotation flags, and individual deck-placement flags.
- `questFlags.inspected_ark`
- `questFlags.wood_1` through `wood_3`, `rope_1` through `rope_2`, `tool_1`, `log_moved`, and `supply_quest_complete`.
- `inventory` counts for `wood`, `rope`, and `tool`.
- `current.x` and `current.y` track the player's saved position while exploring.
- Blueprint scene saves at stage boundaries and after each placed deck; the current story scene is persisted by the generic router.

Returning to Noah after collecting all six supplies completes the **preview scene**, not the full story. The full story remains `in_progress`; no covenant badge, Noah reward card, or rainbow memento is awarded yet. Discovered Noah is tracked separately. The schema remains v1; inventory is optional so older saves validate. Unknown future story IDs are retained in saves and route safely home if unavailable.

## Verified during implementation

- Dependency installation succeeded.
- `npm test`: eight tests passed after the blueprint scene work.
- `npm run build`: passed after the blueprint scene work; static output in `dist/`.
- Browser preview: resumed a legacy save, verified it reopened the supply quest, moved Aaron, dragged the log, collected the revealed wood and hammer, then confirmed inventory and quest progress after reload. No browser errors were reported.
- Desktop headless Chrome playthrough: New Adventure → walk to timeline → Noah → conversation → ark inspection → saved chapter flags → refresh → Continue → Home Base. No page errors.
- Existing Chrome phone checks cover the earlier meadow/touch flow. A new portrait render check confirmed the painted map, but the full blueprint puzzle has not yet been manually played end-to-end on a physical iPhone.
- Fixed a startup bug where the portal glow read settings before scene setup; added cabin movement boundaries.

Browser test script and screenshots were temporary diagnostics under `/private/tmp/aaron-*`; they are not committed project tooling and may no longer exist. Core tests are in the repository. See `SMOKE_TEST.md` for the broader acceptance checklist; its unchecked items are not all verified.

## Not verified / not delivered

- Actual iPhone Safari, desktop Safari, and full landscape-device walkthroughs.
- Exhaustive UI testing of save export/import/reset and every accessibility path.
- Public GitHub Pages deployment and deployed asset URLs.
- No Git repository or remote existed in this folder during implementation. The workflow is prepared, but no repository, commit, PR, or public deployment was created.

This Phase A slice is locally playable; real-device and public-deployment acceptance gates remain open.

## Run locally

Use a current Node.js 22+ installation with npm:

```sh
npm install
npm run dev
npm test
npm run build
```

On this machine, `/usr/local/bin/node` is an incompatible Intel binary. The bundled ARM runtime was used successfully:

```sh
export PATH="/Users/Mia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
npm run dev -- --host 0.0.0.0
```

On this host, get the current Wi-Fi address with `ipconfig getifaddr en0`. Open `http://<that-address>:5173/` on a phone connected to the same Wi-Fi. At handoff the dev server was left running:

- Computer: http://localhost:5173/
- Same-Wi-Fi phone: http://192.168.1.133:5173/

These addresses depend on the server still running and the network address remaining unchanged. Restart the server if necessary. No backend or API keys are needed.

## Next work, when the user requests continuation

Follow the plan's milestone order and keep each step playable:

1. Verify Phase 1 on actual iPhone Safari and finish any usability fixes based on the user's playtest.
2. Refine the Noah visual proof of concept and verify the blueprint puzzle on an actual iPhone Safari.
3. Later, when requested, add animal tracking, then the flood/covenant learning loop with rewards and replay semantics.
4. Validate save/load, replay, and mobile touch behavior on real devices; deploy only after repository details are available.

Retain the plan's biblical safeguards: Aaron is fictional; invented activities are not Scripture; animal collection is representative rather than exactly one pair of every kind; forty rainy days are not the whole flood duration; the covenant is not a promise that no local flood can ever occur.
