// ==========================================================================
// Dune Garden — shared plan
//
// One source of truth for the courtyard geometry. The architecture and the
// planting both read this, so raised beds and their plants always agree.
// Units are metres, +Z is toward the viewer, -Z toward the sea.
// ==========================================================================

export const PAVING = {
  minX: -12,
  maxX: 12,
  minZ: -10,
  maxZ: 9.6,
  top: 0,
};

export const POOL = {
  x0: -7.2,
  x1: 3.4,
  z0: -3.9,
  z1: 1,
  waterY: 0.095,
  copingW: 0.34,
  copingH: 0.14,
};

export const PAVILION = {
  x: 7.6,
  z: -5.4,
  width: 6.2,
  depth: 4.6,
  deckH: 0.14,
  postH: 3,
};

export const HOUSE = {
  wallX: -12.2,
  z0: -10.4,
  z1: 6.5,
  height: 2.6,
};

export const BACK_WALL = {
  z: -10.5,
  height: 0.95,
  thickness: 0.4,
  opening: { x0: -2.2, x1: 0.6 },
};

export const EAST_WALL = {
  x: 12.05,
  z0: -10.5,
  z1: -1.2,
  height: 0.9,
  thickness: 0.4,
};

/**
 * Raised planters.
 * kind = 'dune' (dune grass), 'olive' (grass + olive), 'cacti' (gravel + cactus)
 */
export const PLANTERS = [
  {
    id: 'back-left',
    type: 'rect',
    x: -6.8,
    z: -8.2,
    width: 8.4,
    depth: 2.4,
    height: 0.62,
    kind: 'dune',
  },
  {
    id: 'back-right',
    type: 'rect',
    x: 6.3,
    z: -8.2,
    width: 9.4,
    depth: 2.4,
    height: 0.62,
    kind: 'dune',
  },
  {
    id: 'olive',
    type: 'round',
    x: -8.4,
    z: 3.4,
    r: 1.45,
    height: 0.5,
    kind: 'olive',
  },
  {
    id: 'cacti',
    type: 'rect',
    x: 5.5,
    z: -2.0,
    width: 3.2,
    depth: 2.0,
    height: 0.5,
    kind: 'cacti',
  },
  {
    id: 'east',
    type: 'rect',
    x: 11,
    z: 1.5,
    width: 1.8,
    depth: 5.0,
    height: 0.5,
    kind: 'dune',
  },
  {
    id: 'house',
    type: 'rect',
    x: -11.25,
    z: -1.0,
    width: 1.5,
    depth: 8.0,
    height: 0.45,
    kind: 'dune',
  },
  {
    id: 'south',
    type: 'rect',
    x: 0.5,
    z: 8.85,
    width: 12.6,
    depth: 1.15,
    height: 0.38,
    kind: 'dune',
  },
];

/** Soil surface height inside a planter. */
export function soilY(planter) {
  return planter.height - 0.06;
}

/** Footprint as a rectangle for scattering plants. */
export function planterFootprint(planter) {
  if (planter.type === 'round') {
    return {
      minX: planter.x - planter.r + 0.16,
      maxX: planter.x + planter.r - 0.16,
      minZ: planter.z - planter.r + 0.16,
      maxZ: planter.z + planter.r - 0.16,
    };
  }
  const inset = 0.12;
  return {
    minX: planter.x - planter.width / 2 + inset,
    maxX: planter.x + planter.width / 2 - inset,
    minZ: planter.z - planter.depth / 2 + inset,
    maxZ: planter.z + planter.depth / 2 - inset,
  };
}
