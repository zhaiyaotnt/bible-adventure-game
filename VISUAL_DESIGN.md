# Visual Direction — Aaron’s Bible Adventure

## Visual thesis

**A warm, hand-painted storybook world with the spatial readability and direct control of a polished 2.5D adventure game.** The environment should feel sunlit, abundant, and full of discoverable detail; characters should feel expressive and alive without becoming toy-like or chibi.

**I no longer want pixel art.** The current large-pixel, blocky, geometric style looks too simplistic and does not match the quality I want.

The target is a **beautiful, hand-painted 2.5D cartoon adventure RPG**, combining a cozy illustrated environment with expressive, recognizable cartoon characters and clear foreground/background depth.

This is not a webpage decorated with an illustration. Once play begins, the painted world is the full-canvas experience; the HUD floats lightly above it and gets out of the way.

### Visual requirements

1. Replace pixel-art characters, trees, terrain, buildings, and objects with polished, non-pixelated 2D illustrations.
2. Use one fixed three-quarter top-down perspective suitable for RPG exploration. The ground plane, ark, riverbanks, characters, props, and collision all need to agree on that angle.
3. Create natural-looking forests, winding paths, detailed vegetation, water, rocks, and environmental decorations.
4. Redesign Noah's Ark as a large, visually impressive wooden structure with detailed textures.
5. Give Aaron and Noah recognizable cartoon designs, eight readable facing directions, smooth idle/walk animations, grounded foot contact, and expressive dialogue portraits. Aaron’s rust tunic, teal sash, sandals, and explorer satchel form his persistent silhouette.
6. Use consistent lighting, color palettes, outlines, and proportions across all assets.
7. Use high-resolution transparent PNG or WebP sprites with smooth rendering. Disable pixel-art rendering settings where appropriate.
8. Keep the environment readable and collision boundaries clear without painting artificial outlines around every walkable route. Use path contrast, vegetation edges, rocks, fences, shadows, and water banks to explain boundaries naturally.
9. Preserve all existing gameplay, quests, saves, and story architecture.

## Camera, scale, and depth rules

- Design the exploration view for a 16:9 landscape canvas first, then prove that portrait cropping preserves the active route and the next landmark.
- Show enough world around Aaron for the player to choose where to explore. Aaron should occupy roughly 9–13% of the short screen dimension during normal play—not portrait-sized and not tiny against an unreadable map.
- The environment uses three layers: **ground** (paths, grass, water), **actors** (feet-sorted characters and props), and **foreground canopy** (branches, leaves, beams, and grasses that can pass over Aaron’s upper body).
- Sort actors from their ground-contact Y coordinate. Painted transparent padding must not affect depth.
- Camera motion is calm and slightly eased. Avoid aggressive zoom, screen shake, parallax that makes steering ambiguous, or an angle shift between scenes.
- Paths may curve and branch. Avoid placing the destination directly above the spawn every time; encourage lateral and diagonal exploration.

## Character animation requirements

- Aaron requires eight facings: N, NE, E, SE, S, SW, W, NW.
- Minimum production set per facing: 1 idle pose plus a 4–6 frame walk cycle. Add subtle idle breathing only after movement silhouettes read correctly.
- Feet must not skate. Keep the planted foot stable during each contact frame and tune animation speed to world movement speed.
- Direction follows the current movement vector, including the analog thumbstick. On release, Aaron keeps the last facing and returns to idle.
- Dialogue portraits are separate high-resolution illustrations, not enlarged gameplay sprites or CSS-built faces.
- Noah and future NPCs use the same outline weight, light direction, facial language, and body-proportion system as Aaron.

## Environment readability

- Important routes use a value and hue contrast that remains clear under the translucent HUD.
- Interactables should be recognizable from silhouette, placement, motion, or a restrained ambient glint. Do not cover the meadow in glowing markers.
- The ark is the dominant landmark: visible early, larger than surrounding structures, detailed enough to reward approach, and never reduced to a flat brown rectangle.
- Water must look like a boundary before collision occurs. Traversable stones, bridges, and shallows need a clear visual grammar.
- Reserve the brightest warm gold for story focus, interaction feedback, and covenant moments. Do not spread it across every prop.

## UI relationship to the world

- The first playable frame is the world, not a dashboard. Use a compact location/objective strip, one Explore button, one analog movement stick on touch, and temporary contextual prompts.
- Controls must occupy calm corners and remain visually subordinate to the environment. On desktop, hide the movement stick.
- Dialogue may pause exploration and use one substantial illustrated portrait; routine prompts should not open card stacks.
- UI uses two type families maximum, one warm-gold action accent, soft parchment for dialogue, and deep green for translucent chrome.
- Remove pixel-art rendering declarations. Canvas, sprites, portraits, and UI art use smooth antialiasing.

## Asset strategy

Prioritize a small coherent asset family over mixing individually attractive packs. Properly licensed, non-pixel-art 2D RPG assets from itch.io, CraftPix, Kenney, and OpenGameArt may support vegetation, props, UI, and effects only when their perspective and rendering match the approved proof of concept.

Use AI-generated artwork for custom Bible characters, Noah’s Ark, and story-specific assets when suitable, but treat generated sheets as concepts until transparency, perspective, frame consistency, foot placement, and animation loops are verified in-engine.

Do not replace pixel art with generic Phaser/CSS geometry, emoji, enlarged low-resolution sprites, or a single flat background that cannot support accurate depth and collision.

Every shipped external or generated asset needs an entry in `ASSET_CREDITS.md` with source, creator/tool, license or generation note, allowed use, and any required attribution.

## Visual proof of concept gate

Before converting the entire game, create one small **playable visual proof of concept** showing:

- Aaron
- Noah
- A detailed section of forest
- A path and river
- Part of Noah's Ark
- A dialogue portrait
- Eight-direction analog movement with correct facing
- Foreground overlap and foot-based depth sorting
- Natural collision against a tree, rock, ark edge, and riverbank
- The mobile thumbstick and Explore control in both portrait and landscape

Use this to establish a consistent art style before replacing the remaining assets. The proof is approved only if:

1. Aaron’s proportions and perspective match Noah, the ark, and the world.
2. A child can tell where Aaron may walk without testing invisible walls.
3. Aaron can pass convincingly in front of and behind at least two objects.
4. No pixelated rendering, CSS character anatomy, emoji art, or mixed asset styles remain in the proof area.
5. The phone controls do not hide Aaron, the current interaction, or the visible route.
6. Movement direction matches the thumbstick in all eight sectors and empty-world taps do nothing.

## Explicitly out of direction

- Pixel art, voxel art, flat vector cutouts, or blocky procedural geometry as final scene art
- A single perspective-painted background with collisions that visibly disagree with the image
- Isometric diamond-grid movement; Aaron must steer freely, not hop between tiles
- Tap-to-walk, click-to-path, or automatic movement toward quest markers
- Oversized HUD panels, card mosaics, quest-marker clutter, and tutorial text covering the world
- Hyper-saturated mobile-game gloss, generic fantasy armor, or historically careless “Bible costume” mashups
- Combat-first progression, generic coins, loot boxes, streak pressure, or scoring faith/obedience

The goal is a visually appealing children’s adventure game that feels authored, explorable, and respectful—not a pixel-art prototype, a webpage with decorative illustrations, or a quiz app wearing an RPG skin.

