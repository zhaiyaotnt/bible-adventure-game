import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES, SOLUTION, FINAL_CONDITION, evaluate, finalSatisfied, CELLS, ROOMS, createMysteryRun } from '../src/stories/noah/mystery.js';

// Exhaustive check: the shipped clue set must have exactly one solution —
// the intended arrangement — and it must pass Noah's final condition.
function allSolutions(clues) {
  const sols = []; const pos = {}; const used = new Set();
  const ids = ROOMS.map(r => r.id);
  (function bt(i) {
    if (i === ids.length) { if (clues.every(c => c.test(pos))) sols.push({ ...pos }); return; }
    for (let cell = 0; cell < 9; cell++) { if (used.has(cell)) continue; used.add(cell); pos[ids[i]] = cell; bt(i + 1); used.delete(cell); }
  })(0);
  return sols;
}
test('ark mystery clue set has exactly one solution, the intended one', () => {
  const sols = allSolutions(CLUES);
  assert.equal(sols.length, 1);
  assert.deepEqual(sols[0], SOLUTION);
});
test('no subset of six clues already solves the mystery', () => {
  const idx = CLUES.map((_, i) => i);
  const pick = (arr, k, s = 0, acc = [], out = []) => { if (acc.length === k) { out.push([...acc]); return out; } for (let i = s; i < arr.length; i++) { acc.push(arr[i]); pick(arr, k, i + 1, acc, out); acc.pop(); } return out; };
  for (const sub of pick(idx, 6)) assert.notEqual(allSolutions(sub.map(i => CLUES[i])).length, 1, `subset ${sub} must not uniquely solve`);
});
test('intended arrangement satisfies every clue and the final condition', () => {
  const grid = {}; for (const [room, idx] of Object.entries(SOLUTION)) grid[CELLS[idx]] = room;
  const result = evaluate(grid);
  assert.equal(result.count, result.total);
  assert.equal(result.complete, true);
  assert.equal(finalSatisfied(grid), true);
  assert.equal(FINAL_CONDITION.test(SOLUTION), true);
});
test('empty and partial plans do not complete', () => {
  assert.equal(evaluate({}).complete, false);
  assert.equal(evaluate({ A: 'bird', D: 'food' }).complete, false);
});
test('seeded puzzle runs keep clues fair and produce different room arrangements', () => {
  const a = createMysteryRun(101), b = createMysteryRun(202);
  for (const run of [a, b]) {
    assert.equal(run.clues.length, CLUES.length);
    assert.ok(run.clues.every(c => c.test(run.solution)));
    assert.ok(run.condition.test(run.solution));
    const grid = Object.fromEntries(CELLS.map((cell, i) => [cell, ROOMS.find(r => run.solution[r.id] === i)?.id]));
    assert.equal(evaluate(grid, run.clues).complete, true);
    assert.equal(finalSatisfied(grid, run.condition), true);
  }
  assert.notDeepEqual(a.solution, b.solution);
  assert.notEqual(a.clues[0].text, b.clues[0].text);
});
