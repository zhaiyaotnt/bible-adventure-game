// Game 5 · procedural prototype art (spec §14 Phase A). Everything is
// drawn with Phaser Graphics into generated textures — no raster assets,
// so gameplay never blocks on finished paintings.

const hash = (x, y, n) => { let h = (x * 73856093) ^ (y * 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % n; };

function doveTexture(scene, key, wingUp, leaf) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  // tail fan
  g.fillStyle(0xe9e2cf, 1); g.fillTriangle(14, 36, 34, 28, 34, 44);
  // wings
  g.fillStyle(0xf3eee0, 1);
  if (wingUp) { g.fillEllipse(46, 16, 52, 22); g.fillEllipse(46, 56, 52, 22); }
  else { g.fillEllipse(44, 24, 56, 18); g.fillEllipse(44, 48, 56, 18); }
  g.fillStyle(0xe2dbc6, 1);
  if (wingUp) { g.fillEllipse(46, 20, 44, 14); g.fillEllipse(46, 52, 44, 14); }
  // body + head (nose toward +x)
  g.fillStyle(0xfaf6ea, 1); g.fillEllipse(50, 36, 52, 26);
  g.fillStyle(0xffffff, 1); g.fillCircle(76, 36, 11);
  g.fillStyle(0x3a3a3a, 1); g.fillCircle(80, 33, 2.2);
  g.fillStyle(0xd9a441, 1); g.fillTriangle(86, 34, 94, 36, 86, 39);
  if (leaf) { g.fillStyle(0x7fae5f, 1); g.fillEllipse(90, 43, 14, 7); g.lineStyle(1.5, 0x4e7a3a, 1); g.lineBetween(84, 41, 96, 45); }
  g.generateTexture(key, 96, 72);
  g.destroy();
}

function arkTexture(scene) {
  if (scene.textures.exists('ark-top')) return;
  const g = scene.add.graphics();
  // hull, seen from above: long rounded body with a darker rim
  g.fillStyle(0x6e4c2e, 1); g.fillRoundedRect(4, 18, 212, 74, 30);
  g.fillStyle(0x976747, 1); g.fillRoundedRect(12, 25, 196, 60, 24);
  g.lineStyle(2, 0x6e4c2e, 0.8);
  for (let i = 0; i < 5; i++) g.lineBetween(24, 34 + i * 11, 196, 34 + i * 11);
  // house block + roof
  g.fillStyle(0xb68a59, 1); g.fillRoundedRect(78, 34, 64, 42, 6);
  g.fillStyle(0x7a5230, 1); g.fillRoundedRect(84, 39, 52, 32, 5);
  g.lineStyle(2, 0x5d3d22, 1); g.lineBetween(110, 39, 110, 71);
  // window (the dove's door)
  g.fillStyle(0xffe9a8, 1); g.fillCircle(128, 55, 6);
  g.generateTexture('ark-top', 220, 110);
  g.destroy();
}

function treeTexture(scene, key, canopy, shade, trunk) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.lineStyle(7, trunk, 1); g.lineBetween(56, 108, 60, 74); g.lineBetween(64, 108, 61, 76);
  g.fillStyle(shade, 1); g.fillCircle(60, 48, 34); g.fillCircle(36, 58, 24); g.fillCircle(84, 58, 24);
  g.fillStyle(canopy, 1); g.fillCircle(52, 42, 28); g.fillCircle(76, 44, 22); g.fillCircle(42, 54, 18);
  g.fillStyle(0xffffff, 0.14); g.fillCircle(48, 36, 12); g.fillCircle(72, 38, 9);
  g.generateTexture(key, 120, 120);
  g.destroy();
}

function blobTexture(scene) {
  if (scene.textures.exists('wind-arrow')) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1); g.fillTriangle(0, 6, 16, 6, 8, 16); g.fillRect(5, 0, 6, 8);
  g.generateTexture('wind-arrow', 16, 16);
  g.destroy();
}

export function makeDoveTextures(scene) {
  doveTexture(scene, 'dove-a', true, false);
  doveTexture(scene, 'dove-b', false, false);
  doveTexture(scene, 'dove-leaf-a', true, true);
  doveTexture(scene, 'dove-leaf-b', false, true);
  arkTexture(scene);
  treeTexture(scene, 'tree-olive', 0x9db38a, 0x7d9a6e, 0xd8cfb4);
  treeTexture(scene, 'tree-dark', 0x46684a, 0x2f4a2e, 0x4a3826);
  treeTexture(scene, 'tree-grove', 0x6fae5f, 0x4e7a3a, 0x6e4c2e);
  blobTexture(scene);
}

const PALETTES = {
  flight1: { water: 0x39586e, deep: 0x2f4c61, shallow: 0x527a8c },
  flight2: { water: 0x3a5f74, deep: 0x2f5064, shallow: 0x59808f },
  flight3: { water: 0x3d6076, deep: 0x33536a, shallow: 0x5d8494 },
};

// Painted water/land background for one flight, drawn once into a
// Graphics object sized to the world. Land emerges more per flight.
export function paintWorld(scene, level) {
  const p = PALETTES[level.id] ?? PALETTES.flight1;
  const { width: W, height: H } = level.world;
  const g = scene.add.graphics();
  g.fillStyle(p.water, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(p.deep, 0.5);
  for (let i = 0; i < 26; i++) g.fillEllipse(60 + hash(i, 3, Math.max(1, W - 120)), 50 + hash(i, 7, Math.max(1, H - 100)), 180 + hash(i, 11, 260), 60 + hash(i, 13, 90));
  // foam flecks
  g.lineStyle(2, 0xdceef5, 0.28);
  for (let i = 0; i < 130; i++) {
    const x = 20 + hash(i, 17, Math.max(1, W - 40)), y = 16 + hash(i, 19, Math.max(1, H - 32));
    g.lineBetween(x, y, x + 12 + hash(i, 23, 18), y + hash(i, 29, 5) - 2);
  }
  if (level.id === 'flight1') {
    // the submerged ridge: pale shallows under the surface
    g.fillStyle(p.shallow, 0.55); g.fillEllipse(980, 500, 250, 130);
  }
  if (level.id === 'flight2') {
    // green shelf the olive tree stands on + decoy shelves
    g.fillStyle(0x74925e, 1); g.fillEllipse(1540, 445, 340, 190);
    g.fillStyle(0x5d7a4a, 1); g.fillEllipse(700, 560, 230, 140); g.fillEllipse(1050, 470, 210, 130);
    g.fillStyle(0x87a86b, 0.8); g.fillEllipse(1500, 420, 200, 110);
  }
  if (level.id === 'flight3') {
    // northern shoulder, the destination landmass, southern mudflat
    g.fillStyle(0x74925e, 1);
    g.fillEllipse(1180, 330, 1250, 300);
    g.fillEllipse(2080, 640, 560, 470);
    g.fillStyle(0x87a86b, 1); g.fillEllipse(2050, 620, 380, 300);
    g.fillStyle(0x8a7a5a, 1); g.fillEllipse(1500, 950, 430, 210);
    g.fillStyle(0x6d5c40, 0.6); g.fillEllipse(1500, 950, 300, 130);
    // island stepping stones along the central route
    g.fillStyle(0x9db38a, 1); g.fillEllipse(1250, 610, 170, 110);
    g.fillStyle(0x74925e, 1); g.fillEllipse(760, 640, 130, 84);
  }
  return g;
}
