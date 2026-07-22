import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Player } from '@game/frenzy/types';

import type { EffectContext } from './effects/effect-context';
import { EffectRouter } from './effects/effect-router';
import { BumpEffect } from './effects/bump-effect.service';
import { DetonationEffect } from './effects/detonation-effect.service';
import { EatEffect } from './effects/eat-effect.service';
import { EmissionSoundEffect } from './effects/emission-sound-effect.service';
import { EvolutionEffect } from './effects/evolution-effect.service';
import type { FrenzyEffect } from './effects/frenzy-effect';
import { FloatingMessagesStore } from './effects/floating-messages.store';
import { HitBurstEffect } from './effects/hit-burst-effect.service';
import { IntroQuipsEffect } from './effects/intro-quips-effect.service';
import { NpcQuipEffect } from './effects/npc-quip-effect.service';
import { PlayerEffectsTracker } from './effects/player-effects-tracker.service';
import { PresenceTracker } from './effects/presence-tracker.service';
import { ReactiveMoodEffect } from './effects/reactive-mood-effect.service';
import { SelfMoodEffect } from './effects/self-mood-effect.service';
import { ShieldBlockEffect } from './effects/shield-block-effect.service';
import { FrenzyStore } from '../store/frenzy.store';
import { FrenzySocketService } from './frenzy-socket.service';

/**
 * Thin orchestrator over the frenzy effect family: routes each server message through the `EffectRouter`
 * (an explicit `message type → handlers` registry with isolated dispatch) and re-exposes the transient scene
 * signals the page facade reads. The signal-driven `SelfMoodEffect`/`IntroQuipsEffect` are injected only to
 * construct them (their `effect()` runs on its own); they are not part of the message routing.
 */
@Injectable()
export class FrenzyEffectsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly socket = inject(FrenzySocketService);
  private readonly store = inject(FrenzyStore);
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
  private readonly reactiveMood = inject(ReactiveMoodEffect);
  private readonly npcQuip = inject(NpcQuipEffect);
  // Injected only to construct it — its `effect()` floats the random intro quips on each spawn on its own.
  private readonly introQuips = inject(IntroQuipsEffect);
  // The ordered handler list is the registration surface: one entry per message-driven effect, position fixes
  // dispatch order (the same order the manual fan-out used to run in). The router derives the per-type buckets.
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
    this.reactiveMood,
  ];
  private readonly router = new EffectRouter(this.handlers);

  public readonly ownedFloatList = this.floats.ownedMessageList;
  public readonly reactionFace = this.reactiveMood.reactionFace;
  public readonly orphanFloatList = this.floats.orphanMessageList;
  public readonly blastList = this.detonation.blastList;
  public readonly hitBurstList = this.hitBurst.hitBurstList;
  public readonly ownedSparkList = this.hitBurst.ownedSparkList;
  public readonly ownedShieldBlockList = this.shieldBlock.ownedShieldBlockList;
  public readonly evolvingPlayers = this.evolution.evolvingPlayers;

  public constructor() {
    this.socket.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      this.router.dispatch(message, this.buildContext());
    });
  }

  public pokeSelf(): void {
    this.selfMood.pokeSelf();
  }

  public pokeNpc(npcId: string): void {
    this.npcQuip.pokeNpc(npcId);
  }

  // Snapshot of the store handed to handlers so they read state through one read-only seam instead of injecting
  // `FrenzyStore` themselves — keeps each handler a pure `message + context → floats/sounds` adapter.
  private buildContext(): EffectContext {
    const players: readonly Player[] = this.store.state()?.players ?? [];

    return {
      myId: this.store.myId(),
      players,
      playerById: (id) => players.find((player) => player.id === id),
    };
  }
}
