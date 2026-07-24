import { Pipe, PipeTransform, inject } from '@angular/core';
import type { DateInput } from '@shared/interfaces/date-format.interface';
import { formatUtcWithConfig } from '@shared/utils/date-format.util';
import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';

@Pipe({
  name: 'formatDate',
  standalone: true
})
export class FormatDatePipe implements PipeTransform {
  private readonly dateFormatConfig = inject(DateFormatConfigService);

  transform(value: DateInput, config?: DateFormatJsonValue | null): string {
    const c = config ?? this.dateFormatConfig.config();
    return formatUtcWithConfig(value, c) ?? '';
  }
}
