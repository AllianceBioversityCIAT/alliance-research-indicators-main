import { PatchResultEvidences, Evidence, NotableReference } from './patch-result-evidences.interface';

describe('PatchResultEvidences', () => {
  it('should create instance with default values', () => {
    const instance = new PatchResultEvidences();
    expect(instance.evidence).toEqual([]);
    expect(instance.notable_references).toEqual([]);
  });

  it('should allow setting evidence array', () => {
    const instance = new PatchResultEvidences();
    const evidence = new Evidence();
    instance.evidence = [evidence];
    expect(instance.evidence).toHaveLength(1);
    expect(instance.evidence[0]).toBe(evidence);
  });

  it('should allow setting notable_references array', () => {
    const instance = new PatchResultEvidences();
    const reference = new NotableReference();
    instance.notable_references = [reference];
    expect(instance.notable_references).toHaveLength(1);
    expect(instance.notable_references[0]).toBe(reference);
  });
});

describe('Evidence', () => {
  it('should create instance with default values', () => {
    const instance = new Evidence();
    expect(instance.is_active).toBe(true);
    expect(instance.result_evidence_id).toBeNull();
    expect(instance.result_id).toBeNull();
    expect(instance.evidence_description).toBe('');
    expect(instance.evidence_url).toBe('');
    expect(instance.evidence_role_id).toBeNull();
    expect(instance.is_private).toBe(false);
  });

  it('should allow setting all properties', () => {
    const instance = new Evidence();
    instance.is_active = false;
    instance.result_evidence_id = 1;
    instance.result_id = 2;
    instance.evidence_description = 'Test description';
    instance.evidence_url = 'https://test.com';
    instance.evidence_role_id = 3;
    instance.is_private = true;

    expect(instance.is_active).toBe(false);
    expect(instance.result_evidence_id).toBe(1);
    expect(instance.result_id).toBe(2);
    expect(instance.evidence_description).toBe('Test description');
    expect(instance.evidence_url).toBe('https://test.com');
    expect(instance.evidence_role_id).toBe(3);
    expect(instance.is_private).toBe(true);
  });
});

describe('NotableReference', () => {
  it('should create instance with default values', () => {
    const instance = new NotableReference();
    expect(instance.notable_reference_type_id).toBeNull();
    expect(instance.link).toBe('');
  });

  it('should allow setting notable_reference_type_id', () => {
    const instance = new NotableReference();
    instance.notable_reference_type_id = 5;
    expect(instance.notable_reference_type_id).toBe(5);
  });

  it('should allow setting link', () => {
    const instance = new NotableReference();
    instance.link = 'https://example.com';
    expect(instance.link).toBe('https://example.com');
  });

  it('should allow setting notable_reference_type_id to null', () => {
    const instance = new NotableReference();
    instance.notable_reference_type_id = null;
    expect(instance.notable_reference_type_id).toBeNull();
  });
});

