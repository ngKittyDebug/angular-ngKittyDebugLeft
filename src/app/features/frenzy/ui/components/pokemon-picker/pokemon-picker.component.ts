import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';

import { PlayerPersistenceService } from '../../../data/services/player-persistence.service';
import type { Line } from '../../constants/pokemon-registry';
import { POKEMON_LINES } from '../../constants/pokemon-registry';
import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';

export interface PickerSubmission {
  name: string;
  line: Line;
}

// Restore the last-played Pokémon only if it's still a known line — a stale/garbage stored value pre-selects
// nothing rather than silently falling back to an arbitrary roster entry.
function knownLine(appearance: string): Line | null {
  return POKEMON_LINES.some((option) => option.id === appearance) ? (appearance as Line) : null;
}

@Component({
  selector: 'left-paw-pokemon-picker',
  imports: [PokemonSpritePipe],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPickerComponent {
  private readonly persistence = inject(PlayerPersistenceService);
  public readonly submitPicker = output<PickerSubmission>();
  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.selectedLine() !== null,
  );
  protected readonly lineOptions = POKEMON_LINES;
  protected readonly name = signal(this.persistence.getName());
  protected readonly selectedLine = signal<Line | null>(
    knownLine(this.persistence.getAppearance()),
  );

  protected onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.name.set(target.value);
  }

  protected select(line: Line): void {
    this.selectedLine.set(line);
  }

  protected submit(): void {
    const line = this.selectedLine();

    if (line === null || !this.canSubmit()) {
      return;
    }

    this.submitPicker.emit({ name: this.name().trim(), line });
  }
}
