import { Module } from '@nestjs/common';
import { ControlListsController } from './control-lists.controller';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { PortfoliosModule } from '../portfolios/portfolios.module';

@Module({
  imports: [PortfoliosModule],
  controllers: [ControlListsController],
  providers: [
    ControlListsService,
    ControlListCategoryRepository,
    ControlListRepository,
  ],
  exports: [ControlListsService],
})
export class ControlListsModule {}
