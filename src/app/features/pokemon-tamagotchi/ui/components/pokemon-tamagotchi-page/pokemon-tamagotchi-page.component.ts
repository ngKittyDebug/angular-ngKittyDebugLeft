import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
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
import * as TamagotchiActions from '../../../data/store/tamagotchi.actions';
import {
  selectCanEvolve,
  selectHasPokemon,
  selectIsEvolving,
  selectIsInitialized,
  selectIsSleeping,
  selectIsTraining,
  selectNotifications,
  selectPokemon,
  selectStatus,
  selectTamagotchiError,
  selectTamagotchiState,
  selectTrainingStartedAt,
} from '../../../data/store/tamagotchi.selectors';
import { createInitialTamagotchiState } from '../../../data/store/tamagotchi.state';
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
  private readonly store = inject(Store);
  private readonly tamagotchiService = inject(TamagotchiService);
  private readonly timerService = inject(TimerService);
  private readonly wasEvolutionReady = signal(false);
  private timerTickCount = 0;
  private readonly state = toSignal(this.store.select(selectTamagotchiState), {
    initialValue: createInitialTamagotchiState(),
  });

  protected readonly displayedStatusTypes = DISPLAYED_STATUS_TYPES;

  protected readonly trainingStartedAt = toSignal(this.store.select(selectTrainingStartedAt), {
    initialValue: null,
  });
  protected readonly isTraining = toSignal(this.store.select(selectIsTraining), {
    initialValue: false,
  });
  protected readonly canEvolve = toSignal(this.store.select(selectCanEvolve), {
    initialValue: false,
  });
  protected readonly error = toSignal(this.store.select(selectTamagotchiError), {
    initialValue: null,
  });
  protected readonly hasPokemon = toSignal(this.store.select(selectHasPokemon), {
    initialValue: false,
  });
  protected readonly isEvolving = toSignal(this.store.select(selectIsEvolving), {
    initialValue: false,
  });
  protected readonly isInitialized = toSignal(this.store.select(selectIsInitialized), {
    initialValue: false,
  });
  protected readonly isSleeping = toSignal(this.store.select(selectIsSleeping), {
    initialValue: false,
  });
  protected readonly notifications = toSignal(this.store.select(selectNotifications), {
    initialValue: [],
  });
  protected readonly pokemon = toSignal(this.store.select(selectPokemon), { initialValue: null });
  protected readonly status = toSignal(this.store.select(selectStatus), {
    initialValue: createInitialTamagotchiState().status,
  });

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
        this.store.dispatch(TamagotchiActions.startEvolution());
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

      const timeoutId = setTimeout(() => {
        this.store.dispatch(TamagotchiActions.completeTraining());
        this.store.dispatch(TamagotchiActions.checkEvolution());
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

    if (this.isSleeping() && action === 'sleep') {
      this.store.dispatch(TamagotchiActions.wakeUp());
      this.store.dispatch(TamagotchiActions.checkEvolution());

      return;
    }

    const validation = this.tamagotchiService.validateActionFromState(this.state(), action);

    if (!validation.allowed) {
      return;
    }

    switch (action) {
      case 'care':
        this.store.dispatch(TamagotchiActions.careForPokemon());
        break;

      case 'feed':
        this.store.dispatch(TamagotchiActions.feedPokemon());
        break;

      case 'play':
        this.store.dispatch(TamagotchiActions.playWithPokemon());
        break;

      case 'sleep':
        this.store.dispatch(TamagotchiActions.putToSleep());
        break;

      case 'train':
        this.store.dispatch(TamagotchiActions.startTraining());
        break;

      case 'water':
        this.store.dispatch(TamagotchiActions.waterPokemon());
        break;
    }

    this.store.dispatch(TamagotchiActions.checkEvolution());
  }

  protected onEvolutionComplete(evolvedPokemon: Pokemon): void {
    this.store.dispatch(TamagotchiActions.completeEvolution({ evolvedPokemon }));
    this.wasEvolutionReady.set(false);
  }

  protected onInteraction(interaction: InteractionEvent): void {
    if (this.isTraining()) {
      return;
    }

    this.analyticsService.track(interaction.type);
    this.store.dispatch(TamagotchiActions.interactWithPokemon({ interaction }));
    this.store.dispatch(TamagotchiActions.checkEvolution());
  }

  protected onSystemErrorDismiss(): void {
    this.store.dispatch(TamagotchiActions.clearError());
  }

  protected onPerformanceModeChange(mode: PerformanceMode): void {
    this.performanceService.setMode(mode);
    this.memoryManagementService.runGarbageCollection();
  }

  protected onResetProgress(): void {
    this.store.dispatch(TamagotchiActions.resetState());
    this.store.dispatch(TamagotchiActions.clearError());
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
    this.store.dispatch(TamagotchiActions.applyStatusDecay({ decay: result.decay }));

    if (result.routineBonusApplied > 0) {
      this.store.dispatch(
        TamagotchiActions.updateStatus({
          statusUpdate: { mood: result.routineBonusApplied },
        }),
      );
    }

    this.notificationService.processStatusAlerts({
      status: result.nextStatus,
      thresholdAlerts: result.alerts,
      timestamp: result.decay.timestamp,
    });
    this.store.dispatch(TamagotchiActions.checkEvolution());

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
