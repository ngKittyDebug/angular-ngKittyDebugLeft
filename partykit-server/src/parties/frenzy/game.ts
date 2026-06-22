import { FRENZY_DEFINITION } from '@game/frenzy/definition';
import type { ItemType, NpcKind, PlayerEffectKind } from '@game/frenzy/types';

import type { Engine } from '../../engine/create-engine';
import { createEngine } from '../../engine/create-engine';
import { npcHooksFromRegistry } from '../../engine/npc/registry';
import type { NpcHooks, NpcRegistry } from '../../engine/npc/types';
import { angryBombRuntime } from './slices/angry-bomb/runtime';

/**
 * Frenzy's composition root: the generic engine bound to the frenzy `GameDefinition` and the per-kind NPC
 * runtime registry. This is the ONLY place the engine and the theme meet — the party adapter (`index.ts`) talks
 * to the bound `Engine`, the engine reads only the definition. Future slice extensions (custom verbs, more NPC
 * runtimes) register here too.
 */
export const FRENZY_NPC_REGISTRY: NpcRegistry<ItemType, PlayerEffectKind, NpcKind> = {
  angryBomb: angryBombRuntime,
};

/** The registry adapted to orchestrator hooks — exported so frenzy specs can drive `applyTick` directly. */
export const frenzyNpcHooks: NpcHooks<ItemType, PlayerEffectKind, NpcKind> =
  npcHooksFromRegistry(FRENZY_NPC_REGISTRY);

// Explicit type args: inference over the definition lands on the FULL roster keys, but the public unions are
// the ENABLED slices only (see `EnabledKey`) — the engine must speak the narrowed wire unions. The definition
// remains assignable because the rosters are supersets of the enabled keys and no enabled item references a
// disabled effect (a mismatched flag flip fails to compile exactly here).
export const frenzyEngine: Engine<ItemType, PlayerEffectKind, NpcKind> = createEngine<
  ItemType,
  PlayerEffectKind,
  NpcKind
>(FRENZY_DEFINITION, FRENZY_NPC_REGISTRY);
