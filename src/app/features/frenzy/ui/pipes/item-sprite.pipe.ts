import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { ItemType } from '@game/frenzy/types';

import { itemSpritePathFor } from '../constants/sprite-registry';

@Pipe({ name: 'itemSprite' })
export class ItemSpritePipe implements PipeTransform {
  public transform(type: ItemType): string {
    return itemSpritePathFor(type);
  }
}
