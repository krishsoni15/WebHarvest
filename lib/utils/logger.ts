/**
 * WebHarvest Structured Logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class Logger {
  constructor(private scope: string = 'WebHarvest') {}

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message: `[${this.scope}] ${message}`,
      timestamp: new Date().toISOString(),
      context,
    };

    if (level === 'error') {
      console.error(entry.message, context || '');
    } else if (level === 'warn') {
      console.warn(entry.message, context || '');
    } else {
      console.log(entry.message, context || '');
    }
  }

  debug(msg: string, ctx?: Record<string, any>) {
    this.log('debug', msg, ctx);
  }

  info(msg: string, ctx?: Record<string, any>) {
    this.log('info', msg, ctx);
  }

  warn(msg: string, ctx?: Record<string, any>) {
    this.log('warn', msg, ctx);
  }

  error(msg: string, ctx?: Record<string, any>) {
    this.log('error', msg, ctx);
  }
}

export const logger = new Logger();
