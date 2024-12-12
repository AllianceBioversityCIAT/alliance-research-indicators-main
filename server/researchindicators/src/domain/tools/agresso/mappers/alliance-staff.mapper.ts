import { DeepPartial } from 'typeorm';
import { AllianceUserStaff } from '../../../entities/alliance-user-staff/entities/alliance-user-staff.entity';
import { AgressoStaffRawDto } from '../staff/dto/agresso-staff-raw.dto';

export const allianceStaffMapper = (
  data: AgressoStaffRawDto,
): DeepPartial<AllianceUserStaff> => {
  return {
    carnet: data.resourceId,
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    center: data.center,
    status: data.status,
  };
};
