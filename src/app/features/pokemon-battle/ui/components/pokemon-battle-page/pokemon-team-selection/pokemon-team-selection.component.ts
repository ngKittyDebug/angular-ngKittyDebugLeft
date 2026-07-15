import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import type { BattlePokemon } from '../../../../data/models/battle.model';
import { PokemonTeamSelectionFacade } from '../../../../data/facades/pokemon-team-selection.facade';

@Component({
  selector: 'left-paw-pokemon-team-selection',
  imports: [CommonModule, TranslocoDirective],
  providers: [PokemonTeamSelectionFacade],
  templateUrl: './pokemon-team-selection.component.html',
  styleUrl: './pokemon-team-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTeamSelectionComponent {
  public readonly facade = inject(PokemonTeamSelectionFacade);

  // Event handlers starting with "on" as per styleguide
  public onPokemonClick(pokemon: BattlePokemon): void {
    this.facade.selectPokemon(pokemon);
  }

  public onPrevClick(): void {
    this.facade.prevPage();
  }

  public onNextClick(): void {
    this.facade.nextPage();
  }

  public onStartBattleClick(): void {
    this.facade.startBattle();
  }
}
