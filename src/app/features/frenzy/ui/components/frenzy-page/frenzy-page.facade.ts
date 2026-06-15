import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { TUI_BREAKPOINT } from '@taiga-ui/core';

import { FRENZY } from '@game/frenzy/config';

import type { FaintedStats } from '../../../data/models/fainted-stats';
import { FrenzyEffectsService } from '../../../data/services/frenzy-effects.service';
import { PlayerPersistenceService } from '../../../data/services/player-persistence.service';
import { FrenzyStatsStore } from '../../../data/store/frenzy-stats.store';
import { FrenzyStore } from '../../../data/store/frenzy.store';
import { bodyForAppearance, knownLine } from '../../constants/pokemon-registry';
import { DeathEpitaphService } from '../../services/death-epitaph.service';
import type { Epitaph } from '../../services/death-epitaph.service';
import type { PickerSubmission } from '../pokemon-picker/pokemon-picker.component';
import type { ItemClick } from '../scene/scene-view-models';

export type UiState = 'connecting' | 'roomFull' | 'picking' | 'playing' | 'fainted' | 'closed';

const COOLDOWN_TICK_MS = 250;

@Injectable()
export class FrenzyPageFacade {
  private readonly breakpoint = inject(TUI_BREAKPOINT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly effects = inject(FrenzyEffectsService);
  private readonly epitaphs = inject(DeathEpitaphService);
  private readonly lastSubmission = signal<PickerSubmission | null>(null);
  private readonly nowMs = signal(Date.now());
  private readonly persistence = inject(PlayerPersistenceService);
  private readonly stats = inject(FrenzyStatsStore);
  private readonly store = inject(FrenzyStore);
  private readonly cooldownLeftMs = computed(() => {
    const faintedAt = this.store.myFaintedAt();

    if (faintedAt === null) {
      return 0;
    }

    return Math.max(0, FRENZY.cooldownAfterFaintedMs - (this.nowMs() - faintedAt));
  });

  public readonly blasts = this.effects.blasts;
  public readonly cooldownSeconds = computed(() => Math.ceil(this.cooldownLeftMs() / 1000));
  public readonly disconnectedCount = this.store.disconnectedCount;
  public readonly evolvingPlayers = this.effects.evolvingPlayers;
  public readonly hitBursts = this.effects.hitBursts;
  public readonly ownedSparks = this.effects.ownedSparks;
  public readonly ownedShieldBlocks = this.effects.ownedShieldBlocks;
  public readonly faintedStats = computed<FaintedStats>(() => ({
    eatenByType: this.stats.eatenByType(),
    lifespanSeconds: this.stats.lifespanSeconds(),
    maxHp: Math.round(this.stats.maxHp()),
    maxStage: this.stats.maxStage(),
    totalEaten: this.stats.totalEaten(),
  }));
  // Rolled once per death: the computed only re-runs when the captured cause/killer change (at the next faint),
  // so the obituary phrase stays fixed while the modal re-renders on the respawn-cooldown ticker.
  public readonly faintedEpitaph = computed<Epitaph>(() => {
    const cause = this.store.myFaintCause();
    // Self-destruct: the lethal blow carries my own id (shoved my own mine into myself). The killer name would
    // resolve to my own, so flag it and let the epitaph swap the gloat line for a self-own one.
    const selfDestruct =
      cause !== null && 'killerId' in cause && cause.killerId === this.store.myId();

    return this.epitaphs.compose(cause, this.store.myKillerName(), selfDestruct);
  });
  public readonly orphanFloats = this.effects.orphanFloats;
  public readonly ownedFloats = this.effects.ownedFloats;
  // The transient reaction face for my own Pokémon (bomb/collision/poison/buff), overlaid on the status avatar.
  public readonly reactionFace = this.effects.reactionFace;
  public readonly joinError = this.store.joinError;
  public readonly isMobile = computed(() => this.breakpoint() === 'mobile');
  public readonly items = computed(() => this.store.state()?.items ?? []);
  public readonly leaderboard = this.store.leaderboard;
  // The single current leader (top of the sorted leaderboard), or null when nobody's in — feeds the minimap header.
  public readonly leader = computed(() => {
    const entries = this.leaderboard();

    return entries.length > 0 ? entries[0] : null;
  });
  public readonly me = this.store.me;
  // My Pokémon's currently-active timed effects, pruned by `expiresAt` on the cooldown ticker (and on snapshot
  // change), feeding the status-card buff strip. Empty when I'm not in play.
  public readonly activeEffects = computed(() =>
    (this.me()?.effects ?? []).filter((effect) => effect.expiresAt > this.nowMs()),
  );
  public readonly myId = this.store.myId;
  // The crowned player id (alive hp-leader, shared selector) — gates the leaderboard pill's crown so it never
  // disagrees with the scene marker.
  public readonly crownId = this.store.crownId;
  public readonly players = computed(() => this.store.state()?.players ?? []);
  public readonly presenceCount = this.store.presenceCount;
  public readonly respawnReady = computed(() => this.cooldownLeftMs() === 0);
  // A self-healing inbound stall (see FrenzySocketService): shown as a non-blocking banner over the live scene
  // rather than tearing down to the disconnected modal, since it recovers in well under a second.
  public readonly isReconnecting = computed(() => this.store.connectionStatus() === 'reconnecting');
  public readonly uiState = computed<UiState>(() => {
    const status = this.store.connectionStatus();

    if (status === 'roomFull') {
      return 'roomFull';
    }

    if (status === 'closed') {
      return 'closed';
    }

    // `reconnecting` keeps the in-game UI (scene + the reconnecting banner); only a genuine pre-connect counts
    // as `connecting`.
    if (status === 'connecting') {
      return 'connecting';
    }

    if (this.me() !== null) {
      return 'playing';
    }

    return this.store.myFaintedAt() === null ? 'picking' : 'fainted';
  });

  public constructor() {
    const tickerId = setInterval(() => this.nowMs.set(Date.now()), COOLDOWN_TICK_MS);

    this.destroyRef.onDestroy(() => clearInterval(tickerId));
  }

  public chooseNew(): void {
    this.store.dismissFainted();
  }

  public click(event: ItemClick): void {
    this.store.click(event.itemId, event.nudgeX, event.nudgeY);
  }

  public connect(): void {
    this.store.connect();
  }

  public pokeSelf(): void {
    this.effects.pokeSelf();
  }

  // Poking the angry-bomb NPC: tell the server (accrues anger) and fire the optimistic local quip over it.
  public pokeNpc(npcId: string): void {
    this.store.pokeNpc(npcId);
    this.effects.pokeNpc(npcId);
  }

  public steer(point: { x: number; y: number }): void {
    this.store.steer(point.x, point.y);
  }

  public join(payload: PickerSubmission): void {
    this.lastSubmission.set(payload);
    this.stats.startSession();
    this.store.join(payload.name, payload.line, bodyForAppearance(payload.line));
  }

  public respawn(): void {
    // Prefer this session's picker submission, but fall back to the persisted identity (name + appearance are
    // saved on every join and survive a reload). Without this, reaching the fainted modal without having used
    // the picker THIS session — e.g. a page reload while alive, where the player is restored from the server's
    // grace window — left `lastSubmission` null and the button silently did nothing.
    const submission = this.lastSubmission() ?? this.persistedSubmission();

    if (submission === null) {
      // No identity to rejoin with at all (truly fresh load straight into a fainted state) — open the picker
      // instead of leaving the button dead.
      this.chooseNew();

      return;
    }

    this.join(submission);
  }

  private persistedSubmission(): PickerSubmission | null {
    const name = this.persistence.getName().trim();
    const line = knownLine(this.persistence.getAppearance());

    return name.length > 0 && line !== null ? { name, line } : null;
  }
}
