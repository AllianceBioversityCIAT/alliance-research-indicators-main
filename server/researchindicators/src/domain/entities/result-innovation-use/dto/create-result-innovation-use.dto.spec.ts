import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { CreateResultInnovationUseDto } from './create-result-innovation-use.dto';

/**
 * T-04 (`docs/specs/changes/measure-number-signed-decimal`; R-MSD-003,
 * R-MSD-007; `design.md` DD-8, DD-17, DC-15).
 *
 * Exercises the exact pipe the controller installs —
 * `result-innovation-use.controller.ts:61`,
 * `new ValidationPipe({ whitelist: true, transform: true })` — so what gets
 * asserted is a **status code**, not merely "it threw" (the disqualifier
 * this task names). `DC-15`'s defect *is* the status code: a synchronous
 * crash inside `class-validator`'s own `validate()` propagates as a raw,
 * unhandled rejection — a `500` once it reaches `GlobalExceptions` — while
 * a clean rejection resolves the pipe's `errors` array and throws Nest's
 * own `BadRequestException` (`400`). `toThrow()` cannot tell these apart;
 * `rejects.toBeInstanceOf(BadRequestException)` can.
 */
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: CreateResultInnovationUseDto,
};

function quantificationBody(quantification_number: unknown) {
  return { quantifications: [{ quantification_number }] };
}

/** Asserts a clean `400` — never a `500` — and that the message names `property`. */
async function expectBadRequestNaming(body: unknown, property: string) {
  await expect(pipe.transform(body, metadata)).rejects.toBeInstanceOf(
    BadRequestException,
  );
  try {
    await pipe.transform(body, metadata);
    throw new Error('expected pipe.transform to reject');
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getStatus()).toBe(400);
    const response = (error as BadRequestException).getResponse();
    expect(JSON.stringify(response)).toContain(property);
  }
}

describe('CreateResultInnovationUseDto — quantification_number scale+range constraint (T-04)', () => {
  describe('accepts a signed, scale-bounded decimal (R-MSD-003 AC.1, AC.2, AC.4)', () => {
    it.each<[string, number]>([
      ['a negative integer (-1500)', -1500],
      ['zero (0)', 0],
      ['one fractional digit (2.5)', 2.5],
      ['a negative decimal (-12.75)', -12.75],
      [
        // the exact value that reddens T-03's shipped predicate
        // (Math.round(value * 10000) / 10000 !== value) despite being
        // inside DD-14's bound with 4 decimals — proof this constraint
        // does not reproduce that defect
        '274877906944.0405 (four decimals, T-03s falsely-rejected value)',
        274877906944.0405,
      ],
      ['exactly DD-14s max (549755813887)', 549755813887],
      ['exactly DD-14s min (-549755813887)', -549755813887],
    ])('accepts %s', async (_label, value) => {
      const result = await pipe.transform(quantificationBody(value), metadata);
      expect(
        (result as CreateResultInnovationUseDto).quantifications?.[0]
          .quantification_number,
      ).toBe(value);
    });
  });

  describe('rejects with a clean 400, never a 500 (DC-15, AC criterion 1)', () => {
    it.each<[string, number]>([
      ['1e-7 (tiny exponential, class-validator crash input)', 1e-7],
      ['-1e-7 (tiny exponential, class-validator crash input)', -1e-7],
      ['1.5e-7 (tiny exponential, more than 4 decimals)', 1.5e-7],
      [
        // String(1e21) is "1e+21". Step ③ rejects it on the DD-14 bound
        // and step ④ never runs; ④s "e"/"E" guard WOULD also reject it
        // if ③ were absent, which is why this case cannot discriminate ③
        // from ④ — measured: with step ③ deleted, this case stays green
        // while 9.9e20 and MAX+1 redden. It pins the DC-15 crash guard,
        // not the DD-14 bound.
        '1e21 (exponential; pins the DC-15 crash guard, not the DD-14 bound)',
        1e21,
      ],
      ['-10.00005 (a fifth fractional digit)', -10.00005],
      ['0.000001 (six decimals)', 0.000001],
      [
        // step ③/④ swap falsifier: String(9.9e20) is plain digits
        // ("990000000000000000000") with no "." and no "e" — unlike
        // 1e21, this value is inside step ④s "e"/"E" guard's blind spot,
        // so only step ③ (the DD-14 bound check) rejects it. Moving step
        // ④ verbatim above step ③ makes ③ dead code (④ ends in an
        // unconditional return) and silently ACCEPTS this value.
        '9.9e20 (plain-digit string, outside DD-14s bound; pins step ③ ' +
          'against a ③/④ reorder)',
        9.9e20,
      ],
      [
        // DD-14 max + 1 — also pins `>` vs `>=` on the upper boundary.
        '549755813888 (DD-14s max + 1)',
        549_755_813_888,
      ],
    ])('rejects %s as a 400', async (_label, value) => {
      await expectBadRequestNaming(
        quantificationBody(value),
        'quantification_number',
      );
    });

    it('rejects NaN as a 400 (pins step ② against its own deletion)', async () => {
      await expectBadRequestNaming(
        quantificationBody(NaN),
        'quantification_number',
      );
    });

    it('rejects a non-number (resent-string read shape) as a 400', async () => {
      await expectBadRequestNaming(
        quantificationBody('5' as unknown as number),
        'quantification_number',
      );
    });
  });

  // R-MSD-003 scenario "The relaxation does not leak to the siblings" (:265, :266).
  describe('the relaxation does not leak to the siblings', () => {
    it('a 400 for actors_count names actors_count, never quantification_number', async () => {
      const body = {
        quantifications: [{ quantification_number: -2.5 }], // now valid
        actors: [
          {
            actor_type_id: 1,
            sex_age_disaggregation_not_apply: true,
            actors_count: -1, // still invalid
          },
        ],
      };

      await expect(pipe.transform(body, metadata)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      try {
        await pipe.transform(body, metadata);
        throw new Error('expected pipe.transform to reject');
      } catch (error) {
        const message = JSON.stringify(
          (error as BadRequestException).getResponse(),
        );
        expect(message).toContain('actors_count');
        expect(message).not.toContain('quantification_number');
      }
    });

    // R-MSD-003 AC.5 / R-MSD-007 AC.1-AC.2 — all SIX sibling count fields,
    // asserted per field (not as a group), still reject 2.5.
    it.each<[string, unknown]>([
      ['women_youth_count', { actor_type_id: 1, women_youth_count: 2.5 }],
      [
        'women_not_youth_count',
        { actor_type_id: 1, women_not_youth_count: 2.5 },
      ],
      ['men_youth_count', { actor_type_id: 1, men_youth_count: 2.5 }],
      ['men_not_youth_count', { actor_type_id: 1, men_not_youth_count: 2.5 }],
      [
        'actors_count',
        {
          actor_type_id: 1,
          sex_age_disaggregation_not_apply: true,
          actors_count: 2.5,
        },
      ],
    ])('%s still rejects 2.5', async (fieldName, actorRow) => {
      await expectBadRequestNaming({ actors: [actorRow] }, fieldName);
    });

    it('organization_count still rejects 2.5', async () => {
      await expectBadRequestNaming(
        { organizations: [{ organization_count: 2.5 }] },
        'organization_count',
      );
    });
  });
});
