import { inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { ServerMessage } from '@game/frenzy/types';

import type { FloatingTone, OwnedFloat } from '../../models/floating-message';
import { type SoundEffect } from '../../models/sound-effect';
import { BadEatSoundService } from '../sound/bad-eat-sound.service';
import { EatSoundService } from '../sound/eat-sound.service';
import { RockSoundService } from '../sound/rock-sound.service';
import { FrenzyStore } from '../../store/frenzy.store';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId } from './transient-list';

type EatenMessage = Extract<ServerMessage, { type: 'eaten' }>;

const FLOATING_TEXT_TTL_MS = 2000;
const FLOATING_TEXT_PHRASE_COUNT = 5;

/** Turns each `eaten` event into a floating text over the eater and (for own eats) the matching sound. */
@Injectable()
export class EatEffect implements FrenzyEffect {
  private readonly badEatSound = inject(BadEatSoundService);
  private readonly eatSound = inject(EatSoundService);
  private readonly floats = inject(FloatingMessagesStore);
  private readonly rockSound = inject(RockSoundService);
  private readonly store = inject(FrenzyStore);

  public handle(message: ServerMessage): void {
    if (message.type !== 'eaten') {
      return;
    }

    this.pushFloatingText(message);

    if (this.isMine(message.playerId)) {
      this.eatenSoundFor(message).play();
    }
  }

  private pushFloatingText(message: EatenMessage): void {
    const player = this.store
      .state()
      ?.players.find((candidate) => candidate.id === message.playerId);
    const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
    const entry: OwnedFloat = {
      id: createTransientId(),
      ownerId: message.playerId,
      tone: this.toneForDelta(message.delta),
      textKey: `floatingText.${message.itemType}.${index}`,
      durationMs: FLOATING_TEXT_TTL_MS,
      // My own eats don't need a name — it's obvious it's me; names help only on others' floats.
      who: this.isMine(message.playerId) ? undefined : player?.name,
      delta: message.delta,
      priority: message.priority ?? FRENZY.floatPriority.eaten,
    };

    this.floats.pushOwned(entry);
  }

  private isMine(playerId: string): boolean {
    return playerId === this.store.myId();
  }

  private eatenSoundFor(message: EatenMessage): SoundEffect {
    // A rock always thunks — whether clicked (delta 0) or it bonked the Pokémon on collision (delta < 0).
    if (message.itemType === 'rock') {
      return this.rockSound;
    }

    return message.delta < 0 ? this.badEatSound : this.eatSound;
  }

  private toneForDelta(delta: number): FloatingTone {
    if (delta > 0) {
      return 'positive';
    }

    if (delta < 0) {
      return 'negative';
    }

    return 'neutral';
  }
}
