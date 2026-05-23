import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'left-paw-auth-page',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent {
  protected loginRouterPath = 'login';
  protected signupRouterPath = 'signup';
}
