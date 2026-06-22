import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { ItemType, PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import type { EffectContext } from './effect-context';
import type { FrenzyEffect } from './frenzy-effect';

// The transient face the avatar shows in reaction to a thing happening to MY Pokémon, on top of the
// hp-derived mood. Each is keyed to a sprite under public/frenzy/mood/<face>.png.
export type ReactionFace = 'hurt' | 'dizzy' | 'bonk' | 'sick' | 'pumped';

// How long the reaction face overrides the hp-based mood before it clears.
const REACTION_TTL_MS = 3000;
// A bomb hit floats its exact damage; only a meaningful chunk warrants the hurt face, so a far-off graze
// (a couple of hp) doesn't flicker it.
const HURT_MIN_DAMAGE = 20;
// Effect kinds that read as a buff pickup — the egg/poop "effects" aren't buffs and shouldn't excite the face.
const PUMPED_EFFECTS: ReadonlySet<PlayerEffectKind> = new Set(['shield', 'wellFed']);
// Blunt blocks that bonk the Pokémon on the head (vs. poison food) — they get the knocked-out face, not queasy.
const BLUNT_ITEMS: ReadonlySet<ItemType> = new Set(['rock', 'brick']);

/**
 * Watches the server messages that land on the player's own Pokémon and briefly flashes a reaction face on the
 * status avatar: `hurt` (bomb blast), `dizzy` (collision), `sick` (rotten/poison eat), `pumped` (buff pickup).
 * Purely the avatar layer — the existing damage/buff floats still carry the detail; this adds the expression.
 */
@Injectable()
export class ReactiveMoodEffect implements FrenzyEffect {
  private readonly face = signal<ReactionFace | null>(null);
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  public readonly reactionFace = this.face.asReadonly();
  public readonly messageTypes = ['detonated', 'bumped', 'eaten', 'effectGranted'] as const;

  public constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelClear());
  }

  public handle(message: ServerMessage, context: EffectContext): void {
    const reaction = this.reactionFor(message, context);

    if (reaction !== null) {
      this.flash(reaction);
    }
  }

  private reactionFor(message: ServerMessage, context: EffectContext): ReactionFace | null {
    const myId = context.myId;

    if (myId === null) {
      return null;
    }

    if (message.type === 'detonated') {
      return message.hits.some((hit) => hit.playerId === myId && hit.delta <= -HURT_MIN_DAMAGE)
        ? 'hurt'
        : null;
    }

    if (message.type === 'bumped') {
      return message.playerId === myId ? 'dizzy' : null;
    }

    if (message.type === 'eaten') {
      if (message.playerId !== myId || message.delta >= 0) {
        return null;
      }

      // A rock/brick to the head reads as a blunt bonk; rotten/mushroom is poison — queasy.
      return BLUNT_ITEMS.has(message.itemType) ? 'bonk' : 'sick';
    }

    if (message.type === 'effectGranted') {
      return message.playerId === myId && PUMPED_EFFECTS.has(message.effect.kind) ? 'pumped' : null;
    }

    return null;
  }

  // Show the reaction at once and (re)arm the auto-clear; a fresh reaction interrupts the previous one rather
  // than stacking, so the latest thing that happened is what the face reads.
  private flash(reaction: ReactionFace): void {
    this.cancelClear();
    this.face.set(reaction);
    this.clearTimer = setTimeout(() => {
      this.face.set(null);
      this.clearTimer = null;
    }, REACTION_TTL_MS);
  }

  private cancelClear(): void {
    if (this.clearTimer !== null) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }
}
