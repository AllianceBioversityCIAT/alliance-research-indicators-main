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
    message: field !== undefined ? { description, field } : { description },
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

/**
 * Design 5.4. N ≥ 2 (and N = 0): "Delete or move its N <plural level name> first."
 * N = 1 (D-STF-27): "Delete or move its 1 <level name> first."
 */
export const childrenWayOut = (
  count: number,
  levelName: string,
  pluralLevelName: string,
): string =>
  count === 1
    ? `Delete or move its 1 ${levelName} first.`
    : `Delete or move its ${count} ${pluralLevelName} first.`;

/**
 * Design 5.4. N ≥ 2 (and N = 0): "Unlink it from those N institutional objectives first."
 * N = 1 (D-STF-27): "Unlink it from that institutional objective first."
 */
export const institutionalObjectivesWayOut = (count: number): string =>
  count === 1
    ? 'Unlink it from that institutional objective first.'
    : `Unlink it from those ${count} institutional objectives first.`;

/**
 * Design 5.4. N ≥ 2 (and N = 0): "Remove its N records in <consumerName> first."
 * N = 1 (D-STF-27): "Remove its 1 record in <consumerName> first."
 */
export const consumerWayOut = (count: number, consumerName: string): string =>
  count === 1
    ? `Remove its 1 record in ${consumerName} first.`
    : `Remove its ${count} records in ${consumerName} first.`;
