import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoDirective } from '@jsverse/transloco';
import { PokemonCardProfileComponent } from '../pokemon-card-profile/pokemon-card-profile.component';
import { TuiIcon } from '@taiga-ui/core';
import { UserProfileStore } from '../../../data/store/profile.store';

@Component({
  selector: 'left-paw-profile',
  imports: [TuiAvatar, TranslocoDirective, PokemonCardProfileComponent, TuiIcon],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  public achievementsList: string[] = ['exempleLong', 'exemple', 'exemple', 'exempleLong'];

  protected readonly store = inject(UserProfileStore);

  public ngOnInit(): void {
    this.store.loadProfile();
  }
}
