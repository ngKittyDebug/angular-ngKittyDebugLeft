import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoDirective } from '@jsverse/transloco';
import { CatalogPageMocks } from '@features/main-catalog/ui/components/main-catalog-page/constants/catalog-page-mocks';
import { PokemonCardProfileComponent } from '../pokemon-card-profile/pokemon-card-profile.component';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'left-paw-profile',
  imports: [TuiAvatar, TranslocoDirective, PokemonCardProfileComponent, TuiIcon],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  public achievements: string[] = ['exempleLong', 'exemple', 'exemple', 'exempleLong'];
  // TODO сейчас используется масив звтычка, чтобы посмотреть как будет отробатывать прорисовка

  protected readonly sizes = ['xxl', 'xl', 'l', 'm', 's', 'xs'] as const;
  protected readonly favoritesList = CatalogPageMocks;
  protected readonly caughtList = CatalogPageMocks;
  // TODO вместо моков будет использоваться список любимых из юзера (наверное)
}
