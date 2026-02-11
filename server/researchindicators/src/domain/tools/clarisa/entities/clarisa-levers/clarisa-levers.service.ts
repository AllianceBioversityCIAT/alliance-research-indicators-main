import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLever } from './entities/clarisa-lever.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { LeverIcon } from './enum/LeversIcons.enum';
@Injectable()
export class ClarisaLeversService extends ControlListBaseService<
  ClarisaLever,
  Repository<ClarisaLever>
> {
  constructor(
    dataSource: DataSource,
    currentUser: CurrentUserUtil,
    private readonly appConfig: AppConfig,
  ) {
    super(
      ClarisaLever,
      dataSource.getRepository(ClarisaLever),
      currentUser,
      'short_name',
    );
  }

  iconMapper(clarisaLever: ClarisaLever[]) {
    return clarisaLever.map((lever) => {
      return {
        ...lever,
        icon: LeverIcon[lever.short_name]
          ? `${this.appConfig.BUCKET_URL}/images/levers${LeverIcon[lever.short_name]}`
          : null,
      };
    });
  }

  homologatedData(data: string): string {
    const homologated = {
      L8: 'Lever 8',
      L7: 'Lever 7',
      L6: 'Lever 6',
      L5: 'Lever 5',
      L4: 'Lever 4',
      L3: 'Lever 3',
      L2: 'Lever 2',
      L1: 'Lever 1',
    };
    return homologated[data?.toUpperCase()?.trim()] ?? null;
  }
}
