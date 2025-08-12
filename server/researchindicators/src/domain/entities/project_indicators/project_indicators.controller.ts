import { Controller} from '@nestjs/common';
import { ProjectIndicatorsService } from './project_indicators.service';

@Controller('project-indicators')
export class ProjectIndicatorsController {
  constructor(private readonly projectIndicatorsService: ProjectIndicatorsService) {}

}
