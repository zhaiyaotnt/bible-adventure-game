// Game 1 · authored supply-hunt locations. One candidate per supply is
// chosen for a fresh quest and saved for its duration. The clues identify
// a nearby landmark rather than pinning an exact position on the meadow.

export const SUPPLY_SCRATCH_KEY = 'aaronAdventure.supplies.v1';

export const SUPPLY_POOLS = {
  wood_1: [
    { x: 590, y: 730, name: 'Gather wood by the path', clue: 'Look along the winding path where it opens into the meadow.' },
    { x: 480, y: 790, name: 'Gather wood under the oak', clue: 'Search beneath the broad oak at the western edge of the clearing.' },
    { x: 690, y: 675, name: 'Gather wood by the path', clue: 'Search where the winding path bends around the grassy clearing.' },
    { x: 560, y: 620, name: 'Gather wood near the north grove', clue: 'Search the sunny grass just below the northern trees.' },
    { x: 720, y: 760, name: 'Gather wood by the flat stones', clue: 'Look near the flat stones beside the meadow path.' },
  ],
  wood_2: [
    { x: 905, y: 645, name: 'Search the east clearing', clue: 'Search the open clearing east of the ark path.' },
    { x: 985, y: 715, name: 'Search beside the stream path', clue: 'Look where the meadow path bends toward the stream.' },
    { x: 830, y: 585, name: 'Search the north grove', clue: 'Search the grove north of the meadow path.' },
    { x: 780, y: 760, name: 'Search the long meadow slope', clue: 'Look on the grassy slope below the ark.' },
    { x: 1060, y: 620, name: 'Search the stream path', clue: 'Follow the path east until the stream comes into view.' },
  ],
  rope_1: [
    { x: 1120, y: 660, name: 'Gather rope by the riverbank', clue: 'Search the bank where the path first meets the stream.' },
    { x: 1160, y: 720, name: 'Gather rope downstream', clue: 'Look along the stream’s near bank, a little downstream.' },
    { x: 1055, y: 595, name: 'Gather rope by the ford', clue: 'Search near the shallow crossing on the eastern path.' },
    { x: 1120, y: 790, name: 'Gather rope among the river stones', clue: 'Look for river stones just beyond the first bend.' },
    { x: 1240, y: 645, name: 'Gather rope beside the north bank', clue: 'Search beside the stream on the northern side of the crossing.' },
  ],
  rope_2: [
    { x: 1350, y: 970, name: 'Search the lower stepping stones', clue: 'Look where the stepping-stone crossing reaches its lower end.' },
    { x: 1270, y: 680, name: 'Search the upper stepping stones', clue: 'Search along the first part of the stepping-stone crossing.' },
    { x: 1290, y: 890, name: 'Search the bend in the stream', clue: 'Look near the stones where the crossing turns toward the far bank.' },
    { x: 1255, y: 750, name: 'Search the middle stones', clue: 'Search around the middle of the stepping-stone crossing.' },
    { x: 1325, y: 930, name: 'Search among the broad stones', clue: 'Look among the broad stones near the lower end of the crossing.' },
  ],
  tool_1: [
    { x: 680, y: 890, name: 'Find the construction hammer', clue: 'Search the southern grass, below the winding path.' },
    { x: 560, y: 850, name: 'Find the hammer by the workbench', clue: 'Look in the grass west of the ark’s work area.' },
    { x: 600, y: 935, name: 'Find the hammer in the south grass', clue: 'Search near the southern edge of the clearing.' },
    { x: 760, y: 910, name: 'Find the hammer by the rocks', clue: 'Look near the cluster of rocks south of the path.' },
    { x: 480, y: 900, name: 'Find the hammer beneath the trees', clue: 'Search the grass below the western trees.' },
  ],
  pitch: [
    { x: 1070, y: 875, name: 'Pick up the jar of pitch', clue: 'Search the bank where the meadow path bends toward the stream.' },
    { x: 1145, y: 930, name: 'Pick up the pitch by the stream', clue: 'Look beside the lower stream, near the water’s edge.' },
    { x: 1180, y: 855, name: 'Pick up the pitch near the bank', clue: 'Search the grassy bank just above the stepping stones.' },
    { x: 1105, y: 995, name: 'Pick up the pitch at the south bend', clue: 'Look near the southern bend in the stream.' },
    { x: 1260, y: 830, name: 'Pick up the pitch by the broad stones', clue: 'Search the near bank across from the broad river stones.' },
  ],
};

export const ITEM_OF_KEY = { wood_1: 'wood', wood_2: 'wood', wood_3: 'wood', rope_1: 'rope', rope_2: 'rope', tool_1: 'tool', pitch: 'pitch' };
export const LOG_SPOTS = [
  { id: 'clearing', x: 850, y: 820, clue: 'in the clearing' },
  { id: 'path', x: 920, y: 730, clue: 'beside the winding path' },
  { id: 'south', x: 760, y: 850, clue: 'in the southern grass' },
];
const HIDDEN_WOOD_OFFSET = { x: 50, y: 45 };
const DEFAULT_LOG_SPOT = LOG_SPOTS[0];
export const FIXED_SPOT = {
  key: 'wood_3', item: 'wood', x: DEFAULT_LOG_SPOT.x + HIDDEN_WOOD_OFFSET.x,
  y: DEFAULT_LOG_SPOT.y + HIDDEN_WOOD_OFFSET.y,
  name: 'Collect wood behind the fallen log', hidden: true,
  clue: 'One piece of wood is tucked beneath the fallen log in the clearing.',
};

const LOCATION_CLEARANCE = 118;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const separatedFrom = (candidate, chosen) => chosen.every(other => distance(candidate, other) >= LOCATION_CLEARANCE);

function shuffled(pool, rand) {
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Backtracking keeps every pickup far enough from the others and the log
// itself to read as its own search target.
export function chooseSupplySpots(rand = Math.random) {
  const keys = Object.keys(SUPPLY_POOLS);
  const selected = {};
  const order = shuffled(keys, rand);
  const place = (index, logSpot, placed) => {
    if (index === order.length) return true;
    const key = order[index];
    for (const candidate of shuffled(SUPPLY_POOLS[key], rand)) {
      if (!separatedFrom(candidate, placed)) continue;
      selected[key] = candidate;
      placed.push(candidate);
      if (place(index + 1, logSpot, placed)) return true;
      placed.pop();
      delete selected[key];
    }
    return false;
  };
  for (const logSpot of shuffled(LOG_SPOTS, rand)) {
    const hidden = hiddenWoodAt(logSpot);
    const placed = [{ x: logSpot.x, y: logSpot.y }, hidden];
    if (place(0, logSpot, placed)) return { ...selected, logSpot: logSpot.id };
  }
  // The authored pools are designed to admit a separated layout. Keep a
  // deterministic defensive fallback in case a future edit breaks that.
  return {
    logSpot: 'clearing',
    wood_1: SUPPLY_POOLS.wood_1[0], wood_2: SUPPLY_POOLS.wood_2[2],
    rope_1: SUPPLY_POOLS.rope_1[0], rope_2: SUPPLY_POOLS.rope_2[0],
    tool_1: SUPPLY_POOLS.tool_1[4], pitch: SUPPLY_POOLS.pitch[1],
  };
}

function hiddenWoodAt(logSpot) {
  return {
    key: 'wood_3', item: 'wood', x: logSpot.x + HIDDEN_WOOD_OFFSET.x,
    y: logSpot.y + HIDDEN_WOOD_OFFSET.y,
    name: 'Collect wood behind the fallen log', hidden: true,
    clue: `One piece of wood is tucked beneath the fallen log ${logSpot.clue}.`,
  };
}

const isSeparatedLayout = (spots, logSpot) => {
  const hidden = hiddenWoodAt(logSpot);
  const all = [...spots, hidden];
  const targetsClear = all.every((spot, i) => all.slice(i + 1).every(other => distance(spot, other) >= LOCATION_CLEARANCE));
  const logClear = spots.every(spot => distance(spot, logSpot) >= LOCATION_CLEARANCE);
  return targetsClear && logClear;
};

// Validate a stored roll by location, not by trusting serialized labels or
// clues. Older saves without clue fields remain valid and use current text.
export function spotsFromRoll(roll) {
  if (!roll || typeof roll !== 'object') return null;
  const logSpot = LOG_SPOTS.find(p => p.id === roll.logSpot) || (roll.logSpot === undefined ? DEFAULT_LOG_SPOT : null);
  if (!logSpot) return null;
  const out = [];
  for (const [key, pool] of Object.entries(SUPPLY_POOLS)) {
    const c = roll[key];
    if (!c || !pool.some(p => p.x === c.x && p.y === c.y)) return null;
    const authored = pool.find(p => p.x === c.x && p.y === c.y);
    out.push({ key, item: ITEM_OF_KEY[key], x: authored.x, y: authored.y, name: authored.name, clue: authored.clue });
  }
  // Old scratch rolls have no logSpot field. Preserve their locations and
  // treat the log as the original clearing placement; new rolls are checked
  // against the selected log as well as one another.
  if (roll.logSpot !== undefined && !isSeparatedLayout(out, logSpot)) return null;
  out.push(hiddenWoodAt(logSpot));
  return out;
}

export function clearSupplyScratch(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    target?.removeItem(SUPPLY_SCRATCH_KEY);
  } catch { /* storage unavailable */ }
}
