import { inject, Injectable, signal } from '@angular/core';

import type { ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import { type EffectContext, isMine } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';

const EVOLUTION_ANIMATION_MS = 1500;

/** Flags an evolving Pokémon for the scene's flash, plays the chime + an "evolved" quip for own evolutions. */
@Injectable()
export class EvolutionEffect implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly sound = inject(SoundPlayerService);
  // Map of playerId → flash start time, not a TransientList (the scene keys the flash by id, not order).
  private readonly _evolvingPlayers = signal<ReadonlyMap<string, number>>(new Map());

  public readonly evolvingPlayers = this._evolvingPlayers.asReadonly();
  public readonly messageTypes = ['evolved'] as const;

  public handle(message: ServerMessage, context: EffectContext): void {
    if (message.type !== 'evolved') {
      return;
    }

    this.markEvolving(message.playerId);

    if (isMine(message.playerId, context)) {
      this.sound.play('evolve');

      const me = context.playerById(message.playerId);

      if (me !== undefined) {
        this.floats.pushOwnedStatus('evolved', me.id);
      }
    }
  }

  private markEvolving(playerId: string): void {
    this._evolvingPlayers.update((current) => {
      const next = new Map(current);

      next.set(playerId, Date.now());

      return next;
    });
    setTimeout(() => {
      this._evolvingPlayers.update((current) => {
        if (!current.has(playerId)) {
          return current;
        }

        const next = new Map(current);

        next.delete(playerId);

        return next;
      });
    }, EVOLUTION_ANIMATION_MS);
  }
}
