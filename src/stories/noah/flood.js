// The Rising Flood — pure puzzle model + solver (no Phaser imports, so
// the node test suite can verify every stage).
//
// Terrain is a grid of elevations 0/1/2 ('#' wall, '~' deep channel gap).
// Water has three states — LOW (0), RISING (1), HIGH (2). A floor cell is
// deep when the water level exceeds its elevation; Aaron may stand on
// dry (level < elev) or wading (level == elev) cells, never deep ones.
// Crates are pushable and act as elev-2 platforms; a crate pushed into a
// gap fills it. The plank bridges exactly one gap cell. Floor switches
// toggle gates (or the stage-3 sluice, which lowers the effective water
// level by one). A ledge cell has a cliff side: you may drop OUT across
// it, never climb IN across it.

export const WATER = ['LOW', 'RISING', 'HIGH'];
export const key = (x, y) => `${x},${y}`;

function buildGrid(rows) {
  const cells = new Map();
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') cells.set(key(x, y), { wall: true });
    else if (ch === '~') cells.set(key(x, y), { gap: true, elev: -1 });
    else cells.set(key(x, y), { elev: Number(ch) });
  }));
  return { w: rows[0].length, h: rows.length, cells };
}

function makeStage(def) {
  const g = buildGrid(def.rows);
  const gates = new Map((def.gates || []).map(gt => [gt.id, gt]));
  const gateCell = new Map();
  for (const gt of gates.values()) for (const [x, y] of gt.cells) gateCell.set(key(x, y), gt.id);
  const switches = new Map((def.switches || []).map(sw => [key(sw.at[0], sw.at[1]), sw]));
  return {
    ...def, ...g, gates, gateCell, switches,
    ledges: new Map(Object.entries(def.ledges || {})),
    gaps: new Set([...g.cells].filter(([, c]) => c.gap).map(([k]) => k)),
    initial() {
      return {
        x: def.start[0], y: def.start[1], water: 0,
        gatesOpen: 0, sluice: false,
        plank: def.plank ? 'rest' : null,           // 'rest' | 'carry' | 'placed'
        plankAt: def.plank ? [...def.plank] : null,  // cell when rest/placed
        crates: (def.crates || []).map(c => [...c]),
      };
    },
  };
}

export function effectiveLevel(stage, s) { return Math.max(0, s.water - (s.sluice ? 1 : 0)); }

export function crateAt(s, x, y) { return s.crates.some(([cx, cy]) => cx === x && cy === y); }

export function cellInfo(stage, s, x, y) {
  const k = key(x, y), c = stage.cells.get(k);
  if (!c) return { kind: 'void' };
  if (c.wall) return { kind: 'wall' };
  const gate = stage.gateCell.get(k);
  if (gate !== undefined) {
    const open = (s.gatesOpen & (1 << [...stage.gates.keys()].indexOf(gate))) !== 0;
    return { kind: open ? 'floor' : 'gate', elev: c.elev ?? 1, gate, open };
  }
  if (crateAt(s, x, y)) return { kind: 'crate', elev: 2 };
  if (c.gap) {
    if (s.plank === 'placed' && s.plankAt && s.plankAt[0] === x && s.plankAt[1] === y) return { kind: 'bridge', elev: 2 };
    return { kind: 'gap', elev: -1 };
  }
  return { kind: 'floor', elev: c.elev };
}

// Can Aaron stand on (x,y) in state s? Returns 'dry' | 'wade' | null.
export function standable(stage, s, x, y) {
  const info = cellInfo(stage, s, x, y);
  if (info.kind !== 'floor' && info.kind !== 'crate' && info.kind !== 'bridge') return null;
  const lvl = effectiveLevel(stage, s);
  if (lvl > info.elev) return null;
  return lvl === info.elev && info.kind === 'floor' ? 'wade' : 'dry';
}

const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

// All legal successor states with the action that produced them. `act`
// strings: 'move:N' etc, 'push:N', 'advance', 'place:N', 'takePlank'.
export function successors(stage, s) {
  const out = [];
  const push = (ns, act) => out.push([ns, act]);
  // Advance the storm: illegal if Aaron's own cell floods (that is a
  // rescue in the game, never a useful solver move).
  if (s.water < 2) {
    const ns = { ...s, water: s.water + 1 };
    if (standable(stage, ns, s.x, s.y)) push(ns, 'advance');
  }
  // Pick up an adjacent plank (resting or bridging — not while standing on it).
  if (s.plank && s.plank !== 'carry' && s.plankAt) {
    const d = Math.abs(s.plankAt[0] - s.x) + Math.abs(s.plankAt[1] - s.y);
    if (d === 1) push({ ...s, plank: 'carry', plankAt: null }, 'takePlank');
  }
  for (const [dn, [dx, dy]] of Object.entries(DIRS)) {
    const nx = s.x + dx, ny = s.y + dy, nk = key(nx, ny);
    // Place the plank on an adjacent gap (Aaron does not move).
    if (s.plank === 'carry') {
      const c = stage.cells.get(nk);
      if (c?.gap && !crateAt(s, nx, ny)) { push({ ...s, plank: 'placed', plankAt: [nx, ny] }, 'place:' + dn); continue; }
    }
    const info = cellInfo(stage, s, nx, ny);
    if (info.kind === 'crate') {
      // Push: the cell beyond must accept the crate.
      const bx = nx + dx, by = ny + dy, bc = stage.cells.get(key(bx, by));
      const destInfo = cellInfo(stage, s, bx, by);
      if (bc && !bc.wall && destInfo.kind !== 'crate' && destInfo.kind !== 'gate' && !stage.gateCell.has(key(bx, by))) {
        const crates = s.crates.map(c => (c[0] === nx && c[1] === ny) ? [bx, by] : c);
        push({ ...s, crates }, 'push:' + dn);
      }
      // …or step onto the crate if it sits in a gap (a crossing platform).
      if (stage
.gaps.has(key(nx, ny)) && standable(stage, s, nx, ny)) {
        push(enterCell(stage, s, nx, ny), 'move:' + dn);
      }
      continue;
    }
    if (!standable(stage, s, nx, ny)) continue;
    // Ledge cliff: the destination's cliff side facing Aaron blocks entry.
    const ledgeSide = stage.ledges.get(nk);
    if (ledgeSide && ledgeSide === OPP[dn]) continue;
    push(enterCell(stage, s, nx, ny), 'move:' + dn);
  }
  return out;
}

// State after Aaron steps onto (x,y): plank pickup + switch toggles.
export function enterCell(stage, s, x, y) {
  let ns = { ...s, x, y };
  if (ns.plank === 'rest' && ns.plankAt && ns.plankAt[0] === x && ns.plankAt[1] === y) ns = { ...ns, plank: 'carry', plankAt: null };
  const sw = stage.switches.get(key(x, y));
  if (sw) {
    if (sw.gate) {
      const bit = 1 << [...stage.gates.keys()].indexOf(sw.gate);
      ns = { ...ns, gatesOpen: ns.gatesOpen ^ bit };
      // A surge switch drives the storm up when it is flipped on.
      if (stage.surgeSwitch === sw.id && (ns.gatesOpen & bit)) ns = { ...ns, water: Math.max(ns.water, 1) };
    }
    if (sw.sluice) ns = { ...ns, sluice: !ns.sluice };
  }
  return ns;
}

function stateKey(stage, s) {
  return [s.x, s.y, s.water, s.gatesOpen, s.sluice ? 1 : 0, s.plank || '-', s.plankAt ? s.plankAt.join(',') : '-', s.crates.map(c => c.join(',')).sort().join(';')].join('|');
}

// BFS shortest solution. opts.blockCells: extra impassable 'x,y' set (for
// route-isolation checks). Returns { actions, states } or null.
export function solve(stage, opts = {}) {
  return bfs(stage, opts.from || stage.initial(), opts);
}
function bfs(stage, start, opts) {
  const seen = new Set([stateKey(stage, start)]);
  const queue = [{ s: start, actions: [] }];
  const exitK = key(stage.exit[0], stage.exit[1]);
  while (queue.length) {
    const { s, actions } = queue.shift();
    if (key(s.x, s.y) === exitK) return { actions, states: queue.length };
    for (const [ns, act] of successors(stage, s)) {
      if (opts.blockCells && opts.blockCells.has(key(ns.x, ns.y)) && !(ns.x === stage.exit[0] && ns.y === stage.exit[1])) continue;
      const k = stateKey(stage, ns);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ s: ns, actions: [...actions, act] });
    }
  }
  return null;
}

// Every state reachable from the start (for soft-lock analysis).
export function reachableStates(stage) {
  const start = stage.initial();
  const seen = new Map([[stateKey(stage, start), start]]);
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    for (const [ns] of successors(stage, s)) {
      const k = stateKey(stage, ns);
      if (!seen.has(k)) { seen.set(k, ns); queue.push(ns); }
    }
  }
  return [...seen.values()];
}

// Rendering/forecast class of a cell under a (possibly hypothetical)
// state: 'wall' | 'gate' | 'gap' | 'bridge' | 'crate' | 'dry' | 'wade' | 'deep'.
export function cellClass(stage, s, x, y) {
  const info = cellInfo(stage, s, x, y);
  if (info.kind === 'wall' || info.kind === 'void') return 'wall';
  if (info.kind === 'gate') return 'gate';
  if (info.kind === 'gap') return 'gap';
  if (info.kind === 'bridge') return 'bridge';
  if (info.kind === 'crate') return 'crate';
  const lvl = effectiveLevel(stage, s);
  return lvl > info.elev ? 'deep' : lvl === info.elev ? 'wade' : 'dry';
}

// ---------------------------------------------------------------- stages

export const STAGE1 = makeStage({
  id: 'stage1', name: 'Broken Crossing',
  rows: [
    '11111~11111',
    '11111~11111',
    '11111~#11#1',
    '22222~22222',
    '11111~#11#1',
    '11111~11111',
    '11111~11111',
    '11111~11111',
  ],
  start: [0, 3], exit: [10, 3],
  crates: [[3, 2], [3, 5]],
  checkpoints: [[0, 3]],
});

export const STAGE2 = makeStage({
  id: 'stage2', name: 'Flooded Maze',
  rows: [
    '222222222222',
    '21110111#222',
    '21110122#1~1',
    '11110111#1~1',
    '1111011111~1',
    '11110111#1#2',
    '11110111#1~#',
    '11110111#1~1',
    '11110111#11#',
    '22222222#222',
  ],
  start: [1, 8], exit: [11, 5],
  gates: [
    { id: 'g1', cells: [[8, 4]] },
    { id: 'g2', cells: [[11, 4]] },
  ],
  switches: [
    { id: 's1', at: [6, 2], gate: 'g1' },
    { id: 's2', at: [11, 7], gate: 'g2' },
  ],
  surgeSwitch: 's1',
  ledges: { '7,2': 'S', '11,0': 'S' },
  plank: [3, 6],
  nook: [5, 0],
  checkpoints: [[1, 8], [9, 4]],
});

export const STAGE3 = makeStage({
  id: 'stage3', name: 'Final Crossing',
  rows: [
    '222222222222',
    '221111111122',
    '111111111111',
    '#0200101001#',
    '#0200100~01#',
    '#0020101001#',
    '111111111111',
    '111111111112',
  ],
  start: [1, 1], exit: [11, 7],
  switches: [{ id: 'sluice', at: [10, 1], sluice: true }],
  plank: [9, 2],
  checkpoints: [[1, 1]],
  finale: true, riverRows: [3, 4, 5],
});

export const STAGES = [STAGE1, STAGE2, STAGE3];
