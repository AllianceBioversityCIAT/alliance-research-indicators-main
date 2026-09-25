import { homologateCenter } from './center.homologation';

describe('homologateCenter', () => {
  it('maps ExCIAT to the Regional Hub institution', () => {
    expect(homologateCenter(' ExCIAT ')).toBe(46);
  });

  it('maps ExBIO to the Headquarter institution', () => {
    expect(homologateCenter('exbio')).toBe(49);
  });
});
