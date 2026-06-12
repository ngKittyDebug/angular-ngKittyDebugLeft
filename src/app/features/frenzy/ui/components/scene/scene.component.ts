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
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiProgressBar } from '@taiga-ui/kit';

import { FRENZY } from '@game/frenzy/config';
import { steerVelocity } from '@game/frenzy/steer-velocity';
import type { Item, Player, PlayerEffectKind, Stage } from '@game/frenzy/types';

import { isSad } from '../../../data/logic/is-sad';
import type { Blast } from '../../../data/models/blast';
import type { OrphanFloat, OwnedFloat } from '../../../data/models/floating-message';
import { spriteHeightFor } from '../../constants/pokemon-registry';
import { BubbleSkinDirective } from '../../directives/bubble-skin.directive';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';
import { MassToneColorPipe } from '../../pipes/mass-tone-color.pipe';
import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';
import { AquariumDecorComponent } from '../aquarium-decor/aquarium-decor.component';
import { BubbleBurstComponent } from '../bubble-burst/bubble-burst.component';
import { FloatingTextComponent } from '../floating-text/floating-text.component';
import { decayedOffset, OFFSET_DECAY_TAU_MS, reflect, reflectDirection } from './drift-math';

const MAX_VISUAL_MASS = FRENZY.thresholds.stage3;

// How long a click bubble-burst lives before it is removed (ms). Matches the CSS animation.
const BURST_LIFETIME_MS = 1000;

// Fixed pixel distance the bomb is batted per click — converted to normalized units against the world width,
// so a juggle covers the same world distance on any screen size rather than scaling with the viewport.
const BOMB_NUDGE_PX = 72;

// CSS class for the decorative aura ring drawn around a sprite per active effect kind.
const EFFECT_AURA_CLASS: Record<PlayerEffectKind, string> = {
  shield: 'scene__shield',
  wellFed: 'scene__well-fed',
  laying: 'scene__laying',
};

interface RenderedPlayer {
  appearance: string;
  effectAuras: readonly string[];
  facingRight: boolean;
  id: string;
  isDisconnected: boolean;
  isEvolving: boolean;
  isMe: boolean;
  isSad: boolean;
  label: string;
  mass: number;
  spriteHeight: string;
  stage: Stage;
  x: number;
  y: number;
}

interface RenderedItem {
  id: string;
  type: Item['type'];
  x: number;
  y: number;
  landed: boolean;
  spinDurationMs: number;
  spinReverse: boolean;
}

interface BubbleBurst {
  id: number;
  x: number;
  y: number;
}

export interface ItemClick {
  itemId: string;
  /** Bomb bat input: signed normalized horizontal displacement (fixed pixel step ÷ world width). Undefined for non-bomb items. */
  nudgeX?: number;
}

// Items extrapolate on two independent timelines so a launched (easter-egg) item can fly sideways while
// falling, yet a bomb nudge (horizontal only) never disturbs the vertical fall. Vertical is set once at spawn
// (`y = min(1, y0 + vy·tV)`); horizontal re-anchors on every server x/vx change — nudge, edge-stop, snapshot —
// (`x = clamp(x0 + vx·tH)`), then freezes the instant the item lands so it doesn't slide along the floor.
interface ItemBaseline {
  x0: number;
  vx: number;
  hStart: number;
  y0: number;
  vy: number;
  vStart: number;
}

interface PlayerBaseline {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  clientStartTime: number;
  // Visual reconciliation gap (rendered − authoritative, normalized units) captured at the last re-anchor and
  // decayed toward 0 from `offsetStamp`, so a snapshot correction glides in instead of snapping. Zero in steady
  // state (and on a player's first sight).
  offsetX: number;
  offsetY: number;
  offsetStamp: number;
}

// Falling items tumble: each gets a steady spin whose speed and direction are derived from its id, so the
// value is stable across frames (the CSS animation isn't restarted) yet varies item to item.
const ITEM_SPIN_MIN_MS = 2500;
const ITEM_SPIN_MAX_MS = 6000;

function spinFor(id: string): { durationMs: number; reverse: boolean } {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  const magnitude = Math.abs(hash);

  return {
    durationMs: ITEM_SPIN_MIN_MS + (magnitude % (ITEM_SPIN_MAX_MS - ITEM_SPIN_MIN_MS)),
    reverse: (magnitude & 1) === 1,
  };
}

// Camera smoothing: fraction of the remaining distance the camera covers toward its target each frame.
// Low enough to glide, high enough to keep up with the slow drift.
const CAMERA_LERP = 0.12;

// Dead-zone band as a fraction of the viewport: the focus roams freely inside [low, high] without moving the
// camera; only when it crosses an edge does the camera scroll to hold it at that edge. Calmer than always
// centring — the camera stays still while the Pokémon drifts within the central band, which also removes the
// constant micro-scroll that beat against pixel rounding. The band is the middle half of each viewport axis.
const CAMERA_DEAD_ZONE_LOW = 0.25;
const CAMERA_DEAD_ZONE_HIGH = 0.75;

// Responsive zoom: the world layer is scaled so small screens see MORE of the world (smaller on-screen sprites)
// instead of a tiny zoomed-in slice, and large screens render a touch below native size. The server stays in
// world px — this only changes how much world the camera window shows, making the visible world fraction more
// uniform across screens. These three are render-only tunables (no contract impact); pick final values by
// playtest.
const CAMERA_REFERENCE_WIDTH = 1700;
const CAMERA_MIN_SCALE = 0.55;
const CAMERA_MAX_SCALE = 0.85;

// `comfort` is the width-driven zoom-out (`clamp(vw / REFERENCE, MIN, MAX)`); `cover` is the floor that keeps the
// scaled world filling the viewport on BOTH axes, so there's never a letterbox band of page background around it.
// Cover wins when the window is large or awkwardly-shaped relative to the world (sprites grow a touch to fill);
// otherwise the comfort zoom-out applies.
function cameraScale(
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number,
): number {
  const comfort = Math.min(
    CAMERA_MAX_SCALE,
    Math.max(CAMERA_MIN_SCALE, viewportWidth / CAMERA_REFERENCE_WIDTH),
  );
  const cover = Math.max(viewportWidth / worldWidth, viewportHeight / worldHeight);

  return Math.max(comfort, cover);
}

// Foreground parallax: faint tiled particle layers in front of the world, shifted by the CAMERA offset — so they
// only drift while the viewport actually scrolls (the dead-zone holds the camera still during small meanders),
// giving a subtle direction cue during travel rather than a constant swarm. The factor is each layer's speed
// relative to the camera; kept gentle so it never lurches opposite the motion. Render-only tunables.
const PARALLAX_NEAR = 0.6;
const PARALLAX_MID = 0.35;

// Clamp a one-axis camera offset (px) so the window never reveals past a world edge; when the world is smaller
// than the viewport it's centred (letterbox margins) instead.
function clampCameraAxis(offset: number, viewport: number, world: number): number {
  if (world <= viewport) {
    return (viewport - world) / 2;
  }

  return Math.min(0, Math.max(viewport - world, offset));
}

// One-axis camera offset (px) that centres the normalized `focus` (0..1). Used for the opening snap so the view
// starts centred on the Pokémon rather than at a world corner.
function centerCameraAxis(focus: number, viewport: number, world: number): number {
  return clampCameraAxis(viewport / 2 - focus * world, viewport, world);
}

// One-axis dead-zone target (px): keep the current offset while the focus stays inside the central band; once it
// crosses a band edge, return the offset that pins it back to that edge. Always clamped to the world bounds.
function deadZoneCameraAxis(
  currentOffset: number,
  focus: number,
  viewport: number,
  world: number,
): number {
  if (world <= viewport) {
    return (viewport - world) / 2;
  }

  const screen = focus * world + currentOffset;
  const low = viewport * CAMERA_DEAD_ZONE_LOW;
  const high = viewport * CAMERA_DEAD_ZONE_HIGH;
  let offset = currentOffset;

  if (screen < low) {
    offset = low - focus * world;
  } else if (screen > high) {
    offset = high - focus * world;
  }

  return clampCameraAxis(offset, viewport, world);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

@Component({
  selector: 'left-paw-scene',
  imports: [
    AquariumDecorComponent,
    BubbleBurstComponent,
    BubbleSkinDirective,
    FloatingTextComponent,
    ItemSpritePipe,
    MassToneColorPipe,
    PokemonSpritePipe,
    ScenePositionDirective,
    TranslocoDirective,
    TuiProgressBar,
  ],
  templateUrl: './scene.component.html',
  styleUrl: './scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly renderer = inject(Renderer2);
  private readonly _renderedItems = signal<readonly RenderedItem[]>([]);
  private readonly _renderedPlayers = signal<readonly RenderedPlayer[]>([]);
  private readonly _bursts = signal<readonly BubbleBurst[]>([]);
  private readonly itemBaselines = new Map<string, ItemBaseline>();
  private readonly playerBaselines = new Map<string, PlayerBaseline>();
  private readonly burstTimers = new Set<ReturnType<typeof setTimeout>>();
  // Optional (not `.required`): the template root sits under `*transloco`, which renders asynchronously, so the
  // ref is absent for the first few frames. Reading it before then must not throw and kill the rAF loop.
  private readonly worldRef = viewChild<ElementRef<HTMLElement>>('world');
  // Foreground parallax layers (optional like worldRef — absent for the first frames under async *transloco).
  private readonly parallaxNearRef = viewChild<ElementRef<HTMLElement>>('parallaxNear');
  private readonly parallaxMidRef = viewChild<ElementRef<HTMLElement>>('parallaxMid');
  private burstCounter = 0;
  // Camera offset (px) applied to the world layer, eased toward its dead-zone target each frame (sub-pixel, no
  // rounding). `cameraReady` snaps to the centred target on the first frame so the view opens already centred
  // instead of swooping in from the corner.
  private camX = 0;
  private camY = 0;
  private cameraReady = false;

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

  protected readonly renderedItems = this._renderedItems.asReadonly();
  protected readonly renderedPlayers = this._renderedPlayers.asReadonly();
  protected readonly bursts = this._bursts.asReadonly();
  protected readonly maxMass = MAX_VISUAL_MASS;
  protected readonly worldWidth = FRENZY.world.width;
  protected readonly worldHeight = FRENZY.world.height;
  // Which aura class wears the glassy bubble skin (the shield ward) — the rest are flat rings.
  protected readonly shieldAuraClass = EFFECT_AURA_CLASS.shield;
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
    effect(() => {
      const items = this.items();
      const now = performance.now();
      const currentIds = new Set<string>();

      for (const item of items) {
        currentIds.add(item.id);

        const vx = item.vx ?? 0;
        const baseline = this.itemBaselines.get(item.id);

        if (baseline === undefined) {
          this.itemBaselines.set(item.id, {
            x0: item.x,
            vx,
            hStart: now,
            y0: item.y,
            vy: item.vy,
            vStart: now,
          });
        } else if (baseline.x0 !== item.x || baseline.vx !== vx) {
          // The server moved the item horizontally — a bomb nudge, a launched item advancing across snapshots,
          // or an edge-stop that zeroed vx. Re-anchor the horizontal timeline only; the vertical fall keeps its
          // own clock so a sideways correction never makes the item jump up or down.
          baseline.x0 = item.x;
          baseline.vx = vx;
          baseline.hStart = now;
        }
      }

      for (const id of this.itemBaselines.keys()) {
        if (!currentIds.has(id)) {
          this.itemBaselines.delete(id);
        }
      }

      this._renderedItems.set(this.computeItems(items, now));
    });

    effect(() => {
      const players = this.players();
      const now = performance.now();

      this.syncPlayerBaselines(players, now);
      // Read evolving/myId here too so the first paint (before rAF) reflects them.
      this._renderedPlayers.set(this.computePlayers(now));
    });

    afterNextRender(() => {
      let rafId = 0;
      const loop = (): void => {
        // Schedule the next frame first, so a throw anywhere below can never kill the animation loop.
        rafId = requestAnimationFrame(loop);

        const now = performance.now();

        this._renderedItems.set(this.computeItems(this.items(), now));
        this._renderedPlayers.set(this.computePlayers(now));
        this.updateCamera();
      };

      rafId = requestAnimationFrame(loop);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(rafId));
    });

    this.destroyRef.onDestroy(() => {
      for (const timer of this.burstTimers) {
        clearTimeout(timer);
      }
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

    const id = ++this.burstCounter;
    const x = clamp01((event.clientX - bounds.left) / bounds.width);
    const y = clamp01((event.clientY - bounds.top) / bounds.height);

    this._bursts.update((bursts) => [...bursts, { id, x, y }]);

    const timer = setTimeout(() => {
      this.burstTimers.delete(timer);
      this._bursts.update((bursts) => bursts.filter((burst) => burst.id !== id));
    }, BURST_LIFETIME_MS);

    this.burstTimers.add(timer);

    if ((event.target as HTMLElement).closest('.scene__item, .scene__poke') === null) {
      // Optimistically steer my own sprite this frame, then send the authoritative request. The server confirms
      // via the next snapshot, which reconciles only a sub-pixel gap (same steer math both sides).
      this.predictLocalSteer(x, y);
      this.steer.emit({ x, y });
    }
  }

  // Client-side prediction for the local Pokémon only: re-anchor my baseline at its current rendered position and
  // apply the SAME steer-velocity math the server will, so the heading changes on the tap frame instead of after a
  // snapshot round-trip. Offset is zeroed because we pin to where the sprite already is — nothing to catch up to.
  private predictLocalSteer(x: number, y: number): void {
    const id = this.myId();

    if (id === null) {
      return;
    }

    const baseline = this.playerBaselines.get(id);

    if (baseline === undefined) {
      return;
    }

    const now = performance.now();
    const zone = FRENZY.playerDriftZone;
    const elapsed = (now - baseline.clientStartTime) / 1000;
    const renderedX =
      reflect(baseline.x0, baseline.vx, elapsed, zone.minX, zone.maxX) +
      decayedOffset(baseline.offsetX, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS);
    const renderedY =
      reflect(baseline.y0, baseline.vy, elapsed, zone.minY, zone.maxY) +
      decayedOffset(baseline.offsetY, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS);
    const { vx, vy } = steerVelocity(baseline, x - renderedX, y - renderedY, FRENZY.steer);

    this.playerBaselines.set(id, {
      x0: renderedX,
      y0: renderedY,
      vx,
      vy,
      clientStartTime: now,
      offsetX: 0,
      offsetY: 0,
      offsetStamp: now,
    });
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

  // Eases the camera offset toward the focus (my Pokémon, or world centre when I'm absent — spectating, pre-join
  // or fainted) and writes it as a sub-pixel translate + responsive scale on the world layer.
  private updateCamera(): void {
    const world = this.worldRef()?.nativeElement;

    if (world === undefined) {
      return;
    }

    const viewport = world.parentElement;

    if (viewport === null) {
      return;
    }

    const me = this._renderedPlayers().find((player) => player.isMe);
    const focusX = me?.x ?? 0.5;
    const focusY = me?.y ?? 0.5;
    // The camera math works in on-screen world px = world px × scale (the world layer has transform-origin 0 0,
    // so `translate(cam) scale(s)` puts a child at `f·worldPx·s + cam`). Feed the scaled extents to every axis.
    const scale = cameraScale(
      viewport.clientWidth,
      viewport.clientHeight,
      this.worldWidth,
      this.worldHeight,
    );
    const screenWorldWidth = this.worldWidth * scale;
    const screenWorldHeight = this.worldHeight * scale;

    if (this.cameraReady) {
      // Ease toward the dead-zone target: zero motion while the Pokémon stays in the central band, a gentle
      // follow once it crosses an edge.
      const targetX = deadZoneCameraAxis(this.camX, focusX, viewport.clientWidth, screenWorldWidth);
      const targetY = deadZoneCameraAxis(
        this.camY,
        focusY,
        viewport.clientHeight,
        screenWorldHeight,
      );

      this.camX += (targetX - this.camX) * CAMERA_LERP;
      this.camY += (targetY - this.camY) * CAMERA_LERP;
    } else {
      // Open centred on the focus (not the dead-zone, which would leave the world's corner showing).
      this.camX = centerCameraAxis(focusX, viewport.clientWidth, screenWorldWidth);
      this.camY = centerCameraAxis(focusY, viewport.clientHeight, screenWorldHeight);
      this.cameraReady = true;
    }

    // Sub-pixel translate3d + scale on the single composited world layer — smooth on the GPU. No integer
    // rounding here (nor in the position directive): rounding both the camera and each child's offset made their
    // fractional residuals beat against each other into a low-frequency stutter. Scale must come after translate
    // so the offset stays in screen px (origin 0 0).
    this.renderer.setStyle(
      world,
      'transform',
      `translate3d(${this.camX}px, ${this.camY}px, 0) scale(${scale})`,
    );

    // Foreground parallax: shift each layer's tiled pattern by the camera offset, so it drifts only while the
    // viewport scrolls (still during a dead-zone meander) — the subtle travel-direction cue.
    this.setParallax(this.parallaxNearRef()?.nativeElement, PARALLAX_NEAR);
    this.setParallax(this.parallaxMidRef()?.nativeElement, PARALLAX_MID);
  }

  private setParallax(layer: HTMLElement | undefined, factor: number): void {
    if (layer === undefined) {
      return;
    }

    this.renderer.setStyle(
      layer,
      'background-position',
      `${this.camX * factor}px ${this.camY * factor}px`,
    );
  }

  // Reset a player's baseline only when the server actually moved it (new snapshot position/velocity).
  // Non-positional updates (mass on `eaten`, stage on `evolved`) keep the baseline so drift — and any in-flight
  // reconciliation offset — stays intact. On a real move, carry the current on-screen gap forward as a decaying
  // offset so the sprite glides to the corrected track instead of snapping (the JS-side "smooth catch-up").
  private syncPlayerBaselines(players: readonly Player[], now: number): void {
    const currentIds = new Set<string>();
    const zone = FRENZY.playerDriftZone;

    for (const player of players) {
      currentIds.add(player.id);

      const prior = this.playerBaselines.get(player.id);
      const moved =
        prior === undefined ||
        prior.x0 !== player.x ||
        prior.y0 !== player.y ||
        prior.vx !== player.vx ||
        prior.vy !== player.vy;

      if (!moved) {
        continue;
      }

      // First sight of a player has no prior → no offset (no pop-in). Otherwise the offset is where the old
      // baseline renders right now minus the new authoritative anchor (which is `player.x/y` at elapsed 0).
      let offsetX = 0;
      let offsetY = 0;

      if (prior !== undefined) {
        const elapsed = (now - prior.clientStartTime) / 1000;
        const renderedX =
          reflect(prior.x0, prior.vx, elapsed, zone.minX, zone.maxX) +
          decayedOffset(prior.offsetX, now - prior.offsetStamp, OFFSET_DECAY_TAU_MS);
        const renderedY =
          reflect(prior.y0, prior.vy, elapsed, zone.minY, zone.maxY) +
          decayedOffset(prior.offsetY, now - prior.offsetStamp, OFFSET_DECAY_TAU_MS);

        offsetX = renderedX - player.x;
        offsetY = renderedY - player.y;
      }

      this.playerBaselines.set(player.id, {
        x0: player.x,
        y0: player.y,
        vx: player.vx,
        vy: player.vy,
        clientStartTime: now,
        offsetX,
        offsetY,
        offsetStamp: now,
      });
    }

    for (const id of this.playerBaselines.keys()) {
      if (!currentIds.has(id)) {
        this.playerBaselines.delete(id);
      }
    }
  }

  private computePlayers(now: number): RenderedPlayer[] {
    const me = this.myId();
    const evolving = this.evolvingPlayers();
    const zone = FRENZY.playerDriftZone;
    // Effect expiry is server-clock (Date.now), independent of the rAF `now` (performance.now) — drop the
    // aura the moment an effect lapses rather than waiting for the snapshot to prune it.
    const wallNow = Date.now();

    return this.players().map((player) => {
      const baseline = this.playerBaselines.get(player.id);
      const elapsed = baseline === undefined ? 0 : (now - baseline.clientStartTime) / 1000;
      const x0 = baseline?.x0 ?? player.x;
      const y0 = baseline?.y0 ?? player.y;
      const vx = baseline?.vx ?? player.vx;
      const vy = baseline?.vy ?? player.vy;
      // Decaying reconciliation nudge layered on top of the authoritative drift — facing is read from the bare
      // `reflect` direction below, so a correction never flips the sprite.
      const decayX =
        baseline === undefined
          ? 0
          : decayedOffset(baseline.offsetX, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS);
      const decayY =
        baseline === undefined
          ? 0
          : decayedOffset(baseline.offsetY, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS);
      const effectAuras = player.effects
        .filter((effect) => effect.expiresAt > wallNow)
        .map((effect) => EFFECT_AURA_CLASS[effect.kind]);

      return {
        appearance: player.appearance,
        effectAuras,
        facingRight: reflectDirection(x0, vx, elapsed, zone.minX, zone.maxX) > 0,
        id: player.id,
        isDisconnected: player.status === 'disconnected',
        isEvolving: evolving.has(player.id),
        isMe: player.id === me,
        isSad: isSad(player.mass, player.stage),
        label: player.name,
        mass: player.mass,
        spriteHeight: spriteHeightFor(player.stage),
        stage: player.stage,
        x: reflect(x0, vx, elapsed, zone.minX, zone.maxX) + decayX,
        y: reflect(y0, vy, elapsed, zone.minY, zone.maxY) + decayY,
      };
    });
  }

  private computeItems(items: readonly Item[], now: number): RenderedItem[] {
    return items.map((item) => {
      const baseline = this.itemBaselines.get(item.id);
      const x0 = baseline?.x0 ?? item.x;
      const vx = baseline?.vx ?? item.vx ?? 0;
      const hStart = baseline?.hStart ?? now;
      const y0 = baseline?.y0 ?? item.y;
      const vy = baseline?.vy ?? item.vy;
      const vStart = baseline?.vStart ?? now;

      const y = Math.min(1, y0 + vy * ((now - vStart) / 1000));
      // Horizontal stops the moment the item lands: clamp the horizontal clock at the landing instant
      // (when `y` would reach 1), so a launched item rides its arc down then sticks where it touches the
      // floor instead of sliding. A server-rested item (restMs set) is already frozen at its anchor `x0`.
      const landTimeMs = vy > 0 ? vStart + ((1 - y0) / vy) * 1000 : now;
      const hEnd = item.restMs === undefined ? Math.min(now, landTimeMs) : hStart;
      const x = Math.max(0, Math.min(1, x0 + vx * (Math.max(0, hEnd - hStart) / 1000)));
      const spin = spinFor(item.id);

      return {
        id: item.id,
        type: item.type,
        x,
        y,
        // Reached the floor (rendered or server-rested) → freeze the tumble.
        landed: y >= 1 || item.restMs !== undefined,
        spinDurationMs: spin.durationMs,
        spinReverse: spin.reverse,
      };
    });
  }
}
