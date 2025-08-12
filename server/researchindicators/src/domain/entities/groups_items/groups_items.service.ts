import {
  Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StructureDto } from './dto/group-item-action.dto';
import { ProjectIndicator } from '../project_indicators/entities/project_indicator.entity';

@Injectable()
export class GroupsItemsService {
  constructor(
    @InjectRepository(GroupItem)
    private readonly groupItemRepository: Repository<GroupItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    const parents = await this.groupItemRepository.find({
      where: { parentGroup: null, is_active: true },
      relations: [
        'childGroups',
        'childGroups.childGroups',
        'indicatorPerItem',
        'indicatorPerItem.projectIndicator',
        'childGroups.indicatorPerItem',
        'childGroups.indicatorPerItem.projectIndicator',
        'childGroups.childGroups.indicatorPerItem',
        'childGroups.childGroups.indicatorPerItem.projectIndicator',
      ],
      order: { id: 'ASC' },
    });

    const cleanGroup = (group: GroupItem) => {
      return {
        id: group.id.toString(),
        name: group.name,
        code: group.officialCode || group.id.toString(),
        items:
          group.childGroups
            ?.filter((child) => child.is_active)
            .map(cleanGroup) || [],
        indicators:
          group.indicatorPerItem
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
              targetValue: ipi.projectIndicator.target_value || 0,
              baseline: ipi.projectIndicator.base_line || 0,
              isActive: ipi.projectIndicator.is_active,
            })) || [],
      };
    };

    // Mapear la respuesta final con la estructura requerida
    const structures = parents.map((parent) => cleanGroup(parent));

    return {
      structures,
    };
  }

  async syncStructures(dto: StructureDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1) Traer padres activos (solo fila padre)
      const existingParents = await manager
        .createQueryBuilder(GroupItem, 'g')
        .where('g.parent_id IS NULL')
        .andWhere('g.is_active = true')
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
            parent.officialCode !== parentPayload.code
          ) {
            parent.name = parentPayload.name;
            parent.officialCode = parentPayload.code;
            await manager.save(parent);
          }
          await this.syncGroupItemIndicators(
            parent.id,
            parentPayload.indicators || [],
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
              parent.officialCode !== parentPayload.code ||
              parent.parentGroup !== null ||
              !(parent as any).isActive;

            if (needsUpdate) {
              parent.name = parentPayload.name;
              parent.officialCode = parentPayload.code;
              parent.parentGroup = null;
              (parent as any).isActive = true;
              await manager.save(parent);
            }

            await this.syncGroupItemIndicators(
              parent.id,
              parentPayload.indicators || [],
              manager,
            );
          } else {
            // crear nuevo padre si no existe
            const newParent = manager.create(GroupItem, {
              name: parentPayload.name,
              officialCode: parentPayload.code,
              parentGroup: null,
              is_active: true,
            });
            const savedParent = await manager.save(newParent);
            parent = savedParent;
            await this.syncGroupItemIndicators(
              savedParent.id,
              parentPayload.indicators || [],
              manager,
            );
          }
        } else {
          // payload sin id: verificar si ya existe un padre con el mismo nombre y código
          const existsParent = await manager.findOne(GroupItem, {
            where: {
              name: parentPayload.name,
              officialCode: parentPayload.code,
              parentGroup: null,
              is_active: true,
            },
          });

          if (existsParent) {
            parent = existsParent;
            await this.syncGroupItemIndicators(
              parent.id,
              parentPayload.indicators || [],
              manager,
            );
          } else {
            // crear padre nuevo solo si no existe
            const newParent = manager.create(GroupItem, {
              name: parentPayload.name,
              officialCode: parentPayload.code,
              parentGroup: null,
              is_active: true,
            });
            const savedParent = await manager.save(newParent);
            parent = savedParent;
            await this.syncGroupItemIndicators(
              savedParent.id,
              parentPayload.indicators || [],
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
                child.officialCode !== childPayload.code ||
                child.parentGroup?.id !== parent!.id ||
                !(child as any).isActive;

              if (needsUpdate) {
                child.name = childPayload.name;
                child.officialCode = childPayload.code;
                child.parentGroup = parent;
                (child as any).isActive = true;
                await manager.save(child);
              }
              await this.syncGroupItemIndicators(
                child.id,
                childPayload.indicators || [],
                manager,
              );
            } else {
              // si no existe, crearlo (caso raro)
              const newChild = manager.create(GroupItem, {
                name: childPayload.name,
                officialCode: childPayload.code,
                parentGroup: parent,
                isActive: true,
              });
              const saved = await manager.save(newChild);
              await this.syncGroupItemIndicators(
                saved.id,
                childPayload.indicators || [],
                manager,
              );
              createdChildIds.push(saved.id);
            }
          } else {
            // payload sin id -> verificar si ya existe un hijo con el mismo nombre y código para este padre
            const existingChild = await manager.findOne(GroupItem, {
              where: {
                name: childPayload.name,
                officialCode: childPayload.code,
                parentGroup: { id: parent.id },
                is_active: true,
              },
            });

            if (existingChild) {
              // Si ya existe, no crear duplicado
              await this.syncGroupItemIndicators(
                existingChild.id,
                childPayload.indicators || [],
                manager,
              );
            } else {
              // crear hijo nuevo solo si no existe
              const newChild = manager.create(GroupItem, {
                name: childPayload.name,
                officialCode: childPayload.code,
                parentGroup: parent,
                isActive: true,
              });
              const saved = await manager.save(newChild);
              await this.syncGroupItemIndicators(
                saved.id,
                childPayload.indicators || [],
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
          },
        );

        // Caso 2: Indicador nuevo o con ID temporal
      } else {
        // Buscar si ya existe un indicador con las mismas características para evitar duplicados
        const existingIndicator = await manager.findOne(ProjectIndicator, {
          where: {
            name: ind.name,
            description: ind.description,
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
              number_type: ind.numberType,
              number_format: ind.numberFormat,
              year: ind.years,
              target_unit: ind.targetUnit,
              target_value: ind.targetValue,
              base_line: ind.baseline,
              is_active: ind.isActive,
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
