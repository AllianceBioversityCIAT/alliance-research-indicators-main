import { buildProjectContext } from './project-context.util';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { ContractClarisaProject } from '@shared/interfaces/contract-clarisa-project.interface';
import { ContractDashboardReport } from '@shared/interfaces/contract-dashboard.interface';

describe('project-context.util — buildProjectContext', () => {
  it('all-null inputs return undefined (R-EOC-002 AC.4 / D-EOC-1 empty-safe rule)', () => {
    expect(buildProjectContext(null, null, null)).toBeUndefined();
  });

  it('CLARISA-wins: overlapping PROJECT fields prefer CLARISA over Agresso, section labeled CLARISA (updated)', () => {
    const project: GetProjectDetail = {
      full_name: 'Agresso Title',
      description: 'Agresso description',
      start_date: '2020-01-01',
      end_date: '2020-12-31',
      grant_amount_usd: 100,
      donor: 'Agresso Donor',
      project_lead_description: 'Agresso Lead'
    };
    const clarisaProject: ContractClarisaProject = {
      id: 1,
      short_name: 'CX',
      full_name: 'CLARISA Title',
      description: 'CLARISA description',
      start_date: '2021-06-01',
      end_date: '2022-06-01',
      total_budget: '500000',
      funder_institution: { id: 1, name: 'CLARISA Funder' },
      lead_institution: { id: 2, name: 'CLARISA Lead' },
      science_programs: []
    };

    const result = buildProjectContext(project, clarisaProject, null);

    expect(result).toBeDefined();
    expect(result?.provenance.projectSource).toBe('clarisa');
    expect(result?.text).toContain('[PROJECT — source: CLARISA (updated)]');
    expect(result?.text).toContain('Title: CLARISA Title');
    expect(result?.text).toContain('Description: CLARISA description');
    expect(result?.text).toContain('Dates: 2021-06-01 to 2022-06-01');
    expect(result?.text).toContain('Budget: 500000');
    expect(result?.text).toContain('Funder: CLARISA Funder');
    expect(result?.text).toContain('Lead: CLARISA Lead');
    // The Agresso-only values must NOT leak into the CLARISA-won PROJECT section.
    expect(result?.text).not.toContain('Agresso Title');
    expect(result?.text).not.toContain('Agresso description');
    expect(result?.text).not.toContain('Agresso Donor');
    expect(result?.text).not.toContain('Agresso Lead');
  });

  it('Agresso-only: no CLARISA block — PROJECT section falls back to Agresso and is labeled Agresso; CONTRACT section is Agresso-only fields', () => {
    const project: GetProjectDetail = {
      agreement_id: 'AG-123',
      full_name: 'Agresso Only Title',
      description: 'Agresso only description',
      start_date: '2019-01-01',
      end_date: '2019-12-31',
      grant_amount_usd: 250,
      center_amount_usd: 50,
      funding_type: 'Bilateral',
      donor: 'Agresso Donor',
      project_lead_description: 'Agresso Lead',
      division: 'Division A',
      unit: 'Unit B',
      sdgs: [1, 2],
      cgiar_entities: [{ code: 'E1', name: 'Entity One' }]
    };

    const result = buildProjectContext(project, null, null);

    expect(result).toBeDefined();
    expect(result?.provenance.projectSource).toBe('agresso');
    expect(result?.text).toContain('[PROJECT — source: Agresso]');
    expect(result?.text).toContain('Title: Agresso Only Title');
    expect(result?.text).toContain('Budget: 250 USD');
    expect(result?.text).toContain('[CONTRACT — source: Agresso]');
    expect(result?.text).toContain('Agreement ID: AG-123');
    expect(result?.text).toContain('Funding type: Bilateral');
    expect(result?.text).toContain('Grant/center amounts: grant 250 USD, center 50 USD');
    expect(result?.text).toContain('Division/Unit: Division A / Unit B');
    expect(result?.text).toContain('SDGs: 1, 2');
    expect(result?.text).toContain('CGIAR entities: Entity One');
  });

  it('STAR-analytics sections: RESULTS ANALYTICS / REACH / STRATEGY built from the dashboard report even with no project/CLARISA data', () => {
    const dashboard: ContractDashboardReport = {
      summary: {
        total: 42,
        by_status: [{ status_id: 1, name: 'Approved', count: 30 }],
        by_year: [{ year: 2023, count: 20 }],
        by_indicator_year: [{ indicator_id: 5, year: 2023, count: 10 }],
        partner_institutions: 3
      },
      tops: {
        partners: [{ institution_name: 'Partner Org' }],
        primary_levers: null,
        main_contacts: null,
        contributors: null
      },
      geo_scope: {
        contract_id: 'c1',
        limit: 5,
        geo_scope_summary: { global: 1, regional: 0, countries: 4 },
        top_regions: [],
        top_countries: []
      },
      sp_alignment: {
        sps: [{ sp_code: 'SP1', name: 'Science Program 1', category: null, icon_key: null, links: [] }],
        results_with_alignment: 12,
        results_without_alignment: 8
      }
    };

    const result = buildProjectContext(null, null, dashboard);

    expect(result).toBeDefined();
    // R-EOC-007 truthfulness: no [PROJECT] section was emitted at all (no project/CLARISA input),
    // so the footer must not claim a project-data source of either kind.
    expect(result?.provenance.projectSource).toBe('none');
    expect(result?.text).not.toContain('[PROJECT');
    expect(result?.text).not.toContain('[CONTRACT');
    expect(result?.text).toContain('[RESULTS ANALYTICS — source: STAR]');
    expect(result?.text).toContain('Total results: 42');
    expect(result?.text).toContain('By status: Approved: 30');
    expect(result?.text).toContain('By year: 2023: 20');
    expect(result?.text).toContain('Indicators covered: 1');
    expect(result?.text).toContain('[REACH — source: STAR]');
    expect(result?.text).toContain('Top partner institutions: Partner Org');
    expect(result?.text).toContain('Geo scope: global: 1, countries: 4');
    expect(result?.text).toContain('[STRATEGY — source: STAR]');
    expect(result?.text).toContain('Results with SP alignment: 12, without: 8');
    expect(result?.text).toContain('SP codes: SP1');
  });

  it('STRATEGY folds in CLARISA Science-Program allocations when mapped', () => {
    const clarisaProject: ContractClarisaProject = {
      id: 1,
      short_name: 'CX',
      science_programs: [{ code: 'SP2', name: 'Science Program 2', allocation: 0.5 }]
    };

    const result = buildProjectContext(null, clarisaProject, null);

    expect(result?.text).toContain('[STRATEGY — source: STAR]');
    expect(result?.text).toContain('CLARISA SP allocations: SP2 (0.5)');
  });

  it('truncation at a section boundary: a trailing section is dropped whole, never cut mid-section, result stays <= 8000 chars', () => {
    const project: GetProjectDetail = { full_name: 'Boundary Project', description: 'Short project description.' };
    // REACH is sized to stay comfortably under the bound on its own (~2.4k chars); STRATEGY is
    // padded far past it (~13k chars via 1000 SP codes). PROJECT + RESULTS ANALYTICS + REACH alone
    // total well under 8,000, so dropping STRATEGY whole is exactly enough — REACH must survive
    // intact, not truncated mid-list.
    const partners = Array.from({ length: 80 }, (_, i) => ({ institution_name: `Partner Institution Number ${i}` }));
    const spCodes = Array.from({ length: 1000 }, (_, i) => ({
      sp_code: `SP-CODE-${String(i).padStart(4, '0')}`,
      name: `Science Program ${i}`,
      category: null,
      icon_key: null,
      links: []
    }));
    const dashboard: ContractDashboardReport = {
      summary: { total: 5, by_status: [], by_year: [], by_indicator_year: [], partner_institutions: 1 },
      tops: { partners, primary_levers: null, main_contacts: null, contributors: null },
      geo_scope: null,
      sp_alignment: { sps: spCodes, results_with_alignment: 1, results_without_alignment: 1 }
    };

    const result = buildProjectContext(project, null, dashboard);

    expect(result).toBeDefined();
    expect(result!.text.length).toBeLessThanOrEqual(8_000);
    // STRATEGY was dropped whole — no partial/garbled fragment of it survives.
    expect(result!.text).not.toContain('[STRATEGY');
    expect(result!.provenance.sections).toEqual(['PROJECT', 'RESULTS ANALYTICS', 'REACH']);
    // PROJECT is always kept (R-EOC-002 AC.3).
    expect(result!.text).toContain('[PROJECT — source: Agresso]');
    // REACH survived the cut whole: its last partner (index 79) is present intact, proving the
    // section was dropped-or-kept as a unit rather than truncated mid-list.
    expect(result!.text).toContain('Partner Institution Number 79');
    expect(result!.text.endsWith('Partner Institution Number 79')).toBe(true);
  });

  it('truncation within PROJECT alone: an oversized description is cut at the last sentence boundary, never mid-sentence', () => {
    const sentence = 'This project sentence is deliberately long enough to pad the digest well past the boundary. ';
    const oversizedDescription = sentence.repeat(120); // ~11,000 chars, all full sentences
    const project: GetProjectDetail = { full_name: 'Oversized Project', description: oversizedDescription };

    const result = buildProjectContext(project, null, null);

    expect(result).toBeDefined();
    expect(result!.provenance.sections).toEqual(['PROJECT']);
    expect(result!.text.length).toBeLessThanOrEqual(8_000);
    expect(result!.text.length).toBeLessThan(oversizedDescription.length);
    // Cut at a sentence boundary: the text ends with the sentence-ending period, not mid-word.
    expect(result!.text.endsWith('.')).toBe(true);
    expect(result!.text.endsWith('boundary.') || result!.text.endsWith(sentence.trim())).toBe(true);
  });

  it('R-EOC-007: sparse CLARISA row (id only, no usable field) over an all-Agresso body is NOT labeled clarisa — the bug the leader flagged, provenance must reflect field EMISSION, not mere block presence', () => {
    // Real upstream responses can be this sparse (id only) despite the TS type promising more —
    // cast bypasses the type to represent that degraded shape.
    const clarisaProject = { id: 42, science_programs: [] } as unknown as ContractClarisaProject;
    const project: GetProjectDetail = {
      full_name: 'Agresso Title',
      description: 'Agresso description',
      start_date: '2020-01-01',
      end_date: '2020-12-31',
      grant_amount_usd: 100,
      donor: 'Agresso Donor',
      project_lead_description: 'Agresso Lead'
    };

    const result = buildProjectContext(project, clarisaProject, null);

    expect(result).toBeDefined();
    // Every PROJECT line actually emitted comes from Agresso — the sparse CLARISA block
    // contributed nothing usable.
    expect(result?.text).toContain('Title: Agresso Title');
    expect(result?.text).toContain('Description: Agresso description');
    expect(result?.text).toContain('Funder: Agresso Donor');
    expect(result?.text).toContain('Lead: Agresso Lead');
    // The presence-based bug would label this 'clarisa' purely because `clarisaProject` is
    // non-null — truthful derivation must say 'agresso' since no CLARISA field was emitted.
    expect(result?.provenance.projectSource).toBe('agresso');
  });

  it('is deterministic: same inputs produce byte-identical output across repeated calls', () => {
    const project: GetProjectDetail = { full_name: 'Deterministic Project', start_date: '2020-01-01' };
    const first = buildProjectContext(project, null, null);
    const second = buildProjectContext(project, null, null);
    expect(first).toEqual(second);
  });
});
