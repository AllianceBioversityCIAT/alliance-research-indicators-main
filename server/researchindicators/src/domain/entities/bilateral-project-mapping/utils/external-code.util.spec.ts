// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-03 / R-CPA-003 (DD-4, DD-7)

import {
  KNOWN_CENTRE_PREFIXES,
  NormalizationRule,
  detectExternalCodeCollisions,
  isAmbiguousNormalizedCode,
  normalizeExternalCode,
} from './external-code.util';

describe('external-code.util', () => {
  describe('KNOWN_CENTRE_PREFIXES (DD-4)', () => {
    it('is a closed set containing exactly B- and C-', () => {
      expect(KNOWN_CENTRE_PREFIXES).toEqual(['B-', 'C-']);
    });
  });

  describe('normalizeExternalCode (R-CPA-003, AC.1-AC.3)', () => {
    interface TestCase {
      description: string;
      input: string | null | undefined;
      expectedNormalized: string;
      expectedRule: NormalizationRule;
    }

    const testCases: TestCase[] = [
      {
        description: 'strips leading C- prefix',
        input: 'C-A132',
        expectedNormalized: 'A132',
        expectedRule: 'STRIP_CENTRE_PREFIX',
      },
      {
        description: 'strips leading B- prefix',
        input: 'B-A1080',
        expectedNormalized: 'A1080',
        expectedRule: 'STRIP_CENTRE_PREFIX',
      },
      {
        description: 'keeps un-prefixed code intact with rule NONE',
        input: 'A1463',
        expectedNormalized: 'A1463',
        expectedRule: 'NONE',
      },
      {
        description: 'trims whitespace and upper-cases before stripping prefix',
        input: ' c-a132 ',
        expectedNormalized: 'A132',
        expectedRule: 'STRIP_CENTRE_PREFIX',
      },
      {
        description:
          'leaves unknown prefix X- intact (DD-4 closed set constraint)',
        input: 'X-A132',
        expectedNormalized: 'X-A132',
        expectedRule: 'NONE',
      },
      {
        description: 'strips prefix at most once (C-C-A1 -> C-A1)',
        input: 'C-C-A1',
        expectedNormalized: 'C-A1',
        expectedRule: 'STRIP_CENTRE_PREFIX',
      },
      {
        description: 'strips B- at most once (B-B-100 -> B-100)',
        input: 'B-B-100',
        expectedNormalized: 'B-100',
        expectedRule: 'STRIP_CENTRE_PREFIX',
      },
      {
        description: 'handles lower-case b- prefix (b-a1080 -> A1080)',
        input: 'b-a1080',
        expectedNormalized: 'A1080',
        expectedRule: 'STRIP_CENTRE_PREFIX',
      },
      {
        description: 'leaves other prefixes like D- or CIAT- intact',
        input: 'D-A100',
        expectedNormalized: 'D-A100',
        expectedRule: 'NONE',
      },
      {
        description: 'handles null input gracefully',
        input: null,
        expectedNormalized: '',
        expectedRule: 'NONE',
      },
      {
        description: 'handles undefined input gracefully',
        input: undefined,
        expectedNormalized: '',
        expectedRule: 'NONE',
      },
      {
        description: 'handles empty or whitespace-only string',
        input: '   ',
        expectedNormalized: '',
        expectedRule: 'NONE',
      },
    ];

    testCases.forEach(
      ({ description, input, expectedNormalized, expectedRule }) => {
        it(`${description} (${input} -> ${expectedNormalized}, ${expectedRule})`, () => {
          const result = normalizeExternalCode(input);
          expect(result.normalized).toBe(expectedNormalized);
          expect(result.rule).toBe(expectedRule);
        });
      },
    );
  });

  describe('detectExternalCodeCollisions (R-CPA-003, AC.4 + collision scenario)', () => {
    it('detects collision when C-A500 and A500 normalize to the same code A500 and names both project IDs', () => {
      const projects = [
        { projectId: 101, externalCode: 'C-A500' },
        { projectId: 202, externalCode: 'A500' },
      ];

      const result = detectExternalCodeCollisions(projects);

      expect(result.collisionCount).toBe(1);
      expect(result.collidingCodes).toEqual(['A500']);
      expect(result.collisions).toEqual([
        {
          normalizedCode: 'A500',
          projectIds: [101, 202],
        },
      ]);
      expect(isAmbiguousNormalizedCode('A500', result)).toBe(true);
    });

    it('returns zero collisions when all normalized codes map to distinct projects', () => {
      const projects = [
        { projectId: 1, externalCode: 'C-A132' },
        { projectId: 2, externalCode: 'B-A1080' },
        { projectId: 3, externalCode: 'A1463' },
      ];

      const result = detectExternalCodeCollisions(projects);

      expect(result.collisionCount).toBe(0);
      expect(result.collidingCodes).toEqual([]);
      expect(result.collisions).toEqual([]);
      expect(isAmbiguousNormalizedCode('A132', result)).toBe(false);
      expect(isAmbiguousNormalizedCode('A1080', result)).toBe(false);
      expect(isAmbiguousNormalizedCode('A1463', result)).toBe(false);
    });

    it('does not produce a collision if the same project id appears multiple times with the same code', () => {
      const projects = [
        { projectId: 101, externalCode: 'C-A500' },
        { projectId: 101, externalCode: 'C-A500' },
      ];

      const result = detectExternalCodeCollisions(projects);

      expect(result.collisionCount).toBe(0);
      expect(result.collidingCodes).toEqual([]);
      expect(result.collisions).toEqual([]);
    });

    it('ignores projects with null, undefined, or empty externalCode', () => {
      const projects = [
        { projectId: 1, externalCode: null },
        { projectId: 2, externalCode: undefined },
        { projectId: 3, externalCode: '   ' },
        { projectId: 4, externalCode: 'A100' },
      ];

      const result = detectExternalCodeCollisions(projects);

      expect(result.collisionCount).toBe(0);
      expect(result.collidingCodes).toEqual([]);
      expect(result.normalizedMap.get('A100')).toEqual([4]);
    });

    it('identifies multiple distinct collisions', () => {
      const projects = [
        { projectId: 1, externalCode: 'C-A500' },
        { projectId: 2, externalCode: 'A500' },
        { projectId: 3, externalCode: 'B-A600' },
        { projectId: 4, externalCode: 'C-A600' },
        { projectId: 5, externalCode: 'A600' },
        { projectId: 6, externalCode: 'A700' },
      ];

      const result = detectExternalCodeCollisions(projects);

      expect(result.collisionCount).toBe(2);
      expect(result.collidingCodes).toEqual(['A500', 'A600']);
      expect(result.collisions).toEqual([
        { normalizedCode: 'A500', projectIds: [1, 2] },
        { normalizedCode: 'A600', projectIds: [3, 4, 5] },
      ]);
    });
  });

  describe('Ambiguous classification rule (R-CPA-003 scenario)', () => {
    it('classifies a contract matching a collided code as AMBIGUOUS, never NORMALIZED_CODE', () => {
      const projects = [
        { projectId: 1, externalCode: 'C-A500' },
        { projectId: 2, externalCode: 'A500' },
      ];
      const collisionResult = detectExternalCodeCollisions(projects);

      const contractCode = 'A500';
      const isCollided = isAmbiguousNormalizedCode(
        contractCode,
        collisionResult,
      );

      expect(isCollided).toBe(true);

      // Simulating tier decision: if collided, tier must be AMBIGUOUS, not NORMALIZED_CODE
      const resolvedTier = isCollided ? 'AMBIGUOUS' : 'NORMALIZED_CODE';
      expect(resolvedTier).toBe('AMBIGUOUS');
    });
  });
});
