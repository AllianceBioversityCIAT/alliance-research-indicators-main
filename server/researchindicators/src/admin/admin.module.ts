import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { ReactRendererService } from './services/react-renderer.service';
import { AuthService } from './services/auth.service';

@Module({
  imports: [HttpModule],
  controllers: [AdminController],
  providers: [AdminService, ReactRendererService, AuthService],
  exports: [AuthService],
})
export class AdminModule {}
