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
})
export class SceneItemComponent {
  public readonly item = input.required<RenderedItem>();
  public readonly clicked = output<MouseEvent>();
}
