import { BadRequestException, Injectable, InternalServerErrorException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from '../groups_items/entities/groups_item.entity';
import { QueryRunner, Repository } from 'typeorm';
import { ProjectGroup } from './entities/project_group.entity';
import { StructureDto } from './dto/structure.dto';

@Injectable()
export class ProjectGroupsService {
  constructor(
    @InjectRepository(GroupItem)
    private readonly itemRepository: Repository<GroupItem>,
    @InjectRepository(ProjectGroup)
    private readonly groupRepository: Repository<ProjectGroup>,
  ) {}

  /*
    FIND ALL
  */
  async findAll(): Promise<ProjectGroup[]> {
    try {
        const rawData = await this.groupRepository
          .createQueryBuilder('pg')
          .leftJoin('pg.childGroups', 'subpg')
          .leftJoin('pg.groupItems', 'gi')       // Items del padre
          .leftJoin('subpg.groupItems', 'sgi')   // Items del subgrupo
          .select([
            'pg.id AS group_id',
            'pg.name AS group_name',
            'pg.parent_group_id AS group_parent_id',

            'gi.id AS parent_item_id',
            'gi.name AS parent_item_name',
            'gi.description AS parent_item_description',

            'subpg.id AS subgroup_id',
            'subpg.name AS subgroup_name',

            'sgi.id AS child_item_id',
            'sgi.name AS child_item_name',
            'sgi.description AS child_item_description',
          ])
          .orderBy('pg.id', 'ASC')
          .addOrderBy('subpg.id', 'ASC')
          .addOrderBy('gi.id', 'ASC')
          .addOrderBy('sgi.id', 'ASC')
          .getRawMany();

        return this.mapGroups(rawData);

    } catch (error) {
      console.error('❌ Error al obtener la jerarquía de grupos:', error);

      throw new InternalServerErrorException(
        'Ocurrió un error al obtener la jerarquía de grupos. Intenta nuevamente más tarde.'
      );
    }
  }

  private mapGroups(rawData: any[]) {
    return rawData.reduce((acc, row) => {
      // Solo procesamos como padre si no tiene parent_id
      if (row.group_parent_id) {
        return acc; // ya será procesado como subgrupo en otro registro
      }

      // Buscar o crear el grupo padre
      let parent = acc.find(g => g.id === row.group_id);
      if (!parent) {
        parent = {
          id: row.group_id,
          name: row.group_name,
          items: [],
          subgroups: []
        };
        acc.push(parent);
      }

      // Items del padre
      if (row.parent_item_id && !parent.items.some(i => i.id === row.parent_item_id)) {
        parent.items.push({
          id: row.parent_item_id,
          name: row.parent_item_name,
          description: row.parent_item_description
        });
      }

      // Subgrupo
      if (row.subgroup_id) {
        let child = parent.subgroups.find(sg => sg.id === row.subgroup_id);
        if (!child) {
          child = {
            id: row.subgroup_id,
            name: row.subgroup_name,
            items: []
          };
          parent.subgroups.push(child);
        }

        // Items del subgrupo
        if (row.child_item_id && !child.items.some(i => i.id === row.child_item_id)) {
          child.items.push({
            id: row.child_item_id,
            name: row.child_item_name,
            description: row.child_item_description
          });
        }
      }

      return acc;
    }, []);
  }


  /**
   * Handle structure changes (create, update, delete)
   * @param dto
   */
  /* async handleStructure(dto: StructureDto) {
    const queryRunner = this.groupRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      switch (dto.action) {
        case 'create':
          await this.createStructure(dto, queryRunner);
          break;
        case 'update':
          await this.updateStructure(dto, queryRunner);
          break;
        case 'delete':
          await this.deleteStructure(dto, queryRunner);
          break;
      }

      await queryRunner.commitTransaction();
      return { message: `Action ${dto.action} completed successfully.` };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(error.message);
    } finally {
      await queryRunner.release();
    }
  } */

/*   private async createStructure(dto: StructureDto, qr: QueryRunner) {
    // 1. Crear grupo nivel 1
    const groupLevel1 = qr.manager.create(ProjectGroup, {
      name: dto.groupName,
      parentGroup: null
    });
    await qr.manager.save(groupLevel1);

    // 2. Crear items nivel 1
    if (dto.items?.length) {
      const items = dto.items.map(item =>
        qr.manager.create(GroupItem, { ...item, group: groupLevel1 })
      );
      await qr.manager.save(items);
    }

    // 3. Crear subgrupos y sus items
    if (dto.subGroups?.length) {
      for (const sub of dto.subGroups) {
        const subGroup = qr.manager.create(ProjectGroup, {
          name: sub.groupName,
          parentGroup: groupLevel1
        });
        await qr.manager.save(subGroup);

        if (sub.items?.length) {
          const subItems = sub.items.map(item =>
            qr.manager.create(GroupItem, { ...item, group: subGroup })
          );
          await qr.manager.save(subItems);
        }
      }
    }
  }

  private async updateStructure(dto: StructureDto, qr: QueryRunner) {
    // 1. Buscar grupo principal
    const group = await qr.manager.findOne(ProjectGroup, {
      where: { id: dto.groupId },
      relations: ['childGroups', 'childGroups.childGroups']
    });
    if (!group) throw new BadRequestException('Grupo no encontrado');

    // 2. Actualizar nombre del grupo principal
    group.name = dto.groupName ?? group.name;
    await qr.manager.save(group);

    // 3. Sincronizar items de nivel actual
    const existingItems = await qr.manager.find(GroupItem, { where: { group: { id: dto.groupId } } });
    const incomingItems = dto.items ?? [];

    // 3.1 Actualizar o crear
    for (const item of incomingItems) {
      if (item.id) {
        await qr.manager.update(GroupItem, item.id, item);
      } else {
        await qr.manager.save(qr.manager.create(GroupItem, { ...item, group }));
      }
    }

    // 3.2 Eliminar los que ya no están
    const incomingIds = incomingItems.filter(i => i.id).map(i => i.id);
    const toDelete = existingItems.filter(e => !incomingIds.includes(e.id));
    if (toDelete.length) {
      await qr.manager.delete(GroupItem, toDelete.map(e => e.id));
    }

    // 4. Sincronizar subgrupos
    const existingSubGroups = await qr.manager.find(ProjectGroup, {
      where: { parentGroup: { id: dto.groupId } },
      relations: ['childGroups']
    });
    const incomingSubGroups = dto.subGroups ?? [];

    for (const sub of incomingSubGroups) {
      let subGroupEntity: ProjectGroup;

      if (sub['id']) {
        // Actualizar subgrupo existente
        await qr.manager.update(ProjectGroup, sub['id'], { name: sub.groupName });
        subGroupEntity = await qr.manager.findOne(ProjectGroup, { where: { id: sub['id'] } });
      } else {
        // Crear nuevo subgrupo
        subGroupEntity = qr.manager.create(ProjectGroup, {
          name: sub.groupName,
          parentGroup: group
        });
        await qr.manager.save(subGroupEntity);
      }

      // Sincronizar ítems de cada subgrupo
      const existingSubItems = await qr.manager.find(GroupItem, { where: { group: { id: subGroupEntity.id } } });
      const incomingSubItems = sub.items ?? [];

      // Crear/actualizar
      for (const subItem of incomingSubItems) {
        if (subItem.id) {
          await qr.manager.update(GroupItem, subItem.id, subItem);
        } else {
          await qr.manager.save(qr.manager.create(GroupItem, { ...subItem, group: subGroupEntity }));
        }
      }

      // Eliminar los que ya no están
      const incomingSubItemIds = incomingSubItems.filter(i => i.id).map(i => i.id);
      const subItemsToDelete = existingSubItems.filter(e => !incomingSubItemIds.includes(e.id));
      if (subItemsToDelete.length) {
        await qr.manager.delete(GroupItem, subItemsToDelete.map(e => e.id));
      }
    }

    // 5. Eliminar subgrupos que ya no vienen en el request
    const incomingSubGroupIds = incomingSubGroups.filter(sg => sg['id']).map(sg => sg['id']);
    const subGroupsToDelete = existingSubGroups.filter(sg => !incomingSubGroupIds.includes(sg.id));
    if (subGroupsToDelete.length) {
      await qr.manager.delete(ProjectGroup, subGroupsToDelete.map(sg => sg.id));
    }
  }

  private async deleteStructure(dto: StructureDto, qr: QueryRunner) {
    if (dto.groupId) {
      const group = await qr.manager.findOne(ProjectGroup, {
        where: { id: dto.groupId },
        relations: ['childGroups']
      });

      if (!group) {
        throw new BadRequestException('Grupo no encontrado');
      }

      // 1️⃣ Eliminar en cascada manualmente si no hay ON DELETE CASCADE
      // Eliminar items del grupo principal
      await qr.manager.delete(GroupItem, { group: { id: dto.groupId } });

      // Si es nivel 1, eliminar también subgrupos y sus ítems
      if (!group.parentGroup) {
        for (const subGroup of group.childGroups) {
          await qr.manager.delete(GroupItem, { group: { id: subGroup.id } });
          await qr.manager.delete(ProjectGroup, subGroup.id);
        }
      }

      // 2️⃣ Eliminar el grupo principal
      await qr.manager.delete(ProjectGroup, dto.groupId);
      return;
    }

    // 3️⃣ Si solo son ítems los que se eliminan
    if (dto.items?.length) {
      const ids = dto.items.map(i => i.id);
      await qr.manager.delete(GroupItem, ids);
    }
  } */
}
