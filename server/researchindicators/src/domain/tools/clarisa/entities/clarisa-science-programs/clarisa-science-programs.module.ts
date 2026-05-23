import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClarisaScienceProgram } from './entities/clarisa-science-program.entity';
import { ClarisaScienceProgramsService } from './clarisa-science-programs.service';
import { ClarisaScienceProgramsController } from './clarisa-science-programs.controller';

/**
 * Read-only catalog module for CGIAR Science Programs (SP01–SP13).
 *
 * Intentionally SINGLETON-scoped (no CurrentUserUtil / ResultsUtil injection)
 * so it can be safely consumed by both REQUEST-scoped controllers and the
 * singleton BilateralService without re-introducing the empty-shell DI cycle
 * documented in docs/specs/bilateral-module/design.md §3.4.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ClarisaScienceProgram])],
  controllers: [ClarisaScienceProgramsController],
  providers: [ClarisaScienceProgramsService],
  exports: [ClarisaScienceProgramsService],
})
export class ClarisaScienceProgramsModule {}
