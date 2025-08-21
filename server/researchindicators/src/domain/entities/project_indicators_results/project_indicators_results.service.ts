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

  async syncResultToIndicator(dtos: SyncProjectIndicatorsResultDto[]): Promise<ProjectIndicatorsResult[]> {
    const contributions: ProjectIndicatorsResult[] = [];

    for (const dto of dtos) {
      let contribution: ProjectIndicatorsResult;

        if (dto.contribution_id) {
          contribution = await this.indicatorsResultsRepo.findOne({ where: { id: dto.contribution_id } });

          if (!contribution) {
            throw new Error('Contribution not found');
          }
          Object.assign(contribution, {
            result_id: {result_id: dto.result_id},
            indicator_id: {id: dto.indicator_id},
            contribution_value: dto.contribution_value
          });
        } else {
          contribution = this.indicatorsResultsRepo.create({
            result_id: {result_id: dto.result_id},
            indicator_id: {id: dto.indicator_id},
            contribution_value: dto.contribution_value
          });
        }
        contributions.push(contribution);
    }

    return await this.indicatorsResultsRepo.save(contributions);
  }

  async findByResultId(resultId: number, agreementId: string): Promise<ProjectIndicatorsResult[]> {
    console.log('Params:', resultId, agreementId);
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

      console.log('Rows retrieved:', rows);
    return rows;
  }

  async deleteContribution(contributionId: number) {
    return await this.indicatorsResultsRepo.update(contributionId, {
      deleted_at: new Date(),
      is_active: false
    });
  }

  async syncResultToIndicator2(dtos: SyncProjectIndicatorsResultDto[]): Promise<ProjectIndicatorsResult[]> {
    if (!dtos || dtos.length === 0) {
      throw new Error('Debe enviar al menos un dto');
    }

    // Tomamos el result_id de los dtos (asumo que todos son del mismo result)
    const resultId = dtos[0].result_id;

    // Traemos de BD todos los contributions asociados a ese result
    const existingContributions = await this.indicatorsResultsRepo.find({
      where: { result_id: { result_id: resultId } },
    });

    const contributionsToSave: ProjectIndicatorsResult[] = [];
    const payloadIds = dtos.map(dto => dto.contribution_id).filter(id => !!id);

    for (const dto of dtos) {
      let contribution: ProjectIndicatorsResult;

      if (dto.contribution_id) {
        // Buscar si existe en BD
        contribution = existingContributions.find(c => c.id === dto.contribution_id);

        if (!contribution) {
          throw new Error(`Contribution with id ${dto.contribution_id} not found`);
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
    const savedContributions = await this.indicatorsResultsRepo.save(contributionsToSave);

    // Eliminamos los que ya no están en el payload
    const toDelete = existingContributions.filter(c => !payloadIds.includes(c.id));
    if (toDelete.length > 0) {
      await this.indicatorsResultsRepo.remove(toDelete);
    }

    return savedContributions;
  }
}
