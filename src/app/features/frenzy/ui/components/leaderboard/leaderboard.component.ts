import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHintDirective, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import type { Player, Stage } from '@game/frenzy/types';

import { PokemonSpritePipe } from '../../pipes/pokemon-sprite.pipe';
import { StageRomanPipe } from '../../pipes/stage-roman.pipe';

interface LeaderboardRow {
  appearance: string;
  id: string;
  isDisconnected: boolean;
  isMe: boolean;
  hp: number;
  name: string;
  rank: number;
  stage: Stage;
}

@Component({
  selector: 'left-paw-leaderboard',
  imports: [
    PokemonSpritePipe,
    StageRomanPipe,
    TranslocoDirective,
    TuiAvatar,
    TuiHintDirective,
    TuiIcon,
  ],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent {
  public readonly compact = input<boolean>(false);
  public readonly entries = input.required<readonly Player[]>();
  public readonly myId = input<string | null>(null);
  protected readonly rows = computed<readonly LeaderboardRow[]>(() => {
    const id = this.myId();

    return this.entries().map((player, index) => ({
      appearance: player.appearance,
      id: player.id,
      isDisconnected: player.status === 'disconnected',
      isMe: player.id === id,
      hp: Math.round(player.hp),
      name: player.name,
      rank: index + 1,
      stage: player.stage,
    }));
  });
  protected readonly leader = computed<LeaderboardRow | null>(() => this.rows()[0] ?? null);
}
