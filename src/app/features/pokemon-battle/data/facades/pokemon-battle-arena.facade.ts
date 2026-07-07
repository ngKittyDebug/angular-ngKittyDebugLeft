import { computed, inject, Service, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { BattleEngine } from '../services/battle-engine';
import type {
  BattleCommand,
  BattleEvent,
  BattlePokemon,
  BattleState,
  PokemonMove,
} from '../models/battle.model';
import { BotPlayerService } from '../services/bot-player.service';
import { AudioManagerService } from '../services/audio-manager.service';
import { PokemonBattleStore } from '../store/pokemon-battle.store';

@Service({ autoProvided: false })
export class PokemonBattleArenaFacade {
  private readonly botPlayerService = inject(BotPlayerService);
  private readonly audioManager = inject(AudioManagerService);
  private readonly pokemonBattleStore = inject(PokemonBattleStore);

  private engine!: BattleEngine;

  // Turn resolution events stream for component (CanvasRenderer) integration
  private readonly turnResolvedSubject = new Subject<BattleEvent[]>();
  public readonly turnResolved$ = this.turnResolvedSubject.asObservable();

  // Expose store signals
  public readonly battleStarted = this.pokemonBattleStore.battleStarted;

  // Expose AudioManager signals
  public readonly soundEnabled = this.audioManager.enabled;
  public readonly soundVolume = this.audioManager.volume;
  public readonly soundVolumePercent = computed(() => Math.round(this.soundVolume() * 100));

  // Battle play state
  public readonly battleState = signal<BattleState | null>(null);
  public readonly textLog = signal<{ key: string; params?: Record<string, unknown> }[]>([]);
  public readonly isAnimating = signal<boolean>(false);

  // Doubles selection state
  public readonly pendingCommands = signal<BattleCommand[]>([]);
  public readonly currentSelectingPokemonIndex = signal<number>(0);
  public readonly selectedMove = signal<PokemonMove | null>(null);

  public readonly activeAlivePlayerPokemons = computed(() => {
    const state = this.battleState();

    if (!state) {
      return [];
    }

    return state.playerSide.activePokemonIds
      .map((id) => state.playerSide.pokemons.find((p) => p.id === id))
      .filter((p): p is BattlePokemon => !!p && p.hp > 0);
  });

  public readonly activeAliveOpponentPokemons = computed(() => {
    const state = this.battleState();

    if (!state) {
      return [];
    }

    return state.opponentSide.activePokemonIds
      .map((id) => state.opponentSide.pokemons.find((p) => p.id === id))
      .filter((p): p is BattlePokemon => !!p && p.hp > 0);
  });

  public readonly currentSelectingPokemon = computed(() => {
    const pokemons = this.activeAlivePlayerPokemons();
    const index = this.currentSelectingPokemonIndex();

    if (index >= 0 && index < pokemons.length) {
      return pokemons[index];
    }

    return null;
  });

  constructor() {
    this.resetBattle();
  }

  public onSelectMove(move: PokemonMove): void {
    const state = this.battleState();

    if (!state || state.status !== 'waiting-for-commands' || this.isAnimating()) {
      return;
    }

    const currentPokemon = this.currentSelectingPokemon();

    if (!currentPokemon) {
      return;
    }

    this.selectedMove.set(move);

    const targets = this.activeAliveOpponentPokemons();

    if (targets.length === 1) {
      this.onSelectTarget(targets[0]);
    }
  }

  public onSelectTarget(target: BattlePokemon): void {
    const state = this.battleState();
    const currentPokemon = this.currentSelectingPokemon();
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

    if (nextIndex >= this.activeAlivePlayerPokemons().length) {
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

  public onVolumeChange(volume: number): void {
    this.audioManager.setVolume(volume);
  }

  public onEventTriggered(event: BattleEvent): void {
    if (event.message) {
      this.textLog.update((logs) => [...logs, { key: 'raw', params: { message: event.message } }]);
    }
  }

  public onAnimationFinished(): void {
    this.isAnimating.set(false);
  }

  public goBackToSelection(): void {
    this.pokemonBattleStore.clearSelectedTeam();
    this.battleState.set(null);
  }

  public resetBattle(): void {
    if (this.pokemonBattleStore.battleStarted()) {
      const playerTeam = structuredClone(this.pokemonBattleStore.selectedTeam());
      const opponentTeam = structuredClone(this.pokemonBattleStore.opponentTeam());

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

    this.textLog.update((logs) => [...logs, { key: 'roundHeader', params: { turn: currentTurn } }]);

    this.isAnimating.set(true);

    // Emit event stream for the UI renderer component to play
    this.turnResolvedSubject.next(events);

    this.battleState.set(this.engine.getState());

    // Reset selection state for next turn
    this.pendingCommands.set([]);
    this.currentSelectingPokemonIndex.set(0);
    this.selectedMove.set(null);
  }
}
