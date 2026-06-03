import { inject, Injectable } from '@angular/core';

import type { PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import { ShieldSoundService } from '../sound/shield-sound.service';
import { SoundSettingsService } from '../sound/sound-settings.service';
import { FrenzyStore } from '../../store/frenzy.store';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';

// Status-float phrase set to play per granted effect kind (keys live under `frenzy.scene.statusMessage`).
const STATUS_FOR_EFFECT: Record<PlayerEffectKind, 'shield'> = {
  shield: 'shield',
};

/** Turns each `effectGranted` event into a status quip over the taker and (for my own pickups) a sound cue. */
@Injectable()
export class PlayerEffectsTracker implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly shieldSound = inject(ShieldSoundService);
  private readonly soundSettings = inject(SoundSettingsService);
  private readonly store = inject(FrenzyStore);

  public handle(message: ServerMessage): void {
    if (message.type !== 'effectGranted') {
      return;
    }

    const isMine = message.playerId === this.store.myId();
    // My own pickup needs no name — it's obvious; others' floats carry the name like presence/eat quips.
    const who = isMine
      ? undefined
      : this.store.state()?.players.find((player) => player.id === message.playerId)?.name;

    this.floats.pushOwnedStatus(STATUS_FOR_EFFECT[message.effect.kind], message.playerId, who);

    if (isMine && this.soundSettings.enabled()) {
      this.shieldSound.play();
    }
  }
}
