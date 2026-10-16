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

  /**
   * Measured on Dev: result 19949 (and its Approved version) carries
   * degree_id NULL with session_length_id set — a non-degree training. PRMS wants
   * one string enum, never a degree, so the session term is the whole answer.
   */
  it.each([
    [null, SessionLengthEnum.SHORT_TERM, 'Short-term'],
    [null, SessionLengthEnum.LONG_TERM, 'Long-term'],
    [undefined, SessionLengthEnum.SHORT_TERM, 'Short-term'],
  ])(
    'resolves from the session length alone when the degree is %s',
    (degreeId, sessionLengthId, expected) => {
      expect(homologateLengthTraining(degreeId, sessionLengthId)).toBe(
        expected,
      );
    },
  );

  it('still resolves a PhD when no session length is recorded', () => {
    expect(homologateLengthTraining(DegreesEnum.PHD, null)).toBe('PhD');
  });

  it('resolves nothing when neither input can produce the enum', () => {
    expect(homologateLengthTraining(null, null)).toBeUndefined();
  });
});
