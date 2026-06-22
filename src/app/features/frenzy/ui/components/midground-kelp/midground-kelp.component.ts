import { ChangeDetectionStrategy, Component } from '@angular/core';

import { KELP_BLADES, KELP_COLORS, kelpBladeWidth } from '../../utils/kelp-blades';
import type { KelpBlade } from '../../utils/kelp-blades';

/**
 * In-world MIDGROUND kelp: a sparse row of near, low-rooted fronds rendered IN FRONT of the actors (host
 * z-index 2 > the actors' 1) but still inside `.scene__world`, so it moves and scales with the camera exactly
 * like the seabed — which means the drifting Pokémon can duck BEHIND these blades and "camp" in the weeds. The
 * backdrop tiers (`AquariumDecorComponent`) stay behind the actors; this is the one in-world layer in front.
 *
 * Sparse and slender on purpose: it occludes the player only now and then (the hiding cue) rather than walling
 * off the scene. Purely decorative — `aria-hidden`, `pointer-events: none`. Reuses the shared `KELP_BLADES` /
 * `KELP_COLORS` so the silhouettes match the backdrop and minimap. The world is a fixed width, so the blade
 * count is a constant (no viewport measuring needed).
 */
interface MidBlade {
  left: number;
  height: number;
  width: number;
  root: number;
  rotation: number;
  color: string;
  art: KelpBlade;
  duration: number;
  delay: number;
}

const BLADE_COUNT = 34;

function buildBlades(): MidBlade[] {
  return Array.from({ length: BLADE_COUNT }, (_, index) => {
    const i = index + 1;
    const shape = index % 3;
    // Tall, near fronds. Width tracks height (~native ratio) so they read as broad blades, not ribbons.
    const height = 210 + ((i * 53) % 150);

    return {
      // Spread across the fixed world width with a deterministic wobble so the row isn't a comb.
      left: ((i - 0.5) / BLADE_COUNT) * 100 + (((i * 37) % 9) - 4),
      height,
      width: kelpBladeWidth(height),
      // Rooted LOW (4–9% from the world bottom — near the resting-item line / the viewer), so they sit in front
      // and low like the closest blades of the seabed.
      root: 4 + ((i * 29) % 6),
      rotation: -3 - (i % 4),
      color: KELP_COLORS[shape],
      art: KELP_BLADES[shape],
      duration: 5 + (i % 4),
      delay: -(i * 0.7),
    };
  });
}

@Component({
  selector: 'left-paw-midground-kelp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './midground-kelp.component.html',
  styleUrl: './midground-kelp.component.scss',
})
export class MidgroundKelpComponent {
  protected readonly blades = buildBlades();
}
