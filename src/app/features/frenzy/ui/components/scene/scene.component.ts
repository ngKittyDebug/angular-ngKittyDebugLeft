import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiProgressBar } from '@taiga-ui/kit';

import { GAME } from '@game/frenzy/constants';
import type { Item, Line, Player, Stage } from '@game/frenzy/types';

import { isSad } from '../../../data/logic/is-sad';
import type { Blast } from '../../../data/models/blast';
import type { FloatingMessage } from '../../../data/models/floating-message';
import { spriteHeightFor } from '../../constants/sprite-registry';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';
import { MassToneColorPipe } from '../../pipes/mass-tone-color.pipe';
import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';
import { AquariumDecorComponent } from '../aquarium-decor/aquarium-decor.component';
import { BubbleBurstComponent } from '../bubble-burst/bubble-burst.component';
import { FloatingTextComponent } from '../floating-text/floating-text.component';

const MAX_VISUAL_MASS = GAME.thresholds.stage3;

// How long a click bubble-burst lives before it is removed (ms). Matches the CSS animation.
const BURST_LIFETIME_MS = 1000;

// Fixed pixel distance the bomb is batted per click — converted to normalized units against the scene width,
// so a juggle feels the same on any screen size rather than scaling with it.
const BOMB_NUDGE_PX = 72;

interface RenderedPlayer {
  facingRight: boolean;
  id: string;
  isDisconnected: boolean;
  isEvolving: boolean;
  isMe: boolean;
  isSad: boolean;
  label: string;
  line: Line;
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
  /** Item's current on-screen (extrapolated) normalized position at click time — for the eat float. */
  x: number;
  y: number;
  /** Bomb bat input: signed normalized horizontal displacement (fixed pixel step ÷ scene width). Undefined for non-bomb items. */
  nudgeX?: number;
}

interface ItemBaseline {
  x: number;
  y0: number;
  vy: number;
  clientStartTime: number;
}

interface PlayerBaseline {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  clientStartTime: number;
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

// Closed-form reflective ("ping-pong") drift along one axis: mirrors the server's bounce so the
// client can extrapolate between snapshots smoothly instead of stepping each snapshot.
function reflect(p0: number, v: number, elapsedSeconds: number, min: number, max: number): number {
  const span = max - min;

  if (span <= 0) {
    return min;
  }

  const period = span * 2;
  const offset = p0 - min + v * elapsedSeconds;
  const wrapped = ((offset % period) + period) % period;

  return min + (wrapped <= span ? wrapped : period - wrapped);
}

// Instantaneous horizontal direction of the reflective drift (+1 right, -1 left, 0 stationary):
// the sign of the derivative of `reflect`, which flips on every wall bounce.
function reflectDirection(
  p0: number,
  v: number,
  elapsedSeconds: number,
  min: number,
  max: number,
): number {
  const span = max - min;

  if (v === 0 || span <= 0) {
    return 0;
  }

  const period = span * 2;
  const offset = p0 - min + v * elapsedSeconds;
  const wrapped = ((offset % period) + period) % period;

  return Math.sign(v) * (wrapped <= span ? 1 : -1);
}

@Component({
  selector: 'left-paw-scene',
  imports: [
    AquariumDecorComponent,
    BubbleBurstComponent,
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
  private readonly _renderedItems = signal<readonly RenderedItem[]>([]);
  private readonly _renderedPlayers = signal<readonly RenderedPlayer[]>([]);
  private readonly _bursts = signal<readonly BubbleBurst[]>([]);
  private readonly itemBaselines = new Map<string, ItemBaseline>();
  private readonly playerBaselines = new Map<string, PlayerBaseline>();
  private readonly burstTimers = new Set<ReturnType<typeof setTimeout>>();
  private burstCounter = 0;

  public readonly blasts = input<readonly Blast[]>([]);
  public readonly evolvingPlayers = input<ReadonlyMap<string, number>>(new Map());
  public readonly floatingMessages = input<readonly FloatingMessage[]>([]);
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

  public constructor() {
    effect(() => {
      const items = this.items();
      const now = performance.now();
      const currentIds = new Set<string>();

      for (const item of items) {
        currentIds.add(item.id);

        const baseline = this.itemBaselines.get(item.id);

        if (baseline === undefined) {
          this.itemBaselines.set(item.id, {
            x: item.x,
            y0: item.y,
            vy: item.vy,
            clientStartTime: now,
          });
        } else if (baseline.x !== item.x) {
          // A nudge (bomb juggle) moved the item sideways — snap the baseline so it tracks the click
          // instantly, without waiting for a snapshot. Vertical fall (y0/vy/clientStartTime) keeps going.
          baseline.x = item.x;
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
        const now = performance.now();

        this._renderedItems.set(this.computeItems(this.items(), now));
        this._renderedPlayers.set(this.computePlayers(now));
        rafId = requestAnimationFrame(loop);
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

    this.itemClick.emit({ itemId: item.id, x: item.x, y: item.y, nudgeX });
  }

  protected onSelfPoke(): void {
    this.selfPoke.emit();
  }

  // Press anywhere bubbles up here: always spawn a short-lived decorative bubble burst, and — unless the press
  // landed on an actionable element (an item to eat, my own Pokémon to poke) — steer my Pokémon toward the point.
  // Open water, decor and other players all count as steering targets. Item/poke taps keep their own (click) actions.
  protected onScenePointerDown(event: PointerEvent): void {
    const host = event.currentTarget as HTMLElement;
    const bounds = host.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const id = ++this.burstCounter;
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    this._bursts.update((bursts) => [...bursts, { id, x, y }]);

    const timer = setTimeout(() => {
      this.burstTimers.delete(timer);
      this._bursts.update((bursts) => bursts.filter((burst) => burst.id !== id));
    }, BURST_LIFETIME_MS);

    this.burstTimers.add(timer);

    if ((event.target as HTMLElement).closest('.scene__item, .scene__poke') === null) {
      this.steer.emit({ x, y });
    }
  }

  // Signed normalized bat displacement: a fixed pixel step (BOMB_NUDGE_PX) converted to scene-width units,
  // pushed right when the click landed left of the item's centre and left otherwise. Undefined if the scene
  // can't be measured (server then falls back to its own step).
  private batNudge(event: MouseEvent): number | undefined {
    const button = event.currentTarget as HTMLElement;
    const bounds = button.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const direction = event.clientX < centerX ? 1 : -1;
    const sceneWidth = button.closest('.scene')?.getBoundingClientRect().width ?? 0;

    if (sceneWidth <= 0) {
      return undefined;
    }

    return (direction * BOMB_NUDGE_PX) / sceneWidth;
  }

  // Reset a player's baseline only when the server actually moved it (new snapshot position/velocity).
  // Non-positional updates (mass on `eaten`, stage on `evolved`) keep the baseline so drift stays smooth.
  private syncPlayerBaselines(players: readonly Player[], now: number): void {
    const currentIds = new Set<string>();

    for (const player of players) {
      currentIds.add(player.id);

      const baseline = this.playerBaselines.get(player.id);
      const moved =
        baseline === undefined ||
        baseline.x0 !== player.x ||
        baseline.y0 !== player.y ||
        baseline.vx !== player.vx ||
        baseline.vy !== player.vy;

      if (moved) {
        this.playerBaselines.set(player.id, {
          x0: player.x,
          y0: player.y,
          vx: player.vx,
          vy: player.vy,
          clientStartTime: now,
        });
      }
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
    const zone = GAME.playerDriftZone;

    return this.players().map((player) => {
      const baseline = this.playerBaselines.get(player.id);
      const elapsed = baseline === undefined ? 0 : (now - baseline.clientStartTime) / 1000;
      const x0 = baseline?.x0 ?? player.x;
      const y0 = baseline?.y0 ?? player.y;
      const vx = baseline?.vx ?? player.vx;
      const vy = baseline?.vy ?? player.vy;

      return {
        facingRight: reflectDirection(x0, vx, elapsed, zone.minX, zone.maxX) > 0,
        id: player.id,
        isDisconnected: player.status === 'disconnected',
        isEvolving: evolving.has(player.id),
        isMe: player.id === me,
        isSad: isSad(player.mass, player.stage),
        label: player.name,
        line: player.line,
        mass: player.mass,
        spriteHeight: spriteHeightFor(player.stage),
        stage: player.stage,
        x: reflect(x0, vx, elapsed, zone.minX, zone.maxX),
        y: reflect(y0, vy, elapsed, zone.minY, zone.maxY),
      };
    });
  }

  private computeItems(items: readonly Item[], now: number): RenderedItem[] {
    return items.map((item) => {
      const baseline = this.itemBaselines.get(item.id);
      const x = baseline?.x ?? item.x;
      const y0 = baseline?.y0 ?? item.y;
      const vy = baseline?.vy ?? item.vy;
      const elapsed = baseline === undefined ? 0 : (now - baseline.clientStartTime) / 1000;
      const y = Math.min(1, y0 + vy * elapsed);
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
