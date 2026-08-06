import { build } from './capdev-recipients.builder';
import { CapdevBulkGroupDto } from './dto/capdev-bulk-group.dto';

/**
 * Minimal, complete group fixture. Every test overrides only the fields it
 * cares about via object spread, so each scenario stays a small diff against
 * a known-good baseline (R-CBU-003 / R-CBU-004 scenarios in requirements.md).
 */
function makeGroup(
  overrides: Partial<CapdevBulkGroupDto> = {},
): CapdevBulkGroupDto {
  return {
    agreement_id: 'ABC-123',
    project_lead_description: null,
    pi: {
      carnet: 'pi-carnet',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'pi@example.org',
    },
    ra: null,
    pa: null,
    token_owner: null,
    ...overrides,
  };
}

describe('capdev-recipients.builder', () => {
  describe('to — PI only', () => {
    it('a PI who is also the RA appears exactly once, in to', () => {
      const group = makeGroup({
        ra: {
          carnet: 'pi-carnet',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'pi@example.org',
        },
      });

      const result = build(group, [], [], []);

      expect(result).not.toBeNull();
      expect(result.to).toEqual(['pi@example.org']);
      expect(result.cc).not.toContain('pi@example.org');
      expect(result.cc.length).toBe(0);
    });

    it('missing PI address returns null', () => {
      const group = makeGroup({
        pi: {
          carnet: 'pi-carnet',
          first_name: 'Jane',
          last_name: 'Doe',
          email: null,
        },
      });

      expect(build(group, [], [], [])).toBeNull();
    });

    it('a PI resolved with no staff row at all returns null', () => {
      const group = makeGroup({ pi: null });

      expect(build(group, [], [], [])).toBeNull();
    });
  });

  describe('cc — sanitisation order: normalise -> validate -> drop-if-in-to -> dedupe', () => {
    it('"PI@Example.org" in to suppresses "pi@example.org" from cc', () => {
      const group = makeGroup({
        pi: {
          carnet: 'pi-carnet',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'PI@Example.org',
        },
        ra: {
          carnet: 'ra-carnet',
          first_name: 'Ray',
          last_name: 'Assist',
          email: 'pi@example.org',
        },
      });

      const result = build(group, [], [], []);

      expect(result.to).toEqual(['PI@Example.org']);
      expect(result.cc).toEqual([]);
    });

    it('drops malformed entries ("n/a", "—", "John Doe") and keeps the email sending', () => {
      const group = makeGroup();
      const fileContacts = [
        { email: 'n/a', contract_code: undefined },
        { email: '—', contract_code: undefined },
        { email: 'John Doe', contract_code: undefined },
        { email: 'valid@example.org', contract_code: undefined },
      ];

      const result = build(group, fileContacts, [], []);

      expect(result).not.toBeNull();
      expect(result.cc).toEqual(['valid@example.org']);
    });

    it('every optional source absent still yields SPRM in cc', () => {
      const group = makeGroup();

      const result = build(group, [], ['sprm@groups.cgiar.org'], []);

      expect(result.cc).toEqual(['sprm@groups.cgiar.org']);
    });

    it('deduplicates case-insensitively across sources, case of first occurrence wins', () => {
      const group = makeGroup({
        ra: {
          carnet: 'ra-carnet',
          first_name: 'Ray',
          last_name: 'Assist',
          email: 'Shared@Example.org',
        },
      });

      const result = build(
        group,
        [],
        ['shared@example.org'],
        ['SHARED@EXAMPLE.ORG'],
      );

      expect(result.cc).toEqual(['Shared@Example.org']);
    });
  });

  describe('file contacts — partitioned by contract_code', () => {
    it('a contract-scoped file contact reaches only its own group', () => {
      const groupA = makeGroup({ agreement_id: 'A' });
      const groupB = makeGroup({ agreement_id: 'B' });
      const fileContacts = [
        { email: 'scoped@example.org', contract_code: 'A' },
      ];

      const resultA = build(groupA, fileContacts, [], []);
      const resultB = build(groupB, fileContacts, [], []);

      expect(resultA.cc).toContain('scoped@example.org');
      expect(resultB.cc).not.toContain('scoped@example.org');
    });

    it('an unscoped file contact reaches all groups', () => {
      const groupA = makeGroup({ agreement_id: 'A' });
      const groupB = makeGroup({ agreement_id: 'B' });
      const fileContacts = [
        { email: 'everyone@example.org', contract_code: undefined },
      ];

      const resultA = build(groupA, fileContacts, [], []);
      const resultB = build(groupB, fileContacts, [], []);

      expect(resultA.cc).toContain('everyone@example.org');
      expect(resultB.cc).toContain('everyone@example.org');
    });
  });

  describe('salutation — ordered three-tier chain', () => {
    it('tier 1 (staff name) wins over tier 2 (project_lead_description) when both are present', () => {
      const group = makeGroup({
        project_lead_description: 'Fallback Description',
        pi: {
          carnet: 'pi-carnet',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'pi@example.org',
        },
      });

      const result = build(group, [], [], []);

      expect(result.salutation).toBe('Jane Doe');
    });

    it('falls to tier 2 (project_lead_description) when the staff name is blank', () => {
      const group = makeGroup({
        project_lead_description: 'Fallback Description',
        pi: {
          carnet: 'pi-carnet',
          first_name: null,
          last_name: null,
          email: 'pi@example.org',
        },
      });

      const result = build(group, [], [], []);

      expect(result.salutation).toBe('fallback description');
    });

    it('missing PI name but present address still sends, salutation falls to tier 3 ("Colleagues")', () => {
      const group = makeGroup({
        project_lead_description: null,
        pi: {
          carnet: 'pi-carnet',
          first_name: null,
          last_name: null,
          email: 'pi@example.org',
        },
      });

      const result = build(group, [], [], []);

      expect(result).not.toBeNull();
      expect(result.to).toEqual(['pi@example.org']);
      expect(result.salutation).toBe('Colleagues');
    });
  });
});
