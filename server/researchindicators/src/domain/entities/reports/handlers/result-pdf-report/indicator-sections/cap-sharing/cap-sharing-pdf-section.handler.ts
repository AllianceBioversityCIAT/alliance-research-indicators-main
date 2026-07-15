import { Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, In } from 'typeorm';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { ResultCapacitySharingService } from '../../../../../result-capacity-sharing/result-capacity-sharing.service';
import { ResultCapacitySharing } from '../../../../../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { UpdateResultCapacitySharingDto } from '../../../../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { SessionFormat } from '../../../../../session-formats/entities/session-format.entity';
import { SessionType } from '../../../../../session-types/entities/session-type.entity';
import { SessionLength } from '../../../../../session-lengths/entities/session-length.entity';
import { Degree } from '../../../../../degrees/entities/degree.entity';
import { DeliveryModality } from '../../../../../delivery-modalities/entities/delivery-modality.entity';
import { Gender } from '../../../../../genders/entities/gender.entity';
import { SessionPurpose } from '../../../../../session-purposes/entities/session-purpose.entity';
import { ResultInstitution } from '../../../../../result-institutions/entities/result-institution.entity';
import { InstitutionRolesEnum } from '../../../../../institution-roles/enums/institution-roles.enum';
import { ClarisaCountry } from '../../../../../../tools/clarisa/entities/clarisa-countries/entities/clarisa-country.entity';
import {
  mapCapSharingSection,
  mapInstitutionItems,
} from '../../result-pdf-report.mapper';
import { ResultPdfReportCapSharingLabels } from '../../result-pdf-report.types';
import { ResultPdfIndicatorSectionHandler } from '../result-pdf-indicator-section.types';

export const mapAttendingOrganizationLabel = (
  value?: boolean | null,
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return value ? 'Yes' : 'No';
};

@Injectable()
export class CapSharingPdfSectionHandler
  implements ResultPdfIndicatorSectionHandler {
  readonly indicatorId = IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;

  constructor(
    private readonly resultCapacitySharingService: ResultCapacitySharingService,
    private readonly dataSource: DataSource,
  ) { }

  async buildSections(resultId: number) {
    const section = await this.buildCapSharingSection(resultId);
    return section ? { cap_sharing: section } : {};
  }

  private async buildCapSharingSection(resultId: number) {
    const capSharingExists = await this.dataSource
      .getRepository(ResultCapacitySharing)
      .findOne({
        where: {
          result_id: resultId,
          is_active: true,
        },
        select: {
          result_id: true,
        },
      });

    if (!capSharingExists) return undefined;

    const raw =
      await this.resultCapacitySharingService.findByResultId(resultId);
    const labels = await this.resolveCapSharingLabels(raw, resultId);
    return mapCapSharingSection(raw, labels);
  }

  private async resolveCapSharingLabels(
    capSharing: Partial<UpdateResultCapacitySharingDto>,
    resultId: number,
  ): Promise<ResultPdfReportCapSharingLabels> {
    const [
      sessionFormat,
      sessionType,
      sessionLength,
      degree,
      deliveryModality,
      gender,
      sessionPurpose,
      affiliationInstitution,
      nationalityCountry,
      organizationInstitutions,
    ] = await Promise.all([
      this.findControlListLabel(
        SessionFormat,
        'session_format_id',
        capSharing.session_format_id,
      ),
      this.findControlListLabel(
        SessionType,
        'session_type_id',
        capSharing.session_type_id,
      ),
      this.findControlListLabel(
        SessionLength,
        'session_length_id',
        capSharing.session_length_id,
      ),
      this.findControlListLabel(Degree, 'degree_id', capSharing.degree_id),
      this.findControlListLabel(
        DeliveryModality,
        'delivery_modality_id',
        capSharing.delivery_modality_id,
      ),
      this.findControlListLabel(
        Gender,
        'gender_id',
        capSharing.individual?.gender_id,
      ),
      this.findControlListLabel(
        SessionPurpose,
        'session_purpose_id',
        capSharing.group?.session_purpose_id,
      ),
      this.findAffiliationInstitution(
        resultId,
        capSharing.individual?.affiliation?.result_institution_id,
      ),
      this.findNationalityCountry(
        capSharing.individual?.nationality?.isoAlpha2,
      ),
      this.findOrganizationInstitutions(
        resultId,
        capSharing.group?.trainee_organization_representative ?? [],
      ),
    ]);

    const attendingOrganization = capSharing.group?.is_attending_organization;
    const attendingOrganizationLabel = mapAttendingOrganizationLabel(
      attendingOrganization,
    );

    return {
      session_format_label: sessionFormat,
      session_type_label: sessionType,
      session_length_label: sessionLength,
      degree_label: degree,
      delivery_modality_label: deliveryModality,
      gender_label: gender,
      affiliation_label: affiliationInstitution?.institution?.name,
      nationality_label: nationalityCountry?.name,
      session_purpose_label: sessionPurpose,
      attending_organization_label: attendingOrganizationLabel,
      organization_institutions: organizationInstitutions,
    };
  }

  private findControlListLabel(
    entity: EntityTarget<{ name: string; is_active?: boolean }>,
    key: string,
    id?: number | null,
  ): Promise<string | undefined> {
    if (id == null) return Promise.resolve(undefined);

    return this.dataSource
      .getRepository(entity)
      .findOne({
        where: {
          [key]: id,
          is_active: true,
        },
        select: {
          name: true,
        },
      })
      .then((record) => record?.name);
  }

  private findAffiliationInstitution(
    resultId: number,
    resultInstitutionId?: number,
  ): Promise<ResultInstitution | null> {
    if (!resultInstitutionId) return Promise.resolve(null);

    return this.dataSource.getRepository(ResultInstitution).findOne({
      where: {
        result_institution_id: resultInstitutionId,
        result_id: resultId,
        institution_role_id: InstitutionRolesEnum.TRAINEE_AFFILIATION,
        is_active: true,
      },
      relations: {
        institution: true,
      },
    });
  }

  private findNationalityCountry(
    isoAlpha2?: string,
  ): Promise<ClarisaCountry | null> {
    if (!isoAlpha2) return Promise.resolve(null);

    return this.dataSource.getRepository(ClarisaCountry).findOne({
      where: {
        isoAlpha2,
        is_active: true,
      },
    });
  }

  private async findOrganizationInstitutions(
    resultId: number,
    representatives: ResultInstitution[],
  ) {
    if (!representatives.length) return undefined;

    const institutionIds = representatives.map((item) => item.institution_id);
    const institutions = await this.dataSource
      .getRepository(ResultInstitution)
      .find({
        where: {
          result_id: resultId,
          institution_id: In(institutionIds),
          institution_role_id:
            InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
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

    if (!institutions.length) return undefined;

    return mapInstitutionItems(institutions);
  }
}
