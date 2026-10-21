// The Ark Mystery (Chapter 1 · Game 3): a nine-room logic deduction.
// The clue set below was verified by exhaustive enumeration during
// development: it has exactly one solution, no six-clue subset solves it,
// and the intended arrangement below satisfies every clue plus Noah's
// final verification condition. tests/mystery.test.mjs re-verifies this
// against the shipped data on every test run.
//
// Cells:        A(0) B(1) C(2)   upper deck
//               D(3) E(4) F(5)   middle deck
//               G(6) H(7) I(8)   lower deck
export const CELLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
export const DECK_NAMES = ['Upper deck', 'Middle deck', 'Lower deck'];
export const ROOMS = [
  { id: 'bird', label: 'Bird Enclosure', short: 'Bird' },
  { id: 'sheep', label: 'Sheep Enclosure', short: 'Sheep' },
  { id: 'large', label: 'Large Animal Enclosure', short: 'Large animals' },
  { id: 'food', label: 'Food Storage', short: 'Food' },
  { id: 'water', label: 'Water Storage', short: 'Water' },
  { id: 'tools', label: 'Tool Room', short: 'Tools' },
  { id: 'workshop', label: 'Workshop', short: 'Workshop' },
  { id: 'living', label: 'Living Quarters', short: 'Living' },
  { id: 'supply', label: 'Supply Room', short: 'Supply' },
];
const row = i => Math.floor(i / 3), col = i => i % 3;
const corner = i => [0, 2, 6, 8].includes(i);
const dAbove = (p, a, b) => col(p[a]) === col(p[b]) && row(p[a]) + 1 === row(p[b]);
const above = (p, a, b) => col(p[a]) === col(p[b]) && row(p[a]) < row(p[b]);
const beside = (p, a, b) => row(p[a]) === row(p[b]) && Math.abs(col(p[a]) - col(p[b])) === 1;
const sameDeck = (p, a, b) => row(p[a]) === row(p[b]);

// Each clue: where it is found (source), the text the player reads, and
// the condition it states. `pos` maps room id -> cell index.
export const CLUES = [
  { id: 1, rooms: ['bird','food'], source: 'Deck diagram, upper deck', text: 'The bird enclosure sits directly above the food storage.', test: p => dAbove(p, 'bird', 'food') },
  { id: 2, rooms: ['food','large'], source: 'Planning note, middle deck', text: 'The food storage is above the large animal enclosure, in the same column.', test: p => above(p, 'food', 'large') },
  { id: 3, rooms: ['large'], source: 'Note under the crates, lower deck', text: 'The large animals are on the lowest deck, in a corner — their weight low and steady.', test: p => row(p['large']) === 2 && corner(p['large']) },
  { id: 4, rooms: ['sheep','bird'], source: 'Feed chart, middle deck', text: 'The sheep enclosure is below the bird enclosure, but not directly below it.', test: p => row(p['sheep']) > row(p['bird']) && !dAbove(p, 'bird', 'sheep') },
  { id: 5, rooms: ['living'], source: 'Carved note at the bunks, upper deck', text: 'Noah’s family sleeps in a corner of the upper deck.', test: p => row(p['living']) === 0 && corner(p['living']) },
  { id: 6, rooms: ['water','living'], source: 'Stencil on the water barrels, upper deck', text: 'Keep the water storage right beside the family’s quarters.', test: p => beside(p, 'water', 'living') },
  { id: 7, rooms: ['workshop'], source: 'Carpenter’s notebook, middle deck', text: 'The workshop belongs on the lowest deck, but not in a corner — Noah needs room to work.', test: p => row(p['workshop']) === 2 && !corner(p['workshop']) },
  { id: 8, rooms: ['tools','workshop','supply'], source: 'Tool wall chart, middle deck', text: 'The tool room shares a deck with the workshop, but must not sit beside the supply room.', test: p => sameDeck(p, 'tools', 'workshop') && !beside(p, 'tools', 'supply') },
  { id: 9, rooms: ['supply','tools'], source: 'Unfinished storage label, lower deck', text: '“SUPPLY — to be stored directly above the TOOL ROOM.”', test: p => dAbove(p, 'supply', 'tools') },
  { id: 10, rooms: ['sheep','food'], source: 'Tag on the feed sacks, middle deck', text: 'The sheep pen stands beside the food storage — a short carry at feeding time.', test: p => beside(p, 'sheep', 'food') },
  { id: 11, rooms: ['bird'], source: 'The torn diagram, pieced together', text: 'The bird enclosure catches the morning light — it stands in the left-hand column of the ark.', test: p => col(p['bird']) === 0 },
];
export const SOLUTION = { bird: 0, water: 1, living: 2, food: 3, sheep: 4, supply: 5, large: 6, workshop: 7, tools: 8 };
// Noah's final verification, revealed only after every clue condition is
// satisfied. It is consistent with the unique solution (verified), and
// checking it is the player's last step.
export const FINAL_CONDITION = {
  text: 'One last thing: the living quarters must not be directly above the workshop. My family will never sleep with hammering underneath them!',
  test: p => !dAbove(p, 'living', 'workshop'),
};
export const HINTS = [
  'Start with the tall stack: the deck diagram, the planning note and the note under the crates all talk about the same three rooms — birds, food and large animals share one column. The pieced-together diagram tells you which side of the ark that column is on.',
  'Follow the stack: the large animals sit in a corner of the lowest deck, the birds at the very top of the same column, food between them. That fixes the whole left column. Then the family’s corner bunk on the upper deck leaves only one neighbour for the water barrels.',
  'The workshop is forced into H, the middle of the lowest deck: the notebook puts it on the lowest deck but not in a corner, and H is the only such place. From there, the storage label and the tool chart settle the supply room and the tool room.',
];

// grid: { A:'bird', ... } (cell letter -> room id). Evaluate counts the
// clue conditions the current arrangement satisfies; an empty cell makes
// every condition that mentions its room unsatisfied.
export function evaluate(grid) {
  const pos = {};
  for (const [cell, room] of Object.entries(grid)) if (room) pos[room] = CELLS.indexOf(cell);
  const perClue = CLUES.map(c => c.rooms.every(r => r in pos) && !!c.test(pos));
  return { perClue, count: perClue.filter(Boolean).length, total: CLUES.length, complete: perClue.every(Boolean) && Object.keys(pos).length === 9 };
}
export function finalSatisfied(grid) {
  const pos = {};
  for (const [cell, room] of Object.entries(grid)) if (room) pos[room] = CELLS.indexOf(cell);
  return Object.keys(pos).length === 9 && FINAL_CONDITION.test(pos);
}

// Working state (arrangement, pencil marks, notes, inspect count, hints
// used) is scratch work, kept outside the main save — the save format
// only allows boolean quest flags, which hold the durable milestones
// (clues found, solved, completed) instead.
const KEY = 'aaronAdventure.arkMystery.v1';
export function loadMysteryState() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && typeof s === 'object' && s.grid) return { grid: {}, marks: {}, notes: '', checks: 0, hints: 0, ...s }; }
  } catch { /* storage unavailable: play without persistence */ }
  return { grid: {}, marks: {}, notes: '', checks: 0, hints: 0 };
}
export function saveMysteryState(state) {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
export function clearMysteryState() {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
