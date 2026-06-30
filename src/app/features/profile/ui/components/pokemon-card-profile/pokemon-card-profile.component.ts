import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokemonDataService } from '@shared/services/pokemon-data.service';

@Component({
  selector: 'left-paw-pokemon-card-profile',
  imports: [RouterLink],
  templateUrl: './pokemon-card-profile.component.html',
  styleUrl: './pokemon-card-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonCardProfileComponent {
  public readonly pokemonName = input.required<string>();

  protected readonly pokemon = inject(PokemonDataService).createPokemonCardData(() =>
    this.pokemonName(),
  );
}
