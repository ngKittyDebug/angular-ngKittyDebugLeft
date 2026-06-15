import { FRENZY } from '@game/frenzy/config';
import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import { ANGRY_BOMB_NPC } from '@game/frenzy/definition/npcs/angry-bomb';
import type {
  DetonatedEvent,
  FaintedEvent,
  GameEvent,
  NpcPlayer,
  ServerState,
} from '@game/engine/types';
import { isNPC } from '@game/engine/types';
import type { ItemType, PlayerEffectKind, NpcKind } from '@game/frenzy/types';

import { applyHpDeltas } from '../../../../engine/core/apply-hp-deltas';
import { applyImpulses } from '../../../../engine/core/apply-impulses';
import type { HpDelta } from '../../../../engine/verbs';
import { computeBlast } from '../../../../engine/verbs/compute-blast';
import type { BlastParams } from '../../../../engine/verbs/compute-blast';

type FrenzyState = ServerState<ItemType, PlayerEffectKind, NpcKind>;
type FrenzyNpc = NpcPlayer<PlayerEffectKind, NpcKind>;

export interface NpcBlastResult {
  state: FrenzyState;
  events: GameEvent<ItemType, PlayerEffectKind>[];
}

/** The item-mine blast params from `FRENZY.bomb` — a normal mine. The NPC weak (starvation) blast reuses these. */
function itemBombBlastParams(x: number, y: number): BlastParams {
  return {
    x,
    y,
    radius: FRENZY.bomb.blastRadius,
    maxDamage: FRENZY.bomb.maxDamage,
    minDamage: FRENZY.bomb.minDamage,
    blastImpulse: FRENZY.bomb.blastImpulse,
    blastImpulseMaxFactor: FRENZY.bomb.blastImpulseMaxFactor,
  };
}

/**
 * Strong-blast params for an NPC at max anger: the item mine's base damage/radius/impulse scaled by the NPC's
 * evolution stage (`strongBlast.*` in the definition slice). A stage-3 angry bomb hits noticeably harder and wider
 * than a normal mine; the impulse rides the damage multiplier so the knockback fling scales with the blast too.
 */
function strongBlastParams(npc: FrenzyNpc): BlastParams {
  const damageMultiplier = ANGRY_BOMB_NPC.strongBlast.stageDamageMultiplier[npc.stage];
  const radiusMultiplier = ANGRY_BOMB_NPC.strongBlast.stageRadiusMultiplier[npc.stage];

  return {
    x: npc.x,
    y: npc.y,
    radius: FRENZY.bomb.blastRadius * radiusMultiplier,
    maxDamage: FRENZY.bomb.maxDamage * damageMultiplier,
    minDamage: FRENZY.bomb.minDamage,
    blastImpulse: FRENZY.bomb.blastImpulse * damageMultiplier,
    blastImpulseMaxFactor: FRENZY.bomb.blastImpulseMaxFactor,
  };
}

/** A `detonated` event for an NPC blast — uses the NPC's own id as `itemId` (the client drops it by id, harmlessly). */
function npcDetonated(
  npc: FrenzyNpc,
  hpDeltas: readonly HpDelta[],
  radius: number,
): DetonatedEvent {
  return {
    type: 'detonated',
    itemId: npc.id,
    x: npc.x,
    y: npc.y,
    radius,
    hits: hpDeltas.map((delta) => ({ playerId: delta.playerId, delta: delta.amount })),
  };
}

/** Whether an NPC is detonating this tick: strong at max anger, otherwise weak when starved to hp 0. */
function blastFor(
  npc: FrenzyNpc,
): { params: BlastParams; cause: FaintedEvent<ItemType>['cause'] } | undefined {
  if (npc.mana >= ANGRY_BOMB_NPC.anger.max) {
    return { params: strongBlastParams(npc), cause: undefined };
  }

  if (npc.hp <= 0) {
    return { params: itemBombBlastParams(npc.x, npc.y), cause: { by: 'decay' } };
  }

  return undefined;
}

/**
 * NPC blast pass (the `NpcRuntime.applyBlasts` hook) — run AFTER `applyDecayStep` so this tick's decay can starve
 * the NPC into a weak blast. For each angry-bomb NPC that should detonate (max anger → STRONG stage-scaled blast;
 * else hp ≤ 0 → WEAK item-mine blast) it: hits the caught HUMANS via `computeBlast` (the NPC is `immuneId`, so it
 * never blasts itself — O8) through `applyHpDeltas` + `applyImpulses`, removes the NPC from state, and emits a
 * `detonated` (itemId = npc.id, true radius, caught humans) plus a `fainted` (playerId = npc.id). The room's
 * respawn re-arm in `index.gameTick` then schedules the next NPC.
 */
export function applyNpcBlasts(state: FrenzyState): NpcBlastResult {
  // Decide each NPC's blast once and carry it alongside the NPC (no second `blastFor` pass, no dead guard).
  const detonating = state.players.flatMap((player) => {
    if (!isNPC(player) || player.npcKind !== 'angryBomb') {
      return [];
    }

    const blast = blastFor(player);

    return blast !== undefined ? [{ npc: player, blast }] : [];
  });

  if (detonating.length === 0) {
    return { state, events: [] };
  }

  let working = state;
  const events: GameEvent<ItemType, PlayerEffectKind>[] = [];

  for (const { npc, blast } of detonating) {
    const { hpDeltas, impulses } = computeBlast(
      FRENZY_DEFINITION.effects,
      blast.params,
      working.players,
      npc.id,
    );
    // Collateral humans caught in the blast die "to a bomb" (the same obituary as a normal item mine) for BOTH the
    // strong and the weak/starvation blast — they were genuinely hit by an explosion. Only the NPC's OWN fainted
    // carries the decay cause. No killerId: the NPC isn't a scoring entity (excluded from the leaderboard, D11).
    // Explicit type args: inference over the raw definition would widen to the FULL roster keys; the slice
    // speaks the public (enabled-only) unions, like the engine binding in `game.ts`.
    const resolved = applyHpDeltas<ItemType, PlayerEffectKind, NpcKind>(
      FRENZY_DEFINITION,
      working,
      hpDeltas,
      { by: 'item', itemType: 'bomb' },
    );

    working = applyImpulses(resolved.state, impulses);
    working = { ...working, players: working.players.filter((player) => player.id !== npc.id) };

    events.push(npcDetonated(npc, hpDeltas, blast.params.radius));
    events.push(...resolved.events);
    events.push({ type: 'fainted', playerId: npc.id, ...(blast.cause && { cause: blast.cause }) });
  }

  return { state: working, events };
}
