import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfig {
  //RabbitMQ host
  get ARI_MQ_HOST(): string {
    return process.env.ARI_MQ_HOST;
  }

  //RabbitMQ user
  get ARI_MQ_USER(): string {
    return process.env.ARI_MQ_USER;
  }

  //Rabbit password
  get ARI_MQ_PASSWORD(): string {
    return process.env.ARI_MQ_PASSWORD;
  }

  //Application port
  get ARI_PORT(): number {
    return parseInt(process.env.ARI_PORT);
  }

  //Is production environment
  get ARI_IS_PRODUCTION(): boolean {
    return process.env.ARI_IS_PRODUCTION === 'true';
  }

  //Show all logs
  get ARI_SEE_ALL_LOGS(): boolean {
    return process.env.ARI_SEE_ALL_LOGS === 'true';
  }

  //JWT time to expire
  get ARI_JWT_ACCESS_EXPIRES_IN(): string {
    return process.env.ARI_JWT_ACCESS_EXPIRES_IN;
  }

  //CLARISA host
  get ARI_CLARISA_HOST(): string {
    return process.env.ARI_CLARISA_HOST;
  }

  //Mysql host
  get ARI_MYSQL_HOST(): string {
    return process.env.ARI_MYSQL_HOST;
  }

  //Mysql user name
  get ARI_MYSQL_USER_NAME(): string {
    return process.env.ARI_MYSQL_USER_NAME;
  }

  //Mysql user password
  get ARI_MYSQL_USER_PASS(): string {
    return process.env.ARI_MYSQL_USER_PASS;
  }

  //Mysql database name
  get ARI_MYSQL_NAME(): string {
    return process.env.ARI_MYSQL_NAME;
  }

  //Secondary Mysql database name
  get ARI_SECONDARY_MYSQL_NAME(): string {
    return process.env.ARI_SECONDARY_MYSQL_NAME;
  }

  //Secondary queue name
  get ARI_QUEUE_SECONDARY(): string {
    return process.env.ARI_QUEUE_SECONDARY;
  }

  //Queue AI name
  get ARI_QUEUE_AI(): string {
    return process.env.ARI_QUEUE_AI;
  }

  //Queue name
  get ARI_QUEUE(): string {
    return process.env.ARI_QUEUE;
  }

  //Database for tests host
  get ARI_TEST_MYSQL_HOST(): string {
    return process.env.ARI_TEST_MYSQL_HOST;
  }

  //Database for tests user name
  get ARI_TEST_MYSQL_USER_NAME(): string {
    return process.env.ARI_TEST_MYSQL_USER_NAME;
  }

  //Database for tests user password
  get ARI_TEST_MYSQL_USER_PASS(): string {
    return process.env.ARI_TEST_MYSQL_USER_PASS;
  }

  //Database for tests database name
  get ARI_TEST_MYSQL_NAME(): string {
    return process.env.ARI_TEST_MYSQL_NAME;
  }

  //Url for agresso api
  get ARI_AGRESSO_URL(): string {
    return process.env.ARI_AGRESSO_URL;
  }

  //Agresso user name
  get ARI_AGRESSO_USER(): string {
    return process.env.ARI_AGRESSO_USER;
  }

  //Agresso user password
  get ARI_AGRESSO_PASS(): string {
    return process.env.ARI_AGRESSO_PASS;
  }

  //Application name
  get ARI_APP_NAME(): string {
    return process.env.ARI_APP_NAME;
  }
}
