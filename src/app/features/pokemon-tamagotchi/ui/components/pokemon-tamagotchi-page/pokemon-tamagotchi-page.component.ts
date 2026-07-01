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
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../../../data/constants/system-errors.constants';
import { GAME_BALANCE } from '../../../data/constants/game-balance.constants';
import { isTamagotchiSelectionError } from '../../../data/constants/selection-errors.constants';
import { EvolutionService } from '../../../data/services/evolution.service';
import { TamagotchiInitService } from '../../../data/services/tamagotchi-init.service';
import { TamagotchiService } from '../../../data/services/tamagotchi.service';
import {
  type TamagotchiTimerContext,
  TimerService,
  type TimerTickResult,
} from '../../../data/services/timer.service';
import * as TamagotchiActions from '../../../data/store/tamagotchi.actions';
import {
  selectActiveMiniGame,
  selectCanEvolve,
  selectHasPokemon,
  selectIsEvolving,
  selectIsInitialized,
  selectIsSleeping,
  selectNotifications,
  selectPokemon,
  selectStatus,
  selectTamagotchiError,
  selectTamagotchiState,
} from '../../../data/store/tamagotchi.selectors';
import { createInitialTamagotchiState } from '../../../data/store/tamagotchi.state';
import type { InteractionEvent } from '../../../models/interaction.model';
import type { GameResult } from '../../../models/mini-game.model';
import type { Pokemon } from '../../../models/pokemon.model';
import type { ActionType, TamagotchiState } from '../../../models/tamagotchi-state.model';
import { TamagotchiNotificationService } from '../../services/notification.service';
import { ActionButtonsComponent } from '../action-buttons/action-buttons.component';
import { EvolutionAnimationComponent } from '../evolution-animation/evolution-animation.component';
import { MiniGameComponent } from '../mini-game/mini-game.component';
import { NotificationComponent } from '../notifications/notification.component';
import { PokemonSpriteComponent } from '../pokemon-sprite/pokemon-sprite.component';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

@Component({
  selector: 'left-paw-pokemon-tamagotchi-page',
  imports: [
    ActionButtonsComponent,
    EvolutionAnimationComponent,
    MiniGameComponent,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly evolutionService = inject(EvolutionService);
  private readonly initService = inject(TamagotchiInitService);
  private readonly notificationService = inject(TamagotchiNotificationService);
  private readonly store = inject(Store);
  private readonly tamagotchiService = inject(TamagotchiService);
  private readonly timerService = inject(TimerService);
  private readonly wasEvolutionReady = signal(false);
  private readonly state = toSignal(this.store.select(selectTamagotchiState), {
    initialValue: createInitialTamagotchiState(),
  });

  protected readonly experienceMax = GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE;
  protected readonly statusMax = GAME_BALANCE.THRESHOLDS.MAXIMUM;

  protected readonly activeMiniGame = toSignal(this.store.select(selectActiveMiniGame), {
    initialValue: null,
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

  public constructor() {
    this.initService.bootstrapFromProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    effect((onCleanup) => {
      if (!this.isInitialized() || !this.hasPokemon()) {
        return;
      }

      const handle = this.timerService.startTimer(
        () => this.buildTimerContext(),
        (result) => this.handleTimerTick(result),
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
  }

  protected onAction(action: ActionType): void {
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
        this.store.dispatch(TamagotchiActions.openMiniGame({ gameType: 'reflex' }));
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
    this.store.dispatch(TamagotchiActions.interactWithPokemon({ interaction }));
    this.store.dispatch(TamagotchiActions.checkEvolution());
  }

  protected onMiniGameCompleted(result: GameResult): void {
    const level = this.status().level;
    const gameResult = this.tamagotchiService.buildGameResult(
      result.gameType,
      result.score,
      result.maxScore,
      result.timeTaken,
      level,
    );

    this.store.dispatch(TamagotchiActions.trainPokemon({ gameResult }));
    this.store.dispatch(TamagotchiActions.closeMiniGame());
    this.store.dispatch(TamagotchiActions.checkEvolution());
  }

  protected onNotificationAction(action: ActionType): void {
    this.onAction(action);
  }

  protected onNotificationDismiss(id: string): void {
    this.store.dispatch(TamagotchiActions.dismissNotification({ id }));
  }

  protected onSystemErrorDismiss(): void {
    this.store.dispatch(TamagotchiActions.clearError());
  }

  protected onResetProgress(): void {
    this.store.dispatch(TamagotchiActions.resetState());
    this.store.dispatch(TamagotchiActions.clearError());
    this.initService.bootstrapFromProfile().subscribe();
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

    this.notificationService.notifyStatusAlerts(result.alerts, result.decay.timestamp);
    this.store.dispatch(TamagotchiActions.checkEvolution());
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
      lastActionTime: state.lastActionTime,
      status: state.status,
    };
  }
}
