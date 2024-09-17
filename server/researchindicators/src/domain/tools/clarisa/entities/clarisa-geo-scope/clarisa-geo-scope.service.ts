import { Injectable } from '@nestjs/common';
import { CreateClarisaGeoScopeDto } from './dto/create-clarisa-geo-scope.dto';
import { UpdateClarisaGeoScopeDto } from './dto/update-clarisa-geo-scope.dto';

@Injectable()
export class ClarisaGeoScopeService {
  create(createClarisaGeoScopeDto: CreateClarisaGeoScopeDto) {
    return 'This action adds a new clarisaGeoScope';
  }

  findAll() {
    return `This action returns all clarisaGeoScope`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaGeoScope`;
  }

  update(id: number, updateClarisaGeoScopeDto: UpdateClarisaGeoScopeDto) {
    return `This action updates a #${id} clarisaGeoScope`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaGeoScope`;
  }
}
