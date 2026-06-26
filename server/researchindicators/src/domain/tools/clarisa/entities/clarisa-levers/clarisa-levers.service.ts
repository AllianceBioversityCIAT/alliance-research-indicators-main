import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLever } from './entities/clarisa-lever.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { resolveLeverIconUrl } from './lever-icon.util';
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

  resolveIconUrl(
    shortName?: string | null,
    fullName?: string | null,
    leverId?: number | null,
  ): string | null {
    return resolveLeverIconUrl(this.appConfig.BUCKET_URL, {
      shortName,
      fullName,
      leverId,
    });
  }

  iconMapper(clarisaLever: ClarisaLever[]) {
    return clarisaLever.map((lever) => ({
      ...lever,
      icon: this.resolveIconUrl(lever.short_name, lever.full_name, lever.id),
    }));
  }

  async findByShortName(shortName: string): Promise<ClarisaLever> {
    return this.mainRepo.findOne({
      where: {
        short_name: shortName,
      },
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
