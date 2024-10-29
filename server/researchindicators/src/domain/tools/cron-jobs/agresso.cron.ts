import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgressoService } from '../agresso/agresso.service';

@Injectable()
export class AgressoCron {
  constructor(private readonly _agressoService: AgressoService) {}
  @Cron(CronExpression.EVERY_WEEK)
  async cloneNormalEntities() {
    this._agressoService.cloneAllAgressoEntities();
  }
}
