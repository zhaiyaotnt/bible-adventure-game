# Aaron’s Bible Adventure — Gameplay & Educational Design Specification

Purpose: Convert the Noah’s Ark walk-and-press-E prototype into a replayable 10–15 minute, direct-control 2.5D Bible adventure for ages 7–9. Supplements `AARON_BIBLE_ADVENTURE_PLAN.md`.

**Product promise:** Aaron is a playable 2.5D Bible adventure—not a tap-through storybook, a click-to-move game, or a trivia app with walking between questions.

## 1. Product principles

- **Fun comes from agency**: Players explore, make decisions, solve problems, receive feedback, and discover surprises. Pressing E is an interaction trigger, never the entire challenge.
- **Movement must feel like play**: The player directly steers Aaron at all times. On touch, Aaron follows a continuous virtual thumbstick vector and stops when the thumb is released. Tapping the scenery must never send him walking in a straight line to that point.
- **Learning is embedded**: Use Explore → Learn → Apply → Succeed. Biblical information should help solve an in-world problem, rather than appearing only as a quiz after an unrelated activity.
- **Scriptural fidelity**: Aaron is a fictional observer and participant in clearly imagined side activities. Do not depict him as the cause of Noah’s salvation, the one who brings animals into the ark, or the person who changes recorded events.
- **Avoid compulsive mechanics**: No streaks, random loot boxes, or XP grinding. Replay should come from enjoyable challenges, optional discoveries, and mastery.

## 2. Non-negotiable 2.5D movement contract

The game uses a three-quarter, top-down world with layered depth—not a side-scroller and not full 3D. “2.5D” means illustrated 2D characters and environments move believably through foreground/background depth lanes.

### Direct control

- **Phone/tablet**: A floating or fixed analog thumbstick supplies a continuous 360-degree movement vector. Distance from the stick center controls speed after a small dead zone. Releasing the stick stops Aaron promptly.
- **Desktop**: WASD and arrow keys provide the same movement system at full speed. Space, Enter, or E interacts.
- **Eight-direction movement**: Aaron can travel and face north, northeast, east, southeast, south, southwest, west, and northwest. Diagonal input is normalized so it is not faster than cardinal movement.
- **No tap-to-walk**: A tap on the world may inspect a deliberately tappable object, but it may not set a movement destination or path. Dragging a puzzle object must never also move Aaron.
- **Responsive feel**: Use light acceleration and quicker deceleration, without ice-like drift. Target approximately 160–180 world pixels/second at full input, then tune through phone playtests.

### World depth and collision

- Aaron’s feet—not his full painted silhouette—define his collision point. Tree canopies, ark beams, and foreground foliage may overlap his upper body while trunks, walls, rocks, and water edges block his feet.
- Depth sorting follows Aaron’s foot Y position. Props and NPCs sort from their ground-contact point so Aaron can walk naturally in front of or behind them.
- Collision must slide along an open axis rather than stopping all motion. Winding paths need smooth, forgiving boundaries; avoid invisible rectangular walls that contradict the art.
- The camera follows with restrained smoothing, keeps the next landmark visible where practical, and never magnifies the scene until mobile controls cover the route.

### Mobile acceptance tests

- From the same starting point, hold the stick in all eight directions; Aaron travels in the matching screen direction every time.
- Draw a circle with the thumb; Aaron turns continuously without snapping to a distant target.
- Hold a 45-degree diagonal for three seconds; distance travelled is within 5% of three seconds of cardinal movement at the same stick magnitude.
- Release at full speed; Aaron comes to rest quickly and does not keep walking.
- Drag the fallen-log puzzle and tap empty terrain; neither action changes Aaron’s destination.
- Slide diagonally into a tree, riverbank, or ark edge; Aaron continues along the unblocked axis without jittering through the collider.
- Verify in both portrait and landscape on a current iPhone-sized viewport, with the HUD, stick, Explore button, and dialogue never obscuring the active route.

## 3. Core gameplay loop

- **Explore**: Enter an area with at least one visible goal and one optional mystery. Discover clues, routes, and interactive objects.
- **Learn**: Receive concise information through Noah’s dialogue, environmental clues, and a Bible Journal entry with Scripture references.
- **Apply**: Use that information in a puzzle, navigation challenge, tracking activity, or story-sequencing task.
- **Feedback**: Provide immediate animation/audio feedback, a clear objective update, and an optional journal discovery.
- **Progress**: Unlock the next scene while retaining completed quests, collectibles, and replay access.

## 4. Noah’s Ark: playable story outline

- **Scene 1 — The Mysterious Ark (2 min)**: Explore the forest/meadow, navigate around obstacles, find Noah and the ark. Learning: God commanded Noah to build the ark (Genesis 6:13–22).
- **Scene 2 — The Ark Blueprint (3 min)**: Find blueprint clues and solve a 2–3-stage drag/rotate construction puzzle. Include the three decks and other details supported by Genesis 6:14–16. This is a simplified learning puzzle, not a claim Aaron built the biblical ark.
- **Scene 3 — Animal Tracks (3 min)**: Follow tracks and sounds, identify hidden or moving animals, and complete distinct tracking challenges. Learning: Genesis 6:19–20 and 7:2–3; do not imply every category had the same count or that Aaron brought animals to Noah.
- **Scene 4 — The Great Flood (2 min)**: A short interactive navigation sequence leads Aaron to a safe observation point, followed by a cinematic showing rain, the ark, and rising water. Learning: judgment and preservation (Genesis 7–8). Avoid treating the flood as a lighthearted disaster race.
- **Scene 5 — The Rainbow Promise (2 min)**: Explore the changed landscape and uncover the covenant sign. Learning: God’s covenant promise in Genesis 9:8–17; do not imply the rainbow means no further rain or flooding anywhere.
- **Scene 6 — Story Challenge (2 min)**: At Home Base, arrange 4–6 key story events in sequence and answer up to three concise comprehension questions. Allow retries and explanations without punitive failure.

## 5. Specific mechanics and acceptance tests

- **World exploration**: Map larger than viewport, camera follow, direct eight-direction movement, foot-based depth sorting, meaningful collision, irregular paths, 2+ discoverable optional details. No quest is solved solely by tapping a glowing marker.
- **Ark puzzle**: Touch/mouse drag-and-drop; at least two genuinely different puzzle steps; reset and hint; visual progress; keyboard alternative if practical.
- **Animal tracking**: At least three animals with different clues or behavior; tracking requires observing and inferring, not merely pressing E on each animal.
- **Quest system**: Objectives with explicit conditions, intermediate progress, retry support, and no accidental double rewards.
- **Presentation**: Compact HUD, readable dialogue portraits, brief age-appropriate lines, clear quest feedback, sound toggle, accessible tap targets, a continuous analog movement stick, and mobile landscape/portrait behavior tested.
- **Persistence**: Save current story/scene, quest step, puzzle progress or safe restart point, discoveries, rewards, and replay state; verify after browser restart.

## 6. Educational framework

- **Layer 1 — Biblical facts**: Who Noah was; why the ark was commanded; basic ark features; what the flood represented; what the rainbow signified.
- **Layer 2 — Biblical connections**: Journal links Noah’s covenant to later stories of Abraham, Moses, David, and the fulfillment of God’s redemptive purposes in Christ, without flattening differences between covenants.
- **Layer 3 — Biblical understanding**: Emphasize human sin, God’s righteous judgment, grace, Noah’s faithful response, preservation, and God’s covenant faithfulness. Avoid reducing the lesson to “be good like Noah.”
- **Three outcomes**: At the end, the player should explain (1) why Noah built the ark, (2) why the flood came and how Noah’s family was preserved, and (3) what God promised with the rainbow.
- **Parent Mode**: Offer optional discussion prompts: “Why did Noah build the ark?”, “What does the flood show us about God?”, “What did God promise after the flood?” No mandatory long quiz.

## 7. Competitive direction and mechanic references

Research checked October 21, 2026 shows a useful opening between Bible quiz/activity collections and expensive full-3D adventures. Aaron should own that middle: a polished, child-safe 2.5D story adventure where learning happens through steering, observing, helping, arranging, matching, and choosing.

- **Guardians of Ancora** is the closest control and exploration reference: traversal, discovery, story quests, and rewards make learning feel embodied. Aaron should match its sense of direct physical agency while using a gentler three-quarter perspective.
- **Lightgliders** demonstrates the value of player identity, a welcoming home hub, mission variety, and reasons to return. Adapt outfits, satchel items, room mementos, and optional discoveries; do not add multiplayer to the Noah MVP.
- **Bible App for Kids** shows how retelling can vary across scene exploration, ordering, matching, coloring, and reconstruction. Use this variety instead of repeating multiple-choice questions.
- **Heroes 2** makes assists reinforce the story. Aaron’s hints should have thematic names and effects—for example, “Lamp to My Feet” briefly reveals an interactable—rather than generic power-ups.
- **Bible Quest Kids** demonstrates visible chapter mastery and real-world family prompts. Adapt chapter maps and parent discussion prompts, but reject daily streak pressure and generic currency grinding.
- **Gate Zero** and **The Anointed** show the appeal of witnessing biblical history through exploration and story-specific verbs. Their combat, complexity, and scope are not the target for ages 7–9.

Official references: [Guardians of Ancora](https://guardiansofancora.com/bible-game-for-children-and-kids/), [Lightgliders](https://www.lightgliders.com/about), [Bible App for Kids](https://www.youversion.com/bible-app-for-kids), [Bible Quest Kids](https://biblequestkids.com/), [Heroes 2](https://www.heroesbibletrivia.org/en/heroes-home/), [Gate Zero](https://gatezero.game/), and [The Anointed](https://store.steampowered.com/app/1942530/The_Anointed_David_Saves_Keilah/).

## 8. Replay and progression

- **First playthrough**: Drive engagement through exploration, varied puzzles, story suspense, discovery, and satisfying completion.
- **Replay**: Unlock direct minigame replay, optional secrets, difficulty variants, personal bests for non-sensitive challenges, and richer character/journal discoveries.
- **Rewards**: Explorer XP, Noah character card, covenant badge, story timeline entry. Never numerically score holiness, faith, or obedience.

## 9. Development order

- **Phase 0 — Control proof**: Lock direct analog movement, eight-direction facing, camera follow, depth sorting, collider sliding, draggable-object isolation, and portrait/landscape layout on a real phone-sized viewport. Do not add more content until movement feels correct.
- **Phase A — Vertical slice**: Build and polish the Ark Blueprint loop end to end: find a clue → learn a biblical detail → apply it in a playable puzzle → receive feedback → save progress. Verify on desktop and phone.
- **Phase B — Exploration**: Make Noah’s Meadow genuinely explorable and add the animal tracking activity; ensure every area has a reason to visit.
- **Phase C — Narrative**: Integrate flood and covenant scenes, short dialogue, Scripture-linked journal, and final story sequencing.
- **Phase D — Polish and test**: Add audio/animation, mobile UX, hints, replay, accessibility, save/load tests, and 2–3 child playtests. Measure completion time and points of confusion.

## 10. Definition of done

- **Gameplay**: A first-time player spends roughly 10–15 minutes, solves at least two mechanically distinct challenges, can make meaningful choices, and cannot finish by pressing E at a few locations.
- **Learning**: Each scene has a clear Scripture reference and one learning outcome; at least one puzzle requires using a learned fact; end-of-story review verifies the three target outcomes.
- **Quality**: No blocking bugs, save survives restart, replay does not duplicate rewards, continuous touch movement passes every Section 2 mobile test on iPhone-sized portrait and landscape viewports, and UI does not cover the playable route.
- **Extension**: Future stories can reuse quest, dialogue, puzzle, discovery, journal, and save interfaces without rewriting the Noah implementation.

## Codex execution instruction

Read this spec alongside `VISUAL_DESIGN.md` and `AARON_BIBLE_ADVENTURE_PLAN.md`. Phase 0 is the first gate; Phase A follows only after direct movement passes its phone tests. Run and test actual gameplay, report evidence and gaps, and do not add more stories until the vertical slice works.
