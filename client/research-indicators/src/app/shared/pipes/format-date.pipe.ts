import { Pipe, PipeTransform, inject } from '@angular/core';
import type { DateInput } from '@shared/interfaces/date-format.interface';
import { formatUtcDateWithConfig, formatUtcWithConfig } from '@shared/utils/date-format.util';
import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';

@Pipe({
  name: 'formatDate',
  standalone: true
})
export class FormatDatePipe implements PipeTransform {
  private readonly dateFormatConfig = inject(DateFormatConfigService);

  /** `mode` 'date' drops the time (tables); the default keeps date and time. */
  transform(value: DateInput, config?: DateFormatJsonValue | null, mode: 'datetime' | 'date' = 'datetime'): string {
    const c = config ?? this.dateFormatConfig.config();
    return (mode === 'date' ? formatUtcDateWithConfig(value, c) : formatUtcWithConfig(value, c)) ?? '';
  }
}
