import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { CalendarInputComponent } from '@shared/components/custom-fields/calendar-input/calendar-input.component';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { TruncatedTextTooltipDirective } from '@shared/directives/truncated-text-tooltip.directive';
import { Portfolio, PortfolioPayload } from '@shared/interfaces/portfolio.interface';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ActionsService } from '@shared/services/actions.service';
import { RolesService } from '@shared/services/cache/roles.service';

type PortfolioFormYearValue = Date | string | number | null;

interface PortfolioFormValue {
  name: string;
  description: string;
  start_year: PortfolioFormYearValue;
  end_year: PortfolioFormYearValue;
}

@Component({
  selector: 'app-portfolio-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ModalComponent,
    InputComponent,
    TextareaComponent,
    CalendarInputComponent,
    CustomProgressBarComponent,
    TruncatedTextTooltipDirective
  ],
  templateUrl: './portfolio-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PortfolioManagementComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly modals = inject(AllModalsService);
  private readonly actions = inject(ActionsService);
  readonly roles = inject(RolesService);

  readonly portfolios = signal<Portfolio[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly editingPortfolioId = signal<number | null>(null);
  readonly form = signal<PortfolioFormValue>({
    name: '',
    description: '',
    start_year: null,
    end_year: null
  });
  readonly tableSearch = signal('');

  readonly columnWidths = {
    name: 220,
    descriptionMin: 360,
    startDate: 150,
    endDate: 150,
    actions: 120
  };

  readonly isEditing = computed(() => this.editingPortfolioId() !== null);
  readonly canEditPortfolioDates = computed(() => !this.isEditing() || this.roles.isSystemAdmin());
  readonly modalTitle = computed(() => (this.isEditing() ? 'Edit portfolio' : 'Create portfolio'));
  readonly formInvalid = computed(() => {
    const value = this.form();
    return !value.name.trim() || !value.description.trim() || !this.extractYear(value.start_year) || !this.extractYear(value.end_year);
  });
  readonly hasTableSearch = computed(() => this.tableSearch().trim().length > 0);
  readonly filteredPortfolios = computed(() => {
    const query = this.tableSearch().trim().toLowerCase();
    if (!query) return this.portfolios();
    return this.portfolios().filter(portfolio => this.portfolioSearchHaystack(portfolio).includes(query));
  });
  readonly tableMinWidth = computed(
    () =>
      `${this.columnWidths.name + this.columnWidths.descriptionMin + this.columnWidths.startDate + this.columnWidths.endDate + this.columnWidths.actions}px`
  );
  readonly tableStyle = computed(() => ({
    'min-width': this.tableMinWidth(),
    width: '100%',
    'table-layout': 'fixed'
  }));

  ngOnInit(): void {
    this.configureModal();
    void this.load();
  }

  portfolioId(portfolio: Portfolio): number {
    return Number(portfolio.portfolio_id ?? portfolio.id ?? 0);
  }

  trackByPortfolioId = (_: number, portfolio: Portfolio): number => this.portfolioId(portfolio);

  fixedColumnStyle(widthPx: number): Record<string, string> {
    return {
      width: `${widthPx}px`,
      minWidth: `${widthPx}px`,
      maxWidth: `${widthPx}px`
    };
  }

  descriptionColumnStyle(): Record<string, string> {
    return {
      minWidth: `${this.columnWidths.descriptionMin}px`,
      width: 'auto',
      maxWidth: 'none'
    };
  }

  setTableSearch(value: string): void {
    this.tableSearch.set(value);
  }

  clearTableSearch(): void {
    this.tableSearch.set('');
  }

  clearModal = (): void => {
    this.resetForm();
    this.configureModal();
  };

  startCreate(): void {
    this.resetForm();
    this.openModal();
  }

  startEdit(portfolio: Portfolio): void {
    this.editingPortfolioId.set(this.portfolioId(portfolio));
    this.form.set({
      name: portfolio.name ?? '',
      description: portfolio.description ?? '',
      start_year: this.yearToDate(portfolio.start_year),
      end_year: this.yearToDate(portfolio.end_year)
    });
    this.openModal();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.api.GET_Portfolios();
      const list = Array.isArray(response?.data) ? response.data : [];
      this.portfolios.set([...list].sort((a, b) => Number(a.start_year ?? 0) - Number(b.start_year ?? 0)));
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.formInvalid() || this.saving()) return;

    this.saving.set(true);

    try {
      const payload = this.buildPayload();
      const editingId = this.editingPortfolioId();
      if (editingId === null) {
        await this.api.POST_Portfolio(payload);
        this.resetForm();
        this.actions.showToast({ severity: 'success', summary: 'Portfolio management', detail: 'Portfolio created successfully' });
      } else {
        await this.api.PATCH_Portfolio(editingId, payload);
        this.resetForm();
        this.actions.showToast({ severity: 'success', summary: 'Portfolio management', detail: 'Portfolio updated successfully' });
      }
      this.modals.closeModal('portfolioManagement');
      await this.load();
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'We could not save the portfolio. Please try again.' });
    } finally {
      this.saving.set(false);
    }
  }

  delete(portfolio: Portfolio): void {
    const id = this.portfolioId(portfolio);
    if (!id || this.deletingId() !== null) return;

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Delete portfolio',
      detail: `Are you sure you want to delete ${portfolio.name || 'this portfolio'}? This action cannot be undone.`,
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.confirmDelete(portfolio);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      },
      buttonColor: '#035BA9'
    });
  }

  private async confirmDelete(portfolio: Portfolio): Promise<void> {
    const id = this.portfolioId(portfolio);
    if (!id || this.deletingId() !== null) return;

    this.deletingId.set(id);

    try {
      await this.api.DELETE_Portfolio(id);
      this.actions.showToast({ severity: 'success', summary: 'Portfolio management', detail: 'Portfolio deleted successfully' });
      if (this.editingPortfolioId() === id) this.resetForm();
      await this.load();
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'We could not delete the portfolio. Please try again.' });
    } finally {
      this.deletingId.set(null);
    }
  }

  private buildPayload(): PortfolioPayload {
    const value = this.form();
    const editingId = this.editingPortfolioId();

    if (editingId !== null && !this.roles.isSystemAdmin()) {
      const portfolio = this.portfolios().find(item => this.portfolioId(item) === editingId);
      return {
        name: value.name.trim(),
        description: value.description.trim(),
        start_year: Number(portfolio?.start_year ?? this.extractYear(value.start_year)),
        end_year: Number(portfolio?.end_year ?? this.extractYear(value.end_year))
      };
    }

    return {
      name: value.name.trim(),
      description: value.description.trim(),
      start_year: this.extractYear(value.start_year),
      end_year: this.extractYear(value.end_year)
    };
  }

  private resetForm(): void {
    this.editingPortfolioId.set(null);
    this.form.set({ name: '', description: '', start_year: null, end_year: null });
  }

  private configureModal(): void {
    this.modals.modalConfig.update(modals => ({
      ...modals,
      portfolioManagement: {
        ...modals.portfolioManagement,
        title: this.modalTitle(),
        cancelText: 'Cancel',
        confirmText: this.isEditing() ? 'Update portfolio' : 'Create portfolio',
        confirmAction: () => {
          void this.save();
        },
        cancelAction: () => this.modals.closeModal('portfolioManagement'),
        disabledConfirmAction: () => this.formInvalid() || this.saving()
      }
    }));
  }

  private openModal(): void {
    this.configureModal();
    this.modals.openModal('portfolioManagement');
  }

  private portfolioSearchHaystack(portfolio: Portfolio): string {
    return [portfolio.name, portfolio.description, portfolio.start_year, portfolio.end_year]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  private yearToDate(year: number | undefined): Date | null {
    if (!year) return null;
    return new Date(Number(year), 0, 1);
  }

  private extractYear(value: PortfolioFormYearValue): number {
    if (value instanceof Date) return value.getFullYear();
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate.getFullYear();
    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : 0;
  }
}
