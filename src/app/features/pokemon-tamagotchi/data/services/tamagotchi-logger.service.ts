import { Service } from '@angular/core';
import { environment } from '@environments/environment';

export type TamagotchiLogLevel = 'debug' | 'error' | 'info' | 'warn';

export interface TamagotchiLogEntry {
  context: string;
  level: TamagotchiLogLevel;
  message: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp: number;
}

const MAX_LOG_ENTRIES = 100;

@Service({ autoProvided: false })
export class TamagotchiLoggerService {
  private readonly entries: TamagotchiLogEntry[] = [];

  public debug(context: string, message: string, metadata?: TamagotchiLogEntry['metadata']): void {
    this.append('debug', context, message, metadata);
  }

  public info(context: string, message: string, metadata?: TamagotchiLogEntry['metadata']): void {
    this.append('info', context, message, metadata);
  }

  public warn(context: string, message: string, metadata?: TamagotchiLogEntry['metadata']): void {
    this.append('warn', context, message, metadata);
  }

  public error(context: string, message: string, metadata?: TamagotchiLogEntry['metadata']): void {
    this.append('error', context, message, metadata);
  }

  public logError(
    context: string,
    error: unknown,
    metadata?: TamagotchiLogEntry['metadata'],
  ): void {
    const message = error instanceof Error ? error.message : String(error);

    this.error(context, message, metadata);
  }

  private append(
    level: TamagotchiLogLevel,
    context: string,
    message: string,
    metadata?: TamagotchiLogEntry['metadata'],
  ): void {
    const entry: TamagotchiLogEntry = {
      context,
      level,
      message,
      metadata,
      timestamp: Date.now(),
    };

    this.entries.push(entry);

    if (this.entries.length > MAX_LOG_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_LOG_ENTRIES);
    }

    const prefix = `[Tamagotchi:${context}]`;

    if (!environment.production) {
      if (level === 'error') {
        console.error(prefix, message, metadata ?? '');
      } else if (level === 'warn') {
        console.warn(prefix, message, metadata ?? '');
      }
    }
  }
}
