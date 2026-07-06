import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { GAMES_LIST } from '../../../data/constants/games-list.constants';
import { GameCardComponent } from '../game-card/game-card.component';

@Component({
  selector: 'left-paw-games-page',
  imports: [GameCardComponent, TranslocoDirective],
  templateUrl: './games-page.component.html',
  styleUrl: './games-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesPageComponent {
  protected readonly gamesList = GAMES_LIST;
}
