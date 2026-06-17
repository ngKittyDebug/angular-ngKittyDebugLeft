import { ChangeDetectionStrategy, Component } from '@angular/core';

import { KELP_BLADES, KELP_COLORS } from '../../constants/kelp-blades';
import type { KelpBlade } from '../../constants/kelp-blades';

/**
 * Screen-space FOREGROUND kelp: a sparse row of large blades rendered in FRONT of the actors, so the Pokémon
 * appear to swim between the seabed (the in-world backdrop kelp) and this near layer. Unlike the backdrop, it is
 * NOT inside `.scene__world` — it's a sibling the camera parallaxes directly (horizontal pan a touch faster than
 * the world via `PARALLAX_FRONT`, vertical base pinned to the on-screen world-floor line), so it reads as the
 * closest depth plane and slides off the bottom edge near the surface (where the floor is far below the view).
 *
 * The camera (`SceneCameraService`) writes this host's `width` and `transform` every frame; the component only
 * lays the blades out by percentage across that width. Purely decorative — `aria-hidden`, `pointer-events: none`.
 * Reuses the shared `KELP_BLADES` / `KELP_COLORS` so the silhouettes match the backdrop and minimap.
 */
interface ForegroundBlade {
  left: number;
  height: number;
  width: number;
  rotation: number;
  color: string;
  art: KelpBlade;
  duration: number;
  delay: number;
}

// A loose row of close-up fronds — enough to read as a continuous near layer (not a couple of lone giants that
// left a depth gap to the backdrop), still clearly in front and swaying.
const BLADE_COUNT = 13;

function buildBlades(): ForegroundBlade[] {
  return Array.from({ length: BLADE_COUNT }, (_, index) => {
    const i = index + 1;
    const shape = index % 3;
    // Close-up fronds, but pushed back a touch (150–280, was 170–320) so the front layer sits a little farther
    // from the camera and reads closer to the backdrop's near end. Width is a generous fraction of height (~0.34,
    // near the blade SVG's native 60:160 ratio) so they read as broad fronds, not ribbons.
    const height = 150 + ((i * 53) % 130);

    return {
      // Cell-centred across the (camera-sized) container width, with a small deterministic wobble.
      left: ((i - 0.5) / BLADE_COUNT) * 100 + (((i * 31) % 7) - 3),
      height,
      width: Math.round(height * 0.34),
      rotation: -4 - (i % 5),
      color: KELP_COLORS[shape],
      art: KELP_BLADES[shape],
      duration: 5 + (i % 4),
      delay: -(i * 0.8),
    };
  });
}

@Component({
  selector: 'left-paw-foreground-kelp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './foreground-kelp.component.html',
  styleUrl: './foreground-kelp.component.scss',
})
export class ForegroundKelpComponent {
  protected readonly blades = buildBlades();
}
