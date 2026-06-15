import type { ItemType, NpcKind, PlayerEffectKind } from '@game/frenzy/types';

import type { NpcRuntime } from '../../../../engine/npc/types';
import { coolAnger } from './cool-anger';
import { moveNpc } from './move-npc';
import { applyNpcBlasts } from './npc-blast';

/**
 * The angry-bomb kind's runtime — the CODE half of the slice (its DATA half is
 * `shared-game/frenzy/definition/npcs/angry-bomb.ts`). Registered under its `NpcKind` in the composition root
 * (`game.ts`); the engine drives it only through the `NpcRuntime` seam. Poke-anger accrual (`anger.ts`) and the
 * factory (`create-npc.ts`) are adapter concerns wired in `index.ts`, not engine hooks.
 */
export const angryBombRuntime: NpcRuntime<ItemType, PlayerEffectKind, NpcKind> = {
  move: moveNpc,
  applyBlasts: applyNpcBlasts,
  coolAnger,
};
