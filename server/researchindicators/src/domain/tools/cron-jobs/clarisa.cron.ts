import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClarisaService } from '../clarisa/clarisa.service';

@Injectable()
export class ClarisaCron {
  constructor(private readonly _clarisaService: ClarisaService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async cloneNormalEntities() {
    console.log('=============');
    console.log('Cron job started: 30 ClarisaCron.cloneNormalEntities');
    console.log('=============');
    //this._clarisaService.cloneAllClarisaEntities();
  }
}
