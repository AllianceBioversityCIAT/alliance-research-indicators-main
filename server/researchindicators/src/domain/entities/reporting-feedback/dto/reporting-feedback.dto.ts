import { ApiProperty } from '@nestjs/swagger';

export enum AskForHelpTypeEnum {
  TECHNICAL_SUPPORT = 'technical-support',
  CONTENT_SUPPORT = 'content-support',
}

export class BrowserInfo {
  @ApiProperty({
    type: String,
    name: 'name',
  })
  name: string;

  @ApiProperty({
    type: String,
    name: 'fullVersion',
  })
  fullVersion: string;

  @ApiProperty({
    type: String,
    name: 'majorVersion',
  })
  majorVersion: number;
}
export class Metadata {
  @ApiProperty({
    type: Number,
    name: 'indicator_id',
  })
  indicator_id: number;

  @ApiProperty({
    type: String,
    name: 'indicator_name',
  })
  indicator_name: string;

  @ApiProperty({
    type: Number,
    name: 'result_id',
  })
  result_id: number;

  @ApiProperty({
    type: String,
    name: 'result_official_code',
  })
  result_official_code: number;

  @ApiProperty({
    type: String,
    name: 'status_id',
  })
  status_id: number;

  @ApiProperty({
    type: String,
    name: 'status_name',
  })
  status_name: string;

  @ApiProperty({
    type: String,
    name: 'result_title',
  })
  result_title: string;

  @ApiProperty({
    type: String,
    name: 'created_by',
  })
  created_by: number;

  @ApiProperty({
    type: String,
    name: 'report_year',
  })
  report_year: number;

  @ApiProperty({
    type: String,
    name: 'is_principal_investigator',
  })
  is_principal_investigator: boolean;
}

export class Role {
  @ApiProperty({
    type: Date,
  })
  created_at: Date;

  @ApiProperty({
    type: Date,
  })
  updated_at: Date;

  @ApiProperty({
    type: Boolean,
  })
  is_active: boolean;

  @ApiProperty({
    type: String,
  })
  justification_update: null;

  @ApiProperty({
    type: Number,
  })
  sec_role_id: number;

  @ApiProperty({
    type: String,
  })
  name: string;

  @ApiProperty({
    type: Number,
  })
  focus_id: number;
}

export class UserRoleList {
  @ApiProperty({
    type: Date,
  })
  created_at: Date;

  @ApiProperty({
    type: Date,
  })
  updated_at: Date;

  @ApiProperty({
    type: Boolean,
  })
  is_active: boolean;

  @ApiProperty({
    type: Number,
  })
  sec_user_role_id: number;

  @ApiProperty({
    type: Number,
  })
  user_id: number;

  @ApiProperty({
    type: Number,
  })
  role_id: number;

  @ApiProperty({
    type: Role,
  })
  role: Role;
}
export class UserData {
  @ApiProperty({
    type: Date,
  })
  created_at: Date;

  @ApiProperty({
    type: Date,
  })
  updated_at: Date;

  @ApiProperty({
    type: Boolean,
  })
  is_active: boolean;

  @ApiProperty({
    type: Number,
  })
  sec_user_id: number;

  @ApiProperty({
    type: String,
  })
  first_name: string;

  @ApiProperty({
    type: String,
  })
  last_name: string;

  @ApiProperty({
    type: String,
  })
  email: string;

  @ApiProperty({
    type: String,
  })
  status_id: number;

  @ApiProperty({
    type: UserRoleList,
    isArray: true,
  })
  user_role_list: UserRoleList[];

  @ApiProperty({
    type: String,
  })
  roleName: string;
}

export class AskForHelp {
  @ApiProperty({
    type: String,
    name: 'type',
    enum: AskForHelpTypeEnum,
  })
  type: AskForHelpTypeEnum;

  @ApiProperty({
    type: String,
    name: 'message',
  })
  message: string;

  @ApiProperty({
    type: String,
    name: 'url',
  })
  url: string;

  @ApiProperty({
    type: Metadata,
    name: 'metadata',
  })
  metadata: Metadata;

  @ApiProperty({
    type: UserData,
    name: 'userData',
  })
  userData: UserData;

  @ApiProperty({
    type: Number,
    name: 'currentResultId',
  })
  currentResultId: number;

  @ApiProperty({
    type: Number,
    name: 'currentRouteTitle',
  })
  currentRouteTitle: string;

  @ApiProperty({
    type: Number,
    name: 'windowWidth',
  })
  windowWidth: number;

  @ApiProperty({
    type: Number,
    name: 'windowHeight',
  })
  windowHeight: number;

  @ApiProperty({
    type: BrowserInfo,
    name: 'browserInfo',
  })
  browserInfo: BrowserInfo;
}
