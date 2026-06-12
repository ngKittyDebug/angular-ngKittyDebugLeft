import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiAvatar, TuiBadge, TuiProgressBar } from '@taiga-ui/kit';

import { FRENZY } from '@game/frenzy/config';
import type { PlayerBody, Stage } from '@game/frenzy/types';

import { getMood, type PokemonMood } from '../../../data/logic/pokemon-mood';
import { HpFlashDirective } from '../../directives/hp-flash.directive';
import { HpToneColorPipe } from '../../pipes/hp-tone-color.pipe';

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
  imports: [
    HpFlashDirective,
    HpToneColorPipe,
    TranslocoDirective,
    TuiAvatar,
    TuiBadge,
    TuiProgressBar,
  ],
  templateUrl: './current-pokemon-status.component.html',
  styleUrl: './current-pokemon-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentPokemonStatusComponent {
  public readonly compact = input<boolean>(false);
  public readonly name = input.required<string>();
  public readonly hp = input.required<number>();
  public readonly stage = input.required<Stage>();
  // My Pokémon's per-stage descriptor — the next-evolution threshold reads off its hp gates (no global thresholds).
  public readonly body = input.required<PlayerBody>();
  // The bar uses one absolute scale (0 → hard ceiling); a tick marks the next-evolution threshold along it, and
  // `untilEvolution` is the HP still needed to reach it — both vanish on the final stage (nothing left to reach).
  protected readonly maxHp = FRENZY.maxHp;
  protected readonly mood = computed<PokemonMood>(() => getMood(this.hp(), this.stage()));
  protected readonly moodVisual = computed<MoodVisual>(() => MOOD_VISUAL[this.mood()]);
  protected readonly nextThreshold = computed<number>(() => {
    const body = this.body();

    if (this.stage() === 1) {
      return body[2].hp;
    }

    if (this.stage() === 2) {
      return body[3].hp;
    }

    return FRENZY.maxHp;
  });
  protected readonly thresholdPercent = computed<number>(
    () => (this.nextThreshold() / FRENZY.maxHp) * 100,
  );
  protected readonly untilEvolution = computed<number | null>(() => {
    if (this.stage() === 3) {
      return null;
    }

    return this.nextThreshold() - this.hp();
  });
}
