import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ControlListValuePortfolioRepository } from '../../src/domain/entities/control-lists/repositories/control-list-value-portfolio.repository';
import { Portfolio } from '../../src/domain/entities/portfolios/entities/portfolio.entity';

/**
 * The three providers `ControlListsService` needs beyond its own
 * repositories for the "Applies to" rules (R-CLG-009, D-CLG-13): the link
 * table repository, a READ handle on the `Portfolio` entity (the module gets
 * it from `TypeOrmModule.forFeature([Portfolio])`), and the `DataSource` the
 * value writes open their transaction on. Hand-wired here, on the suites' own
 * connection, because these integration suites build the service without the
 * real `ControlListsModule` (`control-lists-module-wiring.integration-spec.ts`
 * is the suite that boots the real module).
 */
export const appliesToProviders = (dataSource: DataSource) => [
  {
    provide: ControlListValuePortfolioRepository,
    useFactory: () => new ControlListValuePortfolioRepository(dataSource),
  },
  {
    provide: getRepositoryToken(Portfolio),
    useFactory: () => dataSource.getRepository(Portfolio),
  },
  { provide: DataSource, useValue: dataSource },
];
