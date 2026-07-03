import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiLoader, tuiLoaderOptionsProvider } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { GAME_BALANCE } from '../../../data/constants/game-balance.constants';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../../../data/constants/system-errors.constants';
import { isTamagotchiSelectionError } from '../../../data/constants/selection-errors.constants';
import { EvolutionService } from '../../../data/services/evolution.service';
import {
  DISPLAYED_STATUS_TYPES,
  maxValueForStatusType,
  statusValueForType,
} from '../../../data/helpers/status-indicator-sync.helper';
import { rollTrainingExperienceGain } from '../../../data/helpers/training-reward.helper';
import { TamagotchiAnalyticsService } from '../../../data/services/tamagotchi-analytics.service';
import { MEMORY_GC_INTERVAL_TICKS } from '../../../data/constants/performance-mode.constants';
import { MemoryManagementService } from '../../../data/services/memory-management.service';
import { PerformanceService } from '../../../data/services/performance.service';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { TamagotchiService } from '../../../data/services/tamagotchi.service';
import {
  type TamagotchiTimerContext,
  TimerService,
  type TimerTickResult,
} from '../../../data/services/timer.service';
import { TamagotchiStore } from '../../../data/store/tamagotchi.store';
import type { InteractionEvent } from '../../../models/interaction.model';
import type { Pokemon } from '../../../models/pokemon.model';
import type { ActionType, TamagotchiState } from '../../../models/tamagotchi-state.model';
import type { PerformanceMode } from '../../../models/performance-mode.model';
import type { StatusType } from '../../../models/pokemon-status.model';
import { TamagotchiNotificationService } from '../../services/notification.service';
import { ActionButtonsComponent } from '../action-buttons/action-buttons.component';
import { EvolutionAnimationComponent } from '../evolution-animation/evolution-animation.component';
import { NotificationComponent } from '../notifications/notification.component';
import { PokemonSpriteComponent } from '../pokemon-sprite/pokemon-sprite.component';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

@Component({
  selector: 'left-paw-pokemon-tamagotchi-page',
  imports: [
    ActionButtonsComponent,
    EvolutionAnimationComponent,
    NotificationComponent,
    PokemonSpriteComponent,
    RouterLink,
    StatusIndicatorComponent,
    TranslocoDirective,
    TuiBadge,
    TuiButton,
    TuiLoader,
  ],
  templateUrl: './pokemon-tamagotchi-page.component.html',
  styleUrl: './pokemon-tamagotchi-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiLoaderOptionsProvider({ size: 'l' })],
})
export class PokemonTamagotchiPageComponent {
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

  private readonly state = computed(
    (): TamagotchiState => ({
      achievements: this.store.achievements(),
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
      notifications: this.store.notifications(),
      pokemon: this.store.pokemon(),
      status: this.store.status(),
      trainingExperienceReward: this.store.trainingExperienceReward(),
      trainingStartedAt: this.store.trainingStartedAt(),
    }),
  );

  protected readonly displayedStatusTypes = DISPLAYED_STATUS_TYPES;

  protected readonly trainingStartedAt = this.store.trainingStartedAt;
  protected readonly isTraining = this.store.isTraining;
  protected readonly canEvolve = this.store.canEvolve;
  protected readonly error = this.store.error;
  protected readonly hasPokemon = this.store.hasPokemon;
  protected readonly isEvolving = this.store.isEvolving;
  protected readonly isInitialized = computed(() => this.store.initialized());
  protected readonly isSleeping = this.store.isSleeping;
  protected readonly notifications = this.store.notifications;
  protected readonly pokemon = this.store.pokemon;
  protected readonly status = this.store.status;

  protected readonly evolvedPokemon = computed(() => this.resolveEvolvedPokemon(this.pokemon()));

  protected readonly isLoading = computed(() => !this.isInitialized());

  protected readonly selectionBlocked = computed(
    () => !this.hasPokemon() && isTamagotchiSelectionError(this.error()),
  );

  protected readonly systemErrorMessageKey = computed(() => {
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

  protected readonly cooldowns = computed(() => {
    const current = this.state();

    return this.tamagotchiService.getActionCooldowns(this.toActionContext(current));
  });

  protected readonly canCare = computed(() => this.isActionAllowed('care'));
  protected readonly canFeed = computed(() => this.isActionAllowed('feed'));
  protected readonly canPlay = computed(() => this.isActionAllowed('play'));
  protected readonly canTrain = computed(() => this.isActionAllowed('train'));
  protected readonly canWater = computed(() => this.isActionAllowed('water'));

  protected readonly showRecoveryActions = computed(
    () => this.error() === TAMAGOTCHI_SYSTEM_ERRORS.SAVE_FAILED,
  );

  protected readonly performanceMode = this.performanceService.mode;
  protected readonly effectivePerformanceMode = computed(() =>
    this.performanceService.resolveEffectiveMode(),
  );
  protected readonly performanceModes: PerformanceMode[] = ['auto', 'high', 'balanced', 'low'];

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

  protected onAction(action: ActionType): void {
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

  protected onEvolutionComplete(evolvedPokemon: Pokemon): void {
    this.store.completeEvolution(evolvedPokemon);
    this.wasEvolutionReady.set(false);
  }

  protected onInteraction(interaction: InteractionEvent): void {
    if (this.isTraining()) {
      return;
    }

    this.analyticsService.track(interaction.type);
    this.store.interactWithPokemon(interaction, Date.now());
    this.store.checkEvolution();
  }

  protected onSystemErrorDismiss(): void {
    this.store.clearError();
  }

  protected onPerformanceModeChange(mode: PerformanceMode): void {
    this.performanceService.setMode(mode);
    this.memoryManagementService.runGarbageCollection();
  }

  protected onResetProgress(): void {
    this.store.resetState();
    this.store.clearError();
    this.initService.bootstrapFromProfile().subscribe();
  }

  protected maxValueForStatus(statusType: StatusType): number {
    return maxValueForStatusType(statusType);
  }

  protected statusValueFor(statusType: StatusType): number {
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

  private resolveEvolvedPokemon(species: Pokemon | null): Pokemon | null {
    if (!species) {
      return null;
    }

    const evolutionData = this.evolutionService.buildEvolutionData(species);

    if (!evolutionData) {
      return null;
    }

    return this.evolutionService.triggerEvolution(species, evolutionData)?.evolvedPokemon ?? null;
  }

  private toActionContext(state: TamagotchiState) {
    return {
      hasPokemon: state.pokemon !== null,
      isSleeping: state.isSleeping,
      isTraining: state.trainingStartedAt !== null,
      lastActionTime: state.lastActionTime,
      status: state.status,
    };
  }
}
