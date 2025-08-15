import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ChildItemDto, ParentItemDto, StructureDto } from './dto/group-item-action.dto';
import { ProjectIndicator } from '../project_indicators/entities/project_indicator.entity';

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
      .leftJoinAndSelect('indicatorPerItem.projectIndicator', 'projectIndicator')
      .where('gi.is_active = :active', { active: true })
      .andWhere('gi.agreement_id = :agreementId', { agreementId: agreement_id })
      .orderBy('gi.id', 'ASC')
      .getMany();

    const nodes = new Map<number, any>();

    for (const g of groups) {
      const indicators =
        g.indicatorPerItem
          ?.filter(
            (ipi) => ipi.projectIndicator && ipi.projectIndicator.is_active,
          )
          .map((ipi) => ({
            id: ipi.projectIndicator.id.toString(),
            name: ipi.projectIndicator.name,
            description: ipi.projectIndicator.description || '',
            numberType: ipi.projectIndicator.number_type,
            numberFormat: ipi.projectIndicator.number_format || 'decimal',
            years: ipi.projectIndicator.year || [],
            targetUnit: ipi.projectIndicator.target_unit || '',
            targetValue: Number(ipi.projectIndicator.target_value) || 0,
            baseline: Number(ipi.projectIndicator.base_line) || 0,
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
      const node = nodes.get(g.id);
      const parentId = g.parent_id;

      if (parentId) {
        const parentNode = nodes.get(parentId);
        if (parentNode) {
          parentNode.items.push(node);
        } else {
          // Si el padre no está presente (por algún motivo), puedes:
          // - ignorar el nodo, o
          // - tratarlo como raíz. Aquí lo ignoramos para no duplicar.
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

    return { structures: roots };
  }
  
  private async getExistingParentsMap(agreementId: string, manager: EntityManager): Promise<Map<number, GroupItem>> {
    console.log('🍕 PARENT: Creando Map de padres de la BD')
    const existingParentsDB = await manager.find(GroupItem, {
      where: { agreement_id: agreementId, parent_id: null, is_active: true },
    });

    return new Map<number, GroupItem>(
      existingParentsDB.map((p) => [p.id, p])
    );
  }

  private async processParent(
    parentPayload: ParentItemDto,
    agreementId: string,
    existingParentsMap: Map<number, GroupItem>,
    manager: EntityManager
  ): Promise<GroupItem | null> {
    console.log('🍕 PARENT: Procesando los padres del payload')
    const payloadParentId = parentPayload.id != null ? parentPayload.id : null;

    if (payloadParentId && existingParentsMap.has(payloadParentId)) {
      return this.updateExistingParent(parentPayload, existingParentsMap.get(payloadParentId)!, agreementId, manager);
    } else {
      return this.createNewParent(parentPayload, agreementId, manager);
    }     

  }

  private async updateExistingParent(
    parentPayload: ParentItemDto,
    parent: GroupItem,
    agreementId: string,
    manager: EntityManager
  ): Promise<GroupItem> {
    console.log('🍕 PARENT: Actualizando padres con cambios')
    if (parent.name !== parentPayload.name || parent.code !== parentPayload.code) {
      parent.name = parentPayload.name;
      parent.code = parentPayload.code;
      await manager.save(parent);
    }
    
    await this.syncGroupItemIndicators(
      parent.id,
      parentPayload.indicators || [],
      agreementId,
      manager
    );
    
    return parent;
  }

  private async createNewParent(
    parentPayload: ParentItemDto,
    agreementId: string,
    manager: EntityManager
  ): Promise<GroupItem> {
    console.log('🍕 PARENT: Creando nuevo padre')
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
      manager
    );
    
    return savedParent;
  }

  private async deactivateUnprocessedParents(
    existingParentsMap: Map<number, GroupItem>,
    processedParentIds: Set<number>,
    manager: any
  ): Promise<void> {
    console.log('🍕 PARENT: Eliminando padres que no vienen en el payload')
    const existingParents = Array.from(existingParentsMap.values());
    
    for (const dbParent of existingParents) {
      if (!processedParentIds.has(dbParent.id)) {
        await manager.update(
          GroupItem,
          { id: dbParent.id },
          { is_active: false }
        );
      }
    }
  }

  private async getExistingChildrenMap(parent: GroupItem, agreementId: string, manager: EntityManager): Promise<Map<number, GroupItem>> {
    console.log('🍔 CHILD: Generando Map de hijos de la BD')
    const existingChildrenDB = await manager.find(GroupItem, {
      where: { agreement_id: agreementId, parent_id: parent.id, is_active: true },
    });

    return new Map<number, GroupItem>(
      existingChildrenDB.map((p) => [p.id, p])
    );
  }

  private async processChild(
    parentId: number,
    childrenPayload: ChildItemDto,
    agreementId: string,
    existingChildsMap: Map<number, GroupItem>,
    manager: EntityManager
  ): Promise<GroupItem | null> {
    console.log('🍔 CHILD: Procesando hijos del payload')
    const payloadChildId = childrenPayload.id != null ? childrenPayload.id : null;

    if (payloadChildId && existingChildsMap.has(payloadChildId)) {
      return this.updateExistingChild(childrenPayload, existingChildsMap.get(payloadChildId)!, agreementId,manager);
    } else {
      return this.createNewChild(childrenPayload, parentId, agreementId, manager);
    }
  }

  private async updateExistingChild(
    childPayload: ChildItemDto,
    child: GroupItem,
    agreementId: string,
    manager: EntityManager
  ): Promise<GroupItem> {
    console.log('🍔 CHILD: Actualizando hijos con cambios')
    if (child.name !== childPayload.name || child.code !== childPayload.code) {
      child.name = childPayload.name;
      child.code = childPayload.code;
      await manager.save(child);
    }
    
    await this.syncGroupItemIndicators(
      child.id,
      childPayload.indicators || [],
      agreementId,
      manager
    );

    return child;
  }

  private async createNewChild(
    childPayload: ChildItemDto,
    parent: number,
    agreementId: string,
    manager: EntityManager
  ): Promise<GroupItem> {
    console.log('🍔 CHILD: Creando nuevo hijo')
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
      manager
    );

    return savedChild;
  }

  private async deactivateUnprocessedChildren(
    existingChildsMap: Map<number, GroupItem>,
    processedChildrensIds: Set<number>,
    manager: any
  ): Promise<void> {
    console.log('🍔 CHILD: Eliminando hijos que no vienen en el payload')
    const existingChildren = Array.from(existingChildsMap.values());

    for (const dbChild of existingChildren) {
      if (!processedChildrensIds.has(dbChild.id)) {
        await manager.update(
          GroupItem,
          { id: dbChild.id },
          { is_active: false }
        );
      }
    }
  }

  async syncStructures2(dto: StructureDto) {
    console.log('🚀 Syncing structures 2...');
    return this.dataSource.transaction(async (manager) => {
      // Traer padres existentes de la BD del proyecto actual
      const existingParentsMap = await this.getExistingParentsMap(dto.agreement_id, manager);
      const processedParentIds  = new Set<number>();

      //Procesa cada padre en el payload
      for (const parentPayload of dto.structures || []) {
        const parent = await this.processParent(
          parentPayload,
          dto.agreement_id,
          existingParentsMap,
          manager
        );

        //Procesa cada hijo de cada padre
        if (parent) {
          processedParentIds.add(parent.id);

          const existingChildsMap = await this.getExistingChildrenMap(parent, dto.agreement_id, manager);
          const processedChildrensIds  = new Set<number>();

          for (const childPayload of parentPayload.items || []) {
            const child = await this.processChild(
              parent.id,
              childPayload,
              dto.agreement_id,
              existingChildsMap,
              manager
            );

            if (child) {
              processedChildrensIds.add(child.id);
            }
          }
          // Elimina hijos que no vinieron en el payload
          await this.deactivateUnprocessedChildren(existingChildsMap, processedChildrensIds, manager);
        }
      }
      //Elimina padres que no vinieron en el payload
      await this.deactivateUnprocessedParents(existingParentsMap, processedParentIds, manager);
      return { message: 'Sincronización de padres completada' };
      });
  }
  

  async syncStructures(dto: StructureDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1) Traer padres activos (solo fila padre)
      const existingParents = await manager
        .createQueryBuilder(GroupItem, 'g')
        .where('g.parent_id IS NULL')
        .andWhere('g.is_active = true')
        .andWhere('g.agreement_id = :agreementId', { agreementId: dto.agreement_id })
        .getMany();

      const existingParentsMap = new Map<number, GroupItem>(
        existingParents.map((p) => [p.id, p]),
      );

      const processedParentIds = new Set<number>();

      // 2) Procesar cada padre del payload
      for (const parentPayload of dto.structures || []) {
        const payloadParentId =
          parentPayload.id != null ? Number(parentPayload.id) : null;
        let parent: GroupItem | null = null;

        // buscar padre por id en la DB (priorizar el mapa para rendimiento)
        if (payloadParentId && existingParentsMap.has(payloadParentId)) {
          parent = existingParentsMap.get(payloadParentId)!;
          // actualizar si cambió
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
            dto.agreement_id,
            manager,
          );
        } else if (payloadParentId) {
          // puede existir pero inactivo o en otra condición: buscar directamente
          parent = await manager.findOne(GroupItem, {
            where: { id: payloadParentId },
          });
          if (parent) {
            const needsUpdate =
              parent.name !== parentPayload.name ||
              parent.code !== parentPayload.code ||
              parent.parentGroup !== null ||
              !(parent as any).isActive;

            if (needsUpdate) {
              parent.name = parentPayload.name;
              parent.code = parentPayload.code;
              parent.parentGroup = null;
              (parent as any).isActive = true;
              await manager.save(parent);
            }

            await this.syncGroupItemIndicators(
              parent.id,
              parentPayload.indicators || [],
              dto.agreement_id,
              manager,
            );
          } else {
            // crear nuevo padre si no existe
            const newParent = manager.create(GroupItem, {
              name: parentPayload.name,
              code: parentPayload.code,
              agreement_id: dto.agreement_id,
              parentGroup: null,
              is_active: true,
            });
            const savedParent = await manager.save(newParent);
            parent = savedParent;
            processedParentIds.add(savedParent.id);
            await this.syncGroupItemIndicators(
              savedParent.id,
              parentPayload.indicators || [],
              dto.agreement_id,
              manager,
            );
          }
        } else {
          // payload sin id: verificar si ya existe un padre con el mismo nombre y código
          const existsParent = await manager.findOne(GroupItem, {
            where: {
              name: parentPayload.name,
              code: parentPayload.code,
              parentGroup: null,
              is_active: true,
            },
          });

          if (existsParent) {
            parent = existsParent;
            await this.syncGroupItemIndicators(
              parent.id,
              parentPayload.indicators || [],
              dto.agreement_id,
              manager,
            );
          } else {
            // crear padre nuevo solo si no existe
            const newParent = manager.create(GroupItem, {
              name: parentPayload.name,
              code: parentPayload.code,
              agreement_id: dto.agreement_id,
              parentGroup: null,
            });
            const savedParent = await manager.save(newParent);
            parent = savedParent;
            processedParentIds.add(savedParent.id);
            await this.syncGroupItemIndicators(
              savedParent.id,
              parentPayload.indicators || [],
              dto.agreement_id,
              manager,
            );
          }
        }

        // Registrar este padre como procesado
        if (parent) {
          processedParentIds.add(parent.id);
        }

        // 3) Procesar hijos para ESTE padre
        const createdChildIds: number[] = [];
        const payloadChildIdsFromPayload: number[] = [];

        for (const childPayload of parentPayload.items || []) {
          if (childPayload.id != null) {
            const childId = Number(childPayload.id);
            payloadChildIdsFromPayload.push(childId);

            // Buscar hijo en DB (si no estaba cargado en memoria)
            const child = await manager.findOne(GroupItem, {
              where: { id: childId },
            });

            if (child) {
              // actualizar solo si cambió algo
              const needsUpdate =
                child.name !== childPayload.name ||
                child.code !== childPayload.code ||
                child.parentGroup?.id !== parent!.id ||
                !(child as any).isActive;

              if (needsUpdate) {
                child.name = childPayload.name;
                child.code = childPayload.code;
                child.parentGroup = parent;
                (child as any).isActive = true;
                await manager.save(child);
              }
              await this.syncGroupItemIndicators(
                child.id,
                childPayload.indicators || [],
                dto.agreement_id,
                manager,
              );
            } else {
              // si no existe, crearlo (caso raro)
              const newChild = manager.create(GroupItem, {
                name: childPayload.name,
                code: childPayload.code,
                agreement_id: dto.agreement_id,
                parentGroup: parent,
                isActive: true,
              });
              const saved = await manager.save(newChild);
              await this.syncGroupItemIndicators(
                saved.id,
                childPayload.indicators || [],
                dto.agreement_id,
                manager,
              );
              createdChildIds.push(saved.id);
            }
          } else {
            // payload sin id -> verificar si ya existe un hijo con el mismo nombre y código para este padre
            const existingChild = await manager.findOne(GroupItem, {
              where: {
                name: childPayload.name,
                code: childPayload.code,
                parentGroup: { id: parent.id },
                is_active: true,
              },
            });

            if (existingChild) {
              // Si ya existe, no crear duplicado
              await this.syncGroupItemIndicators(
                existingChild.id,
                childPayload.indicators || [],
                dto.agreement_id,
                manager,
              );
            } else {
              // crear hijo nuevo solo si no existe
              const newChild = manager.create(GroupItem, {
                name: childPayload.name,
                code: childPayload.code,
                agreement_id: dto.agreement_id,
                parentGroup: parent,
                isActive: true,
              });
              const saved = await manager.save(newChild);
              await this.syncGroupItemIndicators(
                saved.id,
                childPayload.indicators || [],
                dto.agreement_id,
                manager,
              );
              createdChildIds.push(saved.id);
            }
          }
        }

        // 4) Evitar borrar hijos recién creados: construir el conjunto de ids válidos
        const validChildIdsSet = new Set<number>([
          ...payloadChildIdsFromPayload,
          ...createdChildIds,
        ]);

        // 5) Tomar el estado actual en DB de los hijos activos de este padre y desactivar los que NO vienen en payload
        const childrenInDb = await manager
          .createQueryBuilder(GroupItem, 'c')
          .where('c.parent_id = :parentId', { parentId: parent.id })
          .andWhere('c.is_active = true')
          .getMany();

        for (const dbChild of childrenInDb) {
          if (!validChildIdsSet.has(dbChild.id)) {
            await manager.update(
              GroupItem,
              { id: dbChild.id },
              { is_active: false },
            );
          }
        }
      }

      // 6) Desactivar padres que ya no vienen en el payload
      // CORRECCIÓN: Usar todos los padres procesados, no solo los que tienen ID
      for (const dbParent of existingParents) {
        if (!processedParentIds.has(dbParent.id)) {
          await manager.update(
            GroupItem,
            { id: dbParent.id },
            { is_active: false },
          );
        }
      }

      return { message: 'Sincronización completada' };
    });
  }

  private async syncGroupItemIndicators(
    groupItemId: number,
    indicatorsPayload: any[] = [],
    agreementId: string,
    manager: EntityManager,
  ) {
    console.log('🔗 Syncing indicators for groupItemId:', groupItemId);
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
              base_line: ind.baseline,
              agreement_id: agreementId
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
            base_line: ind.baseline,
            is_active: ind.isActive,
          });
          const saved = await manager.save(newIndicator);
          indicatorId = saved.id;
        }
      }
      console.log('groupItemId:', groupItemId, 'indicatorId:', indicatorId);
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
