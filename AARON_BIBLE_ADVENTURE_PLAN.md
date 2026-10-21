# Aaron's Bible Adventure — Implementation Plan

**Status:** Ready for implementation  
**MVP:** Noah's Ark  
**Platform:** Static HTML5 game, mobile-first, deployed to GitHub Pages  
**Audience:** Children approximately ages 7–9  
**Language:** English (content structured for future localization)

## 1. Product vision

**Tagline:** *Travel Through the Stories. Meet the People. Discover God's Plan.*

Build a delightful, replayable, hand-painted 2.5D Bible adventure RPG. Aaron is the playable protagonist who travels through biblical history, meets biblical characters, explores environments, solves puzzles, and plays story-specific mini-games. Biblical **stories** are the primary playable units; **characters** recur across stories; a **timeline** connects events into the larger biblical narrative.

**Navigation loop:** Home Base → Bible Timeline → Story → Scenes → Home Base.

The experience must feel like a real game, not a quiz with movement between questions. Knowledge is primarily learned through discovery, conversation, and mechanics, with occasional short questions and age-appropriate reflection.

### Product principles
1. **Biblical fidelity:** Aaron is a fictional observer/helper in a clearly fictional framing; he does not replace biblical protagonists or change canonical outcomes. Do not present invented dialogue or activities as Scripture. Keep references and the distinction between text and game embellishment clear.
2. **Fun first, learning integrated:** Every story includes meaningful exploration, at least one puzzle, and a distinctive mini-game. Avoid quiz gates that punish wrong answers.
3. **Modular growth:** New stories can be added without rewriting the engine or existing stories.
4. **Small first release:** Ship one polished Noah story before expanding.
5. **Accessible mobile play:** iPhone Safari and desktop browsers are first-class targets; no login or server required.
6. **Respectful theology:** Show God's character, covenant, judgment, mercy, and faithfulness; avoid reducing faith or holiness to game statistics.

## 2. MVP scope and player experience

### In scope
- Main menu: **New Adventure**, **Continue**, **Settings** (Continue only if a save exists).
- Cozy **Adventure Room / Home Base** with a Bible, timeline portal, and a shelf for story mementos.
- **Bible Timeline** with chronological entries; Noah playable; other stories labeled **Coming Soon** (not falsely shown as unlockable content).
- Playable **Aaron** sprite with continuous direct control, eight-direction movement/facing, idle/walk animations, foot-based depth sorting, and an interaction prompt.
- **Noah's Ark** as a complete, approximately 10–15-minute adventure with five scenes.
- Dialogue UI with portraits, advance/skip controls, and optional replay.
- Lightweight quest/objective tracker; interaction, collectibles, and puzzle support.
- At least one polished animal-finding mini-game and one simple ark-building puzzle.
- Small, contextual knowledge prompts with helpful feedback; no hard failure for incorrect answers.
- Noah character card, **God's Covenant** badge, and a rainbow memento in Home Base after completion.
- Auto-save, Continue, chapter replay, Export Save, Import Save, and Reset Progress with confirmation.
- Responsive desktop keyboard and mobile touch controls; mute toggle.
- Fully static GitHub Pages deployment.

### Out of scope for MVP
- Cloud accounts/sync, multiplayer, monetization, analytics, randomized card packs, AI-driven NPCs, full open world, sophisticated combat, and a large inventory/equipment economy.
- Fully animated cinematic sequences; use short in-engine transitions and illustrated story panels instead.
- Multiple playable stories. Future entries may appear as teasers, but must not break the player flow.

### Core loop
1. Start in Home Base; approach the timeline portal.
2. Open Timeline and select **Noah's Ark**.
3. Explore, talk to Noah, follow objectives, solve environmental puzzles, and learn what Scripture says.
4. Reach the flood and covenant conclusion through a short non-violent cinematic sequence.
5. Receive a story-completion badge and Noah card; return to Home Base, now decorated with a rainbow memento.
6. Revisit Noah to replay scenes/mini-games without deleting progress.

## 3. Noah's Ark — complete MVP story specification

**Scripture:** Genesis 6–9.  
**Learning outcomes:** God judges wickedness; Noah obeys God's instructions; God preserves Noah and his family; God establishes His covenant; the rainbow is the covenant sign.  
**Tone:** Wonder and adventure, with truthful but age-appropriate treatment of the flood's seriousness. Avoid making destruction a joke or an action spectacle.

### Scene N1 — Meet Noah (2 minutes)
- **Environment:** Forest/field with the unfinished ark visible, trees, paths, props, and Noah NPC.
- **Actions:** Move Aaron, discover interaction hotspots, speak with Noah.
- **Narrative:** Noah explains that God instructed him to build an ark. Clearly label fictional game dialogue as dramatization; link to Genesis 6:13–22.
- **Objective:** Speak to Noah, inspect the ark, and learn the next task.
- **Completion trigger:** Dialogue and ark inspection complete.

### Scene N2 — Prepare the Ark (2–3 minutes)
- **Environment:** Ark construction area with interactive planks/sections.
- **Actions:** Collect a few marked building materials and solve a drag-and-place or tap-to-place assembly puzzle.
- **Knowledge integration:** God gave Noah detailed instructions (Genesis 6:14–16). Aaron helps through a fictional practice puzzle; do not imply Scripture says Aaron constructed the ark.
- **Completion trigger:** Assembly puzzle solved; short positive feedback and transition.

### Scene N3 — Animals Arrive (3–4 minutes)
- **Environment:** Small explorable meadow/forest with animated animals.
- **Actions:** Find and guide animals toward marked safe areas using simple proximity interactions and environmental puzzles (e.g., navigate around a fallen log, find a sheep behind a tree, wait for a bird to land).
- **Knowledge integration:** Genesis 7 distinguishes clean animals and birds from other animals; avoid teaching that every kind was represented by exactly one pair. For age-appropriate gameplay, collect a representative subset and explain that it is symbolic, not an exact count.
- **Completion trigger:** Required animal groups guided successfully.

### Scene N4 — The Flood (1–2 minutes)
- **Environment:** Darkening sky, rain, ark exterior/interior; simple scripted camera/panel sequence.
- **Actions:** Guide Aaron to the marked safe observation point before rain intensifies; no lethal fail state. Show rain, rising water, ark afloat, passage of time, and receding water.
- **Knowledge integration:** Rain lasted forty days and forty nights (Genesis 7:12), but the flood narrative lasts longer than those forty days. Do not imply the waters fully receded immediately after the rain.
- **Completion trigger:** View the sequence and advance to covenant scene.

### Scene N5 — The Covenant and Rainbow (2 minutes)
- **Environment:** Dry land, rainbow sky, Noah and family represented respectfully.
- **Actions:** Speak with Noah, observe rainbow, complete one short knowledge interaction: e.g., “What does the rainbow signify?” with corrective explanation if missed.
- **Knowledge integration:** God's covenant with Noah and every living creature (Genesis 9:8–17); rainbow as covenant sign. Avoid describing it as a promise that no flood will ever happen anywhere.
- **Completion trigger:** Dialogue and reflection finished; award Noah character card, God's Covenant badge, and rainbow memento; mark story completed and return Home Base.

### Content requirements for every scene
- One-sentence objective visible to the player.
- Clear success state and return/exit behavior.
- Dialogue/script text stored as data, not hard-coded in scene logic.
- Scripture reference and optional **Read in the Bible** info panel.
- At least one discovery/interaction; scenes should not be passive slideshows.
- Short, gentle hint if player is stuck; never block progression on a trivia mistake.

## 4. Future story model and roadmap

A **Story** is a self-contained adventure, not necessarily a whole character's lifetime. One character may participate in multiple stories. Timeline entries sort by biblical narrative chronology, while published stories remain independently playable; unpublished gaps do not block later additions.

Potential sequence (illustrative, not all required): Creation → Noah's Ark → Babel → God's Call to Abraham → Joseph in Egypt → Baby Moses → Burning Bush → Exodus/Red Sea → David and Goliath → Daniel in the Lions' Den → Jesus' Ministry → Peter and the Early Church → Paul's Journeys.

**Suggested first expansions:**
1. **David and Goliath:** Shepherd's camp exploration, find five smooth stones, safe slingshot *practice* mini-game; David, not Aaron, defeats Goliath (1 Samuel 17).
2. **Joseph and Pharaoh's Dreams:** Explore Egyptian setting, match dream symbols and interpretations, discuss God's providence (Genesis 41; link to Joseph's broader narrative).
3. **Moses and the Red Sea:** Exodus context, pathfinding/observation challenge, witness deliverance (Exodus 13–14).

Later add a **Character Collection** with multiple story appearances and changing biographies, a **Timeline Journal** showing connections among stories, and optional cross-story discoveries. These must not become prerequisites for publishing new stories.

## 5. Technology and deployment

- **Game engine:** Phaser 3, JavaScript ES modules, HTML5 Canvas/WebGL.
- **Build tool:** Vite (small, conventional static bundle; no backend).
- **Map authoring:** Tiled tilemaps exported to JSON where useful; Phaser can load Tiled maps. A hand-authored small MVP map is acceptable initially.
- **Data:** JSON story manifests, dialogue, quest definitions, character metadata, and questions.
- **Persistence:** `localStorage` for a small, versioned save payload; downloadable JSON backup/restore. Catch storage errors and show a nonblocking warning.
- **Deployment:** GitHub Pages via GitHub Actions build/deploy workflow; configure Vite `base` for the repository subpath or use a custom domain.
- **Device targets:** Current iPhone Safari, Chrome mobile, desktop Safari/Chrome/Firefox. Landscape preferred for gameplay, with graceful portrait guidance or responsive layout.
- **Input:** Keyboard arrows/WASD + Space/Enter/E on desktop; continuous analog thumbstick and interaction button on touch. Empty-world taps never move Aaron. Never depend on hover.
- **Audio:** Optional background music/SFX with mute and browser-safe user-gesture initiation.

### Recommended repository layout

```text
aaron-bible-adventure/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── public/
│   └── assets/
│       ├── shared/{tiles,ui,audio,characters}/
│       └── stories/noah/{maps,sprites,portraits,audio}/
├── src/
│   ├── main.js
│   ├── core/{GameState,SaveManager,StoryRegistry,SceneRouter,InputManager}.js
│   ├── systems/{DialogueSystem,QuestSystem,InteractionSystem}.js
│   ├── scenes/{BootScene,MainMenuScene,HomeBaseScene,TimelineScene}.js
│   ├── stories/noah/{NoahStory,MeetNoahScene,PrepareArkScene,AnimalsScene,FloodScene,CovenantScene}.js
│   ├── minigames/{ArkPuzzle,AnimalGathering}.js
│   ├── ui/{DialoguePanel,QuestHUD,TouchControls,SettingsPanel}.js
│   └── data/{stories,characters}/
├── tests/
│   ├── save-manager.test.js
│   ├── story-registry.test.js
│   └── story-progression.test.js
└── .github/workflows/deploy.yml
```

Use the final spelling `aaron-bible-adventure` for the actual repository. Avoid overengineering: keep modules small and create only files needed for a working slice.

## 6. Extensible content contracts

### Story manifest example

```json
{
  "id": "noahs_ark",
  "title": "Noah's Ark",
  "timelineOrder": 20,
  "era": "The Beginning",
  "bibleReferences": ["Genesis 6–9"],
  "characters": ["noah"],
  "entryScene": "meet_noah",
  "scenes": ["meet_noah", "prepare_ark", "animals_arrive", "flood", "covenant"],
  "rewards": {"badge": "gods_covenant", "memento": "rainbow"},
  "published": true
}
```

### Character example

```json
{
  "id": "noah",
  "name": "Noah",
  "summary": "God instructed Noah to build an ark.",
  "storyIds": ["noahs_ark"],
  "bibleReferences": ["Genesis 6–9"],
  "portrait": "/assets/stories/noah/portraits/noah.png"
}
```

**Implementation rule:** Register stories from an explicit index of manifests (Vite import glob or equivalent), validate required fields at startup, and generate timeline entries from registry data. Never embed a hard-coded `if story === 'noah'` in generic menu, save, or navigation systems. Story-specific logic belongs in its own module. `timelineOrder` is a sortable narrative key, not a date or a prerequisite chain.

## 7. Save system contract

Version the save schema so new stories and fields can be introduced safely. Save after scene transitions, quest completion, reward unlocks, and periodically during exploration (e.g., every 30 seconds). On visibility changes, attempt an additional save. Never rely only on unload handlers.

```json
{
  "schemaVersion": 1,
  "player": {"name": "Aaron"},
  "current": {"location": "story", "storyId": "noahs_ark", "sceneId": "animals_arrive", "spawnId": "start"},
  "stories": {
    "noahs_ark": {
      "status": "in_progress",
      "completedScenes": ["meet_noah", "prepare_ark"],
      "questFlags": {"met_noah": true, "ark_puzzle_done": true}
    }
  },
  "discoveredCharacters": ["noah"],
  "badges": [],
  "mementos": [],
  "settings": {"muted": false}
}
```

- Store under a namespaced key, e.g. `aaron-bible-adventure:save:v1`.
- Validate imported JSON and cap input size; reject invalid/malformed saves gracefully.
- Add schema migration functions before changing the structure; unknown future story IDs should not crash the app.
- **Replay semantics:** Replay a story without erasing completed badges or the canonical completion record. Track temporary replay progress separately if needed.
- **Reset:** Confirmation dialog and explicit overwrite; never reset on app updates.
- **Device caveat:** `localStorage` is browser/origin scoped; Safari and installed Home Screen web apps may not share it, and storage may be cleared. Exports are the cross-device fallback. Do not promise cloud sync.

## 8. Visual and asset strategy

**Style direction:** Premium hand-painted 2.5D cartoon exploration in a fixed three-quarter top-down perspective; expressive illustrated portraits for dialogue; illustrated panels for key story moments; playful but respectful visual tone. Follow `VISUAL_DESIGN.md` as the binding art-direction and proof-of-concept gate.

**Asset sources to evaluate:** itch.io game assets, OpenGameArt, Kenney, CraftPix. Use FreeBibleimages for scene/storyboard reference only unless an asset's specific license permits use and adaptation. Build environments from reusable tiles and add bespoke biblical props (ark, robes, rainbow) as needed.

**Licensing gate:** For every imported asset record source URL, author, license, attribution text, and allowed uses in `ASSET_CREDITS.md`. Do not assume free-to-download means free-to-redistribute. Do not copy proprietary game sprites. AI-generated sprites/portraits require consistency and animation QA; start with existing walk-cycle sprites and custom static portraits if necessary.

**Initial art inventory:** Aaron 8-direction walk/idle sprite; Noah NPC sprite and portrait; painterly forest/grass/water/path layers; depth-sorted vegetation and props; ark exterior/interior elements; 4–6 recognizable animal sprite types; sky/rain/flood/rainbow effects; Home Base props; badge/card UI; analog touch controls. Temporary placeholders must still match the chosen perspective; geometric shapes and emoji are not acceptable final visual proof assets.

### Where to find assets — actionable sourcing guide

Use the following sites as **discovery starting points**, not as blanket permission to reuse everything on them. Inspect the license on each individual asset page before downloading or shipping.

| Source | URL | Best use | Suggested search terms / action |
|---|---|---|---|
| itch.io game assets | https://itch.io/game-assets | Hand-painted/top-down RPG character sprites, walk cycles, forests, villages, desert environments | `hand painted top down RPG`, `8 direction character`, `illustrated forest tileset`, `top down animals` |
| OpenGameArt | https://opengameart.org/ | Animals, tile sets, effects, ambient sound and music | `top down animals`, `RPG tileset`, `rain animation`, `water`, `forest` |
| Kenney | https://kenney.nl/assets | Cohesive UI, controls, environment placeholders, props | Browse 2D packs and UI packs; prefer clearly labeled CC0 packs |
| CraftPix | https://craftpix.net/ | Alternative non-pixel 2D character/environment packs | `top down`, `hand painted RPG`, `forest`, `village`; review free vs paid terms |
| FreeBibleimages | https://www.freebibleimages.org/ | Noah narrative storyboard and visual references | Search `Noah` and `Flood`; verify rights for each image set before actual game use |
| Tiled Map Editor | https://www.mapeditor.org/ | Assemble tile maps from licensed assets; export JSON for Phaser | Build Home Base, forest, ark approach, and interior maps |
| Phaser | https://phaser.io/ | Rendering spritesheets, tilemaps, animation and mobile interactions | Use official examples/documentation to implement loading and animation |

**Noah MVP asset shopping list and preferred sources**

1. **Aaron:** Produce one coherent eight-direction player spritesheet with a rust tunic, teal sash, sandals, and explorer satchel. Verify alpha, perspective, identity, foot contact, and walk-loop consistency in-engine before adoption.
2. **Noah:** Start from a visually compatible elderly villager sprite; commission/create an original long-robe/gray-beard variant. Produce a separate illustrated dialogue portrait, consistent with Aaron's portrait style.
3. **Environment:** Obtain one coherent grass/forest/river tile set (Kenney or itch.io). Assemble scenes in Tiled rather than using a flat, AI-generated background that cannot support collision or edits.
4. **Ark:** Create an original three-quarter exterior plus simple interior layers/props. The ark is the most important custom biblical landmark; prioritize visual clarity over historical speculation.
5. **Animals:** Source 4–6 animated or static animal sprites from a single pack where possible (e.g., sheep, birds, lions). Keep the full game narrative accurate about clean vs. unclean animal numbers rather than assuming every animal entered in exactly one pair.
6. **Weather/covenant:** Source rain and water effects from OpenGameArt or implement them with Phaser particles; create an original rainbow illustration/effect.
7. **UI:** Use original illustrated UI or a compatible licensed pack for dialogue boxes, objective prompts, timeline markers, badges, and mobile controls. Avoid pixel borders and card-grid clutter.
8. **Audio:** Search OpenGameArt for ambient nature/rain and gentle music, or use other explicitly licensed audio; confirm attribution and distribution permissions.
9. **Storyboarding:** Consult FreeBibleimages for the sequence of Genesis 6–9, but do not automatically copy images into the shipped game. Cross-check every narrative detail against the biblical text.

**Art direction / AI generation brief:** Exploration uses coherent hand-painted 2.5D art at one fixed camera angle; dialogue uses expressive cartoon portraits; major moments use illustrated panels. Create and approve the playable proof in `VISUAL_DESIGN.md` before generating the full set. For AI-assisted images, request transparent-background separate assets and exact angle/facing requirements; manually inspect identity, frame consistency, alpha, foot contact, depth origin, and animation usability. Do not use recognizable copyrighted game art.

**Asset intake workflow (mandatory):**
1. Identify the needed asset and intended role/size; search the sources above.
2. Inspect the exact download page and license; record URL, creator, license version, modification permission, commercial-use restrictions (if any), and required credit.
3. Download into `assets/` or story-local assets; preserve the original filename and a source note. Keep a record in `ASSET_CREDITS.md` even for CC0 assets where feasible.
4. Normalize scale, palette, transparency, frame dimensions, and file naming. Verify mobile readability and collision bounds in the game.
5. If rights are unclear or styles clash, substitute an original placeholder rather than blocking development or assuming permission.
6. Before release, audit every distributed image, sound, font, and adapted illustration; include legally required attribution in a Credits screen or bundled credits file.

**Suggested first asset pass:** Acquire one licensed player spritesheet, one coherent outdoor tileset, one UI pack, and a few animals. Build the first playable scene using these. Only then create bespoke Noah/ark/portrait assets. This keeps art sourcing from delaying M0 and avoids redesigning later scenes around incompatible packs.

## 9. UX, accessibility, and learning content

- Short dialogue chunks, readable large text, clear buttons, simple objectives, and a persistent **Help** affordance.
- Avoid precise timing, rapid tapping, and harsh fail states; allow retries and hints.
- Provide reduced-motion option for flashing/rain sequences, audio mute, and strong text contrast.
- Ensure touch targets are comfortable for children and HUD does not cover interactive areas.
- Explain incorrect answers immediately and kindly; do not deduct XP or prevent story completion.
- Store Scripture references separately from fictional dialogue; when displaying a verbatim Bible translation, verify its reuse/license terms. Paraphrase faithfully where permission is uncertain.
- For each story, create a short **Content Review** checklist: passage verified, chronology checked, key themes accurate, fictional embellishments marked, no misleading theological claims.

## 10. Delivery milestones — execute in order

### M0 — Bootstrap and playable vertical slice
**Build:** Vite + Phaser project; Boot/MainMenu/HomeBase/Timeline; Aaron movement and touch controls; one test room with an NPC and interaction; static build and GitHub Pages deployment.
**Done when:** `npm install`, `npm run dev`, `npm run build` work; playable on desktop and iPhone; timeline opens Noah entry; deployed URL loads assets correctly.

### M1 — Shared gameplay systems
**Build:** Data-driven story registry; scene router; dialogue; objectives/quest flags; interaction; transitions; GameState + local save/restore; basic UI.
**Done when:** A test quest persists through refresh; generic systems have no Noah-specific branching; a stub second story can be registered without changing the core.

### M2 — Noah story, end to end
**Build:** Five scenes N1–N5 with progression, environments, puzzle, animal gathering, flood sequence, dialogue, and learning prompts.
**Done when:** A new player can finish the story from start to Home Base in 10–15 minutes without developer intervention; wrong answers do not dead-end; scene reloads resume coherently.

### M3 — Rewards, replay, and polish
**Build:** Noah card, covenant badge, rainbow memento, completed timeline state, replay flow, hints, sound/mute, improved art and animations, save export/import/reset.
**Done when:** Completion rewards survive refresh and replay; backup import restores progress on another browser; mobile controls and layout remain usable.

### M4 — Quality, deployment, documentation
**Build:** Automated unit tests for save migration/validation, story registration, and quest transitions; smoke-test checklist; asset/license credits; README with local run and Pages deployment instructions; production deploy workflow.
**Done when:** Build and tests pass; manual iPhone Safari + desktop Chrome/Safari walkthroughs pass; refreshing mid-story works; no console errors or missing assets; GitHub Pages release is usable.

### M5 — Expansion template (after MVP ships)
**Build:** Documented `stories/_template/` with manifest, scene skeleton, dialogue/quest files, asset checklist, review checklist, and instructions for registering a new story.
**Done when:** A new sample story can be added, appears in timeline, loads, saves, and completes without modifying shared systems.

## 11. Test and acceptance checklist

**Core:** New game; Continue; continuous eight-direction movement; analog mobile control; NPC interaction; dialogue advance; objective updates; scene transition; return Home Base.

**Noah:** Every scene accessible in correct order; puzzles completable; representative animals discoverable; flood sequence accurate; covenant question gives feedback; rewards granted once; replay available.

**Persistence:** Refresh in N1/N3/N5; quit and reopen; export and import; invalid save rejected safely; reset confirmed; older saves handled when new stories are added; completing a new story never erases prior progress.

**Release:** Production asset URLs work on GitHub Pages subpath; no API keys/backend; audio respects browser autoplay restrictions; touch interactions work; loading/empty/error states are visible; third-party asset licenses documented.

## 12. Implementation instructions for coding agent

1. **Start with M0** and produce a running game, not just a design document. Use placeholders where needed.
2. Work milestone by milestone; run build/tests after each milestone and keep the game playable.
3. Implement reusable systems only when needed for the MVP; avoid premature abstractions.
4. Keep story content in structured files and scenes in isolated modules.
5. Preserve biblical accuracy, distinguish fiction from Scripture, and document sources/references.
6. Favor stable, simple controls and predictable progression over complex mechanics.
7. Update README with controls, architecture, run/build/deploy steps, and instructions for adding a story.
8. Before declaring MVP complete, verify the end-to-end user journey on mobile and desktop.

### First coding task

> Initialize the Vite + Phaser 3 project for Aaron's Bible Adventure. Implement the main menu, a small playable Home Base with a controllable Aaron, touch controls, a Bible Timeline overlay containing a playable Noah placeholder entry, and navigation back to Home Base. Add a versioned localStorage SaveManager scaffold, a data-driven StoryRegistry with a Noah manifest, a production build, and a GitHub Pages deployment workflow. Use properly licensed placeholder assets or simple original shapes. Run build/tests, document commands, and keep all systems ready for the five-scene Noah story.

---

**Definition of success:** Aaron can open a free hosted game on his phone, explore a fun Noah's Ark adventure, learn the story through gameplay, close the browser, return later without losing progress, and eventually explore new Bible stories added independently over time.
