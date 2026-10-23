// Game 1 · supply hunt randomization. Each supply (except the wood
// tucked behind the fallen log — that hiding spot is a designed beat)
// has a small pool of sensible meadow locations. One spot per item is
// chosen when a supply quest starts and persisted in localStorage, so
// re-entering the meadow never reshuffles under the player's feet; the
// roll is cleared when the quest completes (and on a new adventure).

export const SUPPLY_SCRATCH_KEY = 'aaronAdventure.supplies.v1';

export const SUPPLY_POOLS = {
  wood_1: [
    { x: 590, y: 730, name: 'Gather wood by the path' },
    { x: 480, y: 790, name: 'Gather wood under the oak' },
    { x: 690, y: 675, name: 'Gather wood by the fence' },
  ],
  wood_2: [
    { x: 905, y: 645, name: 'Search the forest clearing' },
    { x: 985, y: 715, name: 'Search the east clearing' },
    { x: 830, y: 585, name: 'Search the north grove' },
  ],
  rope_1: [
    { x: 1120, y: 660, name: 'Gather rope by the riverbank' },
    { x: 1200, y: 720, name: 'Gather rope downstream' },
    { x: 1055, y: 595, name: 'Gather rope by the ford' },
  ],
  rope_2: [
    { x: 1370, y: 790, name: 'Search the far riverbank' },
    { x: 1310, y: 700, name: 'Search the bend in the stream' },
    { x: 1400, y: 870, name: 'Search the south bank' },
  ],
  tool_1: [
    { x: 680, y: 890, name: 'Find the construction hammer' },
    { x: 560, y: 850, name: 'Find the hammer by the workbench' },
    { x: 600, y: 935, name: 'Find the hammer in the south grass' },
  ],
  pitch: [
    { x: 1070, y: 875, name: 'Pick up the jar of pitch' },
    { x: 1145, y: 930, name: 'Pick up the pitch by the stream' },
    { x: 1180, y: 855, name: 'Pick up the pitch near the bank' },
  ],
};

export const ITEM_OF_KEY = { wood_1: 'wood', wood_2: 'wood', wood_3: 'wood', rope_1: 'rope', rope_2: 'rope', tool_1: 'tool', pitch: 'pitch' };
export const FIXED_SPOT = { key: 'wood_3', item: 'wood', x: 900, y: 865, name: 'Collect wood behind the fallen log', hidden: true };

// Choose one candidate per pool key. `rand` is injectable for tests.
export function chooseSupplySpots(rand = Math.random) {
  const chosen = {};
  for (const [key, pool] of Object.entries(SUPPLY_POOLS)) {
    chosen[key] = pool[Math.floor(rand() * pool.length)];
  }
  return chosen;
}

// Validate a stored roll: every pool key must map to one of its own
// candidates (exact position match). Returns the spots array in the
// scene's materialSpots() shape, or null if anything is off.
export function spotsFromRoll(roll) {
  if (!roll || typeof roll !== 'object') return null;
  const out = [];
  for (const [key, pool] of Object.entries(SUPPLY_POOLS)) {
    const c = roll[key];
    if (!c || !pool.some(p => p.x === c.x && p.y === c.y)) return null;
    out.push({ key, item: ITEM_OF_KEY[key], x: c.x, y: c.y, name: pool.find(p => p.x === c.x && p.y === c.y).name });
  }
  out.push({ ...FIXED_SPOT });
  return out;
}

export function clearSupplyScratch(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    target?.removeItem(SUPPLY_SCRATCH_KEY);
  } catch { /* storage unavailable */ }
}
