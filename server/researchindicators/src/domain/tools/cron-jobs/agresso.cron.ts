import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgressoService } from '../agresso/agresso.service';

@Injectable()
export class AgressoCron {
  constructor(private readonly _agressoService: AgressoService) {}
  @Cron(CronExpression.EVERY_10_SECONDS)
  async cloneNormalEntities() {
    console.log('=============');
    console.log('Cron job started: AgressoCron.cloneNormalEntities');
    console.log('=============');
    //this._agressoService.cloneAllAgressoEntities();
  }
}
