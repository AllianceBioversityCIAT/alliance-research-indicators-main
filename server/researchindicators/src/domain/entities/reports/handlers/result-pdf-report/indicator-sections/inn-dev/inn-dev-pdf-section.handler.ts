import { Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, FindOptionsWhere, In } from 'typeorm';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { ResultInnovationDevService } from '../../../../../result-innovation-dev/result-innovation-dev.service';
import { ResultInnovationDev } from '../../../../../result-innovation-dev/entities/result-innovation-dev.entity';
import { CreateResultInnovationDevDto } from '../../../../../result-innovation-dev/dto/create-result-innovation-dev.dto';
import { InnovationDevAnticipatedUser } from '../../../../../innovation-dev-anticipated-users/entities/innovation-dev-anticipated-user.entity';
import { DisseminationQualification } from '../../../../../dissemination-qualifications/entities/dissemination-qualification.entity';
import { ExpansionPotential } from '../../../../../expansion-potentials/entities/expansion-potential.entity';
import { ToolFunction } from '../../../../../tool-functions/entities/tool-function.entity';
import { LinkResult } from '../../../../../link-results/entities/link-result.entity';
import { LinkResultRolesEnum } from '../../../../../link-result-roles/enum/link-result-roles.enum';
import { ResultContract } from '../../../../../result-contracts/entities/result-contract.entity';
import { ClarisaInnovationCharacteristic } from '../../../../../../tools/clarisa/entities/clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaInnovationType } from '../../../../../../tools/clarisa/entities/clarisa-innovation-types/entities/clarisa-innovation-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../../../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { ClarisaActorType } from '../../../../../../tools/clarisa/entities/clarisa-actor-types/entities/clarisa-actor-type.entity';
import { ClarisaInstitutionType } from '../../../../../../tools/clarisa/entities/clarisa-institution-types/entities/clarisa-institution-type.entity';
import { ClarisaInstitution } from '../../../../../../tools/clarisa/entities/clarisa-institutions/entities/clarisa-institution.entity';
import {
  mapInnovationDetailsSection,
  mapYesNoLabel,
} from '../../result-pdf-report.mapper';
import {
  ResultPdfReportInnovationDetailsLabels,
  ResultPdfReportLinkedResult,
} from '../../result-pdf-report.types';
import { ResultPdfIndicatorSectionHandler } from '../result-pdf-indicator-section.types';

type NamedRow = { name?: string };

const uniqueIds = (values: (number | null | undefined)[]): number[] => [
  ...new Set(
    values.filter((value): value is number => value != null).map(Number),
  ),
];

@Injectable()
export class InnDevPdfSectionHandler
  implements ResultPdfIndicatorSectionHandler
{
  readonly indicatorId = IndicatorsEnum.INNOVATION_DEV;

  constructor(
    private readonly resultInnovationDevService: ResultInnovationDevService,
    private readonly dataSource: DataSource,
  ) {}

  async buildSections(resultId: number) {
    const innovationDevExists = await this.dataSource
      .getRepository(ResultInnovationDev)
      .findOne({
        where: { result_id: resultId, is_active: true },
        select: { result_id: true },
      });

    if (!innovationDevExists) return {};

    const raw = await this.resultInnovationDevService.findOne(resultId);
    const [labels, linkedResults] = await Promise.all([
      this.resolveLabels(raw),
      this.findLinkedResults(resultId),
    ]);
    return {
      innovation_details: mapInnovationDetailsSection(
        raw,
        labels,
        linkedResults,
      ),
    };
  }

  private async resolveLabels(
    innovation: CreateResultInnovationDevDto,
  ): Promise<ResultPdfReportInnovationDetailsLabels> {
    const knowledgeSharing = innovation.knowledge_sharing_form;
    const scaling = innovation.scaling_potential_form;
    const institutionTypes = innovation.institution_types ?? [];

    const [
      innovationNature,
      innovationType,
      innovationReadiness,
      anticipatedUsers,
      disseminationQualification,
      expansionPotential,
      actorTypes,
      institutionTypeRows,
      subInstitutionTypeRows,
      institutions,
      toolFunctions,
    ] = await Promise.all([
      this.findOne(ClarisaInnovationCharacteristic, {
        id: innovation.innovation_nature_id,
      }),
      this.findOne(ClarisaInnovationType, {
        code: innovation.innovation_type_id,
      }),
      this.findOne(ClarisaInnovationReadinessLevel, {
        id: innovation.innovation_readiness_id,
      }),
      this.findOne(InnovationDevAnticipatedUser, {
        id: innovation.anticipated_users_id,
      }),
      this.findOne(DisseminationQualification, {
        id: knowledgeSharing?.dissemination_qualification_id,
      }),
      this.findOne(ExpansionPotential, {
        id: scaling?.expansion_potential_id,
      }),
      this.findMany(
        ClarisaActorType,
        'code',
        (innovation.actors ?? []).map((actor) => actor.actor_type_id),
      ),
      this.findMany(
        ClarisaInstitutionType,
        'code',
        institutionTypes.map((item) => item.institution_type_id),
      ),
      this.findMany(
        ClarisaInstitutionType,
        'code',
        institutionTypes.map((item) => item.sub_institution_type_id),
      ),
      this.findMany(
        ClarisaInstitution,
        'code',
        institutionTypes.map((item) => item.institution_id),
      ),
      this.findMany(
        ToolFunction,
        'id',
        (knowledgeSharing?.tool_function_id ?? []).map(
          (item) => item.tool_function_id,
        ),
      ),
    ]);

    const toolFunctionById = new Map(
      toolFunctions.map((row) => [Number(row.id), row.name]),
    );

    return {
      innovation_nature: innovationNature ?? undefined,
      innovation_type: innovationType ?? undefined,
      innovation_readiness: innovationReadiness ?? undefined,
      anticipated_users_label: anticipatedUsers?.name,
      is_new_or_improved_variety_label: mapYesNoLabel(
        innovation.is_new_or_improved_variety,
      ),
      actor_type_labels: this.toLabelMap(actorTypes, 'code'),
      institution_type_labels: this.toLabelMap(institutionTypeRows, 'code'),
      sub_institution_type_labels: this.toLabelMap(
        subInstitutionTypeRows,
        'code',
      ),
      institution_labels: Object.fromEntries(
        institutions.map((row) => [
          Number(row.code),
          row.acronym ? `${row.name} (${row.acronym})` : row.name,
        ]),
      ),
      is_knowledge_sharing_label: mapYesNoLabel(
        knowledgeSharing?.is_knowledge_sharing,
      ),
      dissemination_qualification_label: disseminationQualification?.name,
      tool_function_labels: (knowledgeSharing?.tool_function_id ?? [])
        .map((item) => toolFunctionById.get(Number(item.tool_function_id)))
        .filter(Boolean),
      is_used_beyond_original_context_label: mapYesNoLabel(
        knowledgeSharing?.is_used_beyond_original_context,
      ),
      expansion_potential_label: expansionPotential?.name,
    };
  }

  /**
   * Linked results with what the PDF card prints: title, code, indicator, STAR status
   * and the primary project as "description (agreement)".
   */
  private async findLinkedResults(
    resultId: number,
  ): Promise<ResultPdfReportLinkedResult[]> {
    const links = await this.dataSource.getRepository(LinkResult).find({
      where: {
        result_id: resultId,
        link_result_role_id: LinkResultRolesEnum.INNOVATION_DEV,
        is_active: true,
      },
      relations: {
        other_result: { indicator: true, result_status: true },
      },
    });
    if (!links.length) return [];

    const primaryContracts = await this.dataSource
      .getRepository(ResultContract)
      .find({
        where: {
          result_id: In(links.map((link) => link.other_result_id)),
          is_primary: true,
          is_active: true,
        },
        relations: { agresso_contract: true },
      });
    const projectByResultId = new Map(
      primaryContracts.map((contract) => {
        const agreementId =
          contract.agresso_contract?.agreement_id ?? contract.contract_id;
        const description = contract.agresso_contract?.description;
        return [
          Number(contract.result_id),
          description ? `${description} (${agreementId})` : agreementId,
        ];
      }),
    );

    return links.map((link) => ({
      link_result_id: link.link_result_id,
      other_result_id: link.other_result_id,
      link_result_role_id: link.link_result_role_id,
      result_code: link.other_result?.result_official_code,
      linked_result_title: link.other_result?.title,
      result_type_label: link.other_result?.indicator?.name,
      qa_status_label: link.other_result?.result_status?.name,
      reporting_project_name: projectByResultId.get(
        Number(link.other_result_id),
      ),
    }));
  }

  private findOne<T>(
    entity: EntityTarget<T>,
    where: Record<string, number | null | undefined>,
  ): Promise<T | null> {
    if (Object.values(where).some((value) => value == null)) {
      return Promise.resolve(null);
    }
    return this.dataSource
      .getRepository(entity)
      .findOne({ where: where as FindOptionsWhere<T> });
  }

  private findMany<T>(
    entity: EntityTarget<T>,
    key: string,
    ids: (number | null | undefined)[],
  ): Promise<T[]> {
    const values = uniqueIds(ids);
    if (!values.length) return Promise.resolve([]);
    return this.dataSource
      .getRepository(entity)
      .find({ where: { [key]: In(values) } as FindOptionsWhere<T> });
  }

  private toLabelMap<T extends NamedRow>(
    rows: T[],
    key: keyof T,
  ): Record<number, string> {
    return Object.fromEntries(
      rows.map((row) => [Number(row[key]), row.name ?? '']),
    );
  }
}
