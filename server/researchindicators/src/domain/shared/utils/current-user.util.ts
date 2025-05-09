import { Inject, Injectable, Scope } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { AuditableEntity } from '../global-dto/auditable.entity';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserUtil {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get user(): User {
    return this.request['user'];
  }

  get user_id(): number {
    return (this.request['user'] as User).sec_user_id;
  }

  public audit(set: SetAutitEnum = SetAutitEnum.NEW): Partial<AuditableEntity> {
    switch (set) {
      case SetAutitEnum.NEW:
        return { created_by: this.user_id };
      case SetAutitEnum.UPDATE:
        return { updated_by: this.user_id };
      case SetAutitEnum.BOTH:
        return { created_by: this.user_id, updated_by: this.user_id };
    }
  }
}

export enum SetAutitEnum {
  NEW,
  UPDATE,
  BOTH,
}
