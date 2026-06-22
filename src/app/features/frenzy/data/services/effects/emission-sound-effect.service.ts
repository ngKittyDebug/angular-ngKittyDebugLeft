import { inject, Injectable } from '@angular/core';

import type { ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import type { EffectContext } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';

/**
 * Plays a per-item cue whenever a Pokémon emits one under an aura: a festive blip for the easter-egg `laying`
 * aura, a fart for the poop `pooping` aura. Only emitted items carry `ownerId` (normal world spawns don't), so we
 * look the owner up in the store and choose the cue from its active effect — `pooping` wins, mirroring the server's
 * emitter priority. The owner's aura was granted by an earlier `effectGranted`, so it's already in state by the time
 * its emissions arrive.
 */
@Injectable()
export class EmissionSoundEffect implements FrenzyEffect {
  private readonly sound = inject(SoundPlayerService);

  public readonly messageTypes = ['spawned'] as const;

  public handle(message: ServerMessage, context: EffectContext): void {
    if (message.type !== 'spawned' || message.item.ownerId === undefined) {
      return;
    }

    const owner = context.playerById(message.item.ownerId);

    if (owner === undefined) {
      return;
    }

    if (owner.effects.some((effect) => effect.kind === 'pooping')) {
      this.sound.play('poopEmission');
    } else if (owner.effects.some((effect) => effect.kind === 'laying')) {
      this.sound.play('eggEmission');
    }
  }
}
