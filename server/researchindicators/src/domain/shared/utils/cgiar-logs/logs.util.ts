import { ExecutionContext, Logger } from '@nestjs/common';
import { env } from 'process';
import {
  CYAN_BRIGHT,
  GREEN,
  MAGENTA_BRIGHT,
  RED,
  RESET,
  YELLOW,
} from './const/colors.const';
import { ORDER_ADDITIONAL_INFO } from './const/order-aditional-info.const';

export class CgiarLogger extends Logger {
  private readonly headerName: string;
  private name: string;

  constructor(name: string) {
    super(env.ARI_APP_NAME);
    this.headerName = this._prepareComponentName(name);
  }

  debug(message: any, context?: LoggerAdditionalInfo | string): void {
    const formattedMessage = this._formatMessage(
      message,
      MAGENTA_BRIGHT,
      context as LoggerAdditionalInfo,
    );
    super.debug(formattedMessage);
  }

  error(message: any, context?: LoggerAdditionalInfo | string): void {
    const formattedMessage = this._formatMessage(
      message,
      RED,
      context as LoggerAdditionalInfo,
    );
    super.error(formattedMessage);
  }

  warn(message: any, context?: LoggerAdditionalInfo | string): void {
    const formattedMessage = this._formatMessage(
      message,
      YELLOW,
      context as LoggerAdditionalInfo,
    );
    super.warn(formattedMessage);
  }

  verbose(message: any, context?: LoggerAdditionalInfo | string): void {
    const formattedMessage = this._formatMessage(
      message,
      CYAN_BRIGHT,
      context as LoggerAdditionalInfo,
    );
    super.verbose(formattedMessage);
  }

  log(message: unknown, context?: LoggerAdditionalInfo | string): void {
    const formattedMessage = this._formatMessage(
      message,
      GREEN,
      context as LoggerAdditionalInfo,
    );
    super.log(formattedMessage);
  }

  fatal(message: unknown, context?: LoggerAdditionalInfo | string): void {
    const formattedMessage = this._formatMessage(
      message,
      RESET,
      context as LoggerAdditionalInfo,
    );
    super.fatal(formattedMessage);
  }

  private _formatTitle(
    color: string,
    isHeader: boolean = true,
  ): (...titles: string[]) => string {
    return (...titles: string[]): string => {
      const formattedTitles = titles
        ?.map((title) => (isHeader ? `[${title.trim()}]` : title.trim()))
        .join(' ');
      return `${color}${formattedTitles}${RESET}`;
    };
  }

  private _formatMessage(
    message: any,
    color: string,
    config?: LoggerAdditionalInfo,
  ): string {
    let formattedMessage = '';
    if (typeof message === 'string') {
      formattedMessage = message;
    } else {
      try {
        formattedMessage = JSON.stringify(message);
        /* eslint-disable @typescript-eslint/no-unused-vars */
      } catch (_error) {
        formattedMessage = '<Could not stringify message>';
      }

      if (config?.stack && typeof config?.stack === 'string') {
        formattedMessage += `\nStack: ${config.stack}`;
      }
    }
    return `${this._appendAdditionalHeader(config)}: ${this._formatTitle(color, false)(formattedMessage)}`;
  }

  private _prepareComponentName(config: string): string {
    const configYellow = this._formatTitle(YELLOW);
    let headerName = 'System';
    if (typeof config === 'string') {
      headerName = config;
    }
    this.name = headerName;
    return configYellow(headerName).trim();
  }

  private _appendAdditionalHeader(additional: LoggerAdditionalInfo) {
    const configYellow = this._formatTitle(YELLOW);
    const headerName: string[] = [];
    ORDER_ADDITIONAL_INFO.forEach((key) => {
      if (key === 'stack' && additional?.[key]) {
        this._headerFromStack(additional.stack).forEach((item) =>
          headerName.push(item),
        );
      } else if (key === 'context' && additional?.[key]) {
        this._headerFromContext(additional.context as ExecutionContext).forEach(
          (item) => headerName.push(item),
        );
      } else if (key === 'userId' && additional?.[key]) {
        headerName.push(`USER_ID:${additional[key]}`);
      } else if (additional?.[key]) {
        headerName.push(additional[key]);
      }
    });
    return `${this.headerName} ${configYellow(...headerName)}`;
  }

  private _headerFromContext(context: ExecutionContext): string[] {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const handlerName = handler.name;
    return this._selectClassAndMethod(className, handlerName);
  }

  private _headerFromStack(stack: string): string[] {
    if (!stack) return ['UnknownClass', 'UnknownMethod'];

    const lines = stack.split('\n');

    const projectPath =
      'alliance-research-indicators-main/server/researchindicators/src';

    const relevantLine = lines.find((line) => {
      return (
        line.includes(projectPath) &&
        !line.includes('node_modules') &&
        !line.includes('<anonymous>') &&
        line.includes('.ts:')
      );
    });

    if (!relevantLine) {
      const fallbackLine = lines.find((line) => {
        const hasClassMethod = /at\s+\w+\.\w+\s+\(/.test(line);
        return hasClassMethod && !line.includes('<anonymous>');
      });

      if (fallbackLine) {
        return this._extractClassAndMethod(fallbackLine);
      }

      return ['UnknownClass', 'UnknownMethod'];
    }

    return this._extractClassAndMethod(relevantLine);
  }

  private _extractClassAndMethod(line: string): string[] {
    const fullPattern = /at\s+(\w+)\.(\w+)\s+\(/;
    const match = fullPattern.exec(line);

    if (match) {
      const className = match[1] || 'UnknownClass';
      const methodName = match[2] || 'UnknownMethod';

      return this._selectClassAndMethod(className, methodName);
    }

    const methodOnlyPattern = /at\s+(\w+)\s+\(/;
    const methodMatch = methodOnlyPattern.exec(line);

    if (methodMatch) {
      const filePathPattern = /\/([^\/]+)\.ts:/;
      const fileMatch = filePathPattern.exec(line);
      const className = fileMatch ? fileMatch[1] : 'UnknownClass';
      const methodName = methodMatch[1] || 'UnknownMethod';
      return this._selectClassAndMethod(className, methodName);
    }

    return ['UnknownClass', 'UnknownMethod'];
  }

  private _selectClassAndMethod(
    tempClass: string,
    tempMethod: string,
  ): string[] {
    return this.name == tempClass ? [tempMethod] : [tempClass, tempMethod];
  }
}

export type LoggerAdditionalInfo = {
  url?: string;
  method?: string;
  userId?: string;
  stack?: string;
  context?: any;
};
