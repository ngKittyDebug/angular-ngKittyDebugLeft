/**
 * Single source of game tunables for Feeding Frenzy — the flat `FRENZY` read-model, DERIVED from the per-entity
 * definition slices (`./definition`). Contract shared by the server (authoritative) and the client (render/UI),
 * imported by both via `@game/frenzy/config`. Coordinates are normalized (0..1): the client multiplies them by
 * the viewport size.
 *
 * To retune an entity, edit its slice (`definition/items|effects/<entity>.ts`, `definition/npcs/*`); to retune a
 * neutral concern (world/loop/hp/...), edit its per-concern partial in `definition/`. The flat keys, values and
 * record KEY ORDER here reproduce the legacy `config/*` layout byte-for-byte (guarded by the definition-contract
 * spec + the golden master in `partykit-server`) — `FRENZY.xxx` consumers never notice the source moved.
 * Deliberate carve-outs from the legacy layout: `itemEffects.poop` normalized -10 → 0 (a stale duplicate of the
 * descriptor's `hpDelta`) and, since phase 5, the pruned server-only NPC projections (`npc.seekItemTypes`,
 * `features.npc` — the server reads the definition slice directly); see the definition-contract spec.
 */
import { restYFor as engineRestYFor } from '../engine/geometry';
import {
  ANGRY_BOMB_NPC,
  FRENZY_DEFINITION,
  FRENZY_ITEMS,
  mapItems,
  SPAWN_POOLS,
} from './definition';
import type { ItemType, ScoreKind } from './types';

// Pure geometry lives in the engine layer; re-exported here so client call sites keep their historical import.
export { halfExtentNorm } from '../engine/geometry';

const { collision, hp, loop, player, playerCollision, score, spawn, world } = FRENZY_DEFINITION;

export const FRENZY = {
  ...hp,
  world: { width: world.width, height: world.height },
  /** Physical sprite-box sizes in world px — `item` is the shared falling-item box, `bomb` the mine's
   * sensor-tip span override (detonation matches what you see). Both single-source render + collision reach. */
  physicalSizePx: { item: world.itemSizePx, bomb: FRENZY_ITEMS.bomb.physics.sizePx },
  collision: {
    catchGenerosity: collision.catchGenerosity,
    /** The bomb's strict edge-to-edge contact (its `physics.catchGenerosity` override). */
    bombCatchGenerosity: FRENZY_ITEMS.bomb.physics.catchGenerosity,
    rockDamage: FRENZY_ITEMS.rock.interactions.onCollide.hpDelta,
    brickDamage: FRENZY_ITEMS.brick.interactions.onCollide.hpDelta,
  },
  /** Hp delta when an item is eaten via the plain `eat` verb, by type; 0 for items whose pickup resolves through
   * another verb (gamble/grantEffect/nudge) — their deltas live in their own descriptors. */
  itemEffects: mapItems((definition) => {
    return definition.interactions.onClick.verb === 'eat'
      ? definition.interactions.onClick.hpDelta
      : 0;
  }),
  fallSpeed: mapItems((definition) => definition.physics.fallSpeed),
  itemRestMs: spawn.restMs,
  itemSpawnXRange: spawn.xRange,
  itemRestYRange: spawn.restYRange,
  spawnWeights: SPAWN_POOLS.world,
  eggEmitWeights: SPAWN_POOLS.eggEmit,
  poopEmitWeights: SPAWN_POOLS.poopEmit,
  spawnIntervalMsRange: spawn.intervalMsRange,
  spawnReferencePlayers: spawn.referencePlayers,
  mushroom: {
    minDelta: FRENZY_ITEMS.mushroom.interactions.onClick.minDelta,
    maxDelta: FRENZY_ITEMS.mushroom.interactions.onClick.maxDelta,
  },
  vitamin: {
    hp: FRENZY_ITEMS.vitamin.interactions.onClick.hpDelta,
    decayPauseMs: FRENZY_ITEMS.vitamin.interactions.onClick.durationMs,
  },
  shield: {
    shieldMs: FRENZY_ITEMS.shield.interactions.onClick.durationMs,
    spawnShieldMs: FRENZY_DEFINITION.spawnEffects.onJoin.durationMs,
  },
  easterEgg: {
    durationMs: FRENZY_ITEMS.easterEgg.interactions.onClick.durationMs,
    emitIntervalMs: FRENZY_DEFINITION.effects.laying.emission.intervalMs,
    hpOnPickup: FRENZY_ITEMS.easterEgg.interactions.onClick.hpDelta,
    emitBack: FRENZY_DEFINITION.effects.laying.emission.launch.back,
    emitDown: FRENZY_DEFINITION.effects.laying.emission.launch.down,
    emitBackSpeed: FRENZY_DEFINITION.effects.laying.emission.launch.backSpeed,
    emitAngleJitter: FRENZY_DEFINITION.effects.laying.emission.launch.angleJitter,
  },
  poop: {
    durationMs: FRENZY_ITEMS.poop.interactions.onClick.durationMs,
    emitIntervalMs: FRENZY_DEFINITION.effects.pooping.emission.intervalMs,
    hpOnPickup: FRENZY_ITEMS.poop.interactions.onClick.hpDelta,
    emitBack: FRENZY_DEFINITION.effects.pooping.emission.launch.back,
    emitDown: FRENZY_DEFINITION.effects.pooping.emission.launch.down,
    emitBackSpeed: FRENZY_DEFINITION.effects.pooping.emission.launch.backSpeed,
    emitAngleJitter: FRENZY_DEFINITION.effects.pooping.emission.launch.angleJitter,
  },
  bomb: {
    maxDamage: FRENZY_ITEMS.bomb.interactions.onCollide.maxDamage,
    minDamage: FRENZY_ITEMS.bomb.interactions.onCollide.minDamage,
    blastRadius: FRENZY_ITEMS.bomb.interactions.onCollide.blastRadius,
    clickImpulse: FRENZY_ITEMS.bomb.interactions.onClick.clickImpulse,
    maxDriftSpeed: FRENZY_ITEMS.bomb.interactions.onClick.maxDriftSpeed,
    emitBackSpeed: FRENZY_ITEMS.bomb.physics.emitLaunchSpeed,
    blastImpulse: FRENZY_ITEMS.bomb.interactions.onCollide.blastImpulse,
    blastImpulseMaxFactor: FRENZY_ITEMS.bomb.interactions.onCollide.blastImpulseMaxFactor,
    clicksToExplodeRange: FRENZY_ITEMS.bomb.interactions.onClick.clicksToExplodeRange,
  },
  playerDriftZone: player.driftZone,
  steer: player.steer,
  bounceDamping: player.bounceDamping,
  playerSpawnMinDistance: player.spawnMinDistance,
  playerSpawnMaxAttempts: player.spawnMaxAttempts,
  playerCollision: {
    relaxation: playerCollision.relaxation,
    slopPx: playerCollision.slopPx,
    restitution: playerCollision.restitution,
    maxCorrectionPx: playerCollision.maxCorrectionPx,
    bumpSpeedThreshold: playerCollision.bumpSpeedThreshold,
    bumpDamage: playerCollision.bumpDamage,
    bumpImpulse: playerCollision.bumpImpulse,
    bumpImpulseScale: playerCollision.bumpImpulseScale,
  },
  ...loop,
  floatPriority: FRENZY_DEFINITION.floats.floatPriority,
  score,
  // NPC fields the CLIENT still reads (anger meter normalization, floor band); server code reads the
  // definition slice directly since phase 5, so server-only fields (seekItemTypes, enabled) are not projected.
  npc: {
    spawnDelayMsRange: ANGRY_BOMB_NPC.spawnDelayMsRange,
    respawnDelayMs: ANGRY_BOMB_NPC.respawnDelayMs,
    floorY: ANGRY_BOMB_NPC.floorY,
    floorBob: ANGRY_BOMB_NPC.floorBob,
    retargetEveryTicks: ANGRY_BOMB_NPC.retargetEveryTicks,
    decayPerStep: ANGRY_BOMB_NPC.decayPerStep,
    anger: ANGRY_BOMB_NPC.anger,
    strongBlast: ANGRY_BOMB_NPC.strongBlast,
  },
  features: {
    items: mapItems((definition) => ({ enabled: definition.enabled })),
    playerCollision: { enabled: playerCollision.enabled },
  },
} as const;

/**
 * Whether an item type is currently enabled (the slice's `enabled` flag, see `FRENZY.features.items`).
 * Consulted by `pickItemType` so a disabled item is dropped from every spawn path. Cheap enough to call per spawn.
 */
export function isItemEnabled(type: ItemType): boolean {
  return FRENZY.features.items[type].enabled;
}

/**
 * Weighted sum of a player's session `scores` by axis (see `FRENZY.score.weights`). The single way score is
 * collapsed to one number for ranking/medals — computed identically on the server and the client (the wire
 * carries the raw `scores`, never this total). Missing axes count as 0; `crownKills` stacks ON TOP of `kills`.
 */
export function totalScore(scores: Partial<Record<ScoreKind, number>>): number {
  const { weights } = FRENZY.score;

  // Data-driven over the weights record (typed `Record<ScoreKind, number>` in the definition), so a new `ScoreKind`
  // is forced to carry a weight AND is summed here automatically — no axis can silently drop out of the total.
  return (Object.keys(weights) as ScoreKind[]).reduce(
    (sum, kind) => sum + (scores[kind] ?? 0) * weights[kind],
    0,
  );
}

/**
 * Whether player↔player collision (soft separation + mini-bump) is on (see `FRENZY.features.playerCollision`).
 * Consulted once per tick by the orchestrator to gate the whole `separatePlayers` pass; off → players overlap freely.
 */
export function isPlayerCollisionEnabled(): boolean {
  return FRENZY.features.playerCollision.enabled;
}

/**
 * Deterministic per-item resting y within `range` (default `FRENZY.itemRestYRange`) — the engine-layer
 * `restYFor` with the frenzy default baked in, so client call sites keep their historical one-argument form.
 */
export function restYFor(
  id: string,
  range: readonly [number, number] = FRENZY.itemRestYRange,
): number {
  return engineRestYFor(id, range);
}
