// Game 2 · build randomization. Per stage, a setup is rolled the first
// time the stage is drawn with nothing placed yet, then locked (in
// localStorage) as soon as any piece is placed, so leaving and coming
// back never reshuffles a stage in progress. A completed stage's setup
// is discarded, so a future replay rolls fresh.
//  Stage 1: each rib starts at a random tilt; tray slots are shuffled.
//  Stage 2/3: tray slots are shuffled (pieces must be found, not memorized).
import { shuffledIndices, pickOne } from '../../core/rng.js';

export const BUILD_SCRATCH_KEY = 'aaronAdventure.build.v1';
export const RIB_ANGLES = [Math.PI / 2, -Math.PI / 2, Math.PI];

const STAGE_PIECES = {
  1: ['keel', 'rib-a', 'rib-b'],
  2: ['pillar-mid', 'pillar-up', 'deck-lower', 'deck-middle', 'deck-upper'],
  3: ['seam-1', 'seam-2', 'seam-3', 'door', 'window'],
};

export function rollStageSetup(stage, rand = Math.random) {
  const ids = STAGE_PIECES[stage];
  const perm = shuffledIndices(ids.length, rand);
  const slots = {};
  ids.forEach((id, i) => { slots[id] = perm[i]; });
  const setup = { slots };
  if (stage === 1) {
    setup.angles = { 'rib-a': pickOne(RIB_ANGLES, rand), 'rib-b': pickOne(RIB_ANGLES, rand) };
  }
  return setup;
}

const isPermutation = (slots, ids) => {
  if (!slots || typeof slots !== 'object') return false;
  const values = ids.map(id => slots[id]);
  return values.every(v => Number.isInteger(v)) && [...values].sort((a, b) => a - b).every((v, i) => v === i);
};

export function normalizeStageSetup(stage, raw) {
  if (!raw || typeof raw !== 'object' || !isPermutation(raw.slots, STAGE_PIECES[stage])) return null;
  if (stage === 1) {
    const a = raw.angles;
    if (!a || !RIB_ANGLES.includes(a['rib-a']) || !RIB_ANGLES.includes(a['rib-b'])) return null;
  }
  return raw;
}

export function clearBuildScratch(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    target?.removeItem(BUILD_SCRATCH_KEY);
  } catch { /* storage unavailable */ }
}
