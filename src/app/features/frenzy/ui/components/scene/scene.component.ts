import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { ActorHostDirective } from '../../directives/actor-host.directive';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { AquariumDecorComponent } from '../aquarium-decor/aquarium-decor.component';
import { BubbleBurstComponent } from '../bubble-burst/bubble-burst.component';
import { DebugConfiguratorComponent } from '../../../debug/debug-configurator/debug-configurator.component';
import { DebugOverlayComponent } from '../../../debug/debug-overlay/debug-overlay.component';
import { parseDebugFlags } from '../../../debug/debug-options';
import { DebugSettingsStore } from '../../../debug/debug-settings.store';
import type { RenderMode } from '../../../debug/debug-settings.store';
import type { PerfMetricsSnapshot } from '../../../debug/perf-metrics';
import { PerfLogPanelComponent } from '../../../debug/perf-log-panel/perf-log-panel.component';
import { PerfReadoutComponent } from '../../../debug/perf-readout/perf-readout.component';
import { PerfSampleStore } from '../../../debug/perf-sample.store';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import { ForegroundKelpComponent } from '../foreground-kelp/foreground-kelp.component';
import { MidgroundKelpComponent } from '../midground-kelp/midground-kelp.component';
import { OffscreenIndicatorsComponent } from '../offscreen-indicators/offscreen-indicators.component';
import { OwnedFloatsComponent } from '../owned-floats/owned-floats.component';
import { SandPuffComponent } from '../sand-puff/sand-puff.component';
import { SceneItemComponent } from '../scene-item/scene-item.component';
import { ScenePlayerComponent } from '../scene-player/scene-player.component';
import { ItemExtrapolatorService } from './prediction/item-extrapolator.service';
import { PerfMetricsService } from './perf/perf-metrics.service';
import { PlayerExtrapolatorService } from './prediction/player-extrapolator.service';
import { SceneActorRegistryService } from './rendering/dom/scene-actor-registry.service';
import { SceneBurstsService } from './effects/scene-bursts.service';
import { SceneCameraService } from './camera/scene-camera.service';
import { SceneDecorCanvasService } from './rendering/canvas/scene-decor-canvas.service';
import { SceneItemCanvasService } from './rendering/canvas/scene-item-canvas.service';
import { SceneSandPuffsService } from './effects/scene-sand-puffs.service';
import { PlayerSpriteSource } from './rendering/canvas/player-sprite-source';
import { SpriteFreezeService } from './rendering/canvas/sprite-freeze.service';
import {
  hitTestItem,
  resolveNudge,
  resolveNudgeFromCenter,
  resolveSceneTap,
} from './input/pointer-intent';
import { SceneFacade } from './scene.facade';
import { SceneRenderLoopService } from './rendering/shared/scene-render-loop.service';
import { groupByOwner, sortByDepth } from './scene-view-models';
import type { ItemClick, RenderedItem } from './scene-view-models';

// Other players' HP bars use a single absolute scale — the hard ceiling — so a bar's fill reads the same for
// everyone regardless of stage (the OWN widget instead scales to its next evolution threshold).
const MAX_VISUAL_HP = FRENZY.maxHp;

// The falling-item tap target in world px: the sprite half-size plus the same 12px padding the DOM `.scene__item`
// button carries, so a canvas item is as easy to tap as a DOM one (used by the canvas-mode hit-test).
const ITEM_TAP_PADDING_PX = 12;
// That tap box as a normalized half-extent per axis (the world is taller than wide), precomputed from the contract
// sizes for the canvas-mode hit-test.
const ITEM_HIT_HALF_X = (FRENZY.physicalSizePx.item / 2 + ITEM_TAP_PADDING_PX) / FRENZY.world.width;
const ITEM_HIT_HALF_Y =
  (FRENZY.physicalSizePx.item / 2 + ITEM_TAP_PADDING_PX) / FRENZY.world.height;

@Component({
  selector: 'left-paw-scene',
  imports: [
    ActorHostDirective,
    AquariumDecorComponent,
    BubbleBurstComponent,
    DebugConfiguratorComponent,
    DebugOverlayComponent,
    FloatingTextComponent,
    ForegroundKelpComponent,
    MidgroundKelpComponent,
    OffscreenIndicatorsComponent,
    OwnedFloatsComponent,
    PerfLogPanelComponent,
    PerfReadoutComponent,
    SandPuffComponent,
    SceneItemComponent,
    ScenePlayerComponent,
    ScenePositionDirective,
    TranslocoDirective,
  ],
  providers: [
    SceneFacade,
    SceneRenderLoopService,
    ItemExtrapolatorService,
    PlayerExtrapolatorService,
    SceneActorRegistryService,
    SceneCameraService,
    SceneBurstsService,
    SceneSandPuffsService,
    SceneItemCanvasService,
    SceneDecorCanvasService,
    PlayerSpriteSource,
    SpriteFreezeService,
    // Perf subsystem — provided here but injected only under `?debug=perf` (the metric accumulator by this component
    // below, the settings store + sample log by the gated panels), so none of them instantiate in normal play.
    PerfMetricsService,
    DebugSettingsStore,
    PerfSampleStore,
  ],
  templateUrl: './scene.component.html',
  styleUrl: './scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneComponent {
  private readonly facade = inject(SceneFacade);
  private readonly loop = inject(SceneRenderLoopService);
  private readonly itemCanvas = inject(SceneItemCanvasService);
  private readonly decorCanvas = inject(SceneDecorCanvasService);
  // The `?debug=perf` metric accumulator — injected (and thus instantiated) only under the master gate, in the
  // constructor; undefined in normal play. Fed by the render loop; its snapshot drives the readout.
  private perfMetrics: PerfMetricsService | undefined;
  // The persisted debug settings (render-mode toggle + DPR cap) — injected only under the master gate like the
  // accumulator above; undefined in normal play, where the item render mode is always 'dom'.
  private debugSettings: DebugSettingsStore | undefined;
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
  // The hybrid-canvas item layer's element — present only while the render mode is 'canvas' (the template @if).
  private readonly itemCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('itemCanvas');
  // The hybrid-canvas decor layer's element — present only while the decor mode is 'canvas' (the template @if).
  private readonly decorCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('decorCanvas');

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
  // Depth order for the seabed perspective (see `sortByDepth`). track-by-id in the template means a reorder just
  // moves the existing nodes — no re-create, no animation reset.
  // Empty in canvas item mode (the items are drawn on the actors-canvas, not as DOM nodes) so the template `@for`
  // renders nothing without needing its own `@if` guard — keeping the template's cyclomatic complexity down.
  protected readonly renderedItemsByDepth = computed(() => {
    return this.renderMode() === 'canvas' ? [] : sortByDepth(this.renderedItems());
  });
  // The item render backend, reactive so the template @if (and the render loop) pick it up the instant the toggle
  // flips. Reads the debug store only when it exists (under `?debug=perf`); a real player is always 'dom'.
  protected readonly renderMode = computed<RenderMode>(
    () => this.debugSettings?.renderMode() ?? 'dom',
  );
  // The player-sprite render backend, reactive so each scene-player picks it up the instant the toggle flips. Reads
  // the debug store only when it exists (under `?debug=perf`); a real player is always 'dom' (animated DOM sprite).
  protected readonly playerSpritesMode = computed<RenderMode>(
    () => this.debugSettings?.playerSpritesMode() ?? 'dom',
  );
  // Whether the shared actors-canvas element must exist this frame — when EITHER the items or the player sprites are
  // on canvas. The single `<canvas>` is bound to SceneItemCanvasService, which draws items and/or players onto it;
  // the `||` lives here (not the template) to keep the template's cyclomatic complexity down.
  protected readonly actorsCanvasActive = computed(
    () => this.renderMode() === 'canvas' || this.playerSpritesMode() === 'canvas',
  );
  // The decor render backend, reactive so the template @if (and the render loop) pick it up the instant the toggle
  // flips. Reads the debug store only when it exists (under `?debug=perf`); a real player gets the default `canvas`
  // backdrop (ADR 0007 — after the tablet A/B went green), with `dom` kept as the `?debug=perf` fallback.
  protected readonly decorMode = computed<RenderMode>(
    () => this.debugSettings?.decorMode() ?? 'canvas',
  );
  // Whether to render players as a static first frame (the `?debug=perf` "freeze sprites" toggle), passed down to
  // each scene-player. Reads the debug store only when it exists; a real player is always animated (false).
  protected readonly freezeSprites = computed(() => this.debugSettings?.freezeSprites() ?? false);
  // The frame-pacing cap target in fps (the `?debug=perf` "frame cap" toggle), read each frame by the render loop.
  // Reads the debug store only when it exists; a real player is always uncapped (0).
  protected readonly frameCapFps = computed(() => this.debugSettings?.frameCapFps() ?? 0);
  // Per-layer render switches (the `?debug=perf` "scene layers" toggles), to bisect the FPS culprit on the device.
  // Undefined in normal play (no debug store) — the template reads `?.<layer> !== false`, so everything renders.
  protected readonly sceneLayers = computed(() => this.debugSettings?.sceneLayers());
  // Within-decor diagnostic probes (the `?debug=perf` "decor probe" toggles) — each drives a `.scene--decor-*` host
  // class that aquarium-decor reads via :host-context, to bisect WHICH part of decor costs the most. Undefined in
  // normal play (no debug store) — the template reads `?.<probe> === true`, so every probe stays inactive.
  protected readonly decorProbe = computed(() => this.debugSettings?.decorProbe());

  protected readonly renderedPlayers = this.facade.renderedPlayers;
  protected readonly bursts = this.facade.bursts;
  protected readonly sandPuffs = this.facade.sandPuffs;
  protected readonly maxHp = MAX_VISUAL_HP;
  protected readonly worldWidth = FRENZY.world.width;
  protected readonly worldHeight = FRENZY.world.height;
  // Item sprite size from the shared contract, exposed to CSS so render size tracks the server bound source.
  protected readonly itemSize = `${FRENZY.physicalSizePx.item}px`;
  // The bomb's larger collidable size (sensor-horn reach) — for the `?debug` box so it frames the real trigger area.
  protected readonly bombSize = `${FRENZY.physicalSizePx.bomb}px`;
  // Per-category `?debug` overlay toggles parsed from the query param (`?debug` = all; `?debug=pokemon-borders`,
  // `item-borders`, `speed` = pick) — lets a session draw just the boxes it needs against the sprite silhouette.
  // Snapshot read; no reactivity.
  protected readonly debug = parseDebugFlags(inject(ActivatedRoute).snapshot.queryParamMap);
  // The box-drawing debug categories (a dev tool). When any is on, the structure signals are republished every frame
  // so the overlay's boxes track the imperatively-moved sprites. `perf` is NOT here — it must measure the optimized
  // path, so it never reintroduces per-frame change detection on the actors.
  protected readonly debugBoxesActive =
    this.debug.pokemonBorders || this.debug.itemBorders || this.debug.speed;
  // The metric snapshot fed to the `?debug=perf` readout — the accumulator's signal when the gate is on, else a
  // constant null (the readout that reads it isn't rendered then anyway). The closure reads `perfMetrics` lazily,
  // after the constructor has set it.
  protected readonly perfMetricsSnapshot = computed<PerfMetricsSnapshot | null>(
    () => this.perfMetrics?.snapshot() ?? null,
  );
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

    // Instantiate the perf accumulator only under the master gate (conditional `inject` in the constructor's
    // injection context), so a real player never creates it or the settings store the readout/configurator inject.
    if (this.debug.perf) {
      this.perfMetrics = inject(PerfMetricsService);
      this.debugSettings = inject(DebugSettingsStore);
    }

    // Canvas backend lifecycle: bind + size the item canvas whenever it's present (canvas mode), and re-size it when
    // the DPR cap changes. When the mode flips back to DOM the template @if removes the element, so there's nothing
    // to bind; in normal play the canvas never renders and this effect stays inert.
    effect(() => {
      const canvas = this.itemCanvasRef()?.nativeElement;

      if (canvas === undefined) {
        return;
      }

      this.itemCanvas.attach(canvas);
      this.itemCanvas.resize(this.debugSettings?.canvasDprCap() ?? 0);
    });

    // Canvas decor backend lifecycle (ADR 0007): bind + size the decor canvas whenever it's present (decor canvas
    // mode — the default now, so this runs in normal play too), re-sizing on the DPR-cap change. Mirrors the item-
    // canvas effect above; only inert when the `?debug=perf` decor toggle is flipped back to the DOM fallback.
    effect(() => {
      const canvas = this.decorCanvasRef()?.nativeElement;

      if (canvas === undefined) {
        return;
      }

      this.decorCanvas.attach(canvas);
      this.decorCanvas.resize(this.debugSettings?.canvasDprCap() ?? 0);
    });

    // Start the rAF render loop once the view exists. The loop service owns the frame lifecycle and the per-frame
    // facade sequence; this shell only supplies the live inputs and DOM refs it reads each frame (see ADR 0004 §4).
    afterNextRender(() => {
      this.loop.start({
        items: () => this.items(),
        players: () => this.players(),
        myId: () => this.myId(),
        evolving: () => this.evolvingPlayers(),
        renderMode: () => this.renderMode(),
        playerSpritesMode: () => this.playerSpritesMode(),
        decorMode: () => this.decorMode(),
        decorNoPlants: () => this.decorProbe()?.noPlants === true,
        frameCapFps: () => this.frameCapFps(),
        debug: this.debug,
        debugBoxesActive: this.debugBoxesActive,
        world: () => this.worldRef()?.nativeElement,
        parallaxNear: () => this.parallaxNearRef()?.nativeElement,
        parallaxMid: () => this.parallaxMidRef()?.nativeElement,
        foregroundKelp: () => this.foregroundKelpRef()?.nativeElement,
        offscreenIndicators: () => this.offscreenIndicators(),
        perfMetrics: () => this.perfMetrics,
      });
    });
  }

  protected onItemClick(item: RenderedItem, event: MouseEvent): void {
    // Bomb is shoved away from wherever it was tapped: tap a side and it drifts off in the opposite direction.
    const button = event.currentTarget as HTMLElement;
    const shove =
      item.type === 'bomb'
        ? resolveNudge(button.getBoundingClientRect(), event.clientX, event.clientY)
        : undefined;

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

    const intent = resolveSceneTap(
      bounds,
      event.clientX,
      event.clientY,
      event.target as Element | null,
    );

    // Canvas mode: items aren't DOM nodes, so a tap on one arrives as open water (steer=true). Hit-test the drawn
    // items first; a hit eats that item (or shoves the bomb) and suppresses the miss-bubble + steer, exactly like a
    // DOM item tap. A press on a poke button (still DOM) sets steer=false, so it is left to its own handler.
    if (this.renderMode() === 'canvas' && intent.steer) {
      const items = this.canvasHitItems();
      const hitId = hitTestItem(items, intent.x, intent.y, ITEM_HIT_HALF_X, ITEM_HIT_HALF_Y);

      if (hitId !== null) {
        // The bomb has no DOM rect on canvas, so its shove is measured from the tap to its world centre.
        const hit = items.find((item) => item.id === hitId);
        const shove =
          hit?.type === 'bomb' ? resolveNudgeFromCenter(hit, intent.x, intent.y) : undefined;

        this.itemClick.emit({ itemId: hitId, nudgeX: shove?.x, nudgeY: shove?.y });

        return;
      }
    }

    // Bubbles are the miss cue — suppressed on an item hit (the converging success burst comes from `eaten`).
    if (intent.spawnBurst) {
      this.facade.spawnBurst(intent.x, intent.y);
    }

    if (intent.steer) {
      // Optimistically steer my own sprite this frame, then send the authoritative request. The server confirms
      // via the next snapshot, which reconciles only a sub-pixel gap (same steer math both sides).
      this.facade.predictSteer(this.myId(), intent.x, intent.y, performance.now());
      this.steer.emit({ x: intent.x, y: intent.y });
    }
  }

  // Desktop hover for the canvas backend: canvas items have no DOM `:hover`, so track the pointer and tell the
  // renderer which item to draw with the highlight. Mouse only — a touch drag shouldn't leave a glowing trail.
  protected onScenePointerMove(event: PointerEvent): void {
    if (this.renderMode() !== 'canvas' || event.pointerType !== 'mouse') {
      return;
    }

    const world = this.worldRef()?.nativeElement;

    if (world === undefined) {
      return;
    }

    const bounds = world.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const normX = (event.clientX - bounds.left) / bounds.width;
    const normY = (event.clientY - bounds.top) / bounds.height;

    this.itemCanvas.setHovered(
      hitTestItem(this.canvasHitItems(), normX, normY, ITEM_HIT_HALF_X, ITEM_HIT_HALF_Y),
    );
  }

  protected onScenePointerLeave(): void {
    this.itemCanvas.setHovered(null);
  }

  // Live items in draw order (ascending depth) for the canvas hit-test — the topmost (last) wins, matching the
  // canvas draw order. Uses the live frame (not the throttled structure signal) so a fast faller is hit where it's
  // actually drawn. The bomb is included now (drawn on canvas), so a tap on it shoves it instead of steering past.
  private canvasHitItems(): readonly RenderedItem[] {
    return [...this.facade.itemFrame()].sort((first, second) => first.y - second.y);
  }
}
