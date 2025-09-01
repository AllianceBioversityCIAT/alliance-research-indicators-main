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
import { cleanCustomFields } from '../../shared/utils/clean-custom-fields';

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
        custom_values: cleanCustomFields(g),
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
        select: [
          'name',
          'level',
          'custom_field_1',
          'custom_field_2',
          'custom_field_3',
          'custom_field_4',
          'custom_field_5',
          'custom_field_6',
          'custom_field_7',
          'custom_field_8',
          'custom_field_9',
          'custom_field_10',
        ],
      });

    const levels = projectGroups.map((pg) => ({
      level: pg.level,
      name: pg.name,
      custom_fields: cleanCustomFields(pg),
    }));

    return {
      levels,
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
    let hasChanges = false;

    if (parent.name !== parentPayload.name) {
      parent.name = parentPayload.name;
      hasChanges = true;
    }

    if (parent.code !== parentPayload.code) {
      parent.code = parentPayload.code;
      hasChanges = true;
    }

    for (let i = 1; i <= 10; i++) {
      const fieldName = `custom_field_${i}` as keyof ParentItemDto;

      if (fieldName in parentPayload) {
        const newValue = parentPayload[fieldName];
        if (parent[fieldName] !== newValue) {
          parent[fieldName] = newValue;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
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
      ...Array.from({ length: 10 }, (_, i) => i + 1).reduce((acc, i) => {
        const fieldName = `custom_field_${i}` as keyof ParentItemDto;
        if (fieldName in parentPayload) {
          acc[fieldName] = parentPayload[fieldName];
        }
        return acc;
      }, {} as Partial<GroupItem>),
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
    let hasChanges = false;

    if (child.name !== childPayload.name) {
      child.name = childPayload.name;
      hasChanges = true;
    }

    if (child.code !== childPayload.code) {
      child.code = childPayload.code;
      hasChanges = true;
    }

    for (let i = 1; i <= 10; i++) {
      const fieldName = `custom_field_${i}` as keyof ChildItemDto;

      if (fieldName in childPayload) {
        const newValue = childPayload[fieldName];
        if (child[fieldName] !== newValue) {
          child[fieldName] = newValue;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await manager.save(parent);
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
      ...Array.from({ length: 10 }, (_, i) => i + 1).reduce((acc, i) => {
        const fieldName = `custom_field_${i}` as keyof ChildItemDto;
        if (fieldName in childPayload) {
          acc[fieldName] = childPayload[fieldName];
        }
        return acc;
      }, {} as Partial<GroupItem>),
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
    } else {
      await this.removeLevel(manager, agreement_id, 1);
    }

    if (name_level_2) {
      await this.upsertLevel(manager, agreement_id, 2, name_level_2);
    } else {
      await this.removeLevel(manager, agreement_id, 2);
    }
  }

  private async removeLevel(manager: EntityManager, agreement_id: string, level: number) {
    const record = await manager.findOne(ProjectGroup, {
      where: { agreement_id, level, is_active: true },
    });

    if (record) {
      record.is_active = false;
      await manager.save(record);

      const customFieldKey = `custom_field_${level}`;
      await this.removeCustomField(manager, agreement_id, customFieldKey);
    }
  }

  private async removeCustomField(
     manager: EntityManager,
    agreementId: string,
    customField: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(GroupItem)
      .set({ [customField]: () => 'NULL' })
      .where('agreement_id = :agreementId', { agreementId })
      .execute();
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
      .createQueryBuilder()
      .select('ipi.project_indicator_id', 'indicatorId')
      .from('indicator_per_item', 'ipi')
      .innerJoin(ProjectIndicator, 'pi', 'pi.id = ipi.project_indicator_id')
      .where('ipi.group_item_id = :groupItemId', { groupItemId })
      .andWhere('pi.agreement_id = :agreementId', { agreementId })
      .andWhere('pi.is_active = true')
      .getRawMany();

    const currentIds = currentRelations.map((r) => Number(r.indicatorId));
    const payloadIds: number[] = indicatorsPayload.map((ind) => Number(ind.id));

    // Asociar los que no existan aún
    for (const indicatorId of payloadIds) {
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
