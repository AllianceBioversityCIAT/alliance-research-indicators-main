import beaConcepts from './__fixtures__/bea-25-concepts.json';
import trainingResults from './__fixtures__/training-results.json';
import { mapAgrovocTerms } from './agrovoc-terms.mapper';
import { AgrovocUpstreamResult } from './dto/agrovoc-term.dto';

const training = trainingResults as AgrovocUpstreamResult[];
const bea = beaConcepts as AgrovocUpstreamResult[];

describe('mapAgrovocTerms', () => {
  it('ranks an exact label first and collapses synonym duplicates', () => {
    const terms = mapAgrovocTerms(training, 'training');

    expect(terms[0].label).toBe('training');

    const skillTraining = terms.filter(
      (term) => term.label === 'skill training',
    );
    expect(skillTraining).toHaveLength(1);
    expect(skillTraining[0].matched_label).toBeUndefined();

    const eLearning = terms.find((term) => term.label === 'e-learning');
    expect(eLearning?.matched_label).toBe('online training');
    expect(terms.length).toBeLessThanOrEqual(20);
  });

  it('cuts 25 distinct concepts down to 20', () => {
    expect(new Set(bea.map((row) => row.uri)).size).toBe(25);

    const terms = mapAgrovocTerms(bea, 'bea');

    expect(terms).toHaveLength(20);
  });

  it('returns an empty list for empty input', () => {
    expect(mapAgrovocTerms([], 'training')).toEqual([]);
  });
});
