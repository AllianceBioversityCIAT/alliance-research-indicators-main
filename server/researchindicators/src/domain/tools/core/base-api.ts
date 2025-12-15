import { HttpService } from '@nestjs/axios';
import { Observable, catchError, of, timeout } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { Logger } from '@nestjs/common';
import https from 'https';
import crypto from 'crypto';

/**
 * Abstract base class providing common HTTP request methods for interacting with external APIs.
 */
export abstract class BaseApi {
  /**
   * @protected
   * @property {Logger} logger - An instance of the Logger class used for logging messages and errors.
   */
  protected logger: Logger;

  constructor(
    protected httpService: HttpService,
    protected externalAppEndpoint: string,
    loggerContext: string,
    protected user?: string,
    protected pass?: string,
    protected token?: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Provides the default Axios request configuration with authentication and HTTPS agent.
   *
   * @returns AxiosRequestConfig The default Axios request configuration.
   */
  protected get _defaultConfig(): AxiosRequestConfig {
    return {
      auth: { username: this.user, password: this.pass },
      httpsAgent: new https.Agent({
        // allow legacy server connections
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }),
      headers: {
        Authorization: 'Bearer ' + this.token,
      },
    };
  }

  /**
   * Adds timeout and error handling to an observable of an Axios response.
   *
   * @param observable The observable for an Axios response.
   * @param returnError If true, returns the error object on failure, otherwise returns null.
   * @returns An observable that catches errors and applies a 30-second timeout.
   */
  private handleError<T>(
    observable: Observable<AxiosResponse<T>>,
    returnError: boolean = false,
  ): Observable<AxiosResponse<T> | null> {
    return observable.pipe(
      timeout(30000), // Wait for 30 seconds for the response
      catchError((err) => {
        const errorMsg = isAxiosError(err)
          ? `Axios error: ${err.message}; Axios error response: ${JSON.stringify(err.response?.data)}`
          : `Unexpected error: ${err.message}`;

        this.logger.error(errorMsg);
        return of(returnError ? err : null);
      }),
    );
  }

  /**
   * Makes an HTTP request using the specified method, endpoint, and configuration.
   *
   * @param method The HTTP method (GET, POST, PUT, PATCH, DELETE).
   * @param endpoint The API endpoint to send the request to.
   * @param data Optional request body data.
   * @param config Optional Axios request configuration.
   * @returns An observable of the Axios response.
   */
  private request<D, R>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R>> {
    const url = `${this.externalAppEndpoint}/${endpoint}`;
    const requestConfig = config ?? this._defaultConfig;

    let requestObservable: Observable<AxiosResponse<R>>;

    switch (method) {
      case 'get':
        requestObservable = this.httpService.get<R>(url, requestConfig);
        break;
      case 'post':
        requestObservable = this.httpService.post<R>(url, data, requestConfig);
        break;
      case 'put':
        requestObservable = this.httpService.put<R>(url, data, requestConfig);
        break;
      case 'patch':
        requestObservable = this.httpService.patch<R>(url, data, requestConfig);
        break;
      case 'delete':
        requestObservable = this.httpService.delete<R>(url, requestConfig);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}.`);
    }

    return this.handleError(requestObservable);
  }

  /**
   * Sends a GET request to the specified endpoint.
   *
   * @param endpoint The API endpoint to send the request to.
   * @param config Optional Axios request configuration.
   * @returns An observable of the Axios response.
   */
  protected getRequest<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request('get', endpoint, undefined, config);
  }

  /**
   * Sends a POST request to the specified endpoint with the given data.
   *
   * @param endpoint The API endpoint to send the request to.
   * @param data The data to include in the request body.
   * @param config Optional Axios request configuration.
   * @returns An observable of the Axios response.
   */
  protected postRequest<D, R>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R>> {
    return this.request('post', endpoint, data, config);
  }

  /**
   * Sends a PUT request to the specified endpoint with the given data.
   *
   * @param endpoint The API endpoint to send the request to.
   * @param data The data to include in the request body.
   * @param config Optional Axios request configuration.
   * @returns An observable of the Axios response.
   */
  protected putRequest<D, R>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R>> {
    return this.request('put', endpoint, data, config);
  }

  /**
   * Sends a PATCH request to the specified endpoint with the given data.
   *
   * @param endpoint The API endpoint to send the request to.
   * @param data The data to include in the request body.
   * @param config Optional Axios request configuration.
   * @returns An observable of the Axios response.
   */
  protected patchRequest<D, R>(
    endpoint: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<R>> {
    return this.request('patch', endpoint, data, config);
  }

  /**
   * Sends a DELETE request to the specified endpoint.
   *
   * @param endpoint The API endpoint to send the request to.
   * @param config Optional Axios request configuration.
   * @returns An observable of the Axios response.
   */
  protected deleteRequest<T>(
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request('delete', endpoint, undefined, config);
  }
}
