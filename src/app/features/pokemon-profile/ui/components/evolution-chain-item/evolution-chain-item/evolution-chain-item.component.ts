import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MyEvolutionNode } from '../../pokemon-profile-page/pokemon-profile-page.component';

@Component({
  selector: 'left-paw-evolution-chain-item',
  imports: [],
  templateUrl: './evolution-chain-item.component.html',
  styleUrl: './evolution-chain-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvolutionChainItemComponent {
  public readonly evolutionChain = input.required<MyEvolutionNode | null>();
  public readonly activeName = input<string | undefined>('');
}
