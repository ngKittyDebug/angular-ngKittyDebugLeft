import type { ElementRef } from '@angular/core';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
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
  private readonly pageTitle = viewChild<ElementRef<HTMLElement>>('pageTitle');
  private readonly systemNotice = viewChild<ElementRef<HTMLElement>>('systemNotice');
  private focusInitialized = false;
  private hadSystemNotice = false;
  private wasLoading = false;

  public readonly facade = inject(TamagotchiFacade);

  public constructor() {
    this.facade.bootstrapFromProfile();

    afterRenderEffect(() => {
      const loading = this.facade.isLoading();
      const noticeKey = this.facade.systemErrorMessageKey();
      const titleElement = this.pageTitle()?.nativeElement;
      const noticeElement = this.systemNotice()?.nativeElement;
      const noticeVisible = noticeKey !== null;

      if (!this.focusInitialized) {
        this.focusInitialized = true;
        this.wasLoading = loading;
        this.hadSystemNotice = noticeVisible;

        if (noticeVisible && noticeElement) {
          noticeElement.focus();
        }

        return;
      }

      if (noticeVisible && noticeElement && !this.hadSystemNotice) {
        noticeElement.focus();
      } else if ((!loading && this.wasLoading) || (!noticeVisible && this.hadSystemNotice)) {
        titleElement?.focus();
      }

      this.wasLoading = loading;
      this.hadSystemNotice = noticeVisible;
    });
  }
}
