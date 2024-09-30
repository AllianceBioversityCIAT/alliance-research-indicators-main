import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClarisaService } from '../clarisa/clarisa.service';

@Injectable()
export class ClarisaCron {
  constructor(private readonly _clarisaService: ClarisaService) {}

  @Cron(CronExpression.EVERY_8_HOURS)
  async cloneNormalEntities() {
    this._clarisaService.cloneAllClarisaEntities();
  }
}
