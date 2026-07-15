import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiCheckbox, TuiLoader } from '@taiga-ui/core';
import { TuiPagination } from '@taiga-ui/kit';
import type { BattlePokemon } from '../../../../data/models/battle.model';
import { PokemonTeamSelectionFacade } from '../../../../data/facades/pokemon-team-selection.facade';

@Component({
  selector: 'left-paw-pokemon-team-selection',
  imports: [UpperCasePipe, TranslocoDirective, TuiButton, TuiCheckbox, TuiLoader, TuiPagination],
  providers: [PokemonTeamSelectionFacade],
  templateUrl: './pokemon-team-selection.component.html',
  styleUrl: './pokemon-team-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTeamSelectionComponent {
  public readonly facade = inject(PokemonTeamSelectionFacade);

  public get pageCount(): number {
    return Math.ceil(this.facade.totalCount() / this.facade.limit());
  }

  public onPokemonClick(pokemon: BattlePokemon): void {
    this.facade.selectPokemon(pokemon);
  }

  public onPrevClick(): void {
    this.facade.prevPage();
  }

  public onNextClick(): void {
    this.facade.nextPage();
  }

  public onPageChange(index: number): void {
    this.facade.setPage(index);
  }

  public onStartBattleClick(): void {
    this.facade.startBattle();
  }
}
