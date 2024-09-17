import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SessionTypesService } from './session-types.service';
import { CreateSessionTypeDto } from './dto/create-session-type.dto';
import { UpdateSessionTypeDto } from './dto/update-session-type.dto';

@Controller('session-types')
export class SessionTypesController {
  constructor(private readonly sessionTypesService: SessionTypesService) {}

  @Post()
  create(@Body() createSessionTypeDto: CreateSessionTypeDto) {
    return this.sessionTypesService.create(createSessionTypeDto);
  }

  @Get()
  findAll() {
    return this.sessionTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionTypeDto: UpdateSessionTypeDto) {
    return this.sessionTypesService.update(+id, updateSessionTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionTypesService.remove(+id);
  }
}
