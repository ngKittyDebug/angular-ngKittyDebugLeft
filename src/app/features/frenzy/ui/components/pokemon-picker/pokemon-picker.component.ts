import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';

import type { ItemType, JoinRejectReason } from '@game/frenzy/types';

import { PlayerPersistenceService } from '../../../data/services/player-persistence.service';
import type { Line } from '../../constants/pokemon-registry';
import { knownLine, POKEMON_LINES } from '../../constants/pokemon-registry';
import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';
import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';

export interface PickerSubmission {
  name: string;
  line: Line;
}

@Component({
  selector: 'left-paw-pokemon-picker',
  imports: [ItemSpritePipe, PokemonSpritePipe, TranslocoDirective, TuiIcon],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPickerComponent {
  private readonly persistence = inject(PlayerPersistenceService);
  // Server's reason for refusing the last join (null = none); shown localized so the player sees why submit
  // didn't take. Cleared store-side on the next attempt.
  public readonly error = input<JoinRejectReason | null>(null);
  public readonly submitPicker = output<PickerSubmission>();
  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.selectedLine() !== null,
  );
  protected readonly lineOptions = POKEMON_LINES;
  // Item primer (2.3): a couple of obviously-good / obviously-bad items shown right in the picker so a first-timer
  // knows the basics before diving in. A curated subset — the full classification lives in the in-game HUD legend.
  protected readonly safeItems: readonly ItemType[] = ['food', 'rareCandy'];
  protected readonly dangerItems: readonly ItemType[] = ['bomb', 'rock'];
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
