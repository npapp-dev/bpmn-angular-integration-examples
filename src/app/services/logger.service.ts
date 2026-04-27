import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Silent = 4,
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly level: LogLevel = environment.production ? LogLevel.Warn : LogLevel.Debug;

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.Debug) {
      // eslint-disable-next-line no-console
      console.debug(message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.Info) {
      // eslint-disable-next-line no-console
      console.info(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.Warn) {
      // eslint-disable-next-line no-console
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.Error) {
      // eslint-disable-next-line no-console
      console.error(message, ...args);
    }
  }
}
