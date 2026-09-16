import { DegreesEnum } from '../../../entities/degrees/enum/degrees.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { DegreeHomologation } from '../../open-search/prms/homologation/degree.homologation';
import { SessionLengthHomologation } from '../../open-search/prms/homologation/session-length.homologation';

export type PrmsLengthTraining = 'PhD' | 'Master' | 'Short-term' | 'Long-term';

const SessionLengthTrainingHomologation: Record<
  SessionLengthEnum,
  PrmsLengthTraining
> = {
  [SessionLengthEnum.SHORT_TERM]: Object.entries(
    SessionLengthHomologation,
  ).find(
    ([, value]) => value === SessionLengthEnum.SHORT_TERM,
  )?.[0] as PrmsLengthTraining,
  [SessionLengthEnum.LONG_TERM]: Object.entries(SessionLengthHomologation).find(
    ([, value]) => value === SessionLengthEnum.LONG_TERM,
  )?.[0] as PrmsLengthTraining,
};

/**
 * Resolves STAR's degree and session-length fields to PRMS's single
 * `length_training` value. MSc uses the target vocabulary's "Master" label;
 * BSc and Other intentionally fall through to the session-length term.
 */
export function homologateLengthTraining(
  degreeId: DegreesEnum | null | undefined,
  sessionLengthId: SessionLengthEnum | null | undefined,
): PrmsLengthTraining | undefined {
  const inboundDegreeName = Object.entries(DegreeHomologation).find(
    ([, value]) => value === degreeId,
  )?.[0];

  if (inboundDegreeName === 'PhD') {
    return 'PhD';
  }

  if (inboundDegreeName === 'Master' || inboundDegreeName === 'MSc') {
    return 'Master';
  }

  return SessionLengthTrainingHomologation[sessionLengthId];
}
