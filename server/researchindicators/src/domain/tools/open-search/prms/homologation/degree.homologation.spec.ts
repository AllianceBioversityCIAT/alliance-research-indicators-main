import { DegreesEnum } from '../../../../entities/degrees/enum/degrees.enum';
import { DegreeHomologation } from './degree.homologation';

describe('DegreeHomologation', () => {
  it('maps exact PRMS long-term training_length.name values to STAR degrees', () => {
    expect(DegreeHomologation['PhD']).toBe(DegreesEnum.PHD);
    expect(DegreeHomologation['Master']).toBe(DegreesEnum.MSC);
    expect(DegreeHomologation['MSc']).toBe(DegreesEnum.MSC);
    expect(DegreeHomologation['BSc']).toBe(DegreesEnum.BSC);
    expect(DegreeHomologation['Other']).toBe(DegreesEnum.OTHER);
  });

  it('does not map session-length terms used as name', () => {
    expect(DegreeHomologation['Short-term']).toBeUndefined();
    expect(DegreeHomologation['Long-term']).toBeUndefined();
  });
});
