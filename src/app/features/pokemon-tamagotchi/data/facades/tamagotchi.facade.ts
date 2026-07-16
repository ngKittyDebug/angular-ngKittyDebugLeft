import { computed, DestroyRef, effect, inject, Service, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { isTamagotchiSelectionError } from '../constants/selection-errors.constants';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import {
  DISPLAYED_STATUS_TYPE_LIST,
  maxValueForStatusType,
  statusValueForType,
} from '../helpers/status-indicator-sync.helper';
import { calculateSleepRestorationBonus } from '../helpers/sleep-restoration.helper';
import { rollTrainingExperienceGain } from '../helpers/training-reward.helper';
import { EvolutionService } from '../services/evolution.service';
import { PerformanceService } from '../services/performance.service';
import { TamagotchiInitService } from '../services/tamagotchi-init.service';
import { TamagotchiNotificationService } from '../services/tamagotchi-notification.service';
import { type TamagotchiActionContext, TamagotchiService } from '../services/tamagotchi.service';
import {
  type TamagotchiTimerContext,
  TimerService,
  type TimerTickResult,
} from '../services/timer.service';
import { TamagotchiStore } from '../store/tamagotchi.store';
import type { InteractionEventModel } from '../models/interaction.model';
import type { PerformanceMode } from '../models/performance-mode.model';
import type { PokemonModel } from '../models/pokemon.model';
import type { StatusType } from '../models/pokemon-status.model';
import type { ActionCooldownsModel, ActionType } from '../models/tamagotchi-state.model';

const COOLDOWN_ACTIONS: ActionType[] = ['feed', 'water', 'care', 'play', 'train', 'sleep'];
const COOLDOWN_REFRESH_INTERVAL_MS = 1_000;

@Service({ autoProvided: false })
export class TamagotchiFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly evolutionService = inject(EvolutionService);
  private readonly initService = inject(TamagotchiInitService);
  private readonly notificationService = inject(TamagotchiNotificationService);
  private readonly performanceService = inject(PerformanceService);
  private readonly store = inject(TamagotchiStore);
  private readonly tamagotchiService = inject(TamagotchiService);
  private readonly timerService = inject(TimerService);
  private readonly isInitialized = computed(() => this.store.initialized());
  private readonly now = signal(Date.now());
  private readonly pendingEvolvedPokemon = signal<PokemonModel | null>(null);
  private readonly evolutionPrepareInFlight = signal(false);
  private readonly actionContext = computed(() => this.buildActionContext(this.now()));

  public readonly displayedStatusTypeList = DISPLAYED_STATUS_TYPE_LIST;

  public readonly trainingStartedAt = this.store.trainingStartedAt;
  public readonly isTraining = this.store.isTraining;
  public readonly canEvolve = this.store.canEvolve;
  public readonly error = this.store.error;
  public readonly hasPokemon = this.store.hasPokemon;
  public readonly isEvolving = this.store.isEvolving;
  public readonly isSleeping = this.store.isSleeping;
  public readonly notificationList = this.store.notificationList;
  public readonly pokemon = this.store.pokemon;
  public readonly status = this.store.status;

  public readonly evolvedPokemon = this.pendingEvolvedPokemon.asReadonly();

  public readonly isLoading = computed(() => !this.isInitialized());

  public readonly selectionBlocked = computed(
    () => !this.hasPokemon() && isTamagotchiSelectionError(this.error()),
  );

  public readonly systemErrorMessageKey = computed(() => {
    const currentError = this.error();

    if (currentError === null || isTamagotchiSelectionError(currentError)) {
      return null;
    }

    if (currentError === TAMAGOTCHI_SYSTEM_ERRORS.LOAD_FAILED) {
      return 'stateLoadFailedError';
    }

    if (currentError === TAMAGOTCHI_SYSTEM_ERRORS.SAVE_FAILED) {
      return 'saveFailedError';
    }

    if (currentError === TAMAGOTCHI_SYSTEM_ERRORS.EVOLUTION_PREPARE_FAILED) {
      return 'evolutionPrepareFailedError';
    }

    if (currentError === TAMAGOTCHI_SYSTEM_ERRORS.RECOVERED_FROM_BACKUP) {
      return 'stateRecoveredWarning';
    }

    return null;
  });

  public readonly cooldowns = computed(() => {
    return this.tamagotchiService.getActionCooldowns(this.actionContext());
  });

  public readonly canCare = computed(() => this.isActionAllowed('care'));
  public readonly canFeed = computed(() => this.isActionAllowed('feed'));
  public readonly canPlay = computed(() => this.isActionAllowed('play'));
  public readonly canTrain = computed(() => this.isActionAllowed('train'));
  public readonly canWater = computed(() => this.isActionAllowed('water'));

  public readonly showRecoveryActions = computed(
    () => this.error() === TAMAGOTCHI_SYSTEM_ERRORS.SAVE_FAILED,
  );

  public readonly performanceMode = this.performanceService.mode;
  public readonly performanceModeList: PerformanceMode[] = ['high', 'balanced', 'low'];
  public readonly performanceModeIndex = computed(() =>
    this.performanceModeList.indexOf(this.performanceMode()),
  );

  public constructor() {
    effect((onCleanup) => {
      if (!this.isInitialized() || !this.hasPokemon()) {
        return;
      }

      const profile = this.performanceService.profile();
      const handle = this.timerService.startTimer(
        () => this.buildTimerContext(),
        (result) => this.handleTimerTick(result),
        {
          intervalMs: profile.decayIntervalMs,
          pauseWhenHidden: true,
        },
      );

      onCleanup(() => {
        this.timerService.stopTimer(handle);
      });
    });

    effect((onCleanup) => {
      const ready = this.canEvolve();
      const species = this.pokemon();
      const readyNotifiedAt = untracked(() => this.store.evolutionProgress().readyNotifiedAt);
      const prepareInFlight = untracked(() => this.evolutionPrepareInFlight());

      if (!ready || readyNotifiedAt !== null || !species || prepareInFlight) {
        return;
      }

      const subscription = untracked(() => {
        this.evolutionPrepareInFlight.set(true);
        this.notificationService.notifyEvolutionReady(species.name);
        this.store.markEvolutionReadyNotified(Date.now());

        return this.evolutionService.prepareEvolution(species).subscribe((result) => {
          this.evolutionPrepareInFlight.set(false);

          if (!result) {
            this.pendingEvolvedPokemon.set(null);
            this.store.setError(TAMAGOTCHI_SYSTEM_ERRORS.EVOLUTION_PREPARE_FAILED);

            return;
          }

          this.store.startEvolution();
          this.pendingEvolvedPokemon.set(result.evolvedPokemon);
        });
      });

      onCleanup(() => {
        subscription.unsubscribe();
        this.evolutionPrepareInFlight.set(false);
      });
    });

    effect((onCleanup) => {
      const startedAt = this.trainingStartedAt();

      if (startedAt === null) {
        return;
      }

      const remaining = GAME_BALANCE.ACTION_EFFECTS.TRAIN.durationMs - (Date.now() - startedAt);
      const delay = Math.max(0, remaining);
      const experienceGain =
        untracked(() => this.store.trainingExperienceReward()) ?? rollTrainingExperienceGain();

      const timeoutId = setTimeout(() => {
        this.store.completeTraining(Date.now(), experienceGain);
        this.store.checkEvolution();
      }, delay);

      onCleanup(() => {
        clearTimeout(timeoutId);
      });
    });

    effect((onCleanup) => {
      if (!this.hasActiveCooldown(this.cooldowns())) {
        return;
      }

      const intervalId = setInterval(() => {
        this.now.set(Date.now());
      }, COOLDOWN_REFRESH_INTERVAL_MS);

      onCleanup(() => {
        clearInterval(intervalId);
      });
    });
  }

  public bootstrapFromProfile(): void {
    this.initService.bootstrapFromProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  public onAction(action: ActionType): void {
    const now = Date.now();
    const actionContext = this.buildActionContext(now);

    this.now.set(now);

    if (this.isSleeping() && action === 'sleep') {
      const bonusEnergy = calculateSleepRestorationBonus(this.status().lastSleepTime, now);

      this.store.wakeUp(now, bonusEnergy);
      this.store.checkEvolution();

      return;
    }

    if (this.isTraining()) {
      if (action !== 'play') {
        return;
      }

      const validation = this.tamagotchiService.validateAction(actionContext, action);

      if (!validation.allowed) {
        return;
      }

      this.store.play(now);
      this.store.restartTrainingTimer(now);
      this.store.checkEvolution();

      return;
    }

    const validation = this.tamagotchiService.validateAction(actionContext, action);

    if (!validation.allowed) {
      return;
    }

    switch (action) {
      case 'care':
        this.store.care(now);
        break;

      case 'feed':
        this.store.feed(now);
        break;

      case 'play':
        this.store.play(now);
        break;

      case 'sleep':
        this.store.putToSleep(now);
        break;

      case 'train':
        this.store.startTraining(now, rollTrainingExperienceGain());
        break;

      case 'water':
        this.store.water(now);
        break;
    }

    this.store.checkEvolution();
  }

  public onEvolutionComplete(evolvedPokemon: PokemonModel): void {
    this.store.completeEvolution(evolvedPokemon);
    this.pendingEvolvedPokemon.set(null);
  }

  public onInteraction(interaction: InteractionEventModel): void {
    this.store.interactWithPokemon(interaction);
    this.store.checkEvolution();
  }

  public onSystemErrorDismiss(): void {
    if (this.error() === TAMAGOTCHI_SYSTEM_ERRORS.EVOLUTION_PREPARE_FAILED) {
      this.store.clearEvolutionReadyNotified();
    }

    this.store.clearError();
  }

  public onPerformanceModeChange(mode: PerformanceMode): void {
    this.performanceService.setMode(mode);
  }

  public onPerformanceModeIndexChange(index: number): void {
    const mode = this.performanceModeList[index];

    if (mode) {
      this.onPerformanceModeChange(mode);
    }
  }

  public onResetProgress(): void {
    this.store.resetState();
    this.store.clearError();
    this.initService.bootstrapFromProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  public maxValueForStatus(statusType: StatusType): number {
    return maxValueForStatusType(statusType);
  }

  public statusValueFor(statusType: StatusType): number {
    return statusValueForType(statusType, this.status());
  }

  private buildTimerContext(): TamagotchiTimerContext {
    return {
      dailyRoutine: this.store.dailyRoutine(),
      isSleeping: this.isSleeping(),
      lastActionTime: this.store.lastActionTime(),
      lastDecayTime: this.store.lastDecayTime(),
      status: this.status(),
    };
  }

  private handleTimerTick(result: TimerTickResult): void {
    this.store.applyStatusDecay(result.decay);

    if (result.routineBonusApplied > 0) {
      this.store.updateStatus({ mood: result.routineBonusApplied });
      this.store.updateDailyRoutine(result.dailyRoutine);
    }

    this.notificationService.processStatusAlerts({
      status: result.nextStatus,
      thresholdAlerts: result.alerts,
      timestamp: result.decay.timestamp,
    });
    this.store.checkEvolution();
  }

  private isActionAllowed(action: ActionType): boolean {
    return this.tamagotchiService.validateAction(this.actionContext(), action).allowed;
  }

  private buildActionContext(now: number): TamagotchiActionContext {
    return {
      hasPokemon: this.hasPokemon(),
      isSleeping: this.isSleeping(),
      isTraining: this.trainingStartedAt() !== null,
      lastActionTime: this.store.lastActionTime(),
      now,
      status: this.status(),
    };
  }

  private hasActiveCooldown(cooldowns: ActionCooldownsModel): boolean {
    return COOLDOWN_ACTIONS.some((action) => {
      const remaining = cooldowns[action];

      return remaining !== null && remaining > 0;
    });
  }
}
