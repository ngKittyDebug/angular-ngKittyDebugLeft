import { computed, DestroyRef, effect, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import { MEMORY_GC_INTERVAL_TICKS } from '../constants/performance-mode.constants';
import { isTamagotchiSelectionError } from '../constants/selection-errors.constants';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import {
  DISPLAYED_STATUS_TYPES,
  maxValueForStatusType,
  statusValueForType,
} from '../helpers/status-indicator-sync.helper';
import { rollTrainingExperienceGain } from '../helpers/training-reward.helper';
import { EvolutionService } from '../services/evolution.service';
import { MemoryManagementService } from '../services/memory-management.service';
import { PerformanceService } from '../services/performance.service';
import { TamagotchiAnalyticsService } from '../services/tamagotchi-analytics.service';
import { TamagotchiInitService } from '../services/tamagotchi-init.service';
import { TamagotchiService } from '../services/tamagotchi.service';
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
import type { ActionType, TamagotchiStateModel } from '../models/tamagotchi-state.model';
import { TamagotchiNotificationService } from '../../ui/services/notification.service';

@Service({ autoProvided: false })
export class TamagotchiFacade {
  private readonly analyticsService = inject(TamagotchiAnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly evolutionService = inject(EvolutionService);
  private readonly initService = inject(TamagotchiInitService);
  private readonly memoryManagementService = inject(MemoryManagementService);
  private readonly notificationService = inject(TamagotchiNotificationService);
  private readonly performanceService = inject(PerformanceService);
  private readonly store = inject(TamagotchiStore);
  private readonly tamagotchiService = inject(TamagotchiService);
  private readonly timerService = inject(TimerService);
  private readonly wasEvolutionReady = signal(false);
  private timerTickCount = 0;
  private readonly isInitialized = computed(() => this.store.initialized());

  private readonly state = computed(
    (): TamagotchiStateModel => ({
      achievementList: this.store.achievementList(),
      dailyRoutine: this.store.dailyRoutine(),
      error: this.store.error(),
      evolutionProgress: this.store.evolutionProgress(),
      initialized: this.store.initialized(),
      interactionHistory: this.store.interactionHistory(),
      isEvolving: this.store.isEvolving(),
      isSleeping: this.store.isSleeping(),
      lastActionTime: this.store.lastActionTime(),
      lastDecayTime: this.store.lastDecayTime(),
      lastSaveTime: this.store.lastSaveTime(),
      notificationList: this.store.notificationList(),
      pokemon: this.store.pokemon(),
      status: this.store.status(),
      trainingExperienceReward: this.store.trainingExperienceReward(),
      trainingStartedAt: this.store.trainingStartedAt(),
    }),
  );

  public readonly displayedStatusTypes = DISPLAYED_STATUS_TYPES;

  public readonly trainingStartedAt = this.store.trainingStartedAt;
  public readonly isTraining = this.store.isTraining;
  public readonly canEvolve = this.store.canEvolve;
  public readonly error = this.store.error;
  public readonly hasPokemon = this.store.hasPokemon;
  public readonly isEvolving = this.store.isEvolving;
  public readonly isSleeping = this.store.isSleeping;
  public readonly notificationList = this.store.notificationList;
  public readonly notifications = this.store.notificationList;
  public readonly pokemon = this.store.pokemon;
  public readonly status = this.store.status;

  public readonly evolvedPokemon = computed(() => this.resolveEvolvedPokemon(this.pokemon()));

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

    if (currentError === TAMAGOTCHI_SYSTEM_ERRORS.RECOVERED_FROM_BACKUP) {
      return 'stateRecoveredWarning';
    }

    return null;
  });

  public readonly cooldowns = computed(() => {
    const current = this.state();

    return this.tamagotchiService.getActionCooldowns(this.toActionContext(current));
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
  public readonly effectivePerformanceMode = computed(() =>
    this.performanceService.resolveEffectiveMode(),
  );
  public readonly performanceModes: PerformanceMode[] = ['auto', 'high', 'balanced', 'low'];

  public constructor() {
    this.analyticsService.track('pageView');
    this.initService.bootstrapFromProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    effect((onCleanup) => {
      if (!this.isInitialized() || !this.hasPokemon()) {
        return;
      }

      this.performanceService.mode();

      const profile = this.performanceService.getProfile();
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

    effect(() => {
      const ready = this.canEvolve();
      const species = this.pokemon();

      if (ready && !this.wasEvolutionReady() && species) {
        this.notificationService.notifyEvolutionReady(species.name);
        this.store.startEvolution();
      }

      this.wasEvolutionReady.set(ready);
    });

    effect((onCleanup) => {
      const startedAt = this.trainingStartedAt();

      if (startedAt === null) {
        return;
      }

      const remaining = GAME_BALANCE.ACTION_EFFECTS.TRAIN.durationMs - (Date.now() - startedAt);
      const delay = Math.max(0, remaining);
      const experienceGain = this.store.trainingExperienceReward() ?? rollTrainingExperienceGain();

      const timeoutId = setTimeout(() => {
        this.store.completeTraining(Date.now(), experienceGain);
        this.store.checkEvolution();
      }, delay);

      onCleanup(() => {
        clearTimeout(timeoutId);
      });
    });
  }

  public onAction(action: ActionType): void {
    this.analyticsService.track(action);

    if (this.isTraining()) {
      return;
    }

    const now = Date.now();

    if (this.isSleeping() && action === 'sleep') {
      this.store.wakeUp(now);
      this.store.checkEvolution();

      return;
    }

    const validation = this.tamagotchiService.validateActionFromState(this.state(), action);

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
    this.wasEvolutionReady.set(false);
  }

  public onInteraction(interaction: InteractionEventModel): void {
    if (this.isTraining()) {
      return;
    }

    this.analyticsService.track(interaction.type);
    this.store.interactWithPokemon(interaction, Date.now());
    this.store.checkEvolution();
  }

  public onSystemErrorDismiss(): void {
    this.store.clearError();
  }

  public onPerformanceModeChange(mode: PerformanceMode): void {
    this.performanceService.setMode(mode);
    this.memoryManagementService.runGarbageCollection();
  }

  public onResetProgress(): void {
    this.store.resetState();
    this.store.clearError();
    this.initService.bootstrapFromProfile().subscribe();
  }

  public maxValueForStatus(statusType: StatusType): number {
    return maxValueForStatusType(statusType);
  }

  public statusValueFor(statusType: StatusType): number {
    return statusValueForType(statusType, this.status());
  }

  private buildTimerContext(): TamagotchiTimerContext {
    const current = this.state();

    return {
      dailyRoutine: current.dailyRoutine,
      isSleeping: current.isSleeping,
      lastActionTime: current.lastActionTime,
      lastDecayTime: current.lastDecayTime,
      sleepStartedAt: current.isSleeping ? current.status.lastSleepTime : null,
      status: current.status,
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

    this.timerTickCount += 1;

    if (this.timerTickCount % MEMORY_GC_INTERVAL_TICKS === 0) {
      this.memoryManagementService.runGarbageCollection();
    }
  }

  private isActionAllowed(action: ActionType): boolean {
    return this.tamagotchiService.validateActionFromState(this.state(), action).allowed;
  }

  private resolveEvolvedPokemon(species: PokemonModel | null): PokemonModel | null {
    if (!species) {
      return null;
    }

    const evolutionData = this.evolutionService.buildEvolutionData(species);

    if (!evolutionData) {
      return null;
    }

    return this.evolutionService.triggerEvolution(species, evolutionData)?.evolvedPokemon ?? null;
  }

  private toActionContext(state: TamagotchiStateModel) {
    return {
      hasPokemon: state.pokemon !== null,
      isSleeping: state.isSleeping,
      isTraining: state.trainingStartedAt !== null,
      lastActionTime: state.lastActionTime,
      status: state.status,
    };
  }
}
