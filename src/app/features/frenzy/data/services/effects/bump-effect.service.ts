import { inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { ServerMessage } from '@game/frenzy/types';

import type { OwnedFloat } from '../../models/floating-message';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId } from './transient-list';

const BUMP_PHRASE_COUNT = 5;
// Bump floats linger like bomb floats — long enough to read the quip amid a scrum of jostling Pokémon.
const BUMP_FLOAT_TTL_MS = 1400;

/** Two Pokémon collided hard: a quip floats over the one that took the hit (a fatal hit shows the "died" quip instead). */
@Injectable()
export class BumpEffect implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);

  public handle(message: ServerMessage): void {
    if (message.type !== 'bumped') {
      return;
    }

    const index = Math.floor(Math.random() * BUMP_PHRASE_COUNT);
    const entry: OwnedFloat = {
      id: createTransientId(),
      ownerId: message.playerId,
      tone: 'negative',
      textKey: `floatingText.bump.${index}`,
      durationMs: BUMP_FLOAT_TTL_MS,
      icon: '@tui.zap',
      // No number: the bump amount isn't carried (it reconciles via the snapshot, like a bomb hit) — the quip reads it.
      priority: message.priority ?? FRENZY.floatPriority.bumped,
    };

    this.floats.pushOwned(entry);
  }
}
