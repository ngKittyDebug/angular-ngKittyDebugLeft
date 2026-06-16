import { inject, Injectable } from '@angular/core';

import type { PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import type { SoundEffect } from '../../models/sound-effect';
import { EasterEggSoundService } from '../sound/easter-egg-sound.service';
import { PoopEatSoundService } from '../sound/poop-eat-sound.service';
import { ShieldSoundService } from '../sound/shield-sound.service';
import { WellFedSoundService } from '../sound/well-fed-sound.service';
import { FrenzyStore } from '../../store/frenzy.store';
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
  private readonly store = inject(FrenzyStore);
  // Sound cue per effect kind played only when the effect lands on my own Pokémon (buff pickup or being frozen).
  private readonly soundForEffect: Record<PlayerEffectKind, SoundEffect> = {
    shield: inject(ShieldSoundService),
    wellFed: inject(WellFedSoundService),
    laying: inject(EasterEggSoundService),
    pooping: inject(PoopEatSoundService),
    // Cactus reuses the shield buff-pickup cue (both are defensive wards; no bespoke sound for the MVP).
    cactus: inject(ShieldSoundService),
  };

  public handle(message: ServerMessage): void {
    if (message.type !== 'effectGranted') {
      return;
    }

    const isMine = message.playerId === this.store.myId();
    // My own effect needs no name — it's obvious; others' floats carry the name like presence/eat quips.
    const who = isMine
      ? undefined
      : this.store.state()?.players.find((player) => player.id === message.playerId)?.name;

    this.floats.pushOwnedStatus(STATUS_FOR_EFFECT[message.effect.kind], message.playerId, who);

    if (isMine) {
      this.soundForEffect[message.effect.kind].play();
    }
  }
}
