import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BattleEngine } from '@game/pokemon-battle/battle-engine';
import type {
  BattleCommand,
  BattleEvent,
  BattlePokemon,
  BattleState,
  PokemonMove,
} from '@game/pokemon-battle/types';
import { CHARMANDER_FIXTURE, IVYSAUR_FIXTURE } from '../../../data/fixtures/pokemon.fixture';
import { CanvasRendererComponent } from './canvas-renderer/canvas-renderer.component';
import { BotPlayerService } from '../../../data/bot-player.service';
import { AudioManagerService } from '../../../data/audio-manager.service';
import { PokemonBattleStore } from '../../../data/pokemon-battle.store';

@Component({
  selector: 'app-pokemon-battle-page',
  standalone: true,
  imports: [CommonModule, CanvasRendererComponent],
  templateUrl: './pokemon-battle-page.component.html',
  styleUrl: './pokemon-battle-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonBattlePageComponent {
  private botPlayerService = inject(BotPlayerService);
  private readonly audioManager = inject(AudioManagerService);
  private readonly pokemonBattleStore = inject(PokemonBattleStore);
  private engine!: BattleEngine;

  private readonly canvasRenderer = viewChild(CanvasRendererComponent);

  public readonly soundEnabled = this.audioManager.enabled;
  public readonly soundVolume = this.audioManager.volume;
  public readonly soundVolumePercent = computed(() => Math.round(this.soundVolume() * 100));

  public readonly battleState = signal<BattleState | null>(null);
  public readonly textLog = signal<string[]>([]);
  public readonly isAnimating = signal<boolean>(false);

  // Doubles choice selection state
  public readonly pendingCommands = signal<BattleCommand[]>([]);
  public readonly currentSelectingPokemonIndex = signal<number>(0);
  public readonly selectedMove = signal<PokemonMove | null>(null);

  // Expose store signals for the template
  public readonly storePokemonList = this.pokemonBattleStore.pokemonList;
  public readonly storeSelectedTeam = this.pokemonBattleStore.selectedTeam;
  public readonly storeIsLoading = this.pokemonBattleStore.isLoading;
  public readonly storeError = this.pokemonBattleStore.error;
  public readonly storeBattleStarted = this.pokemonBattleStore.battleStarted;
  public readonly storeCurrentPage = this.pokemonBattleStore.currentPage;
  public readonly storeTotalCount = this.pokemonBattleStore.totalCount;
  public readonly storeLimit = this.pokemonBattleStore.limit;

  constructor() {
    this.pokemonBattleStore.loadPokemons({ page: 0, limit: 10 });
    this.resetBattle();
  }

  public get activeAlivePlayerPokemons(): BattlePokemon[] {
    const state = this.battleState();

    if (!state) {
      return [];
    }

    return state.playerSide.activePokemonIds
      .map((id) => state.playerSide.pokemons.find((p) => p.id === id))
      .filter((p): p is BattlePokemon => !!p && p.hp > 0);
  }

  public get activeAliveOpponentPokemons(): BattlePokemon[] {
    const state = this.battleState();

    if (!state) {
      return [];
    }

    return state.opponentSide.activePokemonIds
      .map((id) => state.opponentSide.pokemons.find((p) => p.id === id))
      .filter((p): p is BattlePokemon => !!p && p.hp > 0);
  }

  public get currentSelectingPokemon(): BattlePokemon | null {
    const pokemons = this.activeAlivePlayerPokemons;
    const index = this.currentSelectingPokemonIndex();

    if (index >= 0 && index < pokemons.length) {
      return pokemons[index];
    }

    return null;
  }

  public onSelectMove(move: PokemonMove | string): void {
    const state = this.battleState();

    if (!state || state.status !== 'waiting-for-commands' || this.isAnimating()) {
      return;
    }

    const currentPokemon = this.currentSelectingPokemon;

    if (!currentPokemon) {
      return;
    }

    const moveObject =
      typeof move === 'string'
        ? currentPokemon.moves.find((m) => m.name.toLowerCase() === move.toLowerCase()) || {
            name: move,
            type: 'normal',
            power: 40,
          }
        : move;

    this.selectedMove.set(moveObject);

    // If there is only one active alive opponent pokemon, auto-select it and skip target selection!
    const targets = this.activeAliveOpponentPokemons;

    if (targets.length === 1) {
      this.onSelectTarget(targets[0]);
    }
  }

  public onSelectTarget(target: BattlePokemon): void {
    const state = this.battleState();
    const currentPokemon = this.currentSelectingPokemon;
    const move = this.selectedMove();

    if (!state || !currentPokemon || !move) {
      return;
    }

    const command: BattleCommand = {
      pokemonId: currentPokemon.id,
      moveName: move.name,
      targetId: target.id,
    };

    this.pendingCommands.update((cmds) => [...cmds, command]);
    this.selectedMove.set(null);

    const nextIndex = this.currentSelectingPokemonIndex() + 1;

    this.currentSelectingPokemonIndex.set(nextIndex);

    if (nextIndex >= this.activeAlivePlayerPokemons.length) {
      this.resolveTurnSequence();
    }
  }

  public cancelMoveSelection(): void {
    this.selectedMove.set(null);
  }

  public resetSelection(): void {
    this.pendingCommands.set([]);
    this.currentSelectingPokemonIndex.set(0);
    this.selectedMove.set(null);
  }

  public toggleMute(): void {
    this.audioManager.toggle();
  }

  public onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input) {
      this.audioManager.setVolume(Number.parseFloat(input.value));
    }
  }

  public onEventTriggered(event: BattleEvent): void {
    if (event.message) {
      this.textLog.update((logs) => [...logs, event.message]);
    }
  }

  public onAnimationFinished(): void {
    this.isAnimating.set(false);
  }

  public onSelectPokemon(pokemon: BattlePokemon): void {
    this.pokemonBattleStore.selectPokemonForTeam(pokemon);
  }

  public onStartBattleClick(): void {
    const selected = this.pokemonBattleStore.selectedTeam();

    if (selected.length !== 2) {
      return;
    }

    const available = this.pokemonBattleStore
      .pokemonList()
      .filter((p) => !selected.some((s) => s.id === p.id));

    const opponents: BattlePokemon[] = [];

    if (available.length >= 2) {
      const shuffled = [...available].sort(() => 0.5 - Math.random());

      opponents.push(shuffled[0], shuffled[1]);
    } else {
      opponents.push(
        JSON.parse(JSON.stringify(CHARMANDER_FIXTURE)),
        JSON.parse(JSON.stringify(IVYSAUR_FIXTURE)),
      );
    }

    this.pokemonBattleStore.startBattle(opponents);
    this.resetBattle();
  }

  public goBackToSelection(): void {
    this.pokemonBattleStore.clearSelectedTeam();
    this.battleState.set(null);
  }

  public onPrevPage(): void {
    const current = this.pokemonBattleStore.currentPage();

    if (current > 0) {
      this.pokemonBattleStore.loadPokemons({ page: current - 1, limit: 10 });
    }
  }

  public onNextPage(): void {
    const current = this.pokemonBattleStore.currentPage();
    const total = this.pokemonBattleStore.totalCount();
    const limit = this.pokemonBattleStore.limit();

    if ((current + 1) * limit < total) {
      this.pokemonBattleStore.loadPokemons({ page: current + 1, limit: 10 });
    }
  }

  public resetBattle(): void {
    if (this.pokemonBattleStore.battleStarted()) {
      const playerTeam = JSON.parse(
        JSON.stringify(this.pokemonBattleStore.selectedTeam()),
      ) as BattlePokemon[];
      const opponentTeam = JSON.parse(
        JSON.stringify(this.pokemonBattleStore.opponentTeam()),
      ) as BattlePokemon[];

      this.engine = new BattleEngine(playerTeam, opponentTeam, true);
      this.battleState.set(this.engine.getState());
    } else {
      this.battleState.set(null);
    }

    this.textLog.set([]);
    this.isAnimating.set(false);

    this.pendingCommands.set([]);
    this.currentSelectingPokemonIndex.set(0);
    this.selectedMove.set(null);
  }

  private resolveTurnSequence(): void {
    const state = this.battleState();

    if (!state) {
      return;
    }

    const currentTurn = state.turn;

    const botCommands = this.botPlayerService.getCommands(state);
    const events = this.engine.resolveTurn(this.pendingCommands(), botCommands);

    const roundLogHeader = `--- Раунд ${currentTurn} ---`;

    this.textLog.update((logs) => [...logs, roundLogHeader]);

    this.isAnimating.set(true);
    this.canvasRenderer()?.playEvents(events);

    this.battleState.set(this.engine.getState());

    // Reset selection state for next turn
    this.pendingCommands.set([]);
    this.currentSelectingPokemonIndex.set(0);
    this.selectedMove.set(null);
  }
}
