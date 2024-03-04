import { NestFactory } from '@nestjs/core';
import { NotificationsappModule } from './notificationsapp.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsappModule);
  await app.listen(3001);
}
bootstrap();
