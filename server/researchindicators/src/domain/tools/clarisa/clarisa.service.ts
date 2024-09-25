import { Injectable } from '@nestjs/common';
import { Clarisa } from './clarisa.connection';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ClarisaService {
  private connection: Clarisa;

  constructor(private readonly _http: HttpService) {
    this.connection = new Clarisa(this._http);
  }

  private async cloneEntity() {}
}
