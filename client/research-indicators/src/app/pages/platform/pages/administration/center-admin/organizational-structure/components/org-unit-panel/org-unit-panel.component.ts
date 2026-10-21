import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { OrgChangeLogRow, OrgHistory, OrgLifecycleAction, OrgLinkedData, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { ApiService } from '@shared/services/api.service';
import { pathOf } from '../../utils/org-form.util';
import { ORG_ACTION_LABELS, actorLabel, diffLines, formatLogTime, versionRows } from '../../utils/org-history.util';
import { ORG_LEVEL_LABELS } from '../../utils/org-tree.util';
import { OrgLifecycleDialogComponent, OrgLifecycleDone } from '../org-lifecycle-dialog/org-lifecycle-dialog.component';
import { OrgUnitFormComponent, OrgUnitFormPrefill } from '../org-unit-form/org-unit-form.component';

type PanelTab = 'details' | 'history' | 'linked';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §2.1, §4 B6,
// §6.2, §6.5, §6.6, §6.8; requirements R-ORG-008, 009, 013, 017. The right panel: header (code, level,
// name, path as of the year, permanent ID), the actions per status, and the Details / History / Linked data tabs
// (Linked data: T-04, B8, §6.6). Save and Cancel stay with the form; a deleted entry shows no form at all.
@Component({
  selector: 'app-org-unit-panel',
  standalone: true,
  imports: [ButtonModule, OrgUnitFormComponent, OrgLifecycleDialogComponent],
  templateUrl: './org-unit-panel.component.html',
  styleUrl: './org-unit-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgUnitPanelComponent implements OnChanges {
  private readonly api = inject(ApiService);

  /** The selected entry as of the viewed year; `null` when nothing is selected or a new one is being created. */
  @Input() row: OrgYearViewRow | null = null;
  @Input({ required: true }) rows: OrgYearViewRow[] = [];
  @Input({ required: true }) range: OrgYearRange = { min: 0, max: 0, current: 0 };
  /** The page's selected *Structure year*, passed to the form for its *Applies from year* default. */
  @Input() structureYear = 0;
  @Input() creating = false;
  @Input() prefill: OrgUnitFormPrefill | null = null;
  /** Changes on every open and every save: the form is rebuilt and an open History tab reloads. */
  @Input() formKey = '';
  @Output() saved = new EventEmitter<number | null>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() lifecycleDone = new EventEmitter<OrgLifecycleDone>();

  readonly levelLabels = ORG_LEVEL_LABELS;
  readonly actionLabels = ORG_ACTION_LABELS;
  readonly actorLabel = actorLabel;
  readonly formatLogTime = formatLogTime;

  readonly tab = signal<PanelTab>('details');
  readonly history = signal<OrgHistory | null>(null);
  readonly historyLoading = signal(false);
  readonly historyError = signal(false);
  readonly linked = signal<OrgLinkedData | null>(null);
  readonly linkedLoading = signal(false);
  readonly linkedError = signal(false);
  /** Nothing uses the entry: no children and every consumer count is zero (or no consumer registered). */
  readonly linkedEmpty = computed(() => {
    const data = this.linked();
    return !!data && data.childCount === 0 && data.consumers.every(c => c.count === 0);
  });
  readonly lifecycle = signal<OrgLifecycleAction | null>(null);

  /** carnet -> name from the people already on screen (director and delegates of the viewed rows). */
  private carnetNames(): Map<string, string> {
    const names = new Map<string, string>();
    for (const r of this.rows) {
      for (const person of [r.version.director, ...r.delegates]) if (person?.name) names.set(person.carnet, person.name);
    }
    return names;
  }

  diffOf(entry: OrgChangeLogRow) {
    return diffLines(entry, this.carnetNames());
  }

  readonly versions = computed(() => versionRows(this.history()?.versions ?? []));

  private shownId: number | null = null;
  private shownKey = '';
  private historyToken = 0;
  private linkedToken = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['row'] && !changes['formKey'] && !changes['creating']) return;
    const id = this.creating ? null : (this.row?.id ?? null);
    const idChanged = id !== this.shownId;
    const keyChanged = this.formKey !== this.shownKey;
    this.shownId = id;
    this.shownKey = this.formKey;
    if (idChanged) {
      this.tab.set('details');
      this.history.set(null);
      this.historyError.set(false);
      this.linked.set(null);
      this.linkedError.set(false);
      // A response still in flight for the previous entry must not land on this one.
      this.historyToken++;
      this.linkedToken++;
      this.historyLoading.set(false);
      this.linkedLoading.set(false);
    }
    if (id !== null && (idChanged || keyChanged)) {
      if (this.tab() === 'history') void this.loadHistory(id);
      if (this.tab() === 'linked') void this.loadLinked(id);
    }
  }

  path(row: OrgYearViewRow): string {
    return pathOf(row, new Map(this.rows.map(r => [r.id, r])));
  }

  selectTab(tab: PanelTab): void {
    this.tab.set(tab);
    if (tab === 'history' && this.shownId !== null) void this.loadHistory(this.shownId);
    if (tab === 'linked' && this.shownId !== null) void this.loadLinked(this.shownId);
  }

  async loadLinked(id: number): Promise<void> {
    const token = ++this.linkedToken;
    this.linkedLoading.set(true);
    this.linkedError.set(false);
    try {
      const response = await this.api.GET_OrgStructureLinkedData(id);
      if (token !== this.linkedToken) return;
      if (response?.successfulRequest === false || !response?.data) {
        this.linkedError.set(true);
      } else {
        this.linked.set(response.data);
      }
    } catch {
      if (token === this.linkedToken) this.linkedError.set(true);
    } finally {
      if (token === this.linkedToken) this.linkedLoading.set(false);
    }
  }

  async loadHistory(id: number): Promise<void> {
    const token = ++this.historyToken;
    this.historyLoading.set(true);
    this.historyError.set(false);
    try {
      const response = await this.api.GET_OrgStructureHistory(id);
      if (token !== this.historyToken) return;
      if (response?.successfulRequest === false || !response?.data) {
        this.historyError.set(true);
      } else {
        this.history.set(response.data);
      }
    } catch {
      if (token === this.historyToken) this.historyError.set(true);
    } finally {
      if (token === this.historyToken) this.historyLoading.set(false);
    }
  }

  openLifecycle(action: OrgLifecycleAction): void {
    this.lifecycle.set(action);
  }

  closeLifecycle(): void {
    this.lifecycle.set(null);
  }

  onLifecycleDone(done: OrgLifecycleDone): void {
    this.lifecycle.set(null);
    this.lifecycleDone.emit(done);
  }
}
