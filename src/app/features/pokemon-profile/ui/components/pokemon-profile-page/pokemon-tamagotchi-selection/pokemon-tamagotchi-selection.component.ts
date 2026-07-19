import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-pokemon-tamagotchi-selection',
  imports: [RouterLink, TranslocoDirective, TuiButton],
  templateUrl: './pokemon-tamagotchi-selection.component.html',
  styleUrl: './pokemon-tamagotchi-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTamagotchiSelectionComponent {
  public readonly isCurrentSelection = input(false);
  public readonly loading = input(false);
  public readonly tamagotchiRoute = input.required<string>();

  public readonly selectRequested = output<void>();

  protected onSelectClick(): void {
    if (this.loading() || this.isCurrentSelection()) {
      return;
    }

    this.selectRequested.emit();
  }
}
