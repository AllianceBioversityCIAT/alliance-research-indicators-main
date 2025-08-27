import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectIndicatorsResult } from './entities/project_indicators_result.entity';
import { Repository } from 'typeorm';
import { SyncProjectIndicatorsResultDto } from './dto/sync-project_indicators_result.dto';

@Injectable()
export class ProjectIndicatorsResultsService {
  constructor(
    @InjectRepository(ProjectIndicatorsResult)
    private readonly indicatorsResultsRepo: Repository<ProjectIndicatorsResult>,
  ) {}

  async findByResultId(
    resultId: number,
    agreementId: string,
  ): Promise<ProjectIndicatorsResult[]> {
    const rows = await this.indicatorsResultsRepo.query(
      `
        SELECT 
            pir.id AS contribution_id,
            CASE 
                WHEN pir.contribution_value = FLOOR(pir.contribution_value) 
                THEN CAST(pir.contribution_value AS SIGNED) 
                ELSE ROUND(pir.contribution_value, 2) 
            END AS contribution_value,
            pir.result_id AS result_id,
            pir.indicator_id AS indicator_id
        FROM project_indicators_results pir
        LEFT JOIN project_indicators pi 
            ON pir.indicator_id = pi.id 
          AND pi.is_active = TRUE
        LEFT JOIN results r 
            ON pir.result_id = r.result_id 
          AND r.is_active = TRUE
        WHERE pir.result_id = ?
          AND pi.agreement_id = ?
          AND pir.is_active = TRUE
      `,
      [resultId, agreementId], // parámetros en orden
    );

    return rows;
  }

  async syncResultToIndicator(
    dtos: SyncProjectIndicatorsResultDto[],
    resultId: number,
  ): Promise<ProjectIndicatorsResult[]> {
    // Traemos de BD todos los contributions asociados a ese result
    const existingContributions = await this.indicatorsResultsRepo
      .createQueryBuilder('pir')
      .innerJoin('pir.result_id', 'r')
      .where('r.result_id = :resultId', { resultId: resultId })
      .andWhere('pir.is_active = true')
      .getMany();

    const contributionsToSave: ProjectIndicatorsResult[] = [];
    const payloadIds = dtos
      .map((dto) => dto.contribution_id)
      .filter((id) => !!id);

    for (const dto of dtos) {
      let contribution: ProjectIndicatorsResult;

      if (dto.contribution_id) {
        // Buscar si existe en BD
        contribution = existingContributions.find(
          (c) => c.id === dto.contribution_id,
        );
        if (!contribution) {
          throw new Error(
            `Contribution with id ${dto.contribution_id} not found`,
          );
        }

        Object.assign(contribution, {
          result_id: { id: dto.result_id },
          indicator_id: { id: dto.indicator_id },
          contribution_value: dto.contribution_value,
        });
      } else {
        // Nuevo registro
        contribution = this.indicatorsResultsRepo.create({
          result_id: { result_id: dto.result_id },
          indicator_id: { id: dto.indicator_id },
          contribution_value: dto.contribution_value,
        });
      }

      contributionsToSave.push(contribution);
    }

    // Guardamos los nuevos y actualizados
    const savedContributions =
      await this.indicatorsResultsRepo.save(contributionsToSave);

    // Eliminamos los que ya no están en el payload
    const toDelete = existingContributions.filter(
      (c) => !payloadIds.includes(c.id),
    );
    if (toDelete.length > 0) {
      await this.indicatorsResultsRepo.update(
        toDelete.map((c) => c.id),
        {
          deleted_at: new Date(),
          is_active: false,
        },
      );
    }

    return savedContributions;
  }
}
