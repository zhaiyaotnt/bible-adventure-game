// Flood puzzle verification: every stage must be solvable, must force
// its signature mechanisms, and must not be trivially short.
import assert from 'node:assert/strict';
import { STAGE1, STAGE2, STAGE3, solve, successors, cellClass } from '../src/stories/noah/flood.js';

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
  // The causeway alone works (block the middle islands + east gap route).
  const blockMid = new Set(['5,3', '5,4', '5,5', '8,3', '8,4', '8,5']);
  assert.ok(solve(STAGE3, { blockCells: blockMid }), 'stage 3 causeway route viable');
  // And with the causeway blocked, a water route still works.
  const blockCauseway = new Set(['2,3', '2,4', '3,5']);
  assert.ok(solve(STAGE3, { blockCells: blockCauseway }), 'stage 3 non-causeway route viable');
  console.log('stage 3 ok, shortest solution:', sol.actions.length, 'actions');
}
console.log('all flood tests passed');
