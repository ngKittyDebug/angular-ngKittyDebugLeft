import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon } from '@taiga-ui/core';
import { TuiProgressBar } from '@taiga-ui/kit';

import { GAME } from '@game/frenzy/constants';
import type { Stage } from '@game/frenzy/types';

import { getMood, type PokemonMood } from '../../../data/logic/pokemon-mood';
import { MassToneColorPipe } from '../../pipes/mass-tone-color.pipe';
import { StageRomanPipe } from '../../pipes/stage-roman.pipe';

const MAX_VISUAL_MASS = GAME.thresholds.stage3;

interface MoodVisual {
  icon: string;
  color: string;
}

const MOOD_VISUAL: Record<PokemonMood, MoodVisual> = {
  happy: { icon: '@tui.smile', color: 'var(--tui-status-positive)' },
  content: { icon: '@tui.meh', color: 'var(--tui-text-secondary)' },
  hungry: { icon: '@tui.frown', color: 'var(--tui-status-warning)' },
  starving: { icon: '@tui.skull', color: 'var(--tui-status-negative)' },
};

@Component({
  selector: 'left-paw-current-pokemon-status',
  imports: [MassToneColorPipe, StageRomanPipe, TranslocoDirective, TuiIcon, TuiProgressBar],
  templateUrl: './current-pokemon-status.component.html',
  styleUrl: './current-pokemon-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentPokemonStatusComponent {
  public readonly compact = input<boolean>(false);
  public readonly mass = input.required<number>();
  public readonly stage = input.required<Stage>();
  protected readonly max = MAX_VISUAL_MASS;
  protected readonly mood = computed<PokemonMood>(() => getMood(this.mass(), this.stage()));
  protected readonly moodVisual = computed<MoodVisual>(() => MOOD_VISUAL[this.mood()]);
}
