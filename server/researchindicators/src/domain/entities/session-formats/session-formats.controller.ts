import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SessionFormatsService } from './session-formats.service';
import { CreateSessionFormatDto } from './dto/create-session-format.dto';
import { UpdateSessionFormatDto } from './dto/update-session-format.dto';

@Controller('session-formats')
export class SessionFormatsController {
  constructor(private readonly sessionFormatsService: SessionFormatsService) {}

  @Post()
  create(@Body() createSessionFormatDto: CreateSessionFormatDto) {
    return this.sessionFormatsService.create(createSessionFormatDto);
  }

  @Get()
  findAll() {
    return this.sessionFormatsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionFormatsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSessionFormatDto: UpdateSessionFormatDto) {
    return this.sessionFormatsService.update(+id, updateSessionFormatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessionFormatsService.remove(+id);
  }
}
