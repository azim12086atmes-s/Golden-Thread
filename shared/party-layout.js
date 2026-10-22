// Shared party coordinates. Palace source geometry is kept under one transform
// so movement, objectives and rendering use the same world positions.
export const PALACE_TRANSFORM = Object.freeze({
  scale: 0.45,
  offset: Object.freeze({ x: 0, y: 77.3, z: -2700 }),
  sourceScale: 2.75,
});

// At z140 this point lies on the actual B20 arrival disk (source y13.75).
export const BRIDGE_START = Object.freeze({ x: 0, y: 83.4875, z: 140 });
export const BRIDGE_CHECKPOINTS = Object.freeze([
  Object.freeze({ x: 0, y: 82.6209090909091, z: 90 }),
  ...[-45, -180, -315, -450].map((z) => Object.freeze({ x: 0, y: 80, z })),
]);
export const CAKE_SPOT = Object.freeze({ x: -86.625, y: 394.325, z: -2885.625 });

// The five original low meadow rings stay with the meadow activity.
export const SKY_RINGS = Object.freeze([
  [-80, 18, 40], [-40, 28, -40], [40, 38, -110], [65, 48, -240], [0, 54, -430],
].map(([x, y, z]) => Object.freeze({ x, y, z })));

export const INGREDIENTS = Object.freeze([
  Object.freeze({ x: CAKE_SPOT.x - 30, y: CAKE_SPOT.y, z: CAKE_SPOT.z }),
  Object.freeze({ x: CAKE_SPOT.x + 30, y: CAKE_SPOT.y, z: CAKE_SPOT.z }),
  Object.freeze({ x: CAKE_SPOT.x, y: CAKE_SPOT.y, z: CAKE_SPOT.z + 32 }),
]);

export const PALACE_DESTINATIONS = Object.freeze([
  Object.freeze({ id: 'arrival', name: 'Bridge Pavilions', x: 0, y: 83.4875, z: 189.5625 }),
  Object.freeze({ id: 'grand-avenue', name: 'Grand Avenue', ...BRIDGE_START }),
  Object.freeze({ id: 'upper-terrace', name: 'Rose Terraces', x: 0, y: 126.8, z: -2150 }),
  Object.freeze({ id: 'palace-gate', name: 'Rose Gate', x: 0, y: 191.15, z: -2446.3125 }),
  Object.freeze({ id: 'palace', name: 'Crown Garden', ...CAKE_SPOT }),
  Object.freeze({ id: 'garden', name: 'Floating Garden', x: 650, y: 394.325, z: -2690 }),
  Object.freeze({ id: 'aurora', name: 'Aurora Lookout', x: -650, y: 394.325, z: -2690 }),
  Object.freeze({ id: 'meadow', name: 'Wanderers’ Meadow', x: 650, y: 394.325, z: -3190 }),
  Object.freeze({ id: 'star', name: 'Starlight Lookout', x: -650, y: 394.325, z: -3190 }),
]);
