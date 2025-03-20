import { AgressoContractStatus } from '../../../shared/enum/agresso-contract.enum';

export class AgressoContractWhere {
  public agreement_id: string;
  public funding_type: string;
  public contract_status: AgressoContractStatus;
}
