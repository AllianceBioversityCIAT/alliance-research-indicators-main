import { Module } from '@nestjs/common';
import { ClarisaActorTypesService } from './clarisa-actor-types.service';
import { ClarisaActorTypesController } from './clarisa-actor-types.controller';

@Module({
  controllers: [ClarisaActorTypesController],
  providers: [ClarisaActorTypesService],
})
export class ClarisaActorTypesModule {}
