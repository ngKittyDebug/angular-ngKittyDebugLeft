import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiHintDirective, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import type { Player, Stage } from '@game/frenzy/types';

import { COLLAPSE_KEY, persistedCollapse } from '../../persisted-collapse';
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
  // A click anywhere on the open panel collapses it (a big, forgiving close target); a click OUTSIDE closes it too.
  // Mirrors the item legend. The toggle buttons stopPropagation so opening from the pill never reaches either.
  host: {
    '(click)': 'onCollapseIfOpen()',
    '(document:click)': 'onCollapseOnOutsideClick($event)',
  },
})
export class LeaderboardComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  public readonly entries = input.required<readonly Player[]>();
  public readonly myId = input<string | null>(null);
  // The crowned player id (alive hp-leader via the shared selector). The pill shows its crown only when the top
  // row IS the crown — otherwise (e.g. a disconnected top-hp player) it shows the name without a crown, matching
  // the scene. `entries` is sorted top-5 by raw hp, so its #1 isn't necessarily the alive crown.
  public readonly crownId = input<string | null>(null);
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

  // The current champion (top row), surfaced in the collapsed pill as crown + name + HP so the header still tells
  // you who's winning without expanding.
  protected readonly leader = computed<LeaderboardRow | null>(() => this.rows()[0] ?? null);

  // Restore the saved open/closed state; with none saved, default to expanded (desktop-only widget). A manual
  // toggle persists (via the signal's write-through) and thereafter wins over the default.
  protected readonly collapsed = persistedCollapse(COLLAPSE_KEY.leaderboard, () => false);

  protected onToggle(event: Event): void {
    // Keep the button's click from bubbling to the host `onCollapseIfOpen` — otherwise opening from the pill would
    // immediately bubble up and close again.
    event.stopPropagation();
    this.collapsed.update((value) => !value);
  }

  protected onCollapseIfOpen(): void {
    if (this.collapsed()) {
      return;
    }

    this.collapsed.set(true);
  }

  protected onCollapseOnOutsideClick(event: Event): void {
    if (this.collapsed() || this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.collapsed.set(true);
  }
}
