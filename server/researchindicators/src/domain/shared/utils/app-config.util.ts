import { Injectable } from '@nestjs/common';

/**
 * Class to get all application configurations from environment variables or .env file
 * @export AppConfig
 * @class AppConfig
 */
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

  //CLARISA user
  get ARI_CLARISA_USER(): string {
    return process.env.ARI_CLARISA_USER;
  }

  //CLARISA password
  get ARI_CLARISA_PASS(): string {
    return process.env.ARI_CLARISA_PASS;
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

  get ARI_MIS(): string {
    return process.env.ARI_MIS;
  }

  /**
   * Get the environment
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get ARI_MIS_ENV(): string {
    return process.env.ARI_MIS_ENV;
  }

  /**
   * Get the OpenSearch URL
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_URL(): string {
    return process.env.ARI_OPENSEARCH_URL;
  }

  /**
   * Get the OpenSearch user
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_USER(): string {
    return process.env.ARI_OPENSEARCH_USERNAME;
  }

  /**
   * Get the OpenSearch password
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_PASS(): string {
    return process.env.ARI_OPENSEARCH_PASSWORD;
  }

  /**
   * Get the OpenSearch base index
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_BASE_INDEX(): string {
    return process.env.ARI_OPENSEARCH_BASE_INDEX;
  }

  /**
   * Get the OpenSearch base index
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get ROAR_MANAGEMENT_HOST(): string {
    return process.env.ARI_ROAR_MANAGEMENT_HOST;
  }

  /**
   * Get the secret for the message service
   * @readonly
   * @type {string}
   */
  get ARI_MS_MESSAGE_SECRET(): string {
    return process.env.ARI_MS_MESSAGE_SECRET;
  }

  /**
   * Get the client id for the message service
   * @readonly
   * @type {string}
   */
  get ARI_MS_MESSAGE_CLIENT_ID(): string {
    return process.env.ARI_MS_MESSAGE_CLIENT_ID;
  }

  /**
   * Get the from email for the message service
   * @readonly
   * @type {string}
   */
  get ARI_FROM_EMAIL(): string {
    return process.env.ARI_FROM_EMAIL;
  }

  /**
   * Get the from name for the message service
   * @readonly
   * @type {string}
   */
  get ARI_FROM_EMAIL_NAME(): string {
    return process.env.ARI_FROM_EMAIL_NAME;
  }

  /**
   * Get the message service url
   * @readonly
   * @type {string}
   */
  get ARI_MESSAGE_QUEUE(): string {
    return process.env.ARI_MESSAGE_QUEUE;
  }

  /**
   * Get the client host
   * @readonly
   * @type {string}
   */
  get ARI_CLIENT_HOST(): string {
    return process.env.ARI_CLIENT_HOST;
  }

  COMPLETE_CLIENT_HOST(path: string): string {
    return `${process.env.ARI_CLIENT_HOST}${path}`;
  }

  /**
   * Get the support email
   * @readonly
   * @type {string}
   */
  get ARI_SUPPORT_EMAIL(): string {
    return process.env.ARI_SUPPORT_EMAIL;
  }

  /**
   * Get the support email
   * @readonly
   * @type {string}
   */
  get ARI_CONTENT_SUPPORT_EMAIL(): string {
    return process.env.ARI_CONTENT_SUPPORT_EMAIL;
  }

  /**
   * Get the technical support email
   * @readonly
   * @type {string}
   */
  get TECHNICAL_SUPPORT(): string {
    return process.env.ARI_TECHNICAL_SUPPORT;
  }

  /**
   * Get the content support email
   * @readonly
   * @type {string}
   */
  get CONTENT_SUPPORT(): string {
    return process.env.ARI_CONTENT_SUPPORT;
  }

  /**
   * Get the salt for password hashing
   * @readonly
   * @type {string}
   */
  get SALT(): number {
    return Number(process.env.ARI_SALT);
  }

  get BUCKET_URL(): string {
    return process.env.ARI_BUCKET_URL;
  }

  get SPRM_EMAIL(): string {
    return process.env.ARI_SPRM_EMAIL;
  }

  get INTERNAL_EMAIL_LIST(): string {
    return process.env.ARI_MAPPED_BCC_SUBM_OICR;
  }

  SPRM_EMAIL_SAFE(currentUserEmail: string): string {
    return this.ARI_IS_PRODUCTION ? this.SPRM_EMAIL : currentUserEmail;
  }

  SET_SAFE_EMAIL(email: string, alternativeEmail: string): string {
    return this.ARI_IS_PRODUCTION ? email : alternativeEmail;
  }

  /**
   * Get the OpenSearch PRMS host
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_PRMS_HOST(): string {
    return process.env.ARI_OPEN_SEARCH_PRMS_HOST;
  }

  /**
   * Get the OpenSearch PRMS user
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_PRMS_USER(): string {
    return process.env.ARI_OPEN_SEARCH_PRMS_USER;
  }

  /**
   * Get the OpenSearch PRMS password
   * @readonly
   * @type {string}
   * @memberof AppConfig
   */
  get OPEN_SEARCH_PRMS_PASS(): string {
    return process.env.ARI_OPEN_SEARCH_PRMS_PASS;
  }
}
