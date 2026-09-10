// @akili-spec docs/specs/changes/my-pi-delegates — T-02
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PiDelegate } from './entities/pi-delegate.entity';
import { PiDelegatesRepository } from './repositories/pi-delegates.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PiDelegate])],
  providers: [PiDelegatesRepository],
  exports: [TypeOrmModule, PiDelegatesRepository],
})
export class PiDelegatesModule {}
