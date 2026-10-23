import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLIGHT_DT, initialFlightState, sampleWind, stepFlight, staminaCost,
  objectiveStatus, flightFailure, simulateRoute, updraftAt,
} from '../src/stories/noah/dove.js';
import { FLIGHTS } from '../src/stories/noah/doveLevels.js';

const [F1, F2, F3] = FLIGHTS;
const calm = {
  id: 'calm', world: { width: 1200, height: 800 }, start: { x: 200, y: 400 },
  arkZone: { type: 'circle', x: 200, y: 400, r: 60 }, maxWind: 60,
  windZones: [], updrafts: [], landmarks: [], objective: { type: 'land' },
};
const windLevel = (wx, wy, extra = {}) => ({
  ...calm, ...extra,
  windZones: [{ id: 'z', shape: { type: 'rect', x: 0, y: 0, w: 1200, h: 800 }, wind: { x: wx, y: wy }, feather: 100 }],
});
const fly = (level, seconds, input, from = null) => {
  let s = from ?? initialFlightState(level);
  const steps = Math.round(seconds / FLIGHT_DT);
  for (let i = 0; i < steps; i++) s = stepFlight(level, s, input);
  return s;
};
const EAST = { steerX: 1, steerY: 0, boost: false };

// ------------------------------------------------------------ unit tests
test('1 · zero input in calm air decays speed toward zero', () => {
  const s0 = { ...initialFlightState(calm), vx: 120, vy: 0 };
  const s = fly(calm, 3, { steerX: 0, steerY: 0, boost: false }, s0);
  assert.ok(Math.hypot(s.vx, s.vy) < 4, `speed ${Math.hypot(s.vx, s.vy)}`);
});

test('2 · tailwind increases ground progress vs calm', () => {
  const a = fly(calm, 5, EAST);
  const b = fly(windLevel(40, 0), 5, EAST);
  assert.ok(b.x - a.x > 60, `tailwind gain ${b.x - a.x}`);
});

test('3 · headwind costs more stamina than tailwind', () => {
  const tail = fly(windLevel(40, 0), 6, EAST);
  const head = fly(windLevel(-40, 0), 6, EAST);
  assert.ok(head.stamina < tail.stamina - 1, `head ${head.stamina} vs tail ${tail.stamina}`);
});

test('4 · boost increases speed and stamina cost', () => {
  const n = fly(calm, 4, EAST);
  const b = fly(calm, 4, { ...EAST, boost: true });
  assert.ok(b.x > n.x * 1.15, `boost dist ${b.x} vs ${n.x}`);
  assert.ok(b.stamina < n.stamina - 2, `boost stamina ${b.stamina} vs ${n.stamina}`);
});

test('5 · updraft recovery respects the per-pass cap and the 100 cap', () => {
  const lvl = { ...calm, tuning: { stamina: { base: 0, hover: 0, boost: 0, headwind: 0 } }, updrafts: [{ id: 'u', x: 200, y: 400, r: 90, recovery: 2.3 }] };
  const s0 = { ...initialFlightState(lvl), stamina: 40 };
  const s = fly(lvl, 10, { steerX: 0, steerY: 0, boost: false }, s0);
  assert.ok(Math.abs(s.stamina - 58) < 0.35, `capped gain → ${s.stamina}`);
  const sFull = fly(lvl, 10, { steerX: 0, steerY: 0, boost: false }, { ...initialFlightState(lvl), stamina: 99.5 });
  assert.ok(sFull.stamina <= 100);
});

test('6 · fixed-step results are nearly equal across frame chunkings', () => {
  const a = fly(calm, 4, EAST);
  let b = initialFlightState(calm);
  for (let i = 0; i < 120; i++) b = stepFlight(calm, b, EAST, 1 / 30);
  assert.ok(Math.abs(a.x - b.x) <= 8, `x ${a.x} vs ${b.x}`);
  assert.ok(Math.abs(a.stamina - b.stamina) <= 0.6, `stamina ${a.stamina} vs ${b.stamina}`);
});

test('7 · boundary exit fails out_of_bounds', () => {
  const s = fly(calm, 6, { steerX: -1, steerY: 0, boost: true });
  assert.equal(s.failure, 'out_of_bounds');
});

test('8 · stamina reaching zero fails exhausted', () => {
  const lvl = { ...calm, tuning: { stamina: { base: 40 } } };
  const s = fly(lvl, 4, EAST);
  assert.equal(s.failure, 'exhausted');
});

test('wind · feathered edges, timed change interpolation, calm corridor', () => {
  const wIn = sampleWind(F1, 700, 300, 0);
  assert.ok(wIn.x > 30, `inside tailwind ${wIn.x}`);
  const wOut = sampleWind(F1, 60, 60, 0);
  assert.ok(Math.hypot(wOut.x, wOut.y) < 6, `outside ${wOut.x},${wOut.y}`);
  const before = sampleWind(F3, 1000, 620, 0);
  const after = sampleWind(F3, 1000, 620, 25);
  assert.ok(before.y > 0 && after.y < -12, `change ${before.y} → ${after.y}`);
  const corridor = sampleWind(F2, 1160, 512, 0);
  assert.ok(Math.hypot(corridor.x, corridor.y) < 8, `corridor calm ${corridor.x},${corridor.y}`);
  assert.ok(updraftAt(F2, 820, 290)?.recovery > 0);
});

// ------------------------------------------------------------ gating tests
test('9 · flight 1 needs two evidence regions AND the ark return', () => {
  assert.equal(simulateRoute(F1, [{ x: 220, y: 450 }]).completed, false);
  assert.equal(simulateRoute(F1, [{ x: 760, y: 285 }, { x: 220, y: 450 }]).completed, false);
});

test('10 · flight 2 needs the leaf AND the ark return', () => {
  assert.equal(simulateRoute(F2, [{ x: 220, y: 560 }]).completed, false);
  assert.equal(simulateRoute(F2, [{ x: 700, y: 560 }, { x: 220, y: 560 }]).completed, false); // decoy only
  assert.equal(simulateRoute(F2, [{ x: 1540, y: 445 }]).completed, false); // tree, no return
});

test('11 · flight 3 completes at the grove with no ark return', () => {
  const r = simulateRoute(F3, [{ x: 700, y: 620 }, { x: 1200, y: 600 }, { x: 2050, y: 650 }]);
  assert.equal(r.completed, true);
  assert.equal(r.state.returnedToArk, false);
});

// ------------------------------------------------------------ route viability
const ROUTES = [
  ['F1 northern tailwind', F1, [{ x: 450, y: 330 }, { x: 760, y: 285 }, { x: 980, y: 500 }, { x: 220, y: 450 }]],
  ['F1 southern loop', F1, [{ x: 470, y: 610 }, { x: 700, y: 690 }, { x: 980, y: 500 }, { x: 500, y: 520 }, { x: 220, y: 450 }]],
  ['F2 northern updraft', F2, [{ x: 480, y: 350 }, { x: 820, y: 290 }, { x: 1210, y: 330 }, { x: 1540, y: 445 }, { x: 1210, y: 330 }, { x: 820, y: 290 }, { x: 480, y: 400 }, { x: 220, y: 560 }]],
  ['F2 southern tailwind', F2, [{ x: 520, y: 720 }, { x: 1020, y: 730 }, { x: 1390, y: 570 }, { x: 1540, y: 445 }, { x: 1100, y: 540 }, { x: 620, y: 555 }, { x: 220, y: 560 }]],
  ['F2 calm-corridor shortcut', F2, [{ x: 480, y: 350 }, { x: 820, y: 290 }, { x: 1160, y: 512 }, { x: 1540, y: 445 }, { x: 1160, y: 512 }, { x: 820, y: 290 }, { x: 480, y: 400 }, { x: 220, y: 560 }]],
  ['F3 central exposed land', F3, [{ x: 700, y: 620 }, { x: 1200, y: 600 }, { x: 1600, y: 640 }, { x: 2050, y: 650 }]],
  ['F3 northern mountain shoulder', F3, [{ x: 600, y: 420 }, { x: 1100, y: 380 }, { x: 1600, y: 430 }, { x: 2050, y: 650 }]],
];
for (const [name, level, wps] of ROUTES) {
  test(`route · ${name} completes with ≥12 stamina`, () => {
    const r = simulateRoute(level, wps);
    assert.equal(r.failure, null, `${name} failed: ${r.failure}`);
    assert.equal(r.completed, true, `${name} did not complete`);
    assert.ok(r.stamina >= 12, `${name} margin ${r.stamina.toFixed(1)}`);
  });
}

test('route · routes survive ±5° steering noise', () => {
  for (const [name, level, wps] of [ROUTES[0], ROUTES[2], ROUTES[5]]) {
    const r = simulateRoute(level, wps, { noiseDeg: 5 });
    assert.equal(r.completed, true, `${name} with noise did not complete (stamina ${r.stamina.toFixed(1)})`);
  }
});

test('route · F1 far-east temptation is not safely completable', () => {
  const r = simulateRoute(F1, [{ x: 760, y: 285 }, { x: 980, y: 500 }, { x: 1320, y: 300 }, { x: 220, y: 450 }]);
  assert.ok(!(r.completed && r.stamina >= 12), `temptation completed with ${r.stamina.toFixed(1)} stamina`);
});

test('route · F3 central route still completes across the 18s wind change', () => {
  // Hover briefly at the start so the change lands mid-flight.
  let s = initialFlightState(F3);
  for (let i = 0; i < 6 / FLIGHT_DT; i++) s = stepFlight(F3, s, { steerX: 0, steerY: 0, boost: false });
  const r = simulateRoute(F3, [{ x: 700, y: 620 }, { x: 1200, y: 600 }, { x: 1600, y: 640 }, { x: 2050, y: 650 }], {});
  assert.equal(r.completed, true);
  assert.ok(s.stamina > 0); // the pre-hover itself is survivable
});
