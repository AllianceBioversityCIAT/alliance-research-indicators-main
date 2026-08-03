import {
  JsonEditorNode,
  JsonLeafType,
  JsonLeafValue
} from '@shared/interfaces/json-structure-editor.interface';

export type { JsonEditorNode, JsonEditorGroupNode, JsonEditorLeafNode, JsonLeafType, JsonLeafValue } from '@shared/interfaces/json-structure-editor.interface';

export function pathToKey(path: string[]): string {
  return path.join('.');
}

export function getJsonLeafType(value: unknown): JsonLeafType | 'unsupported' {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'unsupported';
}

export function isEditableJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function buildJsonEditorTree(source: Record<string, unknown>, path: string[] = []): JsonEditorNode[] {
  return Object.keys(source).map(key => {
    const value = source[key];
    const currentPath = [...path, key];
    const pathKey = pathToKey(currentPath);

    if (isEditableJsonObject(value)) {
      return {
        type: 'group',
        key,
        pathKey,
        children: buildJsonEditorTree(value, currentPath)
      };
    }

    const valueType = getJsonLeafType(value);
    return {
      type: 'leaf',
      key,
      pathKey,
      valueType: valueType === 'unsupported' ? 'string' : valueType
    };
  });
}

export function flattenJsonLeaves(source: unknown, path: string[] = [], out: Record<string, JsonLeafValue> = {}): Record<string, JsonLeafValue> {
  if (!isEditableJsonObject(source)) {
    return out;
  }

  for (const [key, value] of Object.entries(source)) {
    const currentPath = [...path, key];
    if (isEditableJsonObject(value)) {
      flattenJsonLeaves(value, currentPath, out);
    } else if (!Array.isArray(value)) {
      out[pathToKey(currentPath)] = (value as JsonLeafValue) ?? null;
    }
  }

  return out;
}

function coerceLeafValue(edited: JsonLeafValue, original: unknown): JsonLeafValue {
  if (typeof original === 'number') {
    if (edited === null || edited === '') return original;
    const parsed = typeof edited === 'number' ? edited : Number(edited);
    return Number.isNaN(parsed) ? original : parsed;
  }

  if (typeof original === 'boolean') {
    if (typeof edited === 'boolean') return edited;
    return String(edited).toLowerCase() === 'true';
  }

  if (original === null) {
    return edited === '' ? null : edited;
  }

  return edited == null ? '' : String(edited);
}

function cloneJsonObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneJsonTemplate(template: Record<string, unknown>): Record<string, unknown> {
  return cloneJsonObject(template);
}

export function applyFlatValuesToJson(template: Record<string, unknown>, values: Record<string, JsonLeafValue>): Record<string, unknown> {
  const clone = cloneJsonObject(template);

  const walk = (obj: Record<string, unknown>, path: string[] = []): void => {
    for (const key of Object.keys(obj)) {
      const currentPath = [...path, key];
      const pathKey = pathToKey(currentPath);
      const val = obj[key];

      if (isEditableJsonObject(val)) {
        walk(val, currentPath);
      } else if (!Array.isArray(val) && pathKey in values) {
        obj[key] = coerceLeafValue(values[pathKey], val);
      }
    }
  };

  walk(clone);
  return clone;
}

export function formatJsonFieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
