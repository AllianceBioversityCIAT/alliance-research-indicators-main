import { FindOptionsWhere, UpdateQueryBuilder } from 'typeorm';

/**
 *
 * @param options The options to be used to find the result contracts
 * @param template The template to be used to create the where clause
 * @returns
 * @description This method creates the where clause for the find options
 * based on the template provided, all conditions are concatenated with AND
 * @example {{ATTR}} NOT IN {{VALUES}}
 */
export const updateQueryBuilderWhere = <Entity>(
  queryBuilder: UpdateQueryBuilder<Entity>,
  options: FindOptionsWhere<Entity>,
  template: string,
) => {
  for (let key in options) {
    let composed: string;
    if (Array.isArray(options[key])) {
      composed = template
        .replace('{{ATTR}}', key)
        .replace('{{VALUES}}', `(:...attr_${key})`);
      queryBuilder.andWhere(composed, { [`attr_${key}`]: options[key] });
    } else {
      composed = template
        .replace('{{ATTR}}', key)
        .replace('{{VALUES}}', `:attr_${key}`);
      queryBuilder.andWhere(composed, { [`attr_${key}`]: options[key] });
    }
  }
};
