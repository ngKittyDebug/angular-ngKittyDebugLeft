import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

import { KELP_BLADES, KELP_COLORS } from '../../constants/kelp-blades';
import type { KelpBlade } from '../../constants/kelp-blades';

/**
 * Purely decorative aquarium backdrop for the Frenzy scene.
 *
 * Rendered as the FIRST child of `.scene`, behind the actors. It is
 * `aria-hidden` and `pointer-events: none`, so it never interferes with
 * gameplay or a11y. All motion is CSS — no rAF, no timers, no rng.
 *
 * Rays, plankton and bubbles are static markup; their per-element variety
 * (position, size, timing) lives entirely in the stylesheet as `:nth-child`
 * formulas — no TS, no inline styles. The ONLY thing this component still
 * computes is the bottom kelp: it is sized to the measured scene WIDTH
 * (≈ one blade per `KELP_SPACING_PX`) so the forest keeps the same density on
 * any viewport and reaches both edges, instead of being a fixed count
 * stretched thin on wide screens — and pure CSS cannot count how many blades
 * fit a width.
 */
interface Plant {
  left: number;
  height: number;
  rotation: number;
  brightness: number;
  zIndex: number;
  color: string;
  art: KelpBlade;
  duration: number;
  delay: number;
}

// Roughly one kelp blade per this many CSS px of scene width (blades are wider than this, so they
// overlap into a dense forest). Lower = denser. The blade count is derived from the measured width.
const KELP_SPACING_PX = 14;
const MIN_PLANTS = 12;

// 1-based indices, mirroring the original `@for $i from 1 through N` formulas.
function indices(length: number): number[] {
  return Array.from({ length }, (_, index) => index + 1);
}

function buildPlants(count: number): Plant[] {
  return indices(count).map((i) => {
    const shape = (i - 1) % 3;

    return {
      // Cell-centered across the full width (so the first/last blades hug the edges) plus a small
      // deterministic wobble so the row doesn't read like a comb.
      left: ((i - 0.5) / count) * 100 + (((i * 37) % 7) - 3),
      height: 70 + ((i * 17) % 95),
      rotation: -3 - (i % 4),
      brightness: 0.85 + (i % 3) * 0.07,
      zIndex: (i * 7) % 9,
      color: KELP_COLORS[shape],
      art: KELP_BLADES[shape],
      duration: 4.5 + (i % 4),
      delay: -(i * 0.6),
    };
  });
}

@Component({
  selector: 'left-paw-aquarium-decor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aquarium-decor.component.html',
  styleUrl: './aquarium-decor.component.scss',
})
export class AquariumDecorComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _plants = signal<readonly Plant[]>([]);
  private plantCount = 0;

  protected readonly plants = this._plants.asReadonly();

  public constructor() {
    // Browser-only: derive kelp density from the live scene width and keep it in sync on resize.
    afterNextRender(() => {
      const element = this.host.nativeElement;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? element.clientWidth;

        this.syncPlants(width);
      });

      observer.observe(element);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // Rebuild only when the blade count actually changes, so a resize drag doesn't churn the DOM.
  private syncPlants(width: number): void {
    const count = Math.max(MIN_PLANTS, Math.round(width / KELP_SPACING_PX));

    if (count === this.plantCount) {
      return;
    }

    this.plantCount = count;
    this._plants.set(buildPlants(count));
  }
}
