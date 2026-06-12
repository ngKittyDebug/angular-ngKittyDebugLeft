import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

type MassTone = 'danger' | 'low' | 'ok';

const DANGER_THRESHOLD = FRENZY.lowMassWarningThreshold;
const LOW_THRESHOLD = FRENZY.startingMass / 2;

const TONE_COLOR: Record<MassTone, string> = {
  danger: 'var(--tui-status-negative)',
  low: 'var(--tui-status-warning)',
  ok: 'var(--tui-status-positive)',
};

function toneFor(mass: number): MassTone {
  if (mass <= DANGER_THRESHOLD) {
    return 'danger';
  }

  if (mass <= LOW_THRESHOLD) {
    return 'low';
  }

  return 'ok';
}

@Pipe({ name: 'massToneColor' })
export class MassToneColorPipe implements PipeTransform {
  public transform(mass: number): string {
    return TONE_COLOR[toneFor(mass)];
  }
}
