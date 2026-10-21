import { homologateInnovationUseActorType } from './innovation-use-actor-type.homologation';

describe('homologateInnovationUseActorType', () => {
  it.each([
    ['Farmers/ (agro)pastoralist/ herders/ fishers', 1],
    ['Farmers / (agro)pastoralist / herders / fishers', 1],
    ['Researchers', 2],
    ['Agricultural extension agents', 3],
    ['Extension agents', 3],
    ['Policy actors (public or private)', 4],
    ['Other', 5],
  ])('maps the PRMS name "%s" to STAR actor type %i', (name, code) => {
    expect(homologateInnovationUseActorType(name)).toBe(code);
  });

  it('returns undefined for an unknown or empty name', () => {
    expect(homologateInnovationUseActorType('Consumers')).toBeUndefined();
    expect(homologateInnovationUseActorType(null)).toBeUndefined();
  });
});
