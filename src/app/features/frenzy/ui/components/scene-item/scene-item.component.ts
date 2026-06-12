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

import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';
import type { RenderedItem } from '../scene/scene-view-models';

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
