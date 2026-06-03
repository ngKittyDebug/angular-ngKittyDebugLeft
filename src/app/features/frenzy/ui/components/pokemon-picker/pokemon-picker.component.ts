import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import type { Line } from '../../constants/pokemon-registry';
import { POKEMON_LINES } from '../../constants/pokemon-registry';
import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';

export interface PickerSubmission {
  name: string;
  line: Line;
}

@Component({
  selector: 'left-paw-pokemon-picker',
  imports: [PokemonSpritePipe],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPickerComponent {
  public readonly submitPicker = output<PickerSubmission>();
  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.selectedLine() !== null,
  );
  protected readonly lineOptions = POKEMON_LINES;
  protected readonly name = signal('');
  protected readonly selectedLine = signal<Line | null>(null);

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
