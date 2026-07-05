import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TamagotchiStorageService {
  public getItem(key: string): string | null {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }

    return globalThis.localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return;
    }

    globalThis.localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return;
    }

    globalThis.localStorage.removeItem(key);
  }
}
