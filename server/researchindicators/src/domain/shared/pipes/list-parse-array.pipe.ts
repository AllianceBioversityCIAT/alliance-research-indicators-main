import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class ListParseToArrayPipe implements PipeTransform {
  transform(value: any): string[] {
    if (typeof value === 'string') {
      return value?.split(',')?.map((el) => el.trim());
    }
    if (Array.isArray(value)) {
      return value.map((el) => el.trim());
    }
    return [];
  }
}
