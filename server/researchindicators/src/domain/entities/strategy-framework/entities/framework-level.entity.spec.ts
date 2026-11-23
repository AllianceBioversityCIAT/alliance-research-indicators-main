import { getMetadataArgsStorage } from 'typeorm';
import { FrameworkLevel } from './framework-level.entity';

/**
 * Column metadata only. Removing `insert: false` makes this spec fail; a
 * unit spec cannot reach MySQL error 3105 (that is the integration suite).
 */
describe('FrameworkLevel generated column', () => {
  const column = () =>
    getMetadataArgsStorage().columns.find(
      (args) =>
        args.target === FrameworkLevel &&
        args.propertyName === 'indicator_portfolio_key',
    );

  it('maps indicator_portfolio_key as a stored generated column that TypeORM does not write', () => {
    const args = column();
    expect(args).toBeDefined();
    expect(args?.options.generatedType).toBe('STORED');
    expect(args?.options.asExpression).toBe(
      'IF(is_indicator_level = 1, portfolio_id, NULL)',
    );
    expect(args?.options.insert).toBe(false);
    expect(args?.options.update).toBe(false);
  });
});
