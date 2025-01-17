import { Global, Module } from '@nestjs/common';
import { ServerGateway } from './server.gateway';
import { ClientGateway } from './client.gateway';

@Global()
@Module({
  providers: [ServerGateway, ClientGateway],
  exports: [ServerGateway, ClientGateway],
})
export class SocketModule {}
