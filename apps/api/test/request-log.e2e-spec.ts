import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { logBuffer } from './../src/monitoring/log-buffer.js';

/**
 * 요청 로그 미들웨어가 **실제 앱에서** 동작하는지 확인합니다.
 *
 * 단위 테스트로는 "미들웨어 함수가 올바르게 기록한다" 까지만 확인됩니다.
 * 정작 중요한 건 **Nest 가 이 미들웨어를 모든 라우트에 대해 불러주는지**인데
 * (와일드카드 문법이 등록은 되지만 매칭이 안 될 수 있음), 그건 앱을 띄워봐야
 * 알 수 있습니다.
 *
 * 특히 **가드가 거절한 요청(401)** 이 기록되는지가 핵심입니다 — 이전에는
 * 인터셉터로 기록해서 이 경우가 전부 누락됐습니다.
 */
describe('요청 로그 미들웨어 (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('인증 없이 접근한 요청도 기록된다', async () => {
    const before = logBuffer.counts().requests;

    await request(app.getHttpServer()).get('/admin/stats').expect(401);

    expect(logBuffer.counts().requests).toBeGreaterThan(before);

    const entry = logBuffer.recentRequests(1)[0]!;
    expect(entry.path).toBe('/admin/stats');
    expect(entry.status).toBe(401);
    expect(entry.method).toBe('GET');
    // 인증을 통과하지 못했으므로 호출자는 알 수 없습니다.
    expect(entry.userId).toBeNull();
    expect(entry.userEmail).toBeNull();
  });

  it('성공한 요청도 기록된다', async () => {
    await request(app.getHttpServer()).get('/').expect(200);

    const entry = logBuffer.recentRequests(1)[0]!;
    expect(entry.path).toBe('/');
    expect(entry.status).toBe(200);
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('없는 경로(404)도 기록된다', async () => {
    await request(app.getHttpServer()).get('/no-such-route').expect(404);

    const entry = logBuffer.recentRequests(1)[0]!;
    expect(entry.path).toBe('/no-such-route');
    expect(entry.status).toBe(404);
  });

  it('POST 도 기록되고 본문은 담지 않는다', async () => {
    await request(app.getHttpServer())
      .post('/documents')
      .send({ title: '비밀 이력서 내용', content: 'x'.repeat(50) })
      .expect(401);

    const serialized = JSON.stringify(logBuffer.recentRequests(1)[0]);
    expect(serialized).toContain('/documents');
    expect(serialized).not.toContain('비밀 이력서 내용');
  });

  it('쿼리스트링은 경로에서 떼어낸다', async () => {
    await request(app.getHttpServer())
      .get('/admin/logs?level=error&limit=10')
      .expect(401);

    expect(logBuffer.recentRequests(1)[0]!.path).toBe('/admin/logs');
  });
});
