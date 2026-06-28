import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BattleEngine } from '@game/pokemon-battle/battle-engine';
import type {
  BattleCommand,
  BattleEvent,
  BattlePokemon,
  BattleState,
  PokemonMove,
} from '@game/pokemon-battle/types';
import {
  BULBASAUR_FIXTURE,
  CHARMANDER_FIXTURE,
  IVYSAUR_FIXTURE,
  SQUIRTLE_FIXTURE,
} from '../../../data/fixtures/pokemon.fixture';
import { CanvasRendererComponent } from './canvas-renderer/canvas-renderer.component';
import { BotPlayerService } from '../../../data/bot-player.service';

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
  private engine!: BattleEngine;

  private readonly canvasRenderer = viewChild(CanvasRendererComponent);

  public readonly battleState = signal<BattleState | null>(null);
  public readonly textLog = signal<string[]>([]);
  public readonly isAnimating = signal<boolean>(false);

  // Doubles choice selection state
  public readonly pendingCommands = signal<BattleCommand[]>([]);
  public readonly currentSelectingPokemonIndex = signal<number>(0);
  public readonly selectedMove = signal<PokemonMove | null>(null);

  constructor() {
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

  public onEventTriggered(event: BattleEvent): void {
    if (event.message) {
      this.textLog.update((logs) => [...logs, event.message]);
    }
  }

  public onAnimationFinished(): void {
    this.isAnimating.set(false);
  }

  public resetBattle(): void {
    const playerTeam = [
      JSON.parse(JSON.stringify(BULBASAUR_FIXTURE)),
      JSON.parse(JSON.stringify(SQUIRTLE_FIXTURE)),
    ];
    const opponentTeam = [
      JSON.parse(JSON.stringify(CHARMANDER_FIXTURE)),
      JSON.parse(JSON.stringify(IVYSAUR_FIXTURE)),
    ];

    this.engine = new BattleEngine(playerTeam, opponentTeam, true);
    this.battleState.set(this.engine.getState());
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
