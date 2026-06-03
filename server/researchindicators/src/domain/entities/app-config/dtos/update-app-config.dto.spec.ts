import { validate } from 'class-validator';
import { UpdateAppConfigDto } from './update-app-config.dto';

describe('UpdateAppConfigDto', () => {
  it('accepts a valid partial update', async () => {
    const dto = Object.assign(new UpdateAppConfigDto(), {
      simple_value: 'https://example.com/app',
      description: 'Bulk upload embed URL',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects XSS in simple_value', async () => {
    const dto = Object.assign(new UpdateAppConfigDto(), {
      simple_value: '<script>alert(1)</script>',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'simple_value')).toBe(true);
  });

  it('rejects unsafe json_value payloads', async () => {
    const dto = Object.assign(new UpdateAppConfigDto(), {
      json_value: JSON.parse('{"__proto__": {"admin": true}}'),
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'json_value')).toBe(true);
  });

  it('rejects invalid category characters', async () => {
    const dto = Object.assign(new UpdateAppConfigDto(), {
      category: 'BULK; DROP TABLE',
    });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'category')).toBe(true);
  });
});
