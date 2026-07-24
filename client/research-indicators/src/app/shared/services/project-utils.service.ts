import { Injectable } from '@angular/core';
import { GetContractsByUser, IndicatorElement } from '@shared/interfaces/get-contracts-by-user.interface';
import { GetProjectDetail, GetProjectDetailIndicator } from '@shared/interfaces/get-project-detail.interface';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';

export type ProjectType = GetContractsByUser | GetProjectDetail | FindContracts;
export type IndicatorType = IndicatorElement | GetProjectDetailIndicator;

@Injectable({
  providedIn: 'root'
})
export class ProjectUtilsService {
  getStatusDisplay(project: ProjectType): {
    statusId: number;
    statusName: string;
  } {
    if ('status_id' in project && project.status_id) {
      return { statusId: project.status_id, statusName: project.status_name || 'Unknown' };
    }

    if ('contract_status' in project && project.contract_status) {
      const statusName = project.contract_status.toLowerCase();
      const statusMap: Record<string, { id: number; name: string }> = {
        ongoing: { id: 1, name: 'Ongoing' },
        completed: { id: 2, name: 'Completed' },
        suspended: { id: 3, name: 'Suspended' },
        approved: { id: 6, name: 'Approved' }
      };

      const status = statusMap[statusName];
      if (status) {
        return { statusId: status.id, statusName: status.name };
      }
    }

    return { statusId: 1, statusName: 'Ongoing' };
  }

  getLeverName(project: ProjectType): string {
    if ('levers' in project && project.levers) {
      const leversArray = Array.isArray(project.levers) ? project.levers : [project.levers];
      const names = leversArray.map(l => l.short_name).filter(Boolean);
      if (names.length) return names.join(', ');
    }

    if ('lever' in project && project.lever) {
      if (typeof project.lever === 'string') {
        return project.lever;
      }
      return project.lever.short_name || project.lever.name || '-';
    }

    if ('lever_name' in project && project.lever_name) {
      return project.lever_name;
    }

    return '-';
  }

  hasField(project: ProjectType, fieldName: string): boolean {
    return fieldName in project && !!project[fieldName as keyof typeof project];
  }

  getProjectTitle(project: ProjectType): string {
    const prefix = project.projectDescription ? `${project.projectDescription} - ` : '';
    return `${prefix}${project.description ?? ''}`.trim();
  }

  sortIndicators(indicators: IndicatorType[]): IndicatorType[] {
    const order = ['Capacity Sharing for Development', 'Innovation Development', 'Knowledge Product', 'Innovation Use', 'Outcome Impact Case Report (OICR)', 'Policy Change'];

    if (indicators && indicators.length > 0) {
      const uniqueIndicatorsMap = new Map<string, IndicatorType>();

      indicators.forEach(indicator => {
        const indicatorName = indicator.indicator?.name;
        if (indicatorName) {
          if (uniqueIndicatorsMap.has(indicatorName)) {
            // If already exists, sum the count_results
            const existing = uniqueIndicatorsMap.get(indicatorName)!;
            existing.count_results += indicator.count_results;
          } else {
            // If doesn't exist, add it to the map
            uniqueIndicatorsMap.set(indicatorName, { ...indicator });
          }
        }
      });

      return Array.from(uniqueIndicatorsMap.values()).sort((a, b) => {
        const aIndex = order.indexOf(a.indicator.name);
        const bIndex = order.indexOf(b.indicator.name);
        return aIndex - bIndex;
      });
    }

    return indicators || [];
  }
}
