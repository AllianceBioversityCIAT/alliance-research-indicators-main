import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { ReactRendererService } from './services/react-renderer.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ReactRendererService],
})
export class AdminModule {}
