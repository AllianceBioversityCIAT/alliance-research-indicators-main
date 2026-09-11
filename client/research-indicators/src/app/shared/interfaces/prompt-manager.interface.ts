/**
 * Contracts for the AI prompts served by the document-overview service
 * (`GET/POST {documentOverviewUrl}/api/prompts`).
 *
 * `sections` is the ordered list of section keys the prompt is composed of —
 * it drives the editor, so a prompt that adds or removes a section renders
 * correctly without a client change.
 */
export interface PromptVariable {
  name: string;
  placeholder: string;
  description: string;
  required: boolean;
}

/** Section key → section text. Keys come from {@link PromptItem.sections}. */
export type PromptSections = Record<string, string>;

export interface PromptItem {
  id: string;
  name: string;
  description?: string;
  sections: string[];
  variables: PromptVariable[];
  default_prompt: PromptSections;
  user_prompt: PromptSections;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface PromptListResponse {
  prompts: PromptItem[];
}

export interface UpdatePromptRequest {
  id: string;
  user_prompt: PromptSections;
  updated_by: string;
}

/** Human labels for the section keys known today; unknown keys fall back to a humanized key. */
export const PROMPT_SECTION_LABELS: Record<string, string> = {
  system_role: 'System role',
  context: 'Context',
  user_instructions: 'User instructions',
  expected_output_format: 'Expected output format'
};

/** Editable table column widths (px). Adjust each value manually as needed. */
export const PROMPT_MANAGER_TABLE_COLUMN_WIDTHS = {
  name: 240,
  descriptionMin: 320,
  lastModified: 200,
  updatedBy: 220,
  actions: 110
};
