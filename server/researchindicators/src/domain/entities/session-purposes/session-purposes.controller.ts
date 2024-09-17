import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SessionPurposesService } from './session-purposes.service';
import { CreateSessionPurposeDto } from './dto/create-session-purpose.dto';
import { UpdateSessionPurposeDto } from './dto/update-session-purpose.dto';

@Controller('session-purposes')
export class SessionPurposesController {
  constructor(private readonly sessionPurposesService: SessionPurposesService) {}

  @Post()
  create(@Body() createSessionPurposeDto: CreateSessionPurposeDto) {
    return this.sessionPurposesService.create(createSessionPurposeDto);
  }

  @Get()
  findAll() {
    return this.sessionPurposesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionPurposesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionPurposeDto: UpdateSessionPurposeDto) {
    return this.sessionPurposesService.update(+id, updateSessionPurposeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionPurposesService.remove(+id);
  }
}
