export type JsonLeafValue = string | number | boolean | null;
export type JsonLeafType = 'string' | 'number' | 'boolean' | 'null';

export interface JsonEditorLeafNode {
  type: 'leaf';
  key: string;
  pathKey: string;
  valueType: JsonLeafType;
}

export interface JsonEditorGroupNode {
  type: 'group';
  key: string;
  pathKey: string;
  children: JsonEditorNode[];
}

export type JsonEditorNode = JsonEditorLeafNode | JsonEditorGroupNode;
