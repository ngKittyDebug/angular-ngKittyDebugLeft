import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiLoader, TuiNotification, TuiTitle } from '@taiga-ui/core';
import { TuiBadge, TuiSegmented } from '@taiga-ui/kit';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { TamagotchiFacade } from '../../../data/facades/tamagotchi.facade';
import { ActionButtonsComponent } from '../action-buttons/action-buttons.component';
import { EvolutionAnimationComponent } from '../evolution-animation/evolution-animation.component';
import { NotificationComponent } from '../notifications/notification.component';
import { PokemonSpriteComponent } from '../pokemon-sprite/pokemon-sprite.component';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

@Component({
  selector: 'left-paw-pokemon-tamagotchi-page',
  imports: [
    ActionButtonsComponent,
    EvolutionAnimationComponent,
    NotificationComponent,
    PokemonSpriteComponent,
    RouterLink,
    StatusIndicatorComponent,
    TranslocoDirective,
    TuiBadge,
    TuiBlockStatus,
    TuiButton,
    TuiLoader,
    TuiNotification,
    TuiSegmented,
    TuiTitle,
  ],
  templateUrl: './pokemon-tamagotchi-page.component.html',
  styleUrl: './pokemon-tamagotchi-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonTamagotchiPageComponent {
  public readonly facade = inject(TamagotchiFacade);

  public constructor() {
    this.facade.bootstrapFromProfile();
  }
}
