/**
 * The frenzy game's wire/state contract: the generic engine types (`../engine/types`) instantiated with the
 * id unions derived from the definition rosters (`./definition`). Every export keeps its historical name,
 * so client and server imports stay textually unchanged. Adding an ENABLED item/effect slice — or flipping a
 * dormant slice's `enabled` flag on — grows the matching union and breaks every exhaustive client `Record` at
 * compile time, which is the point; a slice shipped `enabled: false` stays out of the union (see `EnabledKey`).
 */
import type { EnabledKey } from '../engine/definition';
import type {
  EatenEvent as EngineEatenEvent,
  EffectGrantedEvent as EngineEffectGrantedEvent,
  FaintCause as EngineFaintCause,
  FaintedEvent as EngineFaintedEvent,
  GameEvent as EngineGameEvent,
  HumanPlayer as EngineHumanPlayer,
  Item as EngineItem,
  NpcPlayer as EngineNpcPlayer,
  Player as EnginePlayer,
  PlayerBase as EnginePlayerBase,
  PlayerEffect as EnginePlayerEffect,
  ServerMessage as EngineServerMessage,
  ServerState as EngineServerState,
  SlimPlayer as EngineSlimPlayer,
  SlimServerState as EngineSlimServerState,
} from '../engine/types';
import type { FRENZY_EFFECTS, FRENZY_ITEMS, FRENZY_NPCS } from './definition';

export type {
  BlastHit,
  BumpedEvent,
  ClientMessage,
  DetonatedEvent,
  EvolvedEvent,
  ItemNudgedEvent,
  JoinRejectReason,
  NpcAngeredMessage,
  PickupVia,
  PlayerBody,
  PlayerStatus,
  ScoreKind,
  Stage,
  StageBody,
  SteeredMessage,
} from '../engine/types';
export { isNPC, STAGES } from '../engine/types';

/** Derived from the item roster's ENABLED slices (`definition/items/`) — a flagged-off item can never spawn,
 * so the wire/client never sees its literal; flipping the flag grows the union at compile time. */
export type ItemType = EnabledKey<typeof FRENZY_ITEMS>;

/** Derived from the effect roster's ENABLED slices (`definition/effects/`) — what each kind DOES lives in its
 * slice; a flagged-off effect can never be granted, so the wire/client never sees its literal. */
export type PlayerEffectKind = EnabledKey<typeof FRENZY_EFFECTS>;

/** Derived from the NPC roster in `definition/`. */
export type NpcKind = keyof typeof FRENZY_NPCS;

export type PlayerEffect = EnginePlayerEffect<PlayerEffectKind>;
export type PlayerBase = EnginePlayerBase<PlayerEffectKind>;
export type HumanPlayer = EngineHumanPlayer<PlayerEffectKind>;
export type NpcPlayer = EngineNpcPlayer<PlayerEffectKind, NpcKind>;
export type Player = EnginePlayer<PlayerEffectKind, NpcKind>;
export type Item = EngineItem<ItemType>;
export type ServerState = EngineServerState<ItemType, PlayerEffectKind, NpcKind>;
export type SlimPlayer = EngineSlimPlayer<PlayerEffectKind>;
export type SlimServerState = EngineSlimServerState<ItemType, PlayerEffectKind>;
export type EatenEvent = EngineEatenEvent<ItemType>;
export type FaintCause = EngineFaintCause<ItemType>;
export type FaintedEvent = EngineFaintedEvent<ItemType>;
export type EffectGrantedEvent = EngineEffectGrantedEvent<PlayerEffectKind>;
export type GameEvent = EngineGameEvent<ItemType, PlayerEffectKind>;
export type ServerMessage = EngineServerMessage<ItemType, PlayerEffectKind, NpcKind>;
