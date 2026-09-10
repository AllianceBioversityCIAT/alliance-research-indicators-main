// @akili-spec docs/specs/changes/my-pi-delegates — T-02
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PiDelegate } from './entities/pi-delegate.entity';
import { PiDelegatesRepository } from './repositories/pi-delegates.repository';
import { PiDelegatesService } from './pi-delegates.service';
import { PiDelegatesController } from './pi-delegates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PiDelegate])],
  controllers: [PiDelegatesController],
  providers: [PiDelegatesRepository, PiDelegatesService],
  exports: [TypeOrmModule, PiDelegatesRepository, PiDelegatesService],
})
export class PiDelegatesModule {}
