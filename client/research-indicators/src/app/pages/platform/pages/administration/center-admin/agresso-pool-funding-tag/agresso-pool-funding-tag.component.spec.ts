import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import AgressoPoolFundingTagComponent from './agresso-pool-funding-tag.component';
import { BilateralService } from '@services/bilateral.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from '@services/clarity.service';
import { AgressoContractRow } from '@interfaces/bilateral/agresso-contract.interface';
import { hasActivePooledFundingContract, isBilateralFundingType } from '@shared/constants/agresso-funding.constants';

describe('AgressoPoolFundingTagComponent', () => {
  let fixture: ComponentFixture<AgressoPoolFundingTagComponent>;
  let component: AgressoPoolFundingTagComponent;
  let mockBilateral: any;
  let mockActions: any;
  let mockClarity: any;
  let queryParamGet: jest.Mock;
  let currentContract: ReturnType<typeof signal<AgressoContractRow | null>>;
  let loadingContract: ReturnType<typeof signal<boolean>>;
  let savingTag: ReturnType<typeof signal<boolean>>;

  const bilateralRow: AgressoContractRow = {
    agreement_id: 'AC-1594',
    description: 'Bilateral test contract',
    funding_type: 'Bilateral',
    is_pool_funding_contributor: false
  };

  beforeEach(async () => {
    currentContract = signal<AgressoContractRow | null>(null);
    loadingContract = signal(false);
    savingTag = signal(false);
    queryParamGet = jest.fn().mockReturnValue(null);

    mockBilateral = {
      currentContract,
      loadingContract,
      savingTag,
      getContract: jest.fn(),
      patchTag: jest.fn(),
      isBilateral: jest.fn((c: AgressoContractRow | null | undefined) =>
        !!c && isBilateralFundingType(c.funding_type) && !hasActivePooledFundingContract(c)
      )
    };

    mockActions = { showToast: jest.fn() };
    mockClarity = { trackEvent: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AgressoPoolFundingTagComponent],
      providers: [
        { provide: BilateralService, useValue: mockBilateral },
        { provide: ActionsService, useValue: mockActions },
        { provide: ClarityService, useValue: mockClarity },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (key: string) => queryParamGet(key) } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgressoPoolFundingTagComponent);
    component = fixture.componentInstance;
  });

  it('pre-fills contractCode from the query param and auto-looks-up', async () => {
    queryParamGet.mockImplementation((k: string) => (k === 'contract-code' ? 'AC-1594' : null));
    mockBilateral.getContract.mockImplementation(async () => {
      currentContract.set(bilateralRow);
      return bilateralRow;
    });

    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.contractCode()).toBe('AC-1594');
    expect(mockBilateral.getContract).toHaveBeenCalledWith('AC-1594');
    expect(component.contract()).toEqual(bilateralRow);
    expect(component.newValue()).toBe(false);
  });

  it('look-up populates the summary card and seeds newValue from the current tag', async () => {
    component.contractCode.set('AC-1594');
    const seeded = { ...bilateralRow, is_pool_funding_contributor: true };
    mockBilateral.getContract.mockImplementation(async () => {
      currentContract.set(seeded);
      return seeded;
    });

    await component.onLookup();

    expect(component.contract()).toEqual(seeded);
    expect(component.newValue()).toBe(true);
    expect(component.inlineError()).toBeNull();
  });

  it('look-up with empty code sets an inline error and does not call the service', async () => {
    component.contractCode.set('   ');
    await component.onLookup();
    expect(component.inlineError()).toBe('Enter a contract code to look up.');
    expect(mockBilateral.getContract).not.toHaveBeenCalled();
  });

  it('look-up with no result sets a "not found" inline error', async () => {
    component.contractCode.set('AC-NONE');
    mockBilateral.getContract.mockResolvedValue(null);

    await component.onLookup();

    expect(component.inlineError()).toBe('No contract found for code "AC-NONE".');
    expect(component.newValue()).toBeNull();
  });

  it('disables Save when the contract is non-bilateral (canSave === false; isBilateral === false)', async () => {
    const nonBilateral = { ...bilateralRow, funding_type: 'Pool Funding' };
    currentContract.set(nonBilateral);
    component.newValue.set(true);

    expect(component.isBilateral()).toBe(false);
    expect(component.canSave()).toBe(false);
  });

  it('disables Save when the value is unchanged', () => {
    currentContract.set(bilateralRow);
    component.newValue.set(!!bilateralRow.is_pool_funding_contributor);
    expect(component.canSave()).toBe(false);
  });

  it('save 200 — fires success toast, telemetry event, and flips saveSuccess', async () => {
    currentContract.set(bilateralRow);
    component.newValue.set(true);
    mockBilateral.patchTag.mockResolvedValue({
      ok: true,
      data: { agreement_id: 'AC-1594', is_pool_funding_contributor: true }
    });

    await component.onSave();

    expect(mockBilateral.patchTag).toHaveBeenCalledWith('AC-1594', true);
    expect(mockClarity.trackEvent).toHaveBeenCalledWith('bilateral.tag.override.saved', {
      contract_code: 'AC-1594',
      new_value: true,
      prior_value: false
    });
    expect(mockActions.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'AGRESSO',
      detail: 'Pool Funding tag updated'
    });
    expect(component.saveSuccess()).toBe(true);
    expect(component.inlineError()).toBeNull();
  });

  it('save 200 — telemetry event captures prior_value before the optimistic update flips it', async () => {
    const preSet = { ...bilateralRow, is_pool_funding_contributor: true };
    currentContract.set(preSet);
    component.newValue.set(false);
    mockBilateral.patchTag.mockResolvedValue({
      ok: true,
      data: { agreement_id: 'AC-1594', is_pool_funding_contributor: false }
    });

    await component.onSave();

    expect(mockClarity.trackEvent).toHaveBeenCalledWith('bilateral.tag.override.saved', {
      contract_code: 'AC-1594',
      new_value: false,
      prior_value: true
    });
  });

  it('save 4xx/5xx — telemetry event does NOT fire', async () => {
    currentContract.set(bilateralRow);
    component.newValue.set(true);
    mockBilateral.patchTag.mockResolvedValue({
      ok: false,
      status: 400,
      description: 'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.'
    });

    await component.onSave();

    expect(mockClarity.trackEvent).not.toHaveBeenCalled();
  });

  it('save 400 with "bilateral" — sets locked inline error and does NOT toast', async () => {
    currentContract.set(bilateralRow);
    component.newValue.set(true);
    mockBilateral.patchTag.mockResolvedValue({
      ok: false,
      status: 400,
      description: 'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.'
    });

    await component.onSave();

    expect(component.inlineError()).toBe(
      'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.'
    );
    expect(mockActions.showToast).not.toHaveBeenCalled();
    expect(component.saveSuccess()).toBe(false);
  });

  it('save 5xx — does not set inline error (global interceptor handles toast)', async () => {
    currentContract.set(bilateralRow);
    component.newValue.set(true);
    mockBilateral.patchTag.mockResolvedValue({ ok: false, status: 500, description: 'Internal Server Error' });

    await component.onSave();

    expect(component.inlineError()).toBeNull();
    expect(mockActions.showToast).not.toHaveBeenCalled();
    expect(component.saveSuccess()).toBe(false);
  });

  it('justification is clipped to max length on input', () => {
    const long = 'x'.repeat(600);
    component.onJustificationInput(long);
    expect(component.justification()).toHaveLength(component.justificationMaxLength);
  });

  describe('DOM — user-visible surfaces', () => {
    it('renders the lookup card with input + Look up button on initial render', () => {
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('[data-testid="contract-code-input"]');
      const button = fixture.nativeElement.querySelector('[data-testid="look-up-button"]');

      expect(input).not.toBeNull();
      expect(button).not.toBeNull();
    });

    it('does NOT render summary or override cards until a contract loads', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="summary-card"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="override-card"]')).toBeNull();
    });

    it('renders summary + override cards once a contract is loaded', () => {
      currentContract.set(bilateralRow);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="summary-card"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="override-card"]')).not.toBeNull();
    });

    it('renders the inline error element with role="alert" and aria-live="polite" (AC-08.1)', async () => {
      component.contractCode.set('');
      await component.onLookup();
      fixture.detectChanges();

      const errorEl: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="inline-error"]');
      expect(errorEl).not.toBeNull();
      expect(errorEl!.getAttribute('role')).toBe('alert');
      expect(errorEl!.getAttribute('aria-live')).toBe('polite');
    });

    it('renders the locked non-bilateral inline copy on save 400 (AC-08.2)', async () => {
      currentContract.set(bilateralRow);
      component.newValue.set(true);
      mockBilateral.patchTag.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.'
      });

      await component.onSave();
      fixture.detectChanges();

      const errorEl: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="inline-error"]');
      expect(errorEl).not.toBeNull();
      expect(errorEl!.textContent).toContain(
        'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.'
      );
    });

    it('renders the non-bilateral hint when funding_type is not bilateral', () => {
      currentContract.set({ ...bilateralRow, funding_type: 'Pool Funding' });
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('[data-testid="not-bilateral-hint"]');
      expect(hint).not.toBeNull();
    });

    it('renders the success notice after a successful save (AC-07.6)', async () => {
      currentContract.set(bilateralRow);
      component.newValue.set(true);
      mockBilateral.patchTag.mockResolvedValue({
        ok: true,
        data: { agreement_id: 'AC-1594', is_pool_funding_contributor: true }
      });

      await component.onSave();
      fixture.detectChanges();

      const success = fixture.nativeElement.querySelector('[data-testid="save-success"]');
      expect(success).not.toBeNull();
      expect(success!.textContent).toContain('Your changes have been saved');
    });
  });
});
