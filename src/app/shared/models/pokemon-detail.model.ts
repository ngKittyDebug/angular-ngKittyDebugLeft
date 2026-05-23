export interface PokemonDetailModel {
  id: number;
  name: string;
  height: number;
  weight: number;
  imageUrl: string;
  shinyImageUrl: string;
  typeList: string[];
  abilityList: PokemonAbilityModel[];
  statList: PokemonStatModel[];
  generation: string;
  description: string;
}

export interface PokemonAbilityModel {
  name: string;
  isHidden: boolean;
}

export interface PokemonStatModel {
  name: string;
  baseStat: number;
}
