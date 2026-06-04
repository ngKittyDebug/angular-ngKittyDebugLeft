import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoDirective } from '@jsverse/transloco';
import { CatalogPageMocks } from '@features/main-catalog/ui/components/main-catalog-page/constants/catalog-page-mocks';
import { FavoritesCardComponent } from '../favorites-card/favorites-card/favorites-card.component';

@Component({
  selector: 'left-paw-profile',
  imports: [TuiAvatar, TranslocoDirective, FavoritesCardComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  protected readonly sizes = ['xxl', 'xl', 'l', 'm', 's', 'xs'] as const;
  protected readonly favorites = CatalogPageMocks;
  // TODO вместо моков будет использоваться список любимых из юзера (наверное)
}
