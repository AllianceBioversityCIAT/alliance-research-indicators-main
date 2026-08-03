import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClarisaScienceProgram } from './entities/clarisa-science-program.entity';

/**
 * SINGLETON BY DESIGN — see design.md §3.4.
 *
 * Read-only catalog service. Does NOT inject CurrentUserUtil, ResultsUtil, or
 * any other REQUEST-scoped provider, so it can be safely consumed by
 * BilateralService (also singleton) without re-tripping the
 * ResultsService ↔ ResultOicrService forwardRef empty-shell cycle.
 */
@Injectable()
export class ClarisaScienceProgramsService {
  constructor(
    @InjectRepository(ClarisaScienceProgram)
    private readonly repo: Repository<ClarisaScienceProgram>,
  ) {}

  async findAll(): Promise<ClarisaScienceProgram[]> {
    return this.repo.find({
      where: { is_active: true },
      order: { official_code: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<ClarisaScienceProgram | null> {
    return this.repo.findOne({
      where: { official_code: code, is_active: true },
    });
  }
}
