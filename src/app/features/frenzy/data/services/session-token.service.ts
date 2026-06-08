import { Injectable } from '@angular/core';

const STORAGE_KEY = 'frenzy-session-token';
const NAME_KEY = 'frenzy-player-name';

@Injectable()
export class SessionTokenService {
  public getName(): string {
    return globalThis.localStorage?.getItem(NAME_KEY) ?? '';
  }

  public getOrCreateToken(): string {
    const storage = globalThis.sessionStorage;
    const existing = storage?.getItem(STORAGE_KEY);

    if (existing !== null && existing !== undefined && existing.length > 0) {
      return existing;
    }

    const fresh = globalThis.crypto.randomUUID();

    storage?.setItem(STORAGE_KEY, fresh);

    return fresh;
  }

  public saveName(name: string): void {
    globalThis.localStorage?.setItem(NAME_KEY, name);
  }
}
