import { effect, inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import type { OwnedFloat } from '../../models/floating-message';
import { FrenzyStore } from '../../store/frenzy.store';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId } from './transient-list';

// Number of phrases in the `frenzy.scene.intro` set; a join picks a random 2–3 of them.
const INTRO_PHRASE_COUNT = 9;
// How long each intro quip stays on screen before fading.
const INTRO_FLOAT_TTL_MS = 3500;

/**
 * On every spawn (each null → alive transition of the player's own Pokémon, incl. respawns), float a random
 * 2–3 funny intro quips over its head. Signal-driven (watches `me()`), so it is constructed for its `effect()`
 * rather than dispatched — like SelfMoodEffect. The quips queue and rise one after another (OwnerReleaseQueue).
 */
@Injectable()
export class IntroQuipsEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly store = inject(FrenzyStore);
  private wasAlive = false;

  public constructor() {
    effect(() => {
      const me = this.store.me();
      const alive = me !== null && me.hp > 0;

      if (me !== null && alive && !this.wasAlive) {
        this.cheerOn(me.id);
      }

      this.wasAlive = alive;
    });
  }

  private cheerOn(ownerId: string): void {
    const count = Math.random() < 0.5 ? 2 : 3;

    for (const index of this.pickPhrases(count)) {
      const quip: OwnedFloat = {
        id: createTransientId(),
        ownerId,
        tone: 'positive',
        textKey: `intro.${index}`,
        durationMs: INTRO_FLOAT_TTL_MS,
        // Above the spawn/mood quips so the intro line leads the column.
        priority: FRENZY.floatPriority.intro,
      };

      this.floats.pushOwned(quip);
    }
  }

  // `count` distinct phrase indices in [0, INTRO_PHRASE_COUNT) via a partial Fisher–Yates shuffle.
  private pickPhrases(count: number): readonly number[] {
    const pool = Array.from({ length: INTRO_PHRASE_COUNT }, (_, index) => index);

    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));

      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  }
}
