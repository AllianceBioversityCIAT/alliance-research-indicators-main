import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from 'process';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { json, urlencoded } from 'express';
import { AppMicroserviceModule } from './app-microservice.module';
import { LoggerUtil } from './domain/shared/utils/logger.util';
import helmet from 'helmet';
const logger: LoggerUtil = new LoggerUtil({
  name: 'bootstrap',
});
async function httpservice() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(helmet());
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  const config = new DocumentBuilder()
    .setTitle('Research Indicators API')
    .setDescription(
      'The Research Indicators API is a RESTful API that provides access to the Research Indicators database.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const port: number = parseInt(env.ARI_PORT);
  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = 'swagger';
  SwaggerModule.setup(swaggerPath, app, document);

  await app
    .listen(port)
    .then(() => {
      logger.debug(`Application is running http://localhost:${port}`);
      logger.debug(
        `Documentation is running http://localhost:${port}/${swaggerPath}`,
      );
    })
    .catch((err) => {
      const portValue: number | string = port || '<Not defined>';
      logger.error(`Application failed to start on port ${portValue}`);
      logger.error(err);
    });
}

async function microservice() {
  const queueHost: string = `amqps://${env.ARI_MQ_USER}:${env.ARI_MQ_PASSWORD}@${env.ARI_MQ_HOST}`;
  const appSocket = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppMicroserviceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [queueHost],
        queue: env.ARI_QUEUE,
        queueOptions: {
          durable: true,
        },
      },
    },
  );

  await appSocket
    .listen()
    .then(() => {
      logger.debug(`Microservice is already listening`);
    })
    .catch((err) => {
      logger.error(`Microservice present an error`);
      logger.error(err);
    });
}

async function bootstrap() {
  await httpservice();
  await microservice();
}
bootstrap();
