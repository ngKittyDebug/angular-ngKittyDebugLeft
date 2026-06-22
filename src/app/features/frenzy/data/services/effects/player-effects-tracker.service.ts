import { inject, Injectable } from '@angular/core';

import type { PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import { type SoundKind } from '../sound/sound-config';
import { SoundPlayerService } from '../sound/sound-player.service';
import { type EffectContext, isMine } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';

// Status-float phrase set to play per granted effect kind (keys live under `frenzy.scene.statusMessage`).
const STATUS_FOR_EFFECT: Record<
  PlayerEffectKind,
  'shield' | 'wellFed' | 'laying' | 'pooping' | 'cactus'
> = {
  shield: 'shield',
  wellFed: 'wellFed',
  laying: 'laying',
  pooping: 'pooping',
  cactus: 'cactus',
};

/** Turns each `effectGranted` event into a status quip over the taker and (for effects landing on me) a sound cue. */
@Injectable()
export class PlayerEffectsTracker implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly sound = inject(SoundPlayerService);
  // Sound cue per effect kind played only when the effect lands on my own Pokémon (buff pickup or being frozen).
  private readonly soundForEffect: Record<PlayerEffectKind, SoundKind> = {
    shield: 'shield',
    wellFed: 'wellFed',
    laying: 'easterEgg',
    pooping: 'poopEat',
    // Cactus reuses the shield buff-pickup cue (both are defensive wards; no bespoke sound for the MVP).
    cactus: 'shield',
  };

  public readonly messageTypes = ['effectGranted'] as const;

  public handle(message: ServerMessage, context: EffectContext): void {
    if (message.type !== 'effectGranted') {
      return;
    }

    const mine = isMine(message.playerId, context);
    // My own effect needs no name — it's obvious; others' floats carry the name like presence/eat quips.
    const who = mine ? undefined : context.playerById(message.playerId)?.name;

    this.floats.pushOwnedStatus(STATUS_FOR_EFFECT[message.effect.kind], message.playerId, who);

    if (mine) {
      this.sound.play(this.soundForEffect[message.effect.kind]);
    }
  }
}
