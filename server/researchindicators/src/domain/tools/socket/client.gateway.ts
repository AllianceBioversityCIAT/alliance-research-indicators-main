import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ValidJwtResponse } from '../../shared/global-dto/management-response.dto';

@Injectable()
export class ClientGateway implements OnModuleInit {
  private socket: Socket;
  private readonly _logger: Logger = new Logger(ClientGateway.name);

  constructor(private readonly appConfig: AppConfig) {}

  onModuleInit() {
    this.socket = io(this.appConfig.ROAR_MANAGEMENT_HOST);

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('message', (data: string) => {
      console.log('Message from server:', data);
    });

    this.socket.on('disconnect', () => {});
  }

  async validateConnection(token: string): Promise<ValidJwtResponse> {
    return new Promise((resolve) => {
      this.socket.emit('socket/valid-jwt', token, resolve);
    });
  }
}
