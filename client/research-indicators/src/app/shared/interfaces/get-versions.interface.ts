import { TransformResultCodeResponse } from './get-transform-result-code.interface';

export interface GetVersions {
  live: TransformResultCodeResponse;
  versions: TransformResultCodeResponse;
}
