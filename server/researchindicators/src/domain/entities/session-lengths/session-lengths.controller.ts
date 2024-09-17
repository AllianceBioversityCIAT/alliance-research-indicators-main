import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SessionLengthsService } from './session-lengths.service';
import { CreateSessionLengthDto } from './dto/create-session-length.dto';
import { UpdateSessionLengthDto } from './dto/update-session-length.dto';

@Controller('session-lengths')
export class SessionLengthsController {
  constructor(private readonly sessionLengthsService: SessionLengthsService) {}

  @Post()
  create(@Body() createSessionLengthDto: CreateSessionLengthDto) {
    return this.sessionLengthsService.create(createSessionLengthDto);
  }

  @Get()
  findAll() {
    return this.sessionLengthsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionLengthsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionLengthDto: UpdateSessionLengthDto) {
    return this.sessionLengthsService.update(+id, updateSessionLengthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionLengthsService.remove(+id);
  }
}
