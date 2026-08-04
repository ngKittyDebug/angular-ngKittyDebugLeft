import { Service } from '@angular/core';
import { environment } from '@environments/environment';

@Service({ autoProvided: false })
export class TamagotchiLoggerService {
  public error(context: string, message: string): void {
    if (!environment.production) {
      console.error(`[Tamagotchi:${context}]`, message);
    }
  }

  public logError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    this.error(context, message);
  }
}
