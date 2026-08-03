/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, computed, inject, Input, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { CacheService } from '../../../services/cache/cache.service';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-calendar-input',
  imports: [CalendarModule, FormsModule, SkeletonModule],
  templateUrl: './calendar-input.component.html',
  styleUrl: './calendar-input.component.scss'
})
export class CalendarInputComponent {
  currentResultIsLoading = inject(CacheService).currentResultIsLoading;
  @Input() signal: WritableSignal<any> = signal({});
  @Input() optionValue = '';
  @Input() label = '';
  @Input() description = '';
  @Input() minDate: any = null;
  @Input() maxDate: any = null;
  @Input() isRequired = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() placeholder = '';
  @Input() dateFormat = 'dd/mm/yy';

  isInvalid = computed(() => {
    const value = this.signal()[this.optionValue];
    return this.isRequired && (!value || value === '');
  });

  inputValid = computed(() => {
    const value = this.signal()[this.optionValue];
    const isEmpty = !value || value === '';

    if (this.isRequired && isEmpty) {
      return {
        valid: false,
        class: 'ng-invalid ng-dirty',
        message: 'This field is required'
      };
    }

    return {
      valid: true,
      class: 'ng-valid ng-dirty',
      message: ''
    };
  });

  setValue(value: string) {
    this.signal.set({ ...this.signal(), [this.optionValue]: value });
  }
}
