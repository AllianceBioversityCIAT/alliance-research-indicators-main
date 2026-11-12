import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { ResultsService } from '../../../results/results.service';
import { ResultEvidencesService } from '../../../result-evidences/result-evidences.service';
import { ResultIpRightsService } from '../../../result-ip-rights/result-ip-rights.service';
import { ResultContract } from '../../../result-contracts/entities/result-contract.entity';
import { ContractRolesEnum } from '../../../result-contracts/enum/contract-roles.enum';
import { ResultLever } from '../../../result-levers/entities/result-lever.entity';
import { ResultLeverSdgTarget } from '../../../result-lever-sdg-targets/entities/result-lever-sdg-target.entity';
import { LeverRolesEnum } from '../../../lever-roles/enum/lever-roles.enum';
import { ResultInstitution } from '../../../result-institutions/entities/result-institution.entity';
import { InstitutionRolesEnum } from '../../../institution-roles/enums/institution-roles.enum';
import { Result } from '../../../results/entities/result.entity';
import { ClarisaLeversService } from '../../../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { ResultSdg } from '../../../result-sdgs/entities/result-sdg.entity';
import { ResultStrategicObjective } from '../../../result-strategic-objectives/entities/result-strategic-objective.entity';
import { ResultStrategicObjectiveRolesEnum } from '../../../result-strategic-objectives/enum/result-strategic-objective-roles.enum';
import { ResultImpactOutcome } from '../../../result-impact-outcomes/entities/result-impact-outcome.entity';
import { ResultImpactOutcomeRolesEnum } from '../../../result-impact-outcomes/enum/result-impact-outcome-roles.enum';
import { Portfolio } from '../../../portfolios/entities/portfolio.entity';
import { PortfoliosService } from '../../../portfolios/portfolios.service';
import { PortfolioIdEnum } from '../../../results/portfolio-handlers/enum/portfolio-id.enum';
import {
  AllianceAlignmentPdfSource,
  mapAllianceAlignmentSection,
  mapEvidenceSection,
  mapGeneralInformationSection,
  mapGeographicScopeSection,
  mapIpRightsSection,
  mapPartnersSection,
} from './result-pdf-report.mapper';
import { ResultPdfIndicatorSectionRegistry } from './indicator-sections/result-pdf-indicator-section.registry';
import { PdfViewerService } from '../../../../tools/pdf-viewer/pdf-viewer.service';
import { PdfTemplates } from '../../../../tools/pdf-viewer/enums/pdf-templates.enum';
import { ReportMsApp } from '../../../../tools/broker/report-ms.app';

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
    private readonly pdfViewerService: PdfViewerService,
    private readonly reportMsApp: ReportMsApp,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  async buildReport(
    resultId: number,
    reportName: PdfTemplates,
    isHtml: boolean = false,
    options?: {
      paperWidth?: string;
      paperHeight?: string;
    },
  ): Promise<string> {
    const isSupportedReport = Object.values(PdfTemplates).includes(reportName);

    if (!isSupportedReport) {
      throw new BadRequestException(
        `Report name ${reportName} is not supported`,
      );
    }

    const [
      generalInformation,
      metadata,
      geoLocation,
      evidence,
      ipRights,
      contractsWithAgresso,
      partnerInstitutions,
      partnerFlags,
    ] = await Promise.all([
      this.resultsService.findGeneralInfo(resultId),
      this.resultsService.findMetadataResult(resultId),
      this.resultsService.findGeoLocation(resultId),
      this.resultEvidencesService.findPrincipalEvidence(resultId),
      this.resultIpRightsService.findByResultId(resultId),
      this.findAlignmentContracts(resultId),
      this.findPartnerInstitutions(resultId),
      this.findPartnerFlags(resultId),
    ]);

    const [portfolio, leverByDepartmentId, indicatorSections] =
      await Promise.all([
        this.findPortfolio(metadata.report_year),
        this.buildLeverLookupByDepartment(contractsWithAgresso),
        this.indicatorSectionRegistry.buildSections(
          resultId,
          metadata.indicator_id,
        ),
      ]);
    const alignmentRows = await this.findAlignmentRows(resultId, portfolio);

    const reportData = {
      general_information: mapGeneralInformationSection(
        generalInformation,
        metadata,
      ),
      alliance_alignment: mapAllianceAlignmentSection({
        indicatorId: metadata.indicator_id,
        portfolio,
        contracts: contractsWithAgresso,
        ...alignmentRows,
        bucketUrl: this.appConfig.BUCKET_URL,
        leverByDepartmentId,
      }),
      results_partners: mapPartnersSection(
        partnerInstitutions,
        partnerFlags.is_partner_not_applicable,
      ),
      geographic_scope: mapGeographicScopeSection(geoLocation),
      evidence: mapEvidenceSection(evidence),
      ip_rights: mapIpRightsSection(ipRights),
      ...indicatorSections,
    };

    if (!isHtml) {
      const pdfUrl = await this.reportMsApp.getPdfReport(
        reportName,
        resultId,
        reportData,
        { paperWidth: options?.paperWidth, paperHeight: options?.paperHeight },
      );

      return pdfUrl;
    }

    const uuid = await this.pdfViewerService.postData(reportData);
    const pdf = await this.pdfViewerService.renderPdf(reportName, uuid);
    return pdf;
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

  /** Same rule as `get_portfolio_id_by_result`: the active portfolio spanning the reporting year. */
  private async findPortfolio(
    reportYear: number | null | undefined,
  ): Promise<Portfolio | null> {
    const year = Number(reportYear);
    if (!reportYear || !Number.isFinite(year)) return null;
    return this.portfoliosService.findByYear(year);
  }

  /**
   * Reads every Alliance Alignment row of the result's portfolio with the catalog
   * relations the PDF prints (names, icons, SDG colours). Portfolio 1 reads levers
   * with their OICR outcomes and targets; Portfolio 2 reads Research Areas, Strategic
   * Objectives, Impact Outcomes and result-level SDG targets.
   */
  private async findAlignmentRows(
    resultId: number,
    portfolio: Portfolio | null,
  ): Promise<
    Pick<
      AllianceAlignmentPdfSource,
      | 'levers'
      | 'researchAreas'
      | 'strategicObjectives'
      | 'impactOutcomes'
      | 'resultSdgTargets'
      | 'resultSdgs'
    >
  > {
    const isPortfolio2 = Number(portfolio?.id) === PortfolioIdEnum.PORTFOLIO_2;
    const resultSdgs = this.dataSource.getRepository(ResultSdg).find({
      where: { result_id: resultId, is_active: true },
      relations: { clarisa_sdg: true },
      order: { clarisa_sdg_id: 'ASC' },
    });

    if (!isPortfolio2) {
      const [levers, sdgs] = await Promise.all([
        this.dataSource.getRepository(ResultLever).find({
          where: {
            result_id: resultId,
            lever_role_id: LeverRolesEnum.ALIGNMENT,
            is_active: true,
          },
          relations: {
            lever: true,
            result_lever_strategic_outcomes: { lever_strategic_outcome: true },
            result_lever_sdg_targets: { sdg_target: { clarisa_sdg: true } },
          },
          order: { lever_id: 'ASC' },
        }),
        resultSdgs,
      ]);
      return {
        levers,
        researchAreas: [],
        strategicObjectives: [],
        impactOutcomes: [],
        resultSdgTargets: [],
        resultSdgs: sdgs,
      };
    }

    const [
      researchAreas,
      strategicObjectives,
      impactOutcomes,
      resultSdgTargets,
      sdgs,
    ] = await Promise.all([
      this.dataSource.getRepository(ResultLever).find({
        where: {
          result_id: resultId,
          lever_role_id: LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
          is_active: true,
        },
        relations: { lever: true },
        order: { lever_id: 'ASC' },
      }),
      this.dataSource.getRepository(ResultStrategicObjective).find({
        where: {
          result_id: resultId,
          role_id: ResultStrategicObjectiveRolesEnum.ALIGNMENT,
          is_active: true,
        },
        relations: { strategic_objective: true },
        order: { strategic_objective_id: 'ASC' },
      }),
      this.dataSource.getRepository(ResultImpactOutcome).find({
        where: {
          result_id: resultId,
          role_id: ResultImpactOutcomeRolesEnum.ALIGNMENT,
          is_active: true,
        },
        relations: { impact_outcome: true },
        order: { impact_outcome_id: 'ASC' },
      }),
      this.dataSource.getRepository(ResultLeverSdgTarget).find({
        where: {
          result_id: resultId,
          result_lever_id: IsNull(),
          is_active: true,
        },
        relations: { sdg_target: { clarisa_sdg: true } },
        order: { sdg_target_id: 'ASC' },
      }),
      resultSdgs,
    ]);
    return {
      levers: [],
      researchAreas,
      strategicObjectives,
      impactOutcomes,
      resultSdgTargets,
      resultSdgs: sdgs,
    };
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
