/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ContentChild,
  effect,
  inject,
  Input,
  signal,
  TemplateRef,
  WritableSignal,
  OnInit,
  output,
  DestroyRef
} from '@angular/core';
import { MultiSelectChangeEvent, MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { ActionsService } from '../../../services/actions.service';
import { ServiceLocatorService } from '../../../services/service-locator.service';
import { ControlListServices } from '../../../interfaces/services.interface';
import { CacheService } from '../../../services/cache/cache.service';
import { SkeletonModule } from 'primeng/skeleton';
import { UtilsService } from '../../../services/utils.service';
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-multiselect-opensearch',
  standalone: true,
  imports: [MultiSelectModule, FormsModule, NgTemplateOutlet, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './multiselect-opensearch.component.html',
  styleUrl: './multiselect-opensearch.component.scss'
})
export class MultiselectOpensearchComponent implements OnInit {
  currentResultIsLoading = inject(CacheService).currentResultIsLoading;
  utils = inject(UtilsService);
  actions = inject(ActionsService);
  serviceLocator = inject(ServiceLocatorService);
  listInstance = signal<any[]>([]);
  loadingList = signal(false);
  @ContentChild('rows') rows!: TemplateRef<any>;

  @Input() signal: WritableSignal<any> = signal({});
  @Input() optionLabel = '';
  @Input() optionValue = '';
  @Input() signalOptionValue = '';
  @Input() serviceName: ControlListServices = '';
  @Input() label = '';
  @Input() description = '';
  @Input() hideSelected = false;
  @Input() openSearchFilters: any = {};
  selectEvent = output<any>();

  service: any;

  body: WritableSignal<any> = signal({ value: null });

  selectedOptions = computed(() => {
    return this.utils.getNestedProperty(this.signal(), this.signalOptionValue);
  });
  firstLoad = signal(true);

  onGlobalLoadingChange = effect(
    () => {
      if (this.currentResultIsLoading()) {
        this.firstLoad.set(true);
      }
    },
    { allowSignalWrites: true }
  );

  private searchSubject = new Subject<string>();
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.service = this.serviceLocator.getService(this.serviceName);
    this.body.set({ value: this.objectArrayToIdArray(this.utils.getNestedProperty(this.signal(), this.signalOptionValue), this.optionValue) });

    // Setup debounced search
    this.searchSubject.pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef)).subscribe(async (searchTerm: string) => {
      if (!searchTerm) {
        this.listInstance.set([]);
        return;
      }
      this.loadingList.set(true);
      const signal = await this.service.getInstance(searchTerm, this.openSearchFilters);
      this.listInstance.set(signal());
      this.loadingList.set(false);
    });
  }

  onFilter(event: any) {
    this.searchSubject.next(event.filter);
  }

  objectArrayToIdArray(array: any[], attribute: string) {
    return array?.map((item: any) => item[attribute]);
  }

  setValue(event: MultiSelectChangeEvent) {
    this.signal.update((current: any) => {
      this.utils.setNestedPropertyWithReduce(current, this.signalOptionValue, [...current[this.signalOptionValue], event.itemValue]);
      return { ...current };
    });
  }

  removeOption(option: any) {
    this.signal.update((current: any) => {
      const updatedOptions = this.utils
        .getNestedProperty(current, this.signalOptionValue)
        .filter((item: any) => item[this.optionValue] !== option[this.optionValue]);

      // Update the body signal with the new list of option values
      this.body.set({ value: this.objectArrayToIdArray(updatedOptions, this.optionValue) });

      this.utils.setNestedPropertyWithReduce(current, this.signalOptionValue, updatedOptions);
      return { ...current };
    });
  }
}
