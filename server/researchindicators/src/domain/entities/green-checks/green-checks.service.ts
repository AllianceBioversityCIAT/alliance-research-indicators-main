import { Injectable } from '@nestjs/common';
import { GreenCheckRepository } from './repository/green-checks.repository';
import { FindGreenChecksDto } from './dto/find-green-checks.dto';
import { DataSource } from 'typeorm';
import { Result } from '../results/entities/result.entity';

@Injectable()
export class GreenChecksService {
  constructor(
    private readonly greenCheckRepository: GreenCheckRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findByResultId(resultId: number) {
    const greenChecks: FindGreenChecksDto =
      await this.greenCheckRepository.calculateGreenChecks(resultId);
    let completness = true;

    for (const key in greenChecks) {
      completness = completness && greenChecks[key];
    }

    greenChecks.completness = completness;
    return greenChecks;
  }

  //TODO: REFACTOR THIS METHOD
  async submmitedAndUnsubmmitedProcess(resultId: number) {
    const status: number = await this.dataSource
      .getRepository(Result)
      .findOne({
        where: {
          result_id: resultId,
          is_active: true,
        },
      })
      .then((result) => result.result_status_id);

    return status;
  }
}
