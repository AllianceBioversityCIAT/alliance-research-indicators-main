import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClarisaService } from '../../tools/clarisa/clarisa.service';
import { MisSimpleInfoDto } from '../../tools/clarisa/dto/clarisa.types';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clarisaService: ClarisaService,
  ) {}

  async createConnection(misInfo: MisSimpleInfoDto) {
    return this.clarisaService.createPermission(misInfo);
  }
}
