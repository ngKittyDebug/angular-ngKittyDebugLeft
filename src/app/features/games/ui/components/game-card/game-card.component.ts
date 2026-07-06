import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import type { GameCardModel } from '../../../data/models/game-card.model';

@Component({
  selector: 'left-paw-game-card',
  imports: [NgTemplateOutlet, RouterLink, TranslocoDirective],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCardComponent {
  public readonly game = input.required<GameCardModel>();
}
