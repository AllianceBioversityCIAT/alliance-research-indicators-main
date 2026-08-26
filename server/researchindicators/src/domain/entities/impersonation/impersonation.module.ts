// @akili-spec changes/profile-simulation
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpersonationSession } from './entities/impersonation-session.entity';
import { ImpersonationAction } from './entities/impersonation-action.entity';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationUserRepository } from './repositories/impersonation-user.repository';

// Route wiring (EntitiesModule + main.routes.ts mount at `impersonation`) is
// T-04's scope, done alongside this controller registration.
@Module({
  imports: [
    TypeOrmModule.forFeature([ImpersonationSession, ImpersonationAction]),
  ],
  controllers: [ImpersonationController],
  providers: [ImpersonationService, ImpersonationUserRepository],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
