import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TuiButton, TuiCarousel, TuiIcon } from '@taiga-ui/core';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import type { EvolutionNodeModel } from '../../pokemon-profile-page.component';

@Component({
  selector: 'left-paw-evolution-chain-item',
  imports: [TuiCard, TuiCarousel, TuiProgress, TuiButton, TuiIcon],
  templateUrl: './evolution-chain-item.component.html',
  styleUrl: './evolution-chain-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvolutionChainItemComponent {
  public readonly evolutionChain = input.required<EvolutionNodeModel | null | undefined>();
  public readonly activeName = input<string | undefined>('');
  protected readonly index = signal(0);
}
