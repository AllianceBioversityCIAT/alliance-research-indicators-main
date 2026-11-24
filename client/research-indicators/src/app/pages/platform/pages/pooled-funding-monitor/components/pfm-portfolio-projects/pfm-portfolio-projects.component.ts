import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, model, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { TruncatedTextTooltipDirective } from '@shared/directives/truncated-text-tooltip.directive';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';
import { SearchExportControlsComponent } from '@shared/components/search-export-controls/search-export-controls.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { PfmPortfolioProject, PfmProjectsFilter } from '../../pfm.interfaces';

/**
 * Coverage stage 1: the scope's contributing projects, how many results each has created,
 * and a Create Result shortcut that opens the create-result modal on that project (as the
 * project detail page does). Opens on the projects without results, the stage's action.
 */
@Component({
  selector: 'app-pfm-portfolio-projects',
  imports: [TableModule, ButtonModule, PopoverModule, TooltipModule, TruncatedTextTooltipDirective, CustomTagComponent, SearchExportControlsComponent],
  templateUrl: './pfm-portfolio-projects.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PfmPortfolioProjectsComponent implements OnDestroy {
  private readonly allModalsService = inject(AllModalsService);
  private readonly createResultManagementService = inject(CreateResultManagementService);
  private readonly projectUtils = inject(ProjectUtilsService);

  projects = input.required<PfmPortfolioProject[]>();
  /** Which projects the table shows; the stage 1 CTA sets it to 'without'. */
  filter = model<PfmProjectsFilter>('without');
  readonly search = signal('');
  /** Delegates shown in the cell; the rest open from "+N more", as in My PI Delegates. */
  readonly maxVisibleDelegates = 2;

  /** Sortable columns; Action follows them. Same header recipe as the Results Center table. */
  readonly columns = [
    { header: 'Code', sort: 'code' },
    { header: 'Project Name', sort: 'name' },
    { header: 'Status', sort: 'statusName' },
    { header: 'Principal Investigator', sort: 'lead_pi' },
    { header: 'PI Delegates', sort: 'delegatesText' },
    { header: 'Results', sort: 'results' }
  ];

  chips = computed(() => {
    const all = this.projects();
    const count = (f: PfmProjectsFilter) => all.filter(p => this.matches(p, f)).length;
    return [
      { value: 'all' as const, label: 'All projects', count: count('all') },
      { value: 'with' as const, label: 'With results', count: count('with') },
      { value: 'without' as const, label: 'Without results', count: count('without') }
    ];
  });

  rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.projects()
      .filter(p => this.matches(p, this.filter()))
      .filter(p => !q || `${p.code} ${p.name ?? ''} ${p.lead_pi ?? ''}`.toLowerCase().includes(q))
      .map(p => {
        // My Projects' status tag: same mapping from the contract status to the tag
        const status = this.projectUtils.getStatusDisplay({ contract_status: p.status } as FindContracts);
        return {
          ...p,
          name: p.name ?? '',
          lead_pi: p.lead_pi ?? '',
          statusId: status.statusId,
          statusName: status.statusName,
          delegatesText: p.delegates.map(d => d.name).join(', ')
        };
      });
  });

  private matches(p: PfmPortfolioProject, f: PfmProjectsFilter): boolean {
    return f === 'all' || (f === 'with' ? p.results > 0 : p.results === 0);
  }

  /** WAI-ARIA radio group: arrows move the choice and the focus, as in My PI Delegates. */
  onChipKeydown(event: KeyboardEvent, index: number): void {
    const chips = this.chips();
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = chips[(index + step + chips.length) % chips.length];
    this.filter.set(next.value);
    const host = (event.currentTarget as HTMLElement | null)?.parentElement;
    host?.querySelector<HTMLElement>(`[data-testid="pfm-projects-chip-${next.value}"]`)?.focus();
  }

  clear(): void {
    this.search.set('');
    this.filter.set('without');
  }

  createResult(code: string): void {
    this.createResultManagementService.setContractId(code);
    this.createResultManagementService.setPresetFromProjectResultsTable(true);
    this.createResultManagementService.setResultCreationEntryContext('project');
    this.allModalsService.openModal('createResult');
  }

  ngOnDestroy(): void {
    this.createResultManagementService.setContractId(null);
    this.createResultManagementService.setPresetFromProjectResultsTable(false);
    this.createResultManagementService.setResultCreationEntryContext(null);
  }
}
