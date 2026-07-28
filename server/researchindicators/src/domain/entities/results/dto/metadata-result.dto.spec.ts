import 'reflect-metadata';
import { MetadataResultDto } from './metadata-result.dto';

// @sdd-spec docs/specs/results-center/external-results-readonly-view — R-RC-011 AC.2
//
// Closes a coverage gap: no existing test proved the Swagger schema for
// GET /results/:id/metadata documents the four fields this spec adds
// (platform_code, public_link, external_link, updated_at) as optional.
// @nestjs/swagger's @ApiProperty decorator records its options under the
// `swagger/apiModelProperties` reflect-metadata key, keyed per property, on
// the class prototype — read that directly rather than asserting on
// generated response bodies (which never carry Swagger metadata).
const SWAGGER_API_MODEL_PROPERTIES = 'swagger/apiModelProperties';

describe('MetadataResultDto (Swagger schema)', () => {
  const propertyMetadata = (propertyKey: string) =>
    Reflect.getMetadata(
      SWAGGER_API_MODEL_PROPERTIES,
      MetadataResultDto.prototype,
      propertyKey,
    );

  it.each([
    ['platform_code', String],
    ['public_link', String],
    ['external_link', String],
    ['updated_at', Date],
  ])(
    'documents %s as an optional (required: false) Swagger property of the correct type',
    (propertyKey, expectedType) => {
      const meta = propertyMetadata(propertyKey);

      expect(meta).toBeDefined();
      expect(meta.required).toBe(false);
      expect(meta.type).toBe(expectedType);
    },
  );

  it('still documents the pre-existing required fields (no regression to the base schema)', () => {
    const resultId = propertyMetadata('result_id');
    expect(resultId).toBeDefined();
    expect(resultId.required).toBe(true);
    expect(resultId.type).toBe(Number);
  });
});
