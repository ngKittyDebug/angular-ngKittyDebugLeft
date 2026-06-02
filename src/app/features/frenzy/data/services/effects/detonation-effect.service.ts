import { inject, Injectable } from '@angular/core';

import { GAME } from '@game/frenzy/constants';
import type { ServerMessage } from '@game/frenzy/types';

import type { Blast } from '../../models/blast';
import type { FloatingMessage } from '../../models/floating-message';
import { type SoundEffect } from '../../models/sound-effect';
import { ExplosionSoundService } from '../sound/explosion-sound.service';
import { SoundSettingsService } from '../sound/sound-settings.service';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { PresenceTracker } from './presence-tracker.service';
import { createTransientId, TransientList } from './transient-list';

const FLOATING_TEXT_PHRASE_COUNT = 5;
// Shockwave ring lifetime — matches the scene's blast CSS animation.
const BLAST_TTL_MS = 700;
// Bomb damage floats linger a touch longer than eat floats so the "−25" hit reads amid the explosion.
const BOMB_FLOAT_TTL_MS = 1400;
// Same top offset as status floats: anchor the damage text above each hit sprite's head.
const STATUS_SPRITE_TOP_OFFSET_PX = 60;

/** A bomb exploded: boom for everyone, a shockwave ring at the blast point, and a "−25" float over each hit Pokémon. */
@Injectable()
export class DetonationEffect implements FrenzyEffect {
  private readonly explosionSound = inject(ExplosionSoundService);
  private readonly floats = inject(FloatingMessagesStore);
  private readonly presence = inject(PresenceTracker);
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

    for (const playerId of message.playerIds) {
      const position = this.presence.positionOf(playerId);

      if (position === undefined) {
        continue;
      }

      const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
      const entry: FloatingMessage = {
        id: createTransientId(),
        x: position.x,
        y: position.y,
        tone: 'negative',
        textKey: `floatingText.bomb.${index}`,
        durationMs: BOMB_FLOAT_TTL_MS,
        icon: '@tui.bomb',
        delta: GAME.bomb.damage,
        topOffsetPx: STATUS_SPRITE_TOP_OFFSET_PX,
      };

      this.floats.push(entry);
    }
  }

  private playSound(source: SoundEffect): void {
    if (this.soundSettings.enabled()) {
      source.play();
    }
  }
}
