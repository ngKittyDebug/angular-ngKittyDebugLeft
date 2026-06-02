import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DetonationEffect } from './effects/detonation-effect.service';
import { EatEffect } from './effects/eat-effect.service';
import { EvolutionEffect } from './effects/evolution-effect.service';
import type { FrenzyEffect } from './effects/frenzy-effect';
import { FloatingMessagesStore } from './effects/floating-messages.store';
import { PresenceTracker } from './effects/presence-tracker.service';
import { SelfMoodEffect } from './effects/self-mood-effect.service';
import { FrenzySocketService } from './frenzy-socket.service';

/**
 * Thin orchestrator over the frenzy effect family: fans each server message out to the message-driven
 * effects and re-exposes the transient scene signals the page facade reads. The signal-driven
 * `SelfMoodEffect` is injected only to construct it (its `effect()` runs on its own).
 */
@Injectable()
export class FrenzyEffectsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly socket = inject(FrenzySocketService);
  private readonly floats = inject(FloatingMessagesStore);
  private readonly eat = inject(EatEffect);
  private readonly evolution = inject(EvolutionEffect);
  private readonly detonation = inject(DetonationEffect);
  private readonly presence = inject(PresenceTracker);
  private readonly selfMood = inject(SelfMoodEffect);
  private readonly handlers: readonly FrenzyEffect[] = [
    this.eat,
    this.evolution,
    this.detonation,
    this.presence,
  ];

  public readonly floatingMessages = this.floats.messages;
  public readonly blasts = this.detonation.blasts;
  public readonly evolvingPlayers = this.evolution.evolvingPlayers;

  public constructor() {
    this.socket.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      for (const handler of this.handlers) {
        handler.handle(message);
      }
    });
  }

  // Called on click with the item's on-screen position; the matching `eaten` anchors its float here.
  public rememberEatPosition(itemId: string, x: number, y: number): void {
    this.eat.rememberEatPosition(itemId, x, y);
  }

  public pokeSelf(): void {
    this.selfMood.pokeSelf();
  }
}
