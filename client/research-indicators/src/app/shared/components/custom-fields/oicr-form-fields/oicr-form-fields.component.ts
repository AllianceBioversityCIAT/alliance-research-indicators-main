import { Component, inject, Input, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { SelectComponent } from '../select/select.component';
import { TextareaComponent } from '../textarea/textarea.component';
import { InputComponent } from '../input/input.component';
import { OICR_HELPER_TEXTS } from '@shared/constants/oicr-helper-texts.constants';
import { OicrCreation, PatchOicr } from '@shared/interfaces/oicr-creation.interface';
import { FastResponseData } from '@shared/interfaces/fast-response.interface';
import { PROMPT_OICR_DETAILS } from '@shared/constants/result-ai.constants';
import { ApiService } from '@shared/services/api.service';
import { UtilsService } from '@shared/services/utils.service';
import { WordCountService } from '@shared/services/word-count.service';
import { ActionsService } from '@shared/services/actions.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { CreateResultManagementService } from '../../all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { normalizeStepThree } from '@shared/utils/geographic-scope.util';

type OicrFormBody = OicrCreation | PatchOicr;

function isOicrCreation(body: OicrFormBody): body is OicrCreation {
  return 'step_one' in body;
}

function isPatchOicr(body: OicrFormBody): body is PatchOicr {
  return 'tagging' in body && !Array.isArray(body.tagging);
}

@Component({
  selector: 'app-oicr-form-fields',
  standalone: true,
  imports: [CommonModule, SelectComponent, TextareaComponent, InputComponent, TooltipModule],
  templateUrl: './oicr-form-fields.component.html'
})
export class OicrFormFieldsComponent {
  @Input() body!: WritableSignal<OicrFormBody>;
  @Input() mainContactPersonOptionValue: { body: string; option: string } = { body: 'main_contact_person.user_id', option: 'user_id' };
  @Input() oicrNoOptionValue = 'oicr_internal_code';
  @Input() taggingOptionValue: { body: string; option: string } = { body: 'tagging.tag_id', option: 'id' };
  @Input() oicrOptionValue: { body: string; option: string } = { body: 'link_result.external_oicr_id', option: 'id' };
  @Input() maturityLevelOptionValue: { body: string; option: string } = { body: 'maturity_level_id', option: 'id' };
  @Input() outcomeImpactOptionValue = 'outcome_impact_statement';
  @Input() shortOutcomeOptionValue = 'short_outcome_impact_statement';
  @Input() generalCommentOptionValue = 'general_comment';
  @Input() showMainContactPerson = false;
  @Input() showMaturityLevel = true;
  @Input() showShortOutcome = true;
  @Input() showOicrNo = false;
  @Input() showGeneralComment = true;
  @Input() isOicrNoDisabled = false;
  @Input() clearOicrSelection: () => void = () => {
    // Default empty implementation - can be overridden by parent component
  };

  api = inject(ApiService);
  utils = inject(UtilsService);
  wordCountService = inject(WordCountService);
  actions = inject(ActionsService);
  isAiLoading = signal(false);
  isTyping = signal(false);
  aiError = signal('');
  rolesService = inject(RolesService);
  createResultManagementService = inject(CreateResultManagementService);
  private aiTimeoutId: number | null = null;

  taggingHelperText = OICR_HELPER_TEXTS.taggingHelperText;
  outcomeImpactStatementHelperText = OICR_HELPER_TEXTS.outcomeImpactStatementHelperText;
  maturityLevelHelperText = OICR_HELPER_TEXTS.maturityLevelHelperText;
  shortOutcomeHelperText =
    'AI will draft a short outcome statement using the text from the Elaboration of outcome/impact statement field above. You can edit it anytime.';

  showOicrSelection(): boolean {
    const body = this.body();

    if (isOicrCreation(body)) {
      const tagging = body.step_one?.tagging;
      if (Array.isArray(tagging)) {
        return tagging[0]?.tag_id === 2 || tagging[0]?.tag_id === 3;
      }
      return tagging?.tag_id === 2 || tagging?.tag_id === 3;
    }

    if (isPatchOicr(body)) {
      return body.tagging?.tag_id === 2 || body.tagging?.tag_id === 3;
    }

    return false;
  }

  onSelectOicr(external_oicr_id: number) {
    this.getOicrMetadata(external_oicr_id);
  }

  async getOicrMetadata(externalOicrId: number) {
    this.createResultManagementService.autofillinOicr.set(true);
    const response = await this.api.GET_OICRMetadata(externalOicrId);
    if (!response.successfulRequest) return;
    // Pre-fill OICR form fields with metadata
    const stepThree = normalizeStepThree(response.data.step_three);
    stepThree.comment_geo_scope = stepThree.comment_geo_scope || '';
    this.createResultManagementService.createOicrBody.update(b => {
      const primaryLeverIds = b.step_two.primary_lever.map(pl => Number(pl.lever_id));
      return {
        ...b,
        step_one: {
          ...b.step_one,
          outcome_impact_statement: response.data.step_one.outcome_impact_statement
        },
        step_two: {
          ...b.step_two,
          contributor_lever: response.data.step_two.contributor_lever
            .filter(cl => !primaryLeverIds.includes(Number(cl.lever_id)))
            .map(cl => ({
              ...cl,
              lever_id: Number(cl.lever_id)
            }))
        },
        step_three: stepThree
      };
    });
    this.createResultManagementService.autofillinOicr.set(false);
  }

  async aiAssistantFunctionForShortOutcome() {
    const elaborationText = this.utils.getNestedPropertySignal(this.body, this.outcomeImpactOptionValue) || '';
    const textData = {
      prompt: PROMPT_OICR_DETAILS,
      input_text: elaborationText
    };

    this.aiError.set('');
    this.isAiLoading.set(true);

    this.aiTimeoutId = window.setTimeout(() => {
      this.handleAiError('Request timed out. Please try again.');
    }, 30000);

    try {
      const response = await this.api.fastResponse(textData);

      if (response.successfulRequest) {
        let aiText = '';
        const fastResponse = response as unknown as FastResponseData;
        if (fastResponse.output) {
          aiText = fastResponse.output;
        }

        if (aiText) {
          const existingContent = this.utils.getNestedPropertySignal(this.body, this.shortOutcomeOptionValue) || '';
          const hadExistingContent = existingContent.trim().length > 0;

          if (hadExistingContent) {
            this.actions.showToast({
              severity: 'info',
              summary: 'AI Generation',
              detail: 'Short outcome generated successfully, please review and edit'
            });
          } else {
            this.actions.showToast({
              severity: 'success',
              summary: 'AI Generation',
              detail: 'Short outcome generated successfully'
            });
          }

          this.typeTextEffect(aiText, this.shortOutcomeOptionValue);
        } else {
          this.handleAiError('No content generated. Please try again.');
        }
      } else {
        this.handleAiError('Generation failed. Please try again.');
      }
    } catch {
      this.handleAiError('Generation failed. Please try again.');
    } finally {
      this.clearAiTimeout();
      this.isAiLoading.set(false);
    }
  }

  private handleAiError(message: string) {
    this.aiError.set(message);
    this.actions.showToast({
      severity: 'error',
      summary: 'AI Generation Failed',
      detail: message
    });
    this.isAiLoading.set(false);
  }

  private clearAiTimeout() {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }
  }

  onRetryAi() {
    this.aiError.set('');
    this.aiAssistantFunctionForShortOutcome();
  }

  private typeTextEffect(text: string, fieldPath: string) {
    const currentValue = this.utils.getNestedPropertySignal(this.body, fieldPath) || '';
    const targetText = text.trim();
    if (targetText === currentValue) return;

    this.isTyping.set(true);
    const targetDuration = 1500;
    const typingSpeed = Math.max(20, Math.floor(targetDuration / targetText.length));

    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= targetText.length) {
        const partialText = targetText.substring(0, currentIndex);
        this.utils.setNestedPropertyWithReduceSignal(this.body, fieldPath, partialText);
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        this.isTyping.set(false);
      }
    }, typingSpeed);
  }

  isShortOutcomeAiDisabled(): boolean {
    const elaborationText = this.utils.getNestedPropertySignal(this.body, this.outcomeImpactOptionValue) || '';
    return elaborationText.trim().length === 0 || this.isAiLoading() || this.isTyping() || this.isElaborationTextExceedingLimit();
  }

  isElaborationTextExceedingLimit(): boolean {
    const elaborationText = this.utils.getNestedPropertySignal(this.body, this.outcomeImpactOptionValue) || '';
    const wordCount = this.wordCountService.getWordCount(elaborationText);
    return wordCount > 400;
  }

  getElaborationLimitMessage(): string {
    return 'It is not possible to generate the Short Outcome/Impact Statement because the Elaboration of Outcome/Impact Statement field exceeds the allowed limit. Please adjust the text to continue.';
  }
}
