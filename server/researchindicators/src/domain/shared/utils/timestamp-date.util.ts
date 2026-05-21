import { BadRequestException } from '@nestjs/common';

const TIMESTAMP_FORMAT = {
  isoZ: /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z?$/,
  isoOffset:
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?[+-][0-9]{2}:[0-9]{2}$/,
  mysql:
    /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?$/,
  dateOnly: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
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

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(
        `Invalid ${fieldName}: not a valid timestamp`,
      );
    }
    return value;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `Invalid ${fieldName}: not a valid timestamp`,
      );
    }
    return parsed;
  }

  if (typeof value === 'string') {
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
      throw new BadRequestException(
        `Invalid ${fieldName}: not a valid timestamp`,
      );
    }

    return parsed;
  }

  throw new BadRequestException(
    `Invalid ${fieldName} type. Expected Date, string, number, or null`,
  );
};
