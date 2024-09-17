import { Injectable } from '@nestjs/common';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';
import { UpdateResultEvidenceDto } from './dto/update-result-evidence.dto';

@Injectable()
export class ResultEvidencesService {
  create(createResultEvidenceDto: CreateResultEvidenceDto) {
    return 'This action adds a new resultEvidence';
  }

  findAll() {
    return `This action returns all resultEvidences`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultEvidence`;
  }

  update(id: number, updateResultEvidenceDto: UpdateResultEvidenceDto) {
    return `This action updates a #${id} resultEvidence`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultEvidence`;
  }
}
