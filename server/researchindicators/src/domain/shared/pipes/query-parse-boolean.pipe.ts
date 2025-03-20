import { PipeTransform, Injectable } from '@nestjs/common';
import { TrueFalseEnum } from '../enum/queries.enum';

@Injectable()
export class QueryParseBool implements PipeTransform {
  transform(value: any): boolean {
    if (typeof value === 'string') {
      return value.toLowerCase() === TrueFalseEnum.TRUE;
    }
    return false;
  }
}
