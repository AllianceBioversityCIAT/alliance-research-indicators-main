import { ClarisaSdgTarget } from '../entities/clarisa-sdg-targets/entities/clarisa-sdg-target.entity';

export class ClarisaSdgTargetsMapper extends ClarisaSdgTarget {
  constructor(rawData: ClarisaSdgTargetsRawDto) {
    super();
    this.id = rawData.id;
    this.sdg_target = rawData.sdgTarget;
    this.sdg_target_code = rawData.sdgTargetCode;
  }
}

export class ClarisaSdgTargetsRawDto {
  id: number;
  sdgTarget: string;
  sdgTargetCode: string;
  sdg: {
    financialCode: string;
    fullName: string;
    shortName: string;
    usndCode: number;
  };
}
