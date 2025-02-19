import { Injectable } from '@nestjs/common';
import { GreenCheckRepository } from './repository/green-checks.repository';

@Injectable()
export class GreenChecksService {
  constructor(private readonly greenCheckRepository: GreenCheckRepository) {}

  async findByResultId(resultId: number) {
    return this.greenCheckRepository.calculateGreenChecks(resultId);
  }
}
