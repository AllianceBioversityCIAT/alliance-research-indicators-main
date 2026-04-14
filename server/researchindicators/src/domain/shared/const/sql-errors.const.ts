import { HttpStatus } from '@nestjs/common';

export const sqlErrorsHelper = (error: any) => {
  return SQL_ERRORS?.[error?.errno] ?? SQL_ERRORS.POTATO;
};

export const SQL_ERRORS = {
  POTATO: {
    friendlyName: 'Something went wrong',
    message:
      'We couldn’t complete this action. Please try again later. If it keeps happening, contact support.',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'POTATO',
  },
  1062: {
    friendlyName: 'Duplicate entry',
    message:
      'his record already exists. Use a different value or update the existing record.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_DUP_ENTRY',
  },
  1048: {
    friendlyName: 'Missing required value',
    message:
      'A required value was not provided. Please fill in all mandatory fields.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_BAD_NULL_ERROR',
  },
  1054: {
    friendlyName: 'Invalid data request',
    message:
      'The request could not be processed due to a data configuration issue. Please contact support.',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'ER_BAD_FIELD_ERROR',
  },
  1136: {
    friendlyName: 'Invalid data format',
    message:
      'The number of values provided does not match what is expected. Please check your input.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_WRONG_VALUE_COUNT_ON_ROW',
  },
  1146: {
    friendlyName: 'Invalid data request',
    message:
      'The request could not be completed due to a data configuration issue. Please contact support.',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'ER_NO_SUCH_TABLE',
  },
  1205: {
    friendlyName: 'Request timed out',
    message:
      'The database was busy and could not finish in time. Please try again in a moment.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'ER_LOCK_WAIT_TIMEOUT',
  },
  1213: {
    friendlyName: 'Conflict while saving',
    message:
      'Another change happened at the same time. Please try your action again.',
    status: HttpStatus.CONFLICT,
    code: 'ER_LOCK_DEADLOCK',
  },
  1264: {
    friendlyName: 'Value out of range',
    message:
      'One of the values is outside the allowed range. Please adjust it and try again.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_WARN_OUT_OF_RANGE',
  },
  1292: {
    friendlyName: 'Invalid value',
    message:
      'One of the values has an invalid format or type. Please check your input.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_TRUNCATED_WRONG_VALUE',
  },
  1364: {
    friendlyName: 'Incomplete data',
    message:
      'A required field has no value and no default. Please provide all required information.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_NO_DEFAULT_FOR_FIELD',
  },
  1366: {
    friendlyName: 'Invalid numeric value',
    message:
      'A numeric value could not be stored correctly. Please check the numbers you entered.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_TRUNCATED_WRONG_VALUE',
  },
  1406: {
    friendlyName: 'Value too long or invalid',
    message:
      'One of the values is too long or not valid for its field. Please shorten or correct it.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
  },
  1451: {
    friendlyName: 'Cannot remove or change record',
    message:
      'This record is still linked to other data. Remove or update those links first.',
    status: HttpStatus.CONFLICT,
    code: 'ER_ROW_IS_REFERENCED_2',
  },
  1452: {
    friendlyName: 'Invalid reference',
    message:
      'Something you selected does not exist or is no longer available. Please choose a valid option.',
    status: HttpStatus.BAD_REQUEST,
    code: 'ER_NO_REFERENCED_ROW_2',
  },
  2006: {
    friendlyName: 'Service temporarily unavailable',
    message: 'The database connection was lost. Please try again in a moment.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'CR_SERVER_GONE_ERROR',
  },
  2013: {
    friendlyName: 'Service temporarily unavailable',
    message:
      'The connection was interrupted while processing your request. Please try again.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'CR_SERVER_LOST',
  },
};
