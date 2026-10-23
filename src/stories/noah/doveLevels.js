// Game 5 · authored flight data (spec §8–§9). Immutable plain objects;
// coordinates preserve the spec topology. Wind is authored and
// deterministic — never random — so every advertised route is testable.

export const FLIGHTS = [
  {
    id: 'flight1',
    title: 'No Place to Rest',
    world: { width: 1600, height: 900 },
    start: { x: 250, y: 450 },
    arkZone: { type: 'circle', x: 220, y: 450, r: 82 },
    startFacing: 0,
    maxWind: 58,
    windZones: [
      { id: 'north-tailwind', shape: { type: 'rect', x: 300, y: 170, w: 880, h: 270 }, wind: { x: 44, y: 2 }, feather: 110, visual: { color: 0xb9d9e8, arrows: 5 } },
      { id: 'east-push', shape: { type: 'rect', x: 1120, y: 140, w: 480, h: 380 }, wind: { x: 30, y: -4 }, feather: 120, visual: { color: 0xb9d9e8, arrows: 4 } },
      { id: 'south-out', shape: { type: 'rect', x: 330, y: 540, w: 760, h: 270 }, wind: { x: 30, y: 8 }, feather: 110, visual: { color: 0xb9d9e8, arrows: 4 } },
      { id: 'south-return', shape: { type: 'rect', x: 280, y: 450, w: 760, h: 150 }, wind: { x: -28, y: 6 }, feather: 90, visual: { color: 0xb9d9e8, arrows: 4 } },
    ],
    updrafts: [],
    landmarks: [
      { id: 'floating-branches', kind: 'evidence', x: 690, y: 275, r: 95, label: 'Floating branches' },
      { id: 'submerged-ridge', kind: 'evidence', x: 980, y: 500, r: 110, label: 'A ridge just under the surface' },
      { id: 'distant-water', kind: 'evidence', x: 670, y: 690, r: 95, label: 'Open water, as far as the eye can see' },
      { id: 'far-glint', kind: 'glint', x: 1320, y: 300, r: 70, label: 'Something glints far to the east' },
    ],
    objective: { type: 'evidenceReturn', evidenceRequired: 2 },
    tuning: { stamina: { base: 5.6 } },
  },
  {
    id: 'flight2',
    title: 'The Olive Leaf',
    world: { width: 1900, height: 1050 },
    start: { x: 250, y: 560 },
    arkZone: { type: 'circle', x: 220, y: 560, r: 82 },
    startFacing: 0,
    maxWind: 58,
    windZones: [
      { id: 'north-ridge', shape: { type: 'rect', x: 380, y: 190, w: 1150, h: 250 }, wind: { x: 38, y: 8 }, feather: 120, visual: { color: 0xb9d9e8, arrows: 5 } },
      { id: 'south-tailwind', shape: { type: 'rect', x: 400, y: 610, w: 1180, h: 240 }, wind: { x: 46, y: -2 }, feather: 120, visual: { color: 0xb9d9e8, arrows: 5 } },
      { id: 'mid-crosswind', shape: { type: 'rect', x: 480, y: 430, w: 1000, h: 190 }, wind: { x: -8, y: -30 }, feather: 110, visual: { color: 0xb9d9e8, arrows: 4 } },
      { id: 'calm-corridor', shape: { type: 'rect', x: 1010, y: 455, w: 310, h: 115 }, wind: { x: 0, y: 0 }, feather: 60, calm: true, visual: { color: 0xd8e8d0, arrows: 0 } },
    ],
    updrafts: [
      { id: 'ridge-updraft', x: 820, y: 290, r: 115, recovery: 2.5 },
    ],
    landmarks: [
      { id: 'olive-tree', kind: 'oliveTree', x: 1540, y: 445, r: 90, label: 'The olive tree' },
      { id: 'decoy-west', kind: 'decoyTree', x: 700, y: 560, r: 80, label: 'A dark tree' },
      { id: 'decoy-mid', kind: 'decoyTree', x: 1050, y: 470, r: 80, label: 'A dark tree' },
    ],
    objective: { type: 'leafReturn' },
    tuning: { stamina: { base: 2.45 } },
  },
  {
    id: 'flight3',
    title: 'A New Beginning',
    world: { width: 2300, height: 1200 },
    start: { x: 220, y: 610 },
    arkZone: { type: 'circle', x: 190, y: 610, r: 82 },
    startFacing: 0,
    maxWind: 58,
    windZones: [
      { id: 'central-flow', shape: { type: 'rect', x: 380, y: 470, w: 1420, h: 340 }, wind: { x: 40, y: 4 }, feather: 130, visual: { color: 0xb9d9e8, arrows: 5 } },
      { id: 'north-tailwind', shape: { type: 'rect', x: 380, y: 230, w: 1560, h: 300 }, wind: { x: 36, y: -2 }, feather: 130, visual: { color: 0xb9d9e8, arrows: 5 } },
      { id: 'south-drift', shape: { type: 'rect', x: 380, y: 830, w: 1400, h: 300 }, wind: { x: 12, y: 8 }, feather: 130, visual: { color: 0xb9d9e8, arrows: 3 } },
    ],
    changes: [
      { afterSeconds: 18, zoneId: 'central-flow', wind: { x: 30, y: -26 }, transition: 3 },
    ],
    updrafts: [
      { id: 'central-updraft', x: 1250, y: 610, r: 90, recovery: 2.0 },
    ],
    landmarks: [
      { id: 'grove', kind: 'grove', x: 2050, y: 650, r: 125, label: 'A green grove' },
      { id: 'mudflat', kind: 'falseDestination', x: 1500, y: 950, r: 130, label: 'Exposed mudflat' },
    ],
    objective: { type: 'land' },
    tuning: { stamina: { base: 5.6 } },
  },
];

// Reflect the whole authored route across the horizontal axis. Because the
// wind and all objectives move together, the same proven flight remains fair.
export function mirrorFlight(level) {
  const H = level.world.height;
  const point = p => ({ ...p, y: H - p.y });
  return {
    ...level,
    start: point(level.start), arkZone: point(level.arkZone),
    startFacing: -(level.startFacing ?? 0),
    windZones: level.windZones.map(z => ({ ...z, shape: { ...z.shape, y: H - z.shape.y - z.shape.h }, wind: { x: z.wind.x, y: -z.wind.y } })),
    updrafts: (level.updrafts ?? []).map(point),
    landmarks: level.landmarks.map(point),
    changes: (level.changes ?? []).map(c => ({ ...c, wind: { x: c.wind.x, y: -c.wind.y } })),
  };
}
