import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import type { OwnedFloat } from '../../../data/models/floating-message';
import { ActorHostDirective } from '../../directives/actor-host.directive';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import type { RenderedPlayer } from '../scene/scene-view-models';

/**
 * The owned-float overlay: each live player's transient quips, rendered as direct world children (NOT nested in the
 * player) so they clear the kelp layers, and parked on the player's body point via the actor registry's compositor
 * `translate` (the `leftPawActorHost="float"` registration) so they ride the sprite's drift. The host is
 * `display: contents` — layout-transparent — so each per-player column keeps the scene's floating-text z-index
 * relative to the world, exactly as when this block lived inline in the scene template.
 *
 * `floatsByOwner` never holds an empty bucket (see `groupByOwner`), so a present bucket renders without a length
 * re-check. Translation keys live on the model and resolve here under the shared `frenzy.scene` prefix.
 */
@Component({
  selector: 'left-paw-owned-floats',
  imports: [ActorHostDirective, FloatingTextComponent, TranslocoDirective],
  templateUrl: './owned-floats.component.html',
  styleUrl: './owned-floats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnedFloatsComponent {
  public readonly players = input.required<readonly RenderedPlayer[]>();
  public readonly floatsByOwner = input.required<ReadonlyMap<string, readonly OwnedFloat[]>>();
}
