import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import type { Stage } from '@game/frenzy/types';

const ROMAN: Record<Stage, string> = { 1: 'I', 2: 'II', 3: 'III' };

@Pipe({ name: 'stageRoman' })
export class StageRomanPipe implements PipeTransform {
  public transform(stage: Stage): string {
    return ROMAN[stage];
  }
}
