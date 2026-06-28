import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BattleEngine } from '@game/pokemon-battle/battle-engine';
import type { BattleState } from '@game/pokemon-battle/types';
import { BULBASAUR_FIXTURE, CHARMANDER_FIXTURE } from '../../../data/fixtures/pokemon.fixture';
import { CanvasRendererComponent } from './canvas-renderer/canvas-renderer.component';

@Component({
  selector: 'app-pokemon-battle-page',
  standalone: true,
  imports: [CommonModule, CanvasRendererComponent],
  templateUrl: './pokemon-battle-page.component.html',
  styleUrl: './pokemon-battle-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonBattlePageComponent {
  private engine: BattleEngine;
  public readonly battleState = signal<BattleState | null>(null);

  constructor() {
    // Instantiate engine with Bulbasaur vs Charmander fixtures
    const playerTeam = [JSON.parse(JSON.stringify(BULBASAUR_FIXTURE))];
    const opponentTeam = [JSON.parse(JSON.stringify(CHARMANDER_FIXTURE))];

    this.engine = new BattleEngine(playerTeam, opponentTeam, false);
    this.battleState.set(this.engine.getState());
  }
}
