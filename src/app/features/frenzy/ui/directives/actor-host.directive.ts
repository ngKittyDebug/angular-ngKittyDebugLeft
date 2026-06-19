import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

import { SceneActorRegistryService } from '../components/scene/scene-actor-registry.service';

// Which registry bucket the host belongs to: a falling item, a player sprite, or a player's owned-float column
// (the last shares the player's id and rides the same body point, but is a separate element from the sprite host).
export type ActorKind = 'item' | 'player' | 'float';

/**
 * Registers a drifting actor's host element with the scene's imperative position writer
 * (`SceneActorRegistryService`), keyed by id and kind. The scene then moves it every frame straight to the DOM
 * (`translate`, plus the player facing flip) without change detection — see ADR 0001. Registration positions the
 * element immediately from the last frame, so an actor entering mid-game never paints one frame at the origin.
 *
 * Replaces the per-frame `[leftPawScenePosition]` binding on the every-frame movers (items, players, owned-float
 * column). The static one-shots (bubble/blast bursts, orphan floats, sand puffs) keep `ScenePositionDirective`.
 */
@Directive({
  selector: '[leftPawActorHost]',
})
export class ActorHostDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly registry = inject(SceneActorRegistryService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly kind = input.required<ActorKind>({ alias: 'leftPawActorHost' });
  public readonly actorId = input.required<string>();

  public constructor() {
    // Register after the host is in the DOM. The id is fixed for the element's lifetime (the `@for` tracks by id, so
    // a given view ↔ one actor), so a single register/unregister pair is enough — no need to react to id changes.
    afterNextRender(() => {
      const id = this.actorId();
      const element = this.elementRef.nativeElement;

      switch (this.kind()) {
        case 'player': {
          this.registry.registerPlayer(id, element);
          this.destroyRef.onDestroy(() => this.registry.unregisterPlayer(id));
          break;
        }

        case 'float': {
          this.registry.registerFloat(id, element);
          this.destroyRef.onDestroy(() => this.registry.unregisterFloat(id));
          break;
        }

        default: {
          this.registry.registerItem(id, element);
          this.destroyRef.onDestroy(() => this.registry.unregisterItem(id));
        }
      }
    });
  }
}
