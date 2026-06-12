import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

type HpTone = 'danger' | 'low' | 'ok';

const DANGER_THRESHOLD = FRENZY.lowHpWarningThreshold;
const LOW_THRESHOLD = FRENZY.startingHp / 2;

const TONE_COLOR: Record<HpTone, string> = {
  danger: 'var(--tui-status-negative)',
  low: 'var(--tui-status-warning)',
  ok: 'var(--tui-status-positive)',
};

function toneFor(hp: number): HpTone {
  if (hp <= DANGER_THRESHOLD) {
    return 'danger';
  }

  if (hp <= LOW_THRESHOLD) {
    return 'low';
  }

  return 'ok';
}

@Pipe({ name: 'hpToneColor' })
export class HpToneColorPipe implements PipeTransform {
  public transform(hp: number): string {
    return TONE_COLOR[toneFor(hp)];
  }
}
