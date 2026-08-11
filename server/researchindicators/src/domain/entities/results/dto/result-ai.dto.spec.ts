import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import {
  AiContactDto,
  AiRawCountry,
  AiRawEvidence,
  AiRawInstitution,
  CountryAreas,
  OrganizationDetailed,
  ResultInnovationActorDetailedDto,
  ProcessMedatada,
  ResultRawAi,
  RootAi,
} from './result-ai.dto';

// Mirrors the exact pipe configuration the endpoint runs under
// (results.controller.ts:663-669 — POST /api/v1/results/ai/formalize/bulk).
// A DTO validated under default class-validator/ValidationPipe options
// proves nothing about the endpoint's real `whitelist` + `forbidNonWhitelisted`
// + `transform` behavior.
const endpointValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const minimalResult = {
  contract_code: 'AGR-1',
  indicator: 'Policy Change',
  title: 'T',
  countries: [],
  regions: [],
  evidences: [],
};

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

  describe('ProcessMedatada.contacts (R-CBU-005) under the endpoint ValidationPipe', () => {
    const bodyMetadata = { type: 'body' as const, metatype: RootAi, data: '' };

    it('accepts a legacy payload without contacts (backward compatibility)', async () => {
      const payload = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
        },
      };

      const result = await endpointValidationPipe.transform(
        payload,
        bodyMetadata,
      );

      expect(result).toBeInstanceOf(RootAi);
      expect(result.metadata.contacts).toBeUndefined();
    });

    it('accepts a payload with valid contacts and transforms them into AiContactDto instances', async () => {
      const payload = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
          contacts: [
            {
              email: 'lead@example.org',
              name: 'Jane Lead',
              role: 'reporting_leader',
              contract_code: 'AGR-1',
            },
          ],
        },
      };

      const result = await endpointValidationPipe.transform(
        payload,
        bodyMetadata,
      );

      expect(result.metadata.contacts).toHaveLength(1);
      expect(result.metadata.contacts[0]).toBeInstanceOf(AiContactDto);
      expect(result.metadata.contacts[0].email).toBe('lead@example.org');
    });

    it('rejects a contact missing email', async () => {
      const payload = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
          contacts: [{ name: 'No Email' }],
        },
      };

      await expect(
        endpointValidationPipe.transform(payload, bodyMetadata),
      ).rejects.toThrow();
    });

    it('rejects a contact with a non-string/malformed email', async () => {
      const payload = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
          contacts: [{ email: 12345 }],
        },
      };

      await expect(
        endpointValidationPipe.transform(payload, bodyMetadata),
      ).rejects.toThrow();

      const payloadWithBadFormat = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
          contacts: [{ email: 'not-an-email' }],
        },
      };

      await expect(
        endpointValidationPipe.transform(payloadWithBadFormat, bodyMetadata),
      ).rejects.toThrow();
    });

    it('rejects an unknown property inside a contact object (whitelist behavior)', async () => {
      const payload = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
          contacts: [
            {
              email: 'lead@example.org',
              unexpected_field: 'should not be allowed',
            },
          ],
        },
      };

      await expect(
        endpointValidationPipe.transform(payload, bodyMetadata),
      ).rejects.toThrow();
    });

    it('rejects an invalid role value', async () => {
      const payload = {
        results: [minimalResult],
        metadata: {
          file_name: 'file.csv',
          ai_interaction_id: 'int-1',
          contacts: [{ email: 'lead@example.org', role: 'not_a_real_role' }],
        },
      };

      await expect(
        endpointValidationPipe.transform(payload, bodyMetadata),
      ).rejects.toThrow();
    });
  });
  /**
   * R-CBU-005 AC.5 — "Swagger at /api documents metadata.contacts."
   *
   * Audit gap-fill: this AC had no automated assertion. The `@ApiBody({ type:
   * RootAi })` on the handler means Swagger's model is generated from these
   * decorators, so asserting the emitted `@nestjs/swagger` metadata proves
   * the documented contract without booting SwaggerModule. A regression that
   * drops `@ApiProperty` from `contacts` (leaving `@IsOptional` etc. intact,
   * so every validation test above stays green) turns this red.
   */
  describe('R-CBU-005 AC.5 — Swagger model metadata for metadata.contacts', () => {
    it('ProcessMedatada exposes `contacts` as a documented, optional array of AiContactDto', () => {
      const properties: string[] = Reflect.getMetadata(
        'swagger/apiModelPropertiesArray',
        ProcessMedatada.prototype,
      );
      expect(properties).toContain(':contacts');

      const contacts = Reflect.getMetadata(
        'swagger/apiModelProperties',
        ProcessMedatada.prototype,
        'contacts',
      );
      expect(contacts).toBeDefined();
      // Optional — R-CBU-005's backward-compatibility promise, documented as
      // such rather than merely tolerated by the validator.
      expect(contacts.required).toBe(false);
      expect(contacts.isArray).toBe(true);
      // The nested model is the real DTO, so Swagger renders email/name/role/
      // contract_code rather than an opaque `object`.
      expect(contacts.type).toBe(AiContactDto);
      expect(String(contacts.description)).toContain('contact');
    });

    it('AiContactDto documents `email` as required and the remaining fields as optional', () => {
      const properties: string[] = Reflect.getMetadata(
        'swagger/apiModelPropertiesArray',
        AiContactDto.prototype,
      );
      expect(properties).toEqual(
        expect.arrayContaining([':email', ':name', ':role', ':contract_code']),
      );

      const email = Reflect.getMetadata(
        'swagger/apiModelProperties',
        AiContactDto.prototype,
        'email',
      );
      // `required` is undefined-or-true for a required @ApiProperty; only an
      // explicit `required: false` marks it optional.
      expect(email.required).not.toBe(false);

      for (const optional of ['name', 'role', 'contract_code']) {
        const meta = Reflect.getMetadata(
          'swagger/apiModelProperties',
          AiContactDto.prototype,
          optional,
        );
        expect(meta).toBeDefined();
        expect(meta.required).toBe(false);
      }
    });
  });
});
