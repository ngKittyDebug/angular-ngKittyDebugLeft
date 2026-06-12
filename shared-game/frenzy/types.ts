export type Stage = 1 | 2 | 3;
export type ItemType =
  | 'food'
  | 'rotten'
  | 'rock'
  | 'rareCandy'
  | 'bomb'
  | 'goldenBerry'
  | 'crumb'
  | 'mushroom'
  | 'vitamin'
  | 'shield'
  | 'easterEgg';
export type PlayerStatus = 'alive' | 'disconnected';

// Timed buffs/debuffs a Pokémon carries. `shield` suspends mass decay AND wards off all incoming damage
// (bomb blast, rock bonk, rotten/negative-mushroom) — full invulnerability inside a bubble. `wellFed`
// (vitamin) only suspends decay (damage still lands). `laying` (easterEgg) makes the Pokémon randomly emit
// falling items (incl. bombs) from itself. The union grows per phase.
export type PlayerEffectKind = 'shield' | 'wellFed' | 'laying';

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
  stage: Stage;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  status: PlayerStatus;
  disconnectedAt: number | null;
  joinedAt: number;
  /** Active timed effects, always present (default `[]`). Carried in snapshots; refreshed via `effectGranted`. */
  effects: PlayerEffect[];
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
  /** Player who emitted this item (easter-egg `laying` aura). That player is immune to it: collision and bomb
   * blast skip the owner, so a Pokémon never eats or detonates its own output. Undefined for normal spawns. */
  ownerId?: string;
}

export interface ServerState {
  players: Player[];
  items: Item[];
  tick: number;
}

export interface EatenEvent {
  type: 'eaten';
  itemId: string;
  itemType: ItemType;
  playerId: string;
  newMass: number;
  delta: number;
  x: number;
  y: number;
  /** Float-column release order, stamped at broadcast (see `FRENZY.floatPriority`); client falls back to a default. */
  priority?: number;
}

export interface EvolvedEvent {
  type: 'evolved';
  playerId: string;
  newStage: Stage;
  priority?: number;
}

export interface FaintedEvent {
  type: 'fainted';
  playerId: string;
  priority?: number;
}

// A bomb was juggled by a click: it moved horizontally to `x` (no mass change). Clients snap the item there immediately.
export interface ItemNudgedEvent {
  type: 'itemNudged';
  itemId: string;
  x: number;
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
export interface EffectGrantedEvent {
  type: 'effectGranted';
  playerId: string;
  effect: PlayerEffect;
  itemId: string;
}

// Gameplay events emitted by the engine (apply-click/apply-tick) — single source; ServerMessage reuses them.
export type GameEvent =
  | EatenEvent
  | EvolvedEvent
  | FaintedEvent
  | ItemNudgedEvent
  | DetonatedEvent
  | EffectGrantedEvent;

export type ClientMessage =
  | { type: 'identify'; sessionToken: string }
  | { type: 'join'; name: string; appearance: string }
  // `nudgeX` is the bomb-bat input: the signed horizontal displacement (normalized 0..1) the player wants,
  // computed client-side from a fixed pixel step and the tapped side. Server caps/clamps it. Ignored for non-bomb items.
  | { type: 'click'; itemId: string; nudgeX?: number }
  // Steering: the player tapped empty water at normalized point (x, y). The server adds a velocity impulse toward
  // it on top of the current drift (speed capped), so taps nudge the Pokémon's heading without replacing the drift.
  | { type: 'steer'; x: number; y: number }
  | { type: 'leave' };

export type ServerMessage =
  | GameEvent
  | { type: 'snapshot'; state: ServerState }
  | { type: 'spawned'; item: Item }
  | { type: 'roomFull' }
  | { type: 'rejoined'; playerId: string };
