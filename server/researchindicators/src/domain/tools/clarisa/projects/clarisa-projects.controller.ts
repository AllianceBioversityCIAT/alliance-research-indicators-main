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
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { ClarisaProjectsService } from './clarisa-projects.service';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15 / R-BIL-080 (UI)
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
      'Optional case-insensitive substring match on `short_name`. Filtered in memory after the upstream cache.',
  })
  async listBilateral(@Query('search') search?: string) {
    const all = await this.projectsService.listBilateralProjects();
    const needle = search?.trim().toLowerCase();
    const filtered = needle
      ? all.filter((p) => p.short_name?.toLowerCase().includes(needle))
      : all;

    return ResponseUtils.format({
      description: 'CLARISA bilateral projects',
      status: HttpStatus.OK,
      // Trim the heavy `project_mappings_array` down to what the picker
      // needs — the FE still sees the SP allocation preview for the
      // active portfolio without paying for the full upstream payload.
      data: filtered.map((p) => ({
        id: p.id,
        short_name: p.short_name,
        source_of_funding: p.source_of_funding,
        science_programs: (p.project_mappings_array ?? [])
          .filter(
            (m) =>
              m.status === 'Confirmed' &&
              m.global_unit_object?.cgiar_entity_type_object?.code === 22,
          )
          .map((m) => ({
            code: m.global_unit_object?.smo_code,
            name: m.global_unit_object?.name,
            portfolio: m.global_unit_object?.portfolio_object?.acronym,
            allocation: m.allocation,
          })),
      })),
    });
  }
}
