import { SessionLengthEnum } from '../../../../entities/session-lengths/enum/session-lengths.enum';
import { SessionLengthHomologation } from './session-length.homologation';

describe('SessionLengthHomologation', () => {
  it('maps exact PRMS training_length.term values to STAR session lengths', () => {
    expect(SessionLengthHomologation['Short-term']).toBe(
      SessionLengthEnum.SHORT_TERM,
    );
    expect(SessionLengthHomologation['Long-term']).toBe(
      SessionLengthEnum.LONG_TERM,
    );
  });

  it('does not map degree-like names used as training_length.name', () => {
    expect(SessionLengthHomologation['Master']).toBeUndefined();
    expect(SessionLengthHomologation['PhD']).toBeUndefined();
  });
});
