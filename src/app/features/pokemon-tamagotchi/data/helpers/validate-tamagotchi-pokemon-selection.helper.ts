import type {
  PokemonSelectionValidation,
  TamagotchiSelectionPokemon,
} from '@shared/models/tamagotchi-selection.model';

export function isFirstStageTamagotchiPokemon(pokemon: TamagotchiSelectionPokemon): boolean {
  return pokemon.isFirstStage;
}

export function validateTamagotchiPokemonSelection(
  pokemon: TamagotchiSelectionPokemon,
): PokemonSelectionValidation {
  if (!isFirstStageTamagotchiPokemon(pokemon)) {
    return {
      error: 'evolvedPokemon',
      valid: false,
    };
  }

  return {
    pokemon,
    valid: true,
  };
}
