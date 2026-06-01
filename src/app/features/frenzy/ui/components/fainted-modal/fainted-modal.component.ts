import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import type { ItemType } from '@game/frenzy/types';

import type { FaintedStats } from '../../../data/models/fainted-stats';
import { ItemSpritePipe } from '../../pipes/item-sprite.pipe';
import { StageRomanPipe } from '../../pipes/stage-roman.pipe';

interface BreakdownRow {
  count: number;
  type: ItemType;
}

const BREAKDOWN_ORDER: readonly ItemType[] = ['food', 'rareCandy', 'rotten', 'rock'];

@Component({
  selector: 'left-paw-fainted-modal',
  imports: [ItemSpritePipe, StageRomanPipe, TranslocoDirective, TuiAvatar, TuiButton],
  templateUrl: './fainted-modal.component.html',
  styleUrl: './fainted-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaintedModalComponent {
  public readonly cooldownSeconds = input.required<number>();
  public readonly respawnReady = input.required<boolean>();
  public readonly stats = input.required<FaintedStats>();
  public readonly chooseNew = output<void>();
  public readonly respawn = output<void>();
  protected readonly breakdown = computed<readonly BreakdownRow[]>(() => {
    const counts = this.stats().eatenByType;

    return BREAKDOWN_ORDER.map((type) => ({ count: counts[type], type })).filter(
      (row) => row.count > 0,
    );
  });
}
