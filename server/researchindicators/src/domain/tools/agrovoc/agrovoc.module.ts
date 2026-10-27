import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AgrovocController } from './agrovoc.controller';
import { AgrovocService } from './agrovoc.service';

@Module({
  imports: [HttpModule],
  controllers: [AgrovocController],
  providers: [AgrovocService],
})
export class AgrovocModule {}
