import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TuiButton, TuiCarousel, TuiIcon } from '@taiga-ui/core';
import { TuiCard } from '@taiga-ui/layout';
import { TranslocoDirective } from '@jsverse/transloco';
import type { EvolutionNodeModel } from '@features/pokemon-profile/data/services/pokemon-profile.service';
import { PokemonProfileService } from '@features/pokemon-profile/data/services/pokemon-profile.service';

@Component({
  selector: 'left-paw-evolution-chain-item',
  imports: [TuiCard, TuiCarousel, TuiButton, TuiIcon, TranslocoDirective],
  templateUrl: './evolution-chain-item.component.html',
  styleUrl: './evolution-chain-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvolutionChainItemComponent {
  private readonly profileService = inject(PokemonProfileService);

  public readonly evolutionChain = input.required<EvolutionNodeModel>();
  public readonly activeName = input<string | undefined>('');
  protected readonly index = signal(0);

  protected readonly evolutionCardData = this.profileService.createPokemonData(
    () => this.evolutionChain().name,
  );
}
