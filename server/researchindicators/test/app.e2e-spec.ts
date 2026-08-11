import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  // `beforeAll` — this app is a read-only, side-effect-free fixture shared
  // across every test in this file; `beforeEach` paid the ~3.6s AppModule
  // boot cost (real DataSource connection) per test for no benefit.
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // Inherited harness defect (tasks.md T-11). Both pieces are required —
  // `app.close()` alone is NOT the fix, it is half of it:
  //   - `app.close()` runs Nest's shutdown hooks (TypeORM's DataSource among
  //     them), but A/B-verified across two independent runs, closing the app
  //     here still left the underlying `node`/jest process alive 5+ minutes
  //     with no self-termination.
  //   - `"forceExit": true` in `test/jest-e2e.json` is the load-bearing
  //     part — deleting that config line restores the CI-blocking hang even
  //     with this `afterAll` in place.
  // `--detectOpenHandles` named NO open handle, so the residual leak is
  // masked here, not diagnosed (candidates: the mysql2 pool, OpenSearch
  // keep-alive, or `@nestjs/schedule` timers — not confirmed).
  afterAll(async () => {
    await app?.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe(200);
        expect(res.body.data.message).toBe('Welcome to the Aliance API');
      });
  });
});
