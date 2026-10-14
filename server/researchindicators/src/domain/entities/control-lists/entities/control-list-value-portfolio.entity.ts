import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryColumn } from 'typeorm';

/**
 * "Applies to" link of one value to one portfolio (R-CLG-009; design.md §3).
 * A value with NO rows here applies to every portfolio; rows restrict it to
 * those portfolios.
 *
 * Deliberately NOT an `AuditableEntity` (D-CLG-12): this is a pure join table
 * with a composite primary key, and every change to it goes through a value
 * write (A10/A11), which stamps the value row's own `updated_by`/`updated_at`.
 * No relation is declared here (like the other control-list entities): the
 * foreign keys (`value_id` CASCADE, `portfolio_id` RESTRICT) live in the
 * migration `1790900000003`, and the service joins by id.
 */
@Entity('control_list_value_portfolios')
export class ControlListValuePortfolio {
  @ApiProperty({ type: Number, name: 'value_id' })
  @PrimaryColumn({ name: 'value_id', type: 'bigint' })
  value_id: number;

  @ApiProperty({ type: Number, name: 'portfolio_id' })
  @PrimaryColumn({ name: 'portfolio_id', type: 'bigint' })
  portfolio_id: number;
}
