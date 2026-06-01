import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

import type { FloatingTone } from '../../../data/models/floating-message';

@Component({
  selector: 'left-paw-floating-text',
  imports: [TuiIcon],
  templateUrl: './floating-text.component.html',
  styleUrl: './floating-text.component.scss',
  host: {
    class: 'floating-text',
    '[class.floating-text--positive]': "tone() === 'positive'",
    '[class.floating-text--negative]': "tone() === 'negative'",
    '[class.floating-text--neutral]': "tone() === 'neutral'",
    '[class.floating-text--warning]': "tone() === 'warning'",
    '[class.floating-text--floor]': 'floor()',
    '[style.animation-duration.ms]': 'durationMs()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingTextComponent {
  public readonly who = input<string>();
  public readonly text = input.required<string>();
  public readonly delta = input<number>();
  public readonly tone = input<FloatingTone>('neutral');
  public readonly icon = input<string>();
  public readonly durationMs = input(1000);
  public readonly floor = input(false);

  protected readonly deltaLabel = computed(() => {
    const value = this.delta();

    if (value === undefined) {
      return null;
    }

    return value > 0 ? `+${value}` : `${value}`;
  });
}
