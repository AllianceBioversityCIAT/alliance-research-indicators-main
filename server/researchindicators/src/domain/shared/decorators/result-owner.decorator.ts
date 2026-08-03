import { SetMetadata } from '@nestjs/common';

export enum ResultOwnerType {
  CREATOR = 'CREATOR',
  PI = 'PI',
  CONTACT = 'CONTACT',
}

export const RESULT_OWNER_KEY = 'result-owner-types';

export const DEFAULT_RESULT_OWNER_TYPES = [
  ResultOwnerType.CREATOR,
  ResultOwnerType.PI,
  ResultOwnerType.CONTACT,
];

export const ResultOwner = (...ownerTypes: ResultOwnerType[]) =>
  SetMetadata(
    RESULT_OWNER_KEY,
    ownerTypes.length ? ownerTypes : DEFAULT_RESULT_OWNER_TYPES,
  );
