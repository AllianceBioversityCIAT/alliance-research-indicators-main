import { ExecutionContext, Logger } from '@nestjs/common';
import { env } from 'process';

export class LoggerUtil {
  private readonly logger: Logger;
  private readonly componentName: string;

  constructor(config: LoggerUtilDto) {
    this.componentName = this.getComponentName(config);
    this.logger = new Logger(env.ARI_APP_NAME);
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
    if (additional) {
      return `${componentName} [${additional.method}]: ${additional.url}`;
    }
    return componentName;
  }

  private formatMessage(
    message: string,
    additionalParams: LoggerUtilAdditionalDto,
  ): string {
    return `${this.appendAdditionalInfo(this.componentName, additionalParams)} ${message}`;
  }

  log(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    this.logger.log(this.formatMessage(message, additionalParams));
  }
  error(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    this.logger.error(this.formatMessage(message, additionalParams));
  }
  warn(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    this.logger.warn(this.formatMessage(message, additionalParams));
  }
  debug?(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    this.logger.debug(this.formatMessage(message, additionalParams));
  }
  verbose?(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    this.logger.verbose(this.formatMessage(message, additionalParams));
  }
  fatal?(message: any, additionalParams?: LoggerUtilAdditionalDto): void {
    this.logger.fatal(this.formatMessage(message, additionalParams));
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
}
