import { Module } from '@nestjs/common';
import { ConnectionController } from './connections.controller';
import { ConnectionService } from './connections.service';
import { ClarisaModule } from '../../tools/clarisa/clarisa.module';

@Module({
  controllers: [ConnectionController],
  providers: [ConnectionService],
  imports: [ClarisaModule],
  exports: [ConnectionService],
})
export class ConnectionsModule {}
