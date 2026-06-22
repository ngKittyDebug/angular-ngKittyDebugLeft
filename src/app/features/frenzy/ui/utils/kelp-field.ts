// The kelp-blade field: the numeric layout (position, size, depth, sway timing) of every backdrop blade, derived
// purely from the blade count. ONE source of truth shared by the DOM backdrop (`AquariumDecorComponent`, which maps
// each blade to CSS) and the canvas backend (`SceneDecorCanvasService`, which draws them in 2D), so the two render
// an identical forest and can be A/B'd on the device without drifting — the shared-pure-math rule of ADR 0007/0005.

import { kelpBladeWidth } from './kelp-blades';

// Roughly one kelp blade per this many CSS px of scene width (blades are wider than this, so they overlap into a
// dense forest). Lower = denser. The blade count is derived from the measured width. Raised 11→14 (a ~22% blade-count
// cut, 218→171 on the 2400px world) as the canvas backdrop's per-frame fill scales with blade count — every blade is
// redrawn each frame, so fewer blades = less fill-rate. Blades stay wider than the spacing, so the forest still reads
// dense (the thinning is near-imperceptible); device-eye-confirmed perf trade under ADR 0006/0007, dial here.
export const KELP_SPACING_PX = 14;
export const MIN_PLANTS = 16;

// Blade count for a backdrop of the given px width: at least MIN_PLANTS, else one per KELP_SPACING_PX — so the
// forest keeps the same density on any viewport and reaches both edges, instead of a fixed count stretched thin.
export function kelpFieldCount(width: number): number {
  return Math.max(MIN_PLANTS, Math.round(width / KELP_SPACING_PX));
}

// One backdrop blade's layout in plain numbers (no CSS units, no resolved colour): `index` is its 0-based draw
// order, `shape` indexes KELP_BLADES, `brightness` is the depth-dimming tint factor (0..1) the renderer folds into
// the blade colour, `rotation` is the base lean (deg), and `durationSeconds`/`delaySeconds` are its sway timing.
export interface KelpFieldBlade {
  index: number;
  shape: number;
  left: number;
  height: number;
  width: number;
  root: number;
  rotation: number;
  zIndex: number;
  brightness: number;
  durationSeconds: number;
  delaySeconds: number;
}

// Build the blade field deterministically from the count — the same per-index formulas the DOM backdrop computed
// inline, now shared so the canvas draws the identical forest.
export function buildKelpField(count: number): KelpFieldBlade[] {
  // 1-based index, mirroring the original `@for $i from 1 through N` formulas.
  return Array.from({ length: count }, (_, index) => {
    const i = index + 1;
    const shape = (i - 1) % 3;
    // Continuous depth 0 (far) .. ~0.6 (mid), pseudo-random per blade: size, brightness and z-index all interpolate
    // along it, so the back forest reads as a smooth far→mid gradient. Capped below the NEAR range on purpose — the
    // near tier lives in MidgroundKelpComponent IN FRONT of the actors. This layer stays below the actors (z 0).
    const depth = ((i * 47) % 61) / 100;
    // Quadratic spread for the base height (long tail of tall ones), then scaled by depth — near blades taller, far
    // ones shorter, but the far floor is kept high enough that they still cover the sand (less bare seabed).
    const spread = ((i * 53) % 100) / 100;
    const baseHeight = 110 + spread * spread * 260;
    const height = Math.round(baseHeight * (0.7 + depth * 0.6));

    return {
      index,
      shape,
      // Cell-centered across the full width (so the first/last blades hug the edges) plus a small deterministic
      // wobble so the row doesn't read like a comb.
      left: ((i - 0.5) / count) * 100 + (((i * 37) % 7) - 3),
      height,
      width: kelpBladeWidth(height),
      // Root line by depth (% from world bottom): near (depth→1) roots LOW (~6%, just above the resting items), far
      // (depth→0) roots HIGH (~17%, up at the dune crest) → a receding ground plane, not one flat row.
      root: 6 + (1 - depth) * 11,
      rotation: -3 - (i % 4),
      zIndex: Math.round(depth * 6),
      // Depth-dimming (0.55 far .. 0.85 near) folded into the tint factor (see kelpTint), not a per-element filter.
      brightness: 0.55 + depth * 0.5,
      durationSeconds: 4.5 + (i % 4),
      delaySeconds: -(i * 0.6),
    };
  });
}
