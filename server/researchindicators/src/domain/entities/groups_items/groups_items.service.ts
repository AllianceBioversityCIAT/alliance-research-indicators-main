import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import {
  DataSource,
  EntityManager,
  getMetadataArgsStorage,
  IsNull,
  Repository,
} from 'typeorm';
import {
  ChildItemDto,
  ParentItemDto,
  StructureDto,
} from './dto/group-item-action.dto';
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

    const projectGroups = await this.dataSource
      .getRepository(ProjectGroup)
      .find({
        where: { agreement_id, is_active: true },
        select: [
          'id',
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

    const levels =
      projectGroups.length > 0
        ? projectGroups.map((pg) => {
            const custom_fields = this.mapCustomFields(pg) ?? [];
            return {
              id: pg.id ?? '',
              name: pg.name ?? '',
              level: pg.level ?? '',
              custom_fields,
            };
          })
        : [
            {
              name: '',
              level: '',
              custom_fields: [],
            },
          ];

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

      const isRoot = !g.parent_id;
      const definedCustomFields =
        levels.find((lvl) => lvl.level === (isRoot ? 1 : 2))?.custom_fields ??
        [];

      nodes.set(g.id, {
        id: g.id.toString(),
        name: g.name,
        code: g.code,
        items: [] as any[],
        indicators,
        custom_values: this.mapCustomValues(g, definedCustomFields),
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

    const sortRecursively = (list: any[]) => {
      list.sort((a, b) => Number(a.id) - Number(b.id));
      for (const it of list) if (it.items?.length) sortRecursively(it.items);
    };
    sortRecursively(roots);

    return {
      levels,
      structures: roots,
    };
  }

  private mapCustomFields(pg: ProjectGroup) {
    const result: { fieldID: number; field_name: string }[] = [];
    for (let i = 1; i <= 10; i++) {
      const value = pg[`custom_field_${i}`];
      if (value) {
        result.push({ fieldID: i, field_name: value });
      }
    }
    return result;
  }

  private mapCustomValues(
    g: any,
    definedFields: { fieldID: number; field_name: string }[],
  ) {
    const result: { field: number; field_value: string | null }[] = [];

    for (const def of definedFields) {
      let value = g[`custom_field_${def.fieldID}`];
      if (value === null || value === undefined || value === '') {
        value = null;
      }
      result.push({ field: def.fieldID, field_value: value });
    }

    return result;
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
    const hasBasicChanges = this.updateBasicFields(parent, parentPayload);
    const hasCustomFieldChanges = this.updateCustomFields(
      parent,
      parentPayload,
    );

    const hasChanges = hasBasicChanges || hasCustomFieldChanges;

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
    const customFields: Partial<GroupItem> = {};

    // Si el DTO trae custom_values, los mapeamos
    if (parentPayload.custom_values?.length) {
      parentPayload.custom_values.forEach((cv) => {
        const fieldKey = `custom_field_${cv.field}` as keyof GroupItem;
        if (fieldKey in customFields || fieldKey.startsWith('custom_field_')) {
          (customFields as any)[fieldKey] = cv.field_value;
        }
      });
    }

    const newParent = manager.create(GroupItem, {
      name: parentPayload.name,
      code: parentPayload.code,
      agreement_id: agreementId,
      parentGroup: null,
      ...customFields,
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
    const hasBasicChanges = this.updateBasicFields(child, childPayload);
    const hasCustomFieldChanges = await this.updateCustomFields(
      child,
      childPayload,
    );

    const hasChanges = hasBasicChanges || hasCustomFieldChanges;

    if (hasChanges) {
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

  private async updateBasicFields(
    item: GroupItem,
    payload: ParentItemDto | ChildItemDto,
  ): Promise<boolean> {
    let hasChanges = false;

    if (item.name !== payload.name) {
      item.name = payload.name;
      hasChanges = true;
    }

    if (item.code !== payload.code) {
      item.code = payload.code;
      hasChanges = true;
    }

    return hasChanges;
  }

  private async updateCustomFields(
    item: GroupItem,
    payload: ParentItemDto | ChildItemDto,
  ): Promise<boolean> {
    const customFieldColumns = await this.getCustomFieldColumns();
    let updated = false;

    for (const columnName of customFieldColumns) {
      const field = Number(columnName.replace('custom_field_', ''));
      const customValue = payload.custom_values?.find(
        (cv) => cv.field === field,
      );
      const normalizedValue = this.normalizeCustomFieldValue(
        customValue?.field_value,
      );

      if ((item as any)[columnName] !== normalizedValue) {
        (item as any)[columnName] = normalizedValue;
        updated = true;
      }
    }

    return updated;
  }

  private async getCustomFieldColumns(): Promise<string[]> {
    return getMetadataArgsStorage()
      .columns.filter(
        (col) =>
          col.target === GroupItem &&
          col.propertyName.startsWith('custom_field_'),
      )
      .map((col) => col.propertyName);
  }

  private normalizeCustomFieldValue(fieldValue?: string): string | null {
    return fieldValue?.trim() === '' ? null : (fieldValue ?? null);
  }

  private async createNewChild(
    childPayload: ChildItemDto,
    parent: number,
    agreementId: string,
    manager: EntityManager,
  ): Promise<GroupItem> {
    const customFields: Partial<GroupItem> = {};

    // Si el DTO trae custom_values, los mapeamos
    if (childPayload.custom_values?.length) {
      childPayload.custom_values.forEach((cv) => {
        const fieldKey = `custom_field_${cv.field}` as keyof GroupItem;
        if (fieldKey in customFields || fieldKey.startsWith('custom_field_')) {
          (customFields as any)[fieldKey] = cv.field_value;
        }
      });
    }

    const newChild = manager.create(GroupItem, {
      name: childPayload.name,
      code: childPayload.code,
      agreement_id: agreementId,
      parent_id: parent,
      ...customFields,
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

  private async processLevels(dto: StructureDto, manager: EntityManager) {
    const { agreement_id, levels } = dto;

    for (const levelData of levels) {
      const { name, level, custom_fields = [] } = levelData;

      // Buscar registro existente por acuerdo y nivel
      let record = await manager.findOne(ProjectGroup, {
        where: { agreement_id, level },
      });

      if (!record) {
        // Crear si no existe
        record = manager.create(ProjectGroup, {
          agreement_id,
          level,
          name,
        });
      } else {
        // Actualizar el nombre si cambió
        if (record.name !== name) {
          record.name = name;
        }
      }

      // IDs de los custom_fields actuales
      const currentFieldIDs = custom_fields
        .filter((f) => f.fieldID !== null)
        .map((f) => f.fieldID);

      // Mapear todos los posibles custom_field (1..10)
      const fieldMap: Record<string, string | null> = {};
      for (let j = 1; j <= 10; j++) {
        const fieldObj = custom_fields.find((f) => f.fieldID === j);
        fieldMap[`custom_field_${j}`] = fieldObj ? fieldObj.field_name : null;

        if (!currentFieldIDs.includes(j)) {
          const columnName = `custom_field_${j}`;
          await manager
            .createQueryBuilder()
            .update(GroupItem)
            .set({ [columnName]: null })
            .where('agreement_id = :agreement_id', { agreement_id })
            .andWhere(
              level === 1 ? 'parent_id IS NULL' : 'parent_id IS NOT NULL',
            )
            .execute();
        }
      }

      // Asignar dinámicamente los valores a la entidad
      Object.assign(record, fieldMap);

      // Guardar (insert/update)
      await manager.save(ProjectGroup, record);
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
      .where('ipi.group_item_id = :groupItemId', { groupItemId })
      .getRawMany();

    const currentIds = currentRelations.map((r) => Number(r.indicatorId));
    const payloadIds: number[] = indicatorsPayload.map((ind) => Number(ind.id));

    // Asociar los que no existan aún
    for (const indicatorId of payloadIds) {
      const exists = await manager
        .createQueryBuilder()
        .select('1')
        .from('indicator_per_item', 'ipi')
        .where('ipi.group_item_id = :groupItemId', { groupItemId })
        .andWhere('ipi.project_indicator_id = :indicatorId', { indicatorId })
        .getRawOne();

      if (!exists) {
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
