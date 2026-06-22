import { inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { ServerMessage } from '@game/frenzy/types';

import type { Blast } from '../../models/blast';
import type { OwnedFloat } from '../../models/floating-message';
import { SoundPlayerService } from '../sound/sound-player.service';
import type { FrenzyEffect } from './frenzy-effect';
import { FloatingMessagesStore } from './floating-messages.store';
import { createTransientId, TransientList } from './transient-list';

const FLOATING_TEXT_PHRASE_COUNT = 5;
// Blast lifetime — must outlast the longest scene blast layer (the smoke puff, ~1000ms) so no layer is cut.
const BLAST_TTL_MS = 1000;
// Bomb damage floats linger a touch longer than eat floats so the "−25" hit reads amid the explosion.
const BOMB_FLOAT_TTL_MS = 1400;
// Cap simultaneous on-screen blasts (each is ~7 animated spans). A multi-bomb cascade detonating in one tick
// would otherwise stack 7×N layers; drop-oldest keeps the paint/composite cost bounded (~21 spans worst case).
const MAX_BLASTS = 3;

/** A bomb exploded: boom for everyone, a shockwave ring at the blast point, and a "−25" float over each hit Pokémon. */
@Injectable()
export class DetonationEffect implements FrenzyEffect {
  private readonly floats = inject(FloatingMessagesStore);
  private readonly sound = inject(SoundPlayerService);
  private readonly list = new TransientList<Blast>();

  public readonly blasts = this.list.items;
  public readonly messageTypes = ['detonated'] as const;

  public handle(message: ServerMessage): void {
    if (message.type !== 'detonated') {
      return;
    }

    this.sound.play('explosion');

    const blast: Blast = {
      id: createTransientId(),
      x: message.x,
      y: message.y,
      radius: message.radius,
    };

    this.list.add(blast, BLAST_TTL_MS, MAX_BLASTS);

    // A float per hit Pokémon, anchored to that player. The scene renders it only while the sprite is
    // still around, so a Pokémon the bomb finished off simply shows the "died" quip instead.
    for (const hit of message.hits) {
      const index = Math.floor(Math.random() * FLOATING_TEXT_PHRASE_COUNT);
      const entry: OwnedFloat = {
        id: createTransientId(),
        ownerId: hit.playerId,
        tone: 'negative',
        textKey: `floatingText.bomb.${index}`,
        durationMs: BOMB_FLOAT_TTL_MS,
        icon: '@tui.bomb',
        // The real distance-scaled hp this victim lost (negative) — the event now carries a per-victim number,
        // so the quip + bomb icon read the hit AND the exact damage shows, no longer a fixed guess.
        delta: hit.delta,
        priority: message.priority ?? FRENZY.floatPriority.detonated,
      };

      this.floats.pushOwned(entry);
    }
  }
}
