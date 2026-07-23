import { mapOtherResultLinkPayloadToResult } from './map-link-other-result-to-result';
import { OtherResultLinkPayload } from '@interfaces/link-results.interface';

describe('mapOtherResultLinkPayloadToResult', () => {
  const base: OtherResultLinkPayload = {
    result_id: 1,
    result_official_code: 'R-1',
    platform_code: 'STAR',
    title: 'Title'
  };

  it('maps minimal payload', () => {
    const r = mapOtherResultLinkPayloadToResult(base);
    expect(r.result_id).toBe(1);
    expect(r.result_official_code).toBe('R-1');
    expect(r.is_active).toBe(true);
    expect(r.result_status).toBeUndefined();
    expect(r.indicators).toBeUndefined();
    expect(r.result_contracts).toBeUndefined();
  });

  it('defaults platform and title when missing and normalizes optional links', () => {
    const r = mapOtherResultLinkPayloadToResult({
      result_id: 2,
      result_official_code: 9,
      external_link: null,
      public_link: null,
      description: undefined
    } as OtherResultLinkPayload);
    expect(r.result_platform).toBe('');
    expect(r.platform_code).toBe('');
    expect(r.title).toBe('');
    expect(r.external_link).toBeUndefined();
    expect(r.public_link).toBeUndefined();
    expect(r.description).toBeNull();
  });

  it('stringifies undefined result_official_code as empty', () => {
    const r = mapOtherResultLinkPayloadToResult({
      result_id: 1,
      result_official_code: undefined as unknown as string
    } as OtherResultLinkPayload);
    expect(r.result_official_code).toBe('');
  });

  it('uses result_status object when present', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_status: {
        result_status_id: 5,
        name: 'N',
        description: 'D',
        action_description: 'A',
        editable_roles: undefined,
        config: undefined
      }
    });
    expect(r.result_status?.result_status_id).toBe(5);
    expect(r.result_status?.name).toBe('N');
    expect(r.result_status?.editable_roles).toBeUndefined();
  });

  it('builds result_status from result_status_id when object absent', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_status_id: 3,
      status_name: 'Sn',
      status_description: 'Sd',
      status_config: { color: 'x' } as any
    });
    expect(r.result_status).toEqual({
      result_status_id: 3,
      name: 'Sn',
      description: 'Sd',
      config: { color: 'x' }
    });
  });

  it('uses indicator object when present', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      indicator: { indicator_id: 9, name: 'IN', icon_src: '/i.png' }
    });
    expect(r.indicators).toEqual({ name: 'IN', icon_src: '/i.png' });
    expect(r.indicator_id).toBe(9);
  });

  it('uses indicator defaults when indicator has missing fields', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      indicator: {}
    });
    expect(r.indicators).toEqual({ name: '', icon_src: '' });
  });

  it('uses indicator_name when indicator object absent', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      indicator_name: 'ByName',
      indicator_icon_src: '/z.svg'
    });
    expect(r.indicators).toEqual({ name: 'ByName', icon_src: '/z.svg' });
  });

  it('uses empty icon_src when indicator_name path has no icon', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      indicator_name: 'OnlyName'
    });
    expect(r.indicators).toEqual({ name: 'OnlyName', icon_src: '' });
  });

  it('picks primary contract when is_primary is 1', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_contracts: [
        { contract_id: 'A', is_primary: 0, agresso_contract: { description: 'Long' } },
        { contract_id: 'B', is_primary: 1, agresso_contract: { short_title: 'Short' } }
      ]
    });
    expect(r.result_contracts?.contract_id).toBe('B');
    expect((r.result_contracts as any)?.contract?.description).toBe('Short');
  });

  it('falls back to first contract when no primary', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_contracts: [{ contract_id: 'Only', is_primary: 0, agresso_contract: { description: 'D1' } }]
    });
    expect(r.result_contracts?.contract_id).toBe('Only');
    expect((r.result_contracts as any)?.contract?.description).toBe('D1');
  });

  it('prefers agresso description over short_title for project label', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_contracts: [
        {
          contract_id: 'C',
          is_primary: 1,
          agresso_contract: { description: 'Full', short_title: 'Short' }
        }
      ]
    });
    expect((r.result_contracts as any)?.contract?.description).toBe('Full');
  });

  it('uses short_title when description missing', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_contracts: [{ contract_id: 'C', is_primary: 1, agresso_contract: { short_title: 'ST' } }]
    });
    expect((r.result_contracts as any)?.contract?.description).toBe('ST');
  });

  it('omits nested contract label when primary has no agresso fields', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      result_contracts: [{ contract_id: 'C', is_primary: 1 }]
    });
    expect(r.result_contracts?.contract_id).toBe('C');
    expect((r.result_contracts as any)?.contract).toBeUndefined();
  });

  it('sets is_active from payload', () => {
    expect(mapOtherResultLinkPayloadToResult({ ...base, is_active: false }).is_active).toBe(false);
  });

  it('maps optional links and description', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      external_link: 'https://x',
      public_link: 'https://p',
      description: 'Desc',
      report_year_id: 2025
    });
    expect(r.external_link).toBe('https://x');
    expect(r.public_link).toBe('https://p');
    expect(r.description).toBe('Desc');
    expect(r.report_year_id).toBe(2025);
  });

  it('uses indicator_id when indicator object has no id', () => {
    const r = mapOtherResultLinkPayloadToResult({
      ...base,
      indicator_id: 42,
      indicator: { name: 'N' }
    });
    expect(r.indicator_id).toBe(42);
  });
});
