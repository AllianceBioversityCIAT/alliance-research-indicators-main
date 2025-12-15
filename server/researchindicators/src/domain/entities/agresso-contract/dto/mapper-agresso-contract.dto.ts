import { LeverIcon } from '../../../tools/clarisa/entities/clarisa-levers/enum/LeversIcons.enum';
import { Indicator } from '../../indicators/entities/indicator.entity';

export class RawgressoContractDto {
  public agreement_id: string;
  public projectDescription: string;
  public project_lead_description: string;
  public description: string;
  public start_date: Date;
  public end_date: Date;
  public endDateGlobal: Date;
  public endDatefinance: Date;
  public contract_status: string;
  public count_results: number;
  public indicator_id: number;
  public lever_id: string;
  public lever_short_name: string;
  public lever_full_name: string;
  public lever_other_names: string;
  public is_science_program: boolean;
  public funding_type: string;
  public ubwClientDescription: string;

  constructor(partial: Partial<RawgressoContractDto>) {
    Object.assign(this, partial);
  }
}

export class AgressoContractIndicatorObjectDto {
  public indicator: AgressoContractIndicatorDto;
  public count_results: number;

  constructor(indicators: Indicator, count_results: number) {
    this.indicator = new AgressoContractIndicatorDto(indicators);
    this.count_results = count_results;
  }
}

export class AgressoContractIndicatorDto {
  public indicator_id: number;
  public name: string;
  public description: string;
  public indicator_type_id: string;
  public long_description: string;
  public icon_src: string;
  public other_names: string;
  public is_active: boolean;

  constructor(indicator: Indicator) {
    Object.assign(this, indicator);
  }
}

export class AgressoContractLeverDto {
  public id: number;
  public full_name: string;
  public short_name: string;
  public other_names: string;
  public lever_url: string;

  constructor(rawData: Partial<RawgressoContractDto>) {
    this.id = Number(rawData.lever_id);
    this.full_name = rawData.lever_full_name;
    this.short_name = rawData.lever_short_name;
    this.other_names = rawData.lever_other_names;
    this.lever_url = LeverIcon[rawData.lever_short_name]
      ? `${process.env.ARI_BUCKET_URL}/images/levers${LeverIcon[rawData.lever_short_name]}`
      : 'Not available';
  }
}

export class MappedContractsDto {
  public agreement_id: string;
  public projectDescription: string;
  public project_lead_description: string;
  public description: string;
  public start_date: Date;
  public end_date: Date;
  public endDateGlobal: Date;
  public endDatefinance: Date;
  public contract_status: string;
  public count_results: number;
  public indicators: AgressoContractIndicatorObjectDto[];
  public levers: AgressoContractLeverDto;
  public is_science_program: boolean;
  public funding_type: string;
  public ubwClientDescription: string;

  constructor(rawData: Partial<RawgressoContractDto>, indicators: Indicator[]) {
    this.agreement_id = rawData.agreement_id;
    this.projectDescription = rawData.projectDescription;
    this.project_lead_description = rawData.project_lead_description;
    this.description = rawData.description;
    this.start_date = rawData.start_date;
    this.end_date = rawData.end_date;
    this.endDateGlobal = rawData.endDateGlobal;
    this.endDatefinance = rawData.endDatefinance;
    this.contract_status = rawData.contract_status;
    this.count_results = rawData.count_results;
    this.is_science_program = Boolean(rawData.is_science_program);
    this.funding_type = rawData.funding_type;
    this.ubwClientDescription = rawData.ubwClientDescription;
    this.indicators = indicators.map(
      (indicator) => new AgressoContractIndicatorObjectDto(indicator, 0),
    );
    this.levers = rawData?.lever_id
      ? new AgressoContractLeverDto(rawData)
      : null;
  }

  public setIndicatorCount(indicatorId: number, count: number) {
    const indicator = this.indicators.find(
      (ind) => ind.indicator.indicator_id === indicatorId,
    );
    if (indicator) {
      indicator.count_results = count;
    }
  }
}
