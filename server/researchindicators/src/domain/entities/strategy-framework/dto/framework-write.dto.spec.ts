import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { CreateFrameworkElementDto } from './create-framework-element.dto';
import { ElementIdParamDto } from './element-id-param.dto';
import { SearchStaffQueryDto } from './search-staff-query.dto';
import { UpdateFrameworkElementDto } from './update-framework-element.dto';

/**
 * A4–A7 DTOs through the pipe the controller will install
 * (`whitelist`, `forbidNonWhitelisted`, `transform`). No Nest app and no
 * database: this is the pipe, not the HTTP stack.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const meta = (
  metatype: ArgumentMetadata['metatype'],
  type: ArgumentMetadata['type'],
): ArgumentMetadata => ({
  type,
  metatype,
});

describe('strategy-framework write DTOs (A4–A7)', () => {
  describe('A4 search', () => {
    const query = meta(SearchStaffQueryDto, 'query');

    it('trims and accepts two characters', async () => {
      const result = await pipe.transform({ search: '  pe ' }, query);
      expect(result.search).toBe('pe');
    });

    it('rejects one character after trim', async () => {
      await expect(
        pipe.transform({ search: ' a' }, query),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('A5 create', () => {
    const body = meta(CreateFrameworkElementDto, 'body');

    it('trims the name and turns a blank code into "propose one"', async () => {
      const result = await pipe.transform(
        { portfolioId: 2, name: '  Crops ', code: '   ', description: '  ' },
        body,
      );
      expect(result.name).toBe('Crops');
      expect(result.code).toBeUndefined();
      expect(result.description).toBe('');
    });

    it('accepts a null parent as depth 1', async () => {
      const result = await pipe.transform(
        { portfolioId: 2, name: 'Crops', parentId: null },
        body,
      );
      expect(result.parentId).toBeNull();
    });

    it('rejects a staff email property', async () => {
      await expect(
        pipe.transform(
          { portfolioId: 2, name: 'Crops', email: 'idris@alliance.org' },
          body,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a typed staff name inside the carnet list', async () => {
      await expect(
        pipe.transform(
          {
            portfolioId: 2,
            name: 'Crops',
            responsibleCarnets: [{ name: 'Idris Jones' }],
          },
          body,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a missing name and a 31-character code', async () => {
      await expect(
        pipe.transform({ portfolioId: 2 }, body),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe.transform(
          { portfolioId: 2, name: 'Crops', code: 'x'.repeat(31) },
          body,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('A6 update', () => {
    const body = meta(UpdateFrameworkElementDto, 'body');

    it('lets parentId null through for the service to reject', async () => {
      const result = await pipe.transform({ parentId: null }, body);
      expect(result.parentId).toBeNull();
    });

    it('leaves an omitted parent and an omitted carnet list undefined', async () => {
      const result = await pipe.transform({ name: 'Renamed' }, body);
      expect(result.parentId).toBeUndefined();
      expect(result.responsibleCarnets).toBeUndefined();
    });

    it('keeps an empty carnet list as a clear', async () => {
      const result = await pipe.transform({ responsibleCarnets: [] }, body);
      expect(result.responsibleCarnets).toEqual([]);
    });

    it('rejects id, portfolioId, levelId and a staff email', async () => {
      for (const extra of [
        { id: 1 },
        { portfolioId: 2 },
        { levelId: 3 },
        { email: 'a@b.c' },
      ]) {
        await expect(pipe.transform(extra, body)).rejects.toBeInstanceOf(
          BadRequestException,
        );
      }
    });
  });

  describe('A7 delete param', () => {
    const param = meta(ElementIdParamDto, 'param');

    it('coerces a positive id', async () => {
      const result = await pipe.transform({ id: '2' }, param);
      expect(result.id).toBe(2);
    });

    it.each(['0', '1.5', 'abc'])('rejects %s', async (id) => {
      await expect(pipe.transform({ id }, param)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
