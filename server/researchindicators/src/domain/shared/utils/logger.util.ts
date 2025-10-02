import { ExecutionContext, Logger } from '@nestjs/common';
import { env } from 'process';

export class LoggerUtil extends Logger {
  private readonly componentName: string;

  constructor(config: LoggerUtilDto) {
    super(env.ARI_APP_NAME);
    this.componentName = this.getComponentName(config);
  }

  private getComponentName(config?: any): string {
    if (config?.context) {
      return this.getComponentNameFromContext(
        config.context as ExecutionContext,
      );
    } else if (config?.name) {
      return `[${config.name}]`;
    } else if (config?.stack) {
      return this.getComponentNameFromStack(config.stack);
    } else if (config?.custom) {
      return `[${config.custom.class}] [${config.custom.function}]`;
    } else {
      return '[System]';
    }
  }

  private getComponentNameFromContext(context: ExecutionContext): string {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const handlerName = handler.name;
    return `[${className}] [${handlerName}]`;
  }

  private getComponentNameFromStack(stack: string): string {
    if (!stack) return '[UnknownClass] [UnknownMethod]';

    const classRegex = /at\s(.*?)\./;
    const handlerRegex = /\.(\w+)\s\(/;

    const classMatch = classRegex.exec(stack || '');
    const handlerMatch = handlerRegex.exec(stack || '');

    const className = classMatch?.[1] || 'UnknownClass';
    const handlerName = handlerMatch?.[1] || 'UnknownMethod';
    return `[${className}] [${handlerName}]`;
  }

  private appendAdditionalInfo(
    componentName: string,
    additional?: LoggerUtilAdditionalDto,
  ): string {
    let message = componentName;
    if (additional) {
      if (additional.method) {
        message += ` [${additional.method}]`;
      }
      if (additional.userId) {
        message += ` [USER_ID:${additional.userId}]`;
      }
      if (additional.url) {
        message += `: ${additional.url}`;
      }
    }
    return message;
  }

  private formatMessage(
    message: string,
    additionalParams: LoggerUtilAdditionalDto,
  ): string {
    return `${this.appendAdditionalInfo(this.componentName, additionalParams)} ${message}`;
  }

  _log(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    super.log(this.formatMessage(message, additionalParams));
  }
  _error(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    super.error(this.formatMessage(message, additionalParams));
  }
  _warn(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    super.warn(this.formatMessage(message, additionalParams));
  }
  _debug(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    super.debug(this.formatMessage(message, additionalParams));
  }
  _verbose(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    super.verbose(this.formatMessage(message, additionalParams));
  }
  _fatal(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    super.error(this.formatMessage(message, additionalParams));
  }
}

export class LoggerUtilDto {
  public name?: string;
  public context?: ExecutionContext;
  public stack?: string;
  public custom?: LoggerUtilCustomDto;
}

export class LoggerUtilCustomDto {
  class: string;
  function: string;
}

export class LoggerUtilAdditionalDto {
  public url?: string;
  public method?: string;
  public userId?: string;
}
