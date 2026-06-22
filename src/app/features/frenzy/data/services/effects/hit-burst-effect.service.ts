import { Injectable } from '@angular/core';

import type { PickupVia, ServerMessage } from '@game/frenzy/types';

import type { HitBurst, OwnedSpark } from '../../models/hit-burst';
import { type EffectContext, isMine } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';
import { createTransientId, TransientList } from './transient-list';

// Lifetime of a hit burst — matches the bubble-burst CSS animation (~1s with per-dot delays) so it is never cut.
const HIT_BURST_TTL_MS = 1000;
// Cartoon sparks are a quick pop — a touch under a second, as asked.
const SPARK_TTL_MS = 800;

/**
 * Marks where a successful pickup lands so the grab reads as having paid off, splitting the cue by how the item was
 * taken. Fires for EVERY player (not just me), so the room sees each other's grabs; `mine` flags my own Pokémon.
 *
 * - A **clicked** pickup (`via: 'click'`, any item incl. `eaten`/`effectGranted`) → a converging bubble burst that
 *   implodes on the vanished item.
 * - A **collision** with a falling **rock/brick** → cartoon sparks over the struck Pokémon (it got bonked on the
 *   head): owned by that player's sprite, no burst.
 * - A **Pokémon-vs-Pokémon ram** (`bumped`) → the same cartoon sparks over the rammed Pokémon. The float quip is
 *   produced separately by `BumpEffect`; this adds the visual hit on top.
 * - Any **other collision** pickup (drifted into food/berry/shield/…) → an outward bubble splash on the item.
 *
 * `itemNudged` (bomb still alive) and `detonated` (own blast already renders) get nothing.
 */
@Injectable()
export class HitBurstEffect implements FrenzyEffect {
  private readonly bursts = new TransientList<HitBurst>();
  private readonly sparks = new TransientList<OwnedSpark>();

  public readonly hitBursts = this.bursts.items;
  public readonly ownedSparks = this.sparks.items;
  public readonly messageTypes = ['eaten', 'effectGranted', 'bumped'] as const;

  public handle(message: ServerMessage, context: EffectContext): void {
    if (message.type === 'eaten') {
      // A falling rock/brick that drifted into a Pokémon bonked it on the head — sparks over the struck sprite,
      // but only when the bonk actually hurt. A shielded Pokémon takes no damage (delta 0): no sparks, and instead
      // it falls through to the default collision burst below (the block still struck, just harmlessly).
      if (
        message.via === 'collision' &&
        (message.itemType === 'rock' || message.itemType === 'brick') &&
        message.delta < 0
      ) {
        this.sparks.add({ id: createTransientId(), ownerId: message.playerId }, SPARK_TTL_MS);

        return;
      }

      this.addBurst(message.x, message.y, message.playerId, message.via, context);

      return;
    }

    if (message.type === 'effectGranted') {
      this.addBurst(message.x, message.y, message.playerId, message.via, context);

      return;
    }

    // A ram that hurt — sparks over the rammed sprite, same cue as a rock/brick bonk. The server only emits
    // `bumped` for survivors who actually took damage (shielded ones are filtered out), so no gating needed here.
    if (message.type === 'bumped') {
      this.sparks.add({ id: createTransientId(), ownerId: message.playerId }, SPARK_TTL_MS);
    }
  }

  private addBurst(
    x: number,
    y: number,
    playerId: string,
    via: PickupVia,
    context: EffectContext,
  ): void {
    this.bursts.add(
      {
        id: createTransientId(),
        x,
        // Items are centre-anchored now (item.y is the sprite's visual centre = the server collision centre), so
        // the burst sits on the item with no lift.
        y,
        mine: isMine(playerId, context),
        mode: via === 'click' ? 'converge' : 'burst',
      },
      HIT_BURST_TTL_MS,
    );
  }
}
