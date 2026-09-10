// @akili-spec docs/specs/changes/my-pi-delegates — T-02
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PiDelegate } from './entities/pi-delegate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PiDelegate])],
  exports: [TypeOrmModule],
})
export class PiDelegatesModule {}
