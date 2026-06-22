import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

import { KELP_BLADES, kelpTint } from '../../utils/kelp-blades';
import type { KelpBlade } from '../../utils/kelp-blades';
import { buildKelpField, kelpFieldCount } from '../../utils/kelp-field';

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
  width: number;
  root: number;
  rotation: number;
  zIndex: number;
  color: string;
  art: KelpBlade;
  duration: number;
  delay: number;
}

// Map the shared numeric blade field (one source of truth with the canvas backend, see `kelp-field.ts`) to the CSS
// shape the template binds: the tint factor → a resolved colour, the shape index → its blade art, the rest 1:1.
function buildPlants(count: number): Plant[] {
  return buildKelpField(count).map((blade) => ({
    left: blade.left,
    height: blade.height,
    width: blade.width,
    root: blade.root,
    rotation: blade.rotation,
    zIndex: blade.zIndex,
    color: kelpTint(blade.shape, blade.brightness),
    art: KELP_BLADES[blade.shape],
    duration: blade.durationSeconds,
    delay: blade.delaySeconds,
  }));
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
    const count = kelpFieldCount(width);

    if (count === this.plantCount) {
      return;
    }

    this.plantCount = count;
    this._plants.set(buildPlants(count));
  }
}
