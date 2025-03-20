import { OpenSearchDataType } from '../decorators/opensearch-property.decorator';

export type SchemaOpenSearch<T> = {
  mappings: MappingsOpenSearch<T>;
};

export type MappingsOpenSearch<T> = {
  dynamic: boolean;
  properties: PropertiesOpenSearch<T>;
};

export type PropertiesOpenSearch<T> = {
  [K in keyof T]?: {
    type: OpenSearchDataType;
    properties?: PropertiesOpenSearch<T>;
  };
};
