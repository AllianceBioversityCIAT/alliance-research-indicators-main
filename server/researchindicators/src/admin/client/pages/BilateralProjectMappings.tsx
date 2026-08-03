import React, { useCallback, useEffect, useMemo, useState } from 'react';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15 / R-BIL-080 (UI)
//
// Admin SSR page for the bilateral_project_mapping CRUD surface.
// First paint is hydrated from `initialData.mappings`; all subsequent
// reads/writes go through the same /api/bilateral-project-mappings
// endpoints the controller exposes (RolesGuard enforces auth there —
// this page is just the operator shell).
//
// Pickers:
//   - CLARISA bilateral projects: GET /api/tools/clarisa/projects/bilateral
//   - AGRESSO contracts:          GET /api/v1/agresso/contracts?pool-funding-contributor=true
//
// SP allocation preview comes from the CLARISA picker payload — the
// service already trims it to Confirmed entries.

interface BilateralProjectMapping {
  id: number;
  agresso_agreement_id: string;
  clarisa_project_id: number;
  clarisa_project_short_name?: string | null;
  source: 'MANUAL' | 'AI_SUGGESTED' | 'AI_AUTO';
  confidence_score?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

interface ClarisaProjectPickerItem {
  id: number;
  short_name: string;
  source_of_funding: string;
  science_programs: {
    code?: string;
    name?: string;
    portfolio?: string;
    allocation?: number;
  }[];
}

interface AgressoContractPickerItem {
  agreement_id: string;
  description?: string;
  funding_type?: string;
}

interface MappingsPage {
  items: BilateralProjectMapping[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface BilateralProjectMappingsProps {
  initialData?: { mappings?: MappingsPage };
}

const PAGE_SIZE = 20;
const ACTIVE_PORTFOLIO = 'P25';

const BilateralProjectMappings: React.FC<BilateralProjectMappingsProps> = ({
  initialData,
}) => {
  const [page, setPage] = useState<MappingsPage>(
    initialData?.mappings ?? {
      items: [],
      meta: { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 },
    },
  );
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formAgreementId, setFormAgreementId] = useState('');
  const [formClarisaProjectId, setFormClarisaProjectId] = useState<number | ''>(
    '',
  );
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [agressoContracts, setAgressoContracts] = useState<
    AgressoContractPickerItem[]
  >([]);
  const [clarisaProjects, setClarisaProjects] = useState<
    ClarisaProjectPickerItem[]
  >([]);
  const [pickersLoading, setPickersLoading] = useState(false);

  const selectedClarisaProject = useMemo(
    () => clarisaProjects.find((p) => p.id === formClarisaProjectId),
    [clarisaProjects, formClarisaProjectId],
  );

  const refresh = useCallback(
    async (overrides?: { page?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(overrides?.page ?? page.meta.page));
        params.set('limit', String(PAGE_SIZE));
        if (search.trim()) params.set('search', search.trim());
        if (isActiveFilter !== 'all') {
          params.set(
            'is_active',
            isActiveFilter === 'active' ? 'true' : 'false',
          );
        }
        const res = await fetch(
          `/api/bilateral-project-mappings?${params.toString()}`,
          { credentials: 'include' },
        );
        const body = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof body?.errors === 'string'
              ? body.errors
              : (body?.errors?.message ?? `HTTP ${res.status}`),
          );
        }
        setPage(body.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [page.meta.page, search, isActiveFilter],
  );

  const loadPickers = useCallback(async () => {
    setPickersLoading(true);
    try {
      const [contractsRes, projectsRes] = await Promise.all([
        fetch(
          '/api/v1/agresso/contracts?pool-funding-contributor=true&limit=500',
          { credentials: 'include' },
        ).then((r) => r.json()),
        fetch('/api/tools/clarisa/projects/bilateral', {
          credentials: 'include',
        }).then((r) => r.json()),
      ]);
      const contracts = contractsRes?.data ?? [];
      setAgressoContracts(
        (Array.isArray(contracts) ? contracts : (contracts.items ?? [])).filter(
          (c: AgressoContractPickerItem) =>
            c.funding_type === 'BLR' || c.funding_type === 'BILATERAL',
        ),
      );
      setClarisaProjects(projectsRes?.data ?? []);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setPickersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showForm && agressoContracts.length === 0) {
      loadPickers();
    }
  }, [showForm, agressoContracts.length, loadPickers]);

  const openCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setFormAgreementId('');
    setFormClarisaProjectId('');
    setFormNotes('');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: BilateralProjectMapping) => {
    setFormMode('edit');
    setEditingId(row.id);
    setFormAgreementId(row.agresso_agreement_id);
    setFormClarisaProjectId(row.clarisa_project_id);
    setFormNotes(row.notes ?? '');
    setFormError(null);
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAgreementId.trim() || formClarisaProjectId === '') {
      setFormError('AGRESSO contract and CLARISA project are required.');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const project = clarisaProjects.find(
        (p) => p.id === formClarisaProjectId,
      );
      const url =
        formMode === 'create'
          ? '/api/bilateral-project-mappings'
          : `/api/bilateral-project-mappings/${editingId}`;
      const method = formMode === 'create' ? 'POST' : 'PATCH';
      const payload =
        formMode === 'create'
          ? {
              agresso_agreement_id: formAgreementId.trim(),
              clarisa_project_id: Number(formClarisaProjectId),
              clarisa_project_short_name: project?.short_name ?? null,
              notes: formNotes.trim() || null,
            }
          : {
              clarisa_project_id: Number(formClarisaProjectId),
              clarisa_project_short_name: project?.short_name ?? null,
              notes: formNotes.trim() || null,
            };
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof body?.errors === 'string'
            ? body.errors
            : (body?.errors?.message ?? `HTTP ${res.status}`),
        );
      }
      setShowForm(false);
      await refresh({ page: 1 });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const deactivateRow = async (row: BilateralProjectMapping) => {
    if (
      !window.confirm(
        `Deactivate mapping for ${row.agresso_agreement_id} → CLARISA project ${row.clarisa_project_id}?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/bilateral-project-mappings/${row.id}/deactivate`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: 'Deactivated via admin panel' }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof body?.errors === 'string'
            ? body.errors
            : (body?.errors?.message ?? `HTTP ${res.status}`),
        );
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h5 className="card-title mb-0">Bilateral Project Mappings</h5>
                <small className="text-muted">
                  AGRESSO contract ↔ CLARISA bilateral project
                </small>
              </div>
              <button className="btn btn-primary" onClick={openCreate}>
                <i className="fas fa-plus me-1"></i> New mapping
              </button>
            </div>

            <div className="card-body">
              <div className="row g-2 mb-3 align-items-center">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search agreement_id or project short_name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') refresh({ page: 1 });
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={isActiveFilter}
                    onChange={(e) =>
                      setIsActiveFilter(
                        e.target.value as 'all' | 'active' | 'inactive',
                      )
                    }
                  >
                    <option value="all">All states</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive only</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => refresh({ page: 1 })}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-1"></i>
                    {loading ? 'Loading…' : 'Apply filters'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>AGRESSO</th>
                      <th>CLARISA project</th>
                      <th>Source</th>
                      <th>Notes</th>
                      <th>State</th>
                      <th>Updated</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                          No mappings found.
                        </td>
                      </tr>
                    )}
                    {page.items.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <code>{row.agresso_agreement_id}</code>
                        </td>
                        <td>
                          <div>
                            <strong>{row.clarisa_project_id}</strong>
                          </div>
                          <small className="text-muted">
                            {row.clarisa_project_short_name ?? '—'}
                          </small>
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {row.source}
                          </span>
                          {row.confidence_score != null && (
                            <small className="ms-2 text-muted">
                              {Math.round(row.confidence_score * 100)}%
                            </small>
                          )}
                        </td>
                        <td>
                          <small>{row.notes ?? '—'}</small>
                        </td>
                        <td>
                          {row.is_active ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-light text-dark">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">
                            {new Date(row.updated_at).toLocaleString()}
                          </small>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            onClick={() => openEdit(row)}
                            disabled={!row.is_active}
                            title={
                              row.is_active
                                ? 'Edit this mapping'
                                : 'Inactive — re-create instead'
                            }
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deactivateRow(row)}
                            disabled={!row.is_active}
                            title={
                              row.is_active ? 'Deactivate' : 'Already inactive'
                            }
                          >
                            <i className="fas fa-power-off"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                  Showing {page.items.length} of {page.meta.total} — page{' '}
                  {page.meta.page} / {Math.max(1, page.meta.totalPages)}
                </small>
                <div className="btn-group">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      refresh({ page: Math.max(1, page.meta.page - 1) })
                    }
                    disabled={loading || page.meta.page <= 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => refresh({ page: page.meta.page + 1 })}
                    disabled={loading || page.meta.page >= page.meta.totalPages}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={submitForm}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {formMode === 'create' ? 'New mapping' : 'Edit mapping'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowForm(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {pickersLoading && (
                    <div className="text-muted mb-3">
                      <i className="fas fa-spinner fa-spin me-1"></i>
                      Loading pickers…
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">AGRESSO contract</label>
                    {formMode === 'edit' ? (
                      <input
                        type="text"
                        className="form-control"
                        value={formAgreementId}
                        disabled
                      />
                    ) : (
                      <select
                        className="form-select"
                        value={formAgreementId}
                        onChange={(e) => setFormAgreementId(e.target.value)}
                        required
                      >
                        <option value="">— pick an AGRESSO contract —</option>
                        {agressoContracts.map((c) => (
                          <option key={c.agreement_id} value={c.agreement_id}>
                            {c.agreement_id} —{' '}
                            {c.description ?? '(no description)'}
                          </option>
                        ))}
                      </select>
                    )}
                    {formMode === 'edit' && (
                      <small className="text-muted">
                        Contract is immutable. Deactivate + re-create to change.
                      </small>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      CLARISA bilateral project
                    </label>
                    <select
                      className="form-select"
                      value={formClarisaProjectId}
                      onChange={(e) =>
                        setFormClarisaProjectId(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                      required
                    >
                      <option value="">— pick a CLARISA project —</option>
                      {clarisaProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.id}] {p.short_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClarisaProject && (
                    <div className="alert alert-info py-2">
                      <strong>
                        Science Programs (Confirmed, {ACTIVE_PORTFOLIO})
                      </strong>
                      <ul className="mb-0 mt-1">
                        {selectedClarisaProject.science_programs
                          .filter((sp) => sp.portfolio === ACTIVE_PORTFOLIO)
                          .map((sp, idx) => (
                            <li key={`${sp.code ?? idx}`}>
                              <code>{sp.code}</code> — {sp.name}{' '}
                              {sp.allocation != null && (
                                <span className="badge bg-light text-dark">
                                  {sp.allocation}%
                                </span>
                              )}
                            </li>
                          ))}
                        {selectedClarisaProject.science_programs.filter(
                          (sp) => sp.portfolio === ACTIVE_PORTFOLIO,
                        ).length === 0 && (
                          <li className="text-muted">
                            No Confirmed SPs in {ACTIVE_PORTFOLIO} for this
                            project.
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Why this mapping exists, who confirmed it, etc."
                    />
                  </div>

                  {formError && (
                    <div className="alert alert-danger py-2 mb-0" role="alert">
                      {formError}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-1"></i> Saving…
                      </>
                    ) : formMode === 'create' ? (
                      'Create mapping'
                    ) : (
                      'Save changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BilateralProjectMappings;
