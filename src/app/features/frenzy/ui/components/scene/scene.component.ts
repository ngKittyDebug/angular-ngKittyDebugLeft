import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

import type { Blast } from '../../../data/models/blast';
import type { OrphanFloat, OwnedFloat } from '../../../data/models/floating-message';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { AquariumDecorComponent } from '../aquarium-decor/aquarium-decor.component';
import { BubbleBurstComponent } from '../bubble-burst/bubble-burst.component';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import { SceneItemComponent } from '../scene-item/scene-item.component';
import { ScenePlayerComponent } from '../scene-player/scene-player.component';
import { ItemExtrapolatorService } from './item-extrapolator.service';
import { PlayerExtrapolatorService, SHIELD_AURA_CLASS } from './player-extrapolator.service';
import { SceneBurstsService } from './scene-bursts.service';
import { SceneCameraService } from './scene-camera.service';
import { SceneFacade } from './scene.facade';
import type { ItemClick, RenderedItem } from './scene-view-models';

// Other players' HP bars use a single absolute scale — the hard ceiling — so a bar's fill reads the same for
// everyone regardless of stage (the OWN widget instead scales to its next evolution threshold).
const MAX_VISUAL_HP = FRENZY.maxHp;

// Fixed pixel distance the bomb is batted per click — converted to normalized units against the world width,
// so a juggle covers the same world distance on any screen size rather than scaling with the viewport.
const BOMB_NUDGE_PX = 72;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

@Component({
  selector: 'left-paw-scene',
  imports: [
    AquariumDecorComponent,
    BubbleBurstComponent,
    FloatingTextComponent,
    SceneItemComponent,
    ScenePlayerComponent,
    ScenePositionDirective,
    TranslocoDirective,
  ],
  providers: [
    SceneFacade,
    ItemExtrapolatorService,
    PlayerExtrapolatorService,
    SceneCameraService,
    SceneBurstsService,
  ],
  templateUrl: './scene.component.html',
  styleUrl: './scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(SceneFacade);
  // Optional (not `.required`): the template root sits under `*transloco`, which renders asynchronously, so the
  // ref is absent for the first few frames. Reading it before then must not throw and kill the rAF loop.
  private readonly worldRef = viewChild<ElementRef<HTMLElement>>('world');
  // Foreground parallax layers (optional like worldRef — absent for the first frames under async *transloco).
  private readonly parallaxNearRef = viewChild<ElementRef<HTMLElement>>('parallaxNear');
  private readonly parallaxMidRef = viewChild<ElementRef<HTMLElement>>('parallaxMid');

  public readonly blasts = input<readonly Blast[]>([]);
  public readonly evolvingPlayers = input<ReadonlyMap<string, number>>(new Map());
  public readonly orphanFloats = input<readonly OrphanFloat[]>([]);
  public readonly ownedFloats = input<readonly OwnedFloat[]>([]);
  public readonly itemClick = output<ItemClick>();
  public readonly items = input.required<readonly Item[]>();
  public readonly myId = input<string | null>(null);
  public readonly players = input.required<readonly Player[]>();
  public readonly selfPoke = output<void>();
  public readonly steer = output<{ x: number; y: number }>();

  protected readonly renderedItems = this.facade.renderedItems;
  protected readonly renderedPlayers = this.facade.renderedPlayers;
  protected readonly bursts = this.facade.bursts;
  protected readonly maxHp = MAX_VISUAL_HP;
  protected readonly worldWidth = FRENZY.world.width;
  protected readonly worldHeight = FRENZY.world.height;
  // Which aura class wears the glassy bubble skin (the shield ward) — the rest are flat rings.
  protected readonly shieldAuraClass = SHIELD_AURA_CLASS;
  // Item sprite size from the shared contract, exposed to CSS so render size tracks the server bound source.
  protected readonly itemSize = `${FRENZY.physicalSizePx.item}px`;
  // Owned floats grouped by their player, so each `.scene__player` can render (and carry) its own quips.
  protected readonly floatsByOwner = computed(() => {
    const grouped = new Map<string, OwnedFloat[]>();

    for (const float of this.ownedFloats()) {
      const existing = grouped.get(float.ownerId);

      if (existing === undefined) {
        grouped.set(float.ownerId, [float]);
      } else {
        existing.push(float);
      }
    }

    return grouped;
  });

  public constructor() {
    // Re-anchor item/player baselines from each snapshot and paint immediately (before the rAF loop starts).
    // Reading evolving/myId here too keeps the first paint consistent with them.
    effect(() => {
      this.facade.ingestItems(this.items(), performance.now());
    });

    effect(() => {
      this.facade.ingestPlayers(
        this.players(),
        this.myId(),
        this.evolvingPlayers(),
        performance.now(),
      );
    });

    afterNextRender(() => {
      let rafId = 0;
      const loop = (): void => {
        // Schedule the next frame first, so a throw anywhere below can never kill the animation loop.
        rafId = requestAnimationFrame(loop);

        const now = performance.now();

        this.facade.tickItems(this.items(), now);
        this.facade.tickPlayers(this.players(), this.myId(), this.evolvingPlayers(), now);

        const world = this.worldRef()?.nativeElement;

        if (world !== undefined) {
          this.facade.updateCamera(
            world,
            this.parallaxNearRef()?.nativeElement,
            this.parallaxMidRef()?.nativeElement,
          );
        }
      };

      rafId = requestAnimationFrame(loop);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(rafId));
    });
  }

  protected onItemClick(item: RenderedItem, event: MouseEvent): void {
    // Bomb is batted: tapping the left half of the sprite knocks it right, the right half knocks it left.
    const nudgeX = item.type === 'bomb' ? this.batNudge(event) : undefined;

    this.itemClick.emit({ itemId: item.id, nudgeX });
  }

  protected onSelfPoke(): void {
    this.selfPoke.emit();
  }

  // Press anywhere bubbles up here: always spawn a short-lived decorative bubble burst, and — unless the press
  // landed on an actionable element (an item to eat, my own Pokémon to poke) — steer my Pokémon toward the point.
  // Open water, decor and other players all count as steering targets. Item/poke taps keep their own (click) actions.
  protected onScenePointerDown(event: PointerEvent): void {
    // Coordinates are normalized against the camera-translated world rect (not the viewport), so a tap maps to
    // the same world point regardless of scroll. Clamped to 0..1 for taps landing in a letterbox margin.
    const world = this.worldRef()?.nativeElement;

    if (world === undefined) {
      return;
    }

    const bounds = world.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const x = clamp01((event.clientX - bounds.left) / bounds.width);
    const y = clamp01((event.clientY - bounds.top) / bounds.height);

    this.facade.spawnBurst(x, y);

    if ((event.target as HTMLElement).closest('.scene__item, .scene__poke') === null) {
      // Optimistically steer my own sprite this frame, then send the authoritative request. The server confirms
      // via the next snapshot, which reconciles only a sub-pixel gap (same steer math both sides).
      this.facade.predictSteer(this.myId(), x, y, performance.now());
      this.steer.emit({ x, y });
    }
  }

  // Signed normalized bat displacement: a fixed pixel step (BOMB_NUDGE_PX) over the world width, pushed right
  // when the click landed left of the item's centre and left otherwise. World-px based, so a juggle covers the
  // same world distance on any screen.
  private batNudge(event: MouseEvent): number {
    const button = event.currentTarget as HTMLElement;
    const bounds = button.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const direction = event.clientX < centerX ? 1 : -1;

    return (direction * BOMB_NUDGE_PX) / this.worldWidth;
  }
}
