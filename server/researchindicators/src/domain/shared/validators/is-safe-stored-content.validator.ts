import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  isSafeStoredJsonPayload,
  isSafeStoredString,
} from '../utils/safe-stored-content.util';

@ValidatorConstraint({ name: 'isSafeStoredContent', async: false })
export class IsSafeStoredContentConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    return isSafeStoredString(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains disallowed or potentially unsafe content`;
  }
}

export function IsSafeStoredContent(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSafeStoredContent',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsSafeStoredContentConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isSafeStoredJson', async: false })
export class IsSafeStoredJsonConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    return isSafeStoredJsonPayload(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains disallowed keys or potentially unsafe content`;
  }
}

export function IsSafeStoredJson(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSafeStoredJson',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsSafeStoredJsonConstraint,
    });
  };
}
