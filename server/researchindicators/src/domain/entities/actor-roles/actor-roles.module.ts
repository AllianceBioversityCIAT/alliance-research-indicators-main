import { Module } from '@nestjs/common';
import { ActorRolesService } from './actor-roles.service';
import { ActorRolesController } from './actor-roles.controller';

@Module({
  controllers: [ActorRolesController],
  providers: [ActorRolesService],
})
export class ActorRolesModule {}
