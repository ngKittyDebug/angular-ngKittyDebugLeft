import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';
import type { RenderedItem } from '../scene/scene-view-models';
import { buriedClipPolygon } from './buried-clip';

// Sensor running-light chase duration (the `--sensor-speed` CSS var). Maps the mine's hidden click budget to a
// speed: a full budget reads as calm at the original SVG pace, the last click before detonation runs frantic.
// A mine with no budget (undefined — aura-emitted) shows the calm default so it looks unchanged.
const SENSOR_SLOW_S = 1.6; // duration at full budget (matches the original baked-in `sensor-run`)
const SENSOR_FAST_S = 0.4; // duration at the last shove before it blows

/**
 * A single falling/resting item: the clickable sprite plus its per-item tumble/sway. Presentational — the scene
 * positions the host via `leftPawScenePosition` and turns the emitted click into an eat/bat command. The inner
 * `.scene__item` class is load-bearing: the scene's pointer-down handler uses it to tell an item tap from open
 * water (so a tap on an item never also steers).
 */
@Component({
  selector: 'left-paw-scene-item',
  imports: [ItemSpritePipe],
  templateUrl: './scene-item.component.html',
  styleUrl: './scene-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The bomb is the one item you actively shove (and its `?debug` speed pill / sensor box sit right over it). Mark
  // its host so the styles can lift it above the Pokémon layer — a tap on the mine must always reach it (and shove),
  // never be swallowed by an overlapping Pokémon sprite that paints later at the same z-index.
  host: {
    '[class.scene__item-host--bomb]': "item().type === 'bomb'",
    // Sensor running-light chase duration, driven from the mine's remaining click budget (see sensorSpeed).
    '[style.--sensor-speed]': 'sensorSpeed()',
  },
})
export class SceneItemComponent {
  // The sprite element carries the tumble/sway CSS animation; on landing we read its live transform off the DOM.
  private readonly sprite = viewChild<ElementRef<HTMLImageElement>>('sprite');
  // Once the item lands we bake the spin's CURRENT transform into a static inline style and drop the animation, so
  // the sprite truly holds its last frame. `animation-play-state: paused` is NOT enough: the scene re-sorts items by
  // depth, and Angular reorders the keyed `@for` by moving (detach + re-insert) views — re-inserting a node restarts
  // its CSS animation, snapping a settled item back toward 0° (the "settles, then twists" jerk). A plain static
  // transform has no animation to restart. Null while falling (the animation drives the transform); set once on
  // landing and never cleared (landing is final for an item).
  private readonly _frozenTransform = signal<string | null>(null);
  private hasFrozen = false;

  public readonly item = input.required<RenderedItem>();
  public readonly clicked = output<MouseEvent>();

  // Constant breathe cycle (ms) for the tumble's size-pulse — paired in the template with the per-item rotation
  // duration so the spinning items don't all breathe at the same rate as they rotate.
  protected readonly breatheMs = 2600;
  protected readonly frozenTransform = this._frozenTransform.asReadonly();
  protected readonly frozen = computed(() => this._frozenTransform() !== null);

  // Wavy clip-path for the buried sand line; null while the item is still falling (shows whole, no clip). The
  // shape is stable per item (id-seeded), so it sits still once landed. The transform/sink + transition stay in SCSS.
  protected readonly buriedClip = computed<string | null>(() => {
    const item = this.item();

    // The wavy sand line is shared with the canvas renderer (see buried-clip.ts), so a landed item buries with the
    // same id-seeded shape in both render modes; null while still falling (shows whole, no clip).
    return item.landed ? buriedClipPolygon(item.id) : null;
  });

  // Sensor running-light chase duration as a CSS `<time>` (`--sensor-speed`). The lights run faster as the mine's
  // hidden click budget drops: full budget → the calm SVG pace, the last shove → frantic. Linearly mapped between
  // the max budget (`clicksToExplodeRange[1]`, slow) and 1 (fast), clamped. No budget (undefined — aura-emitted) →
  // the calm default, so a non-counter mine looks exactly as before. The staggered per-horn delays scale with this
  // duration in SCSS, so the chase never desyncs.
  protected readonly sensorSpeed = computed<string>(() => {
    const clicksLeft = this.item().clicksLeft;
    const maxBudget = FRENZY.bomb.clicksToExplodeRange[1];

    if (clicksLeft === undefined || maxBudget <= 1) {
      return `${SENSOR_SLOW_S}s`;
    }

    // 0 at full budget, 1 at the last click (clamped) → interpolate slow→fast.
    const danger = Math.min(1, Math.max(0, (maxBudget - clicksLeft) / (maxBudget - 1)));
    const seconds = SENSOR_SLOW_S + (SENSOR_FAST_S - SENSOR_SLOW_S) * danger;

    return `${seconds.toFixed(3)}s`;
  });

  public constructor() {
    effect(() => {
      // The bomb never tumbles (no transform animation), so it has nothing to freeze.
      if (this.hasFrozen || !this.item().landed || this.item().type === 'bomb') {
        return;
      }

      const element = this.sprite()?.nativeElement;

      if (element === undefined) {
        return;
      }

      // Capture the exact composited transform (rotation + breathe scale) shown right now and latch it. Reads the
      // live value whether the animation is mid-run or already paused — either way it is the on-screen frame, so the
      // swap to the static style is seamless (no visible jump).
      this.hasFrozen = true;
      this._frozenTransform.set(getComputedStyle(element).transform);
    });
  }
}
