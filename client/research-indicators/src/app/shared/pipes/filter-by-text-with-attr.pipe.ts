import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByTextWithAttr',
  standalone: true,
  pure: false
})
export class FilterByTextWithAttrPipe implements PipeTransform {
  transform<T>(list: T[], attribute: keyof T, searchText: string): T[] {
    if (!list || !attribute || !searchText) {
      return list;
    }

    const lowerSearchText = searchText.toLowerCase();

    return list.filter(item => {
      const attributeValue = item[attribute]?.toString().toLowerCase() ?? '';
      return attributeValue.includes(lowerSearchText);
    });
  }
}
