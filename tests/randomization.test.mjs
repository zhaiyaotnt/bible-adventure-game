import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, shuffledIndices } from '../src/core/rng.js';
import { SUPPLY_POOLS, chooseSupplySpots, spotsFromRoll } from '../src/stories/noah/supplySpots.js';
import { RIB_ANGLES, rollStageSetup, normalizeStageSetup } from '../src/stories/noah/buildSetup.js';

test('rng · mulberry32 is deterministic and shuffles are permutations', () => {
  const a = mulberry32(42), b = mulberry32(42);
  assert.equal(a(), b());
  const perm = shuffledIndices(6, mulberry32(7));
  assert.deepEqual([...perm].sort((x, y) => x - y), [0, 1, 2, 3, 4, 5]);
});

test('supplies · a roll picks one candidate per pool and validates', () => {
  const chosen = chooseSupplySpots(mulberry32(3));
  for (const [key, pool] of Object.entries(SUPPLY_POOLS)) {
    assert.ok(pool.some(p => p.x === chosen[key].x && p.y === chosen[key].y), key);
  }
  const spots = spotsFromRoll(chosen);
  assert.equal(spots.length, 7);
  assert.ok(spots.find(s => s.key === 'wood_3' && s.hidden)); // the log beat stays fixed
  assert.equal(spotsFromRoll({ ...chosen, pitch: { x: 1, y: 1 } }), null); // tampered
  assert.equal(spotsFromRoll({ wood_1: chosen.wood_1 }), null); // incomplete
  assert.equal(spotsFromRoll(null), null);
});

test('supplies · different seeds explore the pools', () => {
  const picks = new Set();
  for (let seed = 1; seed <= 24; seed++) picks.add(chooseSupplySpots(mulberry32(seed)).wood_1.x);
  assert.ok(picks.size >= 2, `only saw ${[...picks]}`);
});

test('build · stage setups are valid permutations with legal rib angles', () => {
  for (const stage of [1, 2, 3]) {
    const setup = rollStageSetup(stage, mulberry32(stage * 10));
    assert.equal(normalizeStageSetup(stage, setup), setup);
    assert.equal(normalizeStageSetup(stage, { ...setup, locked: true })?.slots, setup.slots);
  }
  const s1 = rollStageSetup(1, mulberry32(5));
  assert.ok(RIB_ANGLES.includes(s1.angles['rib-a']) && RIB_ANGLES.includes(s1.angles['rib-b']));
  const broken = rollStageSetup(2, mulberry32(5));
  broken.slots['deck-lower'] = broken.slots['deck-upper'];
  assert.equal(normalizeStageSetup(2, broken), null);
  const badAngle = rollStageSetup(1, mulberry32(5));
  badAngle.angles['rib-a'] = 0.3;
  assert.equal(normalizeStageSetup(1, badAngle), null);
  const rain = rollStageSetup(3, mulberry32(9));
  assert.ok(rain.leaks.length >= 2 && rain.leaks.length <= 3);
  assert.equal(normalizeStageSetup(3, rain), rain);
  assert.equal(normalizeStageSetup(3, { ...rain, leaks: [{ seam: 9, t: .5 }] }), null);
});
