export class PatchResultEvidences {
  evidence: Evidence[] = [];
  notable_references: NotableReference[] = [];
  cgspace_link: string | null = null;
  annexes?: ResultOicrAnnex[];
}

export class Evidence {
  is_active = true;
  result_evidence_id = null;
  result_id = null;
  evidence_description = '';
  evidence_url = '';
  evidence_role_id = null;
  is_private = false;
}

export class NotableReference {
  notable_reference_type_id: number | null = null;
  link = '';
}

export class ResultOicrAnnex {
  id?: number;
  annex_type_id: number | null = null;
  description = '';
  photo_credits: string | null = null;
  file_type: string | null = null;
  partner_consent: string | null = null;
  link = '';
}
