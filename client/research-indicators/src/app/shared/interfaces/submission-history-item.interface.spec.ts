import { SubmissionHistoryItem } from './submission-history-item.interface';

describe('SubmissionHistoryItem', () => {
  it('should create an instance with default values', () => {
    const item = new SubmissionHistoryItem();
    expect(item.created_by_object).toEqual({ first_name: '', last_name: '' });
    expect(item.updated_at).toBe('');
    expect(item.from_status_id).toBe(0);
    expect(item.to_status_id).toBe(0);
    expect(item.from_status).toBeUndefined();
    expect(item.to_status).toBeUndefined();
    expect(item.submission_comment).toBe('');
    expect(item.custom_date).toBe('');
    expect(item.submission_history_id).toBeUndefined();
    expect(item.editable_timestamp).toBeUndefined();
    expect(item.is_editable_date).toBeUndefined();
  });

  it('should allow assigning values to properties', () => {
    const item = new SubmissionHistoryItem();
    item.created_by_object = { first_name: 'Jane', last_name: 'Doe' };
    item.updated_at = '2026-01-01T00:00:00Z';
    item.custom_date = '2026-01-02T12:00:00Z';
    item.submission_history_id = 42;
    item.editable_timestamp = true;
    item.is_editable_date = true;
    expect(item.created_by_object.first_name).toBe('Jane');
    expect(item.updated_at).toBe('2026-01-01T00:00:00Z');
    expect(item.custom_date).toBe('2026-01-02T12:00:00Z');
    expect(item.submission_history_id).toBe(42);
    expect(item.editable_timestamp).toBe(true);
    expect(item.is_editable_date).toBe(true);
  });
});
