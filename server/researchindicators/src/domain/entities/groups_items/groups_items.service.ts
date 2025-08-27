import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import {
  ChildItemDto,
  ParentItemDto,
  StructureDto,
} from './dto/group-item-action.dto';
import { ProjectIndicator } from '../project_indicators/entities/project_indicator.entity';
import { ProjectGroup } from '../project_groups/entities/project_group.entity';

@Injectable()
export class GroupsItemsService {
  constructor(
    @InjectRepository(GroupItem)
    private readonly groupItemRepository: Repository<GroupItem>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(agreement_id: string) {
    const groups = await this.groupItemRepository
      .createQueryBuilder('gi')
      .leftJoinAndSelect('gi.parentGroup', 'parentGroup')
      .leftJoinAndSelect('gi.indicatorPerItem', 'indicatorPerItem')
      .leftJoinAndSelect(
        'indicatorPerItem.projectIndicator',
        'projectIndicator',
      )
      .where('gi.is_active = :active', { active: true })
      .andWhere('gi.agreement_id = :agreementId', { agreementId: agreement_id })
      .orderBy('gi.id', 'ASC')
      .getMany();

    const nodes = new Map<number, any>();

    for (const g of groups) {
      if (!g.name || !g.code) {
        continue;
      }

      const indicators =
        g.indicatorPerItem
          ?.filter(
            (ipi) => ipi.projectIndicator && ipi.projectIndicator.is_active,
          )
          .map((ipi) => ({
            id: ipi.projectIndicator.id.toString(),
            name: ipi.projectIndicator.name,
            code: ipi.projectIndicator.code || '',
            description: ipi.projectIndicator.description || '',
            numberType: ipi.projectIndicator.number_type,
            numberFormat: ipi.projectIndicator.number_format || 'decimal',
            years: ipi.projectIndicator.year || [],
            targetUnit: ipi.projectIndicator.target_unit || '',
            targetValue: Number(ipi.projectIndicator.target_value) || 0,
            baseline: Number(ipi.projectIndicator.base_line) || 0,
            type: ipi.projectIndicator.type || '',
          })) || [];

      nodes.set(g.id, {
        id: g.id.toString(),
        name: g.name,
        code: g.code || g.id.toString(),
        items: [] as any[],
        indicators,
      });
    }

    const roots: any[] = [];

    for (const g of groups) {
      if (!nodes.has(g.id)) continue;

      const node = nodes.get(g.id);
      const parentId = g.parent_id;

      if (parentId) {
        const parentNode = nodes.get(parentId);
        if (parentNode) {
          parentNode.items.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    // (Opcional) ordenar hijos por id para consistencia
    const sortRecursively = (list: any[]) => {
      list.sort((a, b) => Number(a.id) - Number(b.id));
      for (const it of list) if (it.items?.length) sortRecursively(it.items);
    };
    sortRecursively(roots);

    const projectGroups = await this.dataSource
      .getRepository(ProjectGroup)
      .find({
        where: { agreement_id, is_active: true },
        select: ['name', 'level'],
      });

    const name_level_1 = projectGroups.find((g) => g.level === 1)?.name || '';
    const name_level_2 = projectGroups.find((g) => g.level === 2)?.name || '';

    return {
      name_level_1,
      name_level_2,
      structures: roots,
    };
  }

  private async getExistingParentsMap(
    agreementId: string,
    manager: EntityManager,
  ): Promise<Map<number, GroupItem>> {
    const existingParentsDB = await manager.find(GroupItem, {
      where: {
        agreement_id: agreementId,
        parent_id: IsNull(),
        is_active: true,
      },
    });

    return new Map<number, GroupItem>(existingParentsDB.map((p) => [p.id, p]));
  }

  private async processParent(
    parentPayload: ParentItemDto,
    agreementId: string,
    existingParentsMap: Map<number, GroupItem>,
    manager: EntityManager,
  ): Promise<GroupItem | null> {
    const payloadParentId =
      parentPayload.id != null ? Number(parentPayload.id) : null;

    if (payloadParentId && existingParentsMap.has(payloadParentId)) {
      return this.updateExistingParent(
        parentPayload,
        existingParentsMap.get(payloadParentId)!,
        agreementId,
        manager,
      );
    } else {
      return this.createNewParent(parentPayload, agreementId, manager);
    }
  }

  private async updateExistingParent(
    parentPayload: ParentItemDto,
    parent: GroupItem,
    agreementId: string,
    manager: EntityManager,
  ): Promise<GroupItem> {
    if (
      parent.name !== parentPayload.name ||
      parent.code !== parentPayload.code
    ) {
      parent.name = parentPayload.name;
      parent.code = parentPayload.code;
      await manager.save(parent);
    }

    await this.syncGroupItemIndicators(
      parent.id,
      parentPayload.indicators || [],
      agreementId,
      manager,
    );

    return parent;
  }

  private async createNewParent(
    parentPayload: ParentItemDto,
    agreementId: string,
    manager: EntityManager,
  ): Promise<GroupItem> {
    const newParent = manager.create(GroupItem, {
      name: parentPayload.name,
      code: parentPayload.code,
      agreement_id: agreementId,
      parentGroup: null,
    });

    const savedParent = await manager.save(newParent);

    await this.syncGroupItemIndicators(
      savedParent.id,
      parentPayload.indicators || [],
      agreementId,
      manager,
    );

    return savedParent;
  }

  private async deactivateUnprocessedParents(
    existingParentsMap: Map<number, GroupItem>,
    processedParentIds: Set<number>,
    manager: any,
  ): Promise<void> {
    const existingParents = Array.from(existingParentsMap.values());

    for (const dbParent of existingParents) {
      if (!processedParentIds.has(dbParent.id)) {
        await manager.update(
          GroupItem,
          { id: dbParent.id },
          { is_active: false, deleted_at: new Date() },
        );
      }
    }
  }

  private async getExistingChildrenMap(
    parent: GroupItem,
    agreementId: string,
    manager: EntityManager,
  ): Promise<Map<number, GroupItem>> {
    const existingChildrenDB = await manager.find(GroupItem, {
      where: {
        agreement_id: agreementId,
        parent_id: parent.id,
        is_active: true,
      },
    });

    return new Map<number, GroupItem>(existingChildrenDB.map((p) => [p.id, p]));
  }

  private async processChild(
    parentId: number,
    childrenPayload: ChildItemDto,
    agreementId: string,
    existingChildsMap: Map<number, GroupItem>,
    manager: EntityManager,
  ): Promise<GroupItem | null> {
    const payloadChildId =
      childrenPayload.id != null ? Number(childrenPayload.id) : null;

    if (payloadChildId && existingChildsMap.has(payloadChildId)) {
      return this.updateExistingChild(
        childrenPayload,
        existingChildsMap.get(payloadChildId)!,
        agreementId,
        manager,
      );
    } else {
      return this.createNewChild(
        childrenPayload,
        parentId,
        agreementId,
        manager,
      );
    }
  }

  private async updateExistingChild(
    childPayload: ChildItemDto,
    child: GroupItem,
    agreementId: string,
    manager: EntityManager,
  ): Promise<GroupItem> {
    if (child.name !== childPayload.name || child.code !== childPayload.code) {
      child.name = childPayload.name;
      child.code = childPayload.code;
      await manager.save(child);
    }

    await this.syncGroupItemIndicators(
      child.id,
      childPayload.indicators || [],
      agreementId,
      manager,
    );

    return child;
  }

  private async createNewChild(
    childPayload: ChildItemDto,
    parent: number,
    agreementId: string,
    manager: EntityManager,
  ): Promise<GroupItem> {
    const newChild = manager.create(GroupItem, {
      name: childPayload.name,
      code: childPayload.code,
      agreement_id: agreementId,
      parent_id: parent,
    });

    const savedChild = await manager.save(newChild);

    await this.syncGroupItemIndicators(
      savedChild.id,
      childPayload.indicators || [],
      agreementId,
      manager,
    );

    return savedChild;
  }

  private async deactivateUnprocessedChildren(
    existingChildsMap: Map<number, GroupItem>,
    processedChildrensIds: Set<number>,
    manager: any,
  ): Promise<void> {
    const existingChildren = Array.from(existingChildsMap.values());

    for (const dbChild of existingChildren) {
      if (!processedChildrensIds.has(dbChild.id)) {
        await manager.update(
          GroupItem,
          { id: dbChild.id },
          { is_active: false, deleted_at: new Date() },
        );
      }
    }
  }

  async processLevels(dto: any, manager: EntityManager) {
    const { agreement_id, name_level_1, name_level_2 } = dto;

    if (name_level_1) {
      await this.upsertLevel(manager, agreement_id, 1, name_level_1);
    }

    if (name_level_2) {
      await this.upsertLevel(manager, agreement_id, 2, name_level_2);
    }
  }

  private async upsertLevel(
    manager: EntityManager,
    agreement_id: string,
    level: number,
    name: string,
  ) {
    let record = await manager.findOne(ProjectGroup, {
      where: { agreement_id, level, is_active: true },
    });

    if (record) {
      if (record.name !== name) {
        record.name = name;
        await manager.save(record);
      }
    } else {
      record = manager.create(ProjectGroup, {
        agreement_id,
        name,
        level,
        is_active: true,
      });
      await manager.save(record);
    }
  }

  async syncStructures2(dto: StructureDto) {
    return this.dataSource.transaction(async (manager) => {
      await this.processLevels(dto, manager);

      // Traer padres existentes de la BD del proyecto actual
      const existingParentsMap = await this.getExistingParentsMap(
        dto.agreement_id,
        manager,
      );
      const processedParentIds = new Set<number>();

      //Procesa cada padre en el payload
      for (const parentPayload of dto.structures || []) {
        const parent = await this.processParent(
          parentPayload,
          dto.agreement_id,
          existingParentsMap,
          manager,
        );

        //Procesa cada hijo de cada padre
        if (parent) {
          processedParentIds.add(parent.id);

          const existingChildsMap = await this.getExistingChildrenMap(
            parent,
            dto.agreement_id,
            manager,
          );
          const processedChildrensIds = new Set<number>();

          for (const childPayload of parentPayload.items || []) {
            const child = await this.processChild(
              parent.id,
              childPayload,
              dto.agreement_id,
              existingChildsMap,
              manager,
            );

            if (child) {
              processedChildrensIds.add(child.id);
            }
          }
          // Elimina hijos que no vinieron en el payload
          await this.deactivateUnprocessedChildren(
            existingChildsMap,
            processedChildrensIds,
            manager,
          );
        }
      }
      //Elimina padres que no vinieron en el payload
      await this.deactivateUnprocessedParents(
        existingParentsMap,
        processedParentIds,
        manager,
      );
      return { message: 'Sincronización de padres completada' };
    });
  }

  private async syncGroupItemIndicators(
    groupItemId: number,
    indicatorsPayload: any[] = [],
    agreementId: string,
    manager: EntityManager,
  ) {
    // Obtener ids actuales de la relación
    const currentRelations = await manager
      .createQueryBuilder(ProjectIndicator, 'pi')
      .select('ipi.project_indicator_id', 'indicatorId')
      .from('indicator_per_item', 'ipi')
      .where('ipi.group_item_id = :groupItemId', { groupItemId })
      .andWhere('pi.agreement_id = :agreementId', { agreementId })
      .andWhere('pi.is_active = true')
      .getRawMany();

    const currentIds = currentRelations.map((r) => Number(r.indicatorId));
    const payloadIds: number[] = [];

    for (const ind of indicatorsPayload) {
      let indicatorId: number;

      // Caso 1: Indicador ya existente
      if (ind.id && !String(ind.id).startsWith('indicator_')) {
        indicatorId = Number(ind.id);

        // Actualizar el indicador existente
        await manager.update(
          ProjectIndicator,
          { id: indicatorId },
          {
            name: ind.name,
            description: ind.description,
            number_type: ind.numberType,
            number_format: ind.numberFormat,
            year: ind.years,
            target_unit: ind.targetUnit,
            target_value: ind.targetValue,
            type: ind.type,
            base_line: ind.baseline,
            agreement_id: agreementId,
          },
        );

        // Caso 2: Indicador nuevo o con ID temporal
      } else {
        // Buscar si ya existe un indicador con las mismas características para evitar duplicados
        const existingIndicator = await manager.findOne(ProjectIndicator, {
          where: {
            name: ind.name,
            description: ind.description,
            number_type: ind.numberType,
            number_format: ind.numberFormat,
            year: ind.years,
            target_unit: ind.targetUnit,
            target_value: ind.targetValue,
            type: ind.type,
            base_line: ind.baseline,
            agreement_id: agreementId,
            is_active: true,
          },
        });

        if (existingIndicator) {
          // Si existe, usar el existente y actualizarlo
          indicatorId = existingIndicator.id;
          await manager.update(
            ProjectIndicator,
            { id: indicatorId },
            {
              name: ind.name,
              description: ind.description,
              number_type: ind.numberType,
              number_format: ind.numberFormat,
              year: ind.years,
              target_unit: ind.targetUnit,
              target_value: ind.targetValue,
              type: ind.type,
              base_line: ind.baseline,
              agreement_id: agreementId,
            },
          );
        } else {
          // Crear nuevo indicador solo si no existe
          const newIndicator = manager.create(ProjectIndicator, {
            name: ind.name,
            description: ind.description,
            level: ind.level,
            number_type: ind.numberType,
            number_format: ind.numberFormat,
            year: ind.years,
            target_unit: ind.targetUnit,
            target_value: ind.targetValue,
            agreement_id: agreementId,
            type: ind.type,
            base_line: ind.baseline,
            is_active: ind.isActive,
          });
          const saved = await manager.save(newIndicator);
          indicatorId = saved.id;
        }
      }
      payloadIds.push(indicatorId);

      // Asociar si no existe la relación
      if (!currentIds.includes(indicatorId)) {
        await manager.query(
          'INSERT INTO indicator_per_item (group_item_id, project_indicator_id) VALUES (?, ?)',
          [groupItemId, indicatorId],
        );
      }
    }

    // Eliminar relaciones que ya no están en el payload
    for (const existingId of currentIds) {
      if (!payloadIds.includes(existingId)) {
        await manager
          .createQueryBuilder()
          .delete()
          .from('indicator_per_item')
          .where('group_item_id = :groupItemId', { groupItemId })
          .andWhere('project_indicator_id = :indicatorId', {
            indicatorId: existingId,
          })
          .execute();
      }
    }
  }
}
