import { IpRightsApplicationOptionEnum } from '../../../../entities/ip-rights-application-options/enum/ip-rights-application-option.enum';
import { IpRightsApplicationHomologation } from './ip-rights-application.homologation';

describe('IpRightsApplicationHomologation', () => {
  it('maps exact PRMS Yes/No/Not sure answers to STAR options', () => {
    expect(IpRightsApplicationHomologation['Yes']).toBe(
      IpRightsApplicationOptionEnum.YES,
    );
    expect(IpRightsApplicationHomologation['No']).toBe(
      IpRightsApplicationOptionEnum.NO,
    );
    expect(IpRightsApplicationHomologation['Not sure']).toBe(
      IpRightsApplicationOptionEnum.NOT_SURE,
    );
  });

  it('does not map unsupported IP expert answer text', () => {
    expect(IpRightsApplicationHomologation['No, not now.']).toBeUndefined();
  });
});
