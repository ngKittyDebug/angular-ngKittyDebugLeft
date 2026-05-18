import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';

const NOT_FOUND_GIF_URL = 'images/gif/not-found.gif';

@Component({
  selector: 'left-paw-not-found-page',
  imports: [TuiButton, RouterLink],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPageComponent {
  protected imageUrl = NOT_FOUND_GIF_URL;
}
