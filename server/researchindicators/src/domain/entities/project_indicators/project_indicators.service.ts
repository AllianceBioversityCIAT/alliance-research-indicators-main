import { Injectable } from '@nestjs/common';
import { ProjectIndicator } from './entities/project_indicator.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';

@Injectable()
export class ProjectIndicatorsService {
  constructor(
    @InjectRepository(ProjectIndicator)
    private readonly indicatorRepository: Repository<ProjectIndicator>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(agreement_id: string): Promise<CreateProjectIndicatorDto[]> {
    const indicators = await this.indicatorRepository
      .createQueryBuilder('pi')
      .select([
        'pi.id as id',
        'pi.code as code',
        'pi.name as name',
        'pi.description as description',
        'pi.number_type as number_type',
        'pi.number_format as number_format',
        'pi.target_unit as target_unit',
        'pi.year as year',
        'pi.type as type',
      ])
      .addSelect(
        'CASE WHEN pi.target_value = FLOOR(pi.target_value) THEN CAST(pi.target_value AS SIGNED) ELSE ROUND(pi.target_value, 2) END',
        'target_value'
      )
      .addSelect(
        'CASE WHEN pi.base_line = FLOOR(pi.base_line) THEN CAST(pi.base_line AS SIGNED) ELSE ROUND(pi.base_line, 2) END',
        'base_line'
      )
      .where('pi.is_active = true')
      .andWhere('pi.agreement_id = :agreement_id', { agreement_id })
      .getRawMany();

    return indicators.map((pi) => ({
      id: pi.id,
      code: pi.code,
      name: pi.name,
      description: pi.description,
      numberType: pi.number_type,
      numberFormat: pi.number_format,
      targetUnit: pi.target_unit,
      targetValue: pi.target_value,
      baseline: pi.base_line,
      years: pi.year ?? [],
      type: pi.type,
    })) as CreateProjectIndicatorDto[];
  }

  async syncIndicator(dto: CreateProjectIndicatorDto): Promise<ProjectIndicator> {
    let indicator: ProjectIndicator;

    if (dto.id) {
      indicator = await this.indicatorRepository.findOne({ where: { id: dto.id } });
      if (!indicator) {
        throw new Error(`Indicator with id ${dto.id} not found`);
      }
      Object.assign(indicator, {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        number_type: dto.numberType as any,
        number_format: dto.numberFormat as any,
        target_unit: dto.targetUnit,
        target_value: dto.targetValue,
        base_line: dto.baseline,
        year: dto.years,
        agreement_id: dto.agreement_id,
        type: dto.type,
      });
    } else {
      indicator = this.indicatorRepository.create({
        code: dto.code,
        name: dto.name,
        description: dto.description,
        number_type: dto.numberType as any,
        number_format: dto.numberFormat as any,
        target_unit: dto.targetUnit,
        target_value: dto.targetValue,
        base_line: dto.baseline,
        year: dto.years,
        agreement_id: dto.agreement_id,
        type: dto.type as any,
      });
    }

    return await this.indicatorRepository.save(indicator);
  }

  async softDelete(id: number) {
    return await this.indicatorRepository.update(id, { 
      deleted_at: new Date(),
      is_active: false
    });
  }

  async findByResult(resultId: string) {
    const rows = await this.indicatorRepository
      .createQueryBuilder('pi')
      .select([
        'ac.agreement_id AS agreement_id',
        'ac.description AS contract_description',
        'r.result_id AS result_id',
        'r.result_official_code AS result_official_code',
        'r.title AS result_title',
      ])
      .innerJoin('agresso_contracts', 'ac', 'pi.agreement_id = ac.agreement_id')
      .innerJoin('result_contracts', 'rc', 'ac.agreement_id = rc.contract_id')
      .innerJoin('results', 'r', 'rc.result_id = r.result_id')
      .where('r.result_id = :resultId', { resultId })
      .andWhere('pi.is_active = true')
      .getRawMany();

      console.log(rows);
    if (rows.length === 0) {
      return {
        result_id: resultId,
        result_official_code: null,
        result_title: null,
        contracts: [],
      };
    }

    const contractMap = new Map();

    for (const row of rows) {
      if (!contractMap.has(row.agreement_id)) {
        contractMap.set(row.agreement_id, {
          agreement_id: row.agreement_id,
          description: row.contract_description,
        });
      }

      const contract = contractMap.get(row.agreement_id);
    }

    return {
      result_id: rows[0].result_id,
      result_official_code: rows[0].result_official_code,
      result_title: rows[0].result_title,
      contracts: Array.from(contractMap.values()),
    };
  }

  async getIndicatorsHierarchy(agreementId: string): Promise<any[]> {
    const rawData = await this.dataSource.query(
      `
        WITH RECURSIVE group_hierarchy AS (
            SELECT 
                gi.id,
                gi.name,
                gi.official_code AS item_code,
                gi.parent_id,
                1 AS level
            FROM groups_items gi
            WHERE gi.parent_id IS NULL
              AND gi.is_active = true
            UNION ALL
            SELECT 
                gi.id,
                gi.name,
                gi.official_code AS item_code,
                gi.parent_id,
                gh.level + 1
            FROM groups_items gi
            INNER JOIN group_hierarchy gh ON gi.parent_id = gh.id
            WHERE gi.is_active = true
        )
        SELECT 
            gh.id AS item_id,
            gh.name AS item_name,
            gh.item_code AS item_code,
            gh.parent_id AS parent_id,
            gh.level AS level,
            pi.id AS project_indicator_id,
            pi.code AS indicator_code,
            pi.name AS indicator_name,
            pi.description AS indicator_description,
            pi.number_type AS number_type,
            pi.number_format AS number_format,
            pi.target_unit AS target_unit,
            CASE WHEN pi.target_value = FLOOR(pi.target_value) THEN CAST(pi.target_value AS SIGNED) ELSE ROUND(pi.target_value, 2) END AS target_value,
            CASE WHEN pi.base_line = FLOOR(pi.base_line) THEN CAST(pi.base_line AS SIGNED) ELSE ROUND(pi.base_line, 2) END AS base_line,
            pi.year AS year,
            pi.type AS type
        FROM group_hierarchy gh
        LEFT JOIN indicator_per_item ipi
          ON ipi.group_item_id = gh.id
          AND ipi.is_active = true
        LEFT JOIN project_indicators pi
          ON pi.id = ipi.project_indicator_id
          AND pi.is_active = true
          AND pi.agreement_id = ?
        ORDER BY gh.level, gh.id;
      `,
      [agreementId],
    );

    const indicatorsMap = new Map();

    for (const row of rawData) {
      if (!row.project_indicator_id) continue;

      if (!indicatorsMap.has(row.project_indicator_id)) {
        indicatorsMap.set(row.project_indicator_id, {
          id: row.project_indicator_id,
          code: row.indicator_code,
          name: row.indicator_name,
          description: row.indicator_description,
          numberType: row.number_type,
          numberFormat: row.number_format,
          targetUnit: row.target_unit,
          targetValue: row.target_value,
          baseLine: row.base_line,
          year: row.year,
          type: row.type,
          group_item: null,
        });
      }

      // Group item
      const groupItem = {
        id: row.item_id,
        name: row.item_name,
        code: row.item_code,
        parent_id: row.parent_id,
      };

      // Buscamos el padre (si existe en el rawData)
      let parent_item = null;
      if (row.parent_id) {
        const parentRow = rawData.find(r => r.item_id === row.parent_id);
        if (parentRow) {
          parent_item = {
            id: parentRow.item_id,
            name: parentRow.item_name,
            code: parentRow.item_code,
          };
        }
      }

      indicatorsMap.get(row.project_indicator_id).group_item = {
        ...groupItem,
        parent_item,
      };
    }

    const result = Array.from(indicatorsMap.values());

    // --- EL RETURN ---
    return result;
  }
}
