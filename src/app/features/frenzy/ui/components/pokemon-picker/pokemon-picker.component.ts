import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  TuiButton,
  TuiIcon,
  TuiInput,
  TuiTextfieldComponent,
  TuiTextfieldOptionsDirective,
} from '@taiga-ui/core';

import type { ItemType, JoinRejectReason } from '@game/frenzy/types';

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
  imports: [
    ItemSpritePipe,
    PokemonSpritePipe,
    TranslocoDirective,
    TuiButton,
    TuiIcon,
    TuiInput,
    TuiTextfieldComponent,
    TuiTextfieldOptionsDirective,
  ],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonPickerComponent {
  // Server's reason for refusing the last join (null = none); shown localized so the player sees why submit
  // didn't take. Cleared store-side on the next attempt.
  public readonly error = input<JoinRejectReason | null>(null);
  // The player's last saved identity, supplied by the page facade (the picker no longer reads persistence itself —
  // ADR 0004 §2). They seed the editable fields below; a returning player sees their name/Pokémon pre-filled.
  public readonly initialName = input<string>('');
  public readonly initialAppearance = input<string>('');
  public readonly submitPicker = output<PickerSubmission>();
  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.selectedLine() !== null,
  );
  protected readonly lineOptions = POKEMON_LINES;
  // Item primer (2.3): a couple of obviously-good / obviously-bad items shown right in the picker so a first-timer
  // knows the basics before diving in. A curated subset — the full classification lives in the in-game HUD legend.
  protected readonly safeItems: readonly ItemType[] = ['food', 'rareCandy'];
  protected readonly dangerItems: readonly ItemType[] = ['bomb', 'rock'];
  // Seed the editable fields from the supplied identity. `linkedSignal` so the seed lands once the inputs resolve
  // (they bind after construction); a user edit thereafter sticks (the inputs are read-once and never change again).
  protected readonly name = linkedSignal<string>(() => this.initialName());
  protected readonly selectedLine = linkedSignal<Line | null>(() =>
    knownLine(this.initialAppearance()),
  );

  protected onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;

    this.name.set(target.value);
  }

  protected onSelect(line: Line): void {
    this.selectedLine.set(line);
  }

  protected onSubmit(): void {
    const line = this.selectedLine();

    if (line === null || !this.canSubmit()) {
      return;
    }

    this.submitPicker.emit({ name: this.name().trim(), line });
  }
}
