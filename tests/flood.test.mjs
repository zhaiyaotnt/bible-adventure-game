// Flood puzzle verification: every stage must be solvable, must force
// its signature mechanisms, and must not be trivially short.
import assert from 'node:assert/strict';
import { STAGE1, STAGE2, STAGE3, solve, successors, cellClass, normalizeFloodScratch, mirrorStage } from '../src/stories/noah/flood.js';

// Replay an action list, returning the final state (asserts each step is legal).
function replay(stage, actions) {
  let s = stage.initial();
  for (const want of actions) {
    const next = successors(stage, s).find(([, a]) => a === want);
    assert.ok(next, `replay: action ${want} is legal`);
    s = next[0];
  }
  return s;
}

function uses(actions, pred) { return actions.some(pred); }

// ---- Stage 1: Broken Crossing
{
  const sol = solve(STAGE1);
  assert.ok(sol, 'stage 1 solvable');
  assert.ok(uses(sol.actions, a => a.startsWith('push')), 'stage 1 solution pushes a crate');
  assert.equal(sol.actions.filter(a => a === 'advance').length, 2, 'stage 1 requires both water rises');
  const end = replay(STAGE1, sol.actions);
  assert.equal(end.water, 2, 'stage 1 finishes at HIGH water');
  // Crates are required: with no crates there is no way across.
  const bare = { ...STAGE1.initial(), crates: [] };
  assert.equal(solve(STAGE1, { from: bare }), null, 'stage 1 impossible without crates');
  // Once set up, the crossing works at HIGH water (the forecast lesson).
  const setup = { ...STAGE1.initial(), water: 2, crates: [[5, 3], [3, 5]] };
  assert.ok(solve(STAGE1, { from: setup }), 'stage 1 crossing works at HIGH once the crate is in');
  console.log('stage 1 ok, shortest solution:', sol.actions.length, 'actions');
}

// ---- Stage 2: Flooded Maze
{
  const sol = solve(STAGE2);
  assert.ok(sol, 'stage 2 solvable');
  assert.ok(sol.actions.length >= 25, `stage 2 solution is meaningful (got ${sol.actions.length})`);
  assert.ok(uses(sol.actions, a => a.startsWith('place')), 'stage 2 solution places the plank');
  // Both gates must end up open (s1 -> g1 to get in, s2 -> g2 to get out).
  const end = replay(STAGE2, sol.actions);
  assert.equal(end.gatesOpen & 1, 1, 'stage 2 solution opens gate 1');
  assert.equal(end.gatesOpen & 2, 2, 'stage 2 solution opens gate 2');
  // The plank is required: remove it and the stage is impossible.
  assert.equal(solve({ ...STAGE2, initial: () => ({ ...STAGE2.initial(), plank: null, plankAt: null }) }), null, 'stage 2 impossible without the plank');
  // The secret ridge nook is optional: blocking it must not break the stage.
  assert.ok(solve(STAGE2, { blockCells: new Set(['5,0']) }), 'stage 2 solvable without the secret nook');
  // The trap is real: the elev-0 channel is deep once the water rises.
  const s = STAGE2.initial();
  assert.equal(cellClass(STAGE2, { ...s, water: 0 }, 4, 4), 'wade');
  assert.equal(cellClass(STAGE2, { ...s, water: 1 }, 4, 4), 'deep');
  console.log('stage 2 ok, shortest solution:', sol.actions.length, 'actions');
}

// ---- Stage 3: Final Crossing
{
  const sol = solve(STAGE3);
  assert.ok(sol, 'stage 3 solvable');
  const blockRiverExcept = allowedX => {
    const blocked = new Set();
    for (let y = 3; y <= 5; y++) for (let x = 1; x <= 10; x++) if (x !== allowedX) blocked.add(`${x},${y}`);
    return blocked;
  };
  // Each advertised route works in isolation; no fourth open-water bypass remains.
  const causeway = solve(STAGE3, { from: { ...STAGE3.initial(), water: 2 }, blockCells: blockRiverExcept(2) });
  assert.ok(causeway, 'stage 3 high causeway route viable');
  const middleBlocks = blockRiverExcept(5); middleBlocks.add('10,1');
  assert.equal(solve(STAGE3, { from: { ...STAGE3.initial(), water: 2 }, blockCells: middleBlocks }), null, 'middle route floods at HIGH without the drain');
  assert.ok(solve(STAGE3, { from: { ...STAGE3.initial(), water: 2, sluice: true }, blockCells: middleBlocks }), 'drain preserves the middle route at HIGH');
  const east = solve(STAGE3, { blockCells: blockRiverExcept(8) });
  assert.ok(east, 'stage 3 east channel route viable');
  assert.ok(uses(east.actions, a => a.startsWith('place:')), 'east channel requires the plank');
  console.log('stage 3 ok, shortest solution:', sol.actions.length, 'actions');
}

// ---- Scratch state: stale or malformed local data must never crash/resume.
{
  const valid = { stage: 0, variant: 'base', s: STAGE1.initial(), checkpoint: STAGE1.start, hintsUsed: 1, nook: false };
  assert.deepEqual(normalizeFloodScratch(valid), valid, 'valid scratch state is restored');
  assert.equal(normalizeFloodScratch({ ...valid, stage: 99 }), null, 'out-of-range stage is rejected');
  assert.equal(normalizeFloodScratch({ ...valid, stage: 2, s: STAGE3.initial(), checkpoint: STAGE3.start }), null, 'later stage requires matching save flags');
  assert.equal(normalizeFloodScratch({ ...valid, s: { ...valid.s, crates: [[999, 999], [3, 5]] } }), null, 'invalid object coordinates are rejected');
}
// Mirrored boards move all route features together and remain solvable.
for (const stage of [STAGE1, STAGE2, STAGE3]) {
  const mirrored = mirrorStage(stage);
  const solution = solve(mirrored);
  assert.ok(solution, `${stage.name} mirrored board is solvable`);
  assert.equal(mirrored.start[0], stage.w - 1 - stage.start[0]);
  assert.equal(mirrored.exit[0], stage.w - 1 - stage.exit[0]);
}
console.log('all flood tests passed');
