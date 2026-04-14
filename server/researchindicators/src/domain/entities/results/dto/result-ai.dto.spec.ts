import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AiRawCountry,
  AiRawEvidence,
  AiRawInstitution,
  CountryAreas,
  OrganizationDetailed,
  ResultInnovationActorDetailedDto,
  ResultRawAi,
  RootAi,
} from './result-ai.dto';

describe('result-ai DTOs (class-transformer + class-validator)', () => {
  it('validates CountryAreas', async () => {
    const ok = plainToInstance(CountryAreas, {
      country_code: 'COL',
      areas: ['Cundinamarca'],
    });
    expect((await validate(ok)).length).toBe(0);
  });

  it('rejects ResultInnovationActorDetailedDto when gender_age tokens are invalid', async () => {
    const bad = plainToInstance(ResultInnovationActorDetailedDto, {
      gender_age: ['invalid'],
    });
    const errors = await validate(bad);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts ResultInnovationActorDetailedDto with allowed gender_age values', async () => {
    const good = plainToInstance(ResultInnovationActorDetailedDto, {
      gender_age: ['Men: Youth', 'Women: Non-youth'],
    });
    expect((await validate(good)).length).toBe(0);
  });

  it('validates AiRawInstitution and nested OrganizationDetailed', async () => {
    const inst = plainToInstance(AiRawInstitution, {
      institution_name: 'CIAT',
      similarity_score: 0.9,
    });
    expect((await validate(inst)).length).toBe(0);

    const org = plainToInstance(OrganizationDetailed, {
      institution_name: 'Org',
      similarity_score: 1,
      type: 'ngo',
    });
    expect((await validate(org)).length).toBe(0);
  });

  it('validates minimal RootAi / ResultRawAi tree', async () => {
    const root = plainToInstance(RootAi, {
      results: [
        {
          contract_code: 'AGR-1',
          indicator: 'Policy Change',
          title: 'T',
          countries: [],
          regions: [],
          evidences: [],
        },
      ],
    });
    const rootErrors = await validate(root);
    expect(rootErrors.length).toBe(0);

    const raw = root.results[0];
    expect(raw).toBeInstanceOf(ResultRawAi);
    const rawErrors = await validate(raw);
    expect(rawErrors.length).toBe(0);
  });

  it('validates AiRawCountry and AiRawEvidence', async () => {
    const c = plainToInstance(AiRawCountry, { code: 'CO', areas: ['X'] });
    expect((await validate(c)).length).toBe(0);

    const e = plainToInstance(AiRawEvidence, {
      evidence_link: 'https://x',
      evidence_description: 'd',
    });
    expect((await validate(e)).length).toBe(0);
  });

  it('maps nested countries on ResultRawAi via @Type', async () => {
    const raw = plainToInstance(ResultRawAi, {
      contract_code: 'C',
      indicator: 'i',
      title: 't',
      countries: [{ code: 'BR', areas: ['South'] }],
      regions: [],
      evidences: [],
    });
    expect(raw.countries[0]).toBeInstanceOf(AiRawCountry);
    expect((await validate(raw)).length).toBe(0);
  });
});
