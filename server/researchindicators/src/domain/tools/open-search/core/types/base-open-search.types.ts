import { ObjectId } from 'typeorm';
import { OpenSearchPropertyOptions } from '../../decorators/opensearch-property.decorator';

/**
 * A single property handler for SearchFields.
 */
export type SearchFieldsProperty<Property> =
  Property extends Promise<infer I>
    ? SearchFieldsProperty<NonNullable<I>> | boolean
    : Property extends Array<infer I>
      ? SearchFieldsProperty<NonNullable<I>> | boolean
      : Property extends string
        ? boolean
        : Property extends number
          ? boolean
          : Property extends boolean
            ? boolean
            : Property extends new () => any
              ? boolean
              : Property extends Buffer
                ? boolean
                : Property extends Date
                  ? boolean
                  : Property extends ObjectId
                    ? boolean
                    : Property extends object
                      ? SearchFields<Property> | boolean
                      : boolean;

/**
 * Relations find options.
 */
export type SearchFields<Entity> = {
  [P in keyof Entity]?: P extends 'toString'
    ? unknown
    : SearchFieldsProperty<NonNullable<Entity[P]>>;
};

export type PropertyDescriptor = {
  propertyKey: string;
  options: OpenSearchPropertyOptions;
};

export type TransformToPropertyDescriptors<T> = {
  [K in keyof T]?: T[K] extends object
    ? TransformToPropertyDescriptors<T[K]>
    : PropertyDescriptor;
};
