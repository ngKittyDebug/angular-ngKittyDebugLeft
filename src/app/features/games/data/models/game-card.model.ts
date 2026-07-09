export type GameCardId = 'comingSoon' | 'frenzy' | 'pokemonBattle' | 'tamagotchi';

export interface GameCardModel {
  id: GameCardId;
  routePath?: string;
  gifSource: string;
}
