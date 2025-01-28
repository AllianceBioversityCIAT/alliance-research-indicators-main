import { PipeTransform, Injectable } from '@nestjs/common';
import { validTypeOfArray } from '../utils/array.util';

@Injectable()
export class ListParseToArrayPipe implements PipeTransform {
  transform(value: any): string[] {
    let returnArray: string[] = [];
    if (typeof value === 'string') {
      returnArray = value?.split(',')?.map((el) => el.trim());
    }
    if (Array.isArray(value)) {
      returnArray = value.map((el) => el.trim());
    }
    return validTypeOfArray(returnArray);
  }
}
