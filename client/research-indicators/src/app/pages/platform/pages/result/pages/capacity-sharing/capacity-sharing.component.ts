import { Component, computed, inject, effect, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RadioButtonComponent } from '../../../../../../shared/components/custom-fields/radio-button/radio-button.component';
import { ApiService } from '../../../../../../shared/services/api.service';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { SelectComponent } from '../../../../../../shared/components/custom-fields/select/select.component';
import { GetCapSharing } from '../../../../../../shared/interfaces/get-cap-sharing.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { InputComponent } from '../../../../../../shared/components/custom-fields/input/input.component';
import { MultiselectComponent } from '../../../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { CalendarInputComponent } from '../../../../../../shared/components/custom-fields/calendar-input/calendar-input.component';
import { PartnerSelectedItemComponent } from '../../../../../../shared/components/partner-selected-item/partner-selected-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';

@Component({
  selector: 'app-capacity-sharing',
  imports: [
    FormsModule,
    NavigationButtonsComponent,
    DropdownModule,
    FormHeaderComponent,
    CalendarModule,
    RadioButtonModule,
    RadioButtonComponent,
    SelectComponent,
    InputComponent,
    CalendarInputComponent,
    MultiselectComponent,
    PartnerSelectedItemComponent
  ],
  templateUrl: './capacity-sharing.component.html',
  styleUrl: './capacity-sharing.component.scss'
})
export default class CapacitySharingComponent {
  api = inject(ApiService);
  actions = inject(ActionsService);
  cache = inject(CacheService);
  router = inject(Router);
  body: WritableSignal<GetCapSharing> = signal({});
  submission = inject(SubmissionService);
  loading = signal(false);
  allModalsService = inject(AllModalsService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });

    effect(() => {
      if (!this.isLongTermSelected()) {
        this.clearDegreeIdIfNotLongTerm();
      }
    });
  }

  isLongTermSelected = computed(() => this.body()?.session_length_id === 2);

  canRemove = (): boolean => {
    return this.submission.isEditableStatus();
  };

  parseCapacitySharingTimestamp(value: string | Date | null | undefined): Date | undefined {
    if (value == null) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  isStartDateGreaterThanEndDate = computed(() => {
    const { start_date, end_date } = this.body() ?? {};
    if (!this.hasBothDates({ start_date, end_date })) return false;
    return new Date(start_date as string | number | Date).getTime() > new Date(end_date as string | number | Date).getTime();
  });

  // H8 — the participants split by sex cannot add up to more than the total.
  participantsExceedTotal = computed(() => {
    const group = this.body()?.group;
    const total = group?.session_participants_total;
    if (total == null) return false;
    const split =
      Number(group?.session_participants_female ?? 0) +
      Number(group?.session_participants_male ?? 0) +
      Number(group?.session_participants_non_binary ?? 0);
    return split > Number(total);
  });

  // H10 — Long-term means "3 months and more" (session_lengths.name), so the dates must span at least that.
  isLongTermTooShort = computed(() => {
    const { start_date, end_date } = this.body() ?? {};
    if (!this.isLongTermSelected() || !this.hasBothDates({ start_date, end_date })) return false;
    const minimumEnd = new Date(start_date as string | number | Date);
    minimumEnd.setMonth(minimumEnd.getMonth() + 3);
    return new Date(end_date as string | number | Date).getTime() < minimumEnd.getTime();
  });

  protected clearDegreeIdIfNotLongTerm() {
    const current = this.body();
    if (current?.degree_id) {
      this.body.update(b => ({
        ...b,
        degree_id: undefined
      }));
    }
  }

  async getData() {
    this.cache.loadingCurrentResult.set(true);
    const response = await this.api.GET_CapacitySharing();
    this.body.set({
      ...response.data,
      start_date: this.parseCapacitySharingTimestamp(response.data.start_date),
      end_date: this.parseCapacitySharingTimestamp(response.data.end_date)
    });
    this.cache.loadingCurrentResult.set(false);
    this.loading.set(false);
  }

  async saveData(page?: 'next' | 'back') {
    this.loading.set(true);

    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;

    const navigateTo = (path: string) => {
      this.router.navigate(['result', this.cache.currentResultId(), path], {
        queryParams,
        replaceUrl: true
      });
    };

    if (this.submission.isEditableStatus() && this.blockingValidationMessage()) {
      this.actions.showToast({
        severity: 'error',
        summary: 'CapSharing Details',
        detail: this.blockingValidationMessage()
      });
      this.loading.set(false);
      return;
    }

    if (this.submission.isEditableStatus()) {
      const payload = {
        ...this.body(),
        start_date: this.toISOTimestamp(this.body().start_date),
        end_date: this.toISOTimestamp(this.body().end_date)
      };

      await this.api.PATCH_CapacitySharing(payload);

      this.actions.showToast({
        severity: 'success',
        summary: 'CapSharing Details',
        detail: 'Data saved successfully'
      });

      await this.getData();
    }

    if (page === 'next') navigateTo('partners');
    if (page === 'back') navigateTo('alliance-alignment');

    this.loading.set(false);
  }

  private blockingValidationMessage(): string {
    if (this.body().session_format_id === 2 && this.participantsExceedTotal()) {
      return 'Female, male and non-binary participants cannot add up to more than the total participants.';
    }
    if (this.isLongTermTooShort()) return 'A long-term training must last 3 months or more.';
    return '';
  }

  private toISOTimestamp(value: string | Date | undefined): string | undefined {
    if (!value) return undefined;
    return new Date(value).toISOString();
  }

  setSectionAndOpenModal(section: string) {
    if (this.cache.isExternalResult()) return;
    this.allModalsService.setPartnerRequestSection(section);
    this.allModalsService.openModal('requestPartner');
  }

  protected hasBothDates(current: GetCapSharing): boolean {
    return Boolean(current?.start_date) && Boolean(current?.end_date);
  }
}
