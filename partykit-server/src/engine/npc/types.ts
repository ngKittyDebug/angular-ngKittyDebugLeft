import type { GameEvent, Item, NpcPlayer, Player, ServerState } from '@game/engine/types';

/**
 * One NPC kind's behaviour, registered per game at `createEngine` time — the engine never imports a concrete
 * NPC implementation. The kind's DATA (spawn delays, body, decay) lives in `GameDefinition.npcs[kind]`; this is
 * the matching runtime CODE, owned by the game's server slice (see `parties/<game>/slices/`).
 */
export interface NpcRuntime<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  /** Advance ONE NPC of this kind for the tick (humans move separately via `movePlayers`). */
  move(
    npc: NpcPlayer<TEffectId, TNpcId>,
    items: readonly Item<TItemId>[],
    deltaSeconds: number,
    tick: number,
  ): NpcPlayer<TEffectId, TNpcId>;
  /** Resolve this kind's detonations across the whole state (runs after decay, before `coolAnger` — the blast
   * may hit humans and remove the NPC itself, so it threads full state rather than a single NPC). */
  applyBlasts(state: ServerState<TItemId, TEffectId, TNpcId>): {
    state: ServerState<TItemId, TEffectId, TNpcId>;
    events: GameEvent<TItemId, TEffectId>[];
  };
  /** Real-time per-tick anger cooldown for ONE surviving NPC of this kind (O6 — not on the decay grid). */
  coolAnger(npc: NpcPlayer<TEffectId, TNpcId>): NpcPlayer<TEffectId, TNpcId>;
}

/** Per-kind NPC runtime registry — `createEngine`'s NPC seam. A game without NPCs passes `{}` (or omits it). */
export type NpcRegistry<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> = Partial<Record<TNpcId, NpcRuntime<TItemId, TEffectId, TNpcId>>>;

/**
 * The seam through which the tick orchestrator drives NPC behaviour, shaped exactly after its three call sites
 * (see `applyTick` for the ordering invariants O4/O6/O8). Built from the per-kind registry once per engine by
 * `npcHooksFromRegistry` (see `./registry`) — orchestrator code never dispatches by kind itself.
 */
export interface NpcHooks<
  TItemId extends string = string,
  TEffectId extends string = string,
  TNpcId extends string = string,
> {
  /** Move every NPC for this tick (humans move separately via `movePlayers`). */
  move(
    npcs: readonly NpcPlayer<TEffectId, TNpcId>[],
    items: readonly Item<TItemId>[],
    deltaSeconds: number,
    tick: number,
  ): NpcPlayer<TEffectId, TNpcId>[];
  /** Resolve NPC detonations for this tick (runs after decay, before `coolAnger` — see the orchestrator). */
  applyBlasts(state: ServerState<TItemId, TEffectId, TNpcId>): {
    state: ServerState<TItemId, TEffectId, TNpcId>;
    events: GameEvent<TItemId, TEffectId>[];
  };
  /** Real-time per-tick anger cooldown for the surviving NPCs (O6 — not on the decay grid). */
  coolAnger(players: readonly Player<TEffectId, TNpcId>[]): Player<TEffectId, TNpcId>[];
}
