import { Component, Input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GetContractsByUser } from '@shared/interfaces/get-contracts-by-user.interface';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';
import { ProjectUtilsService } from '@shared/services/project-utils.service';

@Component({
  selector: 'app-project-general-info',
  imports: [DatePipe],
  templateUrl: './project-general-info.component.html'
})
export class ProjectGeneralInfoComponent {
  @Input() project: GetContractsByUser | GetProjectDetail | FindContracts = {};

  private readonly projectUtils = inject(ProjectUtilsService);

  getLeverName(): string {
    return this.projectUtils.getLeverName(this.project);
  }

  hasField(fieldName: string): boolean {
    return this.projectUtils.hasField(this.project, fieldName);
  }
}
