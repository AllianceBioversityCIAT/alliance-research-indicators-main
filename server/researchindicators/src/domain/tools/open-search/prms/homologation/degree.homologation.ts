import { DegreesEnum } from '../../../../entities/degrees/enum/degrees.enum';

/**
 * Maps PRMS `training_length.name` to STAR {@link DegreesEnum}.
 *
 * Only applies when `training_length.term` is Long-term. Keys are exact PRMS
 * names (`PhD`, `Master`, `BSc`, `Other`); "Master" homologates to STAR MSc.
 */
export const DegreeHomologation: Record<string, DegreesEnum> = {
  PhD: DegreesEnum.PHD,
  Master: DegreesEnum.MSC,
  MSc: DegreesEnum.MSC,
  BSc: DegreesEnum.BSC,
  Other: DegreesEnum.OTHER,
};
