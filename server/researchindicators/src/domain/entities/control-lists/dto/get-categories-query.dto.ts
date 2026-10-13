/**
 * A1 query parameters: none (R-CLG-001, D-CLG-3).
 *
 * The class is EMPTY on purpose and A1 still binds it with
 * `@Query() query: GetCategoriesQueryDto`. Without a DTO, Nest would let any
 * query parameter through untouched; with it, the controller's
 * `ValidationPipe({ whitelist, forbidNonWhitelisted })` answers `400` to a
 * stale caller that still sends `portfolioId` (the parameter the old contract
 * required). A request with no parameters passes because Nest's
 * `ValidationPipe` defaults `forbidUnknownValues` to `false`
 * (`@nestjs/common` `validation.pipe.js`) — pinned by a positive test.
 */
export class GetCategoriesQueryDto {}
