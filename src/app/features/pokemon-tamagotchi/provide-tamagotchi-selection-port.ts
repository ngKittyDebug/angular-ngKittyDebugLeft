import type { Provider } from '@angular/core';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';
import { TamagotchiSelectionService } from './data/services/tamagotchi-selection.service';

/** App-level binding so other features inject only `TAMAGOTCHI_SELECTION_PORT`. */
export function provideTamagotchiSelectionPort(): Provider {
  return { provide: TAMAGOTCHI_SELECTION_PORT, useExisting: TamagotchiSelectionService };
}
