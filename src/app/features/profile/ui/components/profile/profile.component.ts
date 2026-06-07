import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoDirective } from '@jsverse/transloco';
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
  public achievementsList: string[] = ['exempleLong', 'exemple', 'exemple', 'exempleLong'];
  // TODO сейчас используется масив звтычка, чтобы посмотреть как будет отробатывать прорисовка

  protected readonly favoritesList: { results: { name: string }[] } = {
    results: [],
  };

  protected readonly caughtList: { results: { name: string }[] } = {
    results: [],
  };
  // TODO будет использоваться список любимых из юзера (наверное)
}
