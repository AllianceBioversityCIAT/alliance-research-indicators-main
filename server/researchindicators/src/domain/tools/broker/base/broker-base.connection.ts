import { Logger } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { env } from 'process';
import { firstValueFrom } from 'rxjs';

export abstract class BrokerConnectionBase {
  private readonly log: Logger = new Logger('Broker connection');
  protected client: ClientProxy;

  constructor(queueName: string) {
    const queueHost: string = `amqps://${env.ARI_MQ_USER}:${env.ARI_MQ_PASSWORD}@${env.ARI_MQ_HOST}`;
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [queueHost],
        queue: queueName,
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  async emitToPattern<T, Y = T>(
    pattern: string,
    message: T,
    logger: boolean = false,
  ): Promise<Y> {
    const parsedMessage: string = JSON.stringify(message);
    return firstValueFrom(this.client.emit(pattern, parsedMessage)).then(
      (response: Y) => {
        if (logger) {
          this.log.log(`Message emitted to pattern: ${pattern}`);
          this.log.log(`Message: ${JSON.stringify(response)}`);
        }
        return response;
      },
    );
  }

  async sendToPattern<T, Y = T>(
    pattern: string,
    message: T,
    logger: boolean = false,
  ): Promise<Y> {
    return firstValueFrom(this.client.send(pattern, message)).then(
      (response: Y) => {
        if (logger) {
          this.log.log(`Message sent to pattern: ${pattern}`);
          this.log.log(`Message: ${JSON.stringify(response)}`);
        }
        return response;
      },
    );
  }
}
