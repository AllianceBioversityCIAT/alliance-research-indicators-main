import { AgressoContractMapper, mapCountries } from './agresso-contract.mapper';
import { ClarisaSdg } from '../../tools/clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';

describe('AgressoContractMapper', () => {
  it('maps SDG short names and strips legacy fields', () => {
    const raw = {
      agreement_id: 'A-1',
      countryId: 'x',
      country: 'y',
      sustainableDevelopmentGoals: 'Goal1:foo;Goal2:bar',
    } as any;
    const sdgs: Partial<ClarisaSdg>[] = [
      { short_name: 'goal1' },
      { short_name: 'other' },
    ];
    const out = AgressoContractMapper(raw, sdgs as ClarisaSdg[]) as any;
    expect(out.countryId).toBeUndefined();
    expect(out.country).toBeUndefined();
    expect(out.sustainableDevelopmentGoals).toBeUndefined();
    expect(out.sdgs).toEqual([{ short_name: 'goal1' }]);
    expect(out.agreement_id).toBe('A-1');
  });
});

describe('mapCountries', () => {
  it('splits comma list and uppercases iso codes', () => {
    const rows = mapCountries(' co, BR , ', ' ctr ');
    expect(rows).toHaveLength(2);
    expect(rows[0].iso_alpha_2).toBe('CO');
    expect(rows[0].agreement_id).toBe('ctr');
    expect(rows[1].iso_alpha_2).toBe('BR');
  });

  it('returns empty array for empty input', () => {
    expect(mapCountries('', 'c')).toEqual([]);
  });
});
