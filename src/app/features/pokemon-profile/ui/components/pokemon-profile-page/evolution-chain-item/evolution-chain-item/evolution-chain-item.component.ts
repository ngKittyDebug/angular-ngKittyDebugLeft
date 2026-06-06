import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TuiButton, TuiCarousel, TuiIcon } from '@taiga-ui/core';
import { TuiCard } from '@taiga-ui/layout';
import type { EvolutionNodeModel } from '../../pokemon-profile-page.component';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'left-paw-evolution-chain-item',
  imports: [TuiCard, TuiCarousel, TuiButton, TuiIcon, TranslocoDirective],
  templateUrl: './evolution-chain-item.component.html',
  styleUrl: './evolution-chain-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvolutionChainItemComponent {
  public readonly evolutionChain = input.required<EvolutionNodeModel>();
  public readonly activeName = input<string | undefined>('');
  protected readonly index = signal(0);
}
