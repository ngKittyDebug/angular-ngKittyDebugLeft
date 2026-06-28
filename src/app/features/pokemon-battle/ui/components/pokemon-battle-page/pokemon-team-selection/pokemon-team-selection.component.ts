import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BattlePokemon } from '@game/pokemon-battle/types';
import { PokemonTeamSelectionFacade } from '../../../../data/facades/pokemon-team-selection.facade';

@Component({
  selector: 'left-paw-pokemon-team-selection',
  imports: [CommonModule],
  providers: [PokemonTeamSelectionFacade],
  templateUrl: './pokemon-team-selection.component.html',
  styleUrl: './pokemon-team-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTeamSelectionComponent {
  public readonly facade = inject(PokemonTeamSelectionFacade);

  // Event handlers starting with "on" as per styleguide
  public onPokemonClick(pokemon: BattlePokemon): void {
    this.facade.onSelectPokemon(pokemon);
  }

  public onPrevClick(): void {
    this.facade.onPrevPage();
  }

  public onNextClick(): void {
    this.facade.onNextPage();
  }

  public onStartBattleClick(): void {
    this.facade.onStartBattleClick();
  }
}
