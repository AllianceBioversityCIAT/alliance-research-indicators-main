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

  // H38 — PrimeNG silently wipes a typed date outside minDate/maxDate on blur. Its onBlur fires
  // before that wipe, so the typed text is still readable here and can explain why it vanished.
  outOfRangeMessage = signal('');

  setValue(value: string) {
    this.outOfRangeMessage.set('');
    this.signal.set({ ...this.signal(), [this.optionValue]: value });
  }

  onBlur(event: Event) {
    const text = (event.target as HTMLInputElement | null)?.value?.trim() ?? '';
    this.outOfRangeMessage.set(this.describeOutOfRange(text));
  }

  private describeOutOfRange(text: string): string {
    const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (!parts || this.dateFormat !== 'dd/mm/yy') return '';
    const typed = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
    const min = this.toDay(this.minDate);
    const max = this.toDay(this.maxDate);
    if (min && typed < min) return `The date cannot be earlier than ${this.formatDay(min)}.`;
    if (max && typed > max) return `The date cannot be later than ${this.formatDay(max)}.`;
    return '';
  }

  private toDay(value: unknown): Date | null {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
}
