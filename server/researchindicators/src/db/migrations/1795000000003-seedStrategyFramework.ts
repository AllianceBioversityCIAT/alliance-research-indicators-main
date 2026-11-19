import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  removeStrategyFrameworkSeed,
  seedStrategyFramework,
} from '../seeds/strategy-framework.seed';

/**
 * Strategy framework seed
 * (docs/specs/institutional-performance/strategy-framework, design
 * section 3.3 and 3.4, R-STF-011, NFR-STF-002, D-STF-24).
 *
 * The seed runs on its own query runner and its own transaction. In the
 * default migration mode the shared runner is not a real transaction once
 * the earlier CREATE TABLE statements have committed, and a nested
 * startTransaction on that runner is only a savepoint. This file does not
 * set `transaction`, because an explicit override is rejected when pending
 * migrations run together.
 *
 * `down` counts non-seed rows that depend on the seeded ids and refuses,
 * naming each count. Otherwise it deletes the seeded rows, one statement
 * per element depth, deepest first.
 *
 * This file exports ONLY its migration class.
 *
 * @akili-spec institutional-performance/strategy-framework
 */
export class SeedStrategyFramework1795000000003 implements MigrationInterface {
  name = 'SeedStrategyFramework1795000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.runInDedicatedTransaction(queryRunner, seedStrategyFramework);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.runInDedicatedTransaction(
      queryRunner,
      removeStrategyFrameworkSeed,
    );
  }

  private async runInDedicatedTransaction(
    queryRunner: QueryRunner,
    work: (dedicated: QueryRunner) => Promise<unknown>,
  ): Promise<void> {
    const dedicated = queryRunner.connection.createQueryRunner();
    await dedicated.connect();
    try {
      await dedicated.startTransaction();
      try {
        await work(dedicated);
        await dedicated.commitTransaction();
      } catch (error) {
        await dedicated.rollbackTransaction();
        throw error;
      }
    } finally {
      await dedicated.release();
    }
  }
}
