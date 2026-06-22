import { inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import { isNPC, type ServerMessage } from '@game/frenzy/types';

import type { FloatingTone, OwnedFloat } from '../../models/floating-message';
import { type SoundKind } from '../sound/sound-config';
import { SoundPlayerService } from '../sound/sound-player.service';
import { type EffectContext, isMine } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId } from './transient-list';

type EatenMessage = Extract<ServerMessage, { type: 'eaten' }>;

const FLOATING_TEXT_TTL_MS = 2000;
const FLOATING_TEXT_PHRASE_COUNT = 5;

/** Turns each `eaten` event into a floating text over the eater and (for own eats) the matching sound. */
@Injectable()
export class EatEffect implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly sound = inject(SoundPlayerService);

  public readonly messageTypes = ['eaten'] as const;

  public handle(message: ServerMessage, context: EffectContext): void {
    if (message.type !== 'eaten') {
      return;
    }

    this.pushFloatingText(message, context);

    if (isMine(message.playerId, context)) {
      this.sound.play(this.eatenSoundFor(message));
    }
  }

  private pushFloatingText(message: EatenMessage, context: EffectContext): void {
    const player = context.playerById(message.playerId);
    const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
    const entry: OwnedFloat = {
      id: createTransientId(),
      ownerId: message.playerId,
      tone: this.toneForDelta(message.delta),
      textKey: `floatingText.${message.itemType}.${index}`,
      durationMs: FLOATING_TEXT_TTL_MS,
      // My own eats don't need a name (it's obvious it's me), and the NPC has no human-style label (its `name`
      // is the internal appearance id, e.g. "angryBomb") — names help only on other humans' floats.
      who:
        isMine(message.playerId, context) || (player !== undefined && isNPC(player))
          ? undefined
          : player?.name,
      delta: message.delta,
      priority: message.priority ?? FRENZY.floatPriority.eaten,
    };

    this.floats.pushOwned(entry);
  }

  private eatenSoundFor(message: EatenMessage): SoundKind {
    // A rock/brick always thunks — whether clicked (delta 0) or it bonked the Pokémon on collision (delta < 0).
    if (message.itemType === 'brick') {
      return 'brick';
    }

    if (message.itemType === 'rock') {
      return 'rock';
    }

    return message.delta < 0 ? 'badEat' : 'eat';
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
