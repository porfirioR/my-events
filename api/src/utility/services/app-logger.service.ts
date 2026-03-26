import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppLoggerService {
  private readonly loggers = new Map<string, Logger>();

  private getLogger(context: string): Logger {
    if (!this.loggers.has(context)) {
      this.loggers.set(context, new Logger(context));
    }
    return this.loggers.get(context)!;
  }

  log(message: string, context: string): void {
    this.getLogger(context).log(message);
  }

  warn(message: string, context: string): void {
    this.getLogger(context).warn(message);
  }

  error(message: string, context: string, trace?: string): void {
    this.getLogger(context).error(message, trace);
  }

  debug(message: string, context: string): void {
    this.getLogger(context).debug(message);
  }
}
