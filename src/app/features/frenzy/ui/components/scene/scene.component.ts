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
import type { OwnedShieldBlock } from '../../../data/models/shield-block';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { AquariumDecorComponent } from '../aquarium-decor/aquarium-decor.component';
import { BubbleBurstComponent } from '../bubble-burst/bubble-burst.component';
import { DebugOverlayComponent } from '../../../debug/debug-overlay/debug-overlay.component';
import { parseDebugFlags } from '../../../debug/debug-options';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import { ForegroundKelpComponent } from '../foreground-kelp/foreground-kelp.component';
import { MidgroundKelpComponent } from '../midground-kelp/midground-kelp.component';
import { OffscreenIndicatorsComponent } from '../offscreen-indicators/offscreen-indicators.component';
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Bucket owner-scoped scene items (floats, sparks) by their `ownerId`. Sparks render inside each `.scene__player`;
// floats render in the scene's owned-float overlay keyed by the same id. Preserves source order within each bucket.
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
    DebugOverlayComponent,
    FloatingTextComponent,
    ForegroundKelpComponent,
    MidgroundKelpComponent,
    OffscreenIndicatorsComponent,
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
  // Foreground parallax INNER tile sheets — the elements the camera translates each frame (their wrappers clip).
  // Optional like worldRef — absent for the first frames under async *transloco.
  private readonly parallaxNearRef = viewChild<ElementRef<HTMLElement>>('parallaxNear');
  private readonly parallaxMidRef = viewChild<ElementRef<HTMLElement>>('parallaxMid');
  // A component element, so read its host ElementRef explicitly (a bare viewChild would yield the component
  // instance). The camera writes its width/transform each frame.
  private readonly foregroundKelpRef = viewChild<ElementRef<HTMLElement>, ElementRef<HTMLElement>>(
    'foregroundKelp',
    { read: ElementRef },
  );
  // The off-screen indicators overlay — driven imperatively from this loop (positions each frame, structure
  // throttled) instead of via per-frame inputs, to keep the rAF work off change detection like the rest of the scene.
  private readonly offscreenIndicators = viewChild(OffscreenIndicatorsComponent);

  public readonly blasts = input<readonly Blast[]>([]);
  public readonly hitBursts = input<readonly HitBurst[]>([]);
  public readonly ownedSparks = input<readonly OwnedSpark[]>([]);
  public readonly ownedShieldBlocks = input<readonly OwnedShieldBlock[]>([]);
  public readonly evolvingPlayers = input<ReadonlyMap<string, number>>(new Map());
  public readonly orphanFloats = input<readonly OrphanFloat[]>([]);
  public readonly ownedFloats = input<readonly OwnedFloat[]>([]);
  public readonly itemClick = output<ItemClick>();
  public readonly items = input.required<readonly Item[]>();
  public readonly myId = input<string | null>(null);
  public readonly players = input.required<readonly Player[]>();
  // The crowned player id (alive hp-leader; null when there's no meaningful leader, e.g. a lone survivor). Gated
  // and resolved upstream via the shared `crownIdOf`, so the scene marker matches the pill and minimap exactly.
  public readonly crownId = input<string | null>(null);
  public readonly selfPoke = output<void>();
  public readonly pokeNpc = output<string>();
  public readonly steer = output<{ x: number; y: number }>();

  protected readonly renderedItems = this.facade.renderedItems;
  // Paint items far→near for seabed perspective: sort by y ascending so an item lower on screen (nearer the camera,
  // higher y) renders LATER and overlaps the ones behind it. DOM order is the depth cue at the shared item z-index
  // (the bomb keeps its own lift; players paint after all items, so they stay above). track-by-id means a reorder
  // just moves the existing nodes — no re-create, no animation reset.
  protected readonly renderedItemsByDepth = computed(() =>
    [...this.renderedItems()].sort((first, second) => first.y - second.y),
  );

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
  // The bomb's larger collidable size (sensor-horn reach) — for the `?debug` box so it frames the real trigger area.
  protected readonly bombSize = `${FRENZY.physicalSizePx.bomb}px`;
  // Per-category `?debug` overlay toggles parsed from the query param (`?debug` = all; `?debug=pokemon-borders`,
  // `item-borders`, `speed` = pick) — lets a session draw just the boxes it needs against the sprite silhouette.
  // Snapshot read; no reactivity.
  protected readonly debug = parseDebugFlags(inject(ActivatedRoute).snapshot.queryParamMap);
  // Owned floats grouped by their player, so the owned-float overlay renders each sprite's quips on its body point.
  protected readonly floatsByOwner = computed(() => groupByOwner(this.ownedFloats()));
  // Rock/brick impact sparks grouped by the struck player, so each `.scene__player` renders (and carries) its own.
  protected readonly sparksByOwner = computed(() => groupByOwner(this.ownedSparks()));
  // Shield-ward cues grouped by the warded player, so each `.scene__player` pulses its bubble + clinks in place.
  protected readonly shieldBlocksByOwner = computed(() => groupByOwner(this.ownedShieldBlocks()));
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
          // Right after the camera writes this frame's transform, reposition the off-screen indicators off the
          // matching snapshot (zero phase skew); the overlay throttles its own structural recompute internally.
          this.offscreenIndicators()?.frame(this.facade.cameraSnapshot(), now);
        }
      };

      rafId = requestAnimationFrame(loop);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(rafId));
    });
  }

  protected onItemClick(item: RenderedItem, event: MouseEvent): void {
    // Bomb is shoved away from wherever it was tapped: tap a side and it drifts off in the opposite direction.
    const shove = item.type === 'bomb' ? this.batNudge(event) : undefined;

    this.itemClick.emit({ itemId: item.id, nudgeX: shove?.x, nudgeY: shove?.y });
  }

  protected onSelfPoke(): void {
    this.selfPoke.emit();
  }

  protected onPokeNpc(npcId: string): void {
    this.pokeNpc.emit(npcId);
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

    if (target.closest('.scene__item, .scene__poke, .scene__poke-npc') === null) {
      // Optimistically steer my own sprite this frame, then send the authoritative request. The server confirms
      // via the next snapshot, which reconciles only a sub-pixel gap (same steer math both sides).
      this.facade.predictSteer(this.myId(), x, y, performance.now());
      this.steer.emit({ x, y });
    }
  }

  // Shove direction (unit vector) pointing from the tapped point toward the bomb's centre — i.e. AWAY from the side
  // that was hit, so tapping the right edge pushes it left, the top pushes it down, a corner pushes diagonally. The
  // server scales this by a fixed `bomb.clickImpulse`, so only the direction matters here. A dead-centre tap falls
  // back to a straight-up nudge.
  private batNudge(event: MouseEvent): { x: number; y: number } {
    const button = event.currentTarget as HTMLElement;
    const bounds = button.getBoundingClientRect();
    const deltaX = bounds.left + bounds.width / 2 - event.clientX;
    const deltaY = bounds.top + bounds.height / 2 - event.clientY;
    const magnitude = Math.hypot(deltaX, deltaY);

    if (magnitude === 0) {
      return { x: 0, y: -1 };
    }

    return { x: deltaX / magnitude, y: deltaY / magnitude };
  }
}
