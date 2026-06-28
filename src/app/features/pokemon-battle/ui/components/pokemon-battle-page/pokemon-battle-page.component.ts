import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BattleEngine } from '@game/pokemon-battle/battle-engine';
import type { BattleState } from '@game/pokemon-battle/types';
import { BULBASAUR_FIXTURE, CHARMANDER_FIXTURE } from '../../../data/fixtures/pokemon.fixture';
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

  public readonly battleState = signal<BattleState | null>(null);
  public readonly textLog = signal<string[]>([]);

  constructor() {
    this.resetBattle();
  }

  public get activePlayerPokemon() {
    const state = this.battleState();

    if (!state) {
      return null;
    }
    const activeId = state.playerSide.activePokemonIds[0];

    return state.playerSide.pokemons.find((p) => p.id === activeId) || null;
  }

  public onSelectMove(moveName: string): void {
    const state = this.battleState();

    if (!state || state.status !== 'waiting-for-commands') {
      return;
    }

    const playerActiveId = state.playerSide.activePokemonIds[0];
    const opponentActiveId = state.opponentSide.activePokemonIds[0];

    if (!playerActiveId || !opponentActiveId) {
      return;
    }

    // 1. Prepare player command
    const playerCommand = {
      pokemonId: playerActiveId,
      moveName: moveName,
      targetId: opponentActiveId,
    };

    // 2. Prepare bot commands
    const botCommands = this.botPlayerService.getCommands(state);

    // 3. Resolve turn in the engine
    const events = this.engine.resolveTurn([playerCommand], botCommands);

    // 4. Update the text log with round information and events
    const roundLogHeader = `--- Раунд ${state.turn} ---`;
    const newLogs = [roundLogHeader, ...events.map((event_) => event_.message)];

    this.textLog.update((logs) => [...logs, ...newLogs]);

    // 5. Update UI state
    this.battleState.set(this.engine.getState());
  }

  public resetBattle(): void {
    const playerTeam = [JSON.parse(JSON.stringify(BULBASAUR_FIXTURE))];
    const opponentTeam = [JSON.parse(JSON.stringify(CHARMANDER_FIXTURE))];

    this.engine = new BattleEngine(playerTeam, opponentTeam, false);
    this.battleState.set(this.engine.getState());
    this.textLog.set([]);
  }
}
