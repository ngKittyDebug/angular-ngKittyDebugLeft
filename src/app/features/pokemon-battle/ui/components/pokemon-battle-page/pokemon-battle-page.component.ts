import { ChangeDetectionStrategy, Component, DestroyRef, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { BattleEvent, BattlePokemon, PokemonMove } from '@game/pokemon-battle/types';
import { CanvasRendererComponent } from './canvas-renderer/canvas-renderer.component';
import { PokemonBattleFacade } from '../../../data/facades/pokemon-battle.facade';

@Component({
  selector: 'app-pokemon-battle-page',
  standalone: true,
  imports: [CommonModule, CanvasRendererComponent],
  providers: [PokemonBattleFacade],
  templateUrl: './pokemon-battle-page.component.html',
  styleUrl: './pokemon-battle-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonBattlePageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRenderer = viewChild(CanvasRendererComponent);

  public readonly facade = inject(PokemonBattleFacade);

  // Delegate signals
  public readonly soundEnabled = this.facade.soundEnabled;
  public readonly soundVolume = this.facade.soundVolume;
  public readonly soundVolumePercent = this.facade.soundVolumePercent;

  public readonly battleState = this.facade.battleState;
  public readonly textLog = this.facade.textLog;
  public readonly isAnimating = this.facade.isAnimating;

  public readonly pendingCommands = this.facade.pendingCommands;
  public readonly currentSelectingPokemonIndex = this.facade.currentSelectingPokemonIndex;
  public readonly selectedMove = this.facade.selectedMove;

  public readonly storePokemonList = this.facade.pokemonList;
  public readonly storeSelectedTeam = this.facade.selectedTeam;
  public readonly storeIsLoading = this.facade.isLoading;
  public readonly storeError = this.facade.error;
  public readonly storeBattleStarted = this.facade.battleStarted;
  public readonly storeCurrentPage = this.facade.currentPage;
  public readonly storeTotalCount = this.facade.totalCount;
  public readonly storeLimit = this.facade.limit;

  constructor() {
    this.facade.turnResolved$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((events) => {
      this.canvasRenderer()?.playEvents(events);
    });
  }

  // Delegate computed properties
  public get activeAlivePlayerPokemons(): BattlePokemon[] {
    return this.facade.activeAlivePlayerPokemons();
  }

  public get activeAliveOpponentPokemons(): BattlePokemon[] {
    return this.facade.activeAliveOpponentPokemons();
  }

  public get currentSelectingPokemon(): BattlePokemon | null {
    return this.facade.currentSelectingPokemon();
  }

  // Delegate methods
  public onSelectMove(move: PokemonMove | string): void {
    this.facade.onSelectMove(move);
  }

  public onSelectTarget(target: BattlePokemon): void {
    this.facade.onSelectTarget(target);
  }

  public cancelMoveSelection(): void {
    this.facade.cancelMoveSelection();
  }

  public resetSelection(): void {
    this.facade.resetSelection();
  }

  public toggleMute(): void {
    this.facade.toggleMute();
  }

  public onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input) {
      this.facade.onVolumeChange(Number.parseFloat(input.value));
    }
  }

  public onEventTriggered(event: BattleEvent): void {
    this.facade.onEventTriggered(event);
  }

  public onAnimationFinished(): void {
    this.facade.onAnimationFinished();
  }

  public onSelectPokemon(pokemon: BattlePokemon): void {
    this.facade.onSelectPokemon(pokemon);
  }

  public onStartBattleClick(): void {
    this.facade.onStartBattleClick();
  }

  public goBackToSelection(): void {
    this.facade.goBackToSelection();
  }

  public onPrevPage(): void {
    this.facade.onPrevPage();
  }

  public onNextPage(): void {
    this.facade.onNextPage();
  }

  public resetBattle(): void {
    this.facade.resetBattle();
  }
}
