import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultUsersService } from './result-users.service';
import { CreateResultUserDto } from './dto/create-result-user.dto';
import { UpdateResultUserDto } from './dto/update-result-user.dto';

@Controller('result-users')
export class ResultUsersController {
  constructor(private readonly resultUsersService: ResultUsersService) {}

  @Post()
  create(@Body() createResultUserDto: CreateResultUserDto) {
    return this.resultUsersService.create(createResultUserDto);
  }

  @Get()
  findAll() {
    return this.resultUsersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultUsersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultUserDto: UpdateResultUserDto) {
    return this.resultUsersService.update(+id, updateResultUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultUsersService.remove(+id);
  }
}
