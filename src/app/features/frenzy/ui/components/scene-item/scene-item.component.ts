import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
  public readonly item = input.required<RenderedItem>();
  public readonly clicked = output<MouseEvent>();

  // Constant breathe cycle (ms) for the tumble's size-pulse — paired in the template with the per-item rotation
  // duration so the spinning items don't all breathe at the same rate as they rotate.
  protected readonly breatheMs = 2600;
}
