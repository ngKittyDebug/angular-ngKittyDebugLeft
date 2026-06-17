import { effect, inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { isSad } from '../../logic/is-sad';
import { FrenzyStore } from '../../store/frenzy.store';
import { FloatingMessagesStore } from './floating-messages.store';

/**
 * Watches the player's own Pokémon and floats mood quips on transitions: sad ↔ happy and a sticky
 * "dying" warning while hp is critically low. Plus `pokeSelf` — a click-to-quip easter egg.
 * Signal-driven (not message-driven), so it is constructed for its `effect()` rather than dispatched.
 */
@Injectable()
export class SelfMoodEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly store = inject(FrenzyStore);
  private wasSad = false;
  private wasDying = false;
  private moodMessageId: string | null = null;
  private dyingMessageId: string | null = null;
  private pokeMessageId: string | null = null;

  public constructor() {
    effect(() => {
      const me = this.store.me();
      const alive = me !== null && me.hp > 0;
      const dyingNow = alive && me.hp <= FRENZY.lowHpWarningThreshold;
      const sadNow = alive && !dyingNow && isSad(me.hp, me.stage);

      if (me !== null && sadNow && !this.wasSad) {
        this.replaceMood('sad', me.id);
      }

      if (me !== null && alive && !dyingNow && !sadNow && this.wasSad) {
        this.replaceMood('happy', me.id);
      }

      if (me !== null && dyingNow && !this.wasDying) {
        this.dyingMessageId = this.floats.pushOwnedStatus('dying', me.id);
      } else if (!dyingNow && this.wasDying && this.dyingMessageId !== null) {
        this.floats.remove(this.dyingMessageId);
        this.dyingMessageId = null;
      }

      this.wasSad = sadNow;
      this.wasDying = dyingNow;
    });
  }

  // Client-only easter egg: clicking your own Pokémon makes it quip (Warcraft peasant style).
  // Each click replaces the previous quip so rapid clicks interrupt rather than pile up.
  public pokeSelf(): void {
    const me = this.store.me();

    if (me === null) {
      return;
    }

    if (this.pokeMessageId !== null) {
      this.floats.remove(this.pokeMessageId);
    }

    this.pokeMessageId = this.floats.pushOwnedStatus('poke', me.id);
  }

  // Sad and happy are mutually exclusive moods — the new one replaces the previous so it surfaces at once
  // instead of chasing it up the staggered column.
  private replaceMood(kind: 'sad' | 'happy', ownerId: string): void {
    if (this.moodMessageId !== null) {
      this.floats.remove(this.moodMessageId);
    }

    this.moodMessageId = this.floats.pushOwnedStatus(kind, ownerId);
  }
}
