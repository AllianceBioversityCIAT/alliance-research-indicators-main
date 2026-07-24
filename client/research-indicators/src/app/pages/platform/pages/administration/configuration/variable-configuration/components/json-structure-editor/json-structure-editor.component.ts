import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  WritableSignal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import {
  JsonEditorNode,
  JsonLeafType,
  JsonLeafValue,
  formatJsonFieldLabel
} from '@shared/utils/json-structure-editor.util';

@Component({
  selector: 'app-json-structure-editor',
  standalone: true,
  imports: [FormsModule, CheckboxModule, InputComponent, JsonStructureEditorComponent],
  templateUrl: './json-structure-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonStructureEditorComponent {
  readonly nodes = input.required<JsonEditorNode[]>();
  readonly values = input.required<Record<string, JsonLeafValue>>();
  readonly disabled = input(false);
  readonly depth = input(0);

  readonly fieldChange = output<{ pathKey: string; value: JsonLeafValue }>();

  readonly leafNodes = computed(() =>
    this.nodes().filter((node): node is JsonEditorNode & { type: 'leaf' } => node.type === 'leaf')
  );

  readonly nonBooleanLeafNodes = computed(() =>
    this.leafNodes().filter(node => node.valueType !== 'boolean')
  );

  readonly booleanLeafNodes = computed(() =>
    this.leafNodes().filter(node => node.valueType === 'boolean')
  );

  private readonly fieldBodies = new Map<string, WritableSignal<{ value: JsonLeafValue }>>();
  private readonly lastEmitted = new Map<string, JsonLeafValue>();

  formatLabel = formatJsonFieldLabel;

  constructor() {
    effect(() => {
      for (const node of this.leafNodes()) {
        if (node.valueType === 'boolean' || node.valueType === 'null') {
          continue;
        }

        const formValue = this.fieldBody(node.pathKey, node.valueType)().value;
        const parentValue = untracked(() => this.values()[node.pathKey]);

        if (this.leafValuesEqual(formValue, parentValue, node.valueType)) {
          this.lastEmitted.delete(node.pathKey);
          continue;
        }

        const coerced = this.coerceEmitValue(formValue, node.valueType);
        if (this.lastEmitted.get(node.pathKey) === coerced) {
          continue;
        }

        this.lastEmitted.set(node.pathKey, coerced);
        this.fieldChange.emit({ pathKey: node.pathKey, value: coerced });
      }
    });

    effect(
      () => {
        const parentValues = this.values();

        for (const node of this.leafNodes()) {
          const body = this.fieldBody(node.pathKey, node.valueType);
          const next = this.normalizeFromParent(parentValues[node.pathKey], node.valueType);
          if (body().value !== next) {
            body.set({ value: next });
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  fieldBody(pathKey: string, valueType: JsonLeafType | 'unsupported'): WritableSignal<{ value: JsonLeafValue }> {
    let body = this.fieldBodies.get(pathKey);
    if (!body) {
      body = signal({
        value: this.normalizeFromParent(untracked(() => this.values()[pathKey]), valueType)
      });
      this.fieldBodies.set(pathKey, body);
    }
    return body;
  }

  fieldValue(pathKey: string): JsonLeafValue {
    return this.values()[pathKey] ?? '';
  }

  onBooleanChange(pathKey: string, value: boolean): void {
    this.fieldChange.emit({ pathKey, value });
  }

  asBoolean(pathKey: string): boolean {
    return this.fieldValue(pathKey) === true;
  }

  private normalizeFromParent(value: JsonLeafValue | undefined, valueType: JsonLeafType | 'unsupported'): JsonLeafValue {
    if (valueType === 'null') {
      return 'null';
    }
    if (valueType === 'number') {
      if (typeof value === 'number') {
        return value;
      }
      if (value === '' || value == null) {
        return null;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    if (valueType === 'boolean') {
      return value === true;
    }
    return value == null ? '' : String(value);
  }

  private leafValuesEqual(
    formValue: JsonLeafValue,
    parentValue: JsonLeafValue | undefined,
    valueType: JsonLeafType | 'unsupported'
  ): boolean {
    return this.normalizeFromParent(formValue, valueType) === this.normalizeFromParent(parentValue, valueType);
  }

  private coerceEmitValue(value: JsonLeafValue, valueType: JsonLeafType | 'unsupported'): JsonLeafValue {
    if (valueType === 'number') {
      if (typeof value === 'number') {
        return value;
      }
      if (value === '' || value == null) {
        return 0;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (valueType === 'boolean') {
      return value === true;
    }
    return value == null ? '' : String(value);
  }
}
