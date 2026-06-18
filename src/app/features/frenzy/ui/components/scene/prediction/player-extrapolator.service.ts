import { Injectable, signal } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import { steerVelocity } from '@game/frenzy/steer-velocity';
import { isNPC } from '@game/frenzy/types';
import type { Player, PlayerEffectKind } from '@game/frenzy/types';

import { isSad } from '../../../../data/logic/is-sad';
import { EFFECT_BADGE } from '../../../../data/models/effect-badge';
import { spriteRenderFor } from '../../../constants/pokemon-registry';
import {
  clamp,
  decayedOffset,
  frameAwareTau,
  OFFSET_DECAY_TAU_MS,
  reflect,
  reflectDirection,
} from './drift-math';
import type { RenderedAura, RenderedPlayer } from '../scene-view-models';

// Aura descriptor per active effect kind: the CSS class plus the render mode the template branches on (so the
// template carries no magic class strings and needs no shield-class plumbing). `null` = no aura — wellFed reads
// from its badge + the grounding-shadow tint instead. The render mode is data, not a guessed class comparison:
// shield/bubble wear the shared single-tint soap-bubble skin; the bespoke egg bubble is styled wholly in SCSS.
const EFFECT_AURA: Record<PlayerEffectKind, RenderedAura | null> = {
  shield: { className: 'scene__shield', render: 'shield' },
  pooping: { className: 'scene__poop', render: 'bubble' },
  laying: { className: 'scene__laying', render: 'bespoke' },
  cactus: { className: 'scene__cactus', render: 'bespoke' },
  wellFed: null,
};

// Precedence for the single grounding-shadow tint when effects stack: the emitter (egg/poop) wins over the spiky
// cactus ward, which wins over shield, which wins over wellFed. laying/pooping are mutually exclusive, so their
// order relative to each other is moot — both outrank cactus. The first kind found among the live effects tints
// the shadow; none → neutral.
const SHADOW_TINT_PRECEDENCE: readonly PlayerEffectKind[] = [
  'laying',
  'pooping',
  'cactus',
  'shield',
  'wellFed',
];

// EMA weight for the frame-interval estimate that feeds the frame-aware reconciliation τ (higher = adapts faster
// to an FPS change, noisier). Light smoothing so a single hitched frame doesn't spike τ.
const FRAME_EMA_WEIGHT = 0.2;

// Frame deltas above this (ms, ~4fps) are treated as a stall/hitch and skipped, so a backgrounded tab or GC pause
// can't bloat the average and freeze the glide. Genuine low-end frames (down to ~4fps) still update it.
const FRAME_DT_CAP_MS = 250;

interface PlayerBaseline {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  // Steering cap for the local prediction (the player's per-stage `maxSpeed`), cached from the last snapshot so
  // `predictSteer` uses the SAME cap the server will, without threading the body through every frame.
  maxSpeed: number;
  clientStartTime: number;
  // Visual reconciliation gap (rendered − authoritative, normalized units) captured at the last re-anchor and
  // decayed toward 0 from `offsetStamp`, so a snapshot correction glides in instead of snapping. Zero in steady
  // state (and on a player's first sight).
  offsetX: number;
  offsetY: number;
  offsetStamp: number;
}

/**
 * Client-side extrapolation + snapshot reconciliation of drifting players. Owns the per-player baselines and
 * publishes the rendered positions; pure of the DOM so it is unit-tested directly. `ingest` re-anchors from a
 * fresh snapshot (carrying the on-screen gap forward as a decaying offset), `tick` re-publishes each frame, and
 * `predictSteer` applies the server's steer math locally so a tap turns the sprite on the same frame.
 */
@Injectable()
export class PlayerExtrapolatorService {
  private readonly baselines = new Map<string, PlayerBaseline>();
  private readonly _rendered = signal<readonly RenderedPlayer[]>([]);
  // The live per-frame view models. `tick` refreshes this (read by the imperative position writer, the `?debug=perf`
  // gap and consumers that must see this frame) WITHOUT touching the `rendered` signal — players have no structural
  // field that changes mid-extrapolation (facing is a flag written imperatively; hp/stage/effects come from a
  // snapshot), so per-frame motion never triggers change detection. See ADR 0001.
  private _frame: readonly RenderedPlayer[] = [];
  // Smoothed frame interval (ms), measured in `tick`; 0 until the first interval is seen. Feeds the frame-aware
  // reconciliation τ so a slow tablet stretches the correction glide across enough frames instead of snapping it.
  private smoothedFrameMs = 0;
  private lastTickNow = 0;
  // Current reconciliation τ: the base on a fast client, raised on a slow one (frame-aware). Read by
  // compute/sync/predictSteer so every reconciliation read this frame agrees. See ADR 0003.
  private tauMs = OFFSET_DECAY_TAU_MS;

  // Structure signal: changes only on `ingest` (a server snapshot). Drives the `@for` and the `?debug` box overlay.
  public readonly rendered = this._rendered.asReadonly();

  // The latest per-frame view models (positions + facing), live every tick. Not a signal — read imperatively.
  public frame(): readonly RenderedPlayer[] {
    return this._frame;
  }

  // Re-anchor baselines from a fresh snapshot, then publish the extrapolated positions (structure + frame).
  public ingest(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.sync(players, now);
    this._frame = this.compute(players, myId, evolving, now);
    this._rendered.set(this._frame);
  }

  // Per-frame recompute (rAF loop): advance along existing baselines without re-anchoring. Updates only the live
  // `frame` — never the `rendered` signal — so moving sprites costs no change detection.
  public tick(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.measureFrame(now);
    this._frame = this.compute(players, myId, evolving, now);
  }

  // Mirror the current frame into the structure signal. Used only by the `?debug` box overlay, which needs the
  // boxes to track the sprites every frame (a dev tool — the per-frame change detection it reintroduces is fine).
  public publishFrame(): void {
    this._rendered.set(this._frame);
  }

  // Client-side prediction for the local Pokémon only: re-anchor my baseline at its current rendered position and
  // apply the SAME steer-velocity math the server will, so the heading changes on the tap frame instead of after a
  // snapshot round-trip. Offset is zeroed because we pin to where the sprite already is — nothing to catch up to.
  public predictSteer(myId: string | null, x: number, y: number, now: number): void {
    if (myId === null) {
      return;
    }

    const baseline = this.baselines.get(myId);

    if (baseline === undefined) {
      return;
    }

    const zone = FRENZY.playerDriftZone;
    const elapsed = (now - baseline.clientStartTime) / 1000;
    const renderedX = clamp(
      reflect(baseline.x0, baseline.vx, elapsed, zone.minX, zone.maxX) +
        decayedOffset(baseline.offsetX, now - baseline.offsetStamp, this.tauMs),
      zone.minX,
      zone.maxX,
    );
    const renderedY = clamp(
      reflect(baseline.y0, baseline.vy, elapsed, zone.minY, zone.maxY) +
        decayedOffset(baseline.offsetY, now - baseline.offsetStamp, this.tauMs),
      zone.minY,
      zone.maxY,
    );
    const tuning = { impulse: FRENZY.steer.impulse, maxSpeed: baseline.maxSpeed };
    const { vx, vy } = steerVelocity(baseline, x - renderedX, y - renderedY, tuning);

    this.baselines.set(myId, {
      x0: renderedX,
      y0: renderedY,
      vx,
      vy,
      maxSpeed: baseline.maxSpeed,
      clientStartTime: now,
      offsetX: 0,
      offsetY: 0,
      offsetStamp: now,
    });
  }

  // Track the smoothed frame interval from the rAF cadence and derive the frame-aware reconciliation τ. Only `tick`
  // calls this (one per animation frame); `ingest` runs on the ~300ms snapshot cadence and must not be mistaken for
  // a frame. Non-positive deltas and long stalls (backgrounded tab, GC pause) are skipped so they can't bloat the
  // estimate and freeze the glide.
  private measureFrame(now: number): void {
    if (this.lastTickNow !== 0) {
      const dt = now - this.lastTickNow;

      if (dt > 0 && dt <= FRAME_DT_CAP_MS) {
        this.smoothedFrameMs =
          this.smoothedFrameMs === 0
            ? dt
            : this.smoothedFrameMs * (1 - FRAME_EMA_WEIGHT) + dt * FRAME_EMA_WEIGHT;
        this.tauMs = frameAwareTau(OFFSET_DECAY_TAU_MS, this.smoothedFrameMs);
      }
    }

    this.lastTickNow = now;
  }

  // Reset a player's baseline only when the server actually moved it (new snapshot position/velocity).
  // Non-positional updates (hp on `eaten`, stage on `evolved`) keep the baseline so drift — and any in-flight
  // reconciliation offset — stays intact. On a real move, carry the current on-screen gap forward as a decaying
  // offset so the sprite glides to the corrected track instead of snapping (the JS-side "smooth catch-up").
  private sync(players: readonly Player[], now: number): void {
    const currentIds = new Set<string>();
    const zone = FRENZY.playerDriftZone;

    for (const player of players) {
      currentIds.add(player.id);

      const prior = this.baselines.get(player.id);
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
        // Carry forward the ACTUALLY-rendered (clamped) gap — same clamp `compute` applies — so a snapshot taken
        // while the sprite was pinned at a wall can't capture an out-of-zone overshoot and keep gliding from it.
        const renderedX = clamp(
          reflect(prior.x0, prior.vx, elapsed, zone.minX, zone.maxX) +
            decayedOffset(prior.offsetX, now - prior.offsetStamp, this.tauMs),
          zone.minX,
          zone.maxX,
        );
        const renderedY = clamp(
          reflect(prior.y0, prior.vy, elapsed, zone.minY, zone.maxY) +
            decayedOffset(prior.offsetY, now - prior.offsetStamp, this.tauMs),
          zone.minY,
          zone.maxY,
        );

        offsetX = renderedX - player.x;
        offsetY = renderedY - player.y;
      }

      this.baselines.set(player.id, {
        x0: player.x,
        y0: player.y,
        vx: player.vx,
        vy: player.vy,
        maxSpeed: player.body[player.stage].maxSpeed,
        clientStartTime: now,
        offsetX,
        offsetY,
        offsetStamp: now,
      });
    }

    for (const id of this.baselines.keys()) {
      if (!currentIds.has(id)) {
        this.baselines.delete(id);
      }
    }
  }

  private compute(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): RenderedPlayer[] {
    const zone = FRENZY.playerDriftZone;
    // Effect expiry is server-clock (Date.now), independent of the rAF `now` (performance.now) — drop the
    // aura the moment an effect lapses rather than waiting for the snapshot to prune it.
    const wallNow = Date.now();

    return players.map((player) => {
      const baseline = this.baselines.get(player.id);
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
          : decayedOffset(baseline.offsetX, now - baseline.offsetStamp, this.tauMs);
      const decayY =
        baseline === undefined
          ? 0
          : decayedOffset(baseline.offsetY, now - baseline.offsetStamp, this.tauMs);
      const liveEffects = player.effects.filter((effect) => effect.expiresAt > wallNow);
      const effectAuras = liveEffects
        .map((effect) => EFFECT_AURA[effect.kind])
        .filter((aura): aura is RenderedAura => aura !== null);
      // Single dominant effect tinting the grounding shadow — first match by precedence; none → neutral base.
      const dominantEffect = SHADOW_TINT_PRECEDENCE.find((kind) =>
        liveEffects.some((effect) => effect.kind === kind),
      );
      const shadowEffectClass =
        dominantEffect === undefined ? null : `scene__shadow--${dominantEffect}`;
      // Overhead buff badges track the same live effects as the auras — including the NPC, which CAN pick up an
      // effect by colliding with an item (e.g. shield), so its badge must match the aura ring it already shows.
      const effectBadges = liveEffects.map((effect) => ({
        kind: effect.kind,
        ...EFFECT_BADGE[effect.kind],
      }));
      // Hitbox (collidable torso) comes from the authoritative `body`; the full-art render box + centring offset
      // are client-only, looked up from the local roster by appearance/stage.
      const hitbox = player.body[player.stage];
      const render = spriteRenderFor(player.appearance, player.stage);

      return {
        appearance: player.appearance,
        effectAuras,
        shadowEffectClass,
        effectBadges,
        facingRight: reflectDirection(x0, vx, elapsed, zone.minX, zone.maxX) > 0,
        id: player.id,
        isDisconnected: player.status === 'disconnected',
        isEvolving: evolving.has(player.id),
        isMe: player.id === myId,
        // The NPC is never "sad" — it's a hazard, not a Pokémon with a mood; the sad desaturation would also fight
        // its anger reddening. Gate the mood to humans so the NPC keeps its own (red-tinted) look.
        isSad: !isNPC(player) && isSad(player.hp, player.stage),
        isNpc: isNPC(player),
        // Normalized anger only matters for the NPC (humans never accumulate mana); 0 keeps human sprites untinted.
        npcAnger: isNPC(player) ? clamp(player.mana / FRENZY.npc.anger.max, 0, 1) : 0,
        label: player.name,
        hp: player.hp,
        spriteWidth: `${render.width}px`,
        spriteHeight: `${render.height}px`,
        spriteOffsetX: render.offsetX,
        spriteOffsetY: render.offsetY,
        hitboxWidth: `${hitbox.width}px`,
        hitboxHeight: `${hitbox.height}px`,
        debugSpeed: Math.hypot(vx, vy).toFixed(4),
        // Anchor the readout's bottom-left corner to the art box's top-left (rel. point): left = -offsetX - width/2,
        // top = -offsetY - height/2. The pill sits flush on the box top (no gap), left-aligned to the sprite.
        debugReadoutOffsetX: `${-render.offsetX - render.width / 2}px`,
        debugReadoutOffsetY: `${-render.offsetY - render.height / 2}px`,
        stage: player.stage,
        // Clamp the offset-adjusted position to the drift zone: a large reconciliation gap (bomb knockback,
        // reconnect snap) must glide the sprite back from the wall, never render it outside the scene.
        x: clamp(reflect(x0, vx, elapsed, zone.minX, zone.maxX) + decayX, zone.minX, zone.maxX),
        y: clamp(reflect(y0, vy, elapsed, zone.minY, zone.maxY) + decayY, zone.minY, zone.maxY),
      };
    });
  }
}
