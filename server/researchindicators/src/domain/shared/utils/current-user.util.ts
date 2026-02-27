import { Inject, Injectable, Scope } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { AuditableEntity } from '../global-dto/auditable.entity';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserUtil {
  private systemUser: User | null = null;
  private forceSystemUser: boolean = false;
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  setSystemUser(user: Partial<User>, forceSystemUser: boolean = false) {
    this.systemUser = user ? (user as User) : null;
    this.forceSystemUser = forceSystemUser;
  }

  clearSystemUser() {
    this.systemUser = null;
    this.forceSystemUser = false;
  }

  get user(): User {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser;
    }
    return this.request?.['user'];
  }

  get user_id(): number {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser?.sec_user_id;
    }
    return (this.request?.['user'] as User)?.sec_user_id;
  }

  get email(): string {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser?.email;
    }
    return (this.request?.['user'] as User)?.email;
  }

  get roles(): number[] {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser?.roles;
    }
    return (this.request?.['user'] as User)?.roles || [];
  }

  public audit(set: SetAuditEnum = SetAuditEnum.NEW): Partial<AuditableEntity> {
    switch (set) {
      case SetAuditEnum.NEW:
        return { created_by: this?.user_id };
      case SetAuditEnum.UPDATE:
        return { updated_by: this?.user_id };
      case SetAuditEnum.BOTH:
        return { created_by: this?.user_id, updated_by: this?.user_id };
    }
  }
}

export enum SetAuditEnum {
  NEW,
  UPDATE,
  BOTH,
}
