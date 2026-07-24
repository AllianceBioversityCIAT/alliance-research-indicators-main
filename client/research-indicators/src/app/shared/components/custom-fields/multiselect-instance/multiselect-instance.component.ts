/* eslint-disable @typescript-eslint/no-explicit-any */
import {
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
  Output,
  EventEmitter
} from '@angular/core';
import { MultiSelectChangeEvent, MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { ActionsService } from '../../../services/actions.service';
import { ServiceLocatorService } from '../../../services/service-locator.service';
import { ControlListServices } from '../../../interfaces/services.interface';
import { CacheService } from '../../../services/cache/cache.service';
import { SkeletonModule } from 'primeng/skeleton';
import { UtilsService } from '../../../services/utils.service';
import { Region } from '@shared/interfaces/get-geo-location.interface';

@Component({
  selector: 'app-multiselect-instance',
  imports: [MultiSelectModule, FormsModule, SkeletonModule],
  templateUrl: './multiselect-instance.component.html',
  styleUrl: './multiselect-instance.component.scss'
})
export class MultiselectInstanceComponent implements OnInit {
  currentResultIsLoading = inject(CacheService).currentResultIsLoading;
  utils = inject(UtilsService);
  actions = inject(ActionsService);
  serviceLocator = inject(ServiceLocatorService);
  listInstance = signal<any[]>([]);
  loadingList = signal(false);
  @ContentChild('rows') rows!: TemplateRef<any>;
  @Output() valueChange = new EventEmitter<Region[]>();

  @Input() signal: WritableSignal<any> = signal({});
  @Input() optionLabel = '';
  @Input() optionValue = '';
  @Input() signalOptionValue = '';
  @Input() serviceName: ControlListServices = '';
  @Input() label = '';
  @Input() description = '';
  @Input() hideSelected = false;
  @Input() disabled = false;
  @Input() endpointParams: any = {};
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

  ngOnInit(): void {
    this.service = this.serviceLocator.getService(this.serviceName);
    this.body.set({ value: this.objectArrayToIdArray(this.utils.getNestedProperty(this.signal(), this.signalOptionValue), this.optionValue) });

    // Setup debounced search

    this.getListInstance();
  }

  getListInstance = async () => {
    this.loadingList.set(true);
    const signal = await this.service.getInstance(this.endpointParams);
    this.listInstance.set(signal());
    this.loadingList.set(false);
  };

  objectArrayToIdArray(array: any[], attribute: string) {
    return array?.map((item: any) => item[attribute]);
  }

  setValue(event: MultiSelectChangeEvent) {
    this.signal.update((current: any) => {
      const currentArray = this.utils.getNestedProperty(current, this.signalOptionValue) ?? [];

      let newArray: any[];

      const itemExists = currentArray.some((item: any) => item[this.optionValue] === event.itemValue[this.optionValue]);

      if (!itemExists) {
        newArray = [...currentArray, event.itemValue];
      } else {
        newArray = currentArray.filter((item: any) => item[this.optionValue] !== event.itemValue[this.optionValue]);
      }

      this.utils.setNestedPropertyWithReduce(current, this.signalOptionValue, newArray);
      this.body.set({ value: this.objectArrayToIdArray(newArray, this.optionValue) });

      if ('result_countries_sub_nationals_signal' in current && current.result_countries_sub_nationals_signal?.set) {
        current.result_countries_sub_nationals_signal.set({ regions: newArray });
      }
      this.valueChange.emit(newArray);

      return { ...current };
    });

    // Emit the original event
    this.selectEvent.emit(event);
  }

  public removeRegionById(id: number) {
    const current = this.body();
    const newValue = (current.value ?? []).filter((v: number) => v !== id);
    this.body.set({ value: newValue });
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
