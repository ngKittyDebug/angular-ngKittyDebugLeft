export interface PokemonListItemApiData {
  name: string;
  url: string;
}

export interface PokemonListApiData {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItemApiData[];
}
