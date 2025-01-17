export type OpenSearchPropertyOptions = {
  type: OpenSearchDataType;
  analyzer?: OpenSearchAnalyzer;
  fielddata?: boolean;
  nestedType?: new () => unknown;
};

export type OpenSearchDataType =
  | 'text'
  | 'keyword'
  | 'integer'
  | 'long'
  | 'float'
  | 'double'
  | 'date'
  | 'boolean'
  | 'geo_point'
  | 'nested'
  | 'object';

type OpenSearchAnalyzer =
  | 'standard'
  | 'simple'
  | 'whitespace'
  | 'stop'
  | 'keyword'
  | 'lowercase'
  | 'upper_case'
  | 'asciifolding'
  | 'porter_stem'
  | 'snowball'
  | 'english'
  | 'french'
  | 'german'
  | 'russian'
  | 'custom';

export const OpenSearchMetadataName = 'opensearch:properties';

export const OpenSearchProperty = (options: OpenSearchPropertyOptions) => {
  return (target: object, propertyKey: string | symbol) => {
    const constructor = target.constructor;
    const existingMetadata =
      Reflect.getMetadata(OpenSearchMetadataName, constructor) || [];
    Reflect.defineMetadata(
      OpenSearchMetadataName,
      [...existingMetadata, { propertyKey, options }],
      constructor,
    );
  };
};
