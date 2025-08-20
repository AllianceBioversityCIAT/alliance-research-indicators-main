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
        'pi.id AS indicator_id',
        'pi.name AS indicator_name',
        'pi.code AS indicator_code',
        'pi.description AS indicator_description',
        'pi.number_type AS number_type',
        'pi.number_format AS number_format',
        'pi.target_unit AS target_unit',
        'pi.year AS year',
        'pi.type AS type',
        'ac.agreement_id AS agreement_id',
        'ac.description AS contract_description',
        'r.result_id AS result_id',
        'r.result_official_code AS result_official_code',
        'r.title AS result_title',
      ])
      .addSelect(
        'CASE WHEN pi.target_value = FLOOR(pi.target_value) THEN CAST(pi.target_value AS SIGNED) ELSE ROUND(pi.target_value, 2) END',
        'target_value'
      )
      .addSelect(
        'CASE WHEN pi.base_line = FLOOR(pi.base_line) THEN CAST(pi.base_line AS SIGNED) ELSE ROUND(pi.base_line, 2) END',
        'base_line'
      )
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
          indicators: [],
        });
      }

      const contract = contractMap.get(row.agreement_id);

      // Evitar duplicados de indicadores
      if (!contract.indicators.some((i: any) => i.id === row.indicator_id)) {
        contract.indicators.push({
          id: row.indicator_id,
          name: row.indicator_name,
          code: row.indicator_code,
          description: row.indicator_description,
          number_type: row.number_type,
          number_format: row.number_format,
          target_unit: row.target_unit,
          target_value: row.target_value,
          base_line: row.base_line,
          year: row.year,
          type: row.type,
        });
      }
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

    type Indicator = {
      id: number;
      code: string | null;
      name: string | null;
      description: string | null;
      numberType: string | null;
      numberFormat: string | null;
      targetUnit: string | null;
      targetValue: number | null;
      baseLine: number | null;
      year: any; // según tu esquema (a veces es JSON/array)
      type: string | null;
    };

    type Node = {
      id: number;
      name: string;
      code: string;
      level: number;
      parentId: number | null;
      indicators: Indicator[];
      children: Node[];
      _indSet?: Set<number>;
    };

    const itemsMap = new Map<number, Node>();

    for (const row of rawData) {
      // Crea el nodo si no existe
      if (!itemsMap.has(row.item_id)) {
        itemsMap.set(row.item_id, {
          id: row.item_id,
          name: row.item_name,
          code: row.item_code,
          level: row.level,
          parentId: row.parent_id ?? null,
          indicators: [],
          children: [],
          _indSet: new Set<number>(),
        });
      }

      const node = itemsMap.get(row.item_id)!;

      // Agrega indicador si existe y evita duplicados
      if (row.project_indicator_id != null && !node._indSet!.has(row.project_indicator_id)) {
        node._indSet!.add(row.project_indicator_id);
        node.indicators.push({
          id: row.project_indicator_id,
          code: row.indicator_code ?? null,
          name: row.indicator_name ?? null,
          description: row.indicator_description ?? null,
          numberType: row.number_type ?? null,
          numberFormat: row.number_format ?? null,
          targetUnit: row.target_unit ?? null,
          targetValue: row.target_value ?? null,
          baseLine: row.base_line ?? null,
          year: row.year ?? null,
          type: row.type ?? null,
        });
      }
    }

    // ---------- PASO 2: Enlazar jerarquía (padres ← hijos) ----------
    for (const node of itemsMap.values()) {
      if (node.parentId != null && itemsMap.has(node.parentId)) {
        itemsMap.get(node.parentId)!.children.push(node);
      }
    }

    // ---------- PASO 3: Pruning: conservar solo
    // nodos con indicadores o con descendientes que tienen indicadores ----------
    const hasIndicatorsOrDescendants = (n: Node): boolean => {
      const selfHas = n.indicators.length > 0;
      let childHas = false;
      // filtra in-place los hijos que no aportan
      n.children = n.children.filter((c) => {
        const keep = hasIndicatorsOrDescendants(c);
        if (keep) childHas = true;
        return keep;
      });
      return selfHas || childHas;
    };

    // raíces = nodos sin padre
    let roots = Array.from(itemsMap.values()).filter((n) => n.parentId == null);

    // aplica pruning a las raíces
    roots = roots.filter((r) => hasIndicatorsOrDescendants(r));

    // ---------- PASO 4: Orden opcional: Padre, indicadores padre, hijos ----------
    // (la estructura ya cumple: cada nodo tiene sus indicators y luego children)
    // Si quieres ordenar hijos por nombre/código:
    const orderTree = (n: Node) => {
      n.children.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
      n.children.forEach(orderTree);
    };
    roots.forEach(orderTree);

    // Limpieza: quitar campos internos
    const strip = (n: Node): any => ({
      id: n.id,
      name: n.name,
      code: n.code,
      level: n.level,
      indicators: n.indicators,
      children: n.children.map(strip),
    });
    const tree = roots.map(strip);

    return tree;
  }
}
