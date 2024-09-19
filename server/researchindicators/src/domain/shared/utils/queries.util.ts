import { FindOptionsWhere, UpdateQueryBuilder } from 'typeorm';
import { BasicWhere } from '../global-dto/types';

export type FindOptionWhere = {
  not: boolean;
};

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
  options: BasicWhere<Entity>,
) => {
  for (let key in options) {
    const isArray = Array.isArray(options[key].value);
    const attr: string = `attr_${key}`;
    if (isArray) {
      const template = `${key} ${notOption(options[key].not, isArray)} IN (:...${attr})`;
      queryBuilder.andWhere(template, { [attr]: options[key].value });
    } else {
      const template = `${key} ${notOption(options[key].not, isArray)}= :${attr}`;
      queryBuilder.andWhere(template, { [`attr_${key}`]: options[key].value });
    }
  }
};

export const notOption = (isNot: boolean, isArray: boolean) => {
  return isNot ? (isArray ? 'NOT' : '!') : '';
};
