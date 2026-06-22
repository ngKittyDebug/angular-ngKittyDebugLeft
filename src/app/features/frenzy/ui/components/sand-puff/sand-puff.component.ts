import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ItemType } from '@game/frenzy/types';

// One ejected grain: a fan trajectory (`gx`/`gy`), size and launch delay, pre-formatted with units so the
// template binds them straight onto CSS custom properties the stylesheet's grain keyframe reads.
interface Grain {
  readonly gx: string;
  readonly gy: string;
  readonly size: string;
  readonly delay: string;
}

// Deterministic 0..1 pseudo-random from a seed (sin hash) — varies each grain's trajectory without `Math.random`,
// so the burst is reproducible (no SSR mismatch) yet looks scattered.
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;

  return value - Math.floor(value);
}

/**
 * Transient cloud of sand kicked up where a falling item lands on the seabed.
 *
 * Purely decorative: `aria-hidden` and `pointer-events: none`, positioned by the parent via
 * `[leftPawScenePosition]` at the touchdown point (y = 1). The CSS animation plays once; the parent
 * (`SceneComponent`, via `SceneSandPuffsService`) removes the instance after it ends. `weight` (the item type's
 * sand-puff intensity) scales the cloud's size and opacity through the `--puff-weight` custom property — heavier
 * debris throws up more sand.
 *
 * The grain set is weight-driven and computed here (not a fixed CSS `:nth-child` set): heavier debris ejects far
 * MORE grains, fanned WIDER and thrown HIGHER — so a detonating bomb (the biggest weight) erupts in a dense
 * spray, while a crumb only flicks up a few. Per-grain trajectory/size/delay are emitted as CSS custom properties.
 */
@Component({
  selector: 'left-paw-sand-puff',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sand-puff.component.html',
  styleUrl: './sand-puff.component.scss',
  host: {
    '[style.--puff-weight]': 'weight()',
  },
})
export class SandPuffComponent {
  public readonly weight = input(0.5);
  public readonly type = input<ItemType>('food');

  // A bomb scorches its debris into glowing embers (white-hot core → orange → red) with a fiery glow, so the
  // explosion reads HOT and distinct from a plain sand kick-up. Applied as per-grain inline styles (not a CSS
  // class) so they override the default sand grain even when only the template recompiles. Non-bomb items return
  // null → the grain keeps its theme sand colour/rim from the stylesheet.
  protected readonly grainBackground = computed(() => {
    return this.type() === 'bomb'
      ? 'radial-gradient(circle, #fff6c0 0%, #ffc23d 35%, #ff6a14 70%, #e23a0a 100%)'
      : null;
  });
  protected readonly grainGlow = computed(() => {
    // A dark, slightly-blurred ring goes FIRST so the ember stays legible on the light theme (where a pure
    // orange/yellow grain washes out into the pale water), then the warm glow layers on top.
    return this.type() === 'bomb'
      ? '0 0 1px 1px rgba(0, 0, 0, 0.65), 0 0 5px 2px rgba(0, 0, 0, 0.45), 0 0 3px 1px rgba(255, 170, 50, 0.95), 0 0 8px 2px rgba(255, 90, 20, 0.7)'
      : null;
  });

  // Grain count/spread/launch all scale with weight² (a heavy bomb erupts dramatically more than a light crumb):
  // ~8 grains for the default weight, ~30 for the bomb. Each grain's fan offset, height, size and delay are
  // derived deterministically from its index so the spray looks scattered yet is reproducible.
  protected readonly grains = computed<Grain[]>(() => {
    const weight = this.weight();
    const count = Math.round(6 + weight * weight * 14);
    const spread = 30 + weight * 80;
    const lift = 16 + weight * 26;

    return Array.from({ length: count }, (_, index) => {
      const seed = index + 1;

      return {
        gx: `${Math.round((noise(seed) * 2 - 1) * spread)}px`,
        gy: `${-Math.round(lift * (0.55 + noise(seed + 7.3)))}px`,
        size: `${2 + Math.round(noise(seed + 13.7) * 3)}px`,
        delay: `${Math.round(noise(seed + 19.1) * 120)}ms`,
      };
    });
  });
}
