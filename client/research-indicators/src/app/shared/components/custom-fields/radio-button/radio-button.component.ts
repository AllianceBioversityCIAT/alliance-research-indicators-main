/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, computed, effect, inject, Input, OnInit, output, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CacheService } from '../../../services/cache/cache.service';
import { SkeletonModule } from 'primeng/skeleton';
import { ActionsService } from '../../../services/actions.service';
import { ServiceLocatorService } from '../../../services/service-locator.service';
import { ControlListServices } from '../../../interfaces/services.interface';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-radio-button',
  imports: [RadioButtonModule, FormsModule, SkeletonModule],
  templateUrl: './radio-button.component.html',
  styleUrl: './radio-button.component.scss'
})
export class RadioButtonComponent implements OnInit {
  currentResultIsLoading = inject(CacheService).currentResultIsLoading;
  cache = inject(CacheService);
  actions = inject(ActionsService);
  utils = inject(UtilsService);
  @Input() signal: WritableSignal<any> = signal({});
  @Input() optionLabel = '';
  @Input() optionValue = { body: '', option: '' };
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';
  @Input() serviceName: ControlListServices = '';
  @Input() label = '';
  @Input() spaceX = 'gap-[10px]';
  @Input() description = '';
  @Input() helperText = '';
  @Input() isRequired = false;
  @Input() disabled = false;
  @Input() centerOptions = false;

  selectEvent = output<any>();
  service: any;
  body = signal({ value: null });
  firstTime = signal(true);

  isInvalid = computed(() => {
    return this.isRequired && (this.body().value === null || this.body().value === undefined || this.body().value === '');
  });

  onChange = effect(
    () => {
      if (!this.currentResultIsLoading() && !this.service.loading()) {
        const externalValue = this.utils.getNestedPropertySignal(this.signal, this.optionValue.body);
        if (this.body().value !== externalValue) {
          this.setValue(externalValue);
        }
      }
    },
    { allowSignalWrites: true }
  );

  constructor(private serviceLocator: ServiceLocatorService) {}
  ngOnInit(): void {
    this.service = this.serviceLocator.getService(this.serviceName);
  }

  setValue(value: any) {
    this.body.set({ value: value });
    this.utils.setNestedPropertyWithReduceSignal(this.signal, this.optionValue.body, value);
    this.selectEvent.emit(value);
  }

  getUniqueId(item: any): string {
    const bodyPath = this.optionValue.body.replace(/\./g, '-');
    const optionLabel = item[this.optionLabel] || '';
    const optionValue = item[this.optionValue.option] || '';
    return `${bodyPath}-${optionLabel}-${optionValue}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }

  getUniqueName(): string {
    return this.optionValue.body.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }
}
