export const ResultSortFields = (field: ResultSortEnum, order: 'ASC' | 'DESC') => {
    const fieldMap = {
        'code': 'r.result_official_code',
        'creator': 'su.first_name, su.last_name',
        'creation-date': 'r.created_at',
        'snapshot-version': `${order === 'ASC' ? 'MIN' : 'MAX'}(r2.report_year_id)`,
        'live-version': 'r.report_year_id',
        'primary-lever': 'cl.short_name',
        'project-code': 'rc.contract_id',
        'status': 'rs.name',
        'indicator': 'i.name',
        'result-title': 'r.title',
    }

    return fieldMap[field] ?? 'r.result_official_code';
}

export enum ResultSortEnum {
    CODE = 'code',
    CREATOR = 'creator',
    CREATION_DATE = 'creation-date',
    SNAPSHOT_VERSION = 'snapshot-version',
    LIVE_VERSION = 'live-version',
    PRIMARY_LEVER = 'primary-lever',
    PROJECT_CODE = 'project-code',
    STATUS = 'status',
    INDICATOR = 'indicator',
    RESULT_TITLE = 'result-title',
}

