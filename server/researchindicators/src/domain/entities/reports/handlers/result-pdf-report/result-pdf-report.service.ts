import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultsService } from '../../../results/results.service';
import { ResultEvidencesService } from '../../../result-evidences/result-evidences.service';
import { ResultIpRightsService } from '../../../result-ip-rights/result-ip-rights.service';
import { ResultContract } from '../../../result-contracts/entities/result-contract.entity';
import { ContractRolesEnum } from '../../../result-contracts/enum/contract-roles.enum';
import { ResultLever } from '../../../result-levers/entities/result-lever.entity';
import { LeverRolesEnum } from '../../../lever-roles/enum/lever-roles.enum';
import { ResultInstitution } from '../../../result-institutions/entities/result-institution.entity';
import { InstitutionRolesEnum } from '../../../institution-roles/enums/institution-roles.enum';
import { Result } from '../../../results/entities/result.entity';
import { ClarisaLeversService } from '../../../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import {
  mapAllianceAlignmentSection,
  mapEvidenceSection,
  mapGeneralInformationSection,
  mapGeographicScopeSection,
  mapIpRightsSection,
  mapPartnersSection,
} from './result-pdf-report.mapper';
import { ResultPdfReportPayload } from './result-pdf-report.types';
import { ResultPdfIndicatorSectionRegistry } from './indicator-sections/result-pdf-indicator-section.registry';

@Injectable()
export class ResultPdfReportService {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly resultEvidencesService: ResultEvidencesService,
    private readonly resultIpRightsService: ResultIpRightsService,
    private readonly indicatorSectionRegistry: ResultPdfIndicatorSectionRegistry,
    private readonly clarisaLeversService: ClarisaLeversService,
    private readonly dataSource: DataSource,
    private readonly appConfig: AppConfig,
  ) {}

  async buildReport(resultId: number): Promise<ResultPdfReportPayload> {
    const [
      generalInformation,
      metadata,
      alignment,
      geoLocation,
      evidence,
      ipRights,
      contractsWithAgresso,
      leversWithRelations,
      partnerInstitutions,
      partnerFlags,
    ] = await Promise.all([
      this.resultsService.findGeneralInfo(resultId),
      this.resultsService.findMetadataResult(resultId),
      this.resultsService.findResultAlignment(resultId),
      this.resultsService.findGeoLocation(resultId),
      this.resultEvidencesService.findPrincipalEvidence(resultId),
      this.resultIpRightsService.findByResultId(resultId),
      this.findAlignmentContracts(resultId),
      this.findAlignmentLevers(resultId),
      this.findPartnerInstitutions(resultId),
      this.findPartnerFlags(resultId),
    ]);

    const [leverByDepartmentId, indicatorSections] = await Promise.all([
      this.buildLeverLookupByDepartment(contractsWithAgresso),
      this.indicatorSectionRegistry.buildSections(
        resultId,
        metadata.indicator_id,
      ),
    ]);

    return {
      general_information: mapGeneralInformationSection(
        generalInformation,
        metadata,
      ),
      alliance_alignment: mapAllianceAlignmentSection(
        alignment,
        metadata.indicator_id,
        contractsWithAgresso,
        leversWithRelations,
        this.appConfig.BUCKET_URL,
        leverByDepartmentId,
      ),
      results_partners: mapPartnersSection(
        partnerInstitutions,
        partnerFlags.is_partner_not_applicable,
      ),
      geographic_scope: mapGeographicScopeSection(geoLocation),
      evidence: mapEvidenceSection(evidence),
      ip_rights: mapIpRightsSection(ipRights),
      ...indicatorSections,
    };
  }

  private findAlignmentContracts(resultId: number): Promise<ResultContract[]> {
    return this.dataSource.getRepository(ResultContract).find({
      where: {
        result_id: resultId,
        contract_role_id: ContractRolesEnum.ALIGNMENT,
        is_active: true,
      },
      relations: {
        agresso_contract: true,
      },
    });
  }

  private findAlignmentLevers(resultId: number): Promise<ResultLever[]> {
    return this.dataSource.getRepository(ResultLever).find({
      where: {
        result_id: resultId,
        lever_role_id: LeverRolesEnum.ALIGNMENT,
        is_active: true,
      },
      relations: {
        lever: true,
      },
    });
  }

  private findPartnerInstitutions(
    resultId: number,
  ): Promise<ResultInstitution[]> {
    return this.dataSource.getRepository(ResultInstitution).find({
      where: {
        result_id: resultId,
        institution_role_id: InstitutionRolesEnum.PARTNERS,
        is_active: true,
      },
      relations: {
        institution: {
          institution_type: true,
          institution_locations: {
            country: true,
          },
        },
      },
    });
  }

  private async findPartnerFlags(resultId: number): Promise<{
    is_partner_not_applicable: boolean | null;
  }> {
    const result = await this.dataSource.getRepository(Result).findOne({
      where: {
        result_id: resultId,
        is_active: true,
      },
      select: {
        is_partner_not_applicable: true,
      },
    });

    return {
      is_partner_not_applicable: result?.is_partner_not_applicable ?? null,
    };
  }

  private async buildLeverLookupByDepartment(
    contracts: ResultContract[],
  ): Promise<
    Map<string, { id: number; short_name: string; full_name?: string }>
  > {
    const lookup = new Map<
      string,
      { id: number; short_name: string; full_name?: string }
    >();

    const departmentIds = [
      ...new Set(
        contracts
          .map((contract) => contract.agresso_contract?.departmentId?.trim())
          .filter(Boolean),
      ),
    ];

    await Promise.all(
      departmentIds.map(async (departmentId) => {
        const homologated =
          this.clarisaLeversService.homologatedData(departmentId);
        if (!homologated) return;

        const lever =
          await this.clarisaLeversService.findByShortName(homologated);
        if (!lever) return;

        lookup.set(departmentId, {
          id: lever.id,
          short_name: lever.short_name,
          full_name: lever.full_name,
        });
      }),
    );

    return lookup;
  }
}
