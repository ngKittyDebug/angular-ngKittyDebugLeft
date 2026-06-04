import { inject, Injectable } from '@angular/core';

import type { Player, ServerMessage } from '@game/frenzy/types';

import { FrenzyStore } from '../../store/frenzy.store';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';

/**
 * Tracks who is on the scene from snapshots: emits "appeared"/"died" quips for other players and
 * remembers their last-known positions so a death quip can be stamped where the Pokémon vanished.
 */
@Injectable()
export class PresenceTracker implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly store = inject(FrenzyStore);
  private readonly lastKnownPlayers = new Map<string, { x: number; y: number; name: string }>();
  private knownPlayerIds = new Set<string>();
  private seenFirstSnapshot = false;

  public handle(message: ServerMessage): void {
    if (message.type === 'snapshot') {
      this.handleSnapshot(message.state.players);
    }

    if (message.type === 'fainted') {
      this.handleFainted(message.playerId);
    }
  }

  private handleSnapshot(players: readonly Player[]): void {
    const myId = this.store.myId();
    const currentIds = new Set<string>();

    for (const player of players) {
      currentIds.add(player.id);
      this.lastKnownPlayers.set(player.id, { x: player.x, y: player.y, name: player.name });

      if (this.seenFirstSnapshot && player.id !== myId && !this.knownPlayerIds.has(player.id)) {
        this.floats.pushOwnedStatus('appeared', player.id, player.name);
      }
    }

    for (const id of [...this.lastKnownPlayers.keys()]) {
      if (!currentIds.has(id)) {
        this.lastKnownPlayers.delete(id);
      }
    }

    this.knownPlayerIds = currentIds;
    this.seenFirstSnapshot = true;
  }

  private handleFainted(playerId: string): void {
    if (playerId === this.store.myId()) {
      return;
    }

    const last = this.lastKnownPlayers.get(playerId);

    if (last === undefined) {
      return;
    }

    this.floats.pushOrphanStatus('died', last.x, last.y, last.name);
    this.lastKnownPlayers.delete(playerId);
    this.knownPlayerIds.delete(playerId);
  }
}
