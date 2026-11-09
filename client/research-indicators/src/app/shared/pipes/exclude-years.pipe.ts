import { Pipe, PipeTransform } from '@angular/core';
import { GetYear } from '@shared/interfaces/get-year.interface';

@Pipe({
  name: 'excludeYears',
  standalone: true,
  pure: true
})
export class ExcludeYearsPipe implements PipeTransform {
  transform(list: GetYear[] | undefined, exclude?: number[]): GetYear[] | undefined {
    if (!list || !exclude?.length) {
      return list;
    }

    return list.filter(item => !exclude.includes(item.report_year));
  }
}
