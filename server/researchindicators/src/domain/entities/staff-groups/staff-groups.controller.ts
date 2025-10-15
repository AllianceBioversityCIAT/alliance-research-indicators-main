import { Controller } from '@nestjs/common';
import { StaffGroupsService } from './staff-groups.service';

@Controller('staff-groups')
export class StaffGroupsController {
  constructor(private readonly staffGroupsService: StaffGroupsService) {}
}
