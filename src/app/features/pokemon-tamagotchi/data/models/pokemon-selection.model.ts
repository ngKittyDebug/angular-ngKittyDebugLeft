import type {
  PokemonSelectionError,
  SelectedPokemonReference,
  PokemonSelectionValidation as SharedPokemonSelectionValidation,
} from '@shared/models/tamagotchi-selection.model';
import type { PokemonModel } from './pokemon.model';

export type { PokemonSelectionError, SelectedPokemonReference };

export interface PokemonSelectionValidation extends Omit<
  SharedPokemonSelectionValidation,
  'pokemon'
> {
  pokemon?: PokemonModel;
}
