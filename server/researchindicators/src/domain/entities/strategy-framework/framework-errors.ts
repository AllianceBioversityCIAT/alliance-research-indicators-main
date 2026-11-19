import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * Domain errors (design 2.1). `GlobalExceptions` copies `response.message`
 * into the envelope's `errors`, so each helper builds
 * `{ message: { description, field | blockers } }`.
 *
 * @akili-spec institutional-performance/strategy-framework
 */

export const badRequest = (field: string, description: string) =>
  new BadRequestException({ message: { description, field } });

export const conflict = (description: string, field?: string) =>
  new ConflictException({
    message: field ? { description, field } : { description },
  });

export interface FrameworkBlocker {
  reason: string;
  count: number;
  wayOut: string;
}

export const blocked = (
  description: string,
  blockers: readonly FrameworkBlocker[],
) => new ConflictException({ message: { description, blockers } });

/** Design 5.4: "Delete or move its N <plural level name> first." */
export const childrenWayOut = (
  count: number,
  pluralLevelName: string,
): string => `Delete or move its ${count} ${pluralLevelName} first.`;

/** Design 5.4: "Unlink it from those N institutional objectives first." */
export const institutionalObjectivesWayOut = (count: number): string =>
  `Unlink it from those ${count} institutional objectives first.`;

/** Design 5.4: "Remove its N records in <consumerName> first." */
export const consumerWayOut = (count: number, consumerName: string): string =>
  `Remove its ${count} records in ${consumerName} first.`;
