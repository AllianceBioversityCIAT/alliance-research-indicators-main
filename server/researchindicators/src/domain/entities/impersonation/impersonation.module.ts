// @akili-spec changes/profile-simulation
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpersonationSession } from './entities/impersonation-session.entity';
import { ImpersonationAction } from './entities/impersonation-action.entity';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationUserRepository } from './repositories/impersonation-user.repository';

// Controller/DTOs and route wiring (EntitiesModule) are T-04's scope.
@Module({
  imports: [
    TypeOrmModule.forFeature([ImpersonationSession, ImpersonationAction]),
  ],
  providers: [ImpersonationService, ImpersonationUserRepository],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
