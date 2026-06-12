import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';

import type { Blast } from '../../../data/models/blast';
import type { OrphanFloat, OwnedFloat } from '../../../data/models/floating-message';
import type { HitBurst, OwnedSpark } from '../../../data/models/hit-burst';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { AquariumDecorComponent } from '../aquarium-decor/aquarium-decor.component';
import { BubbleBurstComponent } from '../bubble-burst/bubble-burst.component';
import { DebugBoxComponent } from '../debug-box/debug-box.component';
import { DebugReadoutComponent } from '../debug-readout/debug-readout.component';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import { ForegroundKelpComponent } from '../foreground-kelp/foreground-kelp.component';
import { MidgroundKelpComponent } from '../midground-kelp/midground-kelp.component';
import { SandPuffComponent } from '../sand-puff/sand-puff.component';
import { SceneItemComponent } from '../scene-item/scene-item.component';
import { ScenePlayerComponent } from '../scene-player/scene-player.component';
import { ItemExtrapolatorService } from './item-extrapolator.service';
import { PlayerExtrapolatorService, SHIELD_AURA_CLASS } from './player-extrapolator.service';
import { SceneBurstsService } from './scene-bursts.service';
import { SceneCameraService } from './scene-camera.service';
import { SceneSandPuffsService } from './scene-sand-puffs.service';
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

// Bucket owner-scoped scene items (floats, sparks) by their `ownerId`, so each `.scene__player` renders and
// carries only its own. Preserves source order within each bucket.
function groupByOwner<T extends { ownerId: string }>(items: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const existing = grouped.get(item.ownerId);

    if (existing === undefined) {
      grouped.set(item.ownerId, [item]);
    } else {
      existing.push(item);
    }
  }

  return grouped;
}

@Component({
  selector: 'left-paw-scene',
  imports: [
    AquariumDecorComponent,
    BubbleBurstComponent,
    DebugBoxComponent,
    DebugReadoutComponent,
    FloatingTextComponent,
    ForegroundKelpComponent,
    MidgroundKelpComponent,
    SandPuffComponent,
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
    SceneSandPuffsService,
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
  // A component element, so read its host ElementRef explicitly (a bare viewChild would yield the component
  // instance). The camera writes its width/transform each frame.
  private readonly foregroundKelpRef = viewChild<ElementRef<HTMLElement>, ElementRef<HTMLElement>>(
    'foregroundKelp',
    { read: ElementRef },
  );

  public readonly blasts = input<readonly Blast[]>([]);
  public readonly hitBursts = input<readonly HitBurst[]>([]);
  public readonly ownedSparks = input<readonly OwnedSpark[]>([]);
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
  protected readonly sandPuffs = this.facade.sandPuffs;
  protected readonly maxHp = MAX_VISUAL_HP;
  protected readonly worldWidth = FRENZY.world.width;
  protected readonly worldHeight = FRENZY.world.height;
  // Which aura class wears the glassy bubble skin (the shield ward) — the rest are flat rings.
  protected readonly shieldAuraClass = SHIELD_AURA_CLASS;
  // Item sprite size from the shared contract, exposed to CSS so render size tracks the server bound source.
  protected readonly itemSize = `${FRENZY.physicalSizePx.item}px`;
  // Debug draw toggle from the `?debug` query param — overlays each actor's physical box (the AABB hitbox source)
  // so authored `STAGE_BODY` sizes can be eyeballed against the sprite silhouette. Snapshot read; no reactivity.
  protected readonly debug = inject(ActivatedRoute).snapshot.queryParamMap.has('debug');
  // Owned floats grouped by their player, so each `.scene__player` can render (and carry) its own quips.
  protected readonly floatsByOwner = computed(() => groupByOwner(this.ownedFloats()));
  // Rock/brick impact sparks grouped by the struck player, so each `.scene__player` renders (and carries) its own.
  protected readonly sparksByOwner = computed(() => groupByOwner(this.ownedSparks()));

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
            this.foregroundKelpRef()?.nativeElement,
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

  // Press anywhere bubbles up here. A tap that misses an item spawns the airy bubble burst (the success cue for a
  // hit is the dense converging burst, driven server-side from `eaten`); and — unless the press landed on an
  // actionable element (an item to eat, my own Pokémon to poke) — it steers my Pokémon toward the point. Open
  // water, decor and other players all count as steering targets. Item/poke taps keep their own (click) actions.
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
    const target = event.target as HTMLElement;

    // Bubbles are the miss cue — suppressed on an item hit (the converging success burst comes from `eaten`).
    if (target.closest('.scene__item') === null) {
      this.facade.spawnBurst(x, y);
    }

    if (target.closest('.scene__item, .scene__poke') === null) {
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
