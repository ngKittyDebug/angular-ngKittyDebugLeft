import { inject, Injectable } from '@angular/core';

import type { ServerMessage } from '@game/frenzy/types';

import type { FloatingMessage, FloatingTone } from '../../models/floating-message';
import { type SoundEffect } from '../../models/sound-effect';
import { BadEatSoundService } from '../sound/bad-eat-sound.service';
import { EatSoundService } from '../sound/eat-sound.service';
import { RockSoundService } from '../sound/rock-sound.service';
import { SoundSettingsService } from '../sound/sound-settings.service';
import { FrenzyStore } from '../../store/frenzy.store';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId } from './transient-list';

type EatenMessage = Extract<ServerMessage, { type: 'eaten' }>;

const FLOATING_TEXT_TTL_MS = 1000;
const FLOATING_TEXT_PHRASE_COUNT = 5;
// Eat floats start above the clicked item, not over it: must exceed the item button's full height
// (60px sprite + 12px padding ≈ 84px) plus a gap, since the float is then centred on this `top`.
const EAT_FLOAT_TOP_OFFSET_PX = 90;
// Safety TTL for a remembered click position if no `eaten` ever arrives (rate-limited, lost race).
const EAT_POSITION_TTL_MS = 2000;

/** Turns each `eaten` event into a floating text over the item and (for own eats) the matching sound. */
@Injectable()
export class EatEffect implements FrenzyEffect {
  private readonly badEatSound = inject(BadEatSoundService);
  private readonly eatSound = inject(EatSoundService);
  private readonly floats = inject(FloatingMessagesStore);
  private readonly rockSound = inject(RockSoundService);
  private readonly soundSettings = inject(SoundSettingsService);
  private readonly store = inject(FrenzyStore);
  // Item on-screen position captured at click time, keyed by itemId, consumed by the matching `eaten`.
  private readonly eatPositions = new Map<string, { x: number; y: number }>();

  public handle(message: ServerMessage): void {
    if (message.type !== 'eaten') {
      return;
    }

    this.pushFloatingText(message);

    if (this.isMine(message.playerId)) {
      this.playSound(this.eatenSoundFor(message));
    }
  }

  // Called on click with the item's on-screen position; the matching `eaten` anchors its float here.
  public rememberEatPosition(itemId: string, x: number, y: number): void {
    this.eatPositions.set(itemId, { x, y });
    setTimeout(() => this.eatPositions.delete(itemId), EAT_POSITION_TTL_MS);
  }

  private pushFloatingText(message: EatenMessage): void {
    const player = this.store
      .state()
      ?.players.find((candidate) => candidate.id === message.playerId);
    const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
    // Prefer the item's on-screen position captured at click time — it matches what the player saw
    // under the cursor (the server event coords lag the client's smoothed render and, with resting
    // items, jump to the floor). Fall back to the event coords for eats this client didn't initiate.
    const clickPosition = this.eatPositions.get(message.itemId);

    this.eatPositions.delete(message.itemId);

    const entry: FloatingMessage = {
      id: createTransientId(),
      x: clickPosition?.x ?? message.x,
      y: clickPosition?.y ?? message.y,
      topOffsetPx: EAT_FLOAT_TOP_OFFSET_PX,
      tone: this.toneForDelta(message.delta),
      textKey: `floatingText.${message.itemType}.${index}`,
      durationMs: FLOATING_TEXT_TTL_MS,
      // My own eats don't need a name — it's obvious it's me; names help only on others' floats.
      who: this.isMine(message.playerId) ? undefined : player?.name,
      delta: message.delta,
    };

    this.floats.push(entry);
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

  private playSound(source: SoundEffect): void {
    if (this.soundSettings.enabled()) {
      source.play();
    }
  }
}
