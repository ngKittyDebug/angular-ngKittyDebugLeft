import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

/**
 * Purely decorative aquarium backdrop for the Frenzy scene.
 *
 * Rendered as the FIRST child of `.scene`, behind the actors. It is
 * `aria-hidden` and `pointer-events: none`, so it never interferes with
 * gameplay or a11y. All motion is CSS — no rAF, no timers, no rng.
 *
 * Per-element variety (position, size, timing) is computed deterministically
 * from the element index and applied via inline CSS variables. The bottom kelp
 * is sized to the measured scene WIDTH (≈ one blade per `KELP_SPACING_PX`), so
 * the forest keeps the same density on any viewport and reaches both edges,
 * instead of being a fixed count stretched thin on wide screens.
 */
interface Ray {
  left: number;
  width: number;
  rotation: number;
  duration: number;
  delay: number;
}

interface Mote {
  left: number;
  top: number;
  size: number;
  driftX: number;
  driftY: number;
  peak: number;
  duration: number;
  delay: number;
}

interface Plant {
  left: number;
  height: number;
  rotation: number;
  brightness: number;
  zIndex: number;
  color: string;
  shape: number;
  duration: number;
  delay: number;
}

interface Bubble {
  left: number;
  size: number;
  drift: number;
  duration: number;
  delay: number;
}

const PLANT_COLORS = ['var(--aq-plant-a)', 'var(--aq-plant-b)', 'var(--aq-plant-c)'];
// Roughly one kelp blade per this many CSS px of scene width (blades are wider than this, so they
// overlap into a dense forest). Lower = denser. The blade count is derived from the measured width.
const KELP_SPACING_PX = 14;
const MIN_PLANTS = 12;

// 1-based indices, mirroring the original `@for $i from 1 through N` formulas.
function indices(length: number): number[] {
  return Array.from({ length }, (_, index) => index + 1);
}

function buildPlants(count: number): Plant[] {
  return indices(count).map((i) => ({
    // Cell-centered across the full width (so the first/last blades hug the edges) plus a small
    // deterministic wobble so the row doesn't read like a comb.
    left: ((i - 0.5) / count) * 100 + (((i * 37) % 7) - 3),
    height: 70 + ((i * 17) % 95),
    rotation: -3 - (i % 4),
    brightness: 0.85 + (i % 3) * 0.07,
    zIndex: (i * 7) % 9,
    color: PLANT_COLORS[(i - 1) % 3],
    shape: (i - 1) % 3,
    duration: 4.5 + (i % 4),
    delay: -(i * 0.6),
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

  protected readonly rays: readonly Ray[] = indices(5).map((i) => ({
    left: (i - 1) * 22 - 4,
    width: 14 + ((i * 5) % 14),
    rotation: 4 + i * 1.4,
    duration: 7 + i,
    delay: -(i * 1.3),
  }));

  protected readonly motes: readonly Mote[] = indices(16).map((i) => ({
    left: (i * 37) % 100,
    top: (i * 53) % 100,
    size: 1.5 + (i % 3),
    driftX: ((i % 7) - 3) * 8,
    driftY: -((i % 5) * 7),
    peak: 0.4 + (i % 6) * 0.1,
    duration: 10 + (i % 12),
    delay: -(i * 0.7),
  }));

  protected readonly bubbles: readonly Bubble[] = indices(12).map((i) => ({
    left: (i * 61) % 97,
    size: 5 + ((i * 7) % 12),
    drift: ((i % 5) - 2) * 9,
    duration: 6 + (i % 8),
    delay: -(i * 0.83),
  }));

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
