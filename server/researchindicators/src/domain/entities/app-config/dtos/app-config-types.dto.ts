import { AppConfig } from '../entities/app-config.entity';

export class AppConfigTypesDto<T> {
  json_value: T;
  simple_value: string;

  constructor(obj: AppConfig) {
    this.json_value = obj?.json_value ?? null;
    this.simple_value = obj?.simple_value ?? null;
  }
}
