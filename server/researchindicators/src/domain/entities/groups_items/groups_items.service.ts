import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { DataSource, Repository } from 'typeorm';
import { StructureDto } from './dto/group-item-action.dto';

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
      relations: ['childGroups', 'childGroups.childGroups'],
      order: { id: 'ASC' }
    });

    const cleanGroup = (group: GroupItem) => {
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        officialCode: group.officialCode,
        projectId: group.projectId,
        isActive: group.is_active,
        children: group.childGroups
          ?.filter(child => child.is_active)
          .map(cleanGroup) || [],
      };
  };

  return parents.map(cleanGroup);
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
        existingParents.map(p => [p.id, p])
      );

      // 2) Procesar cada padre del payload
      for (const parentPayload of dto.structures || []) {
        const payloadParentId = parentPayload.id != null ? Number(parentPayload.id) : null;
        let parent: GroupItem | null = null;

        // buscar padre por id en la DB (priorizar el mapa para rendimiento)
        if (payloadParentId && existingParentsMap.has(payloadParentId)) {
          parent = existingParentsMap.get(payloadParentId)!;
          // actualizar si cambió
          if (parent.name !== parentPayload.name || parent.officialCode !== parentPayload.code) {
            parent.name = parentPayload.name;
            parent.officialCode = parentPayload.code;
            await manager.save(parent);
          }
        } else if (payloadParentId) {
          // puede existir pero inactivo o en otra condición: buscar directamente
          parent = await manager.findOne(GroupItem, { where: { id: payloadParentId } });
          if (parent) {
            parent.name = parentPayload.name;
            parent.officialCode = parentPayload.code;
            // asegurarse que sea padre (sin parent) y activo
            parent.parentGroup = null;
            // usa la propiedad de tu entidad (isActive) o adapta si tu entidad usa is_active
            (parent as any).isActive = true;
            await manager.save(parent);
          } else {
            // crear nuevo padre si no existe
            parent = manager.create(GroupItem, {
              name: parentPayload.name,
              officialCode: parentPayload.code,
              parentGroup: null,
              isActive: true,
            });
            parent = await manager.save(parent);
          }
        } else {
          // payload sin id: crear padre nuevo
          parent = manager.create(GroupItem, {
            name: parentPayload.name,
            officialCode: parentPayload.code,
            parentGroup: null,
            isActive: true,
          });
          parent = await manager.save(parent);
        }

        // 3) Procesar hijos para ESTE padre
        const createdChildIds: number[] = [];
        const payloadChildIdsFromPayload: number[] = [];

        for (const childPayload of parentPayload.items || []) {
          if (childPayload.id != null) {
            const childId = Number(childPayload.id);
            payloadChildIdsFromPayload.push(childId);

            // Buscar hijo en DB (si no estaba cargado en memoria)
            let child = await manager.findOne(GroupItem, { where: { id: childId } });

            if (child) {
              // actualizar datos y asegurar relación con este padre y activo
              child.name = childPayload.name;
              child.officialCode = childPayload.code;
              child.parentGroup = parent;
              (child as any).isActive = true;
              await manager.save(child);
            } else {
              // si no existe, crearlo (caso raro)
              const newChild = manager.create(GroupItem, {
                name: childPayload.name,
                officialCode: childPayload.code,
                parentGroup: parent,
                isActive: true,
              });
              const saved = await manager.save(newChild);
              createdChildIds.push(saved.id);
            }
          } else {
            // payload sin id -> crear hijo nuevo
            const newChild = manager.create(GroupItem, {
              name: childPayload.name,
              officialCode: childPayload.code,
              parentGroup: parent,
              isActive: true,
            });
            const saved = await manager.save(newChild);
            createdChildIds.push(saved.id);
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
            await manager.update(GroupItem, { id: dbChild.id }, { is_active: false });
          }
        }
      }

      // 6) Desactivar padres que ya no vienen en el payload (solo comparar ids presentes)
      const payloadParentIdsSet = new Set<number>(
        (dto.structures || [])
          .filter(s => s.id != null)
          .map(s => Number(s.id))
      );

      for (const dbParent of existingParents) {
        if (!payloadParentIdsSet.has(dbParent.id)) {
          await manager.update(GroupItem, { id: dbParent.id }, { is_active: false });
        }
      }

      return { message: 'Sincronización completada' };
    });
    }
}
