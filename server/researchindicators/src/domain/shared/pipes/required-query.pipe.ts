import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class RequiredQueryPipe implements PipeTransform<string, string> {
  constructor(private readonly paramName: string = 'value') {}

  transform(value: string): string {
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '');

    if (isEmpty) {
      throw new BadRequestException(
        `Query parameter '${this.paramName}' is required and cannot be empty`,
      );
    }

    return value;
  }
}
