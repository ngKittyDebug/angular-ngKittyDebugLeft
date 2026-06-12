import { inject, Injectable } from '@angular/core';

import type { ItemType, ServerMessage } from '@game/frenzy/types';

import type { OwnedShieldBlock } from '../../models/shield-block';
import { FrenzyStore } from '../../store/frenzy.store';
import type { FrenzyEffect } from './frenzy-effect';
import { createTransientId, TransientList } from './transient-list';

// Lifetime of the shield-ward cue — covers the bubble pulse flash CSS (~0.55s) so it never gets cut short.
const SHIELD_BLOCK_TTL_MS = 700;
// Items whose only way to resolve an `eaten` event to `delta === 0` is a shield ward (their base effect is
// negative). A delta-0 of any other type is a genuinely neutral pickup, not a block — so we gate on these.
const WARDED_EATEN_TYPES = new Set<ItemType>(['rock', 'brick', 'rotten']);

/**
 * Shield-ward feedback: when an active shield nullifies incoming damage, the warded Pokémon's shield bubble flares
 * (a per-owner deflect-flash pulse). Fires for every player so the room sees a shield earn its keep. Detection
 * differs by damage source:
 *  - `eaten` (rock/brick collision, rotten click): a damaging item that resolved to `delta === 0` was warded.
 *  - `detonated`: shielded players are skipped at the blast (absent from `hits`), so the event can't name
 *    them — instead we scan the snapshot for shielded players within the blast radius (the ward the server
 *    silently applied). Edge: a shielded blast OWNER would also match here (immune by ownership, not by shield),
 *    but the event carries no `ownerId` to exclude them and emitted-bomb owners are rare — accepted.
 * Pure transient push; auto-expires via TransientList.
 */
@Injectable()
export class ShieldBlockEffect implements FrenzyEffect {
  private readonly store = inject(FrenzyStore);
  private readonly blocks = new TransientList<OwnedShieldBlock>();

  public readonly ownedShieldBlocks = this.blocks.items;

  public handle(message: ServerMessage): void {
    if (
      message.type === 'eaten' &&
      message.delta === 0 &&
      WARDED_EATEN_TYPES.has(message.itemType)
    ) {
      this.add(message.playerId);

      return;
    }

    if (message.type === 'detonated') {
      this.addShieldedInRadius(message.x, message.y, message.radius);
    }
  }

  private addShieldedInRadius(x: number, y: number, radius: number): void {
    const now = Date.now();
    const radiusSquared = radius * radius;

    for (const player of this.store.state()?.players ?? []) {
      const shielded = player.effects.some(
        (effect) => effect.kind === 'shield' && effect.expiresAt > now,
      );

      if (player.status !== 'alive' || !shielded) {
        continue;
      }

      const dx = player.x - x;
      const dy = player.y - y;

      if (dx * dx + dy * dy <= radiusSquared) {
        this.add(player.id);
      }
    }
  }

  private add(ownerId: string): void {
    this.blocks.add({ id: createTransientId(), ownerId }, SHIELD_BLOCK_TTL_MS);
  }
}
