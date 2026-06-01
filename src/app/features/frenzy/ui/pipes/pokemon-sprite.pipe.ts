import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { Line, Stage } from '@game/frenzy/types';

import { spritePathFor } from '../constants/sprite-registry';

@Pipe({ name: 'pokemonSprite' })
export class PokemonSpritePipe implements PipeTransform {
  public transform(line: Line, stage: Stage = 1): string {
    return spritePathFor(line, stage);
  }
}
