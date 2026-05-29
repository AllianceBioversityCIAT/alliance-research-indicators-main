import { BadRequestException } from '@nestjs/common';

const TIMESTAMP_FORMAT = {
  isoZ: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z?$/,
  isoOffset:
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}:\d{2}$/,
  mysql: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/,
  dateOnly: /^\d{4}-\d{2}-\d{2}$/,
} as const;

type TimestampFormatKey = keyof typeof TIMESTAMP_FORMAT;

const getCapacitySharingTimestampFormat = (
  value: string,
): TimestampFormatKey | null => {
  if (TIMESTAMP_FORMAT.isoZ.test(value)) {
    return 'isoZ';
  }
  if (TIMESTAMP_FORMAT.isoOffset.test(value)) {
    return 'isoOffset';
  }
  if (TIMESTAMP_FORMAT.mysql.test(value)) {
    return 'mysql';
  }
  if (TIMESTAMP_FORMAT.dateOnly.test(value)) {
    return 'dateOnly';
  }
  return null;
};

const isValidCapacitySharingTimestampString = (value: string): boolean =>
  getCapacitySharingTimestampFormat(value) !== null;

const invalidTimestampException = (fieldName: string): BadRequestException =>
  new BadRequestException(`Invalid ${fieldName}: not a valid timestamp`);

const parseValidDate = (
  value: Date | number,
  fieldName: string,
): Date => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidTimestampException(fieldName);
  }
  return parsed;
};

const parseCapacitySharingTimestampString = (
  value: string,
  fieldName: string,
): Date | null => {
  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  if (trimmed === 'Invalid Date') {
    throw new BadRequestException(`Invalid ${fieldName}: Invalid Date`);
  }

  if (!isValidCapacitySharingTimestampString(trimmed)) {
    throw new BadRequestException(
      `Invalid ${fieldName} format. Use ISO 8601 (e.g. 2025-06-06T12:51:43.861Z) or YYYY-MM-DD HH:mm:ss[.ffffff]`,
    );
  }

  const parsed = toDateFromCapacitySharingString(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidTimestampException(fieldName);
  }

  return parsed;
};

const toDateFromCapacitySharingString = (value: string): Date => {
  const trimmed = value.trim();
  const format = getCapacitySharingTimestampFormat(trimmed);

  switch (format) {
    case 'isoZ':
    case 'isoOffset':
      return new Date(trimmed);
    case 'mysql': {
      const [datePart, timePart] = trimmed.split(' ');
      const fractional = timePart.includes('.') ? timePart : `${timePart}.000`;
      return new Date(`${datePart}T${fractional}Z`);
    }
    case 'dateOnly':
      return new Date(`${trimmed}T00:00:00.000Z`);
    default:
      throw new BadRequestException('Invalid timestamp format');
  }
};

export const parseCapacitySharingTimestamp = (
  value: unknown,
  fieldName: string,
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date || typeof value === 'number') {
    return parseValidDate(value, fieldName);
  }

  if (typeof value === 'string') {
    return parseCapacitySharingTimestampString(value, fieldName);
  }

  throw new BadRequestException(
    `Invalid ${fieldName} type. Expected Date, string, number, or null`,
  );
};
