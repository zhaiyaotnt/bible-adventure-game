// Game 5 · The Dove's Journey — pure deterministic flight model.
// No Phaser, no DOM, no storage: the same step function drives the scene
// and the route-viability tests. See CHAPTER_1_GAME_5_THE_DOVES_JOURNEY.md §4.

export const FLIGHT_DT = 1 / 60;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vlen = (x, y) => Math.hypot(x, y);

const DEFAULT_PHYSICS = { accel: 255, drag: 2.35, max: 175, boostMax: 225, boostAccel: 1.45 };
const DEFAULT_STAMINA = { base: 1.15, boost: 3.75, headwind: 2.4, hover: 0.45 };
export const UPDRAFT_PASS_CAP = 18;

export function initialFlightState(level) {
  return {
    x: level.start.x, y: level.start.y,
    vx: 0, vy: 0,
    facing: level.startFacing ?? 0,
    stamina: 100,
    elapsed: 0,
    boost: false,
    carryingLeaf: false,
    explored: [],
    observed: [],
    destinationReached: false,
    returnedToArk: false,
    failure: null,
    updraftPass: 0,
    inUpdraft: false,
  };
}

// ------------------------------------------------------------ wind fields
// Feathered rectangle weight: 0.5 at the boundary, rising to 1 across
// `feather` px inside, falling to 0 across `feather` px outside.
function zoneWeight(zone, x, y) {
  const { x: rx, y: ry, w, h } = zone.shape;
  const feather = zone.feather ?? 80;
  const dxIn = Math.min(x - rx, rx + w - x);
  const dyIn = Math.min(y - ry, ry + h - y);
  if (dxIn >= 0 && dyIn >= 0) return clamp(0.5 + Math.min(dxIn, dyIn) / feather, 0, 1);
  const dxOut = Math.max(rx - x, 0, x - (rx + w));
  const dyOut = Math.max(ry - y, 0, y - (ry + h));
  return clamp(0.5 - Math.hypot(dxOut, dyOut) / feather, 0, 1);
}

function zoneWindAt(level, zone, elapsed) {
  let { x, y } = zone.wind;
  for (const ch of level.changes ?? []) {
    if (ch.zoneId !== zone.id || elapsed <= ch.afterSeconds) continue;
    const t = clamp((elapsed - ch.afterSeconds) / (ch.transition || 3), 0, 1);
    x += (ch.wind.x - x) * t;
    y += (ch.wind.y - y) * t;
  }
  return { x, y };
}

export function sampleWind(level, x, y, elapsed) {
  let wx = 0, wy = 0, calmW = 0;
  for (const zone of level.windZones ?? []) {
    const w = zoneWeight(zone, x, y);
    if (w <= 0) continue;
    if (zone.calm) { calmW = Math.max(calmW, w); continue; }
    const zw = zoneWindAt(level, zone, elapsed);
    wx += zw.x * w;
    wy += zw.y * w;
  }
  wx *= (1 - calmW);
  wy *= (1 - calmW);
  const max = level.maxWind ?? 60;
  const m = vlen(wx, wy);
  if (m > max) { wx *= max / m; wy *= max / m; }
  return { x: wx, y: wy };
}

export function updraftAt(level, x, y) {
  for (const up of level.updrafts ?? []) {
    if (Math.hypot(x - up.x, y - up.y) <= up.r) return up;
  }
  return null;
}

// ------------------------------------------------------------ stamina
// Net stamina delta for one step (negative = spent). Updraft recovery is
// capped per continuous pass (UPDRAFT_PASS_CAP) and by the 100 ceiling;
// stepFlight mirrors the same allowance when it updates state.updraftPass.
export function staminaCost(level, state, input, wind, dt) {
  const t = { ...DEFAULT_STAMINA, ...(level.tuning?.stamina ?? {}) };
  let perSec = t.base;
  if (input.boost) perSec += t.boost;
  const vMag = vlen(state.vx, state.vy), wMag = vlen(wind.x, wind.y);
  if (vMag > 1 && wMag > 1) {
    const dot = (state.vx * wind.x + state.vy * wind.y) / (vMag * wMag);
    perSec += Math.max(0, -dot) * (wMag / (level.maxWind ?? 60)) * t.headwind;
  }
  if (vlen(input.steerX, input.steerY) < 0.15) perSec += t.hover;
  let delta = -perSec * dt;
  const up = updraftAt(level, state.x, state.y);
  if (up) {
    const room = Math.max(0, UPDRAFT_PASS_CAP - state.updraftPass);
    delta += Math.min(up.recovery * dt, room, Math.max(0, 100 - state.stamina));
  }
  return delta;
}

// ------------------------------------------------------------ stepping
export function stepFlight(level, state, input, dt = FLIGHT_DT) {
  if (state.failure) return state;
  let ix = input.steerX || 0, iy = input.steerY || 0;
  const im = vlen(ix, iy);
  if (im > 1) { ix /= im; iy /= im; }
  const boost = !!input.boost;
  const phys = { ...DEFAULT_PHYSICS, ...(level.tuning?.physics ?? {}) };
  const wind = sampleWind(level, state.x, state.y, state.elapsed);

  const s = { ...state, explored: state.explored, observed: state.observed, boost };
  const accel = phys.accel * (boost ? phys.boostAccel : 1);
  s.vx += ix * accel * dt;
  s.vy += iy * accel * dt;
  const damp = Math.exp(-phys.drag * dt);
  s.vx *= damp;
  s.vy *= damp;
  const maxSpeed = (boost ? phys.boostMax : phys.max) * (s.carryingLeaf ? 0.96 : 1);
  const sp = vlen(s.vx, s.vy);
  if (sp > maxSpeed) { s.vx *= maxSpeed / sp; s.vy *= maxSpeed / sp; }
  const gx = s.vx + wind.x, gy = s.vy + wind.y;
  s.x += gx * dt;
  s.y += gy * dt;
  if (vlen(gx, gy) > 5) s.facing = Math.atan2(gy, gx);

  // Updraft pass bookkeeping (mirrors the allowance staminaCost used).
  const up = updraftAt(level, s.x, s.y);
  if (up) {
    const allowed = Math.min(up.recovery * dt, Math.max(0, UPDRAFT_PASS_CAP - state.updraftPass));
    s.updraftPass = state.updraftPass + allowed;
    s.inUpdraft = true;
  } else {
    s.updraftPass = 0;
    s.inUpdraft = false;
  }
  s.stamina = clamp(state.stamina + staminaCost(level, state, { steerX: ix, steerY: iy, boost }, wind, dt), 0, 100);
  s.elapsed = state.elapsed + dt;

  // Landmarks: evidence, decoys/false destination, the olive tree, the grove.
  for (const lm of level.landmarks ?? []) {
    if (Math.hypot(s.x - lm.x, s.y - lm.y) > (lm.r ?? 90)) continue;
    if (lm.kind === 'evidence' && !s.explored.includes(lm.id)) s.explored = [...s.explored, lm.id];
    if ((lm.kind === 'decoyTree' || lm.kind === 'falseDestination' || lm.kind === 'glint') && !s.observed.includes(lm.id)) s.observed = [...s.observed, lm.id];
    if (lm.kind === 'oliveTree') s.carryingLeaf = true;
    if (lm.kind === 'grove') s.destinationReached = true;
  }

  const status = objectiveStatus(level, s);
  s.returnedToArk = status.done && level.objective.type !== 'land';
  s.failure = flightFailure(level, s);
  return s;
}

export function flightFailure(level, state) {
  if (state.x < 0 || state.y < 0 || state.x > level.world.width || state.y > level.world.height) return 'out_of_bounds';
  if (state.stamina <= 0) return 'exhausted';
  return null;
}

export function objectiveStatus(level, state) {
  const o = level.objective;
  const az = level.arkZone;
  const inArk = az ? Math.hypot(state.x - az.x, state.y - az.y) <= az.r : false;
  if (o.type === 'evidenceReturn') {
    const got = state.explored.length;
    const done = got >= o.evidenceRequired && inArk;
    return { done, stage: done ? 'done' : got >= o.evidenceRequired ? 'return' : 'explore', exploredCount: got, inArk };
  }
  if (o.type === 'leafReturn') {
    const done = state.carryingLeaf && inArk;
    return { done, stage: done ? 'done' : state.carryingLeaf ? 'return' : 'toTree', inArk };
  }
  // land
  return { done: state.destinationReached, stage: state.destinationReached ? 'done' : 'toGrove', inArk };
}

// ------------------------------------------------------------ route simulation
// Proportional waypoint follower used by tests as a tuning guardrail.
export function simulateRoute(level, waypoints, options = {}) {
  let s = initialFlightState(level);
  const radius = options.waypointRadius ?? 30;
  const maxT = options.maxSeconds ?? 400;
  const noise = options.noiseDeg ? options.noiseDeg * Math.PI / 180 : 0;
  let wi = 0;
  while (s.elapsed < maxT) {
    if (s.failure || objectiveStatus(level, s).done || wi >= waypoints.length) break;
    const wp = waypoints[wi];
    const dx = wp.x - s.x, dy = wp.y - s.y;
    if (Math.hypot(dx, dy) <= radius) { wi++; continue; }
    let ang = Math.atan2(dy, dx);
    if (noise) ang += noise * Math.sin(s.elapsed * 0.9 + wi * 1.7);
    s = stepFlight(level, s, { steerX: Math.cos(ang), steerY: Math.sin(ang), boost: !!wp.boost }, FLIGHT_DT);
  }
  return {
    state: s,
    completed: objectiveStatus(level, s).done,
    failure: s.failure ?? flightFailure(level, s),
    stamina: s.stamina,
    elapsed: s.elapsed,
  };
}
