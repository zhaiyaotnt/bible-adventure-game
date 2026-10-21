# Aaron’s Bible Adventure

A static, mobile-friendly Phaser 3 adventure built with Vite. **The current vertical slice is implemented:** explore the Adventure Room, open the data-driven Bible Timeline, meet Noah, inspect the ark, and return home. The first chapter's discoveries survive refresh. The art is in transition toward the hand-painted 2.5D direction documented in `VISUAL_DESIGN.md`.

This is a playable vertical slice, not the complete Noah MVP. Building puzzles, animals, the flood, covenant, and completion rewards belong to M2–M3 and are not yet playable. Unpublished timeline stories are explicitly marked Coming Soon.

## Run

Use Node.js 22+ with a current npm:

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Open the local address printed by Vite. For phone testing, connect to the same Wi-Fi and open the printed Network address. The game needs no server beyond static hosting and no API keys. `dist/` is the deployable production folder.

On this machine, `/usr/local/bin/node` is an incompatible Intel executable. The Codex bundled ARM runtime works:

```sh
export PATH="/Users/Mia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
npm run dev
```

For development outside Codex, install a current ARM-compatible Node distribution; no machine-specific paths are required by the game.

## Play

- Move: WASD, arrow keys, tap/click a destination, or hold on-screen directional buttons.
- Interact: approach a person/object, then E, Space, Enter, or the Explore button. A star and prompt identify the nearest interaction.
- Dialogue: Next / Done, or E / Space / Enter. Conversations can be skipped and replayed.
- Escape: open the menu, close a panel, or advance dialogue.
- Home Base: use the top-right Home Base button or the meadow's south exit.
- Settings: reduced motion, mute preference, export/import saves, and confirmed reset.

In the room, walk to the glowing portal on the upper right. Choose Noah’s Ark, then talk to Noah beside the ark and inspect the ramp. Both discoveries are needed to finish this preview chapter. There are no hard failures or time limits. Portrait and landscape layouts are supported; landscape gives more space to explore.

## Structure

- `src/main.js`: boot, DOM menu/timeline/dialogue UI, game composition, lifecycle autosaves.
- `src/core/StoryRegistry.js`: validates an explicit manifest index and sorts timeline chronology.
- `src/core/SceneRouter.js`: resolves registered story routes, resume, and safe home fallback.
- `src/core/SaveManager.js`: version 1 schema, defensive localStorage access, validated imports capped at 100 KB.
- `src/core/InputManager.js`: continuous analog thumbstick input with dead-zone, magnitude, pointer capture, and cancellation cleanup.
- `src/scenes/ExploreScene.js`: direct eight-direction movement, acceleration/deceleration, diagonal normalization, collider sliding, directional sprites, and interaction range.
- `src/scenes/HomeBaseScene.js`: the playable room.
- `src/scenes/art.js`: original art generated at runtime; no downloaded assets.
- `src/stories/noah/MeetNoahScene.js`: story-specific first chapter and quest transitions.
- `src/data/stories/`: content, Scripture references, explicit manifest index, future teasers.

Generic menu, routing, and save code do not branch on Noah IDs. Scene registration is an explicit composition mapping in Boot. This keeps future adventures isolated without introducing systems before they are needed.

## Add a story

1. Add a manifest with `id`, `title`, numeric `timelineOrder`, `era`, `bibleReferences`, and `published`.
2. Published manifests also need `entryScene`, `scenes`, `subtitle`, and content data. Add it to `src/data/stories/index.js`.
3. Implement its Phaser scenes in a story-local module. Extend `ExploreScene` when useful; keep dialogue and objective text in the manifest or story-local JSON.
4. Register the scene classes in the Phaser config and the `storyId/sceneId` → Phaser scene key in Boot's router mapping.
5. Use the story's own `save.stories[id]` progress. Preserve previous stories and rewards; never modify the save schema without migrations and tests.
6. Audit story accuracy and asset licensing. Future chapters should extend the Noah manifest and routes without changing the menu or persistence code.

`timelineOrder` is narrative order, not a historical date or an unlock dependency. Unknown imported story IDs retain their progress and route safely home until their story is installed.

## Saves

Namespace: `aaron-bible-adventure:save:v1`. Autosave runs on route changes, quest completion, every 30 seconds, tab hiding, and window blur. Storage failure displays a nonblocking warning. Export/import is available from Settings. Import rejects unsupported versions, invalid progress, and oversized files. New Adventure and Reset require explicit confirmation when progress exists.

Storage is scoped to the browser and origin; private mode, clearing browser data, and Home Screen apps can affect availability. Export a backup before moving devices or origins. No cloud sync is implied. The M0 chapter completion flag does not mark the full Noah story completed or grant future rewards.

## GitHub Pages

1. Create a GitHub repository and push this project with its lockfile to `main`.
2. Under **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` installs dependencies, runs tests, builds, uploads `dist`, and deploys Pages. It also supports manual dispatch.
4. Open the deployment URL from the workflow. Vite's relative `base: './'` supports the repository subpath; no root-relative asset URLs are shipped.

No remote repository was present during implementation, so no public deployment URL has been created or verified. A real iPhone Safari walkthrough remains required before calling M0 fully accepted.

## Validation

`npm test` covers manifest validation and chronology, independent story routing, save round trips, unknown future story progress, invalid imports, and unavailable storage. See `SMOKE_TEST.md` for browser acceptance and remaining device checks. `ASSET_CREDITS.md` inventories original art; `CONTENT_REVIEW.md` records the chapter's Scripture/dramatization review.
