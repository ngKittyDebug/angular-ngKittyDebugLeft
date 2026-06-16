import { computed, Service, signal } from '@angular/core';

@Service()
export class AuthService {
  private readonly accessToken = signal<string | null>(null);

  public readonly getToken = computed(() => this.accessToken());

  private saveToken(token: string): void {
    this.accessToken.set(token);
  }

  private clearToken(): void {
    this.accessToken.set(null);
  }
}
