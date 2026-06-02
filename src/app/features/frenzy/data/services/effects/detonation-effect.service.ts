import { inject, Injectable } from '@angular/core';

import { GAME } from '@game/frenzy/constants';
import type { ServerMessage } from '@game/frenzy/types';

import type { Blast } from '../../models/blast';
import type { OwnedFloat } from '../../models/floating-message';
import { type SoundEffect } from '../../models/sound-effect';
import { ExplosionSoundService } from '../sound/explosion-sound.service';
import { SoundSettingsService } from '../sound/sound-settings.service';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId, TransientList } from './transient-list';

const FLOATING_TEXT_PHRASE_COUNT = 5;
// Shockwave ring lifetime — matches the scene's blast CSS animation.
const BLAST_TTL_MS = 700;
// Bomb damage floats linger a touch longer than eat floats so the "−25" hit reads amid the explosion.
const BOMB_FLOAT_TTL_MS = 1400;

/** A bomb exploded: boom for everyone, a shockwave ring at the blast point, and a "−25" float over each hit Pokémon. */
@Injectable()
export class DetonationEffect implements FrenzyEffect {
  private readonly explosionSound = inject(ExplosionSoundService);
  private readonly floats = inject(FloatingMessagesStore);
  private readonly soundSettings = inject(SoundSettingsService);
  private readonly list = new TransientList<Blast>();

  public readonly blasts = this.list.items;

  public handle(message: ServerMessage): void {
    if (message.type !== 'detonated') {
      return;
    }

    this.playSound(this.explosionSound);

    const blast: Blast = {
      id: createTransientId(),
      x: message.x,
      y: message.y,
      radius: message.radius,
    };

    this.list.add(blast, BLAST_TTL_MS);

    // A float per hit Pokémon, anchored to that player. The scene renders it only while the sprite is
    // still around, so a Pokémon the bomb finished off simply shows the "died" quip instead.
    for (const playerId of message.playerIds) {
      const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
      const entry: OwnedFloat = {
        id: createTransientId(),
        ownerId: playerId,
        tone: 'negative',
        textKey: `floatingText.bomb.${index}`,
        durationMs: BOMB_FLOAT_TTL_MS,
        icon: '@tui.bomb',
        delta: GAME.bomb.damage,
      };

      this.floats.pushOwned(entry);
    }
  }

  private playSound(source: SoundEffect): void {
    if (this.soundSettings.enabled()) {
      source.play();
    }
  }
}
