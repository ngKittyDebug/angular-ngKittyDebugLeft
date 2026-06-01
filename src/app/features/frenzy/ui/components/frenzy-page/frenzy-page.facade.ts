import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { TUI_BREAKPOINT } from '@taiga-ui/core';

import { GAME } from '@game/frenzy/constants';

import type { FaintedStats } from '../../../data/models/fainted-stats';
import { FrenzyEffectsService } from '../../../data/services/frenzy-effects.service';
import { FrenzyStatsStore } from '../../../data/store/frenzy-stats.store';
import { FrenzyStore } from '../../../data/store/frenzy.store';
import type { PickerSubmission } from '../pokemon-picker/pokemon-picker.component';
import type { ItemClick } from '../scene/scene.component';

export type UiState = 'connecting' | 'roomFull' | 'picking' | 'playing' | 'fainted' | 'closed';

const COOLDOWN_TICK_MS = 250;

@Injectable()
export class FrenzyPageFacade {
  private readonly breakpoint = inject(TUI_BREAKPOINT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly effects = inject(FrenzyEffectsService);
  private readonly lastSubmission = signal<PickerSubmission | null>(null);
  private readonly nowMs = signal(Date.now());
  private readonly stats = inject(FrenzyStatsStore);
  private readonly store = inject(FrenzyStore);
  private readonly cooldownLeftMs = computed(() => {
    const faintedAt = this.store.myFaintedAt();

    if (faintedAt === null) {
      return 0;
    }

    return Math.max(0, GAME.cooldownAfterFaintedMs - (this.nowMs() - faintedAt));
  });

  public readonly cooldownSeconds = computed(() => Math.ceil(this.cooldownLeftMs() / 1000));
  public readonly disconnectedCount = this.store.disconnectedCount;
  public readonly evolvingPlayers = this.effects.evolvingPlayers;
  public readonly faintedStats = computed<FaintedStats>(() => ({
    eatenByType: this.stats.eatenByType(),
    lifespanSeconds: this.stats.lifespanSeconds(),
    maxMass: Math.round(this.stats.maxMass()),
    maxStage: this.stats.maxStage(),
    totalEaten: this.stats.totalEaten(),
  }));
  public readonly floatingMessages = this.effects.floatingMessages;
  public readonly isMobile = computed(() => this.breakpoint() === 'mobile');
  public readonly items = computed(() => this.store.state()?.items ?? []);
  public readonly leaderboard = this.store.leaderboard;
  public readonly me = this.store.me;
  public readonly myId = this.store.myId;
  public readonly players = computed(() => this.store.state()?.players ?? []);
  public readonly presenceCount = this.store.presenceCount;
  public readonly respawnReady = computed(() => this.cooldownLeftMs() === 0);
  public readonly uiState = computed<UiState>(() => {
    const status = this.store.connectionStatus();

    if (status === 'roomFull') {
      return 'roomFull';
    }

    if (status === 'closed') {
      return 'closed';
    }

    if (status !== 'open') {
      return 'connecting';
    }

    if (this.me() !== null) {
      return 'playing';
    }

    return this.store.myFaintedAt() !== null ? 'fainted' : 'picking';
  });

  public constructor() {
    const tickerId = setInterval(() => this.nowMs.set(Date.now()), COOLDOWN_TICK_MS);

    this.destroyRef.onDestroy(() => clearInterval(tickerId));
  }

  public chooseNew(): void {
    this.store.dismissFainted();
  }

  public click(event: ItemClick): void {
    this.effects.rememberEatPosition(event.itemId, event.x, event.y);
    this.store.click(event.itemId);
  }

  public connect(): void {
    this.store.connect();
  }

  public pokeSelf(): void {
    this.effects.pokeSelf();
  }

  public join(payload: PickerSubmission): void {
    this.lastSubmission.set(payload);
    this.stats.startSession();
    this.store.join(payload.name, payload.line);
  }

  public respawn(): void {
    const last = this.lastSubmission();

    if (last === null) {
      return;
    }

    this.join(last);
  }
}
