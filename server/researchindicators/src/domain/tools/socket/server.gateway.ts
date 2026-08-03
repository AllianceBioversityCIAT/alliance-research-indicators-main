import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

export const POOL_FUNDING_ALIGNMENT_CHANGED_EVENT =
  'result.pool-funding-alignment.changed';

export interface PoolFundingAlignmentChangedPayload {
  result_code: string;
  by_user_id: number;
  at: string;
}

@Injectable()
@WebSocketGateway()
export class ServerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger(ServerGateway.name);

  afterInit(server: Server) {
    this.logger.debug('Init websocket server', server);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}` + args);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitPoolFundingAlignmentChanged(
    payload: PoolFundingAlignmentChangedPayload,
  ): void {
    this.server?.emit(POOL_FUNDING_ALIGNMENT_CHANGED_EVENT, payload);
  }
}
