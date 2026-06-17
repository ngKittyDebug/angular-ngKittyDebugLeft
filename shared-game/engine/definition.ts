/**
 * Data-driven game definition: the descriptor vocabulary a game uses to declare its items, timed effects and
 * NPCs without touching engine code. A game assembles one `GameDefinition` value (see
 * `shared-game/<game>/definition/`) out of per-entity slice files; the engine resolves the descriptors through
 * a CLOSED set of verb primitives (`CoreInteractionSpec`) and effect modifiers (`EffectDefinition`). Mechanics
 * outside this vocabulary mean a deliberate, reviewed extension of the vocabulary — not an ad-hoc hook.
 */
import type { PlayerBody, ScoreKind } from './types';

/**
 * Where damage comes from, for effect modifiers (`damageTaken`/`damageDealt`): `item` — an item's hp hit
 * (rotten/rock/brick/negative gamble), `blast` — a bomb/NPC explosion, `bump` — a player↔player ram.
 * Aligned with the `FaintCause` vocabulary; natural hp decay is NOT a damage source (see `decayPaused`).
 */
export type DamageSource = 'item' | 'blast' | 'bump';

/**
 * The closed verb set an item interaction resolves through. One spec per trigger (`onClick`/`onCollide`/`onLand`):
 * - `eat` — apply a fixed hp delta to the taker and consume the item (0 = a no-op click that still removes it);
 * - `gamble` — roll a random integer hp delta within `[minDelta, maxDelta]` (server-side, never leaks in snapshots);
 * - `grantEffect` — grant a timed effect (see `EffectDefinition`), optionally healing/damaging `hpDelta` alongside;
 * - `nudge` — don't consume: shove the item's drift by `clickImpulse` away from the tap (speed-capped at
 *   `maxDriftSpeed`); `clicksToExplodeRange` is the bomb's hidden click budget — the last click detonates instead;
 * - `explode` — distance-scaled blast: damage falls off quadratically from `maxDamage` (epicentre) floored by
 *   magnitude at `minDamage` within `blastRadius`; knockback `blastImpulse` falls off the same way, post-blast
 *   speed capped at `blastImpulseMaxFactor` × the victim's stage `maxSpeed`;
 * - `toInventory` — RESERVED seam for a future inventory (no resolver is registered yet; do not use);
 * - `none` — the trigger is ignored entirely (the item is not even consumed).
 */
export type CoreInteractionSpec<TEffectId extends string = string> =
  | { verb: 'eat'; hpDelta: number }
  | { verb: 'gamble'; minDelta: number; maxDelta: number }
  | { verb: 'grantEffect'; effectId: TEffectId; durationMs: number; hpDelta?: number }
  | {
      verb: 'nudge';
      clickImpulse: number;
      maxDriftSpeed: number;
      clicksToExplodeRange?: readonly [number, number];
    }
  | {
      verb: 'explode';
      maxDamage: number;
      minDamage: number;
      blastRadius: number;
      blastImpulse: number;
      blastImpulseMaxFactor: number;
    }
  | { verb: 'toInventory' }
  | { verb: 'none' };

/**
 * An emitting aura: while the effect is active its holder drips ONE item from the named spawn pool every
 * `intervalMs`. `launch` is the spray geometry: the item spawns at the body's lower-rear edge — `back`/`down`
 * are the normalized gaps PAST the body edge — and is launched backward at `backSpeed` (opposite the heading)
 * with a random rotation within ±`angleJitter` radians so a burst fans out in a cone.
 */
export interface EmissionSpec {
  intervalMs: number;
  /** Which spawn pool the emitted item type is drawn from (see `GameDefinition.spawnPools`). */
  poolId: string;
  launch: { back: number; down: number; backSpeed: number; angleJitter: number };
}

/**
 * A contact-hazard aura's collision damage (`EffectDefinition.modifiers.contactRam`), split by contact force. Both
 * are negative hp deltas that REPLACE the generic `PlayerCollisionSpec.bumpDamage` for this holder's outgoing hits.
 */
export interface ContactRamSpec {
  /** Hp removed when the holder rams hard (closing speed at/above `bumpSpeedThreshold`). */
  ramDamage: number;
  /** Hp removed when the holder merely scratches — a gentle contact below `bumpSpeedThreshold`, reachable only
   * because this aura lowers the gate to `scratchSpeedThreshold`. Lighter than `ramDamage`. */
  scratchDamage: number;
}

/**
 * What a timed effect DOES, as data. An effect with no fields is a pure marker. The engine consumes the
 * modifiers in its passes (decay step, hp-delta resolution, bump damage), `emission` in the emissions pass and
 * `exclusiveGroup` when granting (a new effect replaces any active effect sharing its group).
 */
export interface EffectDefinition {
  /** Per-entity feature flag, TYPE-LEVEL only (missing = enabled): a slice authored `enabled: false` is dropped
   * from the game's public effect-kind union (see `EnabledKey`), so client exhaustive `Record`s don't demand it
   * and no enabled item can grant it (the grant spec stops typechecking against the narrowed union at the
   * engine-binding boundary). Unlike items, effects have no runtime spawn path to gate — an effect enters play
   * only through a grant, and every grant route is closed off at compile time while the flag is off. */
  enabled?: boolean;
  modifiers?: {
    /** Natural hp decay is suspended while the effect is active (shield, wellFed). */
    decayPaused?: boolean;
    /** Incoming-damage multiplier per source; a full ward sets every source to 0 (shield). Missing source = 1. */
    damageTaken?: Partial<Record<DamageSource, number>>;
    /** Outgoing-damage multiplier per source the holder DEALS (e.g. a barbed-wire aura: `{ bump: 2 }`). */
    damageDealt?: Partial<Record<DamageSource, number>>;
    /** A contact hazard (a spiky aura, e.g. cactus): contacts where THIS body is the rammer register as a hit at
     * the lowered `scratchSpeedThreshold`, so it pricks on the gentlest touch, not just a hard ram — and it deals
     * its OWN damage (overriding the generic `bumpDamage`), split by contact force (`ramDamage` vs `scratchDamage`).
     * The lowered bar applies only to the damage this body DEALS — the other side keeps the normal threshold, so
     * brushing a cactus chips the toucher, not the holder. */
    contactRam?: ContactRamSpec;
  };
  emission?: EmissionSpec;
  exclusiveGroup?: string;
}

/** Per-item physical tunables. Optional fields are overrides; the engine falls back to its global defaults. */
export interface ItemPhysicsSpec {
  /** Fall speed, normalized scene-height units per second (1 = full height). */
  fallSpeed: number;
  /** Collidable box override in world px (the bomb's sensor-tip span); default — the world's `itemSizePx`. */
  sizePx?: number;
  /** Catch-reach generosity override (the bomb's strict edge-to-edge contact); default — the global assist. */
  catchGenerosity?: number;
  /** Aura-emission launch-speed override (the heavy bomb eases out near its drift cap); default — the aura's `backSpeed`. */
  emitLaunchSpeed?: number;
}

/**
 * One item's complete definition — the whole tuning of the entity in one slice file: its feature flag, physics,
 * spawn-pool memberships and the verb descriptor per trigger.
 */
export interface ItemDefinition<TEffectId extends string = string> {
  /** Per-entity feature flag: disabling removes the item from EVERY spawn path, so it never enters play. */
  enabled: boolean;
  physics: ItemPhysicsSpec;
  /** Spawn-pool memberships with relative weights (normalized by the pool's sum). Membership in the `world`
   * pool (natural drops) is mandatory — a new item cannot silently lack a weight; curated pools (e.g. aura
   * emission pools) are opt-in via extra keys. Pool records are assembled by the game's definition aggregator. */
  spawn: { world: number } & Partial<Record<string, number>>;
  interactions: {
    onClick: CoreInteractionSpec<TEffectId>;
    onCollide?: CoreInteractionSpec<TEffectId>;
    onLand?: CoreInteractionSpec<TEffectId>;
  };
}

/**
 * Engine-level NPC descriptor: the spawn/identity contract every autobot shares. Kind-specific behaviour tuning
 * (seek lists, anger meters, blast scaling) belongs to the NPC's own definition slice, which extends this.
 */
export interface NpcDefinition {
  /** Per-entity feature flag: disabling keeps the NPC spawner from ever creating this autobot. */
  enabled: boolean;
  /** Opaque appearance id the client resolves to a sprite (the server never interprets it). */
  appearance: string;
  startingHp: number;
  startingMana: number;
  /** Hp lost per decay step (the NPC's own starvation rate, independent of the humans' `HpSpec.decayPerTick`). */
  decayPerStep: number;
  /** Server-authored per-stage body (humans send theirs on `join`; an NPC has no client to do so). */
  body: PlayerBody;
  /** Random window (ms) after the first human joins before the NPC spawns: `[min, max]`. */
  spawnDelayMsRange: readonly [number, number];
  /** Delay (ms) after any NPC death before it respawns, repeated while humans remain. */
  respawnDelayMs: number;
}

/** World geometry: the fixed physical playfield the normalized 0..1 coords map onto, plus the item sprite box. */
export interface WorldSpec {
  /** Canonical world size in px — the client renders this fixed-size world behind a scrolling camera, the
   * server stays in 0..1 and only reads it for size-aware edge bounds. */
  width: number;
  height: number;
  /** Physical sprite-box size in world px of a falling item — single source for render size (client) and
   * size-aware collision reach (server). Per-item override: `ItemPhysicsSpec.sizePx`. */
  itemSizePx: number;
}

/** Server game-loop cadence, room/connection caps, disconnect grace and click rate-limiting. */
export interface LoopSpec {
  tickRateHz: number;
  snapshotEveryNTicks: number;
  heartbeatMs: number;
  graceMs: number;
  cooldownAfterFaintedMs: number;
  maxPlayers: number;
  maxConnections: number;
  clickRateLimitWindowMs: number;
  clickRateLimitMax: number;
}

/** HP economy: the resource every player spends (decay) and earns (eating), and the stage ladder baseline. */
export interface HpSpec {
  startingHp: number;
  maxHp: number;
  decayPerTick: number;
  decayIntervalMs: number;
  lowHpWarningThreshold: number;
}

/** Item↔player collision tuning shared across items (per-item overrides live in `ItemPhysicsSpec`). */
export interface CollisionSpec {
  /** Catch reach generosity: only the player's per-stage half-extent is scaled by this factor (>1 keeps
   * catches forgiving while a bigger player reaches further), the item enters at its true edge. */
  catchGenerosity: number;
}

/** Player↔player soft-separation + mini-bump tuning, incl. its feature flag. */
export interface PlayerCollisionSpec {
  enabled: boolean;
  relaxation: number;
  slopPx: number;
  restitution: number;
  maxCorrectionPx: number;
  bumpSpeedThreshold: number;
  /** Lowered closing-speed gate (normalized units/sec) used in place of `bumpSpeedThreshold` for a contact whose
   * rammer carries a `contactRam` effect (cactus): a gentle touch now pricks, while a resting contact (closing
   * speed damped to ~0) stays below it, so sustained overlap never tick-drains hp. */
  scratchSpeedThreshold: number;
  bumpDamage: number;
  bumpImpulse: number;
  bumpImpulseScale: number;
  /** Post-kick speed cap for separation/bump impulses, as a multiple of the victim's stage `maxSpeed` —
   * stamped onto every impulse this pass produces (the same per-impulse cap a blast's `blastImpulseMaxFactor`
   * stamps onto its knockback). Historically the bomb's factor applied globally; the value matches it. */
  impulseMaxFactor: number;
}

/** Player movement: drift zone, steering input, wall bounce and spawn placement. */
export interface PlayerMovementSpec {
  driftZone: { minX: number; maxX: number; minY: number; maxY: number };
  steer: { impulse: number };
  bounceDamping: { wall: number; floor: number };
  spawnMinDistance: number;
  spawnMaxAttempts: number;
}

/** Item spawn cadence and lifecycle: entry (interval, x-band) and exit (floor rest time/band). */
export interface SpawnSpec {
  /** `[min, max]` ms between natural item spawns at `referencePlayers` actives; scaled by player count. */
  intervalMsRange: readonly [number, number];
  /** Active-player count at which the interval applies as-is (`referencePlayers / activePlayers` scaling). */
  referencePlayers: number;
  /** `[min, max]` horizontal spawn position (normalized 0..1), inset from the scene edges. */
  xRange: readonly [number, number];
  /** How long an item lies on the floor (still edible) after landing before it disappears, ms. */
  restMs: number;
  /** `[min, max]` normalized y band where a landing item settles (its centre), picked per item id. */
  restYRange: readonly [number, number];
}

/** Session score weights by axis — `totalScore` is the weighted sum of a player's `scores`. */
export interface ScoreSpec {
  weights: Record<ScoreKind, number>;
}

/** Floating-message tunables shared by server (stamps priorities onto events) and client (renders the column). */
export interface FloatsSpec {
  /** Release order within a player's floating column: higher floats up first, ties break FIFO. */
  floatPriority: Record<string, number>;
}

/**
 * The id union of a roster's ENABLED slices: `keyof` filtered by each slice's `enabled` literal (missing = on).
 * This is what makes a per-entity feature flag a COMPILE-TIME gate, not just a runtime one — a slice shipped
 * `enabled: false` sits in the roster (definition assembly, spawn pools) but stays out of the public union, so
 * the client's exhaustive `Record`s never demand its art/i18n. Flipping the flag to `true` grows the union and
 * breaks every such `Record` — the compile errors ARE the rollout checklist. Requires `as const` slices: a
 * widened `enabled: boolean` fails open (the key stays in the union).
 */
export type EnabledKey<TRoster extends Record<string, object>> = {
  [K in keyof TRoster]: TRoster[K] extends { enabled: false } ? never : K;
}[keyof TRoster];

/**
 * The complete data definition of one game: entity rosters (items/effects/NPCs as per-entity descriptor
 * slices) plus the engine's neutral tuning blocks. The id unions are `keyof`-derived from the rosters by the
 * game's `types.ts` (restricted to enabled slices via `EnabledKey`), so growing a roster — or flipping a
 * slice's flag on — grows the union and the client's exhaustive `Record`s at compile time.
 */
export interface GameDefinition<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  items: Record<TItemId, ItemDefinition<TEffectId>>;
  effects: Record<TEffectId, EffectDefinition>;
  npcs: Record<TNpcId, NpcDefinition>;
  /**
   * Weighted item pools by pool id, assembled from the items' `spawn` memberships. `world` drives natural
   * drops; emitting auras name their pool via `EmissionSpec.poolId`. KEY ORDER inside a pool is load-bearing:
   * the weighted pick walks `Object.entries` cumulatively, so reordering remaps the rng → behavior changes.
   */
  spawnPools: Record<string, Readonly<Partial<Record<TItemId, number>>>>;
  spawn: SpawnSpec;
  /** Effects auto-granted by the engine outside item pickups (e.g. a brief spawn-protection ward on join). */
  spawnEffects?: { onJoin?: { effectId: TEffectId; durationMs: number } };
  world: WorldSpec;
  loop: LoopSpec;
  hp: HpSpec;
  collision: CollisionSpec;
  playerCollision: PlayerCollisionSpec;
  player: PlayerMovementSpec;
  score: ScoreSpec;
  floats: FloatsSpec;
}
