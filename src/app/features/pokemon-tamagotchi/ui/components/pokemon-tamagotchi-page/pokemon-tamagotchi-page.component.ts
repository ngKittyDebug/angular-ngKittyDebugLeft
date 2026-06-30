import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, map, of, switchMap } from 'rxjs';
import { environment } from '@environments/environment';
import { GAME_BALANCE } from '../../../data/constants/game-balance.constants';
import {
  PokemonProfileIntegrationService,
  type PokemonSelectionValidation,
} from '../../../data/services/pokemon-profile-integration.service';
import { TamagotchiService } from '../../../data/services/tamagotchi.service';
import * as TamagotchiActions from '../../../data/store/tamagotchi.actions';
import {
  selectActiveMiniGame,
  selectHasPokemon,
  selectIsEvolving,
  selectIsSleeping,
  selectPokemon,
  selectStatus,
  selectTamagotchiError,
  selectTamagotchiState,
} from '../../../data/store/tamagotchi.selectors';
import { createInitialTamagotchiState } from '../../../data/store/tamagotchi.state';
import type { InteractionEvent } from '../../../models/interaction.model';
import type { GameResult } from '../../../models/mini-game.model';
import type { ActionType, TamagotchiState } from '../../../models/tamagotchi-state.model';
import { ActionButtonsComponent } from '../action-buttons/action-buttons.component';
import { MiniGameComponent } from '../mini-game/mini-game.component';
import { PokemonSpriteComponent } from '../pokemon-sprite/pokemon-sprite.component';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

@Component({
  selector: 'left-paw-pokemon-tamagotchi-page',
  imports: [
    ActionButtonsComponent,
    MiniGameComponent,
    PokemonSpriteComponent,
    RouterLink,
    StatusIndicatorComponent,
    TranslocoDirective,
    TuiBadge,
    TuiButton,
  ],
  templateUrl: './pokemon-tamagotchi-page.component.html',
  styleUrl: './pokemon-tamagotchi-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTamagotchiPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly profileIntegration = inject(PokemonProfileIntegrationService);
  private readonly store = inject(Store);
  private readonly tamagotchiService = inject(TamagotchiService);
  private readonly state = toSignal(this.store.select(selectTamagotchiState), {
    initialValue: createInitialTamagotchiState(),
  });

  protected readonly experienceMax = GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE;
  protected readonly statusMax = GAME_BALANCE.THRESHOLDS.MAXIMUM;

  protected readonly activeMiniGame = toSignal(this.store.select(selectActiveMiniGame), {
    initialValue: null,
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
  protected readonly isSleeping = toSignal(this.store.select(selectIsSleeping), {
    initialValue: false,
  });
  protected readonly pokemon = toSignal(this.store.select(selectPokemon), { initialValue: null });
  protected readonly status = toSignal(this.store.select(selectStatus), {
    initialValue: createInitialTamagotchiState().status,
  });

  protected readonly selectionBlocked = computed(() => !this.hasPokemon() && this.error() !== null);

  protected readonly cooldowns = computed(() => {
    const current = this.state();

    return this.tamagotchiService.getActionCooldowns(this.toActionContext(current));
  });

  protected readonly canCare = computed(() => this.isActionAllowed('care'));
  protected readonly canFeed = computed(() => this.isActionAllowed('feed'));
  protected readonly canPlay = computed(() => this.isActionAllowed('play'));
  protected readonly canTrain = computed(() => this.isActionAllowed('train'));
  protected readonly canWater = computed(() => this.isActionAllowed('water'));

  public ngOnInit(): void {
    this.profileIntegration
      .validateSelectedPokemon()
      .pipe(
        switchMap((validation: PokemonSelectionValidation) => {
          if (validation.valid && validation.pokemon) {
            return of(validation);
          }

          const previewPokemon = environment.tamagotchiPreviewPokemon;

          if (previewPokemon && validation.error === 'noSelection') {
            return this.profileIntegration.loadPokemonByName(previewPokemon).pipe(
              map((pokemon) => ({ pokemon, valid: true as const })),
              catchError(() => of(validation)),
            );
          }

          return of(validation);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((validation: PokemonSelectionValidation) => {
        if (validation.valid && validation.pokemon && !this.hasPokemon()) {
          this.store.dispatch(TamagotchiActions.selectPokemon({ pokemon: validation.pokemon }));
          this.profileIntegration.saveSelectedPokemon(validation.pokemon);

          return;
        }

        if (!validation.valid && validation.error) {
          this.store.dispatch(
            TamagotchiActions.setError({
              error: validation.error,
            }),
          );
        }
      });
  }

  protected onAction(action: ActionType): void {
    if (this.isSleeping() && action === 'sleep') {
      this.store.dispatch(TamagotchiActions.wakeUp());

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
  }

  protected onInteraction(interaction: InteractionEvent): void {
    this.store.dispatch(TamagotchiActions.interactWithPokemon({ interaction }));
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
  }

  private isActionAllowed(action: ActionType): boolean {
    return this.tamagotchiService.validateActionFromState(this.state(), action).allowed;
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
