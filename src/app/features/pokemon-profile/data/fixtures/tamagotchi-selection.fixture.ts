import type { TamagotchiSelectionPokemon } from '@shared/models/tamagotchi-selection.model';

export const PIKACHU_SELECTION_FIXTURE = {
  id: '25',
  isFirstStage: true,
  name: 'Pikachu',
  species: 'pikachu',
} as const satisfies TamagotchiSelectionPokemon;
