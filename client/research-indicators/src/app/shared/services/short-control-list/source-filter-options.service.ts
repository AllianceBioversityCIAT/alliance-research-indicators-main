import { Injectable, signal } from '@angular/core';
import { SOURCE_FILTER_OPTIONS } from '@shared/constants/source-filter-options.constants';

@Injectable({
  providedIn: 'root'
})
export class SourceFilterOptionsService {
  list = signal([...SOURCE_FILTER_OPTIONS]);
  loading = signal(false);
  isOpenSearch = signal(false);
}
