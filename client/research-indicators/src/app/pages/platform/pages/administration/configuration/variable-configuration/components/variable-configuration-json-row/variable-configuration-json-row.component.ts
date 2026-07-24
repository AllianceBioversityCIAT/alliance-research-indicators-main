import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppConfigListItem } from '@shared/interfaces/app-config.interface';
import { JsonStructureEditorComponent } from '../json-structure-editor/json-structure-editor.component';
import {
  JsonEditorNode,
  JsonLeafValue,
  formatJsonFieldLabel
} from '@shared/utils/json-structure-editor.util';

@Component({
  selector: 'app-variable-configuration-json-row',
  standalone: true,
  imports: [JsonStructureEditorComponent],
  templateUrl: './variable-configuration-json-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariableConfigurationJsonRowComponent {
  readonly row = input.required<AppConfigListItem>();
  readonly sections = input.required<JsonEditorNode[]>();
  readonly values = input.required<Record<string, JsonLeafValue>>();
  readonly expandedSections = input.required<Record<string, boolean>>();
  readonly disabled = input(false);
  readonly saving = input(false);
  readonly dirty = input(false);
  readonly showActions = input(true);

  readonly sectionToggle = output<string>();
  readonly fieldChange = output<{ pathKey: string; value: JsonLeafValue }>();
  readonly save = output<void>();

  formatLabel = formatJsonFieldLabel;

  readonly groupSections = computed(() => this.sections().filter(section => section.type === 'group'));

  readonly leafSections = computed(() =>
    this.sections().filter((section): section is JsonEditorNode & { type: 'leaf' } => section.type === 'leaf')
  );

  isSectionExpanded(sectionKey: string): boolean {
    return this.expandedSections()[sectionKey] === true;
  }
}
