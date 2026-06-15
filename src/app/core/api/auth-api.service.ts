import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_SERVER_URL_TOKEN } from '@core/tokens/auth-server-url.token';

@Service()
export class AuthApiService {
  private readonly authURLToken = inject<string>(AUTH_SERVER_URL_TOKEN);
  private readonly httpClient = inject(HttpClient);

  public onAuthSubmit() {
    return this.httpClient.get(this.authURLToken);
  }
}
