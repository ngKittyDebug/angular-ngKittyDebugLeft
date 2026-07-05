export interface SelectedPokemonReference {
  id: string;
  name: string;
  species: string;
}

export type PokemonSelectionError = 'evolvedPokemon' | 'loadFailed' | 'noSelection';

export interface TamagotchiSelectionPokemon {
  id: string;
  isFirstStage: boolean;
  name: string;
  species: string;
}

export interface PokemonSelectionValidation {
  error?: PokemonSelectionError;
  pokemon?: TamagotchiSelectionPokemon;
  valid: boolean;
}
