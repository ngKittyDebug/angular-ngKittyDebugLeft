export type Stage = 1 | 2 | 3;
export type Line = 'bulbasaur' | 'caterpie' | 'charmander' | 'magikarp' | 'pidgey' | 'squirtle';
export type ItemType = 'food' | 'rotten' | 'rock' | 'rareCandy';
export type PlayerStatus = 'alive' | 'disconnected';

export interface Player {
  id: string;
  name: string;
  line: Line;
  stage: Stage;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  status: PlayerStatus;
  disconnectedAt: number | null;
  joinedAt: number;
}

export interface Item {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  vy: number;
  /** Set once the item lands on the floor: remaining lie-on-floor time, ms. Counts down to removal; the item stays edible meanwhile. Undefined while still falling. */
  restMs?: number;
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
}

export interface EvolvedEvent {
  type: 'evolved';
  playerId: string;
  newStage: Stage;
}

export interface FaintedEvent {
  type: 'fainted';
  playerId: string;
}

// Gameplay events emitted by the engine (apply-click/apply-tick) — single source; ServerMessage reuses them.
export type GameEvent = EatenEvent | EvolvedEvent | FaintedEvent;

export type ClientMessage =
  | { type: 'identify'; sessionToken: string }
  | { type: 'join'; name: string; line: Line }
  | { type: 'click'; itemId: string }
  | { type: 'leave' };

export type ServerMessage =
  | GameEvent
  | { type: 'snapshot'; state: ServerState }
  | { type: 'spawned'; item: Item }
  | { type: 'roomFull' }
  | { type: 'rejoined'; playerId: string };
