import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { QueryParseBool } from '../../../shared/pipes/query-parse-boolean.pipe';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProject } from './dto/clarisa-project.types';

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-04 / R-BAS-003, R-BAS-004, R-BAS-006
// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15 / R-BIL-080 (UI)
// @sdd-spec docs/specs/bugfix/bilateral-picker-fields — T-01, T-05 / R-BPF-001, R-BPF-002, R-BPF-006, NFR-BPF-001, NFR-BPF-003, DD-9
//
// Thin admin-only picker endpoint for the bilateral_project_mapping form.
// Returns the cached CLARISA bilateral projects (5-min TTL via the
// underlying service). Lives under `/api/tools/clarisa/projects` so it
// inherits the JWT middleware (NOT under `/api/admin/...` — see Pivot
// Record #1 in T-15.14's execution log).
@ApiTags('Clarisa Projects')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class ClarisaProjectsController {
  constructor(private readonly projectsService: ClarisaProjectsService) {}

  @Get('bilateral')
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @ApiOperation({
    summary:
      'List CLARISA bilateral projects (cached). Powers the bilateral_project_mapping admin picker.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Optional case-insensitive substring match on `short_name`, `full_name`, or `external_code`. Filtered in memory after the upstream cache.',
  })
  @ApiQuery({
    name: 'phase',
    required: false,
    type: Number,
    description:
      'Optional explicit reporting phase filter (tier 1). Non-numeric value results in HTTP 400.',
  })
  @ApiQuery({
    name: 'only-with-science-programs',
    required: false,
    type: Boolean,
    description:
      'Optional filter to return only projects with at least one Confirmed Science Program mapping. Defaults to false.',
  })
  async listBilateral(
    @Query('search') search?: string,
    @Query('phase') phase?: number,
    @Query('only-with-science-programs', QueryParseBool)
    onlyWithSciencePrograms?: boolean,
  ) {
    const all = await this.projectsService.listBilateralProjects({
      phase,
      onlyWithSciencePrograms,
    });
    const needle = search?.trim().toLowerCase();
    const filtered = needle
      ? all.filter(
          (p) =>
            p.short_name?.toLowerCase().includes(needle) ||
            p.full_name?.toLowerCase().includes(needle) ||
            p.external_code?.toLowerCase().includes(needle),
        )
      : all;

    const sorted = [...filtered].sort((a, b) => {
      const keyA = (a.full_name || a.short_name || '').toLowerCase();
      const keyB = (b.full_name || b.short_name || '').toLowerCase();
      const cmp = keyA.localeCompare(keyB);
      if (cmp !== 0) return cmp;
      const codeA = (a.short_name || '').toLowerCase();
      const codeB = (b.short_name || '').toLowerCase();
      const codeCmp = codeA.localeCompare(codeB);
      if (codeCmp !== 0) return codeCmp;
      return a.id - b.id;
    });

    return ResponseUtils.format({
      description: 'CLARISA bilateral projects',
      status: HttpStatus.OK,
      // Trim the heavy `project_mappings_array` down to what the picker
      // needs — the FE still sees the SP allocation preview for the
      // active portfolio without paying for the full upstream payload.
      data: sorted.map((p) => {
        const hasSciencePrograms =
          (p as any).has_science_programs ??
          this.projectsService.hasSciencePrograms(p);

        return {
          id: p.id,
          short_name: p.short_name,
          full_name: p.full_name,
          description: p.description,
          external_code: p.external_code,
          source_of_funding: p.source_of_funding,
          phase: p.phase,
          source_center_acronym: p.source_center_acronym,
          has_science_programs: hasSciencePrograms,
          science_programs: !hasSciencePrograms
            ? []
            : (p.project_mappings_array ?? [])
                .filter((m) =>
                  this.projectsService.hasSciencePrograms({
                    project_mappings_array: [m],
                  } as ClarisaProject),
                )
                .map((m) => ({
                  code: m.global_unit_object?.smo_code,
                  name: m.global_unit_object?.name,
                  portfolio: m.global_unit_object?.portfolio_object?.acronym,
                  allocation: m.allocation,
                })),
        };
      }),
    });
  }
}
