/**
 * Where a linked "existing OICR" comes from. `TEMP_result_external_oicrs.external_oicr_id`
 * points at `TEMP_external_oicrs.id` for EXTERNAL and at `results.result_id` for RESULT.
 */
export enum ExternalOicrSourceEnum {
  EXTERNAL = 'external',
  RESULT = 'result',
}
