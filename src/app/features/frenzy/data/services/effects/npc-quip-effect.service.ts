import { inject, Injectable } from '@angular/core';

import { FloatingMessagesStore } from './floating-messages.store';

/**
 * Optimistic quip when the local player pokes the angry-bomb NPC. The server accrues anger but emits no
 * per-poke event, so the float is fired client-side. Each poke replaces the NPC's previous quip (keyed by id)
 * so spamming interrupts rather than stacking a column — the same trick `SelfMoodEffect.pokeSelf` uses.
 */
@Injectable()
export class NpcQuipEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly pokeMessageIds = new Map<string, string>();

  public pokeNpc(npcId: string): void {
    const previous = this.pokeMessageIds.get(npcId);

    if (previous !== undefined) {
      this.floats.remove(previous);
    }

    this.pokeMessageIds.set(npcId, this.floats.pushOwnedStatus('npcPoke', npcId));
  }
}
