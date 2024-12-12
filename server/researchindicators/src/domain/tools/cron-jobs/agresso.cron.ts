import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgressoToolsService } from '../agresso/agresso-tools.service';

@Injectable()
export class AgressoCron {
  constructor(private readonly _agressoToolsService: AgressoToolsService) {}
  @Cron(CronExpression.EVERY_WEEK)
  async cloneNormalEntities() {
    this._agressoToolsService.cloneAllAgressoEntities();
  }
}
