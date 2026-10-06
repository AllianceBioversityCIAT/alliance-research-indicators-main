import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlListValue } from './entities/control-list-value.entity';

/**
 * List-membership check for consumers that store a `control_list_values.id`
 * (design.md §5 rule 10, D-CTL-15; R-CTL-006 "List membership").
 *
 * Lives OUTSIDE `ControlListsService` deliberately (tasks.md T-04 forward
 * pointer / P-10 disqualifier): `ControlListsService` injects the
 * request-scoped `CurrentUserUtil` (`current-user.util.ts:7,
 * Scope.REQUEST`), which makes `ControlListsService` itself request-scoped
 * by Nest's scope-cascading rule. A consumer module that calls this check on
 * every write that stores a value id (requirements §11 risk) must not be
 * forced into request scope by that edge — this service depends on
 * repositories only (both default/singleton scope), so it — and anything
 * that injects it — stays a singleton. This is a directed deviation from
 * design.md §5 rule 10's literal "the exported `ControlListsService
 * .assertValueInList`" wording; the contract (signature, behavior, errors)
 * is unchanged, only its home moved.
 *
 * Deliberately does **not** check `is_active` (design §5 rule 10): a record
 * that already references a deactivated value must stay saveable
 * (R-CTL-004 "Deactivate"). Offering only active values for a NEW selection
 * is the consumer form's job, through A13 `activeOnly=true`.
 */
@Injectable()
export class ControlListValueLookupService {
  constructor(
    private readonly listRepository: ControlListRepository,
    private readonly valueRepository: ControlListValueRepository,
  ) {}

  async assertValueInList(
    valueId: number,
    portfolioId: number,
    listKey: string,
  ): Promise<ControlListValue> {
    const value = await this.valueRepository.findOne({
      where: { id: valueId },
    });
    if (!value) {
      throw new NotFoundException(`Value ${valueId} not found`);
    }

    const list = await this.listRepository.findOne({
      where: { id: value.list_id },
    });
    // A consumer's own FK to control_list_values.id (D-CTL-3/D-CTL-15,
    // ON DELETE RESTRICT) guarantees this list row exists in normal
    // operation — this guard only protects a caller that fabricates a
    // value id outside that relationship.
    if (!list) {
      throw new NotFoundException(`List ${value.list_id} not found`);
    }

    // Falsifier 3 (tasks.md T-04): checking only the portfolio, not the
    // key, must fail the cross-list case — checked FIRST, so a value of the
    // right key's sibling list in the SAME portfolio 400s on "list", not on
    // "portfolio".
    if (list.list_key !== listKey) {
      throw new BadRequestException(
        `Value ${valueId} belongs to list "${list.list_key}", not "${listKey}"`,
      );
    }
    // Falsifier 4 (tasks.md T-04): checking only the key, not the
    // portfolio, must fail the cross-portfolio case.
    if (list.portfolio_id !== portfolioId) {
      throw new BadRequestException(
        `Value ${valueId} belongs to portfolio ${list.portfolio_id}, not portfolio ${portfolioId}`,
      );
    }

    return value;
  }
}
