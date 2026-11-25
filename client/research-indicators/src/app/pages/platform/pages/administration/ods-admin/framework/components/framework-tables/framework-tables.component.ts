import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTableColumn, DataTableComponent } from '@shared/components/data-table/data-table.component';
import { FrameworkEditorView } from '@shared/interfaces/strategy-framework.interface';
import { naturalCompare } from '@shared/utils/natural-compare.util';
import { FrameworkTableRow, levelCounts, tableRowsForLevel } from '../../utils/framework-view.util';

/** Create request for the details panel. `parentId` is set when the tree's + already knows the parent. */
export interface FrameworkTableCreate {
  depth: number;
  parentRequired: boolean;
  /** Set when the tree's + action already knows the parent. A3 proposes that parent's next code. */
  parentId?: number;
}

const COLUMNS: DataTableColumn<FrameworkTableRow>[] = [
  { field: 'code', header: 'Code', type: 'code', sortable: true, width: '7rem' },
  { field: 'levelName', header: 'Level', type: 'text', sortable: true },
  { field: 'name', header: 'Name', type: 'text', sortable: true },
  { field: 'parentLabel', header: 'Parent', type: 'text', sortable: true },
  { field: 'responsiblesText', header: 'Responsibles', type: 'text', sortable: true }
];

const SEARCH_FIELDS: (keyof FrameworkTableRow & string)[] = ['code', 'levelName', 'name', 'parentLabel', 'responsiblesText'];

// @akili-spec institutional-performance/strategy-framework T-23 — design §6.4, D-STF-37.
// One shared DataTable lists every element. Chips show counts. Selection lives on the page.
@Component({
  selector: 'app-framework-tables',
  standalone: true,
  imports: [DataTableComponent],
  templateUrl: './framework-tables.component.html',
  styleUrls: ['./framework-tables.component.scss', '../../../ods-table-wrap.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrameworkTablesComponent {
  readonly view = input.required<FrameworkEditorView>();
  /** `String(row.id)`. Null while a create is open, so no row is highlighted. */
  readonly selectedKey = input<string | null>(null);

  readonly rowSelected = output<number>();

  readonly columns = COLUMNS;
  readonly searchFields = SEARCH_FIELDS;
  readonly counts = computed(() => levelCounts(this.view()));
  readonly rows = computed(() => rowsOf(this.view()));

  onRowSelected(row: FrameworkTableRow): void {
    this.rowSelected.emit(row.id);
  }
}

function rowsOf(view: FrameworkEditorView): FrameworkTableRow[] {
  const levels = [...view.levels].sort((left, right) => left.depth - right.depth);
  const byId = new Map(view.elements.map(element => [element.id, element]));
  const nameOf = new Map(levels.map(level => [level.depth, level.name]));
  return levels
    .flatMap(level =>
      tableRowsForLevel(view, level.depth).map(row => {
        const parentId = byId.get(row.id)?.parentId ?? null;
        const parent = parentId === null ? undefined : byId.get(parentId);
        return {
          ...row,
          levelName: nameOf.get(row.depth) ?? level.name,
          parentLabel: row.depth <= 1 || !parent ? '' : `${parent.code} · ${parent.name}`
        };
      })
    )
    .sort((left, right) => naturalCompare(left.code, right.code));
}
