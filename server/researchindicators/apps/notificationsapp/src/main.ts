import { NestFactory } from '@nestjs/core';
import { NotificationsappModule } from './notificationsapp.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

/*
Notifications Microservice
*/
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationsappModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://localhost:5672'],
        queue: 'cats_queue',
        queueOptions: {
          durable: false,
        },
      },
    },
  );
  await app.listen();
}
bootstrap();
