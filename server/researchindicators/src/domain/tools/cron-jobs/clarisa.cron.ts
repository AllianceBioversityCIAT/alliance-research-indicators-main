import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SelfApp } from '../broker/self.app';

@Injectable()
export class ClarisaCron {
  constructor(private readonly _selfApp: SelfApp) {}

  @Cron(CronExpression.EVERY_8_HOURS)
  cloneNormalEntities() {
    this._selfApp.executeCloneNormalEntities();
  }
}
