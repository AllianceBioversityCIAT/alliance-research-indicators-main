import { JsonEditorNode, JsonLeafValue } from '@shared/interfaces/json-structure-editor.interface';

export interface FacetOption {
  label: string;
  value: string | null;
}

export interface JsonRowDraft {
  template: Record<string, unknown>;
  values: Record<string, JsonLeafValue>;
  sections: JsonEditorNode[];
  dirty: boolean;
}

/** Editable table column widths (px). Adjust each value manually as needed. */
export const VARIABLE_CONFIG_TABLE_COLUMN_WIDTHS = {
  category: 150,
  subcategory: 170,
  variableName: 240,
  descriptionMin: 240,
  value: 240,
  lastUpdated: 180,
  updatedBy: 180,
  actions: 90
};
