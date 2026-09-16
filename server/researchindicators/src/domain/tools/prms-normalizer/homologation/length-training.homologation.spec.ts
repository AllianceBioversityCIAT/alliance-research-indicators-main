import { DegreesEnum } from '../../../entities/degrees/enum/degrees.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { homologateLengthTraining } from './length-training.homologation';

describe('homologateLengthTraining', () => {
  it('uses the PRMS degree labels for PhD and MSc', () => {
    expect(
      homologateLengthTraining(DegreesEnum.PHD, SessionLengthEnum.SHORT_TERM),
    ).toBe('PhD');
    expect(
      homologateLengthTraining(DegreesEnum.MSC, SessionLengthEnum.LONG_TERM),
    ).toBe('Master');
  });

  it.each([
    [DegreesEnum.BSC, SessionLengthEnum.SHORT_TERM, 'Short-term'],
    [DegreesEnum.BSC, SessionLengthEnum.LONG_TERM, 'Long-term'],
    [DegreesEnum.OTHER, SessionLengthEnum.SHORT_TERM, 'Short-term'],
    [DegreesEnum.OTHER, SessionLengthEnum.LONG_TERM, 'Long-term'],
  ])(
    'falls through from degree %i and session length %i to %s',
    (degreeId, sessionLengthId, expected) => {
      expect(homologateLengthTraining(degreeId, sessionLengthId)).toBe(
        expected,
      );
    },
  );
});
