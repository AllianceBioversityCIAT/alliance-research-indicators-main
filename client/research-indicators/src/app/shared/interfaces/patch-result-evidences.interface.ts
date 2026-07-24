export class PatchResultEvidences {
  evidence: Evidence[] = [];
  notable_references: NotableReference[] = [];
  cgspace_link: string | null = null;
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
