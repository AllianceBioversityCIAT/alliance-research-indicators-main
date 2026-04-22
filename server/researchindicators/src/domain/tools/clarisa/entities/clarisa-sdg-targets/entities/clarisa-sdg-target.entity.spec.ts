import { ClarisaSdgTarget } from './clarisa-sdg-target.entity';

describe('ClarisaSdgTarget', () => {
  it('entity metadata is loadable', () => {
    expect(ClarisaSdgTarget).toBeDefined();
    expect(ClarisaSdgTarget.name).toBe('ClarisaSdgTarget');
  });
});
