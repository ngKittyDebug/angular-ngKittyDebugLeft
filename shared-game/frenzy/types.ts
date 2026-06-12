export type Stage = 1 | 2 | 3;

/**
 * Per-stage physical descriptor of a player's body, authored client-side per Pokémon line and relayed to the
 * server on `join` as opaque numbers (the server never interprets the roster). Drives collision (AABB), the
 * size-aware drift bounds and per-stage speed. `width`/`height` are the BODY hitbox in world px — the collidable
 * torso, centred on the actor's point; for winged/long sprites it's smaller than the rendered art (the client
 * keeps the full render size + a centring offset to itself, never sent here). `speed` is the cruising drift
 * magnitude, `maxSpeed` the steering cap (both normalized units/sec). `hp` is the HP gate to ENTER this stage
 * (not `Player.hp`, the current health) — stage 1 is the baseline (0), and the gates must not decrease across stages.
 */
export interface StageBody {
  width: number;
  height: number;
  speed: number;
  maxSpeed: number;
  hp: number;
}

/** A player's full body descriptor: one `StageBody` per evolution stage. */
export type PlayerBody = Record<Stage, StageBody>;
export type ItemType =
  | 'food'
  | 'rotten'
  | 'rock'
  | 'brick'
  | 'rareCandy'
  | 'bomb'
  | 'goldenBerry'
  | 'crumb'
  | 'mushroom'
  | 'vitamin'
  | 'shield'
  | 'easterEgg'
  | 'poop';
export type PlayerStatus = 'alive' | 'disconnected';

/**
 * A session score axis tracked on top of hp. `kills` — every attributed kill (+1 each, the honest tally).
 * `crownKills` — the subset of those that toppled the hp-leader (the crown); it's a bonus accumulator, not a
 * separate displayed counter, weighted extra in `totalScore` so dethroning pays more. `timeAlive` — seconds
 * survived since `joinedAt`, materialized server-side into the snapshot projection (the client lacks the server
 * clock to derive it). The union grows per concern; add a kind + a weight in `config/score`, the engine is untouched.
 */
export type ScoreKind = 'kills' | 'crownKills' | 'timeAlive';

// Timed buffs/debuffs a Pokémon carries. `shield` suspends hp decay AND wards off all incoming damage
// (bomb blast, rock bonk, rotten/negative-mushroom) — full invulnerability inside a bubble. `wellFed`
// (vitamin) only suspends decay (damage still lands). `laying` (easterEgg) makes the Pokémon randomly emit
// falling items (incl. bombs) from itself. `pooping` (poop) is the cursed twin of `laying` — same emission
// loop, but the Pokémon only sprays rock/brick/bomb. The union grows per phase.
export type PlayerEffectKind = 'shield' | 'wellFed' | 'laying' | 'pooping';

export interface PlayerEffect {
  kind: PlayerEffectKind;
  /** Server-clock ms (Date.now) after which the effect lapses; the engine prunes it each tick. */
  expiresAt: number;
}

export interface Player {
  id: string;
  name: string;
  /** Opaque appearance id the player chose. The server relays it but never interprets it; the client maps it
   * to a Pokémon line/sprite (with a fallback for unknown ids). Keeps the server independent of the roster. */
  appearance: string;
  /** Per-stage physical descriptor (size/speed/stage-gates) the client sent on `join`. Opaque to the server —
   * stored and applied (collision, bounds, drift speed, stage), echoed in snapshots so peers render it. */
  body: PlayerBody;
  stage: Stage;
  hp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  status: PlayerStatus;
  disconnectedAt: number | null;
  joinedAt: number;
  /** Active timed effects, always present (default `[]`). Carried in snapshots; refreshed via `effectGranted`. */
  effects: PlayerEffect[];
  /** Session score accumulators by axis (see `ScoreKind`). Sparse: only non-default kinds are present. `kills`/
   * `crownKills` accrue server-side on attributed faints; `timeAlive` is stamped into the snapshot projection.
   * Reset implicitly on death/leave (the player is removed and re-created). Read via the `totalScore` helper.
   * NOTE: no production consumer ranks by this yet — the leaderboard still sorts by hp; `scores` accrue ahead of a
   * forthcoming score/medals UI, so an unused `totalScore` is expected, not a wiring bug. */
  scores: Partial<Record<ScoreKind, number>>;
}

export interface Item {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  vy: number;
  /** Horizontal velocity (normalized units/sec). Only emitted easter-egg items carry it — they're launched
   * backward (opposite the layer's heading) so they spray out behind it. Normal spawns fall straight (omitted,
   * treated as 0). The engine drifts `x` by it and clamps/zeroes it at the scene edges; the client mirrors. */
  vx?: number;
  /** Set once the item lands on the floor: remaining lie-on-floor time, ms. Counts down to removal; the item stays edible meanwhile. Undefined while still falling. */
  restMs?: number;
  /** Player who emitted this item (`laying`/`pooping` aura). That player is immune to it WHILE it sits in their
   * immediate interaction zone (so a freshly-laid item — incl. a pooped bomb — doesn't instantly eat/detonate its
   * owner). The immunity lapses once the item separates (see `armed`). Undefined for normal spawns. */
  ownerId?: string;
  /** Emitted item that has cleared its owner's interaction zone at least once (a bomb left the blast radius, any
   * other item left the collision box). Once `true` the owner-immunity from `ownerId` no longer applies, so the
   * item can collide with / blast its emitter if it drifts back. Set by the `armEmittedItems` tick pass; sticky.
   * Undefined/false while the item is still hugging its owner, and absent entirely for non-emitted items. */
  armed?: boolean;
  /** Player who last shoved this bomb (set on each nudge). Unlike `ownerId` it grants NO immunity — it's purely a
   * kill-credit stamp: a blast triggered by a shoved bomb names the shover in the obituary. Bombs only; undefined
   * until first shoved, and overwritten by each later shover (last toucher takes the blame in a tug-of-war). */
  lastNudgedBy?: string;
}

export interface ServerState {
  players: Player[];
  items: Item[];
  tick: number;
}

/** How a pickup happened: the player tapped the item (`click`) or drifted into it (`collision`). */
export type PickupVia = 'click' | 'collision';

export interface EatenEvent {
  type: 'eaten';
  itemId: string;
  itemType: ItemType;
  playerId: string;
  newHp: number;
  delta: number;
  x: number;
  y: number;
  /** Whether this eat came from a deliberate tap or a drift-in collision. */
  via: PickupVia;
  /** Float-column release order, stamped at broadcast (see `FRENZY.floatPriority`); client falls back to a default. */
  priority?: number;
}

export interface EvolvedEvent {
  type: 'evolved';
  playerId: string;
  newStage: Stage;
  priority?: number;
}

/**
 * What ended a Pokémon's run, carried on the fainted event so the client can write an obituary.
 * `decay` = starved out by hp decay (no item involved). `item` = a specific item dealt the killing blow;
 * `itemType` is that item and `killerId` is the player who emitted it (easter-egg/poop aura) — absent for
 * naturally spawned items. `bump` = a rival Pokémon rammed it to death in a collision; `killerId` is that rival
 * (always named — collisions always have a culprit). Optional overall: omitted only by legacy/unknown deaths.
 */
export type FaintCause =
  | { by: 'decay' }
  | { by: 'item'; itemType: ItemType; killerId?: string }
  | { by: 'bump'; killerId: string };

export interface FaintedEvent {
  type: 'fainted';
  playerId: string;
  cause?: FaintCause;
  priority?: number;
}

// A bomb was shoved by a click: the click added an inertial impulse to its drift velocity (no hp change).
// `x`/`y` are the bomb's authoritative position at shove time, `vx`/`vy` its new 2D drift velocity — clients
// re-anchor their extrapolation baseline from all four so the shove (and any tug-of-war between players) shows at once.
export interface ItemNudgedEvent {
  type: 'itemNudged';
  itemId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// A bomb exploded at (x, y) over `radius`; `playerIds` are everyone caught in the blast (incl. the owner).
// `itemId` is the bomb itself — clients drop it immediately so its sprite doesn't linger until the next snapshot.
export interface DetonatedEvent {
  type: 'detonated';
  itemId: string;
  x: number;
  y: number;
  radius: number;
  playerIds: string[];
  priority?: number;
}

// A player picked up an effect item (e.g. vitamin → shield) and gained a timed effect. `itemId` is the
// consumed pickup so clients drop its sprite at once; `effect` carries the kind and server-clock expiry for the aura.
// `x, y` are the consumed item's position (so clients can mark the spot it vanished from); `via` how it was picked up.
export interface EffectGrantedEvent {
  type: 'effectGranted';
  playerId: string;
  effect: PlayerEffect;
  itemId: string;
  x: number;
  y: number;
  via: PickupVia;
}

// Two Pokémon rammed each other hard enough to deal collision damage. `playerId` is a hit-but-survived Pokémon
// (a Pokémon the ram finished off gets a `fainted` event instead); the client floats a quip over it. The damage
// amount isn't carried — the HP bar reconciles on the next snapshot, like a bomb blast.
export interface BumpedEvent {
  type: 'bumped';
  playerId: string;
  priority?: number;
}

// Gameplay events emitted by the engine (apply-click/apply-tick) — single source; ServerMessage reuses them.
export type GameEvent =
  | EatenEvent
  | EvolvedEvent
  | FaintedEvent
  | ItemNudgedEvent
  | DetonatedEvent
  | EffectGrantedEvent
  | BumpedEvent;

export type ClientMessage =
  | { type: 'identify'; sessionToken: string }
  | { type: 'join'; name: string; appearance: string; body: PlayerBody }
  // `nudgeX`/`nudgeY` are the bomb-shove input: a 2D direction (each roughly −1..1) pointing AWAY from the tapped
  // side (tap the mine's right → push left, tap its top → push down, etc.). The server normalizes the pair and
  // applies a fixed `bomb.clickImpulse` to the bomb's drift velocity (total speed capped at `bomb.maxDriftSpeed`).
  // Ignored for non-bomb items.
  | { type: 'click'; itemId: string; nudgeX?: number; nudgeY?: number }
  // Steering: the player tapped empty water at normalized point (x, y). The server adds a velocity impulse toward
  // it on top of the current drift (speed capped), so taps nudge the Pokémon's heading without replacing the drift.
  | { type: 'steer'; x: number; y: number }
  | { type: 'leave' };

/**
 * Why a `join` was refused, so the client can show a localized message (`frenzy.joinError.<reason>`):
 * `invalidName` — empty/blank after trim; `invalidAppearance` — empty or over the length cap;
 * `invalidBody` — the per-stage descriptor failed bounds/monotonicity. Distinct from `roomFull` (capacity).
 */
export type JoinRejectReason = 'invalidName' | 'invalidAppearance' | 'invalidBody';

export type ServerMessage =
  | GameEvent
  | { type: 'snapshot'; state: ServerState }
  | { type: 'spawned'; item: Item }
  | { type: 'roomFull' }
  | { type: 'joinRejected'; reason: JoinRejectReason }
  | { type: 'rejoined'; playerId: string }
  // Liveness heartbeat (carries no state) — lets the client tell a live-but-idle socket from a stalled one.
  | { type: 'ping' };
