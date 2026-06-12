import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokemonCardDataService } from '@features/main-catalog/data/services/pokemon-card-data.service';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';

@Component({
  selector: 'left-paw-pokemon-card',
  imports: [TuiProgress, TuiBadge, TitleCasePipe, RouterLink],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardComponent {
  private readonly cardData = inject(PokemonCardDataService);
  public readonly pokemonName = input.required<string>();
  protected readonly pokemonCardData = this.cardData.createPokemonDataService(() =>
    this.pokemonName().toLowerCase(),
  );

  protected readonly pokemonLimitedStats = computed(() => {
    const data = this.pokemonCardData.cardData();

    return data?.stats?.slice(0, 3) ?? [];
  });
}
