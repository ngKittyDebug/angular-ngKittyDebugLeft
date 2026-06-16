import { Injectable, signal } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import { steerVelocity } from '@game/frenzy/steer-velocity';
import { isNPC } from '@game/frenzy/types';
import type { Player, PlayerEffectKind } from '@game/frenzy/types';

import { isSad } from '../../../data/logic/is-sad';
import { EFFECT_BADGE } from '../../../data/models/effect-badge';
import { spriteRenderFor } from '../../constants/pokemon-registry';
import { clamp, decayedOffset, OFFSET_DECAY_TAU_MS, reflect, reflectDirection } from './drift-math';
import type { RenderedAura, RenderedPlayer } from './scene-view-models';

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

  public readonly rendered = this._rendered.asReadonly();

  // Re-anchor baselines from a fresh snapshot, then publish the extrapolated positions.
  public ingest(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this.sync(players, now);
    this._rendered.set(this.compute(players, myId, evolving, now));
  }

  // Per-frame republish (rAF loop): advance along existing baselines without re-anchoring.
  public tick(
    players: readonly Player[],
    myId: string | null,
    evolving: ReadonlyMap<string, number>,
    now: number,
  ): void {
    this._rendered.set(this.compute(players, myId, evolving, now));
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
        decayedOffset(baseline.offsetX, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS),
      zone.minX,
      zone.maxX,
    );
    const renderedY = clamp(
      reflect(baseline.y0, baseline.vy, elapsed, zone.minY, zone.maxY) +
        decayedOffset(baseline.offsetY, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS),
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
            decayedOffset(prior.offsetX, now - prior.offsetStamp, OFFSET_DECAY_TAU_MS),
          zone.minX,
          zone.maxX,
        );
        const renderedY = clamp(
          reflect(prior.y0, prior.vy, elapsed, zone.minY, zone.maxY) +
            decayedOffset(prior.offsetY, now - prior.offsetStamp, OFFSET_DECAY_TAU_MS),
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
          : decayedOffset(baseline.offsetX, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS);
      const decayY =
        baseline === undefined
          ? 0
          : decayedOffset(baseline.offsetY, now - baseline.offsetStamp, OFFSET_DECAY_TAU_MS);
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
