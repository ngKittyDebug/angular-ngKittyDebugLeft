import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';

import { FRENZY } from '@game/frenzy/config';
import type { Item, Player } from '@game/frenzy/types';
import { isNPC } from '@game/frenzy/types';

import { COLLAPSE_KEY, persistedCollapse } from '../../persisted-collapse';
import { ITEM_DOT_COLOR } from '../../constants/pokemon-registry';
import { ScenePositionDirective } from '../../directives/scene-position.directive';
import { OfflineParticipantsComponent } from '../offline-participants/offline-participants.component';
import { OnlineParticipantsComponent } from '../online-participants/online-participants.component';

interface PlayerDot {
  id: string;
  x: number;
  y: number;
  me: boolean;
  isLeader: boolean;
  isNpc: boolean;
}

interface ItemDot {
  id: string;
  x: number;
  y: number;
  color: string;
}

// The kelp on the minimap is a single SCHEMATIC silhouette, not 22 little blades: at thumbnail size a clean
// band reads far better than fiddly sprites, and it's one cheap stretched path. Built in this flat viewBox and
// stretched (preserveAspectRatio="none") onto a band whose height is set in CSS proportional to the scene's
// kelp; the fill is a theme-aware kelp tint (see SCSS).
const KELP_PEAKS = 22;
const KELP_VIEW_WIDTH = 100;
const KELP_VIEW_HEIGHT = 40;
// Underbrush level between the blades (fraction of the band): the line dips here between tips but keeps a thin
// base, mirroring the scene's tall thin blades rising out of a low base mass. Kept low so the blades read tall.
const KELP_VALLEY_REACH = 0.07;

interface Point {
  x: number;
  y: number;
}

// Catmull-Rom → cubic Bézier control points for the segment current → next. The spline passes THROUGH every
// tip (so the scene-matched heights are preserved exactly — no smoothing-induced shrink), only rounding the
// corners. Since all valleys share one level, each peak gets a horizontal tangent and rounds off at its own
// height without overshooting. `previous`/`afterNext` are the neighbouring tips (clamped at the ends).
function waveSegment(previous: Point, current: Point, next: Point, afterNext: Point): string {
  const control1X = current.x + (next.x - previous.x) / 6;
  const control1Y = current.y + (next.y - previous.y) / 6;
  const control2X = next.x - (afterNext.x - current.x) / 6;
  const control2Y = next.y - (afterNext.y - current.y) / 6;

  return `C${control1X.toFixed(1)} ${control1Y.toFixed(1)} ${control2X.toFixed(1)} ${control2Y.toFixed(1)} ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
}

// Trace the canopy once: bottom-left → up a softly WAVY run of blade tips → bottom-right → close. Tips vary in
// height by the scene flora's cadence (scene blades are `70 + (i * 17) % 95` px tall, tallest ≈ 165, normalised
// to a 0..1 fraction; valleys drop to the underbrush level), and the spline rounds the pointed tips into gentle
// waves while keeping each tip's height.
const KELP_SILHOUETTE_PATH = ((): string => {
  const steps = KELP_PEAKS * 2;
  const tips: Point[] = Array.from({ length: steps + 1 }, (_, k) => {
    const isPeak = k % 2 === 1;
    const blade = (k - 1) / 2 + 1; // 1-based, mirroring buildPlants' index
    const reach = isPeak ? (70 + ((blade * 17) % 95)) / 165 : KELP_VALLEY_REACH;

    return { x: (k / steps) * KELP_VIEW_WIDTH, y: KELP_VIEW_HEIGHT * (1 - reach) };
  });

  const last = tips.length - 1;
  const waves = tips
    .slice(0, -1)
    .map((current, index) =>
      waveSegment(
        tips[Math.max(0, index - 1)],
        current,
        tips[index + 1],
        tips[Math.min(last, index + 2)],
      ),
    )
    .join(' ');

  return `M0 ${KELP_VIEW_HEIGHT} L${tips[0].x.toFixed(1)} ${tips[0].y.toFixed(1)} ${waves} L${KELP_VIEW_WIDTH} ${KELP_VIEW_HEIGHT} Z`;
})();

const KELP_VIEW_BOX = `0 0 ${KELP_VIEW_WIDTH} ${KELP_VIEW_HEIGHT}`;

@Component({
  selector: 'left-paw-minimap',
  imports: [
    OfflineParticipantsComponent,
    OnlineParticipantsComponent,
    ScenePositionDirective,
    TranslocoDirective,
    TuiIcon,
  ],
  templateUrl: './minimap.component.html',
  styleUrl: './minimap.component.scss',
  // Dot glide duration = the actual snapshot cadence, so blips drift continuously instead of glide-then-freeze
  // (the SCSS transition reads this var; a hardcoded duration silently desyncs when the cadence is retuned).
  host: { '[style.--minimap-glide.ms]': 'snapshotIntervalMs' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinimapComponent {
  public readonly compact = input<boolean>(false);
  public readonly disconnected = input<number>(0);
  public readonly items = input.required<readonly Item[]>();
  public readonly leader = input<Player | null>(null);
  // The crowned player id (alive hp-leader; null when there's no meaningful leader, e.g. a lone survivor). Marks
  // that player's blip with a crown and gates the compact leader chip — same gated source as the scene + pill.
  public readonly crownId = input<string | null>(null);
  public readonly myId = input.required<string | null>();
  public readonly online = input.required<number>();
  public readonly players = input.required<readonly Player[]>();

  protected readonly snapshotIntervalMs = (FRENZY.snapshotEveryNTicks / FRENZY.tickRateHz) * 1000;

  protected readonly kelpPath = KELP_SILHOUETTE_PATH;
  protected readonly kelpViewBox = KELP_VIEW_BOX;

  // The leaderboard folded into the minimap chrome: just the current leader (name + rounded HP), shown in the
  // header/pill with a crown. Only on mobile (`compact`) — desktop keeps the full ТОП-5 list widget, so showing
  // the leader here too would be redundant. The full standings are read off the map's blips instead.
  protected readonly leaderView = computed<{ name: string; hp: number; isMe: boolean } | null>(
    () => {
      const top = this.leader();

      // Hidden unless there's a meaningful leader (`crownId` set ⇒ ≥2 alive) — solo, the chip would just crown you.
      if (!this.compact() || top === null || this.crownId() === null) {
        return null;
      }

      return { name: top.name, hp: Math.round(top.hp), isMe: top.id === this.myId() };
    },
  );

  // Restore the saved open/closed state; with none saved, default to expanded map on desktop and collapsed
  // pill on mobile (re-derives from `compact` on breakpoint change). A manual toggle persists (write-through)
  // and thereafter wins over the responsive default.
  protected readonly collapsed = persistedCollapse(COLLAPSE_KEY.minimap, () => this.compact());

  protected readonly playerDots = computed<PlayerDot[]>(() => {
    const myId = this.myId();
    const crownId = this.crownId();

    return this.players().map((player) => ({
      id: player.id,
      x: player.x,
      y: player.y,
      me: player.id === myId,
      isLeader: player.id === crownId,
      isNpc: isNPC(player),
    }));
  });

  protected readonly itemDots = computed<ItemDot[]>(() =>
    this.items().map((item) => ({
      id: item.id,
      x: item.x,
      y: item.y,
      color: ITEM_DOT_COLOR[item.type],
    })),
  );

  protected onToggle(): void {
    this.collapsed.update((value) => !value);
  }
}
