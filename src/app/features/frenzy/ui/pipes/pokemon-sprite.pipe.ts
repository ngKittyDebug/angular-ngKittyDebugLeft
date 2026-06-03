import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { Stage } from '@game/frenzy/types';

import { spritePathFor } from '../constants/pokemon-registry';

@Pipe({ name: 'pokemonSprite' })
export class PokemonSpritePipe implements PipeTransform {
  public transform(appearance: string, stage: Stage = 1): string {
    return spritePathFor(appearance, stage);
  }
}
