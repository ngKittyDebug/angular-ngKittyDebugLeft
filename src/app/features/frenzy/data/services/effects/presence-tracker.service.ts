import { inject, Injectable } from '@angular/core';

import { isNPC } from '@game/frenzy/types';
import type { Player, ServerMessage, SlimPlayer } from '@game/frenzy/types';

import type { EffectContext } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';

/**
 * Tracks who is on the scene from snapshots: emits "appeared"/"died" quips for other players and
 * remembers their last-known positions so a death quip can be stamped where the Pokémon vanished.
 */
@Injectable()
export class PresenceTracker implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly lastKnownPlayers = new Map<
    string,
    { x: number; y: number; name: string; isNpc: boolean }
  >();
  private knownPlayerIds = new Set<string>();
  private seenFirstSnapshot = false;

  public readonly messageTypes = ['snapshot', 'slimSnapshot', 'fainted'] as const;

  public handle(message: ServerMessage, context: EffectContext): void {
    if (message.type === 'snapshot') {
      this.handleSnapshot(message.state.players, context);
    }

    if (message.type === 'slimSnapshot') {
      this.handleSlimSnapshot(message.state.players);
    }

    if (message.type === 'fainted') {
      this.handleFainted(message.playerId, context);
    }
  }

  private handleSnapshot(players: readonly Player[], context: EffectContext): void {
    const myId = context.myId;
    const currentIds = new Set<string>();

    for (const player of players) {
      const npc = isNPC(player);

      currentIds.add(player.id);
      this.lastKnownPlayers.set(player.id, {
        x: player.x,
        y: player.y,
        name: player.name,
        isNpc: npc,
      });

      if (this.seenFirstSnapshot && player.id !== myId && !this.knownPlayerIds.has(player.id)) {
        // The NPC has no name label, so its appearance quip is anchored to it but carries no `who`.
        this.floats.pushOwnedStatus(
          npc ? 'npcAppeared' : 'appeared',
          player.id,
          npc ? undefined : player.name,
        );
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

  // Slim snapshots carry no name/kind, so they can't announce newcomers (the announcing full snapshot does) —
  // they only keep last-known positions fresh between roster changes (so a later death quip lands where the
  // Pokémon actually was) and prune leavers (slim membership is authoritative, same as full).
  private handleSlimSnapshot(players: readonly SlimPlayer[]): void {
    const currentIds = new Set<string>();

    for (const slim of players) {
      currentIds.add(slim.id);

      const known = this.lastKnownPlayers.get(slim.id);

      if (known !== undefined) {
        this.lastKnownPlayers.set(slim.id, { ...known, x: slim.x, y: slim.y });
      }
    }

    for (const id of [...this.lastKnownPlayers.keys()]) {
      if (!currentIds.has(id)) {
        this.lastKnownPlayers.delete(id);
        this.knownPlayerIds.delete(id);
      }
    }
  }

  private handleFainted(playerId: string, context: EffectContext): void {
    if (playerId === context.myId) {
      return;
    }

    const last = this.lastKnownPlayers.get(playerId);

    if (last === undefined) {
      return;
    }

    // NPC death quip carries no name (it has no human-style label).
    this.floats.pushOrphanStatus(
      last.isNpc ? 'npcDied' : 'died',
      last.x,
      last.y,
      last.isNpc ? undefined : last.name,
    );
    this.lastKnownPlayers.delete(playerId);
    this.knownPlayerIds.delete(playerId);
  }
}
