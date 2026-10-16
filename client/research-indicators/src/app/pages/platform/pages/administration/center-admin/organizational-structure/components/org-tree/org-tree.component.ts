import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeTable, TreeTableModule } from 'primeng/treetable';
import { ORG_LEVEL_LABELS, OrgTreeNodeData, endedBadge, scheduledBadge } from '../../utils/org-tree.util';
import { OrgYearViewRow } from '@shared/interfaces/org-structure.interface';

// @akili-spec institutional-performance/organizational-structure T-01 (client half) — design §6.3,
// D-ORG-6 (PrimeNG `p-treeTable`), R-ORG-013, R-ORG-016 read half, NFR-ORG-005. Presentational: the
// page builds the nodes (`org-tree.util`) and owns selection.
@Component({
  selector: 'app-org-tree',
  standalone: true,
  imports: [CommonModule, TreeTableModule],
  templateUrl: './org-tree.component.html',
  styleUrl: './org-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgTreeComponent {
  @Input({ required: true }) nodes: TreeNode<OrgTreeNodeData>[] = [];
  @Input({ required: true }) year = 0;
  @Input() selectedId: number | null = null;
  @Output() unitSelected = new EventEmitter<number>();
  @ViewChild(TreeTable) private readonly treeTable?: TreeTable;

  levelLabel(row: OrgYearViewRow): string {
    return ORG_LEVEL_LABELS[row.version.levelCode];
  }

  endedBadge(row: OrgYearViewRow): string | null {
    return endedBadge(row, this.year);
  }

  scheduledBadge(row: OrgYearViewRow): string | null {
    return scheduledBadge(row);
  }

  select(row: OrgYearViewRow): void {
    this.unitSelected.emit(row.id);
  }

  // Own expander instead of `p-treeTableToggler`: PrimeNG 19's toggler reads `rowNode.expanded`, which
  // the serialized row never carries, so its label is always "Row Expanded" (NFR-ORG-005). Same
  // mutation the toggler performs. Arrow-key expand/collapse stays with `ttRow`.
  toggle(rowNode: { node: TreeNode<OrgTreeNodeData> }, event: Event): void {
    event.stopPropagation();
    rowNode.node.expanded = !rowNode.node.expanded;
    this.treeTable?.updateSerializedValue();
    this.treeTable?.tableService.onUIUpdate(this.treeTable.value);
  }

  expanderLabel(node: TreeNode<OrgTreeNodeData>): string {
    return `${node.expanded ? 'Collapse' : 'Expand'} ${(node.data as OrgTreeNodeData).row.version.name}`;
  }

  hasChildren(node: TreeNode<OrgTreeNodeData>): boolean {
    return (node.children?.length ?? 0) > 0;
  }
}
