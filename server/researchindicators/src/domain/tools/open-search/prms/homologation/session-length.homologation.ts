import { SessionLengthEnum } from '../../../../entities/session-lengths/enum/session-lengths.enum';

/**
 * Maps PRMS `training_length.term` to STAR {@link SessionLengthEnum}.
 *
 * Keys are the exact PRMS `term` values — prefer `term` over `name` because
 * names like "Master" / "PhD" still carry `term: "Long-term"`.
 *
 * STAR seed names (`1727119632564-InsertDataControl`):
 * Short-term, Long-term.
 */
export const SessionLengthHomologation: Record<string, SessionLengthEnum> = {
  'Short-term': SessionLengthEnum.SHORT_TERM,
  'Long-term': SessionLengthEnum.LONG_TERM,
};
