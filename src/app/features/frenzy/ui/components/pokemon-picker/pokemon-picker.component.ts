import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import { LINES } from '@game/frenzy/lines';
import type { Line } from '@game/frenzy/types';

import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';

export interface PickerSubmission {
  name: string;
  line: Line;
}

interface LineOption {
  id: Line;
  label: string;
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
  protected readonly lineOptions: readonly LineOption[] = LINES.map((line) => ({
    id: line.id,
    label: line.label,
  }));
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
