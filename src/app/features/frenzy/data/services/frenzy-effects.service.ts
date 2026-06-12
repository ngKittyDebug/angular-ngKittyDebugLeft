import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BumpEffect } from './effects/bump-effect.service';
import { DetonationEffect } from './effects/detonation-effect.service';
import { EatEffect } from './effects/eat-effect.service';
import { EmissionSoundEffect } from './effects/emission-sound-effect.service';
import { EvolutionEffect } from './effects/evolution-effect.service';
import type { FrenzyEffect } from './effects/frenzy-effect';
import { FloatingMessagesStore } from './effects/floating-messages.store';
import { HitBurstEffect } from './effects/hit-burst-effect.service';
import { PlayerEffectsTracker } from './effects/player-effects-tracker.service';
import { PresenceTracker } from './effects/presence-tracker.service';
import { SelfMoodEffect } from './effects/self-mood-effect.service';
import { ShieldBlockEffect } from './effects/shield-block-effect.service';
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
  private readonly bump = inject(BumpEffect);
  private readonly hitBurst = inject(HitBurstEffect);
  private readonly shieldBlock = inject(ShieldBlockEffect);
  private readonly presence = inject(PresenceTracker);
  private readonly playerEffects = inject(PlayerEffectsTracker);
  private readonly emissionSound = inject(EmissionSoundEffect);
  private readonly selfMood = inject(SelfMoodEffect);
  private readonly handlers: readonly FrenzyEffect[] = [
    this.eat,
    this.evolution,
    this.detonation,
    this.bump,
    this.hitBurst,
    this.shieldBlock,
    this.presence,
    this.playerEffects,
    this.emissionSound,
  ];

  public readonly ownedFloats = this.floats.ownedMessages;
  public readonly orphanFloats = this.floats.orphanMessages;
  public readonly blasts = this.detonation.blasts;
  public readonly hitBursts = this.hitBurst.hitBursts;
  public readonly ownedSparks = this.hitBurst.ownedSparks;
  public readonly ownedShieldBlocks = this.shieldBlock.ownedShieldBlocks;
  public readonly evolvingPlayers = this.evolution.evolvingPlayers;

  public constructor() {
    this.socket.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      for (const handler of this.handlers) {
        handler.handle(message);
      }
    });
  }

  public pokeSelf(): void {
    this.selfMood.pokeSelf();
  }
}
