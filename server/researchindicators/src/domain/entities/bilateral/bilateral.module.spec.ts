import { BilateralModule } from './bilateral.module';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingAlignmentSpRepository } from './repositories/result-pool-funding-alignment-sp.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { BilateralController } from './bilateral.controller';
import { BilateralService } from './bilateral.service';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';

describe('BilateralModule', () => {
  it('declares bilateral repositories and skeleton providers', () => {
    const providers = Reflect.getMetadata('providers', BilateralModule);
    const moduleExports = Reflect.getMetadata('exports', BilateralModule);

    expect(providers).toEqual(
      expect.arrayContaining([
        BilateralService,
        CapacitySharingBilateralIndicatorTypeHandler,
        InnovationDevelopmentBilateralIndicatorTypeHandler,
        KnowledgeProductBilateralIndicatorTypeHandler,
        PolicyChangeBilateralIndicatorTypeHandler,
        NoopBilateralIndicatorTypeHandler,
        ResultPoolFundingAlignmentRepository,
        ResultPoolFundingAlignmentSpRepository,
        ResultPoolFundingIndicatorMappingRepository,
      ]),
    );
    expect(moduleExports).toEqual(
      expect.arrayContaining([
        BilateralService,
        CapacitySharingBilateralIndicatorTypeHandler,
        InnovationDevelopmentBilateralIndicatorTypeHandler,
        KnowledgeProductBilateralIndicatorTypeHandler,
        PolicyChangeBilateralIndicatorTypeHandler,
        NoopBilateralIndicatorTypeHandler,
        ResultPoolFundingAlignmentRepository,
        ResultPoolFundingAlignmentSpRepository,
        ResultPoolFundingIndicatorMappingRepository,
      ]),
    );
  });

  it('declares the bilateral controller', () => {
    const controllers = Reflect.getMetadata('controllers', BilateralModule);

    expect(controllers).toEqual(expect.arrayContaining([BilateralController]));
  });
});
