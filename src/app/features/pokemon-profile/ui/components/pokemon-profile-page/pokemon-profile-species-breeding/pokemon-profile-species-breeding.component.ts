import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiBadge, TuiProgress } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { TranslocoDirective } from '@jsverse/transloco';
import type { PokemonSpeciesApiData } from '@shared/models/pokemon-species-api-data-interface';
import { PercentagePipe } from '@shared/pipes/percentage.pipe';
import {
  MAX_HATCH_COUNTER,
  STEPS_PER_HATCH_CYCLE,
} from '@features/pokemon-profile/data/constants/pokemon-profile.constants';

@Component({
  selector: 'left-paw-pokemon-profile-species-breeding',
  imports: [TuiHeader, TuiBadge, TuiProgress, TranslocoDirective, PercentagePipe],
  templateUrl: './pokemon-profile-species-breeding.component.html',
  styleUrl: './pokemon-profile-species-breeding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfileSpeciesBreedingComponent {
  public readonly pokemonProfileDataSpecies = input.required<PokemonSpeciesApiData>();

  protected readonly stepsPerHatchCycle = STEPS_PER_HATCH_CYCLE;
  protected readonly maxHatchCounter = MAX_HATCH_COUNTER;
}
